// Neon Palm v3 — entry program for the GTA 6 trophy guide bounty.
//
// Copies app/ and screenshots/ from this repository into the output
// directory, then writes dossier.json there with buildDossier from the
// kit's vendor/makefun-frontend.ts. Outside the grader, the environment
// variable MAKEFUN_OUTPUT_DIR stands in for /output.
//
// The caps match the bounty gate exactly: 160 KiB of dossier text,
// at most 4 screenshots of at most 256 KiB each, at most 993 app files
// and 48 MiB of app bytes. The output is deterministic: the same
// repository always writes the same bytes, so the grader's two runs agree.
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-frontend.ts";

const repoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)));
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR || "/output");

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
cpSync(join(repoRoot, "app"), join(outDir, "app"), { recursive: true });
cpSync(join(repoRoot, "screenshots"), join(outDir, "screenshots"), { recursive: true });

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(outDir, "dossier.json"), dossier);
console.log("wrote " + join(outDir, "dossier.json") + " (" + dossier.length + " bytes)");
