import { JSONCookie } from 'cookie-parser';
import { query } from 'express';
import mysql from 'mysql2/promise';

 export const pool = mysql.createPool({
  host: "switchback.proxy.rlwy.net",               // ✅ Host
  port: 19087,                                      // ✅ Port
  user: "root",                                     // ✅ Username
  password: "IAAizaGhOnOVFZrmXdxwVyYSAxLnMEZB",     // ✅ Password
  database: "railway",                              // ✅ Database name
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
});


// ✅ Check Connection
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log("✅ Successfully connected to Railway MySQL database");
    connection.release();
  } catch (error) {
    console.error("❌ Database connection error:", error);
  }
})();
