import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';

async function run() {
  try {
    const sqlPath = path.join(process.cwd(), 'backend-node', 'database.sql');
    if (!fs.existsSync(sqlPath)) {
      console.error('database.sql not found at', sqlPath);
      process.exit(1);
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');

    const host = process.env.DB_HOST;
    const user = process.env.DB_USER;
    const password = process.env.DB_PASSWORD;

    if (!host || !user) {
      console.error('Please set DB_HOST and DB_USER (and DB_PASSWORD if required) as environment variables.');
      process.exit(1);
    }

    console.log('Connecting to database host', host);

    const connection = await mysql.createConnection({
      host,
      user,
      password,
      multipleStatements: true,
      // allowPublicKeyRetrieval: true, // uncomment if needed for some MySQL servers
    });

    console.log('Running migrations from', sqlPath);
    const [results] = await connection.query(sql);
    console.log('Migrations finished.');

    await connection.end();
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  run();
}
