# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Netin is a local-first astronaut health-monitoring app (NASA Space Apps). The UI, code identifiers and comments are in Spanish; keep that convention. Development is on Windows with PowerShell.

## Commands

The machine has an old Node (v6, from Brackets) first on PATH. Prefix commands with `$env:Path = "C:\Program Files\nodejs;" + $env:Path;` or use the full path to Node 24+.

- `npm run dev`: API (Express, port 4310, `node --watch`) plus Vite (port 5173, proxies `/api`).
- `npm test`: API end-to-end tests with `node:test`. They use a temporary data folder and run serially.
- The tests in `server/tests/api.test.ts` are one ordered scenario that shares state (profiles, the date set through `NETIN_FECHA`, a restart), so `--test-name-pattern` on one test fails. Run the whole file with `node --test server/tests/api.test.ts`, and put a new independent case in a new `describe` with its own setup.
- `npm run build`: type-checks both tsconfigs, then runs `vite build`. `npm run typecheck` does only the type checks.
- `npm run demo:datos`: (re)creates the fictitious "Astra Demo" profile. Set `NETIN_DATOS=datos-prueba` to keep it out of real data.

## Architecture

- **The server runs TypeScript directly** with Node's built-in type stripping, so there is no build step for it. Server code must stay within erasable syntax (`erasableSyntaxOnly`: no enums, no parameter properties) and must import local files with the `.ts` extension.
- **Storage** is `node:sqlite` in `datos/netin.db` (schema in `server/db.ts`, created on open) plus photo files in `datos/fotos/<perfilId>/`. Record payloads are JSON in `registros.datos`, validated per type in `server/registros.ts`.
- **Profile isolation.** Every route after the `sesion` middleware in `server/app.ts` must scope its queries by `req.perfil.id`. Sessions are httpOnly cookies holding a random token; only its SHA-256 hash is stored.
- **Corrections keep history.** `reemplazar()` copies the previous `datos` into `revisiones` before updating. Symptom follow-ups also go through it.
- **Future-AI hand-off.** `insertar`, `reemplazar` and `eliminar` call `encolar()` (`server/salida-ia.ts`), which writes to `cola_ia`. `paquete()` separates reported data (`reportado`) from measured data (`medido`). There is deliberately no AI provider and no document index yet. Summaries carry `origen: "automatico" | "ia" | "simulado"`, and the UI labels them by that field.
- **Shared catalogs.** `compartido/catalogos.ts` holds the body zones, stages, indicators and types, imported by both sides (`@compartido/*` alias in the frontend).
- **Daily flow gating** lives in `src/App.tsx`. The photo is forced on the first visit each day. The remaining steps (check-in, motor test, log) are offered until the user picks "Seguir después", which is stored in sessionStorage per profile and date. `/api/dia` reports the next pending step.
- **Theming.** The mission stage sets `data-etapa` on `<html>`, which swaps the `--acento` token (`src/index.css`). Status colors (`bien`, `aviso`, `serio`, `critico`) are reserved and always appear with an icon and a label (`componentes/Estado.tsx`).

## Content rules

The app must never invent medical content: no diagnoses, thresholds, doses, protocols or citations. Guidance without a source shows a "Sin documento de respaldo" or "Pendiente" state and points the user to the mission's medical officer. Simulated data must always be labeled as simulated.
