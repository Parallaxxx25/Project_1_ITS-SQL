/**
 * Deterministic Query Verifier
 * Compares a student's query result against the expected (golden) result.
 *
 * Correctness model (output-based grading):
 *  - Column COUNT must match.
 *  - Values are compared as a positional matrix (row tuples in column order),
 *    so column aliases / header names never cause false fails or false passes.
 *  - Row order matters only when the golden query has ORDER BY; otherwise rows
 *    are compared as a multiset (order-independent).
 *  - Values are normalized robustly (NULL, bigint, decimals, numeric strings,
 *    booleans, dates) to avoid engine/type quirks.
 */

import { dbManager } from './db-manager.js';

// Control-char separators (never occur in query output) keep cell/row
// boundaries unambiguous, e.g. ["1","23"] never collides with ["12","3"].
const CELL_SEP = String.fromCharCode(1);
const NULL_SENTINEL = String.fromCharCode(0) + 'NULL';

// Canonical numeric string: 12.50 -> "12.5", 100 -> "100", -0 -> "0".
function canonicalNumber(n) {
    if (!Number.isFinite(n)) return String(n);
    if (Object.is(n, -0)) n = 0;
    // Round to 6 decimals to absorb floating-point noise, then drop trailing zeros.
    return parseFloat(n.toFixed(6)).toString();
}

const NUMERIC_RE = /^-?\d+(\.\d+)?$/;

// Normalize a single cell value to a canonical, TYPE-TAGGED comparable string.
// The type tag ('n:' number, 's:' string, 'b:' bool, 'd:' date) prevents
// cross-type false positives — e.g. the TEXT '007' must NOT equal the number 7,
// and '1.0' (text) must NOT equal 1 (number). Numeric tolerance is applied only
// within genuine numeric types.
function normalizeValue(v) {
    if (v === null || v === undefined) return NULL_SENTINEL;

    const t = typeof v;
    if (t === 'bigint') return 'n:' + v.toString();
    if (t === 'number') return 'n:' + canonicalNumber(v);
    if (t === 'boolean') return 'b:' + (v ? 'true' : 'false');
    if (v instanceof Date) return Number.isNaN(v.getTime()) ? NULL_SENTINEL : 'd:' + v.toISOString();

    // Arrow decimal / numeric objects surface as objects whose string form is a
    // plain number → treat as numbers so DECIMAL(10,2) 12.50 matches number 12.5.
    if (t === 'object') {
        const s = String(v).trim();
        return s !== '' && NUMERIC_RE.test(s) ? 'n:' + canonicalNumber(Number(s)) : 's:' + s;
    }

    // Real strings compared literally — NEVER coerced to numbers.
    return 's:' + v.trim();
}

// Build a canonical key string for one row, reading values positionally.
function rowKey(row, columns) {
    const parts = new Array(columns.length);
    for (let i = 0; i < columns.length; i++) {
        parts[i] = normalizeValue(row ? row[columns[i]] : null);
    }
    return parts.join(CELL_SEP);
}

function arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

// Strip SQL comments (-- line, /* block */) while preserving string/identifier
// literals ('...', "...", `...`). Keeps comments from breaking the semicolon
// check or corrupting execution when whitespace is later normalized.
export function stripSqlComments(sql) {
    if (!sql) return '';
    let out = '';
    let quote = null; // active string delimiter, or null when outside a literal
    const n = sql.length;

    for (let i = 0; i < n; i++) {
        const c = sql[i];
        const next = sql[i + 1];

        if (quote) {
            // Pass through backslash escapes (e.g. \') without ending the string.
            if (c === '\\' && i + 1 < n) { out += c + next; i++; continue; }
            out += c;
            if (c === quote) {
                if (next === quote) { out += next; i++; continue; } // '' escape
                quote = null;
            }
            continue;
        }

        if (c === "'" || c === '"' || c === '`') { quote = c; out += c; continue; }

        // Line comment: drop through end of line, keep the newline itself.
        if (c === '-' && next === '-') {
            while (i + 1 < n && sql[i + 1] !== '\n') i++;
            continue;
        }

        // Block comment: drop through closing */, leave a space so tokens stay apart.
        if (c === '/' && next === '*') {
            i += 2;
            while (i < n && !(sql[i] === '*' && sql[i + 1] === '/')) i++;
            i++; // land on '/', loop's i++ skips it
            out += ' ';
            continue;
        }

        out += c;
    }
    return out;
}

export class Verifier {
    async verify(studentQuery, goldenQuery) {
        try {
            // Strip comments first, then strip trailing semicolons and collapse
            // whitespace for execution.
            const normalizeQuery = (query) => stripSqlComments(query)
                .trim()
                .replace(/;+\s*$/, '')
                .replace(/\s+/g, ' ')
                .trim();

            const normalizedStudent = normalizeQuery(studentQuery);
            const normalizedGolden = normalizeQuery(goldenQuery);

            // Order matters only when the expected answer is explicitly ordered.
            const orderSensitive = /\bORDER\s+BY\b/i.test(goldenQuery);

            // Run inside a rolled-back transaction so a student's DML/DDL
            // (DELETE/DROP/UPDATE…) can never corrupt the shared dataset for the
            // next question, and with a timeout so runaway/cartesian queries
            // surface an error instead of hanging the tab.
            const goldenResult = await dbManager.executeReadOnly(normalizedGolden);
            const studentResult = await dbManager.executeReadOnly(normalizedStudent);

            const comparison = this.compareResults(studentResult, goldenResult, orderSensitive);

            return {
                success: comparison.isMatch,
                studentResult,
                goldenResult,
                comparison,
            };
        } catch (error) {
            console.error('Verification error:', error);
            return {
                success: false,
                error: error.message,
                studentResult: null,
                goldenResult: null,
                comparison: null,
            };
        }
    }

    compareResults(studentResult, goldenResult, orderSensitive = false) {
        const sCols = studentResult?.columns || [];
        const gCols = goldenResult?.columns || [];
        const sRows = studentResult?.rows || [];
        const gRows = goldenResult?.rows || [];

        const comparison = {
            isMatch: false,
            columnCountMatch: sCols.length === gCols.length,
            columnNamesMatch: false,
            rowCountMatch: sRows.length === gRows.length,
            dataMatch: false,
            details: {
                studentColumnCount: sCols.length,
                goldenColumnCount: gCols.length,
                studentColumns: sCols,
                goldenColumns: gCols,
                studentRowCount: sRows.length,
                goldenRowCount: gRows.length,
                orderSensitive,
                orderIssue: false,
            },
        };

        // Column names: case-insensitive, order-independent (for hints only —
        // NOT part of the pass/fail gate, since aliases are cosmetic).
        const normCols = (cols) => [...cols].map((c) => String(c).toLowerCase()).sort();
        comparison.columnNamesMatch = arraysEqual(normCols(sCols), normCols(gCols));

        // Compare data only when the shape lines up.
        if (comparison.columnCountMatch && comparison.rowCountMatch) {
            const sKeys = sRows.map((r) => rowKey(r, sCols));
            const gKeys = gRows.map((r) => rowKey(r, gCols));

            const multisetMatch = arraysEqual([...sKeys].sort(), [...gKeys].sort());

            if (orderSensitive) {
                const orderedMatch = arraysEqual(sKeys, gKeys);
                comparison.dataMatch = orderedMatch;
                // Right rows, wrong order -> actionable hint signal.
                comparison.details.orderIssue = !orderedMatch && multisetMatch;
            } else {
                comparison.dataMatch = multisetMatch;
            }
        }

        // Pass = same column count, same row count, same values.
        comparison.isMatch =
            comparison.columnCountMatch &&
            comparison.rowCountMatch &&
            comparison.dataMatch;

        return comparison;
    }

    // Kept for backward compatibility (positional multiset comparison).
    compareData(studentResult, goldenResult) {
        const sCols = studentResult?.columns || [];
        const gCols = goldenResult?.columns || [];
        const sRows = studentResult?.rows || [];
        const gRows = goldenResult?.rows || [];
        if (sCols.length !== gCols.length || sRows.length !== gRows.length) return false;
        const sKeys = sRows.map((r) => rowKey(r, sCols)).sort();
        const gKeys = gRows.map((r) => rowKey(r, gCols)).sort();
        return arraysEqual(sKeys, gKeys);
    }

    // Extract metadata useful for hint generation
    extractMetadata(studentQuery, comparison) {
        return {
            hasWhere: /WHERE/i.test(studentQuery),
            hasOrderBy: /ORDER BY/i.test(studentQuery),
            hasGroupBy: /GROUP BY/i.test(studentQuery),
            hasHaving: /HAVING/i.test(studentQuery),
            hasLimit: /LIMIT/i.test(studentQuery),
            hasAggregates: /COUNT|SUM|AVG|MAX|MIN/i.test(studentQuery),
            selectsAllColumns: /SELECT\s+\*/i.test(studentQuery),
            ...comparison.details,
        };
    }
}

export const verifier = new Verifier();
