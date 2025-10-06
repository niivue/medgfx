# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

medgfx is a medical imaging graphics library for use in the browser, built with WebGL 2.0 and TypeScript. The project uses Bun as its runtime and build tool instead of Node.js, npm, or other traditional JavaScript tooling.

## Development Commands

- **Install dependencies**: `bun install`
- **Dev server**: `bun run dev` (starts hot-reloading dev server at http://localhost:3001)
- **Run tests**: `bun test`
- **Run single test file**: `bun test <path/to/test.ts>`
- **Build**: `bun build medgfx.ts --outdir=dist`
- **Start**: `bun run medgfx.ts`

## Bun Conventions

This project exclusively uses Bun. Never use Node.js, npm, pnpm, or Vite:

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun install` instead of `npm install`
- Use `bun run <script>` instead of `npm run <script>`
- Bun automatically loads .env files (no dotenv needed)

### Bun-specific APIs to prefer:
- `Bun.serve()` for servers (supports WebSockets, HTTPS, routes)
- `bun:sqlite` for SQLite
- `Bun.file` over `node:fs` for file operations
- Built-in `WebSocket` (no ws package needed)

## Project Structure

- **Entry point**: `src/medgfx.ts` (exports main `MedGFX` class)
- **Types**: All TypeScript type definitions are organized in `src/types/`
  - Import types from `src/types` (e.g., `import type { MedGFXProps } from "./types/medgfx"`)
  - Central export point: `src/types/index.ts`
- **Tests**: Co-located with source files using `.test.ts` suffix
- **Build output**: `dist/`

## TypeScript Configuration

The project uses strict TypeScript settings:
- Module resolution: bundler
- Target: ESNext
- Strict mode enabled
- No emit (Bun handles transpilation)
- Lib: ESNext + DOM (for browser APIs)

## Testing

**IMPORTANT**: Always write unit tests for new code unless explicitly instructed not to by the user.

- Test framework: Bun's built-in test runner
- Test files: Co-located with source files using `.test.ts` suffix (e.g., `math.ts` → `math.test.ts`)
- Run all tests: `bun test`
- Run specific test: `bun test <path/to/file.test.ts>`
- Test structure: Use `describe`, `test`/`it`, and `expect` from `bun:test`
- Write tests that cover:
  - Happy path scenarios
  - Edge cases and boundary conditions
  - Error handling and validation
  - Critical medical imaging accuracy (when applicable)

## Logging

This project uses **Pino** for all logging throughout the codebase:

- Import the singleton logger: `import { logger } from "./logger"`
- The base logger is configured in `src/logger.ts` with a browser transport
- Log levels: `debug`, `info`, `warn`, `error`
- Logs automatically stream to the dev UI's right panel in real-time

## Development Environment

The dev server (`bun run dev`) provides:
- **Left panel**: WebGL 2.0 canvas for rendering (800x600)
- **Right panel**: Real-time streaming log viewer with color-coded log levels
- Hot module reloading for instant feedback

