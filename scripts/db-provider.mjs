// Prisma's datasource `provider` can't be an env var, so we set it here before
// `prisma generate` / build.
//
// Rule (prod-safe by default):
//   - explicit DATABASE_PROVIDER=sqlite|postgresql wins
//   - a `file:` DATABASE_URL  -> sqlite   (local dev, from .env)
//   - a `postgres://` URL      -> postgresql
//   - anything else / unknown  -> postgresql  (assume production; never ship sqlite by accident)
//
// It also reads .env directly (the build step isn't run through dotenv) and
// tolerates values accidentally wrapped in quotes.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

function fromEnvFile(key) {
  try {
    if (!existsSync(".env")) return undefined;
    for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+?)\s*$/);
      if (m && m[1] === key) return m[2];
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

const unquote = (v) => v.trim().replace(/^['"]|['"]$/g, "");

const override = process.env.DATABASE_PROVIDER;
const url = unquote(process.env.DATABASE_URL ?? fromEnvFile("DATABASE_URL") ?? "");

let target;
if (override === "postgresql" || override === "sqlite") target = override;
else if (/^file:/i.test(url)) target = "sqlite";
else target = "postgresql"; // postgres unless we clearly see a local sqlite file: URL

const schemaPath = "prisma/schema.prisma";
const original = readFileSync(schemaPath, "utf8");
const updated = original.replace(
  /provider\s*=\s*"(?:sqlite|postgresql)"/,
  `provider = "${target}"`,
);
if (updated !== original) writeFileSync(schemaPath, updated);
console.log(`[db-provider] datasource provider = ${target}`);
