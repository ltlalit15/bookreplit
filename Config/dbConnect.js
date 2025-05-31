import { JSONCookie } from 'cookie-parser';
import { query } from 'express';
import mysql from 'mysql2/promise';
export const pool =  mysql.createPool({
  host: 'localhost',
  port:3306,
  user: 'root',
  database: 'samrtlife',
});
(async () => {
    try {
      const connection = await pool.getConnection();
      console.log("✅ Successfully connected Local MySQL database");
      connection.release();
    } catch (error) {
      console.error("❌ Database connection error:", error);
    }
})();

// export const pool = mysql.createPool({
//   host: "turntable.proxy.rlwy.net",            // ✅ Updated host
//   port: 24563,                                // ✅ Updated port
//   user: "root",                               // ✅ Username
//   password: "NOLyTehfdCBmfOWVmasiqTBHheJvCjNN", // ✅ New password
//   database: "railway",                        // ✅ Database name
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0,
//   connectTimeout: 10000, // 10 seconds timeout
// });

// // ✅ Check Connection
// (async () => {
//   try {
//     const connection = await pool.getConnection();
//     console.log("✅ Successfully connected to Railway MySQL database");
//     connection.release();
//   } catch (error) {
//     console.error("❌ Database connection error:", error);
//   }
// })();









