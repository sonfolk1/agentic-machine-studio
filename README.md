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

# Package as macOS app
npm run package
Configuration
On first launch, the app creates a settings.json in your Electron userData directory. From the settings (or in the app itself) you can configure:

For the mobile app, you just download the ipa and sideload it. You should be able to connect it to your Mac using the hostname, along with using the app just as an ai chat.

For the extension, just download the chrome-extension and load it unpacked (you need to have developer mode turned on)

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
