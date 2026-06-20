const pg = require("pg");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/quizrush" });

pool.query("SELECT * FROM users LIMIT 1")
  .then(res => { console.log("DB connected, users table exists."); process.exit(0); })
  .catch(err => { console.error("DB error:", err); process.exit(1); });
