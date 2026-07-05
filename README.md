# Multi-model Dispatch Console

A local React frontend prototype for multi-model task dispatching. This project currently does not include a backend API service.

## Run

```powershell
npm install --cache .\.npm-cache
npm run dev
```

Open the Vite local URL, usually `http://127.0.0.1:5173/`.

## Build

```powershell
npm run build
```

## Electron Desktop App

Package the project as a Windows desktop application:

```powershell
npm run electron:dev    # Development mode (Electron window + Vite HMR)
npm run electron:build  # Build and generate .exe installer
```

Output files are placed in the `release/` folder.

## Verify The 3D Globe

```powershell
npm run verify:globe
```

The verification script uses `playwright-core` with the locally installed Chrome executable. It checks desktop and mobile viewports, confirms the WebGL canvas is anchored in the lower-right corner, verifies `pointer-events: none`, and samples screenshot pixels to ensure the canvas is not blank.

## Current Scope

- 260px left sidebar navigation
- Main content area capped at 1280px
- Task input, model selection, and execution button
- Local / Web source switch with dynamically filtered model options
- Markdown result rendering
- Prompt, Completion, Total Token, and Token Mode cards
- Conversation history log with per-call latency and success rate tracking
- Export call history as JSON / clear history
- API key management (DashScope, OpenAI, Anthropic, DeepSeek, Zhipu)
- File upload support (text/code files appending to prompt)
- Unified adapter interface returning `{ content, tokens }`
- Three.js holographic globe in the lower-right corner
- Glowing model nodes mapped onto the globe surface
- Low-frequency cosmic background motion
- Glassmorphism UI masks with `backdrop-filter: blur(10px)`
- Desktop and mobile responsive layout
- Electron packaging for Windows (.exe portable + NSIS installer)

To connect real APIs later, replace the mock adapters in [src/adapters/modelAdapters.js](D:/Integrated%20Tools/src/adapters/modelAdapters.js). The calling layer only depends on `adapter.run({ model, prompt })`, regardless of whether the model source is local or web.
