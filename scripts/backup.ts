/**
 * پشتیبان روزانه (FR-ADM-14، D-051) — روی سرور با cron، مثلاً هر شب ساعت ۳:
 * npm run jobs:backup
 */
import "dotenv/config";
import { runBackup } from "../src/modules/admin/backup";

runBackup().then((s) => {
  if (s.ok) console.log(`✓ پشتیبان: ${s.files.join("، ")}`);
  else {
    console.error(`✗ پشتیبان ناموفق: ${s.error}`);
    process.exitCode = 1;
  }
});
