"""
Seed data script — populates the database with:
1. Default course (06070999 SQL Fundamentals)
2. Modules (01-05)
3. Lessons (COURSE / ASSIGNMENT / EXAM per module)
4. Problems from the frontend problems.js
5. Bikestore dataset (converted from MySQL to SQLite)

Usage:
    cd backend
    python -m app.seed
"""

import asyncio
import os
import re
from pathlib import Path

from sqlalchemy import select
from app.database import engine, AsyncSessionLocal, Base
from app.models.user import User, Role
from app.models.course import Course, Module, Lesson
from app.models.problem import Problem, Dataset, Hint, Difficulty
from app.models.enrollment import Enrollment
from app.models.assignment import Assignment, AssignmentProblem
from app.models.submission import Submission, SubmissionLog


# ═══════════════════════════════════════════════════════════════════════
# INSTRUCTOR ACCOUNTS — the ONLY pre-set instructors (seeded on startup).
# Students self sign-up (role=student); these 3 are role=instructor.
# ═══════════════════════════════════════════════════════════════════════
INSTRUCTOR_SEED = [
    {"username": "aj001",      "password": "aj001",    "name": "Instructor aj001",  "email": "aj001@kmitl.ac.th"},
    {"username": "it66070126", "password": "NLKctw25", "name": "นายพชร พรอโนทัย",     "email": "it66070126@kmitl.ac.th"},
    {"username": "it66070066", "password": "LGHuuh18", "name": "นายณัฐวีร์ เเนกำพล",  "email": "it66070066@kmitl.ac.th"},
]


async def ensure_instructors():
    """Idempotently seed the 3 fixed instructor accounts. Safe on every startup:
    creates missing ones and repairs role/name/password/active on existing so the
    known credentials always work."""
    from app.services.auth_service import hash_password
    async with AsyncSessionLocal() as db:
        for u in INSTRUCTOR_SEED:
            existing = await db.scalar(select(User).where(User.username == u["username"]))
            if existing:
                existing.role = Role.INSTRUCTOR
                existing.is_active = True
                existing.name = u["name"]
                existing.password_hash = hash_password(u["password"])
            else:
                db.add(User(
                    username=u["username"],
                    password_hash=hash_password(u["password"]),
                    email=u["email"],
                    name=u["name"],
                    role=Role.INSTRUCTOR,
                    modules="[]",
                ))
        await db.commit()
    print(f"✅  Instructors ensured: {', '.join(u['username'] for u in INSTRUCTOR_SEED)}")


# ═══════════════════════════════════════════════════════════════════════
# RAW PROBLEMS DATA (ported from frontend/src/lib/problems.js)
# ═══════════════════════════════════════════════════════════════════════

RAW_PROBLEMS = [
    # ── COURSE: Module 01 ──
    {"id": 901, "type": "COURSE", "moduleId": "01", "title": "Select All Stores (Intro)", "category": "1.0 Intro", "difficulty": "beginner",
     "description": "จงเขียน SQL Statement แสดงข้อมูลร้านค้าทั้งหมดเพื่อทำความเข้าใจโครงสร้างเบื้องต้น", "table": "stores",
     "goldenQuery": "SELECT * FROM stores;", "starterCode": "SELECT "},

    # ── COURSE: Module 02 (Select) ──
    {"id": 1, "type": "COURSE", "moduleId": "02", "title": "Select All Products", "category": "1.1 Select", "difficulty": "beginner",
     "description": "จงเขียน SQL Statement แสดงข้อมูลสินค้าทั้งหมด", "table": "products",
     "goldenQuery": "SELECT * FROM products;", "starterCode": "SELECT ",
     "requirements": ["ใช้คำสั่ง SELECT ดึงข้อมูลจากตาราง products", "แสดงคอลัมน์ทั้งหมดด้วยเครื่องหมาย *"]},
    {"id": 2, "type": "COURSE", "moduleId": "02", "title": "Select Staff Emails", "difficulty": "beginner",
     "description": "จงเขียน SQL Statement แสดงอีเมลของพนักงานทุกคน", "table": "staffs",
     "goldenQuery": "SELECT email FROM staffs;", "starterCode": "SELECT "},
    {"id": 3, "type": "COURSE", "moduleId": "02", "title": "Select Brand Info", "difficulty": "beginner",
     "description": "จงเขียน SQL Statement แสดงรหัสยี่ห้อ และ ชื่อยี่ห้อทั้งหมด", "table": "brands",
     "goldenQuery": "SELECT brand_id, brand_name FROM brands;", "starterCode": "SELECT "},
    {"id": 4, "type": "COURSE", "moduleId": "02", "title": "Calculate Total Price", "difficulty": "intermediate",
     "description": "จงเขียน SQL Statement แสดงรหัสรายการสั่งซื้อ, รหัสสินค้า, และ คำนวณราคาทั้งหมด (quantity * list_price) ตั้งชื่อคอลัมน์ว่า 'Total Price'", "table": "order_items",
     "goldenQuery": "SELECT item_id, product_id, quantity * list_price AS 'Total Price' FROM order_items;", "starterCode": "SELECT "},
    {"id": 5, "type": "COURSE", "moduleId": "02", "title": "Calculate Product Age", "difficulty": "intermediate",
     "description": "จงเขียน SQL Statement แสดงชื่อสินค้า, ปีที่สินค้าออกขาย และคำนวณจำนวนปีที่สินค้าได้วางขายนับจากปี 2026 โดยตั้งชื่อคอลัมน์ใหม่ว่า 'Product Age'", "table": "products",
     "goldenQuery": "SELECT Product_name, Model_year, 2026 - Model_year AS 'Product Age' FROM Products;", "starterCode": "SELECT "},
    {"id": 6, "type": "COURSE", "moduleId": "02", "title": "Alias Column Names", "difficulty": "beginner",
     "description": "จงเขียน SQL Statement แสดงชื่อสินค้า ราคาขายปลีก โดยตั้งชื่อคอลัมน์ว่า 'Name of Product' และ Price ตามลำดับ", "table": "products",
     "goldenQuery": "SELECT product_name AS 'Name of Product', list_price AS 'Price' FROM products;", "starterCode": "SELECT "},
    {"id": 7, "type": "COURSE", "moduleId": "02", "title": "Concat Staff Name", "difficulty": "intermediate",
     "description": "จงเขียน SQL Statement แสดงชื่อจริงและนามสกุลพนักงาน โดยรวมไว้ภายใน 1 คอลัมน์ (คั่นด้วย 1 ช่องว่าง)", "table": "staffs",
     "goldenQuery": "SELECT Concat(First_name , ' ', Last_name) FROM Staffs;", "starterCode": "SELECT "},
    {"id": 8, "type": "COURSE", "moduleId": "02", "title": "Customer Full Name", "difficulty": "intermediate",
     "description": "จงเขียน SQL Statement แสดงรายชื่อลูกค้าตั้งชื่อคอลัมน์ว่า full_name (ประกอบด้วยชื่อจริง คั่น 1 ช่องว่าง ตามด้วยนามสกุล) และคอลัมน์ที่สองอีเมล", "table": "customers",
     "goldenQuery": "SELECT CONCAT(first_name, ' ', last_name) AS full_name, email FROM customers;", "starterCode": "SELECT "},
    {"id": 9, "type": "COURSE", "moduleId": "02", "title": "Distinct City State", "difficulty": "intermediate",
     "description": "จงเขียน SQL Statement แสดงชื่อเมือง และชื่อรัฐที่ลูกค้าทุกคนอาศัยอยู่ โดยไม่แสดงแถวที่มีข้อมูลซ้ำ", "table": "customers",
     "goldenQuery": "SELECT DISTINCT city, state FROM customers;", "starterCode": "SELECT "},
    {"id": 10, "type": "COURSE", "moduleId": "02", "title": "Order Emails Desc", "difficulty": "beginner",
     "description": "จงเขียน SQL Statement แสดงอีเมลของร้านค้าทั้งหมด โดยเรียงผลลัพธ์จาก Z ไป A", "table": "stores",
     "goldenQuery": "SELECT email FROM stores ORDER BY email DESC;", "starterCode": "SELECT "},
    {"id": 11, "type": "COURSE", "moduleId": "02", "title": "Order Staff Names", "difficulty": "beginner",
     "description": "จงเขียน SQL Statement แสดงชื่อจริงและนามสกุลพนักงาน โดยเรียงผลลัพธ์ด้วยชื่อจริง จาก A ไป Z", "table": "staffs",
     "goldenQuery": "SELECT first_name, last_name FROM staffs ORDER BY first_name;", "starterCode": "SELECT "},
    {"id": 12, "type": "COURSE", "moduleId": "02", "title": "Order Multi Columns", "difficulty": "intermediate",
     "description": "จงเขียน SQL statement แสดงชื่อร้านค้าตั้งชื่อว่า 'Store' และเบอร์โทรตั้งชื่อว่า 'Tel' เรียงตามชื่อรัฐจาก Z-A จากนั้นเรียงตามชื่อเมืองจาก A-Z", "table": "stores",
     "goldenQuery": "SELECT store_name AS Store, phone AS Tel FROM stores ORDER BY state DESC, city;", "starterCode": "SELECT "},

    # ── COURSE: Module 03 (Conditions) ──
    {"id": 13, "type": "COURSE", "moduleId": "03", "title": "Where State NY", "difficulty": "beginner",
     "description": "จงเขียน SQL Statement แสดงชื่อจริง นามสกุล เบอร์โทรศัพท์ ชื่อถนน ของลูกค้าทุกคนที่อาศัยอยู่ในรัฐชื่อ NY", "table": "customers",
     "goldenQuery": "SELECT first_name, last_name, phone, street FROM customers WHERE state = 'NY';", "starterCode": "SELECT "},
    {"id": 14, "type": "COURSE", "moduleId": "03", "title": "Quantity > 20", "difficulty": "beginner",
     "description": "จงเขียน SQL Statement แสดงรหัสร้านค้า และรหัสสินค้า ที่มีปริมาณสินค้าคงเหลือมากกว่า 20 ชิ้น", "table": "stocks",
     "goldenQuery": "SELECT store_id, product_id FROM stocks WHERE quantity > 20;", "starterCode": "SELECT "},
    {"id": 15, "type": "COURSE", "moduleId": "03", "title": "IN Clause Cities", "difficulty": "intermediate",
     "description": "จงเขียน SQL Statement เพื่อแสดงข้อมูลของลูกค้าที่อาศัยอยู่ในเมือง Amsterdam, Oakland, Santa Cruz, San Jose (ใช้คำสั่ง IN)", "table": "customers",
     "goldenQuery": "SELECT first_name, last_name, email, city, state FROM Customers WHERE city IN ('Amsterdam', 'Oakland', 'Santa Cruz', 'San Jose');", "starterCode": "SELECT "},
    {"id": 16, "type": "COURSE", "moduleId": "03", "title": "Between Years", "difficulty": "intermediate",
     "description": "จงเขียน SQL Statement แสดงชื่อสินค้าและปีที่ออกขาย เฉพาะสินค้าที่ออกขายตั้งแต่ปี 2017 ถึงปี 2018 (ใช้ Between)", "table": "products",
     "goldenQuery": "SELECT product_name, model_year FROM products WHERE model_year BETWEEN 2017 AND 2018;", "starterCode": "SELECT "},
    {"id": 17, "type": "COURSE", "moduleId": "03", "title": "Not Between Quantities", "difficulty": "intermediate",
     "description": "จงเขียน SQL Statment แสดงข้อมูลสินค้าคงเหลือ เฉพาะที่มีปริมาณน้อยกว่า 10 ชิ้น และเกินกว่า 29 ชิ้น", "table": "stocks",
     "goldenQuery": "SELECT * FROM stocks WHERE quantity NOT BETWEEN 10 AND 29;", "starterCode": "SELECT "},
    {"id": 18, "type": "COURSE", "moduleId": "03", "title": "IS NULL Condition", "difficulty": "beginner",
     "description": "จงเขียน SQL Statement แสดงข้อมูลการสั่งซื้อ ที่ยังไม่ได้กำหนดวันที่จัดส่ง (Shipped_date)", "table": "orders",
     "goldenQuery": "SELECT * FROM Orders WHERE Shipped_date IS NULL;", "starterCode": "SELECT "},
    {"id": 19, "type": "COURSE", "moduleId": "03", "title": "IS NOT NULL", "difficulty": "beginner",
     "description": "จงเขียน SQL Statement แสดงชื่อจริงและนามสกุลของลูกค้าที่มีเบอร์โทรศัพท์", "table": "customers",
     "goldenQuery": "SELECT first_name, last_name FROM customers WHERE phone IS NOT NULL;", "starterCode": "SELECT "},
    {"id": 20, "type": "COURSE", "moduleId": "03", "title": "LIKE 'San%'", "difficulty": "intermediate",
     "description": "จงเขียน SQL Statement แสดงชื่อร้านค้าและชื่อเมืองเฉพาะที่ขึ้นต้นด้วยคำว่า 'San'", "table": "stores",
     "goldenQuery": "SELECT store_name, city FROM stores WHERE city LIKE 'San%';", "starterCode": "SELECT "},
    {"id": 21, "type": "COURSE", "moduleId": "03", "title": "LIKE '%msn.com'", "difficulty": "intermediate",
     "description": "จงเขียน SQL Statement แสดงชื่อ นามสกุลและอีเมลลูกค้า เฉพาะอีเมลที่ลงท้ายด้วย 'msn.com'", "table": "customers",
     "goldenQuery": "SELECT first_name, last_name, email FROM customers WHERE email LIKE '%msn.com';", "starterCode": "SELECT "},
    {"id": 22, "type": "COURSE", "moduleId": "03", "title": "LIKE '%original%'", "difficulty": "intermediate",
     "description": "จงเขียน SQL Statement แสดงรหัสและชื่อสินค้า ที่มีคำว่า 'original' อยู่ในชื่อสินค้า", "table": "products",
     "goldenQuery": "SELECT product_id, product_name FROM products WHERE product_name LIKE '%original%';", "starterCode": "SELECT "},
    {"id": 23, "type": "COURSE", "moduleId": "03", "title": "AND Condition", "difficulty": "beginner",
     "description": "จงเขียน SQL Statement แสดงชื่อจริง รัฐ รหัสไปรษณีย์ลูกค้า ที่รัฐคือ 'CA' และรหัสไปรษณีย์มากกว่า 95000", "table": "customers",
     "goldenQuery": "SELECT first_name, state, zip_code FROM customers WHERE state = 'CA' AND zip_code > '95000';", "starterCode": "SELECT "},
    {"id": 24, "type": "COURSE", "moduleId": "03", "title": "OR Condition", "difficulty": "beginner",
     "description": "จงเขียน SQL Statement แสดงชื่อจริง และชื่อรัฐของลูกค้า ที่อยู่รัฐ 'TX' หรือ 'NY'", "table": "customers",
     "goldenQuery": "SELECT first_name, state FROM customers WHERE state = 'TX' OR state = 'NY';", "starterCode": "SELECT "},

    # ── COURSE: Module 05 (Join) ──
    {"id": 25, "type": "COURSE", "moduleId": "05", "title": "Equi-join Products Brands", "difficulty": "intermediate",
     "description": "จงเขียน SQL Statement แสดงรหัสสินค้า ชื่อสินค้า และชื่อยี่ห้อ (ใช้ Equi-join ตัวย่อตาราง p และ b)", "table": "products",
     "goldenQuery": "SELECT p.product_id, p.product_name, b.brand_name FROM products p, brands b WHERE p.brand_id = b.brand_id;", "starterCode": "SELECT "},
    {"id": 26, "type": "COURSE", "moduleId": "05", "title": "Equi-join Condition", "difficulty": "intermediate",
     "description": "จงเขียน SQL Statement แสดงชื่อสินค้า ชื่อประเภทสินค้า เฉพาะสินค้าที่ list_price > 3000 (ใช้ Equi-join p และ ca)", "table": "products",
     "goldenQuery": "SELECT p.product_name, ca.category_name FROM products p, categories ca WHERE p.category_id = ca.category_id AND p.list_price > 3000;", "starterCode": "SELECT "},
    {"id": 27, "type": "COURSE", "moduleId": "05", "title": "Equi-join 3 Tables", "difficulty": "advanced",
     "description": "เขียน SQL Statement แสดงชื่อสินค้า ยี่ห้อ ประเภท และราคา เรียงรหัสสินค้าจากน้อยไปมาก (ใช้ Equi-join)", "table": "products",
     "goldenQuery": "SELECT p.product_name, b.brand_name, ca.category_name, p.list_price FROM products p, brands b, categories ca WHERE p.brand_id = b.brand_id AND p.category_id = ca.category_id ORDER BY p.product_id;", "starterCode": "SELECT "},
    {"id": 28, "type": "COURSE", "moduleId": "05", "title": "JOIN ON Clause", "difficulty": "intermediate",
     "description": "จงเขียน SQL Statement แสดงชื่อ นามสกุล อีเมลพนักงาน รหัสร้าน และชื่อร้าน (ใช้ JOIN ON)", "table": "staffs",
     "goldenQuery": "SELECT st.first_name, st.last_name, st.email, s.store_id, s.store_name FROM staffs st JOIN stores s ON st.store_id = s.store_id;", "starterCode": "SELECT "},
    {"id": 29, "type": "COURSE", "moduleId": "05", "title": "JOIN ON Filter", "difficulty": "intermediate",
     "description": "จงเขียน SQL Statement แสดงชื่อสินค้าและจำนวนสินค้าคงเหลือของร้านค้ารหัส 3 (ใช้ JOIN ON)", "table": "stocks",
     "goldenQuery": "SELECT p.Product_name, sto.Quantity FROM Stocks AS sto JOIN Products AS p ON sto.Product_ID = p.Product_ID WHERE sto.Store_ID = 3;", "starterCode": "SELECT "},
    {"id": 30, "type": "COURSE", "moduleId": "05", "title": "Multiple JOIN ON", "difficulty": "advanced",
     "description": "จงเขียน SQL Statement แสดงรหัสสั่งซื้อ วันที่สั่งซื้อ ชื่อเต็มลูกค้า(ตั้งชื่อว่า customer_name) ชื่อร้าน สถานะ (ใช้ JOIN ON)", "table": "orders",
     "goldenQuery": "SELECT o.order_id, o.order_date, CONCAT(c.first_name, ' ', c.last_name) AS customer_name, s.store_name, o.order_status FROM orders o JOIN customers c ON o.customer_id = c.customer_id JOIN stores s ON o.store_id = s.store_id;", "starterCode": "SELECT "},
    {"id": 31, "type": "COURSE", "moduleId": "05", "title": "JOIN USING", "difficulty": "intermediate",
     "description": "จงเขียน SQL Statement แสดงรหัสสั่งซื้อ รหัสลูกค้า ชื่อจริงนามสกุลพนักงานที่ดำเนินการ (ใช้ JOIN USING)", "table": "orders",
     "goldenQuery": "SELECT order_id, customer_id, first_name, last_name FROM orders JOIN staffs USING (staff_id);", "starterCode": "SELECT "},
    {"id": 32, "type": "COURSE", "moduleId": "05", "title": "JOIN USING Filter", "difficulty": "intermediate",
     "description": "จงเขียน SQL Statement แสดงชื่อสินค้า ชื่อประเภท ราคา เฉพาะประเภท 'Cyclocross Bicycles' (ใช้ JOIN USING)", "table": "products",
     "goldenQuery": "SELECT product_name, category_name, list_price FROM products JOIN categories USING (category_id) WHERE category_name = 'Cyclocross Bicycles';", "starterCode": "SELECT "},
    {"id": 33, "type": "COURSE", "moduleId": "05", "title": "Orders Multi Join", "difficulty": "advanced",
     "description": "จงเขียน SQL Statement แสดงรหัสสั่งซื้อ ชื่อจริงลูกค้า ชื่อร้านค้า เรียงตามรหัสสั่งซื้อ", "table": "orders",
     "goldenQuery": "SELECT o.order_id, c.first_name, s.store_name FROM orders o JOIN customers c ON (o.customer_id=c.customer_id) JOIN stores s ON (o.store_id = s.store_id) ORDER BY o.order_id;", "starterCode": "SELECT "},
    {"id": 34, "type": "COURSE", "moduleId": "05", "title": "Stocks Join", "difficulty": "advanced",
     "description": "จงเขียน SQL Statement แสดงชื่อสินค้า ปริมาณในคลังทั้งหมดที่มีในร้านชื่อ 'Santa Cruz Bikes'", "table": "products",
     "goldenQuery": "SELECT p.Product_name, sto.Quantity FROM Products AS p JOIN Stocks AS sto ON p.Product_ID = sto.Product_ID JOIN Stores AS s ON sto.Store_ID = s.Store_ID WHERE s.Store_name = 'Santa Cruz Bikes';", "starterCode": "SELECT "},
    {"id": 35, "type": "COURSE", "moduleId": "05", "title": "NATURAL JOIN Basic", "difficulty": "intermediate",
     "description": "จงเขียน SQL Statement แสดงชื่อสินค้าและประเภทสินค้าทั้งหมด (ใช้ NATURAL JOIN)", "table": "products",
     "goldenQuery": "SELECT product_name, category_name FROM categories NATURAL JOIN products;", "starterCode": "SELECT "},
    {"id": 36, "type": "COURSE", "moduleId": "05", "title": "NATURAL JOIN Filter", "difficulty": "intermediate",
     "description": "จงเขียน SQL Statement แสดงชื่อสินค้าและยี่ห้อ เฉพาะสินค้าปี 2016 (ใช้ NATURAL JOIN)", "table": "products",
     "goldenQuery": "SELECT product_name, brand_name FROM products NATURAL JOIN brands WHERE model_year = 2016;", "starterCode": "SELECT "},

    # ── ASSIGNMENT: Module 01 ──
    {"id": 902, "type": "ASSIGNMENT", "moduleId": "01", "title": "Select All Brands (Intro)", "difficulty": "beginner",
     "description": "จงเขียนคำสั่งแสดงข้อมูลยี่ห้อสินค้าทั้งหมด", "table": "brands",
     "goldenQuery": "SELECT * FROM brands;", "starterCode": "SELECT "},

    # ── ASSIGNMENT: Module 02 ──
    {"id": 37, "type": "ASSIGNMENT", "moduleId": "02", "title": "Select All Stores", "difficulty": "beginner",
     "description": "จงเขียน SQL Statement แสดงข้อมูลร้านค้าทั้งหมด", "table": "stores",
     "goldenQuery": "SELECT * FROM stores;", "starterCode": "SELECT "},
    {"id": 38, "type": "ASSIGNMENT", "moduleId": "02", "title": "Select Product Names", "difficulty": "beginner",
     "description": "จงเขียน SQL Statement แสดงชื่อสินค้าทั้งหมด", "table": "products",
     "goldenQuery": "SELECT product_name FROM products;", "starterCode": "SELECT "},
    {"id": 39, "type": "ASSIGNMENT", "moduleId": "02", "title": "Store Name & Phone", "difficulty": "beginner",
     "description": "จงเขียน SQL Statement แสดงชื่อร้านค้าทั้งหมดและเบอร์โทรศัพท์", "table": "stores",
     "goldenQuery": "SELECT store_name, phone FROM stores;", "starterCode": "SELECT "},
    {"id": 40, "type": "ASSIGNMENT", "moduleId": "02", "title": "Calculate Net Price", "difficulty": "advanced",
     "description": "จงเขียน SQL Statement คำนวณราคาสุทธิ (quantity * list_price) - (quantity * discount) ตั้งชื่อว่า 'net_price'", "table": "order_items",
     "goldenQuery": "SELECT item_id, product_id, quantity, list_price, (quantity * list_price) - (quantity * discount) AS net_price FROM order_items;", "starterCode": "SELECT "},
    {"id": 41, "type": "ASSIGNMENT", "moduleId": "02", "title": "Discounted Price", "difficulty": "intermediate",
     "description": "จงเขียน SQL Statement แสดงราคาที่ลบออก 10 ตั้งชื่อคอลัมน์ว่า 'Discounted Price'", "table": "products",
     "goldenQuery": "SELECT Product_name, List_price, List_price - 10 AS 'Discounted Price' FROM Products;", "starterCode": "SELECT "},
    {"id": 42, "type": "ASSIGNMENT", "moduleId": "02", "title": "Staff Alias", "difficulty": "beginner",
     "description": "จงเขียน SQL Statement ตั้งชื่อคอลัมน์ first_name เป็น 'Staff Name' และ last_name เป็น 'Staff Surname'", "table": "staffs",
     "goldenQuery": "SELECT first_name AS 'Staff Name', last_name AS 'Staff Surname' FROM staffs;", "starterCode": "SELECT "},
    {"id": 43, "type": "ASSIGNMENT", "moduleId": "02", "title": "Format Price String", "difficulty": "advanced",
     "description": "จงเขียน SQL Statement รวมข้อความให้อยู่ในรูปแบบ 'Product Name ($Price)'", "table": "products",
     "goldenQuery": "SELECT Concat(product_name, ' ($', list_price, ')') FROM Products;", "starterCode": "SELECT "},
    {"id": 44, "type": "ASSIGNMENT", "moduleId": "02", "title": "Format Store State", "difficulty": "intermediate",
     "description": "จงเขียน SQL Statement รวมข้อความ 'Store Name (State)' ตั้งชื่อว่า Store_list", "table": "stores",
     "goldenQuery": "SELECT CONCAT(store_name, ' (', state, ')') AS Store_list, email FROM stores;", "starterCode": "SELECT "},
    {"id": 45, "type": "ASSIGNMENT", "moduleId": "02", "title": "Distinct Multi", "difficulty": "intermediate",
     "description": "จงเขียน SQL Statement แสดงรหัสยี่ห้อและรหัสประเภท โดยไม่แสดงข้อมูลซ้ำ", "table": "products",
     "goldenQuery": "SELECT DISTINCT brand_ID, category_ID FROM products;", "starterCode": "SELECT "},
    {"id": 46, "type": "ASSIGNMENT", "moduleId": "02", "title": "Order Brands", "difficulty": "beginner",
     "description": "จงเขียน SQL Statement แสดงชื่อยี่ห้อเรียงจาก A ไป Z", "table": "brands",
     "goldenQuery": "SELECT brand_name FROM brands ORDER BY brand_name;", "starterCode": "SELECT "},
    {"id": 47, "type": "ASSIGNMENT", "moduleId": "02", "title": "Order Products", "difficulty": "beginner",
     "description": "จงเขียน SQL Statement แสดงชื่อสินค้าเรียงปีจากล่าสุดไปอดีต (DESC)", "table": "products",
     "goldenQuery": "SELECT product_name, model_year FROM products ORDER BY model_year DESC;", "starterCode": "SELECT "},
    {"id": 48, "type": "ASSIGNMENT", "moduleId": "02", "title": "Order Alias Desc", "difficulty": "intermediate",
     "description": "จงเขียน SQL Statement แสดงชื่อสินค้า (Product) ราคา (Price) เรียงแพงไปถูก", "table": "products",
     "goldenQuery": "SELECT product_name AS Product, list_price AS Price FROM products ORDER BY list_price DESC;", "starterCode": "SELECT "},

    # ── ASSIGNMENT: Module 03 ──
    {"id": 49, "type": "ASSIGNMENT", "moduleId": "03", "title": "Staff Filter", "difficulty": "beginner",
     "description": "จงเขียน SQL Statement แสดงข้อมูลการสั่งซื้อของพนักงานรหัส 2", "table": "orders",
     "goldenQuery": "SELECT order_status, shipped_date FROM orders WHERE staff_id = 2;", "starterCode": "SELECT "},
    {"id": 50, "type": "ASSIGNMENT", "moduleId": "03", "title": "Year Filter", "difficulty": "beginner",
     "description": "จงเขียน SQL Statement แสดงข้อมูลสินค้าที่ออกขายตั้งแต่ปี 1999 ขึ้นไป", "table": "products",
     "goldenQuery": "SELECT product_name, category_id, list_price FROM products WHERE model_year >= 1999;", "starterCode": "SELECT "},
    {"id": 51, "type": "ASSIGNMENT", "moduleId": "03", "title": "Complex IN/OR", "difficulty": "intermediate",
     "description": "จงเขียน SQL Statement ลูกค้าที่อยู่เมือง Victoria, Monroe, Santa Cruz, Liverpool หรืออีเมล jayne.kirkland@hotmail.com", "table": "customers",
     "goldenQuery": "SELECT first_name, last_name, email, city, state FROM Customers c WHERE city IN ('Victoria', 'Monroe', 'Santa Cruz', 'Liverpool') OR email='jayne.kirkland@hotmail.com';", "starterCode": "SELECT "},
    {"id": 52, "type": "ASSIGNMENT", "moduleId": "03", "title": "Price Between", "difficulty": "beginner",
     "description": "จงเขียน SQL Statement แสดงสินค้าที่ราคาอยู่ระหว่าง 300 ถึง 500", "table": "order_items",
     "goldenQuery": "SELECT product_id, list_price FROM order_items WHERE list_price BETWEEN 300 AND 500;", "starterCode": "SELECT "},
    {"id": 53, "type": "ASSIGNMENT", "moduleId": "03", "title": "Date Not Between", "difficulty": "intermediate",
     "description": "จงเขียน SQL Statement แสดงออเดอร์ที่ไม่อยู่ในช่วง '2016-01-01' ถึง '2017-12-25'", "table": "orders",
     "goldenQuery": "SELECT order_id, order_date FROM orders WHERE order_date NOT BETWEEN '2016-01-01' AND '2017-12-25';", "starterCode": "SELECT "},
    {"id": 54, "type": "ASSIGNMENT", "moduleId": "03", "title": "Manager Null", "difficulty": "beginner",
     "description": "จงเขียน SQL Statement แสดงพนักงานที่ไม่มีผู้จัดการ (manager_id IS NULL)", "table": "staffs",
     "goldenQuery": "SELECT first_name, last_name, email, phone FROM staffs WHERE manager_id IS NULL;", "starterCode": "SELECT "},
    {"id": 55, "type": "ASSIGNMENT", "moduleId": "03", "title": "Required Not Null", "difficulty": "beginner",
     "description": "จงเขียน SQL Statement แสดงออเดอร์ที่มีการกำหนดวันที่ต้องการ (IS NOT NULL)", "table": "orders",
     "goldenQuery": "SELECT order_id, order_date FROM orders WHERE required_date IS NOT NULL;", "starterCode": "SELECT "},
    {"id": 56, "type": "ASSIGNMENT", "moduleId": "03", "title": "LIKE Sort", "difficulty": "intermediate",
     "description": "จงเขียน SQL Statement แสดงสินค้าที่มีคำว่า 'frame' เรียงราคาแพงไปถูก", "table": "products",
     "goldenQuery": "SELECT product_id, product_name, list_price FROM products WHERE product_name LIKE '%frame%' ORDER BY list_price DESC;", "starterCode": "SELECT "},
    {"id": 57, "type": "ASSIGNMENT", "moduleId": "03", "title": "LIKE Positional", "difficulty": "intermediate",
     "description": "จงเขียน SQL Statement แสดงสินค้าที่มีอักษรตัวที่ 2 เป็น 'u' (_u%)", "table": "products",
     "goldenQuery": "SELECT product_name, category_id, list_price FROM products WHERE product_name LIKE '_u%';", "starterCode": "SELECT "},
    {"id": 58, "type": "ASSIGNMENT", "moduleId": "03", "title": "Escape Character", "difficulty": "advanced",
     "description": "จงเขียน SQL Statement แสดงชื่อที่มี 'Girl\\'s' และ '2015/2016' (ใช้ \\ หลีกอักขระ)", "table": "products",
     "goldenQuery": "SELECT product_id AS 'id', product_name AS 'pname' FROM products WHERE product_name LIKE '%Girl\\'s%2015/2016%';", "starterCode": "SELECT "},
    {"id": 59, "type": "ASSIGNMENT", "moduleId": "03", "title": "Multiple Filter", "difficulty": "beginner",
     "description": "จงเขียน SQL Statement แสดงสินค้าก่อนปี 2018 และราคากว่า 1500", "table": "products",
     "goldenQuery": "SELECT product_id, product_name FROM products WHERE model_year < 2018 AND list_price > 1500;", "starterCode": "SELECT "},
    {"id": 60, "type": "ASSIGNMENT", "moduleId": "03", "title": "Date Filter OR", "difficulty": "intermediate",
     "description": "จงเขียน SQL Statement แสดงออเดอร์สั่งตั้งแต่ 2017 หรือจัดส่ง 2018", "table": "orders",
     "goldenQuery": "SELECT order_id, order_date, shipped_date FROM orders WHERE order_date >= '2017-01-01' OR shipped_date >= '2018-01-01';", "starterCode": "SELECT "},

    # ── ASSIGNMENT: Module 05 ──
    {"id": 61, "type": "ASSIGNMENT", "moduleId": "05", "title": "Equi-join Orders", "difficulty": "intermediate",
     "description": "จงเขียน SQL Statement แสดง order_id, order_date, store_name (ใช้ Equi-join o, s)", "table": "orders",
     "goldenQuery": "SELECT o.order_id, o.order_date, s.store_name FROM orders o, stores s WHERE o.store_id = s.store_id;", "starterCode": "SELECT "},
    {"id": 62, "type": "ASSIGNMENT", "moduleId": "05", "title": "Staff Location", "difficulty": "intermediate",
     "description": "จงเขียน SQL Statement แสดงพนักงานรัฐ 'NY' (ใช้ Equi-join sta, sto)", "table": "staffs",
     "goldenQuery": "SELECT sta.first_name FROM staffs sta, stores sto WHERE sta.store_id = sto.store_id AND sto.state = 'NY';", "starterCode": "SELECT "},
    {"id": 63, "type": "ASSIGNMENT", "moduleId": "05", "title": "Order Staff Stores", "difficulty": "advanced",
     "description": "เขียน SQL Statement แสดงออเดอร์ ชื่อร้าน และพนักงานที่ทำออเดอร์ (Equi-join)", "table": "orders",
     "goldenQuery": "SELECT o.order_id, sto.store_name, CONCAT(sta.first_name, ' ', sta.last_name) AS 'Staff Fullname' FROM orders o, stores sto, staffs sta WHERE o.store_id=sto.store_id AND o.staff_id=sta.staff_id ORDER BY order_id;", "starterCode": "SELECT "},
    {"id": 64, "type": "ASSIGNMENT", "moduleId": "05", "title": "Join ON Simple", "difficulty": "intermediate",
     "description": "จงเขียน SQL Statement แสดงสินค้าและปีที่สั่งซื้อ (JOIN ON)", "table": "products",
     "goldenQuery": "SELECT p.product_name, p.model_year, o.quantity FROM products p JOIN order_items o ON p.product_id = o.product_id;", "starterCode": "SELECT "},
    {"id": 65, "type": "ASSIGNMENT", "moduleId": "05", "title": "Join ON Store 2", "difficulty": "intermediate",
     "description": "จงเขียน SQL Statement แสดงออเดอร์ร้านรหัส 2", "table": "orders",
     "goldenQuery": "SELECT o.Order_ID, o.Order_date, s.First_name, s.Last_name FROM Orders AS o JOIN Staffs AS s ON o.Staff_ID = s.Staff_ID WHERE o.Store_ID = 2;", "starterCode": "SELECT "},
    {"id": 66, "type": "ASSIGNMENT", "moduleId": "05", "title": "Line Total Calculation", "difficulty": "advanced",
     "description": "จงเขียน SQL Statement คำนวณ 'line_total' จากการ JOIN หลายตาราง", "table": "order_items",
     "goldenQuery": "SELECT oi.order_id, oi.item_id, p.product_name, b.brand_name, oi.quantity, oi.list_price AS unit_price, (oi.quantity * oi.list_price) * (1 - oi.discount) AS line_total FROM order_items oi JOIN products p ON oi.product_id = p.product_id JOIN brands b ON p.brand_id = b.brand_id;", "starterCode": "SELECT "},
    {"id": 67, "type": "ASSIGNMENT", "moduleId": "05", "title": "Join Using Formatted", "difficulty": "intermediate",
     "description": "จงเขียน SQL Statement รวม 'Product (Category)' ใช้ JOIN USING", "table": "products",
     "goldenQuery": "SELECT CONCAT(p.product_name, ' (', c.Category_name, ')') AS 'Product info', p.model_year, p.list_price FROM Products p JOIN Categories c USING (category_id);", "starterCode": "SELECT "},
    {"id": 68, "type": "ASSIGNMENT", "moduleId": "05", "title": "Join Using Date", "difficulty": "intermediate",
     "description": "จงเขียน SQL Statement แสดงออเดอร์ที่จัดส่ง 20180318 (JOIN USING)", "table": "orders",
     "goldenQuery": "SELECT o.customer_id, i.product_id, i.quantity, i.list_price FROM orders o JOIN order_items i USING (order_id) WHERE shipped_date = '20180318';", "starterCode": "SELECT "},
    {"id": 69, "type": "ASSIGNMENT", "moduleId": "05", "title": "Self Join Manager", "difficulty": "advanced",
     "description": "จงเขียน SQL Statement แสดง Staff Fullname คู่กับ Manager Fullname", "table": "staffs",
     "goldenQuery": "SELECT sto.store_name, CONCAT(sta.first_name, ' ', sta.last_name) AS 'Staff Fullname', CONCAT(m.first_name, ' ', m.last_name) AS 'Manager Fullname' FROM staffs sta JOIN stores sto ON (sta.store_id = sto.store_id) JOIN staffs m ON (sta.manager_id=m.staff_id);", "starterCode": "SELECT "},
    {"id": 70, "type": "ASSIGNMENT", "moduleId": "05", "title": "Buffalo Customers", "difficulty": "advanced",
     "description": "จงเขียน SQL Statement แสดงออเดอร์เฉพาะลูกค้าเมือง 'Buffalo'", "table": "customers",
     "goldenQuery": "SELECT o.Order_ID, c.First_name AS Customer_first_name, c.Last_name AS Customer_last_name, s.First_name AS Staff_first_name, s.Last_name AS Staff_last_name FROM Customers AS c JOIN Orders AS o ON c.Customer_ID = o.Customer_ID JOIN Staffs AS s ON o.Staff_ID = s.Staff_ID WHERE c.City = 'Buffalo';", "starterCode": "SELECT "},
    {"id": 71, "type": "ASSIGNMENT", "moduleId": "05", "title": "NATURAL JOIN Basic 2", "difficulty": "intermediate",
     "description": "จงเขียน SQL Statement เชื่อม Product กับ Order_items ด้วย NATURAL JOIN", "table": "products",
     "goldenQuery": "SELECT product_name, quantity, list_price, discount FROM products NATURAL JOIN order_items;", "starterCode": "SELECT "},
    {"id": 72, "type": "ASSIGNMENT", "moduleId": "05", "title": "NATURAL JOIN CA", "difficulty": "advanced",
     "description": "จงเขียน SQL Statement ลูกค้ารัฐ CA สั่งตั้งแต่ 2017 (NATURAL JOIN)", "table": "orders",
     "goldenQuery": "SELECT order_id, order_date, first_name, last_name FROM orders NATURAL JOIN customers WHERE order_date >= '2017-01-01' AND state = 'CA';", "starterCode": "SELECT "},

    # ── EXAM ──
    {"id": 99, "type": "EXAM", "moduleId": "01", "title": "FINAL TEST MODULE 01", "difficulty": "advanced",
     "description": "เลือกข้อมูลทั้งหมดในตาราง", "table": "users",
     "goldenQuery": "SELECT * FROM users;", "starterCode": "SELECT "},
    {"id": 100, "type": "EXAM", "moduleId": "02", "title": "EXAM: SELECT DATA", "difficulty": "beginner",
     "description": "แสดงชื่อนามสกุลพนักงาน โดยตั้งชื่อคอลัมน์ว่า 'Staff Name'", "table": "staffs",
     "goldenQuery": "SELECT CONCAT(first_name, ' ', last_name) AS 'Staff Name' FROM staffs;", "starterCode": "SELECT "},
    {"id": 101, "type": "EXAM", "moduleId": "02", "title": "EXAM: DISTINCT VALUES", "difficulty": "intermediate",
     "description": "แสดงรายชื่อรัฐที่มีร้านค้าตั้งอยู่โดยไม่ซ้ำกัน", "table": "stores",
     "goldenQuery": "SELECT DISTINCT state FROM stores;", "starterCode": "SELECT "},
    {"id": 102, "type": "EXAM", "moduleId": "03", "title": "EXAM: FILTERING", "difficulty": "intermediate",
     "description": "แสดงสินค้าที่มีราคาอยู่ระหว่าง 1000 ถึง 2000 เรียงจากแพงไปถูก", "table": "products",
     "goldenQuery": "SELECT product_name, list_price FROM products WHERE list_price BETWEEN 1000 AND 2000 ORDER BY list_price DESC;", "starterCode": "SELECT "},
    {"id": 103, "type": "EXAM", "moduleId": "03", "title": "EXAM: LIKE OPERATOR", "difficulty": "intermediate",
     "description": "แสดงลูกค้าที่อีเมลลงท้ายด้วย @gmail.com", "table": "customers",
     "goldenQuery": "SELECT first_name, email FROM customers WHERE email LIKE '%@gmail.com';", "starterCode": "SELECT "},
    {"id": 104, "type": "EXAM", "moduleId": "05", "title": "EXAM: INNER JOIN", "difficulty": "advanced",
     "description": "แสดงชื่อร้านค้าและจำนวนออเดอร์ทั้งหมดที่ร้านนั้นรับผิดชอบ", "table": "orders",
     "goldenQuery": "SELECT s.store_name, COUNT(o.order_id) FROM stores s JOIN orders o ON s.store_id = o.store_id GROUP BY s.store_name;", "starterCode": "SELECT "},
    {"id": 105, "type": "EXAM", "moduleId": "05", "title": "EXAM: MULTI JOIN", "difficulty": "advanced",
     "description": "แสดงชื่อลูกค้าที่ซื้อสินค้าจากแบรนด์ 'Trek'", "table": "orders",
     "goldenQuery": "SELECT DISTINCT c.first_name, c.last_name FROM customers c JOIN orders o ON c.customer_id = o.customer_id JOIN order_items oi ON o.order_id = oi.order_id JOIN products p ON oi.product_id = p.product_id JOIN brands b ON p.brand_id = b.brand_id WHERE b.brand_name = 'Trek';", "starterCode": "SELECT "},
]


# ═══════════════════════════════════════════════════════════════════════
# MODULES definition
# ═══════════════════════════════════════════════════════════════════════

MODULE_DEFS = {
    "01": {"title": "Database Fundamentals", "description": "ทำความเข้าใจ Database เบื้องต้น", "order": 0},
    "02": {"title": "SELECT Statements", "description": "เรียนรู้คำสั่ง SELECT, DISTINCT, ORDER BY, ALIAS, CONCAT", "order": 1},
    "03": {"title": "Conditions (WHERE)", "description": "เงื่อนไข WHERE, AND, OR, IN, BETWEEN, LIKE, IS NULL", "order": 2},
    "05": {"title": "JOIN Operations", "description": "Equi-join, JOIN ON, JOIN USING, NATURAL JOIN, Self-join", "order": 3},
}

LESSON_TYPES = {
    "COURSE": "PRACTICE",
    "ASSIGNMENT": "PRACTICE",
    "EXAM": "EXAM",
}


def _read_bikestore_sql() -> str:
    """Read the bikestore SQL file."""
    data_dir = Path(__file__).parent.parent / "data"
    sql_path = data_dir / "bikestore_mysql.sql"
    if sql_path.exists():
        return sql_path.read_text(encoding="utf-8")
    raise FileNotFoundError(f"bikestore_mysql.sql not found at {sql_path}")


def _extract_schema_from_sql(full_sql: str) -> str:
    """Extract CREATE TABLE statements from the full SQL dump."""
    lines = []
    in_create = False
    for line in full_sql.split("\n"):
        if line.strip().upper().startswith("CREATE TABLE"):
            in_create = True
        if in_create:
            lines.append(line)
            if ";" in line:
                in_create = False
    return "\n".join(lines)


def _extract_inserts_from_sql(full_sql: str) -> str:
    """Extract INSERT INTO statements from the full SQL dump."""
    lines = []
    for line in full_sql.split("\n"):
        if line.strip().upper().startswith("INSERT INTO"):
            lines.append(line)
    return "\n".join(lines)


async def seed():
    """Run the seed process."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    print("📦  Loading bikestore SQL...")
    bikestore_sql = _read_bikestore_sql()
    schema_sql = _extract_schema_from_sql(bikestore_sql)
    inserts_sql = _extract_inserts_from_sql(bikestore_sql)

    # Add a users table for the exam problem (id=99)
    schema_sql += "\nCREATE TABLE IF NOT EXISTS `users` (`id` INT PRIMARY KEY, `name` VARCHAR(255));\n"
    inserts_sql += "\nINSERT INTO `users` (`id`, `name`) VALUES (1, 'Alice'), (2, 'Bob');\n"

    async with AsyncSessionLocal() as db:
        # ── 1. Create default course ──
        result = await db.execute(select(Course).where(Course.code == "06070999"))
        course = result.scalar_one_or_none()
        if not course:
            course = Course(
                code="06070999",
                name="SQL Fundamentals",
                description="เรียนรู้ SQL ตั้งแต่พื้นฐาน SELECT จนถึง JOIN — Interactive Tutoring System",
                access_code="ITSSQL2025",
            )
            db.add(course)
            await db.flush()
            print(f"✅  Course created: {course.code} {course.name}")
        else:
            print(f"ℹ️  Course already exists: {course.code}")

        # ── 2. Create modules ──
        module_map = {}  # moduleId -> Module ORM
        for mod_id, mod_def in MODULE_DEFS.items():
            result = await db.execute(
                select(Module).where(
                    Module.course_id == course.id,
                    Module.title == mod_def["title"],
                )
            )
            module = result.scalar_one_or_none()
            if not module:
                module = Module(
                    course_id=course.id,
                    title=mod_def["title"],
                    description=mod_def["description"],
                    order_index=mod_def["order"],
                )
                db.add(module)
                await db.flush()
                print(f"  ✅  Module {mod_id}: {mod_def['title']}")
            module_map[mod_id] = module

        # ── 3. Create lessons (one per type per module) ──
        lesson_map = {}  # (moduleId, type) -> Lesson ORM
        for mod_id in MODULE_DEFS:
            for p_type, lesson_type in LESSON_TYPES.items():
                key = (mod_id, p_type)
                title = f"{p_type.title()} — Module {mod_id}"
                result = await db.execute(
                    select(Lesson).where(
                        Lesson.module_id == module_map[mod_id].id,
                        Lesson.title == title,
                    )
                )
                lesson = result.scalar_one_or_none()
                if not lesson:
                    lesson = Lesson(
                        module_id=module_map[mod_id].id,
                        title=title,
                        lesson_type=lesson_type,
                        order_index={"COURSE": 0, "ASSIGNMENT": 1, "EXAM": 2}[p_type],
                    )
                    db.add(lesson)
                    await db.flush()
                lesson_map[key] = lesson

        # ── 4. Create problems ──
        problem_count = 0
        for p in RAW_PROBLEMS:
            mod_id = p["moduleId"]
            p_type = p["type"]
            key = (mod_id, p_type)

            if key not in lesson_map:
                print(f"  ⚠️  Skipping problem {p['id']}: no lesson for {key}")
                continue

            lesson = lesson_map[key]

            # Check if problem already exists (by title + lesson_id)
            result = await db.execute(
                select(Problem).where(
                    Problem.lesson_id == lesson.id,
                    Problem.title == p["title"],
                )
            )
            if result.scalar_one_or_none():
                continue  # Skip duplicates

            # Map difficulty
            diff_map = {"beginner": Difficulty.BEGINNER, "intermediate": Difficulty.INTERMEDIATE, "advanced": Difficulty.ADVANCED}
            difficulty = diff_map.get(p.get("difficulty", "beginner"), Difficulty.BEGINNER)

            problem = Problem(
                lesson_id=lesson.id,
                title=p["title"],
                description=p.get("description", ""),
                difficulty=difficulty,
                schema_sql=schema_sql,
                solution_query=p["goldenQuery"],
                starter_code=p.get("starterCode", "SELECT "),
                table_name=p.get("table"),
                requirements=p.get("requirements"),
                order_index=p.get("id", 0),
            )
            db.add(problem)
            await db.flush()

            # Add the bikestore dataset
            dataset = Dataset(
                problem_id=problem.id,
                name="bikestore_default",
                insert_sql=inserts_sql,
                order_index=0,
            )
            db.add(dataset)
            problem_count += 1

        await db.commit()
        print(f"\n🎉  Seed complete! {problem_count} problems created.")
        print(f"    Course: {course.code} '{course.name}'")
        print(f"    Access code: {course.access_code}")
        print(f"    Modules: {len(module_map)}")
        print(f"    Lessons: {len(lesson_map)}")


if __name__ == "__main__":
    asyncio.run(seed())
