# تعليمات تشغيل قاعدة البيانات (Database Setup Instructions)

لقد قمت بإنشاء ملف `supabase_schema.sql` يحتوي على أوامر SQL لإنشاء الجداول اللازمة.

**الخطوات:**

1.  افتح ملف `supabase_schema.sql` وانسخ كل محتواه.
2.  اذهب إلى لوحة تحكم Supabase الخاصة بمشروعك (Project Dashboard).
3.  من القائمة الجانبية، اختر **SQL Editor**.
4.  اضغط على **New Query**.
5.  الصق الكود ثم اضغط على **Run**.

**ماذا سيحدث؟**
- سيتم إنشاء جداول `profiles`, `workouts`, `workout_exercises`.
- سيتم تفعيل الامتداد `uuid-ossp`.
- سيعمل التطبيق الآن مع تسجيل الدخول الحقيقي!
