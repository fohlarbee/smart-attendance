// Prisma's datasource `provider` can't be an env var, so we set it here before
// `prisma generate` / build.
//
// It infers the provider from DATABASE_URL:
//   postgres://… or postgresql://…  -> postgresql   (production, e.g. Vercel + Neon)
//   file:…  (or unset)              -> sqlite       (local dev)
// DATABASE_PROVIDER, if set, overrides the inference.
//
// Only the datasource line is touched — the generator's
// `provider = "prisma-client-js"` is left alone.
import { readFileSync, writeFileSync } from "node:fs";

const url = process.env.DATABASE_URL ?? "";
const target =
  process.env.DATABASE_PROVIDER === "postgresql" ||
  process.env.DATABASE_PROVIDER === "sqlite"
    ? process.env.DATABASE_PROVIDER
    : /^postgres(ql)?:\/\//.test(url)
      ? "postgresql"
      : "sqlite";

const schemaPath = "prisma/schema.prisma";
const original = readFileSync(schemaPath, "utf8");
const updated = original.replace(
  /provider\s*=\s*"(?:sqlite|postgresql)"/,
  `provider = "${target}"`,
);

if (updated !== original) writeFileSync(schemaPath, updated);
console.log(`[db-provider] datasource provider = ${target}`);
