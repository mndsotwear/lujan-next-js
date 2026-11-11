-- M1.10c: رضایت‌های قدیمی «پیام‌های تبلیغاتی» اطلاعات حساب (User.marketingSms/Email از M1.6)
-- به جدول خبرنامه منتقل می‌شوند تا یک منبع واحد بماند (D-055). ستون‌های قدیمی دیگر خوانده نمی‌شوند.

INSERT INTO "Subscriber" ("id", "channel", "address", "userId", "source", "consentAt", "token")
SELECT 'mig' || md5(random()::text || u."id" || 'sms'), 'SMS', u."mobile", u."id", 'account', u."updatedAt",
       md5(random()::text || clock_timestamp()::text || u."id") || md5(random()::text)
FROM "User" u
WHERE u."marketingSms" = true AND u."deletedAt" IS NULL AND u."mobile" ~ '^09[0-9]{9}$'
ON CONFLICT ("channel", "address") DO NOTHING;

INSERT INTO "Subscriber" ("id", "channel", "address", "userId", "source", "consentAt", "token")
SELECT 'mig' || md5(random()::text || u."id" || 'email'), 'EMAIL', lower(u."email"), u."id", 'account', u."updatedAt",
       md5(random()::text || clock_timestamp()::text || u."id") || md5(random()::text)
FROM "User" u
WHERE u."marketingEmail" = true AND u."deletedAt" IS NULL AND u."email" IS NOT NULL
ON CONFLICT ("channel", "address") DO NOTHING;
