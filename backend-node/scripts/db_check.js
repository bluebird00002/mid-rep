#!/usr/bin/env node
import pool from "../config/database.js";

async function check() {
  console.log("DB Check - starting");
  console.log("Env:", {
    DB_HOST: process.env.DB_HOST || "(not set)",
    DB_USER: process.env.DB_USER || "(not set)",
    DB_NAME: process.env.DB_NAME || "(not set)",
  });

  try {
    // quick ping
    const [rows] = await pool.execute("SELECT 1 as ok");
    console.log("DB Check - success:", rows);
    process.exit(0);
  } catch (err) {
    console.error("DB Check - error:");
    console.error(err && err.message ? err.message : err);
    // Print more helpful details if available
    if (err && err.code) console.error("code:", err.code);
    if (err && err.errno) console.error("errno:", err.errno);
    if (err && err.sqlMessage) console.error("sqlMessage:", err.sqlMessage);
    process.exit(2);
  }
}

check();
