# Load environment variables from .env file
ifneq (,$(wildcard ./.env))
    include .env
    export $(shell sed 's/=.*//' .env)
else
    $(warning .env file not found. Environment variables not loaded.)
endif

# ==============================================================================
# VARIABLES
# ==============================================================================
PACKAGE_MANAGER   ?= npm
NODE_MODULES_DIR  ?= node_modules
REMOVABLE_THINGS  ?= .vitest-cache coverage

# ==============================================================================
# SETUP & CHECKS
# ==============================================================================
# Check for required tools
REQUIRED_BINS := node $(PACKAGE_MANAGER) docker
$(foreach bin,$(REQUIRED_BINS),\
	$(if $(shell command -v $(bin) 2> /dev/null),,$(error Please install $(bin) to continue)))

# Internal target to check for node_modules. Not intended for direct use.
check-deps:
	@if [ ! -d "$(NODE_MODULES_DIR)" ]; then \
		echo "Dependencies not found. Running 'make install' first..."; \
		$(MAKE) install; \
	fi

# Declare all targets as phony (not files)
.PHONY: help install check-deps test coverage lint lint-fix format typecheck build start dev clean reset \
setup-hooks test-hooks

.DEFAULT_GOAL := help

# ==============================================================================
# GENERAL COMMANDS
# ==============================================================================
help: ## Show this help message
	@echo "Usage: make <target>"
	@echo ""
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(firstword $(MAKEFILE_LIST)) | \
	awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

install: ## Install project dependencies
	$(PACKAGE_MANAGER) install

build: check-deps ## Build the project for production
	$(PACKAGE_MANAGER) run build

start: ## Start the production server
	$(PACKAGE_MANAGER) start

dev: ## Start the development server
	$(PACKAGE_MANAGER) run dev

clean: ## Remove caches, build artifacts and documentation
	rm -rf dist $(NODE_MODULES_DIR) $(REMOVABLE_THINGS) site

# ==============================================================================
# DEVELOPMENT
# ==============================================================================
test: check-deps ## Run the test suite
	$(PACKAGE_MANAGER) test

coverage: check-deps ## Run the test suite and generate a coverage report
	$(PACKAGE_MANAGER) run coverage

lint: check-deps ## Run linter checks
	$(PACKAGE_MANAGER) run lint

lint-fix: check-deps ## Automatically fix linter errors
	$(PACKAGE_MANAGER) run lint:fix

typecheck: check-deps ## Run TypeScript type checks
	$(PACKAGE_MANAGER) run typecheck

format: check-deps ## Format code with Prettier
	$(PACKAGE_MANAGER) run format

# ==============================================================================
# GIT HOOKS
# ==============================================================================
setup-hooks: ## Install Git hooks (pre-commit and pre-push)
	@echo "Setting up Git hooks..."
	@if ! command -v pre-commit &> /dev/null; then \
	   echo "pre-commit not found. Please install it using 'pip install pre-commit'"; \
	   exit 1; \
	fi
	@pre-commit install --hook-type pre-commit
	@pre-commit install --hook-type pre-push
	@pre-commit install-hooks

test-hooks: ## Test Git hooks on all files
	@echo "Testing Git hooks..."
	@pre-commit run --all-files --show-diff-on-failure
