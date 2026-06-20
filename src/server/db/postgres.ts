import pg from "pg";
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/quizrush";

let pool: pg.Pool | null = null;
let isConnected = false;
let lastConnectAttempt = 0;
const CONNECT_COOLDOWN_MS = 10000; // 10 seconds cooldown between Postgres connection retries

if (typeof window === "undefined") {
  pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 3000,
  });
}

export async function initDb(): Promise<boolean> {
  if (!pool) return false;
  if (isConnected) return true;

  const now = Date.now();
  if (now - lastConnectAttempt < CONNECT_COOLDOWN_MS) {
    return false;
  }
  lastConnectAttempt = now;

  try {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(50) PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          username VARCHAR(100) NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS sessions (
          session_token VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS quiz_history (
          id VARCHAR(50) PRIMARY KEY,
          user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          room_code VARCHAR(20) NOT NULL,
          score INTEGER NOT NULL,
          streak INTEGER NOT NULL,
          correct_answers INTEGER NOT NULL,
          total_questions INTEGER NOT NULL,
          played_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS room_history (
          room_code VARCHAR(20) PRIMARY KEY,
          host_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          leaderboard JSONB NOT NULL,
          questions JSONB NOT NULL,
          played_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      isConnected = true;
      console.log("[Postgres] Database schema and tables verified.");
      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    console.warn("[Postgres] Could not connect to database or execute schemas. Falling back to local/Valkey cache mode:", (error as Error).message);
    return false;
  }
}

export interface DbUser {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
}

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  const active = await initDb();
  if (!active || !pool) return null;

  try {
    const result = await pool.query("SELECT * FROM users WHERE LOWER(email) = LOWER($1)", [email]);
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      username: row.username,
      passwordHash: row.password_hash,
    };
  } catch (error) {
    console.error("[Postgres] findUserByEmail error:", error);
    return null;
  }
}

export async function createUser(id: string, email: string, username: string, passwordHash: string): Promise<DbUser | null> {
  const active = await initDb();
  if (!active || !pool) return null;

  try {
    await pool.query(
      "INSERT INTO users (id, email, username, password_hash) VALUES ($1, $2, $3, $4)",
      [id, email.toLowerCase(), username, passwordHash]
    );
    return { id, email, username, passwordHash };
  } catch (error) {
    console.error("[Postgres] createUser error:", error);
    return null;
  }
}

export async function createSession(token: string, userId: string, expiresAt: Date): Promise<boolean> {
  const active = await initDb();
  if (!active || !pool) return false;

  try {
    await pool.query(
      "INSERT INTO sessions (session_token, user_id, expires_at) VALUES ($1, $2, $3) ON CONFLICT (session_token) DO UPDATE SET expires_at = $3",
      [token, userId, expiresAt]
    );
    return true;
  } catch (error) {
    console.error("[Postgres] createSession error:", error);
    return false;
  }
}

export async function getSessionUserId(token: string): Promise<string | null | undefined> {
  const active = await initDb();
  if (!active || !pool) return undefined;

  try {
    const result = await pool.query(
      "SELECT user_id FROM sessions WHERE session_token = $1 AND expires_at > NOW()",
      [token]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0].user_id;
  } catch (error) {
    console.error("[Postgres] getSessionUserId error:", error);
    return undefined;
  }
}

export async function deleteSession(token: string): Promise<boolean> {
  const active = await initDb();
  if (!active || !pool) return false;

  try {
    await pool.query("DELETE FROM sessions WHERE session_token = $1", [token]);
    return true;
  } catch (error) {
    console.error("[Postgres] deleteSession error:", error);
    return false;
  }
}

export interface DbQuizHistory {
  id: string;
  userId: string;
  roomCode: string;
  score: number;
  streak: number;
  correctAnswers: number;
  totalQuestions: number;
  playedAt: string;
}

export async function saveQuizHistory(
  userId: string,
  roomCode: string,
  score: number,
  streak: number,
  correctAnswers: number,
  totalQuestions: number
): Promise<boolean> {
  const active = await initDb();
  if (!active || !pool) return false;

  const historyId = `hist_${Math.random().toString(36).substr(2, 9)}`;
  try {
    await pool.query(
      "INSERT INTO quiz_history (id, user_id, room_code, score, streak, correct_answers, total_questions) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [historyId, userId, roomCode, score, streak, correctAnswers, totalQuestions]
    );
    return true;
  } catch (error) {
    console.error("[Postgres] saveQuizHistory error:", error);
    return false;
  }
}

export async function saveRoomHistory(
  hostId: string,
  roomCode: string,
  leaderboard: any[],
  questions: any[]
): Promise<boolean> {
  const active = await initDb();
  if (!active || !pool) return false;

  try {
    await pool.query(
      `INSERT INTO room_history (room_code, host_id, leaderboard, questions)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (room_code) DO NOTHING`,
      [roomCode, hostId, JSON.stringify(leaderboard), JSON.stringify(questions)]
    );
    return true;
  } catch (error) {
    console.error("[Postgres] saveRoomHistory error:", error);
    return false;
  }
}

export async function getUserHistory(userId: string): Promise<{ played: any[]; hosted: any[] }> {
  const active = await initDb();
  if (!active || !pool) return { played: [], hosted: [] };

  try {
    const playedResult = await pool.query(
      `SELECT id, room_code as "roomCode", score, streak, correct_answers as "correctAnswers", total_questions as "totalQuestions", played_at as "playedAt"
       FROM quiz_history
       WHERE user_id = $1
       ORDER BY played_at DESC
       LIMIT 50`,
      [userId]
    );

    const hostedResult = await pool.query(
      `SELECT room_code as "roomCode", leaderboard, questions, played_at as "playedAt"
       FROM room_history
       WHERE host_id = $1
       ORDER BY played_at DESC
       LIMIT 50`,
      [userId]
    );

    return { played: playedResult.rows, hosted: hostedResult.rows };
  } catch (error) {
    console.error("[Postgres] getUserHistory error:", error);
    return { played: [], hosted: [] };
  }
}
