# YouTube limited controls

## เป้าหมาย

บล็อก YouTube ในหน้าอ่าน Public และ Preview ของ Admin ให้ผู้ชมกด Play/Pause ได้เฉพาะพื้นที่กลางของวิดีโอ โดยซ่อน control bar, seek, Settings, Fullscreen และ keyboard shortcut

## ขอบเขตและข้อจำกัด

- คง Tiptap JSON และ URL `youtube-nocookie.com` ที่บันทึกอยู่เดิม
- ไม่เปลี่ยน toolbar หรือ flow การแทรก YouTube ใน Editor
- YouTube ไม่รองรับการเลือกแสดง native controls เป็นรายปุ่ม จึงใช้ `controls=0` และอนุญาตให้คลิกเฉพาะพื้นที่กลางของ player
- ไม่มี custom control bar หรือ IFrame Player API
- YouTube อาจแสดงชื่อช่องหรือ related videos ภายใน player ตามนโยบายของแพลตฟอร์ม แต่ click guard จะบล็อกพื้นที่ขอบของ player

## การออกแบบ

1. แยก renderer ของ YouTube เป็น client component ที่รับ URL แบบเดิม. ก่อนเล่นให้แสดง thumbnail จาก `i.ytimg.com` พร้อมปุ่ม Play ที่มี accessible name.
2. เมื่อกดปุ่ม ให้แทน thumbnail ด้วย iframe `youtube-nocookie.com` ที่มี `autoplay=1`, `controls=0`, `disablekb=1`, `fs=0`, `iv_load_policy=3`, `playsinline=1`, และ `rel=0`.
3. ไม่กำหนด `allowFullScreen`; iframe ใช้ sandbox แบบเดียวกับหน้า Guide อ้างอิง และ click guard ทับด้านบน ล่าง ซ้าย และขวา โดยเว้นพื้นที่กลางให้คลิก YouTube เพื่อ Play/Pause.
4. ใช้ component เดียวกันในทุกเส้นทางที่ renderer เนื้อหาเอกสารเรียกใช้ เพื่อให้ Public และ Admin Preview มีพฤติกรรมตรงกัน.

## การจัดการข้อผิดพลาด

- หาก iframe หรือวิดีโอเล่นไม่ได้ ให้ YouTube แสดง error ตามปกติภายในพื้นที่ player; แอปไม่ส่งคำสั่งควบคุมหรือเก็บ state ของ player.

## การทดสอบ

- ทดสอบ renderer ว่าแสดง thumbnail และปุ่ม Play ที่เข้าถึงได้ก่อนเริ่มเล่น.
- ทดสอบว่าการกด Play สร้าง iframe ด้วยพารามิเตอร์จำกัดการควบคุม ไม่มี `allowFullScreen` และมี click guard รอบพื้นที่กลาง.
- ทดสอบว่าไม่มี custom mute, volume หรือ seek control.
- รัน content/component tests ที่เกี่ยวข้อง แล้ว lint และ build.
