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
  // tutorProblemId: hand-verified against the tutor service's own catalog —
  // goldenQuery here is byte-identical to that problem's gold query there.
  // Only these 4 are mapped; the rest of this catalog has no tutor-side
  // equivalent yet, so no hint button shows for them.
  { id: 901, type: "COURSE", moduleId: "01", title: "Select All Stores (Intro)", category: "1.0 Intro", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงข้อมูลร้านค้าทั้งหมดเพื่อทำความเข้าใจโครงสร้างเบื้องต้น", table: "stores", goldenQuery: "SELECT * FROM stores;", starterCode: "SELECT ",
    tutorProblemId: 2 },

  // --- 1.1 Select (Module: 02) ---
  { id: 1, type: "COURSE", moduleId: "02", title: "Select All Products", category: "1.1 Select", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงข้อมูลสินค้าทั้งหมด", table: "products", goldenQuery: "SELECT * FROM products;", starterCode: "SELECT ",
    requirements: ["ใช้คำสั่ง SELECT ดึงข้อมูลจากตาราง products", "แสดงคอลัมน์ทั้งหมดด้วยเครื่องหมาย *"],
    tutorProblemId: 1 },
  { id: 2, type: "COURSE", moduleId: "02", title: "Select Staff Emails", category: "1.1 Select", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงอีเมลของพนักงานทุกคน", table: "staffs", goldenQuery: "SELECT email FROM staffs;", starterCode: "SELECT ",
    requirements: ["ใช้คำสั่ง SELECT เลือกข้อมูลจากตาราง staffs", "แสดงเฉพาะคอลัมน์ email เท่านั้น"],
    tutorProblemId: 3 },
  { id: 3, type: "COURSE", moduleId: "02", title: "Select Brand Info", category: "1.1 Select", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงรหัสยี่ห้อ และ ชื่อยี่ห้อทั้งหมด", table: "brands", goldenQuery: "SELECT brand_id, brand_name FROM brands;", starterCode: "SELECT ",
    tutorProblemId: 5,
    requirements: ["ดึงข้อมูลจากตาราง brands", "แสดงคอลัมน์ brand_id และ brand_name"] },
  { id: 4, type: "COURSE", moduleId: "02", title: "Calculate Total Price", category: "1.1 Select", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงรหัสรายการสั่งซื้อ, รหัสสินค้า, และ คำนวณราคาทั้งหมด (quantity * list_price) ตั้งชื่อคอลัมน์ว่า 'Total Price'", table: "order_items", goldenQuery: "SELECT item_id, product_id, quantity * list_price AS 'Total Price' FROM order_items;", starterCode: "SELECT ",
    requirements: ["ใช้เครื่องหมาย * ในการคูณ quantity กับ list_price", "ตั้งชื่อคอลัมน์ใหม่ด้วยคำสั่ง AS 'Total Price'"] },
  { id: 5, type: "COURSE", moduleId: "02", title: "Calculate Product Age", category: "1.1 Select", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงชื่อสินค้า, ปีที่สินค้าออกขาย และคำนวณจำนวนปีที่สินค้าได้วางขายนับจากปี 2026 โดยตั้งชื่อคอลัมน์ใหม่ว่า 'Product Age'", table: "products", goldenQuery: "SELECT Product_name, Model_year, 2026 - Model_year AS 'Product Age' FROM Products;", starterCode: "SELECT ",
    requirements: ["ใช้สมการ 2026 - Model_year", "ตั้งชื่อคอลัมน์ผลลัพธ์ว่า 'Product Age'"] },
  { id: 6, type: "COURSE", moduleId: "02", title: "Alias Column Names", category: "1.1 Select", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงชื่อสินค้า ราคาขายปลีก โดยตั้งชื่อคอลัมน์ว่า `Name of Product` และ Price ตามลำดับ", table: "products", goldenQuery: "SELECT product_name AS `Name of Product`, list_price AS 'Price' FROM products;", starterCode: "SELECT ",
    requirements: ["ตั้งชื่อ product_name เป็น 'Name of Product'", "ตั้งชื่อ list_price เป็น 'Price'"] },
  { id: 7, type: "COURSE", moduleId: "02", title: "Concat Staff Name", category: "1.1 Select", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงชื่อจริงและนามสกุลพนักงาน โดยรวมไว้ภายใน 1 คอลัมน์ (คั่นด้วย 1 ช่องว่าง)", table: "staffs", goldenQuery: "SELECT Concat(First_name , ' ', Last_name) FROM Staffs;", starterCode: "SELECT ",
    requirements: ["ใช้ฟังก์ชัน CONCAT() เพื่อเชื่อมข้อความ", "ต้องมีช่องว่าง ' ' คั่นกลางระหว่างชื่อและนามสกุล"] },
  { id: 8, type: "COURSE", moduleId: "02", title: "Customer Full Name", category: "1.1 Select", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงรายชื่อลูกค้าตั้งชื่อคอลัมน์ว่า full_name (ประกอบด้วยชื่อจริง คั่น 1 ช่องว่าง ตามด้วยนามสกุล) และคอลัมน์ที่สองอีเมล", table: "customers", goldenQuery: "SELECT CONCAT(first_name, ' ', last_name) AS full_name, email FROM customers;", starterCode: "SELECT ",
    requirements: ["ใช้ CONCAT รวมชื่อและนามสกุล และตั้งชื่อคอลัมน์ว่า full_name", "แสดงคอลัมน์ email เป็นคอลัมน์ที่ 2"] },
  { id: 9, type: "COURSE", moduleId: "02", title: "Distinct City State", category: "1.1 Select", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงชื่อเมือง และชื่อรัฐที่ลูกค้าทุกคนอาศัยอยู่ โดยไม่แสดงแถวที่มีข้อมูลซ้ำ", table: "customers", goldenQuery: "SELECT DISTINCT city, state FROM customers;", starterCode: "SELECT ",
    requirements: ["ใช้คำสั่ง DISTINCT ตัดข้อมูลที่ซ้ำกัน", "แสดงผลคอลัมน์ city และ state"] },
  { id: 10, type: "COURSE", moduleId: "02", title: "Order Emails Desc", category: "1.1 Select", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงอีเมลของร้านค้าทั้งหมด โดยเรียงผลลัพธ์จาก Z ไป A", table: "stores", goldenQuery: "SELECT email FROM stores ORDER BY email DESC;", starterCode: "SELECT ",
    requirements: ["ใช้คำสั่ง ORDER BY สำหรับเรียงลำดับ", "เรียงจากมากไปน้อย (DESC)"] },
  { id: 11, type: "COURSE", moduleId: "02", title: "Order Staff Names", category: "1.1 Select", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงชื่อจริงและนามสกุลพนักงาน โดยเรียงผลลัพธ์ด้วยชื่อจริง จาก A ไป Z", table: "staffs", goldenQuery: "SELECT first_name, last_name FROM staffs ORDER BY first_name;", starterCode: "SELECT ",
    requirements: ["ใช้คำสั่ง ORDER BY เรียงด้วย first_name", "เรียงจากน้อยไปมาก (ค่าเริ่มต้นคือ ASC)"] },
  { id: 12, type: "COURSE", moduleId: "02", title: "Order Multi Columns", category: "1.1 Select", difficulty: "intermediate",
    description: "จงเขียน SQL statement แสดงชื่อร้านค้าตั้งชื่อว่า 'Store' และเบอร์โทรตั้งชื่อว่า 'Tel' เรียงตามชื่อรัฐจาก Z-A จากนั้นเรียงตามชื่อเมืองจาก A-Z", table: "stores", goldenQuery: "SELECT store_name AS Store, phone AS Tel FROM stores ORDER BY state DESC, city;", starterCode: "SELECT ",
    requirements: ["ตั้งชื่อคอลัมน์ตามที่โจทย์กำหนด (Store, Tel)", "เรียง ORDER BY state DESC และตามด้วย city ASC"] },

  // --- 1.2 Select Condition (Module: 03) ---
  { id: 13, type: "COURSE", moduleId: "03", title: "Where State NY", category: "1.2 Select Condition", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงชื่อจริง นามสกุล เบอร์โทรศัพท์ ชื่อถนน ของลูกค้าทุกคนที่อาศัยอยู่ในรัฐชื่อ NY", table: "customers", goldenQuery: "SELECT first_name, last_name, phone, street FROM customers WHERE state = 'NY';", starterCode: "SELECT ",
    requirements: ["ใช้คำสั่ง WHERE กรองเงื่อนไข", "เงื่อนไขคือ state เท่ากับ 'NY'"] },
  { id: 14, type: "COURSE", moduleId: "03", title: "Quantity > 20", category: "1.2 Select Condition", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงรหัสร้านค้า และรหัสสินค้า ที่มีปริมาณสินค้าคงเหลือมากกว่า 20 ชิ้น", table: "stocks", goldenQuery: "SELECT store_id, product_id FROM stocks WHERE quantity > 20;", starterCode: "SELECT " },
  { id: 15, type: "COURSE", moduleId: "03", title: "IN Clause Cities", category: "1.2 Select Condition", difficulty: "intermediate",
    description: "จงเขียน SQL Statement เพื่อแสดงข้อมูลของลูกค้าที่อาศัยอยู่ในเมือง Amsterdam, Oakland, Santa Cruz, San Jose (ใช้คำสั่ง IN)", table: "customers", goldenQuery: "SELECT first_name, last_name, email, city, state FROM Customers WHERE city IN ('Amsterdam', 'Oakland', 'Santa Cruz', 'San Jose');", starterCode: "SELECT ",
    requirements: ["ใช้คำสั่ง IN ในการกำหนดกลุ่มเงื่อนไข"] },
  { id: 16, type: "COURSE", moduleId: "03", title: "Between Years", category: "1.2 Select Condition", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงชื่อสินค้าและปีที่ออกขาย เฉพาะสินค้าที่ออกขายตั้งแต่ปี 2017 ถึงปี 2018 (ใช้ Between)", table: "products", goldenQuery: "SELECT product_name, model_year FROM products WHERE model_year BETWEEN 2017 AND 2018;", starterCode: "SELECT ",
    requirements: ["ใช้คำสั่ง BETWEEN ในการกำหนดช่วงของปี"] },
  { id: 17, type: "COURSE", moduleId: "03", title: "Not Between Quantities", category: "1.2 Select Condition", difficulty: "intermediate",
    description: "จงเขียน SQL Statment แสดงข้อมูลสินค้าคงเหลือ เฉพาะที่มีปริมาณน้อยกว่า 10 ชิ้น และเกินกว่า 29 ชิ้น", table: "stocks", goldenQuery: "SELECT * FROM stocks WHERE quantity NOT BETWEEN 10 AND 29;", starterCode: "SELECT ",
    requirements: ["ใช้คำสั่ง NOT BETWEEN เพื่อหาข้อมูลนอกช่วง 10 ถึง 29"] },
  { id: 18, type: "COURSE", moduleId: "03", title: "IS NULL Condition", category: "1.2 Select Condition", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงข้อมูลการสั่งซื้อ ที่ยังไม่ได้กำหนดวันที่จัดส่ง (Shipped_date)", table: "orders", goldenQuery: "SELECT * FROM Orders WHERE Shipped_date IS NULL;", starterCode: "SELECT " },
  { id: 19, type: "COURSE", moduleId: "03", title: "IS NOT NULL", category: "1.2 Select Condition", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงชื่อจริงและนามสกุลของลูกค้าที่มีเบอร์โทรศัพท์", table: "customers", goldenQuery: "SELECT first_name, last_name FROM customers WHERE phone IS NOT NULL;", starterCode: "SELECT " },
  { id: 20, type: "COURSE", moduleId: "03", title: "LIKE 'San%'", category: "1.2 Select Condition", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงชื่อร้านค้าและชื่อเมืองเฉพาะที่ขึ้นต้นด้วยคำว่า 'San'", table: "stores", goldenQuery: "SELECT store_name, city FROM stores WHERE city LIKE 'San%';", starterCode: "SELECT ",
    requirements: ["ใช้ LIKE ค้นหาคำที่ขึ้นต้นด้วย 'San' และตามด้วยเครื่องหมาย %"] },
  { id: 21, type: "COURSE", moduleId: "03", title: "LIKE '%msn.com'", category: "1.2 Select Condition", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงชื่อ นามสกุลและอีเมลลูกค้า เฉพาะอีเมลที่ลงท้ายด้วย 'msn.com'", table: "customers", goldenQuery: "SELECT first_name, last_name, email FROM customers WHERE email LIKE '%msn.com';", starterCode: "SELECT " },
  { id: 22, type: "COURSE", moduleId: "03", title: "LIKE '%original%'", category: "1.2 Select Condition", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงรหัสและชื่อสินค้า ที่มีคำว่า 'original' อยู่ในชื่อสินค้า", table: "products", goldenQuery: "SELECT product_id, product_name FROM products WHERE product_name LIKE '%original%';", starterCode: "SELECT " },
  { id: 23, type: "COURSE", moduleId: "03", title: "AND Condition", category: "1.2 Select Condition", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงชื่อจริง รัฐ รหัสไปรษณีย์ลูกค้า ที่รัฐคือ 'CA' และรหัสไปรษณีย์มากกว่า 95000", table: "customers", goldenQuery: "SELECT first_name, state, zip_code FROM customers WHERE state = 'CA' AND zip_code > 95000;", starterCode: "SELECT ",
    requirements: ["ใช้ AND เพื่อเชื่อมเงื่อนไขให้เป็นจริงทั้งคู่"] },
  { id: 24, type: "COURSE", moduleId: "03", title: "OR Condition", category: "1.2 Select Condition", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงชื่อจริง และชื่อรัฐของลูกค้า ที่อยู่รัฐ 'TX' หรือ 'NY'", table: "customers", goldenQuery: "SELECT first_name, state FROM customers WHERE state = 'TX' OR state = 'NY';", starterCode: "SELECT ",
    requirements: ["ใช้ OR เพื่อเชื่อมเงื่อนไขอย่างใดอย่างหนึ่ง"] },

  // --- 1.3 Join (Module: 05) ---
  { id: 25, type: "COURSE", moduleId: "05", title: "Equi-join Products Brands", category: "1.3 Join", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงรหัสสินค้า ชื่อสินค้า และชื่อยี่ห้อ (ใช้ Equi-join ตัวย่อตาราง p และ b)", table: "products", tables: ["products", "brands"], goldenQuery: "SELECT p.product_id, p.product_name, b.brand_name FROM products p, brands b WHERE p.brand_id = b.brand_id;", starterCode: "SELECT ",
    requirements: ["ใช้การคั่นตารางด้วยลูกน้ำ (Equi-join)", "เชื่อมตารางด้วย WHERE clause"] },
  { id: 26, type: "COURSE", moduleId: "05", title: "Equi-join Condition", category: "1.3 Join", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงชื่อสินค้า ชื่อประเภทสินค้า เฉพาะสินค้าที่ list_price > 3000 (ใช้ Equi-join p และ ca)", table: "products", tables: ["products", "categories"], goldenQuery: "SELECT p.product_name, ca.category_name FROM products p, categories ca WHERE p.category_id = ca.category_id AND p.list_price > 3000;", starterCode: "SELECT " },
  { id: 27, type: "COURSE", moduleId: "05", title: "Equi-join 3 Tables", category: "1.3 Join", difficulty: "advanced",
    description: "เขียน SQL Statement แสดงชื่อสินค้า ยี่ห้อ ประเภท และราคา เรียงรหัสสินค้าจากน้อยไปมาก (ใช้ Equi-join)", table: "products", tables: ["products", "brands", "categories"], goldenQuery: "SELECT p.product_name, b.brand_name, ca.category_name, p.list_price FROM products p, brands b, categories ca WHERE p.brand_id = b.brand_id AND p.category_id = ca.category_id ORDER BY p.product_id;", starterCode: "SELECT " },
  { id: 28, type: "COURSE", moduleId: "05", title: "JOIN ON Clause", category: "1.3 Join", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงชื่อ นามสกุล อีเมลพนักงาน รหัสร้าน และชื่อร้าน (ใช้ JOIN ON)", table: "staffs", tables: ["staffs", "stores"], goldenQuery: "SELECT st.first_name, st.last_name, st.email, s.store_id, s.store_name FROM staffs st JOIN stores s ON st.store_id = s.store_id;", starterCode: "SELECT ",
    requirements: ["ใช้คำสั่ง JOIN ON ในการเชื่อม 2 ตาราง"] },
  { id: 29, type: "COURSE", moduleId: "05", title: "JOIN ON Filter", category: "1.3 Join", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงชื่อสินค้าและจำนวนสินค้าคงเหลือของร้านค้ารหัส 3 (ใช้ JOIN ON)", table: "stocks", tables: ["stocks", "products"], goldenQuery: "SELECT p.Product_name, sto.Quantity FROM Stocks AS sto JOIN Products AS p ON sto.Product_ID = p.Product_ID WHERE sto.Store_ID = 3;", starterCode: "SELECT " },
  { id: 30, type: "COURSE", moduleId: "05", title: "Multiple JOIN ON", category: "1.3 Join", difficulty: "advanced",
    description: "จงเขียน SQL Statement แสดงรหัสสั่งซื้อ วันที่สั่งซื้อ ชื่อเต็มลูกค้า(ตั้งชื่อว่า customer_name) ชื่อร้าน สถานะ (ใช้ JOIN ON)", table: "orders", tables: ["orders", "customers", "stores"], goldenQuery: "SELECT o.order_id, o.order_date, CONCAT(c.first_name, ' ', c.last_name) AS customer_name, s.store_name, o.order_status FROM orders o JOIN customers c ON o.customer_id = c.customer_id JOIN stores s ON o.store_id = s.store_id;", starterCode: "SELECT " },
  { id: 31, type: "COURSE", moduleId: "05", title: "JOIN USING", category: "1.3 Join", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงรหัสสั่งซื้อ รหัสลูกค้า ชื่อจริงนามสกุลพนักงานที่ดำเนินการ (ใช้ JOIN USING)", table: "orders", tables: ["orders", "staffs"], goldenQuery: "SELECT order_id, customer_id, first_name, last_name FROM orders JOIN staffs USING (staff_id);", starterCode: "SELECT ",
    requirements: ["ใช้คำสั่ง JOIN USING เมื่อคอลัมน์เชื่อมมีชื่อเหมือนกัน"] },
  { id: 32, type: "COURSE", moduleId: "05", title: "JOIN USING Filter", category: "1.3 Join", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงชื่อสินค้า ชื่อประเภท ราคา เฉพาะประเภท 'Cyclocross Bicycles' (ใช้ JOIN USING)", table: "products", tables: ["products", "categories"], goldenQuery: "SELECT product_name, category_name, list_price FROM products JOIN categories USING (category_id) WHERE category_name = 'Cyclocross Bicycles';", starterCode: "SELECT " },
  { id: 33, type: "COURSE", moduleId: "05", title: "Orders Multi Join", category: "1.3 Join", difficulty: "advanced",
    description: "จงเขียน SQL Statement แสดงรหัสสั่งซื้อ ชื่อจริงลูกค้า ชื่อร้านค้า เรียงตามรหัสสั่งซื้อ", table: "orders", tables: ["orders", "customers", "stores"], goldenQuery: "SELECT o.order_id, c.first_name, s.store_name FROM orders o JOIN customers c ON (o.customer_id=c.customer_id) JOIN stores s ON (o.store_id = s.store_id) ORDER BY o.order_id;", starterCode: "SELECT " },
  { id: 34, type: "COURSE", moduleId: "05", title: "Stocks Join", category: "1.3 Join", difficulty: "advanced",
    description: "จงเขียน SQL Statement แสดงชื่อสินค้า ปริมาณในคลังทั้งหมดที่มีในร้านชื่อ 'Santa Cruz Bikes'", table: "products", tables: ["products", "stocks", "stores"], goldenQuery: "SELECT p.Product_name, sto.Quantity FROM Products AS p JOIN Stocks AS sto ON p.Product_ID = sto.Product_ID JOIN Stores AS s ON sto.Store_ID = s.Store_ID WHERE s.Store_name = 'Santa Cruz Bikes';", starterCode: "SELECT " },
  { id: 35, type: "COURSE", moduleId: "05", title: "NATURAL JOIN Basic", category: "1.3 Join", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงชื่อสินค้าและประเภทสินค้าทั้งหมด (ใช้ NATURAL JOIN)", table: "products", tables: ["products", "categories"], goldenQuery: "SELECT product_name, category_name FROM categories NATURAL JOIN products;", starterCode: "SELECT ",
    requirements: ["ใช้คำสั่ง NATURAL JOIN ในการหาคอลัมน์ที่ชื่อตรงกันอัตโนมัติ"] },
  { id: 36, type: "COURSE", moduleId: "05", title: "NATURAL JOIN Filter", category: "1.3 Join", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงชื่อสินค้าและยี่ห้อ เฉพาะสินค้าปี 2016 (ใช้ NATURAL JOIN)", table: "products", tables: ["products", "brands"], goldenQuery: "SELECT product_name, brand_name FROM products NATURAL JOIN brands WHERE model_year = 2016;", starterCode: "SELECT " },

  // ==========================================
  // 2. ASSIGNMENT
  // ==========================================
  // ✨ เพิ่มโจทย์จำลองให้ Module 01 เพื่อไม่ให้หน้าจอพัง
  { id: 902, type: "ASSIGNMENT", moduleId: "01", title: "Select All Brands (Intro)", category: "2.0 Intro", difficulty: "beginner",
    description: "จงเขียนคำสั่งแสดงข้อมูลยี่ห้อสินค้าทั้งหมด", table: "brands", goldenQuery: "SELECT * FROM brands;", starterCode: "SELECT " },

  // --- 2.1 Select (Module: 02) ---
  { id: 37, type: "ASSIGNMENT", moduleId: "02", title: "Select All Stores", category: "2.1 Select", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงข้อมูลร้านค้าทั้งหมด", table: "stores", goldenQuery: "SELECT * FROM stores;", starterCode: "SELECT " },
  { id: 38, type: "ASSIGNMENT", moduleId: "02", title: "Select Product Names", category: "2.1 Select", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงชื่อสินค้าทั้งหมด", table: "products", goldenQuery: "SELECT product_name FROM products;", starterCode: "SELECT " },
  { id: 39, type: "ASSIGNMENT", moduleId: "02", title: "Store Name & Phone", category: "2.1 Select", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงชื่อร้านค้าทั้งหมดและเบอร์โทรศัพท์", table: "stores", goldenQuery: "SELECT store_name, phone FROM stores;", starterCode: "SELECT " },
  { id: 40, type: "ASSIGNMENT", moduleId: "02", title: "Calculate Net Price", category: "2.1 Select", difficulty: "advanced",
    description: "จงเขียน SQL Statement คำนวณราคาสุทธิ (quantity * list_price) - (quantity * discount) ตั้งชื่อว่า 'net_price'", table: "order_items", goldenQuery: "SELECT item_id, product_id, quantity, list_price, (quantity * list_price) - (quantity * discount) AS `net_price` FROM order_items;", starterCode: "SELECT " },
  { id: 41, type: "ASSIGNMENT", moduleId: "02", title: "Discounted Price", category: "2.1 Select", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงราคาที่ลบออก 10 ตั้งชื่อคอลัมน์ว่า 'Discounted Price'", table: "products", goldenQuery: "SELECT Product_name, List_price, List_price - 10 AS `Discounted Price` FROM Products;", starterCode: "SELECT " },
  { id: 42, type: "ASSIGNMENT", moduleId: "02", title: "Staff Alias", category: "2.1 Select", difficulty: "beginner",
    description: "จงเขียน SQL Statement ตั้งชื่อคอลัมน์ first_name เป็น 'Staff Name' และ last_name เป็น 'Staff Surname'", table: "staffs", goldenQuery: "SELECT first_name AS 'Staff Name', last_name AS 'Staff Surname' FROM staffs;", starterCode: "SELECT " },
  { id: 43, type: "ASSIGNMENT", moduleId: "02", title: "Format Price String", category: "2.1 Select", difficulty: "advanced",
    description: "จงเขียน SQL Statement รวมข้อความให้อยู่ในรูปแบบ 'Product Name ($Price)'", table: "products", goldenQuery: "SELECT Concat(product_name, ' ($', list_price, ')') FROM Products;", starterCode: "SELECT " },
  { id: 44, type: "ASSIGNMENT", moduleId: "02", title: "Format Store State", category: "2.1 Select", difficulty: "intermediate",
    description: "จงเขียน SQL Statement รวมข้อความ 'Store Name (State)' ตั้งชื่อว่า Store_list", table: "stores", goldenQuery: "SELECT CONCAT(store_name, ' (', state, ')') AS Store_list, email FROM stores;", starterCode: "SELECT " },
  { id: 45, type: "ASSIGNMENT", moduleId: "02", title: "Distinct Multi", category: "2.1 Select", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงรหัสยี่ห้อและรหัสประเภท โดยไม่แสดงข้อมูลซ้ำ", table: "products", goldenQuery: "SELECT DISTINCT brand_ID, category_ID FROM products;", starterCode: "SELECT " },
  { id: 46, type: "ASSIGNMENT", moduleId: "02", title: "Order Brands", category: "2.1 Select", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงชื่อยี่ห้อเรียงจาก A ไป Z", table: "brands", goldenQuery: "SELECT brand_name FROM brands ORDER BY brand_name;", starterCode: "SELECT " },
  { id: 47, type: "ASSIGNMENT", moduleId: "02", title: "Order Products", category: "2.1 Select", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงชื่อสินค้าเรียงปีจากล่าสุดไปอดีต (DESC)", table: "products", goldenQuery: "SELECT product_name, model_year FROM products ORDER BY model_year DESC;", starterCode: "SELECT " },
  { id: 48, type: "ASSIGNMENT", moduleId: "02", title: "Order Alias Desc", category: "2.1 Select", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงชื่อสินค้า (Product) ราคา (Price) เรียงแพงไปถูก", table: "products", goldenQuery: "SELECT product_name AS Product, list_price AS Price FROM products ORDER BY list_price DESC;", starterCode: "SELECT " },

  // --- 2.2 Select Condition (Module: 03) ---
  { id: 49, type: "ASSIGNMENT", moduleId: "03", title: "Staff Filter", category: "2.2 Select Condition", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงข้อมูลการสั่งซื้อของพนักงานรหัส 2", table: "orders", goldenQuery: "SELECT order_status, shipped_date FROM orders WHERE staff_id = 2;", starterCode: "SELECT " },
  { id: 50, type: "ASSIGNMENT", moduleId: "03", title: "Year Filter", category: "2.2 Select Condition", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงข้อมูลสินค้าที่ออกขายตั้งแต่ปี 1999 ขึ้นไป", table: "products", goldenQuery: "SELECT product_name, category_id, list_price FROM products WHERE model_year >= 1999;", starterCode: "SELECT " },
  { id: 51, type: "ASSIGNMENT", moduleId: "03", title: "Complex IN/OR", category: "2.2 Select Condition", difficulty: "intermediate",
    description: "จงเขียน SQL Statement ลูกค้าที่อยู่เมือง Victoria, Monroe, Santa Cruz, Liverpool หรืออีเมล jayne.kirkland@hotmail.com", table: "customers", goldenQuery: "SELECT first_name, last_name, email, city, state FROM Customers c WHERE city IN ('Victoria', 'Monroe', 'Santa Cruz', 'Liverpool') OR email='jayne.kirkland@hotmail.com';", starterCode: "SELECT " },
  { id: 52, type: "ASSIGNMENT", moduleId: "03", title: "Price Between", category: "2.2 Select Condition", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงสินค้าที่ราคาอยู่ระหว่าง 300 ถึง 500", table: "order_items", goldenQuery: "SELECT product_id, list_price FROM order_items WHERE list_price BETWEEN 300 AND 500;", starterCode: "SELECT " },
  { id: 53, type: "ASSIGNMENT", moduleId: "03", title: "Date Not Between", category: "2.2 Select Condition", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงออเดอร์ที่ไม่อยู่ในช่วง '2016-01-01' ถึง '2017-12-25'", table: "orders", goldenQuery: "SELECT order_id, order_date FROM orders WHERE order_date NOT BETWEEN '2016-01-01' AND '2017-12-25';", starterCode: "SELECT " },
  { id: 54, type: "ASSIGNMENT", moduleId: "03", title: "Manager Null", category: "2.2 Select Condition", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงพนักงานที่ไม่มีผู้จัดการ (manager_id IS NULL)", table: "staffs", goldenQuery: "SELECT first_name, last_name, email, phone FROM staffs WHERE manager_id IS NULL;", starterCode: "SELECT " },
  { id: 55, type: "ASSIGNMENT", moduleId: "03", title: "Required Not Null", category: "2.2 Select Condition", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงออเดอร์ที่มีการกำหนดวันที่ต้องการ (IS NOT NULL)", table: "orders", goldenQuery: "SELECT order_id, order_date FROM orders WHERE required_date IS NOT NULL;", starterCode: "SELECT " },
  { id: 56, type: "ASSIGNMENT", moduleId: "03", title: "LIKE Sort", category: "2.2 Select Condition", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงสินค้าที่มีคำว่า 'frame' เรียงราคาแพงไปถูก", table: "products", goldenQuery: "SELECT product_id, product_name, list_price FROM products WHERE product_name LIKE '%frame%' ORDER BY list_price DESC;", starterCode: "SELECT " },
  { id: 57, type: "ASSIGNMENT", moduleId: "03", title: "LIKE Positional", category: "2.2 Select Condition", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงสินค้าที่มีอักษรตัวที่ 2 เป็น 'u' (_u%)", table: "products", goldenQuery: "SELECT product_name, category_id, list_price FROM products WHERE product_name LIKE '_u%';", starterCode: "SELECT " },
  { id: 58, type: "ASSIGNMENT", moduleId: "03", title: "Escape Character", category: "2.2 Select Condition", difficulty: "advanced",
    description: "จงเขียน SQL Statement แสดงชื่อที่มี 'Girl\\'s' และ '2015/2016' (ใช้ \\ หลีกอักขระ)", table: "products", goldenQuery: "SELECT product_id AS 'id', product_name AS 'pname' FROM products WHERE product_name LIKE '%Girl\\'s%2015/2016%';", starterCode: "SELECT " },
  { id: 59, type: "ASSIGNMENT", moduleId: "03", title: "Multiple Filter", category: "2.2 Select Condition", difficulty: "beginner",
    description: "จงเขียน SQL Statement แสดงสินค้าก่อนปี 2018 และราคากว่า 1500", table: "products", goldenQuery: "SELECT product_id, product_name FROM products WHERE model_year < 2018 AND list_price > 1500;", starterCode: "SELECT " },
  { id: 60, type: "ASSIGNMENT", moduleId: "03", title: "Date Filter OR", category: "2.2 Select Condition", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงออเดอร์สั่งตั้งแต่ 2017 หรือจัดส่ง 2018", table: "orders", goldenQuery: "SELECT order_id, order_date, shipped_date FROM orders WHERE order_date >= '2017-01-01' OR shipped_date >= '2018-01-01';", starterCode: "SELECT " },

  // --- 2.3 Join (Module: 05) ---
  { id: 61, type: "ASSIGNMENT", moduleId: "05", title: "Equi-join Orders", category: "2.3 Join", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดง order_id, order_date, store_name (ใช้ Equi-join o, s)", table: "orders", tables: ["orders", "stores"], goldenQuery: "SELECT o.order_id, o.order_date, s.store_name FROM orders o, stores s WHERE o.store_id = s.store_id;", starterCode: "SELECT " },
  { id: 62, type: "ASSIGNMENT", moduleId: "05", title: "Staff Location", category: "2.3 Join", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงพนักงานรัฐ 'NY' (ใช้ Equi-join sta, sto)", table: "staffs", tables: ["staffs", "stores"], goldenQuery: "SELECT sta.first_name FROM staffs sta, stores sto WHERE sta.store_id = sto.store_id AND sto.state = 'NY';", starterCode: "SELECT " },
  { id: 63, type: "ASSIGNMENT", moduleId: "05", title: "Order Staff Stores", category: "2.3 Join", difficulty: "advanced",
    description: "เขียน SQL Statement แสดงออเดอร์ ชื่อร้าน และพนักงานที่ทำออเดอร์ (Equi-join)", table: "orders", tables: ["orders", "stores", "staffs"], goldenQuery: "SELECT o.order_id, sto.store_name, CONCAT(sta.first_name, ' ', sta.last_name) AS 'Staff Fullname' FROM orders o, stores sto, staffs sta WHERE o.store_id=sto.store_id AND o.staff_id=sta.staff_id ORDER BY order_id;", starterCode: "SELECT " },
  { id: 64, type: "ASSIGNMENT", moduleId: "05", title: "Join ON Simple", category: "2.3 Join", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงสินค้าและปีที่สั่งซื้อ (JOIN ON)", table: "products", tables: ["products", "order_items"], goldenQuery: "SELECT p.product_name, p.model_year, o.quantity FROM products p JOIN order_items o ON p.product_id = o.product_id;", starterCode: "SELECT " },
  { id: 65, type: "ASSIGNMENT", moduleId: "05", title: "Join ON Store 2", category: "2.3 Join", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงออเดอร์ร้านรหัส 2", table: "orders", tables: ["orders", "staffs"], goldenQuery: "SELECT o.Order_ID, o.Order_date, s.First_name, s.Last_name FROM Orders AS o JOIN Staffs AS s ON o.Staff_ID = s.Staff_ID WHERE o.Store_ID = 2;", starterCode: "SELECT " },
  { id: 66, type: "ASSIGNMENT", moduleId: "05", title: "Line Total Calculation", category: "2.3 Join", difficulty: "advanced",
    description: "จงเขียน SQL Statement คำนวณ 'line_total' จากการ JOIN หลายตาราง", table: "order_items", tables: ["order_items", "products", "brands"], goldenQuery: "SELECT oi.order_id, oi.item_id, p.product_name, b.brand_name, oi.quantity, oi.list_price AS unit_price, (oi.quantity * oi.list_price) * (1 - oi.discount) AS line_total FROM order_items oi JOIN products p ON oi.product_id = p.product_id JOIN brands b ON p.brand_id = b.brand_id;", starterCode: "SELECT " },
  { id: 67, type: "ASSIGNMENT", moduleId: "05", title: "Join Using Formatted", category: "2.3 Join", difficulty: "intermediate",
    description: "จงเขียน SQL Statement รวม 'Product (Category)' ใช้ JOIN USING", table: "products", tables: ["products", "categories"], goldenQuery: "SELECT CONCAT(p.product_name, ' (', c.Category_name, ')') AS `Product info`, p.model_year, p.list_price FROM Products p JOIN Categories c USING (category_id);", starterCode: "SELECT " },
  { id: 68, type: "ASSIGNMENT", moduleId: "05", title: "Join Using Date", category: "2.3 Join", difficulty: "intermediate",
    description: "จงเขียน SQL Statement แสดงออเดอร์ที่จัดส่ง 20180318 (JOIN USING)", table: "orders", tables: ["orders", "order_items"], goldenQuery: "SELECT o.customer_id, i.product_id, i.quantity, i.list_price FROM orders o JOIN order_items i USING (order_id) WHERE shipped_date = '20180318';", starterCode: "SELECT " },
  { id: 69, type: "ASSIGNMENT", moduleId: "05", title: "Self Join Manager", category: "2.3 Join", difficulty: "advanced",
    description: "จงเขียน SQL Statement แสดง Staff Fullname คู่กับ Manager Fullname", table: "staffs", tables: ["staffs", "stores"], goldenQuery: "SELECT sto.store_name, CONCAT(sta.first_name, ' ', sta.last_name) AS 'Staff Fullname', CONCAT(m.first_name, ' ', m.last_name) AS 'Manager Fullname' FROM staffs sta JOIN stores sto ON (sta.store_id = sto.store_id) JOIN staffs m ON (sta.manager_id=m.staff_id);", starterCode: "SELECT " },
  { id: 70, type: "ASSIGNMENT", moduleId: "05", title: "Buffalo Customers", category: "2.3 Join", difficulty: "advanced",
    description: "จงเขียน SQL Statement แสดงออเดอร์เฉพาะลูกค้าเมือง 'Buffalo'", table: "customers", tables: ["customers", "orders", "staffs"], goldenQuery: "SELECT o.Order_ID, c.First_name AS Customer_first_name, c.Last_name AS Customer_last_name, s.First_name AS Staff_first_name, s.Last_name AS Staff_last_name FROM Customers AS c JOIN Orders AS o ON c.Customer_ID = o.Customer_ID JOIN Staffs AS s ON o.Staff_ID = s.Staff_ID WHERE c.City = 'Buffalo';", starterCode: "SELECT " },
  { id: 71, type: "ASSIGNMENT", moduleId: "05", title: "NATURAL JOIN Basic 2", category: "2.3 Join", difficulty: "intermediate",
    description: "จงเขียน SQL Statement เชื่อม Product กับ Order_items ด้วย NATURAL JOIN", table: "products", tables: ["products", "order_items"], goldenQuery: "SELECT product_name, quantity, list_price, discount FROM products NATURAL JOIN order_items;", starterCode: "SELECT " },
  { id: 72, type: "ASSIGNMENT", moduleId: "05", title: "NATURAL JOIN CA", category: "2.3 Join", difficulty: "advanced",
    description: "จงเขียน SQL Statement ลูกค้ารัฐ CA สั่งตั้งแต่ 2017 (NATURAL JOIN)", table: "orders", tables: ["orders", "customers"], goldenQuery: "SELECT order_id, order_date, first_name, last_name FROM orders NATURAL JOIN customers WHERE order_date >= '2017-01-01' AND state = 'CA';", starterCode: "SELECT " },

  // ==========================================
  // 3. EXAM
  // ==========================================
  // --- 3.1 EXAM (Module: 01) ---
  { id: 99, type: 'EXAM', moduleId: '01', title: 'FINAL TEST MODULE 01', category: "3.1 EXAM", difficulty: "advanced",
    description: 'เลือกข้อมูลทั้งหมดในตาราง', table: 'users', goldenQuery: 'SELECT * FROM users;', starterCode: "SELECT ",
    requirements: ['ดึงข้อมูลมาทั้งหมด', 'จบคำสั่งด้วย ;'] },

  // --- 3.2 EXAM (Module: 02) ---
  { id: 100, type: 'EXAM', moduleId: '02', title: 'EXAM: SELECT DATA', category: "3.2 EXAM", difficulty: "beginner",
    description: "แสดงชื่อนามสกุลพนักงาน โดยตั้งชื่อคอลัมน์ว่า 'Staff Name'", table: "staffs", goldenQuery: "SELECT CONCAT(first_name, ' ', last_name) AS 'Staff Name' FROM staffs;", starterCode: "SELECT " },
  { id: 101, type: 'EXAM', moduleId: '02', title: 'EXAM: DISTINCT VALUES', category: "3.2 EXAM", difficulty: "intermediate",
    description: "แสดงรายชื่อรัฐที่มีร้านค้าตั้งอยู่โดยไม่ซ้ำกัน", table: "stores", goldenQuery: "SELECT DISTINCT state FROM stores;", starterCode: "SELECT " },

  // --- 3.3 EXAM (Module: 03) ---
  { id: 102, type: 'EXAM', moduleId: '03', title: 'EXAM: FILTERING', category: "3.3 EXAM", difficulty: "intermediate",
    description: "แสดงสินค้าที่มีราคาอยู่ระหว่าง 1000 ถึง 2000 เรียงจากแพงไปถูก", table: "products", goldenQuery: "SELECT product_name, list_price FROM products WHERE list_price BETWEEN 1000 AND 2000 ORDER BY list_price DESC;", starterCode: "SELECT " },
  { id: 103, type: 'EXAM', moduleId: '03', title: 'EXAM: LIKE OPERATOR', category: "3.3 EXAM", difficulty: "intermediate",
    description: "แสดงลูกค้าที่อีเมลลงท้ายด้วย @gmail.com", table: "customers", goldenQuery: "SELECT first_name, email FROM customers WHERE email LIKE '%@gmail.com';", starterCode: "SELECT " },

  // --- 3.4 EXAM (Module: 05) ---
  { id: 104, type: 'EXAM', moduleId: '05', title: 'EXAM: INNER JOIN', category: "3.4 EXAM", difficulty: "advanced",
    description: "แสดงชื่อร้านค้าและจำนวนออเดอร์ทั้งหมดที่ร้านนั้นรับผิดชอบ", table: "orders", tables: ["stores", "orders"], goldenQuery: "SELECT s.store_name, COUNT(o.order_id) FROM stores s JOIN orders o ON s.store_id = o.store_id GROUP BY s.store_name;", starterCode: "SELECT " },
  { id: 105, type: 'EXAM', moduleId: '05', title: 'EXAM: MULTI JOIN', category: "3.4 EXAM", difficulty: "advanced",
    description: "แสดงชื่อลูกค้าที่ซื้อสินค้าจากแบรนด์ 'Trek'", table: "orders", tables: ["customers", "orders", "order_items", "products", "brands"], goldenQuery: "SELECT DISTINCT c.first_name, c.last_name FROM customers c JOIN orders o ON c.customer_id = o.customer_id JOIN order_items oi ON o.order_id = oi.order_id JOIN products p ON oi.product_id = p.product_id JOIN brands b ON p.brand_id = b.brand_id WHERE b.brand_name = 'Trek';", starterCode: "SELECT " }
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