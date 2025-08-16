## Contribution Guidelines

Thank you for considering contributing to this project!
Contributions are always welcome and appreciated.

### How to Contribute

Please check the [issue tracker](https://github.com/habedi/template-typescript-project/issues) to see if there is an
issue you would like to work on or if it has already been resolved.

#### Reporting Bugs

1. Open an issue on the [issue tracker](https://github.com/habedi/template-typescript-project/issues).
2. Include information such as steps to reproduce the observed behavior and relevant logs or screenshots.

#### Suggesting Features

1. Open an issue on the [issue tracker](https://github.com/habedi/template-typescript-project/issues).
2. Provide details about the feature, its purpose, and potential implementation ideas.

### Submitting Pull Requests

- Make sure all tests pass before submitting a pull request.
- Write a clear description of the changes you made and the reasons behind them.

> [!IMPORTANT]
> It's assumed that by submitting a pull request, you agree to license your contributions under the project's license.

### Development Workflow

#### Prerequisites

- `Node.js >=20.0.0`
- `npm` or `yarn` for package management
- `GNU Make`
- `Python >=3.10` and `pip` for installing `pre-commit`

#### Development Setup

1. **Install dependencies:**

    ```shell
    make install
    ```

    This will install the necessary Node.js dependencies.

2. **Set up Git hooks:**
    ```shell
    make setup-hooks
    ```
    This will set up pre-commit hooks for linting and formatting.

#### Code Style

- Use the `make format` command to format the code.

#### Running Tests

- Use the `make test` command to run the tests.

#### Running Linter Checks

- Use the `make lint` command to run the linter checks.

#### See Available Commands

- Run `make help` to see all available commands for managing different tasks.

### Code of Conduct

We adhere to the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/) version 2.1.
