# Editor and preview width alignment

## Goal

ทำให้ความกว้างของเนื้อหาขณะพิมพ์ใน Admin และ Preview ตรงกับคอลัมน์เนื้อหาบนหน้า Public ที่ `42rem`.

## Design

- คงความกว้าง `max-w-6xl` ของหน้า Admin, ฟอร์ม metadata, toolbar และปุ่มบันทึก เพื่อไม่ให้ workflow ผู้ดูแลแคบลง
- จำกัดเฉพาะพื้นผิวพิมพ์ของ Tiptap (`.docs-editor-content`) ไว้ที่ `max-width: 42rem` และไม่เกินพื้นที่หน้าจอ
- จำกัดพื้นที่ `DocumentContent` ภายใน `EditorPreview` ด้วย wrapper `max-w-[42rem]` และจัดชิดซ้ายเหมือนคอลัมน์เนื้อหาบน Public
- ไม่เพิ่ม sidebar หรือ TOC เข้า Preview เพราะเป้าหมายคือให้ line length, รูป และวิดีโอตรงกับ output จริง
- บนหน้าจอแคบ พื้นที่ทั้ง Editor/Preview ยังขยายเต็มความกว้างที่มีอยู่และไม่เกิด horizontal overflow

## Verification

- เพิ่ม component tests ยืนยัน class ที่จำกัดความกว้างใน Editor และ Preview
- รัน editor/public tests, typecheck, lint และ build
