# ==============================================================================
# VARIABLES
# ==============================================================================
PACKAGE_MANAGER   ?= npm
NODE_MODULES_DIR  ?= node_modules
REMOVABLE_THINGS  ?= .vitest-cache coverage site
DOCKER_IMAGE_NAME ?= binharic-cli
DOCKER_IMAGE_TAG  ?= latest
DOCKER_CONTAINER_ARGS       ?=

# ==============================================================================
# SETUP & CHECKS
# ==============================================================================
# Check for required tools
REQUIRED_BINS := node $(PACKAGE_MANAGER)
$(foreach bin,$(REQUIRED_BINS),\
    $(if $(shell command -v $(bin) 2> /dev/null),,$(error Please install $(bin) to continue)))

# Internal target to check for node_modules. Not intended for direct use.
check-deps:
	@if [ ! -d "$(NODE_MODULES_DIR)" ]; then \
	   echo "Dependencies not found. Running 'make install' first..."; \
	   $(MAKE) install; \
	fi

# Declare all targets as phony (not files)
.PHONY: help install check-deps test coverage lint lint-fix format typecheck build run clean reset setup-hooks \
 test-hooks npm-login npm-whoami pack pack-dry-run publish publish-dry-run version-patch version-minor version-major \
 docker-image docker-run

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
	@$(PACKAGE_MANAGER) install --legacy-peer-deps

build: check-deps ## Build Binharic
	@$(PACKAGE_MANAGER) run build

run: build ## Start Binharic in terminal
	@$(PACKAGE_MANAGER) start

clean: ## Remove build artifacts
	@rm -rf dist $(NODE_MODULES_DIR) $(REMOVABLE_THINGS)

# ==============================================================================
# DEVELOPMENT
# ==============================================================================
test: check-deps ## Run the test suite
	@$(PACKAGE_MANAGER) test

coverage: check-deps ## Run the test suite and generate a coverage report
	@mkdir -p coverage/.tmp
	@$(PACKAGE_MANAGER) run coverage

lint: check-deps ## Run linter checks
	@$(PACKAGE_MANAGER) run lint

typecheck: check-deps ## Run TypeScript type checks
	@$(PACKAGE_MANAGER) run typecheck

format: check-deps ## Format code with Prettier
	@$(PACKAGE_MANAGER) run format

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

# ==============================================================================
# PUBLISHING TO NPM
# ==============================================================================
npm-login: ## Log in to npm registry
	@$(PACKAGE_MANAGER) login

npm-whoami: ## Show current npm user (if logged in)
	@-$(PACKAGE_MANAGER) whoami

pack: build ## Create npm tarball (binharic-cli-<version>.tgz)
	@$(PACKAGE_MANAGER) pack

pack-dry-run: build ## Preview files that would be packed
	@$(PACKAGE_MANAGER) pack --dry-run

publish-dry-run: ## Simulate npm publish (no registry changes)
	@$(PACKAGE_MANAGER) publish --access public --dry-run

publish: ## Publish the package to npm (runs build via prepublishOnly)
	@$(PACKAGE_MANAGER) publish --access public

version-patch: ## Bump patch version (x.y.z -> x.y.(z+1))
	@$(PACKAGE_MANAGER) version patch

version-minor: ## Bump minor version (x.y.z -> x.(y+1).0)
	@$(PACKAGE_MANAGER) version minor

version-major: ## Bump major version ((x+1).0.0)
	@$(PACKAGE_MANAGER) version major

# ==============================================================================
# DOCKER
# ==============================================================================

docker-image: ## Build the Docker image
	@echo "Building Docker image: $(DOCKER_IMAGE_NAME):$(DOCKER_IMAGE_TAG)"
	@docker build -t $(DOCKER_IMAGE_NAME):$(DOCKER_IMAGE_TAG) .

docker-run: ## Run the application in a Docker container
	@echo "Running Docker image: $(DOCKER_IMAGE_NAME):$(DOCKER_IMAGE_TAG) with args: $(DOCKER_CONTAINER_ARGS)"
	@docker run --rm -it \
		-v $(PWD):/workspace \
		-w /workspace \
		-e OPENAI_API_KEY \
		-e ANTHROPIC_API_KEY \
		-e GOOGLE_API_KEY \
		$(DOCKER_IMAGE_NAME):$(DOCKER_IMAGE_TAG) $(DOCKER_CONTAINER_ARGS)

docker-run-local: ## Run with local config and workspace mounted
	@echo "Running Docker with local config and workspace"
	@docker run --rm -it \
		-v $(PWD):/workspace \
		-v $(HOME)/.config/binharic:/root/.config/binharic \
		-w /workspace \
		-e OPENAI_API_KEY \
		-e ANTHROPIC_API_KEY \
		-e GOOGLE_API_KEY \
		$(DOCKER_IMAGE_NAME):$(DOCKER_IMAGE_TAG) $(DOCKER_CONTAINER_ARGS)

docker-shell: ## Open a shell in the Docker container for debugging
	@echo "Opening shell in Docker container"
	@docker run --rm -it \
		-v $(PWD):/workspace \
		-w /workspace \
		-e OPENAI_API_KEY \
		-e ANTHROPIC_API_KEY \
		-e GOOGLE_API_KEY \
		--entrypoint /bin/bash \
		$(DOCKER_IMAGE_NAME):$(DOCKER_IMAGE_TAG)
