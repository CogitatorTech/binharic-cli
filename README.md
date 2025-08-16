## TypeScript Project Template

<div align="center">
  <picture>
    <img alt="Project Logo" src="logo.svg" height="25%" width="25%">
  </picture>
</div>

<div align="center">

[![Tests](https://img.shields.io/github/actions/workflow/status/habedi/template-typescript-project/tests.yml?label=tests&style=flat&labelColor=333333&logo=github&logoColor=white)](https://github.com/habedi/template-typescript-project/actions/workflows/tests.yml)
[![Code Coverage](https://img.shields.io/codecov/c/github/habedi/template-typescript-project?style=flat&label=coverage&labelColor=333333&logo=codecov&logoColor=white)](https://codecov.io/gh/habedi/template-typescript-project)
[![Code Quality](https://img.shields.io/codefactor/grade/github/habedi/template-typescript-project?style=flat&label=code%20quality&labelColor=333333&logo=codefactor&logoColor=white)](https://www.codefactor.io/repository/github/habedi/template-typescript-project)
[![Node.js Version](https://img.shields.io/badge/node-%3E=20.0.0-339933?style=flat&labelColor=333333&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Documentation](https://img.shields.io/badge/docs-latest-8ca0d7?style=flat&labelColor=333333&logo=read-the-docs&logoColor=white)](docs)
[![License](https://img.shields.io/badge/license-MIT-00acc1?style=flat&labelColor=333333&logo=open-source-initiative&logoColor=white)](LICENSE)
[![Managed with npm](https://img.shields.io/badge/managed%20with-npm-CB3837?style=flat&logo=npm&labelColor=333333&logoColor=white)](https://www.npmjs.com/)
[![Makefile](https://img.shields.io/badge/managed%20with-Makefile-000000?style=flat&logo=gnu&labelColor=333333&logoColor=white)](https://www.gnu.org/software/make/)

</div>

---

This is a template repository for creating new TypeScript projects.
It includes a basic structure, a `Makefile` for common developmental tasks, and a set of GitHub Actions workflows for
running the tests.
I am sharing this template in case others find it useful.

### Features

- **TypeScript**: a basic setup for a TypeScript project.
- **Makefile**: for managing common tasks like testing, linting, and formatting.
- **GitHub Actions**: for running tests, linting, and publishing packages.
- **Badges**: for showing the status of tests, code quality, version, etc.
- **Default files**: for configuration, testing, and documentation, like `.gitignore`, `README.md`, `LICENSE`, etc.

### Prerequisites

- `Node.js >=20.0.0`
- `npm` for package management
- `GNU Make`

### Usage

1. Use the `Use this template` button on GitHub to create a new repository based on this template.
2. Modify the `README.md` file and other files as needed.
3. Run `make install` to install the project dependencies.
4. Run `make help` to see all available commands for managing different tasks.

---

### Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to make a contribution.

### License

This template is licensed under the MIT License ([LICENSE](LICENSE) or https://opensource.org/licenses/MIT)
