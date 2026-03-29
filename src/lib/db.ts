/**
 * MySQL connection pool — singleton pattern to reuse across
 * Next.js API route invocations and hot-reloads in development.
 */
import mysql from "mysql2/promise";

declare global {
  // eslint-disable-next-line no-var
  var _mysqlPool: mysql.Pool | undefined;
}

function createPool(): mysql.Pool {
  return mysql.createPool({
    host:     process.env.DB_HOST     || "localhost",
    port:     Number(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER     || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME     || "primetrade_db",
    waitForConnections: true,
    connectionLimit: 10,       // max 10 concurrent DB connections
    queueLimit: 0,
    timezone: "Z",
  });
}

// In production each process gets one pool; dev reuses across hot-reloads
const pool: mysql.Pool =
  process.env.NODE_ENV === "production"
    ? createPool()
    : (global._mysqlPool ??= createPool());

export default pool;

/**
 * Convenience wrapper — executes a parameterised SQL query.
 * Always use parameterised queries (?) to prevent SQL injection.
 */
export async function query<T = unknown>(
  sql: string,
  params?: unknown[]
): Promise<T> {
  const [rows] = await pool.execute(sql, params);
  return rows as T;
}
