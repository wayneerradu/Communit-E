import pg from "pg";

async function main() {
  const connectionString = process.env.DATABASE_URL?.trim();

  if (!connectionString) {
    console.error("DB FAIL: DATABASE_URL is missing.");
    process.exit(1);
  }

  const pool = new pg.Pool({
    connectionString
  });

  try {
    const result = await pool.query("SELECT NOW()");
    console.log("DB OK:", result.rows[0]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("DB FAIL:", message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

await main();
