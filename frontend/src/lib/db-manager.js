/**
 * DuckDB-Wasm Database Manager
 * Handles database initialization and query execution with real bike store data
 */

import * as duckdb from '@duckdb/duckdb-wasm';

class DatabaseManager {
    constructor() {
        this.db = null;
        this.conn = null;
        this.isDataLoaded = false;
    }

    async initialize() {
        try {
            const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
            
            // Select bundle based on browser support
            const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
            
            const worker_url = URL.createObjectURL(
                new Blob([`importScripts("${bundle.mainWorker}");`], { type: 'text/javascript' })
            );

            const worker = new Worker(worker_url);
            const logger = new duckdb.ConsoleLogger();
            this.db = new duckdb.AsyncDuckDB(logger, worker);
            await this.db.instantiate(bundle.mainModule, bundle.pthreadWorker);
            URL.revokeObjectURL(worker_url);

            // Open a connection
            this.conn = await this.db.connect();
            
            // Load real database from SQL file
            await this.loadBikeStoreDatabase();
            
            console.log('✅ DuckDB initialized with Bike Store data');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize DuckDB:', error);
            throw error;
        }
    }

    async loadBikeStoreDatabase() {
        try {
            console.log('📦 Loading Bike Store database...');
            
            // Fetch the SQL file from public folder
            const response = await fetch('/bikestore_mysql.sql');
            if (!response.ok) {
                throw new Error(`Failed to fetch SQL file: ${response.status} ${response.statusText}`);
            }
            const sqlContent = await response.text();
            console.log(`✅ SQL file loaded: ${sqlContent.length} bytes, ${sqlContent.split('\n').length} lines`);
            
            // Clean and parse SQL statements
            const statements = this.parseSQLStatements(sqlContent);
            
            console.log(`🔧 Executing ${statements.length} SQL statements...`);
            
            // Log first few statements for debugging
            console.log('First 3 statements:');
            statements.slice(0, 3).forEach((stmt, idx) => {
                console.log(`[${idx}] ${stmt.substring(0, 80)}...`);
            });
            
            // Execute each statement
            let successCount = 0;
            let failedStatements = [];
            for (let i = 0; i < statements.length; i++) {
                const statement = statements[i];
                if (statement.trim()) {
                    try {
                        await this.conn.query(statement);
                        successCount++;
                        // Log CREATE TABLE statements
                        if (statement.toUpperCase().includes('CREATE TABLE')) {
                            console.log(`✅ Created table: ${statement.substring(0, 50)}...`);
                        }
                    } catch (err) {
                        // Log but continue - some statements might fail due to syntax differences
                        failedStatements.push({
                            stmt: statement.substring(0, 50),
                            error: err.message.substring(0, 100)
                        });
                        console.warn(`⚠️ [${i}] Statement failed:`, err.message.substring(0, 100));
                    }
                }
            }
            
            this.isDataLoaded = true;
            
            // Test query to verify data loaded
            try {
                const testResult = await this.executeQuery("SELECT COUNT(*) as count FROM brands");
                console.log(`✅ Bike Store database loaded successfully (${successCount}/${statements.length} statements)`);
                console.log(`📊 Brands table has ${testResult.rows[0]?.count || 0} records`);
            } catch (testErr) {
                console.warn('⚠️ Could not query brands table:', testErr.message);
                if (failedStatements.length > 0) {
                    console.warn('Failed statements:', failedStatements);
                }
            }
        } catch (error) {
            console.error('❌ Failed to load database:', error);
            throw error;
        }
    }

    parseSQLStatements(sqlContent) {
        // Remove comments and normalize for DuckDB compatibility
        let cleaned = sqlContent
            .replace(/--.*?$/gm, '') // Remove line comments
            .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
            .replace(/^!/gm, '--') // Comment out MySQL-specific directives
            // Handle escaped quotes in string literals BEFORE backtick conversion
            // Convert \' to '' (SQL standard for escaped single quote)
            .replace(/\\'/g, "''") // \' -> ''
            .replace(/`/g, '"') // Convert backticks to double quotes
            // Type modifiers - remove size specs from types
            .replace(/\bvarchar\s*\(\s*(\d+)\s*\)/gi, 'VARCHAR') // varchar(255) -> VARCHAR
            .replace(/\bint\s*\(\s*\d+\s*\)/gi, 'INTEGER') // int(11) -> INTEGER
            .replace(/\btinyint\s*\(\s*\d+\s*\)/gi, 'TINYINT') // tinyint(1) -> TINYINT
            .replace(/\bsmallint\s*\(\s*\d+\s*\)/gi, 'SMALLINT') // smallint(6) -> SMALLINT
            .replace(/\bmediumint\s*\(\s*\d+\s*\)/gi, 'INTEGER') // mediumint -> INTEGER
            .replace(/\bbigint\s*\(\s*\d+\s*\)/gi, 'BIGINT') // bigint(20) -> BIGINT
            .replace(/\bvarbinary\s*\(\s*(\d+)\s*\)/gi, 'BYTEA') // varbinary -> BYTEA
            .replace(/\bdecimal\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/gi, 'DECIMAL') // decimal(10,2) -> DECIMAL
            // MySQL-specific clauses
            .replace(/\bAUTO_INCREMENT\b/gi, '') // Remove AUTO_INCREMENT
            .replace(/\bPRIMARY\s+KEY\s*\([^)]*\)/gi, (match) => {
                return match.replace(/`/g, '"');
            })
            .replace(/\bENGINE\s*=\s*[A-Za-z0-9]+\b/gi, '') // Remove ENGINE
            .replace(/\bDEFAULT\s+CHARSET\s*=\s*[A-Za-z0-9_]+\b/gi, '') // Remove CHARSET
            .replace(/\bCHARSET\s*=\s*[A-Za-z0-9_]+\b/gi, '')
            .replace(/\bCOLLATE\s*=\s*[A-Za-z0-9_]+\b/gi, '') // Remove COLLATE=
            .replace(/\bCOLLATE\s+[A-Za-z0-9_]+\b/gi, '') // Remove COLLATE keyword
            // MySQL session/transaction statements to remove
            .replace(/SET\s+SQL_MODE\s*[^;]*;?\n?/gi, '') // Remove SET SQL_MODE
            .replace(/SET\s+time_zone\s*[^;]*;?\n?/gi, '') // Remove SET time_zone
            .replace(/SET\s+SESSION\s+foreign_key_checks\s*=\s*[A-Za-z]+\s*;?\n?/gi, '') // Remove foreign_key_checks
            .replace(/START\s+TRANSACTION\s*;?\n?/gi, '') // Remove START TRANSACTION
            .replace(/COMMIT\s*;?\n?/gi, '') // Remove COMMIT
            .replace(/!\d{5}\s+SET\s+[^;]*;?\n?/gi, '') // Remove version directives
            // ALTER TABLE statements with MySQL-specific syntax
            .replace(/ALTER\s+TABLE\s+[^;]*ALGORITHM\s*=\s*[A-Z_]+[^;]*;?\n?/gi, ''); // Remove ALTER TABLE with ALGORITHM
        
        // Split by semicolon and filter
        const statements = cleaned
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));
        
        return statements;
    }

    async executeQuery(sql) {
        if (!this.conn) {
            throw new Error('Database not initialized');
        }

        try {
            const result = await this.conn.query(sql);
            return this.formatResult(result);
        } catch (error) {
            console.error('Query error:', error);
            throw error;
        }
    }

    // Race a promise against a timeout so a runaway query can't hang the tab.
    _withTimeout(promise, ms) {
        let timer;
        const timeout = new Promise((_, reject) => {
            timer = setTimeout(
                () => reject(new Error(`Query timed out after ${Math.round(ms / 1000)}s — check for an infinite loop or a very large (cartesian) join.`)),
                ms
            );
        });
        return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
    }

    // Execute inside a transaction that is ALWAYS rolled back, so grading a
    // student's query can never mutate the shared dataset (DELETE/DROP/UPDATE/
    // INSERT). Read queries still return their rows normally.
    async executeReadOnly(sql, timeoutMs = 8000) {
        if (!this.conn) {
            throw new Error('Database not initialized');
        }
        const run = (async () => {
            await this.conn.query('BEGIN TRANSACTION');
            try {
                const result = await this.conn.query(sql);
                return this.formatResult(result);
            } finally {
                try { await this.conn.query('ROLLBACK'); } catch { /* ignore */ }
            }
        })();
        return this._withTimeout(run, timeoutMs);
    }

    formatResult(result) {
        try {
            // Convert DuckDB result to a simple array of objects
            const rows = [];
            const numRows = result.numRows;
            
            if (numRows === 0) {
                // Keep real column names even with no rows, so an empty result
                // with the WRONG columns no longer looks identical to the answer.
                const cols = result.schema?.fields?.map((f) => f.name) || [];
                return { columns: cols, rows: [] };
            }

            // Get column names from schema
            const columns = result.schema.fields.map(field => field.name);
            console.log('📋 formatResult - columns:', columns, 'rows:', numRows);

            // Method 1: Try using toArray() which converts to typed arrays
            try {
                const data = result.toArray();
                console.log('✅ Using toArray() method, got', data.length, 'rows');
                if (Array.isArray(data) && data.length > 0) {
                    return { columns, rows: data };
                }
            } catch (e) {
                console.log('⚠️ toArray() failed:', e.message);
            }

            // Method 2: Try access vectors directly via batches
            try {
                for (let i = 0; i < numRows; i++) {
                    const row = {};
                    columns.forEach((col) => {
                        try {
                            // Try different ways to access column data
                            let value = null;
                            
                            // Try method 1: getChild
                            try {
                                const column = result.getChild(columns.indexOf(col));
                                if (column && typeof column.get === 'function') {
                                    value = column.get(i);
                                }
                            } catch (e1) {
                                // Try method 2: direct access
                                try {
                                    if (typeof result.get === 'function') {
                                        const col_data = result.get(col);
                                        if (col_data && typeof col_data.get === 'function') {
                                            value = col_data.get(i);
                                        }
                                    }
                                } catch (e2) {
                                    // Try method 3: batches
                                    try {
                                        const batches = result.batches;
                                        if (batches && batches.length > 0) {
                                            const batch = batches[0];
                                            if (batch) {
                                                const colIdx = columns.indexOf(col);
                                                const vector = batch.getChild(colIdx);
                                                if (vector) {
                                                    value = vector.get(i);
                                                }
                                            }
                                        }
                                    } catch (e3) {
                                        // Silent fail
                                    }
                                }
                            }
                            
                            row[col] = value;
                        } catch (e) {
                            row[col] = null;
                        }
                    });
                    // Keep every row — including all-NULL rows (e.g. LEFT JOIN
                    // misses), otherwise row counts silently drift and grading fails.
                    rows.push(row);
                }
                
                if (rows.length > 0) {
                    console.log('✅ Successfully formatted', rows.length, 'rows');
                    return { columns, rows };
                }
            } catch (error) {
                console.error('❌ Error in Method 2:', error);
            }

            // Method 3: Last resort - try batches iteration
            try {
                const batches = result.batches;
                if (batches && batches.length > 0) {
                    console.log('📦 Using batches method with', batches.length, 'batch(es)');
                    let rowIndex = 0;
                    for (const batch of batches) {
                        const batchRows = batch.numRows;
                        for (let i = 0; i < batchRows; i++) {
                            const row = {};
                            for (let colIdx = 0; colIdx < columns.length; colIdx++) {
                                const col = columns[colIdx];
                                try {
                                    const vector = batch.getChild(colIdx);
                                    row[col] = vector ? vector.get(i) : null;
                                } catch (e) {
                                    row[col] = null;
                                }
                            }
                            rows.push(row);
                        }
                    }
                    if (rows.length > 0) {
                        console.log('✅ Batches method: got', rows.length, 'rows');
                        return { columns, rows };
                    }
                }
            } catch (error) {
                console.error('❌ Batches method failed:', error);
            }

            console.warn('⚠️ Could not extract data from result, returning empty');
            return { columns, rows };
        } catch (error) {
            console.error('❌ formatResult error:', error);
            return { columns: [], rows: [] };
        }
    }

    async setupProblem(setupSQL) {
        if (!this.conn) {
            throw new Error('Database not initialized');
        }

        try {
            // Execute setup SQL
            const statements = this.parseSQLStatements(setupSQL);
            for (const statement of statements) {
                if (statement.trim()) {
                    await this.executeQuery(statement);
                }
            }
            
            return true;
        } catch (error) {
            console.error('Setup error:', error);
            throw error;
        }
    }

    async close() {
        if (this.conn) {
            await this.conn.close();
        }
        if (this.db) {
            await this.db.terminate();
        }
    }
}

// Export singleton instance
export const dbManager = new DatabaseManager();
