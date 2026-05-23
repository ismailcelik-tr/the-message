# Çağrı (The Message) Monorepo

Çağrı (Global: *The Message*) is a modern, peaceful, and inviting Islamic guide mobile application built with React Native (Expo) and supported by a robust NestJS backend. Its core mission is to accompany users through their day with quiet, beautiful notifications focusing on hope, purpose, worship, prayer, and dhikr.

---

## 🛠 Tech Stack & Architecture

This repository is structured as a TypeScript monorepo using native **npm workspaces**:

- **`apps/mobile`**: React Native mobile app using Expo SDK, with custom styled components conforming to a soft, modern design language.
- **`apps/api`**: NestJS backend framework utilizing TypeORM for PostgreSQL persistence.
- **`packages/shared`**: Shared compilation module defining standard user preference settings and entity models utilized by both frontend and backend.
- **`infra/`**: Docker & cloud infrastructure setups (`docker-compose.yml`, AWS strategy documents).

---

## 🚀 Quick Start - Local Development

Follow these steps to run the entire backend suite (API & PostgreSQL) on your local machine using Docker:

### 1. Prerequisite Checks
Ensure you have Docker Desktop installed and running on your system.

### 2. Startup Database and API
In the root directory, run:
```bash
# Start NestJS API and PostgreSQL
npm run docker:up
```
*This command compiles the TypeScript sources, coordinates networking, and exposes:*
- **Backend API**: `http://localhost:3000/api`
- **PostgreSQL**: Local port `5432` (credentials inside `docker-compose.yml`)

To stop the containers and free up resources:
```bash
npm run docker:down
```

---

## 📱 Running the Mobile App (Expo)

You do not need to run the mobile application inside Docker. You can launch it natively on your machine:

### 1. Install Workspace Dependencies
From the repository root, install all node modules:
```bash
npm install
```

### 2. Build the Shared Package
Compile the common type configurations:
```bash
npm run shared:build
```

### 3. Run Expo Metro Server
Launch the application:
```bash
npm run mobile:start
```
- Press **`i`** to open the iOS simulator.
- Press **`a`** to open the Android emulator.
- Press **`w`** to view the app in the web browser.
- Scan the QR code with the Expo Go app on your physical mobile device.

---

## 📁 Repository Structure Details

For folder descriptions and architectural boundaries, see:
- [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) - Product details, design philosophies, and feature scopes.
- [AGENTS.md](AGENTS.md) - Best practices, package rules, and instructions for AI agents modifying this codebase.
