/**
 * SQL Practice Problems Database
 * - type: 'COURSE' | 'ASSIGNMENT' | 'EXAM' (เชื่อมกับ Tabs)
 * - moduleId: '01' (Intro) | '02' (Select) | '03' (Condition) | '05' (Join)
 */

import { getCustomProblems } from './instructor-store';

// คำอธิบายภาพรวมของแต่ละตาราง (แสดงใน Database Schema ของ SQL Playground)
export const tableMeta = {
  products:    "ข้อมูลสินค้า (จักรยาน) ทั้งหมดในระบบ",
  staffs:      "ข้อมูลพนักงานของแต่ละสาขา",
  brands:      "ยี่ห้อ/แบรนด์ของสินค้า",
  order_items: "รายการสินค้าย่อยในแต่ละคำสั่งซื้อ",
  customers:   "ข้อมูลลูกค้า",
  stores:      "ข้อมูลร้านค้า/สาขา",
  orders:      "ข้อมูลคำสั่งซื้อของลูกค้า",
  stocks:      "จำนวนสินค้าคงคลังของแต่ละสาขา",
  categories:  "ประเภท/หมวดหมู่ของสินค้า",
  users:       "ตารางผู้ใช้ (สำหรับแบบทดสอบ)"
};

// โครงสร้างตาราง: name = ชื่อคอลัมน์, type = ชนิดข้อมูล, desc = ความหมายภาษาไทย
export const dbSchema = {
  products: [
    { name: "product_id",   type: "INT",     desc: "รหัสสินค้า (Primary Key)" },
    { name: "product_name", type: "VARCHAR", desc: "ชื่อสินค้า" },
    { name: "brand_id",     type: "INT",     desc: "รหัสยี่ห้อ (เชื่อมตาราง brands)" },
    { name: "category_id",  type: "INT",     desc: "รหัสประเภท (เชื่อมตาราง categories)" },
    { name: "model_year",   type: "INT",     desc: "ปีรุ่นของสินค้า" },
    { name: "list_price",   type: "DECIMAL", desc: "ราคาขายปลีก" }
  ],
  staffs: [
    { name: "staff_id",   type: "INT",     desc: "รหัสพนักงาน (Primary Key)" },
    { name: "first_name", type: "VARCHAR", desc: "ชื่อจริง" },
    { name: "last_name",  type: "VARCHAR", desc: "นามสกุล" },
    { name: "email",      type: "VARCHAR", desc: "อีเมล" },
    { name: "phone",      type: "VARCHAR", desc: "เบอร์โทรศัพท์" },
    { name: "store_id",   type: "INT",     desc: "รหัสร้านที่สังกัด (เชื่อม stores)" },
    { name: "manager_id", type: "INT",     desc: "รหัสผู้จัดการ (เชื่อม staffs)" }
  ],
  brands: [
    { name: "brand_id",   type: "INT",     desc: "รหัสยี่ห้อ (Primary Key)" },
    { name: "brand_name", type: "VARCHAR", desc: "ชื่อยี่ห้อ" }
  ],
  order_items: [
    { name: "order_id",   type: "INT",     desc: "รหัสคำสั่งซื้อ (เชื่อม orders)" },
    { name: "item_id",    type: "INT",     desc: "ลำดับรายการในคำสั่งซื้อ" },
    { name: "product_id", type: "INT",     desc: "รหัสสินค้า (เชื่อม products)" },
    { name: "quantity",   type: "INT",     desc: "จำนวนที่สั่งซื้อ" },
    { name: "list_price", type: "DECIMAL", desc: "ราคาต่อหน่วย" },
    { name: "discount",   type: "DECIMAL", desc: "ส่วนลด (สัดส่วน 0-1)" }
  ],
  customers: [
    { name: "customer_id", type: "INT",     desc: "รหัสลูกค้า (Primary Key)" },
    { name: "first_name",  type: "VARCHAR", desc: "ชื่อจริง" },
    { name: "last_name",   type: "VARCHAR", desc: "นามสกุล" },
    { name: "phone",       type: "VARCHAR", desc: "เบอร์โทรศัพท์" },
    { name: "email",       type: "VARCHAR", desc: "อีเมล" },
    { name: "street",      type: "VARCHAR", desc: "ที่อยู่ (ถนน)" },
    { name: "city",        type: "VARCHAR", desc: "เมือง" },
    { name: "state",       type: "VARCHAR", desc: "รัฐ" },
    { name: "zip_code",    type: "VARCHAR", desc: "รหัสไปรษณีย์" }
  ],
  stores: [
    { name: "store_id",   type: "INT",     desc: "รหัสร้านค้า (Primary Key)" },
    { name: "store_name", type: "VARCHAR", desc: "ชื่อร้านค้า/สาขา" },
    { name: "phone",      type: "VARCHAR", desc: "เบอร์โทรศัพท์" },
    { name: "email",      type: "VARCHAR", desc: "อีเมล" },
    { name: "street",     type: "VARCHAR", desc: "ที่อยู่ (ถนน)" },
    { name: "city",       type: "VARCHAR", desc: "เมือง" },
    { name: "state",      type: "VARCHAR", desc: "รัฐ" },
    { name: "zip_code",   type: "VARCHAR", desc: "รหัสไปรษณีย์" }
  ],
  orders: [
    { name: "order_id",      type: "INT",  desc: "รหัสคำสั่งซื้อ (Primary Key)" },
    { name: "customer_id",   type: "INT",  desc: "รหัสลูกค้า (เชื่อม customers)" },
    { name: "order_status",  type: "INT",  desc: "สถานะคำสั่งซื้อ" },
    { name: "order_date",    type: "DATE", desc: "วันที่สั่งซื้อ" },
    { name: "required_date", type: "DATE", desc: "วันที่ลูกค้าต้องการรับ" },
    { name: "shipped_date",  type: "DATE", desc: "วันที่จัดส่ง (ว่างได้ถ้ายังไม่ส่ง)" },
    { name: "store_id",      type: "INT",  desc: "รหัสร้านค้า (เชื่อม stores)" },
    { name: "staff_id",      type: "INT",  desc: "รหัสพนักงานผู้ดูแล (เชื่อม staffs)" }
  ],
  stocks: [
    { name: "store_id",   type: "INT", desc: "รหัสร้านค้า (เชื่อม stores)" },
    { name: "product_id", type: "INT", desc: "รหัสสินค้า (เชื่อม products)" },
    { name: "quantity",   type: "INT", desc: "จำนวนคงเหลือในคลัง" }
  ],
  categories: [
    { name: "category_id",   type: "INT",     desc: "รหัสประเภท (Primary Key)" },
    { name: "category_name", type: "VARCHAR", desc: "ชื่อประเภทสินค้า" }
  ],
  users: [
    { name: "id",   type: "INT",     desc: "รหัสผู้ใช้ (Primary Key)" },
    { name: "name", type: "VARCHAR", desc: "ชื่อผู้ใช้" }
  ]
};

const rawProblems = [
  // ==========================================
  // 1. COURSE
  // ==========================================
  // ✨ เพิ่มโจทย์จำลองให้ Module 01 (Database Fundamentals) เพื่อไม่ให้หน้าจอพัง
  // tutorProblemId: every problem below is backfilled with its id in the
  // tutor service's own catalog (tutor/scripts/import_partner_problems.py,
  // joined by title against `external_problem_id`) — including EXAM
  // problems, whose hint button is withheld purely by the workspace UI
  // hiding the panel in EXAM mode (App.jsx), not by omitting this field.
  // Re-run the backfill if the tutor catalog is ever re-seeded from scratch,
  // since these ids are static snapshots of that catalog's autoincrement.
  { id: 901, tutorProblemId: 106, type: "COURSE", moduleId: "01", title: "Select All Stores (Intro)", category: "1.0 Intro", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงข้อมูลร้านค้าทั้งหมดเพื่อทำความเข้าใจโครงสร้างเบื้องต้น", table: "stores", goldenQuery: "SELECT * FROM stores;", starterCode: "SELECT " },

  // --- 1.1 Select (Module: 02) ---
  { id: 1, tutorProblemId: 107, type: "COURSE", moduleId: "02", title: "Select All Products", category: "1.1 Select", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงข้อมูลสินค้าทั้งหมด", table: "products", goldenQuery: "SELECT * FROM products;", starterCode: "SELECT ",
    requirements: ["ใช้คำสั่ง SELECT ดึงข้อมูลจากตาราง products", "แสดงคอลัมน์ทั้งหมดด้วยเครื่องหมาย *"] },
  { id: 2, tutorProblemId: 108, type: "COURSE", moduleId: "02", title: "Select Staff Emails", category: "1.1 Select", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงอีเมลของพนักงานทุกคน", table: "staffs", goldenQuery: "SELECT email FROM staffs;", starterCode: "SELECT ",
    requirements: ["ใช้คำสั่ง SELECT เลือกข้อมูลจากตาราง staffs", "แสดงเฉพาะคอลัมน์ email เท่านั้น"] },
  { id: 3, tutorProblemId: 109, type: "COURSE", moduleId: "02", title: "Select Brand Info", category: "1.1 Select", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงรหัสยี่ห้อ และ ชื่อยี่ห้อทั้งหมด", table: "brands", goldenQuery: "SELECT brand_id, brand_name FROM brands;", starterCode: "SELECT ",
    requirements: ["ดึงข้อมูลจากตาราง brands", "แสดงคอลัมน์ brand_id และ brand_name"] },
  { id: 4, tutorProblemId: 110, type: "COURSE", moduleId: "02", title: "Calculate Total Price", category: "1.1 Select", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงรหัสรายการสั่งซื้อ, รหัสสินค้า, และ คำนวณราคาทั้งหมด (quantity * list_price) ตั้งชื่อคอลัมน์ว่า 'Total Price'", table: "order_items", goldenQuery: "SELECT item_id, product_id, quantity * list_price AS 'Total Price' FROM order_items;", starterCode: "SELECT ",
    requirements: ["ใช้เครื่องหมาย * ในการคูณ quantity กับ list_price", "ตั้งชื่อคอลัมน์ใหม่ด้วยคำสั่ง AS 'Total Price'"] },
  { id: 5, tutorProblemId: 111, type: "COURSE", moduleId: "02", title: "Calculate Product Age", category: "1.1 Select", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงชื่อสินค้า, ปีที่สินค้าออกขาย และคำนวณจำนวนปีที่สินค้าได้วางขายนับจากปี 2026 โดยตั้งชื่อคอลัมน์ใหม่ว่า 'Product Age'", table: "products", goldenQuery: "SELECT Product_name, Model_year, 2026 - Model_year AS 'Product Age' FROM Products;", starterCode: "SELECT ",
    requirements: ["ใช้สมการ 2026 - Model_year", "ตั้งชื่อคอลัมน์ผลลัพธ์ว่า 'Product Age'"] },
  { id: 6, tutorProblemId: 112, type: "COURSE", moduleId: "02", title: "Alias Column Names", category: "1.1 Select", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงชื่อสินค้า ราคาขายปลีก โดยตั้งชื่อคอลัมน์ว่า `Name of Product` และ Price ตามลำดับ", table: "products", goldenQuery: "SELECT product_name AS `Name of Product`, list_price AS 'Price' FROM products;", starterCode: "SELECT ",
    requirements: ["ตั้งชื่อ product_name เป็น 'Name of Product'", "ตั้งชื่อ list_price เป็น 'Price'"] },
  { id: 7, tutorProblemId: 113, type: "COURSE", moduleId: "02", title: "Concat Staff Name", category: "1.1 Select", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงชื่อจริงและนามสกุลพนักงาน โดยรวมไว้ภายใน 1 คอลัมน์ (คั่นด้วย 1 ช่องว่าง)", table: "staffs", goldenQuery: "SELECT Concat(First_name , ' ', Last_name) FROM Staffs;", starterCode: "SELECT ",
    requirements: ["ใช้ฟังก์ชัน CONCAT() เพื่อเชื่อมข้อความ", "ต้องมีช่องว่าง ' ' คั่นกลางระหว่างชื่อและนามสกุล"] },
  { id: 8, tutorProblemId: 114, type: "COURSE", moduleId: "02", title: "Customer Full Name", category: "1.1 Select", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงรายชื่อลูกค้าตั้งชื่อคอลัมน์ว่า full_name (ประกอบด้วยชื่อจริง คั่น 1 ช่องว่าง ตามด้วยนามสกุล) และคอลัมน์ที่สองอีเมล", table: "customers", goldenQuery: "SELECT CONCAT(first_name, ' ', last_name) AS full_name, email FROM customers;", starterCode: "SELECT ",
    requirements: ["ใช้ CONCAT รวมชื่อและนามสกุล และตั้งชื่อคอลัมน์ว่า full_name", "แสดงคอลัมน์ email เป็นคอลัมน์ที่ 2"] },
  { id: 9, tutorProblemId: 115, type: "COURSE", moduleId: "02", title: "Distinct City State", category: "1.1 Select", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงชื่อเมือง และชื่อรัฐที่ลูกค้าทุกคนอาศัยอยู่ โดยไม่แสดงแถวที่มีข้อมูลซ้ำ", table: "customers", goldenQuery: "SELECT DISTINCT city, state FROM customers;", starterCode: "SELECT ",
    requirements: ["ใช้คำสั่ง DISTINCT ตัดข้อมูลที่ซ้ำกัน", "แสดงผลคอลัมน์ city และ state"] },
  { id: 10, tutorProblemId: 116, type: "COURSE", moduleId: "02", title: "Order Emails Desc", category: "1.1 Select", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงอีเมลของร้านค้าทั้งหมด โดยเรียงผลลัพธ์จาก Z ไป A", table: "stores", goldenQuery: "SELECT email FROM stores ORDER BY email DESC;", starterCode: "SELECT ",
    requirements: ["ใช้คำสั่ง ORDER BY สำหรับเรียงลำดับ", "เรียงจากมากไปน้อย (DESC)"] },
  { id: 11, tutorProblemId: 117, type: "COURSE", moduleId: "02", title: "Order Staff Names", category: "1.1 Select", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงชื่อจริงและนามสกุลพนักงาน โดยเรียงผลลัพธ์ด้วยชื่อจริง จาก A ไป Z", table: "staffs", goldenQuery: "SELECT first_name, last_name FROM staffs ORDER BY first_name;", starterCode: "SELECT ",
    requirements: ["ใช้คำสั่ง ORDER BY เรียงด้วย first_name", "เรียงจากน้อยไปมาก (ค่าเริ่มต้นคือ ASC)"] },
  { id: 12, tutorProblemId: 118, type: "COURSE", moduleId: "02", title: "Order Multi Columns", category: "1.1 Select", difficulty: "intermediate",
    description: "จงเขียน SQL statement แสดงชื่อร้านค้าตั้งชื่อว่า 'Store' และเบอร์โทรตั้งชื่อว่า 'Tel' เรียงตามชื่อรัฐจาก Z-A จากนั้นเรียงตามชื่อเมืองจาก A-Z", table: "stores", goldenQuery: "SELECT store_name AS Store, phone AS Tel FROM stores ORDER BY state DESC, city;", starterCode: "SELECT ",
    requirements: ["ตั้งชื่อคอลัมน์ตามที่โจทย์กำหนด (Store, Tel)", "เรียง ORDER BY state DESC และตามด้วย city ASC"] },

  // --- 1.2 Select Condition (Module: 03) ---
  { id: 13, tutorProblemId: 119, type: "COURSE", moduleId: "03", title: "Where State NY", category: "1.2 Select Condition", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงชื่อจริง นามสกุล เบอร์โทรศัพท์ ชื่อถนน ของลูกค้าทุกคนที่อาศัยอยู่ในรัฐชื่อ NY", table: "customers", goldenQuery: "SELECT first_name, last_name, phone, street FROM customers WHERE state = 'NY';", starterCode: "SELECT ",
    requirements: ["ใช้คำสั่ง WHERE กรองเงื่อนไข", "เงื่อนไขคือ state เท่ากับ 'NY'"] },
  { id: 14, tutorProblemId: 120, type: "COURSE", moduleId: "03", title: "Quantity > 20", category: "1.2 Select Condition", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงรหัสร้านค้า และรหัสสินค้า ที่มีปริมาณสินค้าคงเหลือมากกว่า 20 ชิ้น", table: "stocks", goldenQuery: "SELECT store_id, product_id FROM stocks WHERE quantity > 20;", starterCode: "SELECT " },
  { id: 15, tutorProblemId: 121, type: "COURSE", moduleId: "03", title: "IN Clause Cities", category: "1.2 Select Condition", difficulty: "intermediate",
    description: "จงเขียน SQL Statement เพื่อแสดงข้อมูลของลูกค้าที่อาศัยอยู่ในเมือง Amsterdam, Oakland, Santa Cruz, San Jose (ใช้คำสั่ง IN)", table: "customers", goldenQuery: "SELECT first_name, last_name, email, city, state FROM Customers WHERE city IN ('Amsterdam', 'Oakland', 'Santa Cruz', 'San Jose');", starterCode: "SELECT ",
    requirements: ["ใช้คำสั่ง IN ในการกำหนดกลุ่มเงื่อนไข"] },
  { id: 16, tutorProblemId: 122, type: "COURSE", moduleId: "03", title: "Between Years", category: "1.2 Select Condition", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงชื่อสินค้าและปีที่ออกขาย เฉพาะสินค้าที่ออกขายตั้งแต่ปี 2017 ถึงปี 2018 (ใช้ Between)", table: "products", goldenQuery: "SELECT product_name, model_year FROM products WHERE model_year BETWEEN 2017 AND 2018;", starterCode: "SELECT ",
    requirements: ["ใช้คำสั่ง BETWEEN ในการกำหนดช่วงของปี"] },
  { id: 17, tutorProblemId: 123, type: "COURSE", moduleId: "03", title: "Not Between Quantities", category: "1.2 Select Condition", difficulty: "intermediate",
    description: "จงเขียน SQL Statment แสดงข้อมูลสินค้าคงเหลือ เฉพาะที่มีปริมาณน้อยกว่า 10 ชิ้น และเกินกว่า 29 ชิ้น", table: "stocks", goldenQuery: "SELECT * FROM stocks WHERE quantity NOT BETWEEN 10 AND 29;", starterCode: "SELECT ",
    requirements: ["ใช้คำสั่ง NOT BETWEEN เพื่อหาข้อมูลนอกช่วง 10 ถึง 29"] },
  { id: 18, tutorProblemId: 124, type: "COURSE", moduleId: "03", title: "IS NULL Condition", category: "1.2 Select Condition", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงข้อมูลการสั่งซื้อ ที่ยังไม่ได้กำหนดวันที่จัดส่ง (Shipped_date)", table: "orders", goldenQuery: "SELECT * FROM Orders WHERE Shipped_date IS NULL;", starterCode: "SELECT " },
  { id: 19, tutorProblemId: 125, type: "COURSE", moduleId: "03", title: "IS NOT NULL", category: "1.2 Select Condition", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงชื่อจริงและนามสกุลของลูกค้าที่มีเบอร์โทรศัพท์", table: "customers", goldenQuery: "SELECT first_name, last_name FROM customers WHERE phone IS NOT NULL;", starterCode: "SELECT " },
  { id: 20, tutorProblemId: 126, type: "COURSE", moduleId: "03", title: "LIKE 'San%'", category: "1.2 Select Condition", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงชื่อร้านค้าและชื่อเมืองเฉพาะที่ขึ้นต้นด้วยคำว่า 'San'", table: "stores", goldenQuery: "SELECT store_name, city FROM stores WHERE city LIKE 'San%';", starterCode: "SELECT ",
    requirements: ["ใช้ LIKE ค้นหาคำที่ขึ้นต้นด้วย 'San' และตามด้วยเครื่องหมาย %"] },
  { id: 21, tutorProblemId: 127, type: "COURSE", moduleId: "03", title: "LIKE '%msn.com'", category: "1.2 Select Condition", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงชื่อ นามสกุลและอีเมลลูกค้า เฉพาะอีเมลที่ลงท้ายด้วย 'msn.com'", table: "customers", goldenQuery: "SELECT first_name, last_name, email FROM customers WHERE email LIKE '%msn.com';", starterCode: "SELECT " },
  { id: 22, tutorProblemId: 128, type: "COURSE", moduleId: "03", title: "LIKE '%original%'", category: "1.2 Select Condition", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงรหัสและชื่อสินค้า ที่มีคำว่า 'original' อยู่ในชื่อสินค้า", table: "products", goldenQuery: "SELECT product_id, product_name FROM products WHERE product_name LIKE '%original%';", starterCode: "SELECT " },
  { id: 23, tutorProblemId: 129, type: "COURSE", moduleId: "03", title: "AND Condition", category: "1.2 Select Condition", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงชื่อจริง รัฐ รหัสไปรษณีย์ลูกค้า ที่รัฐคือ 'CA' และรหัสไปรษณีย์มากกว่า 95000", table: "customers", goldenQuery: "SELECT first_name, state, zip_code FROM customers WHERE state = 'CA' AND zip_code > '95000';", starterCode: "SELECT ",
    requirements: ["ใช้ AND เพื่อเชื่อมเงื่อนไขให้เป็นจริงทั้งคู่"] },
  { id: 24, tutorProblemId: 130, type: "COURSE", moduleId: "03", title: "OR Condition", category: "1.2 Select Condition", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงชื่อจริง และชื่อรัฐของลูกค้า ที่อยู่รัฐ 'TX' หรือ 'NY'", table: "customers", goldenQuery: "SELECT first_name, state FROM customers WHERE state = 'TX' OR state = 'NY';", starterCode: "SELECT ",
    requirements: ["ใช้ OR เพื่อเชื่อมเงื่อนไขอย่างใดอย่างหนึ่ง"] },

  // --- 1.3 Join (Module: 05) ---
  { id: 25, tutorProblemId: 131, type: "COURSE", moduleId: "05", title: "Equi-join Products Brands", category: "1.3 Join", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงรหัสสินค้า ชื่อสินค้า และชื่อยี่ห้อ (ใช้ Equi-join ตัวย่อตาราง p และ b)", table: "products", tables: ["products", "brands"], goldenQuery: "SELECT p.product_id, p.product_name, b.brand_name FROM products p, brands b WHERE p.brand_id = b.brand_id;", starterCode: "SELECT ",
    requirements: ["ใช้การคั่นตารางด้วยลูกน้ำ (Equi-join)", "เชื่อมตารางด้วย WHERE clause"] },
  { id: 26, tutorProblemId: 132, type: "COURSE", moduleId: "05", title: "Equi-join Condition", category: "1.3 Join", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงชื่อสินค้า ชื่อประเภทสินค้า เฉพาะสินค้าที่ list_price > 3000 (ใช้ Equi-join p และ ca)", table: "products", tables: ["products", "categories"], goldenQuery: "SELECT p.product_name, ca.category_name FROM products p, categories ca WHERE p.category_id = ca.category_id AND p.list_price > 3000;", starterCode: "SELECT " },
  { id: 27, tutorProblemId: 133, type: "COURSE", moduleId: "05", title: "Equi-join 3 Tables", category: "1.3 Join", difficulty: "advanced",
    description: "เขียน SQL Statement แสดงชื่อสินค้า ยี่ห้อ ประเภท และราคา เรียงรหัสสินค้าจากน้อยไปมาก (ใช้ Equi-join)", table: "products", tables: ["products", "brands", "categories"], goldenQuery: "SELECT p.product_name, b.brand_name, ca.category_name, p.list_price FROM products p, brands b, categories ca WHERE p.brand_id = b.brand_id AND p.category_id = ca.category_id ORDER BY p.product_id;", starterCode: "SELECT " },
  { id: 28, tutorProblemId: 134, type: "COURSE", moduleId: "05", title: "JOIN ON Clause", category: "1.3 Join", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงชื่อ นามสกุล อีเมลพนักงาน รหัสร้าน และชื่อร้าน (ใช้ JOIN ON)", table: "staffs", tables: ["staffs", "stores"], goldenQuery: "SELECT st.first_name, st.last_name, st.email, s.store_id, s.store_name FROM staffs st JOIN stores s ON st.store_id = s.store_id;", starterCode: "SELECT ",
    requirements: ["ใช้คำสั่ง JOIN ON ในการเชื่อม 2 ตาราง"] },
  { id: 29, tutorProblemId: 135, type: "COURSE", moduleId: "05", title: "JOIN ON Filter", category: "1.3 Join", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงชื่อสินค้าและจำนวนสินค้าคงเหลือของร้านค้ารหัส 3 (ใช้ JOIN ON)", table: "stocks", tables: ["stocks", "products"], goldenQuery: "SELECT p.Product_name, sto.Quantity FROM Stocks AS sto JOIN Products AS p ON sto.Product_ID = p.Product_ID WHERE sto.Store_ID = 3;", starterCode: "SELECT " },
  { id: 30, tutorProblemId: 136, type: "COURSE", moduleId: "05", title: "Multiple JOIN ON", category: "1.3 Join", difficulty: "advanced",
    description: "จงเขียน SQL Statement แสดงรหัสสั่งซื้อ วันที่สั่งซื้อ ชื่อเต็มลูกค้า(ตั้งชื่อว่า customer_name) ชื่อร้าน สถานะ (ใช้ JOIN ON)", table: "orders", tables: ["orders", "customers", "stores"], goldenQuery: "SELECT o.order_id, o.order_date, CONCAT(c.first_name, ' ', c.last_name) AS customer_name, s.store_name, o.order_status FROM orders o JOIN customers c ON o.customer_id = c.customer_id JOIN stores s ON o.store_id = s.store_id;", starterCode: "SELECT " },
  { id: 31, tutorProblemId: 137, type: "COURSE", moduleId: "05", title: "JOIN USING", category: "1.3 Join", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงรหัสสั่งซื้อ รหัสลูกค้า ชื่อจริงนามสกุลพนักงานที่ดำเนินการ (ใช้ JOIN USING)", table: "orders", tables: ["orders", "staffs"], goldenQuery: "SELECT order_id, customer_id, first_name, last_name FROM orders JOIN staffs USING (staff_id);", starterCode: "SELECT ",
    requirements: ["ใช้คำสั่ง JOIN USING เมื่อคอลัมน์เชื่อมมีชื่อเหมือนกัน"] },
  { id: 32, tutorProblemId: 138, type: "COURSE", moduleId: "05", title: "JOIN USING Filter", category: "1.3 Join", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงชื่อสินค้า ชื่อประเภท ราคา เฉพาะประเภท 'Cyclocross Bicycles' (ใช้ JOIN USING)", table: "products", tables: ["products", "categories"], goldenQuery: "SELECT product_name, category_name, list_price FROM products JOIN categories USING (category_id) WHERE category_name = 'Cyclocross Bicycles';", starterCode: "SELECT " },
  { id: 33, tutorProblemId: 139, type: "COURSE", moduleId: "05", title: "Orders Multi Join", category: "1.3 Join", difficulty: "advanced",
    description: "จงเขียน SQL Statement แสดงรหัสสั่งซื้อ ชื่อจริงลูกค้า ชื่อร้านค้า เรียงตามรหัสสั่งซื้อ", table: "orders", tables: ["orders", "customers", "stores"], goldenQuery: "SELECT o.order_id, c.first_name, s.store_name FROM orders o JOIN customers c ON (o.customer_id=c.customer_id) JOIN stores s ON (o.store_id = s.store_id) ORDER BY o.order_id;", starterCode: "SELECT " },
  { id: 34, tutorProblemId: 140, type: "COURSE", moduleId: "05", title: "Stocks Join", category: "1.3 Join", difficulty: "advanced",
    description: "จงเขียน SQL Statement แสดงชื่อสินค้า ปริมาณในคลังทั้งหมดที่มีในร้านชื่อ 'Santa Cruz Bikes'", table: "products", tables: ["products", "stocks", "stores"], goldenQuery: "SELECT p.Product_name, sto.Quantity FROM Products AS p JOIN Stocks AS sto ON p.Product_ID = sto.Product_ID JOIN Stores AS s ON sto.Store_ID = s.Store_ID WHERE s.Store_name = 'Santa Cruz Bikes';", starterCode: "SELECT " },
  { id: 35, tutorProblemId: 141, type: "COURSE", moduleId: "05", title: "NATURAL JOIN Basic", category: "1.3 Join", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงชื่อสินค้าและประเภทสินค้าทั้งหมด (ใช้ NATURAL JOIN)", table: "products", tables: ["products", "categories"], goldenQuery: "SELECT product_name, category_name FROM categories NATURAL JOIN products;", starterCode: "SELECT ",
    requirements: ["ใช้คำสั่ง NATURAL JOIN ในการหาคอลัมน์ที่ชื่อตรงกันอัตโนมัติ"] },
  { id: 36, tutorProblemId: 142, type: "COURSE", moduleId: "05", title: "NATURAL JOIN Filter", category: "1.3 Join", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงชื่อสินค้าและยี่ห้อ เฉพาะสินค้าปี 2016 (ใช้ NATURAL JOIN)", table: "products", tables: ["products", "brands"], goldenQuery: "SELECT product_name, brand_name FROM products NATURAL JOIN brands WHERE model_year = 2016;", starterCode: "SELECT " },

  // --- 1.4 Order By & Limit (Module: 04) ---
  { id: 106, tutorProblemId: 291, type: "COURSE", moduleId: "04", title: "Order Products By Price Ascending", category: "1.4 Order By & Limit", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงข้อมูลสินค้าทั้งหมด เรียงลำดับตามราคาขาย (list_price) จากน้อยไปมาก", table: "products", goldenQuery: "SELECT * FROM products ORDER BY list_price ASC;", starterCode: "SELECT ",
    requirements: ["ใช้คำสั่ง ORDER BY เรียงลำดับข้อมูล", "เรียงจากราคาน้อยไปมาก (ASC)"] },
  { id: 107, tutorProblemId: 292, type: "COURSE", moduleId: "04", title: "Order Products By Price Descending", category: "1.4 Order By & Limit", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงข้อมูลสินค้าทั้งหมด เรียงลำดับตามราคาขาย (list_price) จากมากไปน้อย", table: "products", goldenQuery: "SELECT * FROM products ORDER BY list_price DESC;", starterCode: "SELECT ",
    requirements: ["ใช้คำสั่ง ORDER BY เรียงลำดับข้อมูล", "เรียงจากราคามากไปน้อย (DESC)"] },
  { id: 108, tutorProblemId: 293, type: "COURSE", moduleId: "04", title: "Order Customers By Last Name", category: "1.4 Order By & Limit", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงข้อมูลลูกค้าทั้งหมด เรียงลำดับตามนามสกุล (last_name) จาก A ไป Z", table: "customers", goldenQuery: "SELECT * FROM customers ORDER BY last_name ASC;", starterCode: "SELECT ",
    requirements: ["ใช้คำสั่ง ORDER BY เรียงตามนามสกุล", "เรียงจากน้อยไปมาก (ASC)"] },
  { id: 109, tutorProblemId: 294, type: "COURSE", moduleId: "04", title: "Order Staff By First Name", category: "1.4 Order By & Limit", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงข้อมูลพนักงานทั้งหมด เรียงลำดับตามชื่อ (first_name) จาก A ไป Z", table: "staffs", goldenQuery: "SELECT * FROM staffs ORDER BY first_name ASC;", starterCode: "SELECT ",
    requirements: ["ใช้คำสั่ง ORDER BY เรียงตามชื่อพนักงาน"] },
  { id: 110, tutorProblemId: 295, type: "COURSE", moduleId: "04", title: "Order Customers By State And City", category: "1.4 Order By & Limit", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงข้อมูลลูกค้าทั้งหมด เรียงลำดับตามรัฐ (state) จาก Z ไป A ก่อน แล้วเรียงตามเมือง (city) จาก A ไป Z ในแต่ละรัฐ", table: "customers", goldenQuery: "SELECT * FROM customers ORDER BY state DESC, city ASC;", starterCode: "SELECT ",
    requirements: ["ใช้คำสั่ง ORDER BY มากกว่า 1 คอลัมน์", "คอลัมน์แรก (state) เรียงจากมากไปน้อย (DESC) คอลัมน์ที่สอง (city) เรียงจากน้อยไปมาก (ASC)"] },
  { id: 111, tutorProblemId: 296, type: "COURSE", moduleId: "04", title: "Completed Orders By Date", category: "1.4 Order By & Limit", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงข้อมูลคำสั่งซื้อที่มีสถานะเสร็จสมบูรณ์ (order_status เท่ากับ 4) เรียงลำดับตามวันที่สั่งซื้อ (order_date) จากล่าสุดไปเก่าสุด", table: "orders", goldenQuery: "SELECT * FROM orders WHERE order_status = 4 ORDER BY order_date DESC;", starterCode: "SELECT ",
    requirements: ["ใช้ WHERE กรองเฉพาะ order_status เท่ากับ 4", "ใช้ ORDER BY เรียงตามวันที่จากล่าสุดไปเก่าสุด (DESC)"] },
  { id: 112, tutorProblemId: 297, type: "COURSE", moduleId: "04", title: "Order Products By Year And Price", category: "1.4 Order By & Limit", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงข้อมูลสินค้าทั้งหมด เรียงลำดับตามปีรุ่น (model_year) จากใหม่ไปเก่า แล้วเรียงตามราคา (list_price) จากน้อยไปมากในแต่ละปี", table: "products", goldenQuery: "SELECT * FROM products ORDER BY model_year DESC, list_price ASC;", starterCode: "SELECT ",
    requirements: ["ใช้ ORDER BY 2 คอลัมน์", "model_year เรียง DESC และ list_price เรียง ASC"] },
  { id: 113, tutorProblemId: 298, type: "COURSE", moduleId: "04", title: "Order Stores By State And City", category: "1.4 Order By & Limit", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงข้อมูลร้านค้าทั้งหมด เรียงลำดับตามรัฐ (state) และเมือง (city) จาก A ไป Z ทั้งคู่", table: "stores", goldenQuery: "SELECT * FROM stores ORDER BY state ASC, city ASC;", starterCode: "SELECT ",
    requirements: ["ใช้ ORDER BY เรียงตาม state ก่อน แล้วตาม city"] },
  { id: 114, tutorProblemId: 299, type: "COURSE", moduleId: "04", title: "Top Priced Products", category: "1.4 Order By & Limit", difficulty: "advanced",
    description: "จงเขียน SQL Statement แสดงสินค้า 5 รายการที่มีราคา (list_price) มากกว่า 1000 โดยเรียงจากราคามากไปน้อย", table: "products", goldenQuery: "SELECT * FROM products WHERE list_price > 1000 ORDER BY list_price DESC LIMIT 5;", starterCode: "SELECT ",
    requirements: ["ใช้ WHERE กรองราคามากกว่า 1000", "ใช้ ORDER BY เรียงราคามากไปน้อย", "ใช้ LIMIT จำกัดผลลัพธ์ 5 แถว"] },
  { id: 115, tutorProblemId: 300, type: "COURSE", moduleId: "04", title: "Paginate Customers By Last Name", category: "1.4 Order By & Limit", difficulty: "advanced",
    description: "จงเขียน SQL Statement แสดงข้อมูลลูกค้าเรียงตามนามสกุล (last_name) จาก A ไป Z โดยข้ามลูกค้า 10 รายแรก แล้วแสดง 10 รายถัดไป (หน้าที่ 2)", table: "customers", goldenQuery: "SELECT * FROM customers ORDER BY last_name ASC LIMIT 10 OFFSET 10;", starterCode: "SELECT ",
    requirements: ["ใช้ ORDER BY เรียงตามนามสกุล", "ใช้ LIMIT ... OFFSET ... เพื่อแบ่งหน้าข้อมูล"] },
  { id: 116, tutorProblemId: 301, type: "COURSE", moduleId: "04", title: "Five Latest Completed Orders", category: "1.4 Order By & Limit", difficulty: "advanced",
    description: "จงเขียน SQL Statement แสดงคำสั่งซื้อ 5 รายการล่าสุดที่มีสถานะเสร็จสมบูรณ์ (order_status เท่ากับ 4)", table: "orders", goldenQuery: "SELECT * FROM orders WHERE order_status = 4 ORDER BY order_date DESC LIMIT 5;", starterCode: "SELECT ",
    requirements: ["ใช้ WHERE กรอง order_status เท่ากับ 4", "ใช้ ORDER BY เรียงวันที่ล่าสุดก่อน", "ใช้ LIMIT จำกัด 5 แถว"] },
  { id: 117, tutorProblemId: 302, type: "COURSE", moduleId: "04", title: "Top Ten Stocked Products", category: "1.4 Order By & Limit", difficulty: "advanced",
    description: "จงเขียน SQL Statement แสดงสินค้าคงคลัง 10 รายการที่มีจำนวนสินค้าคงเหลือ (quantity) มากที่สุด", table: "stocks", goldenQuery: "SELECT * FROM stocks ORDER BY quantity DESC LIMIT 10;", starterCode: "SELECT ",
    requirements: ["ใช้ ORDER BY เรียงจำนวนคงเหลือมากไปน้อย", "ใช้ LIMIT จำกัด 10 แถว"] },

  // --- 1.5 Outer Join (Module: 06) ---
  { id: 132, tutorProblemId: 303, type: "COURSE", moduleId: "06", title: "Stores With Their Orders", category: "1.5 Outer Join", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงข้อมูลร้านค้าทุกร้าน พร้อมคำสั่งซื้อของร้านนั้น (ถ้ามี) โดยใช้ LEFT JOIN เชื่อมตาราง stores กับ orders", table: "stores", tables: ["stores", "orders"], goldenQuery: "SELECT * FROM stores LEFT JOIN orders ON stores.store_id = orders.store_id;", starterCode: "SELECT ",
    requirements: ["ใช้ LEFT JOIN เชื่อมตาราง stores กับ orders", "เชื่อมด้วยเงื่อนไข store_id เท่ากัน"] },
  { id: 133, tutorProblemId: 304, type: "COURSE", moduleId: "06", title: "Customers With Their Orders", category: "1.5 Outer Join", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงข้อมูลลูกค้าทุกคน พร้อมคำสั่งซื้อของลูกค้านั้น (ถ้ามี) โดยใช้ LEFT JOIN เชื่อมตาราง customers กับ orders", table: "customers", tables: ["customers", "orders"], goldenQuery: "SELECT * FROM customers LEFT JOIN orders ON customers.customer_id = orders.customer_id;", starterCode: "SELECT ",
    requirements: ["ใช้ LEFT JOIN เชื่อมตาราง customers กับ orders", "เชื่อมด้วยเงื่อนไข customer_id เท่ากัน"] },
  { id: 134, tutorProblemId: 305, type: "COURSE", moduleId: "06", title: "All Products With Order Items", category: "1.5 Outer Join", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงข้อมูลสินค้าทุกชิ้น พร้อมรายการสั่งซื้อของสินค้านั้น (ถ้ามี) โดยใช้ RIGHT JOIN เชื่อมตาราง order_items กับ products ให้แสดงสินค้าครบทุกชิ้นแม้ไม่เคยถูกสั่งซื้อ", table: "products", tables: ["order_items", "products"], goldenQuery: "SELECT * FROM order_items RIGHT JOIN products ON order_items.product_id = products.product_id;", starterCode: "SELECT ",
    requirements: ["ใช้ RIGHT JOIN เชื่อมตาราง order_items กับ products", "เชื่อมด้วยเงื่อนไข product_id เท่ากัน"] },
  { id: 135, tutorProblemId: 306, type: "COURSE", moduleId: "06", title: "Staff With Their Orders", category: "1.5 Outer Join", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงข้อมูลพนักงานทุกคน พร้อมคำสั่งซื้อที่รับผิดชอบ (ถ้ามี) โดยใช้ LEFT JOIN เชื่อมตาราง staffs กับ orders", table: "staffs", tables: ["staffs", "orders"], goldenQuery: "SELECT * FROM staffs LEFT JOIN orders ON staffs.staff_id = orders.staff_id;", starterCode: "SELECT ",
    requirements: ["ใช้ LEFT JOIN เชื่อมตาราง staffs กับ orders", "เชื่อมด้วยเงื่อนไข staff_id เท่ากัน"] },
  { id: 136, tutorProblemId: 307, type: "COURSE", moduleId: "06", title: "Customers With No Orders In 2018", category: "1.5 Outer Join", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงข้อมูลลูกค้าที่ไม่มีคำสั่งซื้อตั้งแต่ปี 2018 เป็นต้นไป โดยใช้ LEFT JOIN พร้อมใส่เงื่อนไขวันที่ไว้ใน ON แล้วกรองแถวที่ไม่มีคู่ด้วย IS NULL", table: "customers", tables: ["customers", "orders"], goldenQuery: "SELECT customers.* FROM customers LEFT JOIN orders ON customers.customer_id = orders.customer_id AND orders.order_date >= '2018-01-01' WHERE orders.order_id IS NULL;", starterCode: "SELECT ",
    requirements: ["ใช้ LEFT JOIN เชื่อมตาราง customers กับ orders", "ใส่เงื่อนไขวันที่ไว้ใน ON ไม่ใช่ WHERE", "กรองแถวที่ไม่มีคู่ด้วย orders.order_id IS NULL"] },
  { id: 137, tutorProblemId: 308, type: "COURSE", moduleId: "06", title: "Staff With No Manager", category: "1.5 Outer Join", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงพนักงานที่ไม่มีหัวหน้างาน (manager_id เป็น NULL) โดยใช้ LEFT JOIN เชื่อมตาราง staffs กับตัวเอง (self join) ผ่านคอลัมน์ manager_id", table: "staffs", tables: ["staffs"], goldenQuery: "SELECT s1.* FROM staffs s1 LEFT JOIN staffs s2 ON s1.manager_id = s2.staff_id WHERE s2.staff_id IS NULL;", starterCode: "SELECT ",
    requirements: ["ใช้ LEFT JOIN เชื่อมตาราง staffs กับตัวเอง (self join)", "ใช้ WHERE กรองแถวที่ไม่มีหัวหน้างาน"] },
  { id: 138, tutorProblemId: 309, type: "COURSE", moduleId: "06", title: "Products Never Stocked", category: "1.5 Outer Join", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงสินค้าที่ไม่เคยมีในสต๊อกของร้านใดเลย โดยใช้ LEFT JOIN เชื่อมตาราง products กับ stocks แล้วกรองด้วย WHERE", table: "products", tables: ["products", "stocks"], goldenQuery: "SELECT products.* FROM products LEFT JOIN stocks ON products.product_id = stocks.product_id WHERE stocks.product_id IS NULL;", starterCode: "SELECT ",
    requirements: ["ใช้ LEFT JOIN เชื่อมตาราง products กับ stocks", "ใช้ WHERE กรองแถวที่ stocks.product_id เป็น NULL"] },
  { id: 139, tutorProblemId: 310, type: "COURSE", moduleId: "06", title: "Products Not Stocked At Store One", category: "1.5 Outer Join", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงสินค้าที่ไม่มีอยู่ในสต๊อกของร้านรหัส 1 โดยใช้ LEFT JOIN พร้อมใส่เงื่อนไขร้านค้าไว้ใน ON แล้วกรองแถวที่ไม่มีคู่ด้วย IS NULL", table: "products", tables: ["products", "stocks"], goldenQuery: "SELECT products.* FROM products LEFT JOIN stocks ON products.product_id = stocks.product_id AND stocks.store_id = 1 WHERE stocks.product_id IS NULL;", starterCode: "SELECT ",
    requirements: ["ใช้ LEFT JOIN เชื่อมตาราง products กับ stocks", "ใส่เงื่อนไข stocks.store_id = 1 ไว้ใน ON", "กรองแถวที่ไม่มีคู่ด้วย stocks.product_id IS NULL"] },
  { id: 140, tutorProblemId: 311, type: "COURSE", moduleId: "06", title: "Stores Orders And Items", category: "1.5 Outer Join", difficulty: "advanced",
    description: "จงเขียน SQL Statement แสดงข้อมูลร้านค้าทุกร้าน พร้อมคำสั่งซื้อ และรายการสินค้าในคำสั่งซื้อนั้น (ถ้ามี) โดยเชื่อม 3 ตาราง stores, orders, order_items ด้วย LEFT JOIN", table: "stores", tables: ["stores", "orders", "order_items"], goldenQuery: "SELECT * FROM stores LEFT JOIN orders ON stores.store_id = orders.store_id LEFT JOIN order_items ON orders.order_id = order_items.order_id;", starterCode: "SELECT ",
    requirements: ["ใช้ LEFT JOIN เชื่อม 3 ตาราง (stores, orders, order_items)", "เชื่อมตามลำดับ store_id แล้ว order_id"] },
  { id: 141, tutorProblemId: 312, type: "COURSE", moduleId: "06", title: "Staff Orders And Customers", category: "1.5 Outer Join", difficulty: "advanced",
    description: "จงเขียน SQL Statement แสดงพนักงานทุกคน พร้อมคำสั่งซื้อที่รับผิดชอบ และข้อมูลลูกค้าของคำสั่งซื้อนั้น (ถ้ามี) โดยเชื่อม 3 ตาราง staffs, orders, customers ด้วย LEFT JOIN", table: "staffs", tables: ["staffs", "orders", "customers"], goldenQuery: "SELECT * FROM staffs LEFT JOIN orders ON staffs.staff_id = orders.staff_id LEFT JOIN customers ON orders.customer_id = customers.customer_id;", starterCode: "SELECT ",
    requirements: ["ใช้ LEFT JOIN เชื่อม 3 ตาราง (staffs, orders, customers)", "เชื่อมตามลำดับ staff_id แล้ว customer_id"] },
  { id: 142, tutorProblemId: 313, type: "COURSE", moduleId: "06", title: "Products With No Stock Right Join", category: "1.5 Outer Join", difficulty: "advanced",
    description: "จงเขียน SQL Statement แสดงสินค้าที่ไม่มีข้อมูลจำนวนคงเหลือ (quantity) ในตาราง stocks เลย โดยใช้ RIGHT JOIN เชื่อมตาราง stocks กับ products แล้วกรองด้วย WHERE", table: "products", tables: ["stocks", "products"], goldenQuery: "SELECT products.* FROM stocks RIGHT JOIN products ON stocks.product_id = products.product_id WHERE stocks.quantity IS NULL;", starterCode: "SELECT ",
    requirements: ["ใช้ RIGHT JOIN เชื่อมตาราง stocks กับ products", "ใช้ WHERE กรองแถวที่ quantity เป็น NULL"] },
  { id: 143, tutorProblemId: 314, type: "COURSE", moduleId: "06", title: "Unshipped Orders With Details", category: "1.5 Outer Join", difficulty: "advanced",
    description: "จงเขียน SQL Statement แสดงคำสั่งซื้อที่ยังไม่จัดส่ง (shipped_date เป็น NULL) พร้อมข้อมูลลูกค้าและร้านค้า โดยเชื่อม 3 ตาราง orders, customers, stores ด้วย LEFT JOIN", table: "orders", tables: ["orders", "customers", "stores"], goldenQuery: "SELECT * FROM orders LEFT JOIN customers ON orders.customer_id = customers.customer_id LEFT JOIN stores ON orders.store_id = stores.store_id WHERE orders.shipped_date IS NULL;", starterCode: "SELECT ",
    requirements: ["ใช้ LEFT JOIN เชื่อม 3 ตาราง (orders, customers, stores)", "ใช้ WHERE กรองคำสั่งซื้อที่ shipped_date เป็น NULL"] },

  // --- 1.6 Aggregate Functions (Module: 07) ---
  { id: 158, tutorProblemId: 315, type: "COURSE", moduleId: "07", title: "Count Total Products", category: "1.6 Aggregate Functions", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงจำนวนสินค้าทั้งหมดในตาราง products โดยตั้งชื่อคอลัมน์ว่า 'total_products'", table: "products", goldenQuery: "SELECT COUNT(*) AS total_products FROM products;", starterCode: "SELECT ",
    requirements: ["ใช้ฟังก์ชัน COUNT นับจำนวนแถวทั้งหมด", "ตั้งชื่อคอลัมน์ผลลัพธ์ว่า 'total_products'"] },
  { id: 159, tutorProblemId: 316, type: "COURSE", moduleId: "07", title: "Average Product Price", category: "1.6 Aggregate Functions", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงราคาสินค้าเฉลี่ย (list_price) ของสินค้าทั้งหมด โดยตั้งชื่อคอลัมน์ว่า 'avg_price'", table: "products", goldenQuery: "SELECT AVG(list_price) AS avg_price FROM products;", starterCode: "SELECT ",
    requirements: ["ใช้ฟังก์ชัน AVG หาค่าเฉลี่ยราคา", "ตั้งชื่อคอลัมน์ผลลัพธ์ว่า 'avg_price'"] },
  { id: 160, tutorProblemId: 317, type: "COURSE", moduleId: "07", title: "Highest And Lowest Product Price", category: "1.6 Aggregate Functions", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงราคาสินค้าสูงสุดและต่ำสุด (list_price) ของสินค้าทั้งหมด โดยตั้งชื่อคอลัมน์ว่า 'max_price' และ 'min_price'", table: "products", goldenQuery: "SELECT MAX(list_price) AS max_price, MIN(list_price) AS min_price FROM products;", starterCode: "SELECT ",
    requirements: ["ใช้ฟังก์ชัน MAX และ MIN", "ตั้งชื่อคอลัมน์ว่า 'max_price' และ 'min_price'"] },
  { id: 161, tutorProblemId: 318, type: "COURSE", moduleId: "07", title: "Total Quantity Sold", category: "1.6 Aggregate Functions", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงผลรวมจำนวนสินค้าที่ขายได้ทั้งหมด (quantity) จากตาราง order_items โดยตั้งชื่อคอลัมน์ว่า 'total_quantity'", table: "order_items", goldenQuery: "SELECT SUM(quantity) AS total_quantity FROM order_items;", starterCode: "SELECT ",
    requirements: ["ใช้ฟังก์ชัน SUM รวมจำนวนสินค้า", "ตั้งชื่อคอลัมน์ผลลัพธ์ว่า 'total_quantity'"] },
  { id: 162, tutorProblemId: 319, type: "COURSE", moduleId: "07", title: "Product Count Per Category", category: "1.6 Aggregate Functions", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงจำนวนสินค้าในแต่ละหมวดหมู่ (category_id) โดยตั้งชื่อคอลัมน์นับจำนวนว่า 'product_count'", table: "products", goldenQuery: "SELECT category_id, COUNT(*) AS product_count FROM products GROUP BY category_id;", starterCode: "SELECT ",
    requirements: ["ใช้ GROUP BY category_id", "ใช้ COUNT นับจำนวนสินค้าในแต่ละกลุ่ม", "ตั้งชื่อคอลัมน์ว่า 'product_count'"] },
  { id: 163, tutorProblemId: 320, type: "COURSE", moduleId: "07", title: "Average Price Per Brand", category: "1.6 Aggregate Functions", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงราคาเฉลี่ย (list_price) ของสินค้าในแต่ละแบรนด์ (brand_id) โดยตั้งชื่อคอลัมน์ว่า 'avg_price'", table: "products", goldenQuery: "SELECT brand_id, AVG(list_price) AS avg_price FROM products GROUP BY brand_id;", starterCode: "SELECT ",
    requirements: ["ใช้ GROUP BY brand_id", "ใช้ AVG หาราคาเฉลี่ยในแต่ละกลุ่ม", "ตั้งชื่อคอลัมน์ว่า 'avg_price'"] },
  { id: 164, tutorProblemId: 321, type: "COURSE", moduleId: "07", title: "Order Count Per Customer", category: "1.6 Aggregate Functions", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงจำนวนคำสั่งซื้อของลูกค้าแต่ละคน (customer_id) จากตาราง orders โดยตั้งชื่อคอลัมน์นับจำนวนว่า 'order_count'", table: "orders", goldenQuery: "SELECT customer_id, COUNT(*) AS order_count FROM orders GROUP BY customer_id;", starterCode: "SELECT ",
    requirements: ["ใช้ GROUP BY customer_id", "ใช้ COUNT นับจำนวนคำสั่งซื้อ", "ตั้งชื่อคอลัมน์ว่า 'order_count'"] },
  { id: 165, tutorProblemId: 322, type: "COURSE", moduleId: "07", title: "Stock Sum Per Store", category: "1.6 Aggregate Functions", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงผลรวมจำนวนสินค้าคงเหลือ (quantity) ของแต่ละร้านค้า (store_id) จากตาราง stocks โดยตั้งชื่อคอลัมน์ว่า 'total_stock'", table: "stocks", goldenQuery: "SELECT store_id, SUM(quantity) AS total_stock FROM stocks GROUP BY store_id;", starterCode: "SELECT ",
    requirements: ["ใช้ GROUP BY store_id", "ใช้ SUM รวมจำนวนคงเหลือ", "ตั้งชื่อคอลัมน์ว่า 'total_stock'"] },
  { id: 166, tutorProblemId: 323, type: "COURSE", moduleId: "07", title: "Categories With More Than Ten Products", category: "1.6 Aggregate Functions", difficulty: "advanced",
    description: "จงเขียน SQL Statement แสดงหมวดหมู่ (category_id) ที่มีจำนวนสินค้ามากกว่า 10 รายการ โดยตั้งชื่อคอลัมน์นับจำนวนว่า 'product_count'", table: "products", goldenQuery: "SELECT category_id, COUNT(*) AS product_count FROM products GROUP BY category_id HAVING COUNT(*) > 10;", starterCode: "SELECT ",
    requirements: ["ใช้ GROUP BY category_id", "ใช้ HAVING กรองกลุ่มที่มีจำนวนมากกว่า 10", "ตั้งชื่อคอลัมน์ว่า 'product_count'"] },
  { id: 167, tutorProblemId: 324, type: "COURSE", moduleId: "07", title: "Staff With High Order Volume", category: "1.6 Aggregate Functions", difficulty: "advanced",
    description: "จงเขียน SQL Statement แสดงพนักงาน (staff_id) ที่รับผิดชอบคำสั่งซื้อมากกว่า 5 รายการ จากตาราง orders โดยตั้งชื่อคอลัมน์นับจำนวนว่า 'order_count'", table: "orders", goldenQuery: "SELECT staff_id, COUNT(*) AS order_count FROM orders GROUP BY staff_id HAVING COUNT(*) > 5;", starterCode: "SELECT ",
    requirements: ["ใช้ GROUP BY staff_id", "ใช้ HAVING กรองกลุ่มที่มีจำนวนมากกว่า 5", "ตั้งชื่อคอลัมน์ว่า 'order_count'"] },
  { id: 168, tutorProblemId: 325, type: "COURSE", moduleId: "07", title: "Total Quantity Sold Per Product", category: "1.6 Aggregate Functions", difficulty: "advanced",
    description: "จงเขียน SQL Statement แสดงชื่อสินค้า (product_name) พร้อมผลรวมจำนวนที่ขายได้ (quantity) ของสินค้าแต่ละชิ้น โดยเชื่อมตาราง products กับ order_items ด้วย JOIN แล้ว GROUP BY ชื่อสินค้า และตั้งชื่อคอลัมน์ผลรวมว่า 'total_sold'", table: "products", tables: ["products", "order_items"], goldenQuery: "SELECT products.product_name, SUM(order_items.quantity) AS total_sold FROM products JOIN order_items ON products.product_id = order_items.product_id GROUP BY products.product_name;", starterCode: "SELECT ",
    requirements: ["ใช้ JOIN เชื่อมตาราง products กับ order_items", "ใช้ GROUP BY product_name แล้ว SUM จำนวนที่ขาย", "ตั้งชื่อคอลัมน์ว่า 'total_sold'"] },
  { id: 169, tutorProblemId: 326, type: "COURSE", moduleId: "07", title: "Average Order Value Per Store", category: "1.6 Aggregate Functions", difficulty: "advanced",
    description: "จงเขียน SQL Statement แสดงชื่อร้านค้า (store_name) พร้อมมูลค่าคำสั่งซื้อเฉลี่ยต่อรายการ (list_price) โดยเชื่อมตาราง stores กับ orders และ order_items ด้วย JOIN แล้ว GROUP BY ชื่อร้าน และตั้งชื่อคอลัมน์เฉลี่ยว่า 'avg_order_value'", table: "stores", tables: ["stores", "orders", "order_items"], goldenQuery: "SELECT stores.store_name, AVG(order_items.list_price) AS avg_order_value FROM stores JOIN orders ON stores.store_id = orders.store_id JOIN order_items ON orders.order_id = order_items.order_id GROUP BY stores.store_name;", starterCode: "SELECT ",
    requirements: ["ใช้ JOIN เชื่อม 3 ตาราง (stores, orders, order_items)", "ใช้ GROUP BY store_name แล้ว AVG มูลค่า", "ตั้งชื่อคอลัมน์ว่า 'avg_order_value'"] },

  // --- 1.7 Subqueries (Module: 08) ---
  { id: 184, tutorProblemId: 327, type: "COURSE", moduleId: "08", title: "Products Priced Above Average", category: "1.7 Subqueries", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงสินค้าที่มีราคา (list_price) มากกว่าราคาเฉลี่ยของสินค้าทั้งหมด โดยใช้ subquery หาค่าเฉลี่ยในเงื่อนไข WHERE", table: "products", goldenQuery: "SELECT * FROM products WHERE list_price > (SELECT AVG(list_price) FROM products);", starterCode: "SELECT ",
    requirements: ["ใช้ subquery แบบ scalar ใน WHERE เปรียบเทียบด้วย >", "subquery หาค่า AVG(list_price) ของสินค้าทั้งหมด"] },
  { id: 185, tutorProblemId: 328, type: "COURSE", moduleId: "08", title: "Customers Who Placed Orders", category: "1.7 Subqueries", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงข้อมูลลูกค้าที่เคยสั่งซื้อสินค้าอย่างน้อย 1 ครั้ง โดยใช้ subquery กับ IN ในเงื่อนไข WHERE", table: "customers", tables: ["customers", "orders"], goldenQuery: "SELECT * FROM customers WHERE customer_id IN (SELECT customer_id FROM orders);", starterCode: "SELECT ",
    requirements: ["ใช้ subquery ใน WHERE ร่วมกับ IN", "subquery ดึง customer_id จากตาราง orders"] },
  { id: 186, tutorProblemId: 329, type: "COURSE", moduleId: "08", title: "Product With Highest Price", category: "1.7 Subqueries", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงสินค้าที่มีราคา (list_price) สูงที่สุด โดยใช้ subquery หาค่าราคาสูงสุดในเงื่อนไข WHERE", table: "products", goldenQuery: "SELECT * FROM products WHERE list_price = (SELECT MAX(list_price) FROM products);", starterCode: "SELECT ",
    requirements: ["ใช้ subquery แบบ scalar ใน WHERE เปรียบเทียบด้วย =", "subquery หาค่า MAX(list_price) ของสินค้าทั้งหมด"] },
  { id: 187, tutorProblemId: 330, type: "COURSE", moduleId: "08", title: "Staff Who Handled Orders", category: "1.7 Subqueries", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงข้อมูลพนักงานที่เคยรับผิดชอบคำสั่งซื้ออย่างน้อย 1 รายการ โดยใช้ subquery กับ IN ในเงื่อนไข WHERE", table: "staffs", tables: ["staffs", "orders"], goldenQuery: "SELECT * FROM staffs WHERE staff_id IN (SELECT staff_id FROM orders);", starterCode: "SELECT ",
    requirements: ["ใช้ subquery ใน WHERE ร่วมกับ IN", "subquery ดึง staff_id จากตาราง orders"] },
  { id: 188, tutorProblemId: 331, type: "COURSE", moduleId: "08", title: "Products Never Ordered Subquery", category: "1.7 Subqueries", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงสินค้าที่ไม่เคยถูกสั่งซื้อเลย โดยใช้ subquery กับ NOT IN ในเงื่อนไข WHERE", table: "products", tables: ["products", "order_items"], goldenQuery: "SELECT * FROM products WHERE product_id NOT IN (SELECT product_id FROM order_items);", starterCode: "SELECT ",
    requirements: ["ใช้ subquery ใน WHERE ร่วมกับ NOT IN", "subquery ดึง product_id จากตาราง order_items"] },
  { id: 189, tutorProblemId: 332, type: "COURSE", moduleId: "08", title: "Order Items With Above Average Quantity", category: "1.7 Subqueries", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงคำสั่งซื้อที่มีจำนวนสินค้า (quantity) มากกว่าค่าเฉลี่ยของรายการสั่งซื้อทั้งหมด โดยใช้ subquery หาค่าเฉลี่ยในเงื่อนไข WHERE", table: "order_items", goldenQuery: "SELECT * FROM order_items WHERE quantity > (SELECT AVG(quantity) FROM order_items);", starterCode: "SELECT ",
    requirements: ["ใช้ subquery แบบ scalar ใน WHERE เปรียบเทียบด้วย >", "subquery หาค่า AVG(quantity) ของรายการสั่งซื้อทั้งหมด"] },
  { id: 190, tutorProblemId: 333, type: "COURSE", moduleId: "08", title: "Correlated Products Above Category Average", category: "1.7 Subqueries", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงสินค้าที่มีราคา (list_price) มากกว่าราคาเฉลี่ยของสินค้าในหมวดหมู่เดียวกัน โดยใช้ correlated subquery ที่อ้างอิงตาราง products ของ query หลัก", table: "products", goldenQuery: "SELECT * FROM products p1 WHERE list_price > (SELECT AVG(list_price) FROM products p2 WHERE p2.category_id = p1.category_id);", starterCode: "SELECT ",
    requirements: ["ใช้ correlated subquery ที่อ้างอิงตาราง products ของ query หลัก (p1)", "subquery หาค่า AVG(list_price) เฉพาะสินค้าในหมวดหมู่เดียวกัน"] },
  { id: 191, tutorProblemId: 334, type: "COURSE", moduleId: "08", title: "Stores With Above Average Order Count", category: "1.7 Subqueries", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงร้านค้าที่มีจำนวนคำสั่งซื้อมากกว่าค่าเฉลี่ยของทุกร้าน โดยใช้ subquery ใน FROM (derived table) นับจำนวนคำสั่งซื้อของแต่ละร้านก่อน แล้วเปรียบเทียบกับค่าเฉลี่ย", table: "orders", goldenQuery: "SELECT store_id, order_count FROM (SELECT store_id, COUNT(*) AS order_count FROM orders GROUP BY store_id) AS store_orders WHERE order_count > (SELECT AVG(order_count) FROM (SELECT store_id, COUNT(*) AS order_count FROM orders GROUP BY store_id) AS avg_orders);", starterCode: "SELECT ",
    requirements: ["ใช้ subquery ใน FROM (derived table) เพื่อนับจำนวนคำสั่งซื้อของแต่ละร้านก่อน", "ใช้ subquery อีกชั้นหาค่าเฉลี่ยของจำนวนคำสั่งซื้อ"] },
  { id: 192, tutorProblemId: 335, type: "COURSE", moduleId: "08", title: "Customers With Existing Orders", category: "1.7 Subqueries", difficulty: "advanced",
    description: "จงเขียน SQL Statement แสดงข้อมูลลูกค้าที่มีคำสั่งซื้ออย่างน้อย 1 รายการ โดยใช้ correlated subquery ร่วมกับ EXISTS", table: "customers", tables: ["customers", "orders"], goldenQuery: "SELECT * FROM customers c WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id);", starterCode: "SELECT ",
    requirements: ["ใช้ correlated subquery ร่วมกับ EXISTS", "subquery อ้างอิง customer_id ของตาราง customers ใน query หลัก"] },
  { id: 193, tutorProblemId: 336, type: "COURSE", moduleId: "08", title: "Staff Who Never Handled Orders", category: "1.7 Subqueries", difficulty: "advanced",
    description: "จงเขียน SQL Statement แสดงพนักงานที่ไม่เคยรับผิดชอบคำสั่งซื้อใดเลย โดยใช้ correlated subquery ร่วมกับ NOT EXISTS", table: "staffs", tables: ["staffs", "orders"], goldenQuery: "SELECT * FROM staffs s WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.staff_id = s.staff_id);", starterCode: "SELECT ",
    requirements: ["ใช้ correlated subquery ร่วมกับ NOT EXISTS", "subquery อ้างอิง staff_id ของตาราง staffs ใน query หลัก"] },
  { id: 194, tutorProblemId: 337, type: "COURSE", moduleId: "08", title: "Orders By Staff Of Latest Order", category: "1.7 Subqueries", difficulty: "advanced",
    description: "จงเขียน SQL Statement แสดงคำสั่งซื้อทั้งหมดของพนักงานที่รับผิดชอบคำสั่งซื้อล่าสุด (order_date ล่าสุด) โดยใช้ subquery แบบ scalar ในเงื่อนไข WHERE", table: "orders", goldenQuery: "SELECT * FROM orders WHERE staff_id = (SELECT staff_id FROM orders ORDER BY order_date DESC LIMIT 1);", starterCode: "SELECT ",
    requirements: ["ใช้ subquery แบบ scalar ใน WHERE เปรียบเทียบด้วย =", "subquery เรียง order_date จากล่าสุดและใช้ LIMIT 1 เพื่อให้ได้ค่าเดียว"] },
  { id: 195, tutorProblemId: 338, type: "COURSE", moduleId: "08", title: "Categories With Above Average Product Price", category: "1.7 Subqueries", difficulty: "advanced",
    description: "จงเขียน SQL Statement แสดงชื่อหมวดหมู่ (category_name) ที่มีราคาสินค้าเฉลี่ยในหมวดนั้นมากกว่าราคาเฉลี่ยของสินค้าทั้งหมด โดยใช้ subquery ใน FROM (derived table) หาราคาเฉลี่ยของแต่ละหมวด แล้วเชื่อมกับตาราง categories", table: "categories", tables: ["categories", "products"], goldenQuery: "SELECT categories.category_name, cat_avg.avg_price FROM categories JOIN (SELECT category_id, AVG(list_price) AS avg_price FROM products GROUP BY category_id) AS cat_avg ON categories.category_id = cat_avg.category_id WHERE cat_avg.avg_price > (SELECT AVG(list_price) FROM products);", starterCode: "SELECT ",
    requirements: ["ใช้ subquery ใน FROM (derived table) หาราคาเฉลี่ยของแต่ละหมวดหมู่", "ใช้ JOIN เชื่อม derived table กับตาราง categories", "ใช้ subquery แบบ scalar ใน WHERE เปรียบเทียบกับราคาเฉลี่ยรวม"] },
  // ==========================================
  // 2. ASSIGNMENT
  // ==========================================
  // ✨ เพิ่มโจทย์จำลองให้ Module 01 เพื่อไม่ให้หน้าจอพัง
  { id: 902, tutorProblemId: 143, type: "ASSIGNMENT", moduleId: "01", title: "Select All Brands (Intro)", category: "2.0 Intro", difficulty: "beginner",
    description: "จงเขียนคำสั่งแสดงข้อมูลยี่ห้อสินค้าทั้งหมด", table: "brands", goldenQuery: "SELECT * FROM brands;", starterCode: "SELECT " },

  // --- 2.1 Select (Module: 02) ---
  { id: 37, tutorProblemId: 144, type: "ASSIGNMENT", moduleId: "02", title: "Select All Stores", category: "2.1 Select", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงข้อมูลร้านค้าทั้งหมด", table: "stores", goldenQuery: "SELECT * FROM stores;", starterCode: "SELECT " },
  { id: 38, tutorProblemId: 145, type: "ASSIGNMENT", moduleId: "02", title: "Select Product Names", category: "2.1 Select", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงชื่อสินค้าทั้งหมด", table: "products", goldenQuery: "SELECT product_name FROM products;", starterCode: "SELECT " },
  { id: 39, tutorProblemId: 146, type: "ASSIGNMENT", moduleId: "02", title: "Store Name & Phone", category: "2.1 Select", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงชื่อร้านค้าทั้งหมดและเบอร์โทรศัพท์", table: "stores", goldenQuery: "SELECT store_name, phone FROM stores;", starterCode: "SELECT " },
  { id: 40, tutorProblemId: 147, type: "ASSIGNMENT", moduleId: "02", title: "Calculate Net Price", category: "2.1 Select", difficulty: "advanced",
    description: "จงเขียน SQL Statement คำนวณราคาสุทธิ (quantity * list_price) - (quantity * discount) ตั้งชื่อว่า 'net_price'", table: "order_items", goldenQuery: "SELECT item_id, product_id, quantity, list_price, (quantity * list_price) - (quantity * discount) AS `net_price` FROM order_items;", starterCode: "SELECT " },
  { id: 41, tutorProblemId: 148, type: "ASSIGNMENT", moduleId: "02", title: "Discounted Price", category: "2.1 Select", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงราคาที่ลบออก 10 ตั้งชื่อคอลัมน์ว่า 'Discounted Price'", table: "products", goldenQuery: "SELECT Product_name, List_price, List_price - 10 AS `Discounted Price` FROM Products;", starterCode: "SELECT " },
  { id: 42, tutorProblemId: 149, type: "ASSIGNMENT", moduleId: "02", title: "Staff Alias", category: "2.1 Select", difficulty: "beginner",
    description: "จงเขียน SQL Statement ตั้งชื่อคอลัมน์ first_name เป็น 'Staff Name' และ last_name เป็น 'Staff Surname'", table: "staffs", goldenQuery: "SELECT first_name AS 'Staff Name', last_name AS 'Staff Surname' FROM staffs;", starterCode: "SELECT " },
  { id: 43, tutorProblemId: 150, type: "ASSIGNMENT", moduleId: "02", title: "Format Price String", category: "2.1 Select", difficulty: "advanced",
    description: "จงเขียน SQL Statement รวมข้อความให้อยู่ในรูปแบบ 'Product Name ($Price)'", table: "products", goldenQuery: "SELECT Concat(product_name, ' ($', list_price, ')') FROM Products;", starterCode: "SELECT " },
  { id: 44, tutorProblemId: 151, type: "ASSIGNMENT", moduleId: "02", title: "Format Store State", category: "2.1 Select", difficulty: "intermediate",
    description: "จงเขียน SQL Statement รวมข้อความ 'Store Name (State)' ตั้งชื่อว่า Store_list", table: "stores", goldenQuery: "SELECT CONCAT(store_name, ' (', state, ')') AS Store_list, email FROM stores;", starterCode: "SELECT " },
  { id: 45, tutorProblemId: 152, type: "ASSIGNMENT", moduleId: "02", title: "Distinct Multi", category: "2.1 Select", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงรหัสยี่ห้อและรหัสประเภท โดยไม่แสดงข้อมูลซ้ำ", table: "products", goldenQuery: "SELECT DISTINCT brand_ID, category_ID FROM products;", starterCode: "SELECT " },
  { id: 46, tutorProblemId: 153, type: "ASSIGNMENT", moduleId: "02", title: "Order Brands", category: "2.1 Select", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงชื่อยี่ห้อเรียงจาก A ไป Z", table: "brands", goldenQuery: "SELECT brand_name FROM brands ORDER BY brand_name;", starterCode: "SELECT " },
  { id: 47, tutorProblemId: 154, type: "ASSIGNMENT", moduleId: "02", title: "Order Products", category: "2.1 Select", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงชื่อสินค้าเรียงปีจากล่าสุดไปอดีต (DESC)", table: "products", goldenQuery: "SELECT product_name, model_year FROM products ORDER BY model_year DESC;", starterCode: "SELECT " },
  { id: 48, tutorProblemId: 155, type: "ASSIGNMENT", moduleId: "02", title: "Order Alias Desc", category: "2.1 Select", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงชื่อสินค้า (Product) ราคา (Price) เรียงแพงไปถูก", table: "products", goldenQuery: "SELECT product_name AS Product, list_price AS Price FROM products ORDER BY list_price DESC;", starterCode: "SELECT " },

  // --- 2.2 Select Condition (Module: 03) ---
  { id: 49, tutorProblemId: 156, type: "ASSIGNMENT", moduleId: "03", title: "Staff Filter", category: "2.2 Select Condition", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงข้อมูลการสั่งซื้อของพนักงานรหัส 2", table: "orders", goldenQuery: "SELECT order_status, shipped_date FROM orders WHERE staff_id = 2;", starterCode: "SELECT " },
  { id: 50, tutorProblemId: 157, type: "ASSIGNMENT", moduleId: "03", title: "Year Filter", category: "2.2 Select Condition", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงข้อมูลสินค้าที่ออกขายตั้งแต่ปี 1999 ขึ้นไป", table: "products", goldenQuery: "SELECT product_name, category_id, list_price FROM products WHERE model_year >= 1999;", starterCode: "SELECT " },
  { id: 51, tutorProblemId: 158, type: "ASSIGNMENT", moduleId: "03", title: "Complex IN/OR", category: "2.2 Select Condition", difficulty: "intermediate",
    description: "จงเขียน SQL Statement ลูกค้าที่อยู่เมือง Victoria, Monroe, Santa Cruz, Liverpool หรืออีเมล jayne.kirkland@hotmail.com", table: "customers", goldenQuery: "SELECT first_name, last_name, email, city, state FROM Customers c WHERE city IN ('Victoria', 'Monroe', 'Santa Cruz', 'Liverpool') OR email='jayne.kirkland@hotmail.com';", starterCode: "SELECT " },
  { id: 52, tutorProblemId: 159, type: "ASSIGNMENT", moduleId: "03", title: "Price Between", category: "2.2 Select Condition", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงสินค้าที่ราคาอยู่ระหว่าง 300 ถึง 500", table: "order_items", goldenQuery: "SELECT product_id, list_price FROM order_items WHERE list_price BETWEEN 300 AND 500;", starterCode: "SELECT " },
  { id: 53, tutorProblemId: 160, type: "ASSIGNMENT", moduleId: "03", title: "Date Not Between", category: "2.2 Select Condition", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงออเดอร์ที่ไม่อยู่ในช่วง '2016-01-01' ถึง '2017-12-25'", table: "orders", goldenQuery: "SELECT order_id, order_date FROM orders WHERE order_date NOT BETWEEN '2016-01-01' AND '2017-12-25';", starterCode: "SELECT " },
  { id: 54, tutorProblemId: 161, type: "ASSIGNMENT", moduleId: "03", title: "Manager Null", category: "2.2 Select Condition", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงพนักงานที่ไม่มีผู้จัดการ (manager_id IS NULL)", table: "staffs", goldenQuery: "SELECT first_name, last_name, email, phone FROM staffs WHERE manager_id IS NULL;", starterCode: "SELECT " },
  { id: 55, tutorProblemId: 162, type: "ASSIGNMENT", moduleId: "03", title: "Required Not Null", category: "2.2 Select Condition", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงออเดอร์ที่มีการกำหนดวันที่ต้องการ (IS NOT NULL)", table: "orders", goldenQuery: "SELECT order_id, order_date FROM orders WHERE required_date IS NOT NULL;", starterCode: "SELECT " },
  { id: 56, tutorProblemId: 163, type: "ASSIGNMENT", moduleId: "03", title: "LIKE Sort", category: "2.2 Select Condition", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงสินค้าที่มีคำว่า 'frame' เรียงราคาแพงไปถูก", table: "products", goldenQuery: "SELECT product_id, product_name, list_price FROM products WHERE product_name LIKE '%frame%' ORDER BY list_price DESC;", starterCode: "SELECT " },
  { id: 57, tutorProblemId: 164, type: "ASSIGNMENT", moduleId: "03", title: "LIKE Positional", category: "2.2 Select Condition", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงสินค้าที่มีอักษรตัวที่ 2 เป็น 'u' (_u%)", table: "products", goldenQuery: "SELECT product_name, category_id, list_price FROM products WHERE product_name LIKE '_u%';", starterCode: "SELECT " },
  { id: 58, tutorProblemId: 165, type: "ASSIGNMENT", moduleId: "03", title: "Escape Character", category: "2.2 Select Condition", difficulty: "advanced",
    description: "จงเขียน SQL Statement แสดงชื่อที่มี 'Girl\\'s' และ '2015/2016' (ใช้ \\ หลีกอักขระ)", table: "products", goldenQuery: "SELECT product_id AS 'id', product_name AS 'pname' FROM products WHERE product_name LIKE '%Girl\\'s%2015/2016%';", starterCode: "SELECT " },
  { id: 59, tutorProblemId: 166, type: "ASSIGNMENT", moduleId: "03", title: "Multiple Filter", category: "2.2 Select Condition", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงสินค้าก่อนปี 2018 และราคากว่า 1500", table: "products", goldenQuery: "SELECT product_id, product_name FROM products WHERE model_year < 2018 AND list_price > 1500;", starterCode: "SELECT " },
  { id: 60, tutorProblemId: 167, type: "ASSIGNMENT", moduleId: "03", title: "Date Filter OR", category: "2.2 Select Condition", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงออเดอร์สั่งตั้งแต่ 2017 หรือจัดส่ง 2018", table: "orders", goldenQuery: "SELECT order_id, order_date, shipped_date FROM orders WHERE order_date >= '2017-01-01' OR shipped_date >= '2018-01-01';", starterCode: "SELECT " },

  // --- 2.3 Join (Module: 05) ---
  { id: 61, tutorProblemId: 168, type: "ASSIGNMENT", moduleId: "05", title: "Equi-join Orders", category: "2.3 Join", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดง order_id, order_date, store_name (ใช้ Equi-join o, s)", table: "orders", tables: ["orders", "stores"], goldenQuery: "SELECT o.order_id, o.order_date, s.store_name FROM orders o, stores s WHERE o.store_id = s.store_id;", starterCode: "SELECT " },
  { id: 62, tutorProblemId: 169, type: "ASSIGNMENT", moduleId: "05", title: "Staff Location", category: "2.3 Join", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงพนักงานรัฐ 'NY' (ใช้ Equi-join sta, sto)", table: "staffs", tables: ["staffs", "stores"], goldenQuery: "SELECT sta.first_name FROM staffs sta, stores sto WHERE sta.store_id = sto.store_id AND sto.state = 'NY';", starterCode: "SELECT " },
  { id: 63, tutorProblemId: 170, type: "ASSIGNMENT", moduleId: "05", title: "Order Staff Stores", category: "2.3 Join", difficulty: "advanced",
    description: "เขียน SQL Statement แสดงออเดอร์ ชื่อร้าน และพนักงานที่ทำออเดอร์ (Equi-join)", table: "orders", tables: ["orders", "stores", "staffs"], goldenQuery: "SELECT o.order_id, sto.store_name, CONCAT(sta.first_name, ' ', sta.last_name) AS 'Staff Fullname' FROM orders o, stores sto, staffs sta WHERE o.store_id=sto.store_id AND o.staff_id=sta.staff_id ORDER BY order_id;", starterCode: "SELECT " },
  { id: 64, tutorProblemId: 171, type: "ASSIGNMENT", moduleId: "05", title: "Join ON Simple", category: "2.3 Join", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงสินค้าและปีที่สั่งซื้อ (JOIN ON)", table: "products", tables: ["products", "order_items"], goldenQuery: "SELECT p.product_name, p.model_year, o.quantity FROM products p JOIN order_items o ON p.product_id = o.product_id;", starterCode: "SELECT " },
  { id: 65, tutorProblemId: 172, type: "ASSIGNMENT", moduleId: "05", title: "Join ON Store 2", category: "2.3 Join", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงออเดอร์ร้านรหัส 2", table: "orders", tables: ["orders", "staffs"], goldenQuery: "SELECT o.Order_ID, o.Order_date, s.First_name, s.Last_name FROM Orders AS o JOIN Staffs AS s ON o.Staff_ID = s.Staff_ID WHERE o.Store_ID = 2;", starterCode: "SELECT " },
  { id: 66, tutorProblemId: 173, type: "ASSIGNMENT", moduleId: "05", title: "Line Total Calculation", category: "2.3 Join", difficulty: "advanced",
    description: "จงเขียน SQL Statement คำนวณ 'line_total' จากการ JOIN หลายตาราง", table: "order_items", tables: ["order_items", "products", "brands"], goldenQuery: "SELECT oi.order_id, oi.item_id, p.product_name, b.brand_name, oi.quantity, oi.list_price AS unit_price, (oi.quantity * oi.list_price) * (1 - oi.discount) AS line_total FROM order_items oi JOIN products p ON oi.product_id = p.product_id JOIN brands b ON p.brand_id = b.brand_id;", starterCode: "SELECT " },
  { id: 67, tutorProblemId: 174, type: "ASSIGNMENT", moduleId: "05", title: "Join Using Formatted", category: "2.3 Join", difficulty: "intermediate",
    description: "จงเขียน SQL Statement รวม 'Product (Category)' ใช้ JOIN USING", table: "products", tables: ["products", "categories"], goldenQuery: "SELECT CONCAT(p.product_name, ' (', c.Category_name, ')') AS `Product info`, p.model_year, p.list_price FROM Products p JOIN Categories c USING (category_id);", starterCode: "SELECT " },
  { id: 68, tutorProblemId: 175, type: "ASSIGNMENT", moduleId: "05", title: "Join Using Date", category: "2.3 Join", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงออเดอร์ที่จัดส่ง 20180318 (JOIN USING)", table: "orders", tables: ["orders", "order_items"], goldenQuery: "SELECT o.customer_id, i.product_id, i.quantity, i.list_price FROM orders o JOIN order_items i USING (order_id) WHERE shipped_date = '20180318';", starterCode: "SELECT " },
  { id: 69, tutorProblemId: 176, type: "ASSIGNMENT", moduleId: "05", title: "Self Join Manager", category: "2.3 Join", difficulty: "advanced",
    description: "จงเขียน SQL Statement แสดง Staff Fullname คู่กับ Manager Fullname", table: "staffs", tables: ["staffs", "stores"], goldenQuery: "SELECT sto.store_name, CONCAT(sta.first_name, ' ', sta.last_name) AS 'Staff Fullname', CONCAT(m.first_name, ' ', m.last_name) AS 'Manager Fullname' FROM staffs sta JOIN stores sto ON (sta.store_id = sto.store_id) JOIN staffs m ON (sta.manager_id=m.staff_id);", starterCode: "SELECT " },
  { id: 70, tutorProblemId: 177, type: "ASSIGNMENT", moduleId: "05", title: "Buffalo Customers", category: "2.3 Join", difficulty: "advanced",
    description: "จงเขียน SQL Statement แสดงออเดอร์เฉพาะลูกค้าเมือง 'Buffalo'", table: "customers", tables: ["customers", "orders", "staffs"], goldenQuery: "SELECT o.Order_ID, c.First_name AS Customer_first_name, c.Last_name AS Customer_last_name, s.First_name AS Staff_first_name, s.Last_name AS Staff_last_name FROM Customers AS c JOIN Orders AS o ON c.Customer_ID = o.Customer_ID JOIN Staffs AS s ON o.Staff_ID = s.Staff_ID WHERE c.City = 'Buffalo';", starterCode: "SELECT " },
  { id: 71, tutorProblemId: 178, type: "ASSIGNMENT", moduleId: "05", title: "NATURAL JOIN Basic 2", category: "2.3 Join", difficulty: "intermediate",
    description: "จงเขียน SQL Statement เชื่อม Product กับ Order_items ด้วย NATURAL JOIN", table: "products", tables: ["products", "order_items"], goldenQuery: "SELECT product_name, quantity, list_price, discount FROM products NATURAL JOIN order_items;", starterCode: "SELECT " },
  { id: 72, tutorProblemId: 179, type: "ASSIGNMENT", moduleId: "05", title: "NATURAL JOIN CA", category: "2.3 Join", difficulty: "advanced",
    description: "จงเขียน SQL Statement ลูกค้ารัฐ CA สั่งตั้งแต่ 2017 (NATURAL JOIN)", table: "orders", tables: ["orders", "customers"], goldenQuery: "SELECT order_id, order_date, first_name, last_name FROM orders NATURAL JOIN customers WHERE order_date >= '2017-01-01' AND state = 'CA';", starterCode: "SELECT " },

  // --- 2.4 Order By & Limit (Module: 04) ---
  { id: 118, tutorProblemId: 339, type: "ASSIGNMENT", moduleId: "04", title: "Order Staff By Last Name Descending", category: "2.4 Order By & Limit", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงข้อมูลพนักงานทั้งหมด เรียงลำดับตามนามสกุล (last_name) จาก Z ไป A", table: "staffs", goldenQuery: "SELECT * FROM staffs ORDER BY last_name DESC;", starterCode: "SELECT ",
    requirements: ["ใช้ ORDER BY เรียงตามนามสกุล", "เรียงจากมากไปน้อย (DESC)"] },
  { id: 119, tutorProblemId: 340, type: "ASSIGNMENT", moduleId: "04", title: "Order Brands By Name", category: "2.4 Order By & Limit", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงข้อมูลแบรนด์สินค้าทั้งหมด เรียงลำดับตามชื่อแบรนด์ (brand_name) จาก A ไป Z", table: "brands", goldenQuery: "SELECT * FROM brands ORDER BY brand_name ASC;", starterCode: "SELECT ",
    requirements: ["ใช้ ORDER BY เรียงตามชื่อแบรนด์"] },
  { id: 120, tutorProblemId: 341, type: "ASSIGNMENT", moduleId: "04", title: "Order Categories By Name", category: "2.4 Order By & Limit", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงข้อมูลหมวดหมู่สินค้าทั้งหมด เรียงลำดับตามชื่อหมวดหมู่ (category_name) จาก A ไป Z", table: "categories", goldenQuery: "SELECT * FROM categories ORDER BY category_name ASC;", starterCode: "SELECT ",
    requirements: ["ใช้ ORDER BY เรียงตามชื่อหมวดหมู่"] },
  { id: 121, tutorProblemId: 342, type: "ASSIGNMENT", moduleId: "04", title: "Order Stores By Name", category: "2.4 Order By & Limit", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงข้อมูลร้านค้าทั้งหมด เรียงลำดับตามชื่อร้าน (store_name) จาก A ไป Z", table: "stores", goldenQuery: "SELECT * FROM stores ORDER BY store_name ASC;", starterCode: "SELECT ",
    requirements: ["ใช้ ORDER BY เรียงตามชื่อร้าน"] },
  { id: 122, tutorProblemId: 343, type: "ASSIGNMENT", moduleId: "04", title: "Order Orders By Store And Date", category: "2.4 Order By & Limit", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงข้อมูลคำสั่งซื้อทั้งหมด เรียงตามรหัสร้าน (store_id) จากน้อยไปมาก แล้วเรียงตามวันที่สั่งซื้อ (order_date) จากล่าสุดไปเก่าสุดในแต่ละร้าน", table: "orders", goldenQuery: "SELECT * FROM orders ORDER BY store_id ASC, order_date DESC;", starterCode: "SELECT ",
    requirements: ["ใช้ ORDER BY 2 คอลัมน์", "store_id เรียง ASC และ order_date เรียง DESC"] },
  { id: 123, tutorProblemId: 344, type: "ASSIGNMENT", moduleId: "04", title: "Products In Category One By Price", category: "2.4 Order By & Limit", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงสินค้าที่อยู่ในหมวดหมู่ที่มี category_id เท่ากับ 1 เรียงลำดับตามราคา (list_price) จากน้อยไปมาก", table: "products", goldenQuery: "SELECT * FROM products WHERE category_id = 1 ORDER BY list_price ASC;", starterCode: "SELECT ",
    requirements: ["ใช้ WHERE กรอง category_id เท่ากับ 1", "ใช้ ORDER BY เรียงราคาน้อยไปมาก"] },
  { id: 124, tutorProblemId: 345, type: "ASSIGNMENT", moduleId: "04", title: "Order Customers By State And Last Name", category: "2.4 Order By & Limit", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงข้อมูลลูกค้าทั้งหมด เรียงตามรัฐ (state) และนามสกุล (last_name) จาก A ไป Z ทั้งคู่", table: "customers", goldenQuery: "SELECT * FROM customers ORDER BY state ASC, last_name ASC;", starterCode: "SELECT ",
    requirements: ["ใช้ ORDER BY 2 คอลัมน์ state และ last_name"] },
  { id: 125, tutorProblemId: 346, type: "ASSIGNMENT", moduleId: "04", title: "Order Items By Quantity And Price", category: "2.4 Order By & Limit", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงข้อมูลรายการสินค้าที่สั่งซื้อทั้งหมด เรียงตามจำนวน (quantity) จากมากไปน้อย แล้วเรียงตามราคา (list_price) จากมากไปน้อยในแต่ละจำนวน", table: "order_items", goldenQuery: "SELECT * FROM order_items ORDER BY quantity DESC, list_price DESC;", starterCode: "SELECT ",
    requirements: ["ใช้ ORDER BY 2 คอลัมน์", "quantity และ list_price เรียงจากมากไปน้อย (DESC) ทั้งคู่"] },
  { id: 126, tutorProblemId: 347, type: "ASSIGNMENT", moduleId: "04", title: "Top Five Products Of Model Year 2018", category: "2.4 Order By & Limit", difficulty: "advanced",
    description: "จงเขียน SQL Statement แสดงสินค้ารุ่นปี 2018 (model_year เท่ากับ 2018) จำนวน 5 รายการที่มีราคาสูงที่สุด", table: "products", goldenQuery: "SELECT * FROM products WHERE model_year = 2018 ORDER BY list_price DESC LIMIT 5;", starterCode: "SELECT ",
    requirements: ["ใช้ WHERE กรองปีรุ่น 2018", "ใช้ ORDER BY เรียงราคามากไปน้อย", "ใช้ LIMIT จำกัด 5 แถว"] },
  { id: 127, tutorProblemId: 348, type: "ASSIGNMENT", moduleId: "04", title: "Paginate Orders By Required Date", category: "2.4 Order By & Limit", difficulty: "advanced",
    description: "จงเขียน SQL Statement แสดงคำสั่งซื้อเรียงตามวันที่ต้องส่งมอบ (required_date) จากเร็วไปช้า โดยข้าม 5 รายการแรก แล้วแสดง 10 รายการถัดไป", table: "orders", goldenQuery: "SELECT * FROM orders ORDER BY required_date ASC LIMIT 10 OFFSET 5;", starterCode: "SELECT ",
    requirements: ["ใช้ ORDER BY เรียงตาม required_date", "ใช้ LIMIT ... OFFSET ... เพื่อแบ่งหน้าข้อมูล"] },
  { id: 128, tutorProblemId: 349, type: "ASSIGNMENT", moduleId: "04", title: "Stocks Above Twenty Units", category: "2.4 Order By & Limit", difficulty: "advanced",
    description: "จงเขียน SQL Statement แสดงสินค้าคงคลังที่มีจำนวนคงเหลือ (quantity) มากกว่า 20 ชิ้น จำนวน 10 รายการ เรียงจากน้อยไปมาก", table: "stocks", goldenQuery: "SELECT * FROM stocks WHERE quantity > 20 ORDER BY quantity ASC LIMIT 10;", starterCode: "SELECT ",
    requirements: ["ใช้ WHERE กรอง quantity มากกว่า 20", "ใช้ ORDER BY เรียงน้อยไปมาก", "ใช้ LIMIT จำกัด 10 แถว"] },
  { id: 129, tutorProblemId: 350, type: "ASSIGNMENT", moduleId: "04", title: "Paginate Customers By City", category: "2.4 Order By & Limit", difficulty: "advanced",
    description: "จงเขียน SQL Statement แสดงข้อมูลลูกค้าเรียงตามเมือง (city) จาก A ไป Z โดยข้ามลูกค้า 20 รายแรก แล้วแสดง 10 รายถัดไป (หน้าที่ 3)", table: "customers", goldenQuery: "SELECT * FROM customers ORDER BY city ASC LIMIT 10 OFFSET 20;", starterCode: "SELECT ",
    requirements: ["ใช้ ORDER BY เรียงตามเมือง", "ใช้ LIMIT ... OFFSET ... เพื่อแบ่งหน้าข้อมูล"] },

  // --- 2.5 Outer Join (Module: 06) ---
  { id: 144, tutorProblemId: 351, type: "ASSIGNMENT", moduleId: "06", title: "Categories With Their Products", category: "2.5 Outer Join", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงข้อมูลหมวดหมู่สินค้าทุกหมวด พร้อมสินค้าที่อยู่ในหมวดนั้น (ถ้ามี) โดยใช้ LEFT JOIN เชื่อมตาราง categories กับ products", table: "categories", tables: ["categories", "products"], goldenQuery: "SELECT * FROM categories LEFT JOIN products ON categories.category_id = products.category_id;", starterCode: "SELECT ",
    requirements: ["ใช้ LEFT JOIN เชื่อมตาราง categories กับ products", "เชื่อมด้วยเงื่อนไข category_id เท่ากัน"] },
  { id: 145, tutorProblemId: 352, type: "ASSIGNMENT", moduleId: "06", title: "Brands With Their Products", category: "2.5 Outer Join", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงข้อมูลแบรนด์ทุกแบรนด์ พร้อมสินค้าของแบรนด์นั้น (ถ้ามี) โดยใช้ LEFT JOIN เชื่อมตาราง brands กับ products", table: "brands", tables: ["brands", "products"], goldenQuery: "SELECT * FROM brands LEFT JOIN products ON brands.brand_id = products.brand_id;", starterCode: "SELECT ",
    requirements: ["ใช้ LEFT JOIN เชื่อมตาราง brands กับ products", "เชื่อมด้วยเงื่อนไข brand_id เท่ากัน"] },
  { id: 146, tutorProblemId: 353, type: "ASSIGNMENT", moduleId: "06", title: "Staff With Their Store", category: "2.5 Outer Join", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงข้อมูลพนักงานทุกคน พร้อมข้อมูลร้านค้าที่สังกัด โดยใช้ RIGHT JOIN เชื่อมตาราง stores กับ staffs", table: "staffs", tables: ["stores", "staffs"], goldenQuery: "SELECT * FROM stores RIGHT JOIN staffs ON stores.store_id = staffs.store_id;", starterCode: "SELECT ",
    requirements: ["ใช้ RIGHT JOIN เชื่อมตาราง stores กับ staffs", "เชื่อมด้วยเงื่อนไข store_id เท่ากัน"] },
  { id: 147, tutorProblemId: 354, type: "ASSIGNMENT", moduleId: "06", title: "Staff With Manager Name", category: "2.5 Outer Join", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงข้อมูลพนักงานทุกคน พร้อมชื่อหัวหน้างาน (ถ้ามี) โดยใช้ LEFT JOIN เชื่อมตาราง staffs กับตัวเอง (self join) และตั้งชื่อคอลัมน์ชื่อหัวหน้าว่า 'manager_first_name'", table: "staffs", tables: ["staffs"], goldenQuery: "SELECT s1.*, s2.first_name AS manager_first_name FROM staffs s1 LEFT JOIN staffs s2 ON s1.manager_id = s2.staff_id;", starterCode: "SELECT ",
    requirements: ["ใช้ LEFT JOIN เชื่อมตาราง staffs กับตัวเอง (self join) ผ่าน manager_id", "ตั้งชื่อคอลัมน์ชื่อหัวหน้างานว่า 'manager_first_name'"] },
  { id: 148, tutorProblemId: 355, type: "ASSIGNMENT", moduleId: "06", title: "Staff With No Orders", category: "2.5 Outer Join", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงพนักงานที่ไม่เคยรับผิดชอบคำสั่งซื้อเลย โดยใช้ LEFT JOIN เชื่อมตาราง staffs กับ orders แล้วกรองด้วย WHERE", table: "staffs", tables: ["staffs", "orders"], goldenQuery: "SELECT staffs.* FROM staffs LEFT JOIN orders ON staffs.staff_id = orders.staff_id WHERE orders.order_id IS NULL;", starterCode: "SELECT ",
    requirements: ["ใช้ LEFT JOIN เชื่อมตาราง staffs กับ orders", "ใช้ WHERE กรองแถวที่ orders.order_id เป็น NULL"] },
  { id: 149, tutorProblemId: 356, type: "ASSIGNMENT", moduleId: "06", title: "Categories With No Expensive Products", category: "2.5 Outer Join", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงหมวดหมู่สินค้าที่ไม่มีสินค้าราคามากกว่า 3000 โดยใช้ LEFT JOIN พร้อมใส่เงื่อนไขราคาไว้ใน ON แล้วกรองแถวที่ไม่มีคู่ด้วย IS NULL", table: "categories", tables: ["categories", "products"], goldenQuery: "SELECT categories.* FROM categories LEFT JOIN products ON categories.category_id = products.category_id AND products.list_price > 3000 WHERE products.product_id IS NULL;", starterCode: "SELECT ",
    requirements: ["ใช้ LEFT JOIN เชื่อมตาราง categories กับ products", "ใส่เงื่อนไข products.list_price > 3000 ไว้ใน ON", "กรองแถวที่ไม่มีคู่ด้วย products.product_id IS NULL"] },
  { id: 150, tutorProblemId: 357, type: "ASSIGNMENT", moduleId: "06", title: "Brands With No 2016 Products", category: "2.5 Outer Join", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงยี่ห้อที่ไม่มีสินค้ารุ่นปี 2016 โดยใช้ LEFT JOIN พร้อมใส่เงื่อนไขปีรุ่นไว้ใน ON แล้วกรองแถวที่ไม่มีคู่ด้วย IS NULL", table: "brands", tables: ["brands", "products"], goldenQuery: "SELECT brands.* FROM brands LEFT JOIN products ON brands.brand_id = products.brand_id AND products.model_year = 2016 WHERE products.product_id IS NULL;", starterCode: "SELECT ",
    requirements: ["ใช้ LEFT JOIN เชื่อมตาราง brands กับ products", "ใส่เงื่อนไข products.model_year = 2016 ไว้ใน ON", "กรองแถวที่ไม่มีคู่ด้วย products.product_id IS NULL"] },
  { id: 151, tutorProblemId: 358, type: "ASSIGNMENT", moduleId: "06", title: "Products Never Ordered", category: "2.5 Outer Join", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงสินค้าที่ไม่เคยถูกสั่งซื้อเลย โดยใช้ RIGHT JOIN เชื่อมตาราง order_items กับ products แล้วกรองด้วย WHERE", table: "products", tables: ["order_items", "products"], goldenQuery: "SELECT products.* FROM order_items RIGHT JOIN products ON order_items.product_id = products.product_id WHERE order_items.item_id IS NULL;", starterCode: "SELECT ",
    requirements: ["ใช้ RIGHT JOIN เชื่อมตาราง order_items กับ products", "ใช้ WHERE กรองแถวที่ order_items.item_id เป็น NULL"] },
  { id: 152, tutorProblemId: 359, type: "ASSIGNMENT", moduleId: "06", title: "Stores With Orders Right Join", category: "2.5 Outer Join", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงข้อมูลร้านค้าทุกร้าน พร้อมคำสั่งซื้อของร้านนั้น (ถ้ามี) โดยใช้ RIGHT JOIN เชื่อมตาราง orders กับ stores", table: "stores", tables: ["orders", "stores"], goldenQuery: "SELECT * FROM orders RIGHT JOIN stores ON orders.store_id = stores.store_id;", starterCode: "SELECT ",
    requirements: ["ใช้ RIGHT JOIN เชื่อมตาราง orders กับ stores", "เชื่อมด้วยเงื่อนไข store_id เท่ากัน"] },
  { id: 153, tutorProblemId: 360, type: "ASSIGNMENT", moduleId: "06", title: "Customers Orders And Items", category: "2.5 Outer Join", difficulty: "advanced",
    description: "จงเขียน SQL Statement แสดงลูกค้าทุกคน พร้อมคำสั่งซื้อ และรายการสินค้าในคำสั่งซื้อนั้น (ถ้ามี) โดยเชื่อม 3 ตาราง customers, orders, order_items ด้วย LEFT JOIN", table: "customers", tables: ["customers", "orders", "order_items"], goldenQuery: "SELECT * FROM customers LEFT JOIN orders ON customers.customer_id = orders.customer_id LEFT JOIN order_items ON orders.order_id = order_items.order_id;", starterCode: "SELECT ",
    requirements: ["ใช้ LEFT JOIN เชื่อม 3 ตาราง (customers, orders, order_items)", "เชื่อมตามลำดับ customer_id แล้ว order_id"] },
  { id: 154, tutorProblemId: 361, type: "ASSIGNMENT", moduleId: "06", title: "Products Never Appearing In Orders", category: "2.5 Outer Join", difficulty: "advanced",
    description: "จงเขียน SQL Statement แสดงสินค้าที่ไม่เคยปรากฏในคำสั่งซื้อใดเลย โดยเชื่อม 3 ตาราง products, order_items, orders ด้วย LEFT JOIN แล้วกรองด้วย WHERE", table: "products", tables: ["products", "order_items", "orders"], goldenQuery: "SELECT products.* FROM products LEFT JOIN order_items ON products.product_id = order_items.product_id LEFT JOIN orders ON order_items.order_id = orders.order_id WHERE orders.order_id IS NULL;", starterCode: "SELECT ",
    requirements: ["ใช้ LEFT JOIN เชื่อม 3 ตาราง (products, order_items, orders)", "ใช้ WHERE กรองแถวที่ orders.order_id เป็น NULL"] },
  { id: 155, tutorProblemId: 362, type: "ASSIGNMENT", moduleId: "06", title: "Stores And Idle Staff", category: "2.5 Outer Join", difficulty: "advanced",
    description: "จงเขียน SQL Statement แสดงร้านค้าและพนักงานที่ยังไม่เคยรับผิดชอบคำสั่งซื้อเลย โดยเชื่อม 3 ตาราง stores, staffs, orders ด้วย LEFT JOIN แล้วกรองด้วย WHERE", table: "stores", tables: ["stores", "staffs", "orders"], goldenQuery: "SELECT stores.*, staffs.first_name, staffs.last_name FROM stores LEFT JOIN staffs ON stores.store_id = staffs.store_id LEFT JOIN orders ON staffs.staff_id = orders.staff_id WHERE orders.order_id IS NULL;", starterCode: "SELECT ",
    requirements: ["ใช้ LEFT JOIN เชื่อม 3 ตาราง (stores, staffs, orders)", "ใช้ WHERE กรองแถวที่ orders.order_id เป็น NULL"] },

  // --- 2.6 Aggregate Functions (Module: 07) ---
  { id: 170, tutorProblemId: 363, type: "ASSIGNMENT", moduleId: "07", title: "Count Total Customers", category: "2.6 Aggregate Functions", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงจำนวนลูกค้าทั้งหมดในตาราง customers โดยตั้งชื่อคอลัมน์ว่า 'total_customers'", table: "customers", goldenQuery: "SELECT COUNT(*) AS total_customers FROM customers;", starterCode: "SELECT ",
    requirements: ["ใช้ฟังก์ชัน COUNT นับจำนวนแถวทั้งหมด", "ตั้งชื่อคอลัมน์ผลลัพธ์ว่า 'total_customers'"] },
  { id: 171, tutorProblemId: 364, type: "ASSIGNMENT", moduleId: "07", title: "Average Discount Given", category: "2.6 Aggregate Functions", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงส่วนลดเฉลี่ย (discount) ของรายการสั่งซื้อทั้งหมด โดยตั้งชื่อคอลัมน์ว่า 'avg_discount'", table: "order_items", goldenQuery: "SELECT AVG(discount) AS avg_discount FROM order_items;", starterCode: "SELECT ",
    requirements: ["ใช้ฟังก์ชัน AVG หาส่วนลดเฉลี่ย", "ตั้งชื่อคอลัมน์ผลลัพธ์ว่า 'avg_discount'"] },
  { id: 172, tutorProblemId: 365, type: "ASSIGNMENT", moduleId: "07", title: "Earliest And Latest Order Date", category: "2.6 Aggregate Functions", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงวันที่สั่งซื้อ (order_date) แรกสุดและล่าสุดจากตาราง orders โดยตั้งชื่อคอลัมน์ว่า 'first_order' และ 'last_order'", table: "orders", goldenQuery: "SELECT MIN(order_date) AS first_order, MAX(order_date) AS last_order FROM orders;", starterCode: "SELECT ",
    requirements: ["ใช้ฟังก์ชัน MIN และ MAX กับวันที่", "ตั้งชื่อคอลัมน์ว่า 'first_order' และ 'last_order'"] },
  { id: 173, tutorProblemId: 366, type: "ASSIGNMENT", moduleId: "07", title: "Total Stock Quantity", category: "2.6 Aggregate Functions", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงผลรวมจำนวนสินค้าคงเหลือทั้งหมด (quantity) จากตาราง stocks โดยตั้งชื่อคอลัมน์ว่า 'total_stock'", table: "stocks", goldenQuery: "SELECT SUM(quantity) AS total_stock FROM stocks;", starterCode: "SELECT ",
    requirements: ["ใช้ฟังก์ชัน SUM รวมจำนวนคงเหลือ", "ตั้งชื่อคอลัมน์ผลลัพธ์ว่า 'total_stock'"] },
  { id: 174, tutorProblemId: 367, type: "ASSIGNMENT", moduleId: "07", title: "Customer Count Per State", category: "2.6 Aggregate Functions", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงจำนวนลูกค้าในแต่ละรัฐ (state) จากตาราง customers โดยตั้งชื่อคอลัมน์นับจำนวนว่า 'customer_count'", table: "customers", goldenQuery: "SELECT state, COUNT(*) AS customer_count FROM customers GROUP BY state;", starterCode: "SELECT ",
    requirements: ["ใช้ GROUP BY state", "ใช้ COUNT นับจำนวนลูกค้าในแต่ละกลุ่ม", "ตั้งชื่อคอลัมน์ว่า 'customer_count'"] },
  { id: 175, tutorProblemId: 368, type: "ASSIGNMENT", moduleId: "07", title: "Max Price Per Category", category: "2.6 Aggregate Functions", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงราคาสูงสุด (list_price) ของสินค้าในแต่ละหมวดหมู่ (category_id) โดยตั้งชื่อคอลัมน์ว่า 'max_price'", table: "products", goldenQuery: "SELECT category_id, MAX(list_price) AS max_price FROM products GROUP BY category_id;", starterCode: "SELECT ",
    requirements: ["ใช้ GROUP BY category_id", "ใช้ MAX หาราคาสูงสุดในแต่ละกลุ่ม", "ตั้งชื่อคอลัมน์ว่า 'max_price'"] },
  { id: 176, tutorProblemId: 369, type: "ASSIGNMENT", moduleId: "07", title: "Order Count Per Store", category: "2.6 Aggregate Functions", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงจำนวนคำสั่งซื้อของแต่ละร้านค้า (store_id) จากตาราง orders โดยตั้งชื่อคอลัมน์นับจำนวนว่า 'order_count'", table: "orders", goldenQuery: "SELECT store_id, COUNT(*) AS order_count FROM orders GROUP BY store_id;", starterCode: "SELECT ",
    requirements: ["ใช้ GROUP BY store_id", "ใช้ COUNT นับจำนวนคำสั่งซื้อ", "ตั้งชื่อคอลัมน์ว่า 'order_count'"] },
  { id: 177, tutorProblemId: 370, type: "ASSIGNMENT", moduleId: "07", title: "Item Count Per Order", category: "2.6 Aggregate Functions", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงจำนวนรายการสินค้าของแต่ละคำสั่งซื้อ (order_id) จากตาราง order_items โดยตั้งชื่อคอลัมน์นับจำนวนว่า 'item_count'", table: "order_items", goldenQuery: "SELECT order_id, COUNT(*) AS item_count FROM order_items GROUP BY order_id;", starterCode: "SELECT ",
    requirements: ["ใช้ GROUP BY order_id", "ใช้ COUNT นับจำนวนรายการสินค้า", "ตั้งชื่อคอลัมน์ว่า 'item_count'"] },
  { id: 178, tutorProblemId: 371, type: "ASSIGNMENT", moduleId: "07", title: "Brands With More Than Five Products", category: "2.6 Aggregate Functions", difficulty: "advanced",
    description: "จงเขียน SQL Statement แสดงแบรนด์ (brand_id) ที่มีจำนวนสินค้ามากกว่า 5 รายการ โดยตั้งชื่อคอลัมน์นับจำนวนว่า 'product_count'", table: "products", goldenQuery: "SELECT brand_id, COUNT(*) AS product_count FROM products GROUP BY brand_id HAVING COUNT(*) > 5;", starterCode: "SELECT ",
    requirements: ["ใช้ GROUP BY brand_id", "ใช้ HAVING กรองกลุ่มที่มีจำนวนมากกว่า 5", "ตั้งชื่อคอลัมน์ว่า 'product_count'"] },
  { id: 179, tutorProblemId: 372, type: "ASSIGNMENT", moduleId: "07", title: "Customers With More Than Two Orders", category: "2.6 Aggregate Functions", difficulty: "advanced",
    description: "จงเขียน SQL Statement แสดงรหัสลูกค้าและจำนวนคำสั่งซื้อ เฉพาะลูกค้าที่มีคำสั่งซื้อมากกว่า 2 รายการ โดยตั้งชื่อคอลัมน์จำนวนว่า 'order_count'", table: "orders", goldenQuery: "SELECT customer_id, COUNT(*) AS order_count FROM orders GROUP BY customer_id HAVING COUNT(*) > 2;", starterCode: "SELECT ",
    requirements: ["ใช้ GROUP BY จัดกลุ่มตาม customer_id", "ใช้ HAVING กรองกลุ่มที่มีจำนวนมากกว่า 2", "ตั้งชื่อคอลัมน์จำนวนว่า 'order_count'"] },
  { id: 180, tutorProblemId: 373, type: "ASSIGNMENT", moduleId: "07", title: "Total Revenue Per Product", category: "2.6 Aggregate Functions", difficulty: "advanced",
    description: "จงเขียน SQL Statement แสดงชื่อสินค้า (product_name) พร้อมผลรวมมูลค่าขาย (list_price คูณ quantity) ของสินค้าแต่ละชิ้น โดยเชื่อมตาราง products กับ order_items ด้วย JOIN แล้ว GROUP BY ชื่อสินค้า และตั้งชื่อคอลัมน์ผลรวมว่า 'total_revenue'", table: "products", tables: ["products", "order_items"], goldenQuery: "SELECT products.product_name, SUM(order_items.list_price * order_items.quantity) AS total_revenue FROM products JOIN order_items ON products.product_id = order_items.product_id GROUP BY products.product_name;", starterCode: "SELECT ",
    requirements: ["ใช้ JOIN เชื่อมตาราง products กับ order_items", "ใช้ GROUP BY product_name แล้ว SUM มูลค่าขาย", "ตั้งชื่อคอลัมน์ว่า 'total_revenue'"] },
  { id: 181, tutorProblemId: 374, type: "ASSIGNMENT", moduleId: "07", title: "Average Stock Per Store", category: "2.6 Aggregate Functions", difficulty: "advanced",
    description: "จงเขียน SQL Statement แสดงชื่อร้านค้า (store_name) พร้อมจำนวนสินค้าคงเหลือเฉลี่ย (quantity) โดยเชื่อมตาราง stores กับ stocks ด้วย JOIN แล้ว GROUP BY ชื่อร้าน และตั้งชื่อคอลัมน์เฉลี่ยว่า 'avg_stock'", table: "stores", tables: ["stores", "stocks"], goldenQuery: "SELECT stores.store_name, AVG(stocks.quantity) AS avg_stock FROM stores JOIN stocks ON stores.store_id = stocks.store_id GROUP BY stores.store_name;", starterCode: "SELECT ",
    requirements: ["ใช้ JOIN เชื่อมตาราง stores กับ stocks", "ใช้ GROUP BY store_name แล้ว AVG จำนวนคงเหลือ", "ตั้งชื่อคอลัมน์ว่า 'avg_stock'"] },

  // --- 2.7 Subqueries (Module: 08) ---
  { id: 196, tutorProblemId: 375, type: "ASSIGNMENT", moduleId: "08", title: "Stocks Below Average Quantity", category: "2.7 Subqueries", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงสินค้าคงคลังที่มีจำนวนคงเหลือ (quantity) น้อยกว่าค่าเฉลี่ยของสินค้าคงคลังทั้งหมด โดยใช้ subquery หาค่าเฉลี่ยในเงื่อนไข WHERE", table: "stocks", goldenQuery: "SELECT * FROM stocks WHERE quantity < (SELECT AVG(quantity) FROM stocks);", starterCode: "SELECT ",
    requirements: ["ใช้ subquery แบบ scalar ใน WHERE เปรียบเทียบด้วย <", "subquery หาค่า AVG(quantity) ของสินค้าคงคลังทั้งหมด"] },
  { id: 197, tutorProblemId: 376, type: "ASSIGNMENT", moduleId: "08", title: "Products Ever Ordered", category: "2.7 Subqueries", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงสินค้าที่เคยถูกสั่งซื้ออย่างน้อย 1 ครั้ง โดยใช้ subquery กับ IN ในเงื่อนไข WHERE", table: "products", tables: ["products", "order_items"], goldenQuery: "SELECT * FROM products WHERE product_id IN (SELECT product_id FROM order_items);", starterCode: "SELECT ",
    requirements: ["ใช้ subquery ใน WHERE ร่วมกับ IN", "subquery ดึง product_id จากตาราง order_items"] },
  { id: 198, tutorProblemId: 377, type: "ASSIGNMENT", moduleId: "08", title: "Cheapest Product", category: "2.7 Subqueries", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงสินค้าที่มีราคา (list_price) ต่ำที่สุด โดยใช้ subquery หาค่าราคาต่ำสุดในเงื่อนไข WHERE", table: "products", goldenQuery: "SELECT * FROM products WHERE list_price = (SELECT MIN(list_price) FROM products);", starterCode: "SELECT ",
    requirements: ["ใช้ subquery แบบ scalar ใน WHERE เปรียบเทียบด้วย =", "subquery หาค่า MIN(list_price) ของสินค้าทั้งหมด"] },
  { id: 199, tutorProblemId: 378, type: "ASSIGNMENT", moduleId: "08", title: "Stores That Have Staff", category: "2.7 Subqueries", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงข้อมูลร้านค้าที่มีพนักงานอย่างน้อย 1 คน โดยใช้ subquery กับ IN ในเงื่อนไข WHERE", table: "stores", tables: ["stores", "staffs"], goldenQuery: "SELECT * FROM stores WHERE store_id IN (SELECT store_id FROM staffs);", starterCode: "SELECT ",
    requirements: ["ใช้ subquery ใน WHERE ร่วมกับ IN", "subquery ดึง store_id จากตาราง staffs"] },
  { id: 200, tutorProblemId: 379, type: "ASSIGNMENT", moduleId: "08", title: "Categories Without Expensive Products", category: "2.7 Subqueries", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงหมวดหมู่สินค้าที่ไม่มีสินค้าราคามากกว่า 3000 โดยใช้ subquery ร่วมกับ NOT IN", table: "categories", tables: ["categories", "products"], goldenQuery: "SELECT * FROM categories WHERE category_id NOT IN (SELECT category_id FROM products WHERE list_price > 3000);", starterCode: "SELECT ",
    requirements: ["ใช้ subquery ใน WHERE ร่วมกับ NOT IN", "subquery ดึง category_id ของสินค้าที่ราคามากกว่า 3000"] },
  { id: 201, tutorProblemId: 380, type: "ASSIGNMENT", moduleId: "08", title: "Order Items Above Average Discount", category: "2.7 Subqueries", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงรายการสั่งซื้อที่มีส่วนลด (discount) มากกว่าค่าเฉลี่ยของรายการสั่งซื้อทั้งหมด โดยใช้ subquery หาค่าเฉลี่ยในเงื่อนไข WHERE", table: "order_items", goldenQuery: "SELECT * FROM order_items WHERE discount > (SELECT AVG(discount) FROM order_items);", starterCode: "SELECT ",
    requirements: ["ใช้ subquery แบบ scalar ใน WHERE เปรียบเทียบด้วย >", "subquery หาค่า AVG(discount) ของรายการสั่งซื้อทั้งหมด"] },
  { id: 202, tutorProblemId: 381, type: "ASSIGNMENT", moduleId: "08", title: "Items Above Their Order Average Quantity", category: "2.7 Subqueries", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงรายการสั่งซื้อที่มีจำนวน (quantity) มากกว่าค่าเฉลี่ยของรายการในคำสั่งซื้อเดียวกัน โดยใช้ correlated subquery ที่อ้างอิง order_id ของ query หลัก", table: "order_items", goldenQuery: "SELECT * FROM order_items oi1 WHERE quantity > (SELECT AVG(quantity) FROM order_items oi2 WHERE oi2.order_id = oi1.order_id);", starterCode: "SELECT ",
    requirements: ["ใช้ correlated subquery ที่อ้างอิง order_id ของ query หลัก (oi1)", "subquery หาค่า AVG(quantity) เฉพาะรายการในคำสั่งซื้อเดียวกัน"] },
  { id: 203, tutorProblemId: 382, type: "ASSIGNMENT", moduleId: "08", title: "Brands With Above Average Stock Level", category: "2.7 Subqueries", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงแบรนด์ที่มีจำนวนสินค้าคงเหลือรวมมากกว่าค่าเฉลี่ยของทุกแบรนด์ โดยใช้ subquery ใน FROM (derived table) รวมจำนวนคงเหลือของแต่ละแบรนด์ก่อน แล้วเปรียบเทียบกับค่าเฉลี่ย", table: "products", tables: ["products", "stocks"], goldenQuery: "SELECT brand_id, total_stock FROM (SELECT products.brand_id, SUM(stocks.quantity) AS total_stock FROM products JOIN stocks ON products.product_id = stocks.product_id GROUP BY products.brand_id) AS brand_stock WHERE total_stock > (SELECT AVG(total_stock) FROM (SELECT products.brand_id, SUM(stocks.quantity) AS total_stock FROM products JOIN stocks ON products.product_id = stocks.product_id GROUP BY products.brand_id) AS avg_stock);", starterCode: "SELECT ",
    requirements: ["ใช้ JOIN และ subquery ใน FROM (derived table) รวมจำนวนคงเหลือของแต่ละแบรนด์", "ใช้ subquery อีกชั้นหาค่าเฉลี่ยของผลรวม"] },
  { id: 204, tutorProblemId: 383, type: "ASSIGNMENT", moduleId: "08", title: "Products That Have Been Stocked", category: "2.7 Subqueries", difficulty: "advanced",
    description: "จงเขียน SQL Statement แสดงข้อมูลสินค้าที่มีอยู่ในสต๊อกของร้านใดร้านหนึ่งอย่างน้อย 1 ร้าน โดยใช้ correlated subquery ร่วมกับ EXISTS", table: "products", tables: ["products", "stocks"], goldenQuery: "SELECT * FROM products p WHERE EXISTS (SELECT 1 FROM stocks s WHERE s.product_id = p.product_id);", starterCode: "SELECT ",
    requirements: ["ใช้ correlated subquery ร่วมกับ EXISTS", "subquery อ้างอิง product_id ของตาราง products ใน query หลัก"] },
  { id: 205, tutorProblemId: 384, type: "ASSIGNMENT", moduleId: "08", title: "Products Never Stocked Exists", category: "2.7 Subqueries", difficulty: "advanced",
    description: "จงเขียน SQL Statement แสดงสินค้าที่ไม่เคยมีในสต๊อกของร้านใดเลย โดยใช้ correlated subquery ร่วมกับ NOT EXISTS", table: "products", tables: ["products", "stocks"], goldenQuery: "SELECT * FROM products p WHERE NOT EXISTS (SELECT 1 FROM stocks s WHERE s.product_id = p.product_id);", starterCode: "SELECT ",
    requirements: ["ใช้ correlated subquery ร่วมกับ NOT EXISTS", "subquery อ้างอิง product_id ของตาราง products ใน query หลัก"] },
  { id: 206, tutorProblemId: 385, type: "ASSIGNMENT", moduleId: "08", title: "Order With Largest Single Item Quantity", category: "2.7 Subqueries", difficulty: "advanced",
    description: "จงเขียน SQL Statement แสดงรายการสั่งซื้อของคำสั่งซื้อ (order_id) ที่มีจำนวนสินค้า (quantity) เท่ากับจำนวนสินค้าที่สั่งมากที่สุดในรายการเดียว โดยใช้ subquery แบบ scalar ในเงื่อนไข WHERE", table: "order_items", goldenQuery: "SELECT * FROM order_items WHERE quantity = (SELECT MAX(quantity) FROM order_items);", starterCode: "SELECT ",
    requirements: ["ใช้ subquery แบบ scalar ใน WHERE เปรียบเทียบด้วย =", "subquery หาค่า MAX(quantity) ของรายการสั่งซื้อทั้งหมด"] },
  { id: 207, tutorProblemId: 386, type: "ASSIGNMENT", moduleId: "08", title: "Stores With Above Average Total Stock", category: "2.7 Subqueries", difficulty: "advanced",
    description: "จงเขียน SQL Statement แสดงร้านค้าที่มีผลรวมจำนวนสินค้าคงเหลือ (quantity) มากกว่าค่าเฉลี่ยของทุกร้าน โดยใช้ subquery ใน FROM (derived table) รวมจำนวนคงเหลือของแต่ละร้านก่อน แล้วเชื่อมกับตาราง stores", table: "stores", tables: ["stores", "stocks"], goldenQuery: "SELECT stores.store_name, store_totals.total_stock FROM stores JOIN (SELECT store_id, SUM(quantity) AS total_stock FROM stocks GROUP BY store_id) AS store_totals ON stores.store_id = store_totals.store_id WHERE store_totals.total_stock > (SELECT AVG(quantity) FROM stocks);", starterCode: "SELECT ",
    requirements: ["ใช้ subquery ใน FROM (derived table) รวมจำนวนคงเหลือของแต่ละร้าน", "ใช้ JOIN เชื่อม derived table กับตาราง stores", "ใช้ subquery แบบ scalar ใน WHERE เปรียบเทียบกับค่าเฉลี่ย"] },
  // ==========================================
  // 3. EXAM
  // ==========================================
  // --- 3.1 EXAM (Module: 01) ---
  { id: 99, tutorProblemId: 180, type: 'EXAM', moduleId: '01', title: 'FINAL TEST MODULE 01', category: "3.1 EXAM", difficulty: "advanced",
    description: 'เลือกข้อมูลทั้งหมดในตาราง', table: 'users', goldenQuery: 'SELECT * FROM users;', starterCode: "SELECT ",
    requirements: ['ดึงข้อมูลมาทั้งหมด', 'จบคำสั่งด้วย ;'] },

  // --- 3.2 EXAM (Module: 02) ---
  { id: 100, tutorProblemId: 181, type: 'EXAM', moduleId: '02', title: 'EXAM: SELECT DATA', category: "3.2 EXAM", difficulty: "beginner",
    description: "แสดงชื่อนามสกุลพนักงาน โดยตั้งชื่อคอลัมน์ว่า 'Staff Name'", table: "staffs", goldenQuery: "SELECT CONCAT(first_name, ' ', last_name) AS 'Staff Name' FROM staffs;", starterCode: "SELECT " },
  { id: 101, tutorProblemId: 182, type: 'EXAM', moduleId: '02', title: 'EXAM: DISTINCT VALUES', category: "3.2 EXAM", difficulty: "intermediate",
    description: "แสดงรายชื่อรัฐที่มีร้านค้าตั้งอยู่โดยไม่ซ้ำกัน", table: "stores", goldenQuery: "SELECT DISTINCT state FROM stores;", starterCode: "SELECT " },

  // --- 3.3 EXAM (Module: 03) ---
  { id: 102, tutorProblemId: 183, type: 'EXAM', moduleId: '03', title: 'EXAM: FILTERING', category: "3.3 EXAM", difficulty: "intermediate",
    description: "แสดงสินค้าที่มีราคาอยู่ระหว่าง 1000 ถึง 2000 เรียงจากแพงไปถูก", table: "products", goldenQuery: "SELECT product_name, list_price FROM products WHERE list_price BETWEEN 1000 AND 2000 ORDER BY list_price DESC;", starterCode: "SELECT " },
  { id: 103, tutorProblemId: 184, type: 'EXAM', moduleId: '03', title: 'EXAM: LIKE OPERATOR', category: "3.3 EXAM", difficulty: "intermediate",
    description: "แสดงลูกค้าที่อีเมลลงท้ายด้วย @gmail.com", table: "customers", goldenQuery: "SELECT first_name, email FROM customers WHERE email LIKE '%@gmail.com';", starterCode: "SELECT " },

  // --- 3.4 EXAM (Module: 05) ---
  { id: 104, tutorProblemId: 185, type: 'EXAM', moduleId: '05', title: 'EXAM: INNER JOIN', category: "3.4 EXAM", difficulty: "advanced",
    description: "แสดงชื่อร้านค้าและจำนวนออเดอร์ทั้งหมดที่ร้านนั้นรับผิดชอบ", table: "orders", tables: ["stores", "orders"], goldenQuery: "SELECT s.store_name, COUNT(o.order_id) FROM stores s JOIN orders o ON s.store_id = o.store_id GROUP BY s.store_name;", starterCode: "SELECT " },
  { id: 105, tutorProblemId: 186, type: 'EXAM', moduleId: '05', title: 'EXAM: MULTI JOIN', category: "3.4 EXAM", difficulty: "advanced",
    description: "แสดงชื่อลูกค้าที่ซื้อสินค้าจากแบรนด์ 'Trek'", table: "orders", tables: ["customers", "orders", "order_items", "products", "brands"], goldenQuery: "SELECT DISTINCT c.first_name, c.last_name FROM customers c JOIN orders o ON c.customer_id = o.customer_id JOIN order_items oi ON o.order_id = oi.order_id JOIN products p ON oi.product_id = p.product_id JOIN brands b ON p.brand_id = b.brand_id WHERE b.brand_name = 'Trek';", starterCode: "SELECT " },

  // --- 3.5 EXAM (Module: 04) ---
  { id: 130, tutorProblemId: 387, type: "EXAM", moduleId: "04", title: "Top Three Priciest Products", category: "3.5 EXAM", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงสินค้า 3 อันดับแรกที่มีราคา (list_price) สูงที่สุด", table: "products", goldenQuery: "SELECT * FROM products ORDER BY list_price DESC LIMIT 3;", starterCode: "SELECT ",
    requirements: ["ใช้ ORDER BY เรียงราคามากไปน้อย", "ใช้ LIMIT จำกัด 3 แถว"] },
  { id: 131, tutorProblemId: 388, type: "EXAM", moduleId: "04", title: "Completed Orders Page Two", category: "3.5 EXAM", difficulty: "advanced",
    description: "จงเขียน SQL Statement แสดงคำสั่งซื้อที่มีสถานะเสร็จสมบูรณ์ (order_status เท่ากับ 4) เรียงตามวันที่สั่งซื้อ (order_date) จากล่าสุดไปเก่าสุด และรหัสลูกค้า (customer_id) จากน้อยไปมาก โดยข้าม 5 รายการแรก แล้วแสดง 5 รายการถัดไป", table: "orders", goldenQuery: "SELECT * FROM orders WHERE order_status = 4 ORDER BY order_date DESC, customer_id ASC LIMIT 5 OFFSET 5;", starterCode: "SELECT ",
    requirements: ["ใช้ WHERE กรอง order_status เท่ากับ 4", "ใช้ ORDER BY 2 คอลัมน์", "ใช้ LIMIT ... OFFSET ... เพื่อแบ่งหน้าข้อมูล"] },

  // --- 3.6 EXAM (Module: 06) ---
  { id: 156, tutorProblemId: 389, type: "EXAM", moduleId: "06", title: "Staff With No Orders Since 2018", category: "3.6 EXAM", difficulty: "advanced",
    description: "จงเขียน SQL Statement แสดงพนักงานที่ไม่มีคำสั่งซื้อใด ๆ ตั้งแต่วันที่ 2018-01-01 เป็นต้นไป โดยใช้ LEFT JOIN เชื่อมตาราง staffs กับ orders (ใส่เงื่อนไขวันที่ไว้ใน ON) แล้วกรองด้วย WHERE", table: "staffs", tables: ["staffs", "orders"], goldenQuery: "SELECT staffs.* FROM staffs LEFT JOIN orders ON staffs.staff_id = orders.staff_id AND orders.order_date >= '2018-01-01' WHERE orders.order_id IS NULL;", starterCode: "SELECT ",
    requirements: ["ใช้ LEFT JOIN เชื่อมตาราง staffs กับ orders", "ใส่เงื่อนไข orders.order_date ไว้ใน ON ไม่ใช่ WHERE", "ใช้ WHERE กรองแถวที่ orders.order_id เป็น NULL"] },
  { id: 157, tutorProblemId: 390, type: "EXAM", moduleId: "06", title: "Never Ordered Products By Category", category: "3.6 EXAM", difficulty: "advanced",
    description: "จงเขียน SQL Statement แสดงสินค้าที่ไม่เคยถูกสั่งซื้อเลย พร้อมชื่อหมวดหมู่ของสินค้านั้น โดยเชื่อม 3 ตาราง order_items, products, categories ด้วย RIGHT JOIN แล้วกรองด้วย WHERE", table: "products", tables: ["order_items", "products", "categories"], goldenQuery: "SELECT * FROM order_items RIGHT JOIN products ON order_items.product_id = products.product_id RIGHT JOIN categories ON products.category_id = categories.category_id WHERE order_items.item_id IS NULL;", starterCode: "SELECT ",
    requirements: ["ใช้ RIGHT JOIN เชื่อม 3 ตาราง (order_items, products, categories)", "ใช้ WHERE กรองแถวที่ order_items.item_id เป็น NULL"] },

  // --- 3.7 EXAM (Module: 07) ---
  { id: 182, tutorProblemId: 391, type: "EXAM", moduleId: "07", title: "Staff With Total Sales Above Threshold", category: "3.7 EXAM", difficulty: "advanced",
    description: "จงเขียน SQL Statement แสดงรหัสพนักงาน (staff_id) พร้อมผลรวมมูลค่าขาย (list_price คูณ quantity) ที่มากกว่า 10000 โดยเชื่อมตาราง orders กับ order_items ด้วย JOIN แล้ว GROUP BY staff_id ใช้ HAVING กรอง และตั้งชื่อคอลัมน์ผลรวมว่า 'total_sales'", table: "orders", tables: ["orders", "order_items"], goldenQuery: "SELECT orders.staff_id, SUM(order_items.list_price * order_items.quantity) AS total_sales FROM orders JOIN order_items ON orders.order_id = order_items.order_id GROUP BY orders.staff_id HAVING SUM(order_items.list_price * order_items.quantity) > 10000;", starterCode: "SELECT ",
    requirements: ["ใช้ JOIN เชื่อมตาราง orders กับ order_items", "ใช้ GROUP BY staff_id แล้ว SUM มูลค่าขาย", "ใช้ HAVING กรองผลรวมมากกว่า 10000 และตั้งชื่อคอลัมน์ว่า 'total_sales'"] },
  { id: 183, tutorProblemId: 392, type: "EXAM", moduleId: "07", title: "Category Sales Summary", category: "3.7 EXAM", difficulty: "advanced",
    description: "จงเขียน SQL Statement แสดงชื่อหมวดหมู่ (category_name) พร้อมจำนวนสินค้าที่แตกต่างกัน (product_id) และผลรวมมูลค่าขาย (list_price คูณ quantity) โดยเชื่อม 3 ตาราง categories, products, order_items ด้วย JOIN แล้ว GROUP BY ชื่อหมวดหมู่ ตั้งชื่อคอลัมน์ว่า 'product_count' และ 'total_revenue'", table: "categories", tables: ["categories", "products", "order_items"], goldenQuery: "SELECT categories.category_name, COUNT(DISTINCT products.product_id) AS product_count, SUM(order_items.list_price * order_items.quantity) AS total_revenue FROM categories JOIN products ON categories.category_id = products.category_id JOIN order_items ON products.product_id = order_items.product_id GROUP BY categories.category_name;", starterCode: "SELECT ",
    requirements: ["ใช้ JOIN เชื่อม 3 ตาราง (categories, products, order_items)", "ใช้ COUNT(DISTINCT ...) นับสินค้าที่ไม่ซ้ำ และตั้งชื่อว่า 'product_count'", "ใช้ SUM มูลค่าขาย และตั้งชื่อว่า 'total_revenue'"] },

  // --- 3.8 EXAM (Module: 08) ---
  { id: 208, tutorProblemId: 393, type: "EXAM", moduleId: "08", title: "Customers Spending Above Average", category: "3.8 EXAM", difficulty: "advanced",
    description: "จงเขียน SQL Statement แสดงลูกค้าที่มีคำสั่งซื้ออย่างน้อย 1 รายการที่มีมูลค่ารวม (list_price คูณ quantity) มากกว่าค่าเฉลี่ยมูลค่าต่อคำสั่งซื้อของลูกค้าทุกคน โดยใช้ correlated subquery ร่วมกับ EXISTS", table: "customers", tables: ["customers", "orders", "order_items"], goldenQuery: "SELECT * FROM customers c WHERE EXISTS (SELECT 1 FROM orders o JOIN order_items oi ON o.order_id = oi.order_id WHERE o.customer_id = c.customer_id AND oi.list_price * oi.quantity > (SELECT AVG(list_price * quantity) FROM order_items));", starterCode: "SELECT ",
    requirements: ["ใช้ correlated subquery ร่วมกับ EXISTS อ้างอิง customer_id ของ query หลัก", "ใช้ subquery แบบ scalar อีกชั้นหาค่าเฉลี่ยมูลค่าต่อรายการ"] },
  { id: 209, tutorProblemId: 394, type: "EXAM", moduleId: "08", title: "Best Selling Product Per Category", category: "3.8 EXAM", difficulty: "advanced",
    description: "จงเขียน SQL Statement แสดงชื่อหมวดหมู่ (category_name) พร้อมรหัสสินค้า (product_id) ที่มีผลรวมจำนวนขาย (quantity) สูงที่สุดในหมวดหมู่นั้น โดยใช้ subquery ใน FROM (derived table) หาผลรวมจำนวนขายของแต่ละสินค้าก่อน แล้วใช้ correlated subquery เปรียบเทียบค่าสูงสุดในแต่ละหมวดหมู่", table: "categories", tables: ["categories", "products", "order_items"], goldenQuery: "SELECT categories.category_name, product_sales.product_id, product_sales.total_sold FROM categories JOIN products ON categories.category_id = products.category_id JOIN (SELECT product_id, SUM(quantity) AS total_sold FROM order_items GROUP BY product_id) AS product_sales ON products.product_id = product_sales.product_id WHERE product_sales.total_sold = (SELECT MAX(ps2.total_sold) FROM (SELECT p2.category_id, oi2.product_id, SUM(oi2.quantity) AS total_sold FROM products p2 JOIN order_items oi2 ON p2.product_id = oi2.product_id GROUP BY p2.category_id, oi2.product_id) AS ps2 WHERE ps2.category_id = products.category_id);", starterCode: "SELECT ",
    requirements: ["ใช้ subquery ใน FROM (derived table) รวมยอดขายของแต่ละสินค้า", "ใช้ correlated subquery เปรียบเทียบยอดขายสูงสุดในหมวดหมู่เดียวกัน", "ใช้ JOIN เชื่อม 3 ตาราง (categories, products, order_items)"] },
];

/**
 * Normalize a raw problem definition into the runtime shape the workspace uses
 * (default requirements, derived constraints, resolved schema columns/tables).
 * Shared by the built-in `problems` and instructor-created custom problems.
 */
export function normalizeProblem(p) {
  const reqs = p.requirements && p.requirements.length ? p.requirements : [
    "เขียนคำสั่ง SQL ให้ถูกต้องตามหลักไวยากรณ์",
    "แสดงผลข้อมูลให้ตรงกับเงื่อนไขโจทย์ 100%",
    `อ้างอิงข้อมูลจากตารางหลัก: ${p.table}`
  ];

  // Auto-derive constraints from golden query & requirements
  const constraints = p.constraints || deriveConstraints(p);

  // Auto-detect order sensitivity
  const orderSensitive = p.orderSensitive !== undefined
    ? p.orderSensitive
    : /ORDER\s+BY/i.test(p.goldenQuery || '');

  return {
    ...p,
    requirements: reqs,
    constraints,
    orderSensitive,
    columns: p.table && dbSchema[p.table] ? dbSchema[p.table] : [],
    allTables: p.tables && p.tables.length
      ? p.tables.map(t => ({ name: t, desc: tableMeta[t] || '', columns: dbSchema[t] || [] }))
      : p.table && dbSchema[p.table]
        ? [{ name: p.table, desc: tableMeta[p.table] || '', columns: dbSchema[p.table] }]
        : []
  };
}

export const problems = rawProblems.map(normalizeProblem);

/**
 * Built-in problems merged with instructor-created ones (localStorage).
 * Use this everywhere the workspace/course needs the live problem set so
 * newly authored problems and exams show up immediately.
 */
export function getAllProblems() {
  let custom = [];
  try {
    custom = getCustomProblems().map(normalizeProblem);
  } catch {
    custom = [];
  }
  return [...problems, ...custom];
}

/**
 * Auto-derive constraints from golden query.
 * Inspects the query structure to generate appropriate constraints
 * that enforce correct methodology, not just correct output.
 */
function deriveConstraints(problem) {
  const gq = problem.goldenQuery || '';
  const upper = gq.toUpperCase();
  const constraints = [];

  // DISTINCT enforcement
  if (/\bDISTINCT\b/i.test(gq)) {
    constraints.push({ type: 'requireDistinct' });
  }

  // ORDER BY enforcement
  if (/\bORDER\s+BY\b/i.test(gq)) {
    constraints.push({ type: 'requireOrderBy' });
  }

  // GROUP BY enforcement
  if (/\bGROUP\s+BY\b/i.test(gq)) {
    constraints.push({ type: 'requireKeyword', keyword: 'GROUP BY' });
  }

  // HAVING enforcement
  if (/\bHAVING\b/i.test(gq)) {
    constraints.push({ type: 'requireKeyword', keyword: 'HAVING' });
  }

  // CONCAT enforcement
  if (/\bCONCAT\s*\(/i.test(gq)) {
    constraints.push({ type: 'requireFunction', fn: 'CONCAT' });
  }

  // COUNT enforcement
  if (/\bCOUNT\s*\(/i.test(gq)) {
    constraints.push({ type: 'requireFunction', fn: 'COUNT' });
  }

  // NATURAL JOIN enforcement
  if (/\bNATURAL\s+JOIN\b/i.test(gq)) {
    constraints.push({ type: 'requireJoinType', joinType: 'NATURAL' });
  }

  // JOIN USING enforcement
  if (/\bJOIN\b.*\bUSING\b/i.test(gq)) {
    constraints.push({ type: 'requireKeyword', keyword: 'USING' });
  }

  // BETWEEN enforcement
  if (/\bBETWEEN\b/i.test(gq)) {
    constraints.push({ type: 'requireKeyword', keyword: 'BETWEEN' });
  }

  // NOT BETWEEN enforcement
  if (/\bNOT\s+BETWEEN\b/i.test(gq)) {
    constraints.push({ type: 'requireKeyword', keyword: 'NOT BETWEEN' });
  }

  // IN enforcement
  if (/\bIN\s*\(/i.test(gq)) {
    constraints.push({ type: 'requireKeyword', keyword: 'IN' });
  }

  // LIKE enforcement
  if (/\bLIKE\b/i.test(gq)) {
    constraints.push({ type: 'requireKeyword', keyword: 'LIKE' });
  }

  // IS NULL enforcement
  if (/\bIS\s+NULL\b/i.test(gq) && !/\bIS\s+NOT\s+NULL\b/i.test(gq)) {
    constraints.push({ type: 'requireKeyword', keyword: 'IS NULL' });
  }

  // IS NOT NULL enforcement
  if (/\bIS\s+NOT\s+NULL\b/i.test(gq)) {
    constraints.push({ type: 'requireKeyword', keyword: 'IS NOT NULL' });
  }

  // Alias enforcement from requirements
  if (problem.requirements) {
    for (const req of problem.requirements) {
      // Match patterns like: ตั้งชื่อ ... เป็น 'xxx' or ตั้งชื่อ ... ว่า xxx
      const aliasMatch = req.match(/ตั้งชื่อ.*(?:เป็น|ว่า)\s+['"`]?([^'"`\s]+)['"`]?/);
      if (aliasMatch) {
        constraints.push({ type: 'requireAlias', alias: aliasMatch[1] });
      }
    }
  }

  return constraints;
}