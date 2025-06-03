import { JSONCookie } from 'cookie-parser';
import { query } from 'express';
import mysql from 'mysql2/promise';

 export const pool = mysql.createPool({
   host: "ballast.proxy.rlwy.net",            // ✅ Updated host
   port: 20416,                                // ✅ Updated port
   user: "root",                               // ✅ Username
   password: "GzTjhUpRLgsgASPPaJrkkyGKqIyJQVFp", // ✅ New password
   database: "railway",                        // ✅ Database name
   waitForConnections: true,
   connectionLimit: 10,
   queueLimit: 0,
   connectTimeout: 10000, // 10 seconds timeout
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









