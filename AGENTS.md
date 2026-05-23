# Instructions for AI Agents (AGENTS.md)

This repository is a strict TypeScript monorepo configured with npm workspaces. Follow these constraints when building, refactoring, or adding features.

---

## 1. Monorepo Structure Boundaries

Ensure all changes respect project separation:
* **`packages/shared`**: Contains pure TypeScript schemas, interfaces, and helper functions (no React Native or NestJS dependencies). This package must compile with `npm run shared:build`.
* **`apps/api`**: Pure NestJS backend. Can import types from `@the-message/shared`. Must not reference `apps/mobile`.
* **`apps/mobile`**: React Native (Expo) mobile app. Can import types from `@the-message/shared`. Must not reference `apps/api`.

---

## 2. Technical Code Conventions

* **Strict TypeScript**: Keep `strict: true` active in all `tsconfig.json` configurations. Avoid utilizing `any` unless absolutely necessary; use exact typings defined in `packages/shared`.
* **Modular Code**: Write clean, small components. Avoid bloated controllers or giant views. Separate concerns: Controllers coordinate endpoints, Services handle business operations, components render UI.
* **Keep Abstractions Clean**: Do not introduce complex multi-layer design patterns early. Stick to clean functions and services.

---

## 3. Database Modifications

* **Framework**: TypeORM (PostgreSQL).
* **Development Flow**: The local environment is updated via TypeORM auto-synchronization (`synchronize: true`) for rapid prototyping.
* **Production Rule**: In production, synchronization must be set to `false`. We will use TypeORM CLI migration files for SQL updates.

---

## 4. Verification Workflow

Before reporting a task as complete:
1. Ensure the shared package compiles:
   ```bash
   npm run shared:build
   ```
2. Verify TypeScript checks inside api:
   ```bash
   npm run api:build
   ```
3. Run container build checks:
   ```bash
   docker compose build
   ```
