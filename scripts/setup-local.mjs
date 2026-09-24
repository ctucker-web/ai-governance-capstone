import { existsSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
if (existsSync(".env")) {
  console.log(".env already exists; nothing overwritten.");
  process.exit(0);
}
const password = randomBytes(24).toString("hex");
writeFileSync(
  ".env",
  `DATABASE_URL=postgresql://governance:${password}@127.0.0.1:5433/governance\nTEST_DATABASE_URL=postgresql://governance:${password}@127.0.0.1:5433/governance_test\nPOSTGRES_USER=governance\nPOSTGRES_PASSWORD=${password}\nPOSTGRES_DB=governance\nSESSION_SECRET=${randomBytes(48).toString("hex")}\nAUTH_MODE=demo\nDEMO_AUTH_ENABLED=true\nAPP_URL=http://localhost:3000\nCOOKIE_SECURE=false\n`,
);
console.log(
  "Created ignored .env with unique local secrets. Start PostgreSQL next.",
);
