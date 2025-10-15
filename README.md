<div align="center">
  <picture>
    <img alt="Binharic Logo" src="logo.svg" height="20%" width="20%">
  </picture>
<br>

<h2>Binharic</h2>

[![Tests](https://img.shields.io/github/actions/workflow/status/habedi/tobi/tests.yml?label=tests&style=flat&labelColor=333333&logo=github&logoColor=white)](https://github.com/habedi/tobi/actions/workflows/tests.yml)
[![Code Coverage](https://img.shields.io/codecov/c/github/habedi/tobi?style=flat&label=coverage&labelColor=333333&logo=codecov&logoColor=white)](https://codecov.io/gh/habedi/tobi)
[![Code Quality](https://img.shields.io/codefactor/grade/github/habedi/tobi?style=flat&label=code%20quality&labelColor=333333&logo=codefactor&logoColor=white)](https://www.codefactor.io/repository/github/habedi/tobi)
[![Documentation](https://img.shields.io/badge/docs-latest-8ca0d7?style=flat&labelColor=333333&logo=read-the-docs&logoColor=white)](docs)
[![License](https://img.shields.io/badge/license-MIT-00acc1?style=flat&labelColor=333333&logo=open-source-initiative&logoColor=white)](LICENSE)

A Tech-Priest AI coding assistant blessed by the Omnissiah

</div>

---

Binharic is a Tech-Priest of the Adeptus Mechanicus serving as an AI coding assistant. It speaks with reverence for technology and serves the user through the sacred art of code, honoring the Machine God with every execution.

### Features

- Blessed machine spirit powered by OpenAI, Google, Anthropic, and Ollama models
- Fully customizable sacred configuration
- Fast and secure communion with the machine
- CLI interface with rich TUI blessed by the Omnissiah
- Built-in retrieval-augmented generation pipeline
- Tool invocation capabilities including Model Context Protocol (MCP) server integration
- Speaks in the dialect of the Adeptus Mechanicus

---

### Quick Start

Prerequisites:
- Node.js 20 or newer (package.json engines >= 20)
- npm

Install and run:

```
npm install
make run
```

First run creates a config at:
- ~/.config/binharic/config.json5 (and logs under ~/.config/binharic/logs)

Set API keys in your shell to enable cloud providers:

```
# choose any subset depending on provider(s) you want to use
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
export GOOGLE_API_KEY="..."
```

Tip: If you prefer local-only, use Ollama (no API key). You can switch to the bundled local model via the TUI: `/model qwen3`.

Development mode (hot reload):

```
npm run dev
```

---

### Usage

- Type your request and press Enter.
- Include files with @path (e.g., `Please analyze @src/agent/state.ts`). The file contents will be inlined.
- Use commands with `/` prefix:
  - `/help` Show help
  - `/models` List available models (grouped by provider)
  - `/model <name>` Switch default model (e.g., `/model gpt-5-mini`, `/model qwen3`)
  - `/system <prompt>` Set a custom system prompt
  - `/add <files...>` Add context files to persist across requests
  - `/clear` Clear conversation output
  - `/clearHistory` Clear command history
  - `/quit` or `/exit` Quit the app

Keyboard shortcuts:
- Up/Down: cycle command history
- Ctrl+L: clear screen
- Ctrl+C: stop current run; press twice quickly to exit
- Tab: accept autocomplete in menus; Esc: cancel autocomplete/search

Notes:
- Tool results are hidden in the UI unless a tool fails (you'll see failures clearly).
- The header shows tips; use `/help` any time for commands and tools.

---

### Configuration

Config path: `~/.config/binharic/config.json5`

Key fields:
- `defaultModel`: name of the model to use by default
- `models[]`: list of provider models with context window sizes
- `systemPrompt`: global persona/behavior
- `apiKeys`: env var names for providers (OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY)
- `history.maxItems`: optional cap on in-memory conversation length
- `mcpServers`: optional MCP server processes for additional tools

History path: `~/.config/binharic/history`

Logs: `~/.config/binharic/logs/`

---

### Makefile Targets

Common targets:
- `make run` Build then start the TUI (`npm run build && npm start`)
- `make test` Run tests
- `make coverage` Run tests with coverage
- `make lint` / `make format` Quality gates
- `make clean` Remove build artifacts and caches

Run `make help` for the full list.

---

### Troubleshooting

No LLM providers configured:
- On first run, Binharic warns and exits if no providers are available.
- Set one or more API keys as environment variables (see Quick Start), or switch to Ollama: `/model qwen3`.

Ollama connectivity:
- Default base URL is http://localhost:11434 (adjustable per model). Ensure the model is pulled and the daemon is running.

API key format:
- OpenAI: starts with `sk-` or `sk-proj-`
- Anthropic: starts with `sk-ant-`
- Google: long base64-ish token

Logs and errors:
- Detailed logs are written under `~/.config/binharic/logs/`.
- Sanitized provider errors are suppressed from stderr but captured in logs.

---

### Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to make a contribution.

### License

This template is licensed under the MIT License (see [LICENSE](LICENSE)).

### Acknowledgements

- The logo is from [SVG Repo](https://www.svgrepo.com/svg/388730/terminal).
- Inspired by the Adeptus Mechanicus from Warhammer 40,000.
