# Agentic Studio
A standalone MacOS desktop app (and an iOS app) for running autonomous AI loops with full local filesystem and shell access. Built with Electron.

# What it does (or should do)
Connects to OpenRouter and lets you run AI agents (Claude, ChatGPT, MiMo, Kimi, etc.) that can read/write files, execute shell commands, and bridge to Chrome — all from a native macOS desktop UI.
In the process of adding a manual model selection to choose the new Opus 4.8 and legacy AI's like GLM 5

# Tech stack

Electron — native desktop shell
React 18 + TypeScript — renderer UI
Vite — build tooling
Tailwind CSS — styling
Zustand — state management
MCP SDK — Model Context Protocol integration
OpenRouter — LLM API backend

# Getting started
You basically just run a few commands in terminal to set everything up

bashnpm install

# Run in dev mode (Vite + Electron)
npm run dev:electron

# Build for production
npm run build

# iOS
The .ipa file is already in the repo root (AgenticStudioMobile.ipa). To install it on your iPhone:

1. You'll need to sideload it, which requires a tool like AltStore or Sideloadly (both free).
2. Download AltStore from altstore.io and install it on your Mac + iPhone.
3. Open AltStore on your phone, tap +, and navigate to the .ipa file.
4. The app connects back to your Mac via hostname to use the desktop agent.
5. Alternatively, you can use iloader to download SideStore.

Note: Sideloaded apps expire every 7 days with a free Apple ID. You'd need a paid Apple Developer account ($99/yr) to avoid this.

# Chrome Extension

In the cloned repo folder, there's a chrome-extension/ directory.
Open Chrome and go to chrome://extensions
Toggle Developer mode on (top right)
Click Load unpacked and select the chrome-extension/ folder

# Package as macOS app
npm run package
Configuration
On first launch, the app creates a settings.json in your Electron userData directory. From the settings (or in the app itself) you can configure:

Your OpenRouter API key (stored encrypted via Electron safeStorage)
The Workspace directory (the folder the agent can read/write) (defaults to downloads(hopefully))
Model selection and reasoning effort
Whether tool calls require your approval before executing
Vision (image attachment) support

Project structure
electron/          # Main process
  main.ts          # App bootstrap, settings, IPC
  agent/           # OpenRouter loop, Chrome bridge, plugins, tunnel
  tools/           # Filesystem + shell tool handlers
  mcp/             # MCP server
src/               # Renderer (React)
  components/      # UI components (chat, sidebar, settings, etc.)
  store/           # Zustand store
chrome-extension/  # Companion browser extension for Chrome bridging
Plugins
Drop plugin folders into the plugins directory (shown in Settings). The app ships with a sample plugin to get you started.
Tests
bashnpm test


# more details about installing
bash# 1. Download the repo
git clone https://github.com/sonfolk1/agentic-machine-studio.git

# 2. Go into the folder
cd agentic-machine-studio

# 3. Install dependencies
npm install

# 4a. Run in development mode (easiest to try it out)
npm run dev:electron

# --- OR ---

# 4b. Build a packaged .app file you can keep in your Applications folder
npm run package

# Troubleshooting
If it came with an error, quit electron *first* (right click, quit), and then wait to see if anything happens
If nothing loads, do this:

sed -i '' '/"type": "module"/d' package.json

Then try again:

bashnpm run dev:electron

If you want to double-check it worked before re-running:

bashgrep '"type"' package.json


