[![make.fun bounty](https://img.shields.io/badge/make.fun-bounty-gta6--trophy--guide--01-ff5da2)](https://make.fun/bounty/gta6-trophy-guide-01)
[![55 of 55 trophies](https://img.shields.io/badge/trophies-55%2F55-37e0c8)](https://make.fun/bounty/gta6-trophy-guide-01)
[![offline first](https://img.shields.io/badge/offline-static%20app-ffc94d)](https://make.fun/bounty/gta6-trophy-guide-01)

# Neon Palm v3 — GTA VI Trophy Guide & Tracker

Entry for the [make.fun bounty “Build the best GTA 6 trophy guide”](https://make.fun/bounty/gta6-trophy-guide-01) ($250, 50 paid places, closes 18:00 WIB 21 Nov 2026).

An offline guide and tracker for all **55 PlayStation 5 trophies** of Grand Theft Auto VI: every official name, description and grade, a guide in our own words for each trophy, a 7-stage roadmap to the platinum, missable flags, and a checklist that saves in the browser with export/import.

## What is inside

- **199 cited guide steps, 0 uncited.** Every step names its source; all 55 guides cite at least one of the 18 numbered sources.
- **18 numbered sources**, each with an article-level URL, read depth and a cited-by count. GamesRadar+ and GTA Vibes are deliberately not numbered — the reasons are on the Sources page.
- **11 “Sources disagree” boxes** — both versions shown, with a safe play for each dispute.
- **Hidden-28 corrected.** The platinum and Strangers & Freaks are visible; Let’s Go Bowling and Actions Speak Louder are hidden. Total stays 28 hidden = 27 bronze + 1 gold, verified name-by-name across GTABase, OutputLag and eGamers.
- **Corrections over earlier versions:** The Shootist is 42 golds across 2 ranges (Griffin 18 / Rodgers 24), not 12 challenges; only Bad Luck, I Guess and Ten Pin still have an unknown trigger; Maximum Withdrawal is Silver; no single story-mission total and no absolute Chapter 4/5 for the final mission.
- **Tracker:** localStorage save (seeded 14/55 earned, meditation 6/18), export/import as a JSON file or pasted JSON, filters (story / missable / collectibles / activities / online), search, and a spoiler-safe mode that hides story trophy names and descriptions until earned.
- **Offline:** static files under `app/`, no build step, no network request at runtime.

## Run it

```sh
python3 -m http.server 8080 --directory app
# open http://localhost:8080 in desktop Chrome, then turn the network off
```

## Hand it in (what main.ts does)

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with `buildDossier` from `vendor/makefun-frontend.ts` (the kit's copy, unchanged).

## Layout

- `app/index.html`, `app/app.js`, `app/style.css` — the guide itself.
- `app/data/trophies.json` — the 55 trophies with official data, guides, steps and citations.
- `app/data/sources.json` — the 18 numbered sources and the two excluded lists.
- `app/data/roadmap.json` — the 7-stage roadmap. `app/data/disputes.json` — the 11 disputes.
- `app/data/seed.json` — first-run seed (14/55 earned, meditation 6/18).
- `screenshots/` — 4 renders of the app taken in desktop Chrome at 1280×800.
- `vendor/makefun-frontend.ts` — the kit's dossier library, unchanged.
- `main.ts` — the entry program. `LICENSE` — MIT.
