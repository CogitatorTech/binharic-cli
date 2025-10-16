<div align="center">
  <picture>
    <img alt="Binharic Logo" src="logo.svg" height="20%" width="20%">
  </picture>
<br>

<h2>Binharic</h2>

[![Tests](https://img.shields.io/github/actions/workflow/status/CogitatorTech/binharic-cli/tests.yml?label=tests&style=flat&labelColor=333333&logo=github&logoColor=white)](https://github.com/CogitatorTech/binharic-cli/actions/workflows/tests.yml)
[![Code Coverage](https://img.shields.io/codecov/c/github/CogitatorTech/binharic-cli?style=flat&label=coverage&labelColor=333333&logo=codecov&logoColor=white)](https://codecov.io/gh/CogitatorTech/binharic-cli)
[![Code Quality](https://img.shields.io/codefactor/grade/github/CogitatorTech/binharic-cli?style=flat&label=code%20quality&labelColor=333333&logo=codefactor&logoColor=white)](https://www.codefactor.io/repository/github/CogitatorTech/binharic-cli)
[![npm](https://img.shields.io/npm/v/%40cogitator%2Fbinharic-cli?style=flat&labelColor=333333&logo=npm&logoColor=white)](https://www.npmjs.com/package/@cogitator/binharic-cli)
[![Documentation](https://img.shields.io/badge/docs-latest-8ca0d7?style=flat&labelColor=333333&logo=read-the-docs&logoColor=white)](docs)
[![License](https://img.shields.io/badge/license-MIT-00acc1?style=flat&labelColor=333333&logo=open-source-initiative&logoColor=white)](LICENSE)

A coding agent with the persona of a Tech-Priest of the Adeptus Mechanicus

</div>

---

Binharic is a terminal-based AI coding assistant (a coding agent) similar to OpenAI's Codex, Google's Gemini CLI, and
Anthropic's Claude Code—but with the personality of a devout Tech-Priest of the Adeptus Mechanicus.
Binharic is written in TypeScript and uses the [AI SDK](https://ai-sdk.dev/) framework for most of its underlying
agentic logic (like tool calling and workflow management).
Additionally, its architecture follows the recommendations mentioned in the
[building effective agents](https://www.anthropic.com/engineering/building-effective-agents) article from Anthropic,
to a good degree.

Binharic's development started as a personal project to learn more about building a terminal-based coding agent.
However, the project has grown somewhat into a full-fledged coding assistant with a lot of features
like the ability to analyze projects, run tests, find bugs, and perform code review.

### Features

- Can use models from OpenAI, Google, Anthropic, and Ollama
- Is fully customizable (like customizing system prompt)
- Comes with a built-in keyword-based retrieval-augmented generation (RAG) pipeline
- Comes with a large set of built-in tools (like reading and writing files)
- Can use external tools via the Model Context Protocol (MCP)
- Comes with built-in workflows for standard software development tasks (like debugging and code review)

See the [ROADMAP.md](ROADMAP.md) for the list of implemented and planned features.

> [!IMPORTANT]
> Binharic is in early development, so bugs and breaking changes are expected.
> Please use the [issues page](https://github.com/CogitatorTech/infera/issues) to report bugs or request features.

---

### Getting Started

You can follow the instructions below to install and use Binharic in your terminal.

#### Installation

```sh
npm install -g @cogitator/binharic-cli
```

#### Running in the Terminal

```sh
# Make sure API keys are available in the environment
export OPENAI_API_KEY=<your-openai-api-key>
export ANTHROPIC_API_KEY=<your-anthropic-api-key>
export GOOGLE_API_KEY=<your-google-api-key>

# Start Binharic in the terminal
binharic
```

[![asciicast](https://asciinema.org/a/vDae95b1lm20X7HGSlcVe3M6C.svg)](https://asciinema.org/a/vDae95b1lm20X7HGSlcVe3M6C)

> [!NOTE]
> The performance of a coding agent like Binharic, to a great extent, depends on the model it uses.
> So, it's recommended to use state-of-the-art models (like Claude Sonnet 4.5, GPT-5, and Gemini 2.5 Pro) for the best
> results.

#### Running in a Container

Alternatively, you can run Binharic in a container:

```sh
# API keys and PWD should be available in the environment already
docker run -it --rm \
  -v $(PWD):/workspace \
  -e OPENAI_API_KEY \
  -e ANTHROPIC_API_KEY \
  -e GOOGLE_API_KEY \
  ghcr.io/cogitatortech/binharic-cli:<version>
```

`<version>` should be replaced with the version of the Binharic (like `0.1.0-alpha.4`) or `latest`.
Use `latest` if you want to use the latest (development) version of Binharic.

---

### Documentation

See the [docs](docs) for more information on how to use the Binharic coding agent.

---

### Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to make a contribution.

### License

This project is licensed under the MIT License (see [LICENSE](LICENSE)).

### Acknowledgements

- The logo is from [SVG Repo](https://www.svgrepo.com/svg/388730/terminal) with some modifications.
