# YouTube limited controls

## เป้าหมาย

บล็อก YouTube ในหน้าอ่าน Public และ Preview ของ Admin ให้ผู้ชมใช้งานได้เฉพาะ Play/Pause และระดับเสียง โดยปิดการ seek, Settings, Fullscreen, keyboard shortcut, ลิงก์/การคลิกภายใน YouTube และการคลิกที่พื้นที่วิดีโอโดยตรง

## ขอบเขตและข้อจำกัด

- คง Tiptap JSON และ URL `youtube-nocookie.com` ที่บันทึกอยู่เดิม
- ไม่เปลี่ยน toolbar หรือ flow การแทรก YouTube ใน Editor
- YouTube ไม่รองรับการเลือกแสดง native controls เป็นรายปุ่ม จึงต้องใช้ IFrame Player API และ custom controls ของแอป
- YouTube อาจแสดงชื่อช่องหรือ related videos ภายใน player ตามนโยบายของแพลตฟอร์ม แต่ผู้ใช้จะกดสิ่งเหล่านั้นไม่ได้

## การออกแบบ

1. แยก renderer ของ YouTube เป็น client component ที่รับ URL แบบเดิมและสร้าง iframe player ด้วย `enablejsapi=1`, `controls=0`, `disablekb=1`, `fs=0`, `playsinline=1`, `rel=0`, และ `iv_load_policy=3`.
2. ไม่กำหนด `allowFullScreen` และวางชั้น overlay ที่รับ pointer event เหนือ iframe เพื่อป้องกันการคลิกหรือการ seek ภายใน YouTube.
3. สร้าง control bar ของแอป ประกอบด้วยปุ่ม Play/Pause, ปุ่ม mute/unmute และ input range สำหรับ volume. ปุ่มเรียก IFrame Player API เพื่อควบคุม video โดยไม่มี control อื่น.
4. Control bar ต้องมี accessible name, รองรับ keyboard ตาม native button/range, และสะท้อน state ของ player (playing/paused/muted/volume) กลับสู่ UI.
5. ใช้ component เดียวกันในทุกเส้นทางที่ renderer เนื้อหาเอกสารเรียกใช้ เพื่อให้ Public และ Admin Preview มีพฤติกรรมตรงกัน.

## การจัดการข้อผิดพลาด

- หาก IFrame API โหลดหรือ player เริ่มต้นไม่สำเร็จ ให้แสดงข้อความไทยที่อธิบายได้ พร้อมลิงก์เปิดวิดีโอใน YouTube เป็น fallback.
- ก่อน player พร้อมใช้งาน ปิด custom controls ชั่วคราวเพื่อไม่ให้ส่งคำสั่งที่ทำไม่ได้.

## การทดสอบ

- ทดสอบ renderer ว่าสร้าง iframe ด้วยพารามิเตอร์จำกัดการควบคุมและไม่มี `allowFullScreen`.
- ทดสอบ presence/accessibility ของ Play/Pause, mute และ volume control รวมถึงไม่มี native controls ที่เปิดให้ seek/fullscreen.
- ทดสอบ command ที่ส่งเข้า player สำหรับ play, pause, mute และ set volume.
- รัน content/component tests ที่เกี่ยวข้อง แล้ว lint และ build.
