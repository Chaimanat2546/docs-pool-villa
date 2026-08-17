# Document List Pagination Scroll Design

## Scope

เมื่อผู้ใช้กดเปลี่ยนหน้าของรายการเอกสารในหน้าโครงสร้างผู้ดูแล ระบบจะเลื่อน viewport ไปที่ด้านบนของส่วน “เอกสารในหมวด” เพื่อให้เห็นหัวรายการและผลลัพธ์หน้าใหม่ทันที

การเปลี่ยนหมวดและการเข้าแก้ไขเอกสารไม่อยู่ในขอบเขต เพราะเป็นการนำทางไป route/page ใหม่และใช้พฤติกรรม scroll เดิมของ Next.js

## Design

`DocumentList` จะเก็บ ref ของ section รายการเอกสารไว้ และใช้ handler เดียวกับปุ่ม pagination ทั้งสองปุ่ม เมื่อเปลี่ยนเลขหน้า handler จะเรียก `scrollIntoView({ behavior: "smooth", block: "start" })` บน section เดิม การเลื่อนจะเกิดเฉพาะเมื่อผู้ใช้กดเปลี่ยนหน้า ไม่เกิดตอน component mount, เปลี่ยน filter หรือเปลี่ยน route

## Validation

เพิ่ม regression test ที่ตรวจทั้งเลขหน้าที่เปลี่ยนและการเรียก scroll พร้อมรัน focused component test, TypeScript check, lint และ `git diff --check`
