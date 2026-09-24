import "dotenv/config";
import { existsSync } from "node:fs";
import EmbeddedPostgres from "embedded-postgres";
const url = new URL(process.env.DATABASE_URL);
if (!["localhost", "127.0.0.1"].includes(url.hostname))
  throw new Error("Local PostgreSQL only supports a loopback DATABASE_URL.");
const pg = new EmbeddedPostgres({
  databaseDir: ".local/postgres",
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  port: Number(url.port || 5433),
  persistent: true,
  authMethod: "scram-sha-256",
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
  postgresFlags: ["-h", "127.0.0.1"],
  onLog: () => {},
  onError: (message) => console.error(String(message)),
});
if (!existsSync(".local/postgres/PG_VERSION")) await pg.initialise();
await pg.start();
const client = pg.getPgClient();
await client.connect();
for (const name of [
  url.pathname.slice(1),
  new URL(process.env.TEST_DATABASE_URL).pathname.slice(1),
]) {
  if (!/^[a-z_]+$/.test(name))
    throw new Error("Use a lowercase database name with underscores only.");
  const existing = await client.query(
    "SELECT 1 FROM pg_database WHERE datname=$1",
    [name],
  );
  if (!existing.rowCount)
    await client.query(
      `CREATE DATABASE "${name}" TEMPLATE template0 ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C'`,
    );
}
await client.end();
console.log(
  `Local PostgreSQL ready on 127.0.0.1:${url.port || 5433}. Keep this terminal open. Ctrl+C stops it safely.`,
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, async () => {
    await pg.stop();
    process.exit(0);
  });
setInterval(() => {}, 60000);
