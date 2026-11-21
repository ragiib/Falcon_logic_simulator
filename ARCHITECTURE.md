# Architecture & Design Conventions

## Purpose

An educational, browser-based digital logic circuit simulator operating strictly with binary signals (0 and 1). This is a functional logic simulator, not a transistor-level or analog simulator.

## Architectural Layers

- `src/engine`: Pure TypeScript logic simulation engine. NEVER imports React, Zustand, UI code, or features.
- `src/model`: Serializable circuit data definitions, schemas, and persistence specifications.
- `src/store`: Zustand state management.
  - `circuitStore`: Document model (source of truth for circuit graph structure).
  - `simStore`: Ephemeral runtime simulation signals and tick state.
  - `uiStore`: Canvas interaction state, selection, inspector, and active panels.
- `src/features`: Feature-specific UI components and panels (canvas, palette, inspector, truthTable, library, timing).
- `src/components`: Shared, domain-agnostic UI primitives.

## Dependency Rules & Direction

- Dependency order: `features` -> `store` -> `model` -> `engine`.
- `engine` imports nothing from other layers.
- `model` may import types from `engine`.
- Strict boundary: Simulation state (runtime signal values) must NEVER be stored inside React Flow node data or the circuit document. Signals live exclusively in `simStore`.

## Component Registry & Simulation Model

- Every logic gate or circuit element is registered as a `ComponentDefinition`. Adding a new component requires only a registry entry and a renderer, with zero changes to the simulation engine.
- Simulation model: Synchronous unit-delay. On each simulation tick, all components evaluate based on previous-tick input wire values and commit their next outputs/states simultaneously.
- Connection invariants: An output pin may fan out to multiple input pins; an input pin accepts at most one wire.

## Data Persistence & Validation

- Persisted circuit documents are versioned via `CURRENT_SCHEMA_VERSION`.
- Circuit JSON is validated against Zod schemas upon load.

## Code & Agent Guidelines

- TypeScript strict mode enabled, `noUncheckedIndexedAccess` enabled, `no any`.
- Functional React components with hooks.
- Cross-folder imports use the `@/` path alias.
- Tailwind CSS for styling. Small, single-responsibility files.
- Agent rules: Always inspect existing code before modifying; preserve existing working functionality; no unrelated refactoring; implement only requested tasks; do not pre-implement future features.

## Tooling Notes

- TypeScript 7: `baseUrl` is removed; the `@` path alias is configured exclusively via `paths: { "@/*": ["./src/*"] }`.
- Linter: `oxlint` is used for linting.
- Tailwind v4: configured via `@tailwindcss/vite` with design tokens in `@theme` inside `src/index.css`.
- UI Colors: All component colors must strictly come from theme tokens, never hardcoded values.
- Templates live in `src/model/templates.ts` as static `CircuitFragment`s.
- They are inserted through `insertTemplate` as ordinary editable gate-level circuits.
- Behavioral blocks (mux, decoder, etc.) are engine registry entries, templates are not.
