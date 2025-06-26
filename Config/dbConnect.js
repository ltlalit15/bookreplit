import { JSONCookie } from 'cookie-parser';
import { query } from 'express';
import mysql from 'mysql2/promise';
export const pool = mysql.createPool({
  host: "localhost",      // Updated Host
  port: 3306,                         // Updated Port
  user: "root",                       // Username
  password: "", // Updated Password
  database: "samrtlife",           // Database Name
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
});
// Check connection
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log("✅ Successfully connected to Railway MySQL database");
    connection.release();
  } catch (error) {
    console.error("❌ Database connection error:", error);
  }
})();


// import { JSONCookie } from 'cookie-parser';
// import { query } from 'express';
// import mysql from 'mysql2/promise';
// export const pool = mysql.createPool({
//   host: "yamanote.proxy.rlwy.net",            // ✅ Match CLI host
//   port: 50196,                                // ✅ Match CLI port
//   user: "root",                               // ✅ Match CLI user
//   password: "oklYqSnqHxZUBZiMKOsVJkRSFLKDqLXB", // ✅ Match CLI password
//   database: "railway",                        // ✅ Match CLI DB name
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0,
//   connectTimeout: 10000
// });

// // Check connection
// (async () => {
//   try {
//     const connection = await pool.getConnection();
//     console.log("✅ Successfully connected to Railway MySQL database");
//     connection.release();
//   } catch (error) {
//     console.error("❌ Database connection error:", error);
//   }
// })();