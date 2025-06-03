import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host: "ballast.proxy.rlwy.net",              // Railway host
  port: 20416,                                 // Railway port
  user: "root",                                // Username
  password: "GzTjhUpRLgsgASPPaJrkkyGKqIyJQVFp",  // Password
  database: "railway",                         // Database name
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,       // 10 seconds timeout
  enableKeepAlive: true,       // Keep alive option
  keepAliveInitialDelay: 0,
});

// Connection test with retries
async function testConnectionWithRetry(maxRetries = 5, delayMs = 5000) {
  let attempts = 0;
  while (attempts < maxRetries) {
    attempts++;
    try {
      const connection = await pool.getConnection();
      console.log(`✅ Successfully connected to Railway MySQL database on attempt ${attempts}`);
      connection.release();
      return;
    } catch (error) {
      console.error(`❌ Database connection error on attempt ${attempts}:`, error.message);
      if (attempts < maxRetries) {
        console.log(`Retrying in ${delayMs / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        console.error('❌ Max retries reached. Could not connect to database.');
        process.exit(1); // Exit if cannot connect after retries
      }
    }
  }
}

// Run connection test immediately
testConnectionWithRetry();

export default pool;
