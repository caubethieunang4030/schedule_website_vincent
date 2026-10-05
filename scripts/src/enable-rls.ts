import { pool } from "@workspace/db";

async function main() {
  console.log("🔒 Enabling Row Level Security (RLS) on all public tables...");

  const query = `
    DO $$
    DECLARE
        r RECORD;
    BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
        END LOOP;
    END $$;
  `;

  await pool.query(query);

  const res = await pool.query(`
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public';
  `);

  console.log("📋 Current RLS Status for Public Tables:");
  console.table(res.rows);

  console.log("✅ Row Level Security (RLS) successfully enabled for all tables!");
  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Failed to enable RLS:", err);
  process.exit(1);
});
