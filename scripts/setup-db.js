const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
require("dotenv").config({ quiet: true });

const requiredEnv = ["DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD"];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
  console.error(`Variables .env manquantes: ${missingEnv.join(", ")}`);
  process.exit(1);
}

function createPool(database) {
  return new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
}

function quoteIdentifier(identifier) {
  if (!/^[a-zA-Z0-9_]+$/.test(identifier)) {
    throw new Error(`Nom de base invalide: ${identifier}`);
  }

  return `"${identifier.replace(/"/g, '""')}"`;
}

async function ensureDatabaseExists() {
  const maintenanceDatabase = process.env.DB_MAINTENANCE_DB || "postgres";
  const maintenancePool = createPool(maintenanceDatabase);

  try {
    const result = await maintenancePool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [process.env.DB_NAME],
    );

    if (result.rowCount === 0) {
      await maintenancePool.query(
        `CREATE DATABASE ${quoteIdentifier(process.env.DB_NAME)}`,
      );
      console.log(`Base creee: ${process.env.DB_NAME}`);
    }
  } finally {
    await maintenancePool.end();
  }
}

const pool = createPool(process.env.DB_NAME);

async function createOrUpdateAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const username = process.env.ADMIN_USERNAME || "admin";

  if (!email || !password) {
    console.log(
      "Schema OK. Aucun admin cree: definis ADMIN_EMAIL et ADMIN_PASSWORD pour en creer un.",
    );
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `
      INSERT INTO users (username, email, password, role)
      VALUES ($1, $2, $3, 'ADMIN')
      ON CONFLICT (email)
      DO UPDATE SET
        username = EXCLUDED.username,
        password = EXCLUDED.password,
        role = 'ADMIN'
      RETURNING id, username, email, role
    `,
    [username, email, hash],
  );

  const admin = result.rows[0];
  console.log(`Admin pret: ${admin.username} <${admin.email}> (${admin.role})`);
}

async function main() {
  const initSqlPath = path.join(__dirname, "..", "database", "init.sql");
  const initSql = fs.readFileSync(initSqlPath, "utf8");

  await ensureDatabaseExists();
  await pool.query(initSql);
  await createOrUpdateAdmin();
}

main()
  .catch((error) => {
    console.error("Impossible d'initialiser la base PostgreSQL.");
    const details = [
      error.message,
      error.code ? `Code: ${error.code}` : null,
      error.address ? `Adresse: ${error.address}` : null,
      error.port ? `Port: ${error.port}` : null,
      Array.isArray(error.errors)
        ? error.errors.map((item) => item.message).join("\n")
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    console.error(details || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
