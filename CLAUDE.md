# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Netin is a Windows desktop app built with React Native for Windows 0.85 (new architecture only) that monitors astronaut health, made for NASA Space Apps. All code lives in `app/`. UI text, identifiers and comments are in Spanish; keep that convention. The user wants an eye-catching, animated, friendly HUD look that feels like a game but is not one. Do not add points, levels, streaks, badges or rewards; they were removed at the user's request. Don't fall back to a minimal UI either.

## Commands (run inside `app/`)

The machine has an old Node (v6, from Brackets) first on PATH. Prefix commands with `$env:Path = "C:\Program Files\nodejs;" + $env:Path;` or the Bash equivalent `export PATH="/c/Program Files/nodejs:$PATH"`.

- `npm run typecheck`: `tsc` over the app. `*.web.ts` and `vista/` are excluded.
- `npm run vista`: browser preview of the UI through react-native-web and Vite, at port 5180. It is for design review only: data goes to localStorage and there is no camera.
- `npm run windows` / `npm run windows:release`: build and run the exe. These need VS 2026 with the C++, UWP and .NET desktop workloads, Windows SDK 22621 and the .NET 10 SDK; `node_modules/react-native-windows/scripts/rnw-dependencies.ps1` checks for them.
- `app/windows/` does not exist until `npx react-native init-windows --overwrite` runs. After it runs, wire in `windows-nativo/NetinNativo.h`, as described in README.md.

## Architecture

- **There is no server.** All logic runs in JS inside the app (`src/datos/`). The only native code is the `NetinNativo` module (`windows-nativo/NetinNativo.h`): file read and write under `%LOCALAPPDATA%\Netin\datos` (atomic writes, paths confined to that folder), BCrypt random bytes, a MediaCapture photo, and document listing and opening.
- **Platform split.** `src/plataforma/index.ts` calls `NativeModules.NetinNativo`. `index.web.ts` replaces it in the Vite preview, which resolves `.web.ts` first. Keep both in sync with `tipos.ts`.
- **Encrypted per-profile vault** (`src/datos/boveda.ts`). The key is derived as scrypt(password, salt) and is never stored; `perfiles.json` holds only a verifier hash. The vault JSON and the photos are AES-256-GCM encrypted (`@noble/*`, pure JS, since Hermes lacks WebCrypto; randomness comes from the native module). A `Sesion` keeps the decrypted vault in memory. Every mutation in `registros.ts` changes `sesion.contenido` and then calls `sesion.guardar()`, which serializes writes. After a mutation, screens call `useApp().refrescar()` to re-render.
- **Corrections keep history.** `reemplazar()` pushes the old `datos` to `revisiones`. Measured results (`motora`) and photos are deleted, never corrected.
- **Future-AI hand-off.** `insertar`, `reemplazar`, `eliminar` and `agregarMensaje` push events to `colaIA`. `paquete()` splits reported data from measured data. There is deliberately no AI provider and no document index yet. Demo data is marked as already processed so it never reaches the AI as real.
- **Navigation** is plain state in `src/estado/App.tsx` (`ir(pantalla, params)`), with no navigation library. Daily-flow gating is in `App.tsx`: the photo is forced on the first visit each day, and the other steps are offered until the user picks "Seguir después".
- **UI constraints.** Use only core RN components and `Animated` with `useNativeDriver: false`. Third-party native modules (SVG, Reanimated, navigation, camera) are not available on RNW's new architecture. Icons are Segoe MDL2 Assets glyphs (`hud/tema.ts`), HUD text is Bahnschrift, and charts and the body map are built from positioned Views (`hud/Grafica.tsx`, `hud/MapaCorporal.tsx`).
- **Theming.** The stage accent comes from `useAcento()` (`hud/Acento.tsx`). Status colors (`bien`, `aviso`, `serio`, `critico`) always appear with an icon and a label (`Estado`).

## Content rules

Never invent medical content: no diagnoses, thresholds, doses, protocols or citations. Guidance without a source shows a "Sin documento de respaldo" or "Pendiente" state and points the user to the mission's medical officer. Simulated data must always be labeled as simulated. Gauges must not imply clinical normality: the vitals ring shows how recent the measurement is, not whether the value is good.
