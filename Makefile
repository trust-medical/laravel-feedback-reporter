.PHONY: help build install test test-php test-js analyse lint format audit build-js serve shell

help:
	@echo "Available commands:"
	@echo "  make build       - Build docker images"
	@echo "  make install     - Install composer and npm dependencies"
	@echo "  make test        - Run both PHP and JS tests"
	@echo "  make test-php    - Run Pest tests"
	@echo "  make test-js     - Run Vitest tests"
	@echo "  make analyse     - Run PHPStan static analysis"
	@echo "  make lint        - Run Pint and Biome linting"
	@echo "  make format      - Auto-format PHP and JS code"
	@echo "  make audit       - Run Composer and npm security audits"
	@echo "  make build-js    - Build frontend bundle"
	@echo "  make serve       - Serve the Workbench at http://localhost:8000"
	@echo "  make shell       - Open interactive shell in docker container"

build:
	docker compose build

install:
	docker compose run --rm app composer install
	docker compose run --rm app npm ci

test: test-php test-js

test-php:
	docker compose run --rm app vendor/bin/pest

test-js:
	docker compose run --rm app npm test

analyse:
	docker compose run --rm app vendor/bin/phpstan analyse --memory-limit=512M
	docker compose run --rm app npm run typecheck

lint:
	docker compose run --rm app vendor/bin/pint --test
	docker compose run --rm app npm run lint

format:
	docker compose run --rm app vendor/bin/pint
	docker compose run --rm app npm run format

audit:
	docker compose run --rm app composer audit
	docker compose run --rm app npm audit --audit-level=high

build-js:
	docker compose run --rm app npm run build

serve:
	docker compose run --rm --service-ports app sh -c "vendor/bin/testbench workbench:build && vendor/bin/testbench serve --host=0.0.0.0 --port=8000"

shell:
	docker compose run --rm app bash
