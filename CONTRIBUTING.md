# Contributing Guide

Thank you for contributing to `trust-medical/laravel-feedback-reporter`!

This project follows the [Code of Conduct](CODE_OF_CONDUCT.md). Please report security vulnerabilities as described in [SECURITY.md](SECURITY.md), not in public issues.

## Before You Start

For anything beyond a small fix, open an issue first so the approach can be agreed on before you write code. Do not include personal or confidential data in issues, screenshots, or logs.

## 1. Prerequisites (Docker First)

This repository requires only **Docker** and **Docker Compose** on your local machine. You do not need PHP, Composer, or Node.js installed on your host system.

## 2. Setup Development Environment

Clone the repository and build the container:

```bash
git clone https://github.com/trust-medical/laravel-feedback-reporter.git
cd laravel-feedback-reporter

# Build container
make build
# or: docker compose build

# Install dependencies
make install
# or:
# docker compose run --rm app composer install
# docker compose run --rm app npm ci
```

## 3. Running Tests

### PHP Tests (Pest + Testbench)
```bash
make test-php
# or: docker compose run --rm app vendor/bin/pest
```

### Frontend Tests (Vitest)
```bash
make test-js
# or: docker compose run --rm app npm test
```

### Run All Tests
```bash
make test
```

## 4. Static Analysis & Code Formatting

Before submitting a PR, ensure static analysis and formatting checks pass with zero warnings:

```bash
# Run PHPStan (Larastan Level 8) and TypeScript typecheck
make analyse
# or:
# docker compose run --rm app vendor/bin/phpstan analyse
# docker compose run --rm app npm run typecheck

# Check code styles (Laravel Pint & Biome)
make lint
# or:
# docker compose run --rm app vendor/bin/pint --test
# docker compose run --rm app npm run lint

# Auto-format code
make format
# or:
# docker compose run --rm app vendor/bin/pint
# docker compose run --rm app npm run format
```

## 5. Building the Frontend SDK

```bash
make build-js
# or: docker compose run --rm app npm run build
```

The compiled bundles and TypeScript declarations will be placed in `dist/`.

## 6. Workbench (Manual Browser Testing)

Build the frontend bundle, then start the Workbench server:

```bash
make build-js
make serve
# or: docker compose run --rm --service-ports app vendor/bin/testbench serve --host=0.0.0.0 --port=8000
```

Then visit `http://localhost:8000` to test the packaged Web Component, manual image uploads and removal, annotations, hand-tool panning, zoom, and successful submission close behavior. Set `WORKBENCH_PORT` to publish a different host port.

The Workbench enables the reporter for guests in every environment and serves `dist/widget.js` and Konva through development-only routes, so the page loads the same entry distributed to applications. Never use these settings in an application.

## 7. Pull Request Checklist

1. [ ] PHP tests pass (`vendor/bin/pest`).
2. [ ] Frontend tests pass (`npm test`).
3. [ ] PHPStan passes without errors (`vendor/bin/phpstan analyse`).
4. [ ] TypeScript passes without errors (`npm run typecheck`).
5. [ ] Pint style checks pass (`vendor/bin/pint --test`).
6. [ ] Biome passes (`npm run lint`).
7. [ ] The headless, Alpine, and Widget bundles build cleanly and the rebuilt `dist/` is committed (`npm run build`). CI fails when `dist/` is out of date because it is the distributed frontend package.
8. [ ] Dependency audits pass (`composer audit` and `npm run audit`).
