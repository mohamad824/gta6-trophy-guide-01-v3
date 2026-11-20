// Neon Palm v3 — GTA VI trophy guide & tracker (gta6-trophy-guide-01).
// Copies app/ and screenshots/ next to this file into the output directory
// (MAKEFUN_OUTPUT_DIR outside the grader, /output inside it), then writes
// /output/dossier.json with buildDossier from ./vendor/makefun-frontend.ts.
// Node 22, standard library only. Deterministic: same inputs, same bytes.
import { buildDossier } from "./vendor/makefun-frontend.ts";
import { cp, mkdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";

const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
};

async function copyTree(from, to) {
  await cp(from, to, { recursive: true });
}

async function main() {
  const indexStat = await stat(join(repoRoot, "app", "index.html"));
  if (!indexStat.isFile()) throw new Error("app/index.html is missing");
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  await copyTree(join(repoRoot, "app"), join(outDir, "app"));
  await copyTree(join(repoRoot, "screenshots"), join(outDir, "screenshots"));
  const dossier = await buildDossier(outDir, caps);
  await writeFile(join(outDir, "dossier.json"), dossier);
}

await main();
