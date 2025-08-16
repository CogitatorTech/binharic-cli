## Project Documentation

Add the documentation here.

---

Of course. Building a tool like "Octo" is a fantastic project. Based on my analysis of its architecture and my own
experience, here are some ideas for building a similar tool, broken down into core concepts, advanced features, and
product-level thinking.

### 1\. Core Architecture & Foundational Ideas

This is the minimum viable product (MVP) you'd need to get a functioning agent.

- **The Agent Loop:** The heart of any agent is its operational cycle. The classic model is a variation of a REPL
  (`Read-Eval-Print Loop`):
  $$[Input] \rightarrow [Think] \rightarrow [Act] \rightarrow [Observe]$$
    - **Input:** The user provides a prompt.
    - **Think:** The agent (your code) sends the prompt and conversation history to an LLM. The LLM's "thinking"
      process might involve generating a plan or deciding which tool to use.
    - **Act:** Your code parses the LLM's response. If it's a tool call, you execute it. If it's a text response, you
      display it.
    - **Observe:** The result of the action (tool output or error) is formatted and added to the history. The loop
      then repeats with this new context.

- **A Modular Tool System:** This is non-negotiable. Don't hard-code your tools. Create a `Tool` interface and a
  registry. "Octo" does this very well. A simple version could look like this:

    ```typescript
    interface Tool {
        name: string;
        description: string; // Crucial for the LLM to know when to use it
        argumentsSchema: t.Type<any>; // Using 'structural' or 'zod' for schemas
        execute(args: any): Promise<string>;
    }

    const toolRegistry: Map<string, Tool> = new Map();
    ```

    This allows you to add new tools like `git_diff` or `run_tests` just by defining a new object that fits the
    interface.

- **Rich History Management:** Your history isn't just a list of strings. It's a structured log of events. "Octo's"
  `HistoryItem` type is a good example. You should explicitly differentiate between:
    - `UserMessage`
    - `AssistantMessage` (the LLM's text response)
    - `AssistantToolRequest` (the LLM's decision to call a tool)
    - `ToolResult` (the output from your code running the tool)
    - `SystemNotification` (e.g., "File `x.ts` was modified externally.")

### 2\. Enhancing the Core - "Leveling Up"

These are features that move from a simple proof-of-concept to a robust and reliable tool.

- **LLM Abstraction Layer:** "Octo" uses an IR for this. Your goal is to write code against your own generic
  `LLMProvider` interface, not directly against the OpenAI or Anthropic SDKs.

    ```typescript
    interface LLMProvider {
        generateResponse(history: LlmIR[], tools: Tool[]): AsyncGenerator<ResponseChunk>;
    }
    ```

    This lets you swap models mid-conversation, test new providers, or even integrate local models running via Ollama or
    llama.cpp with minimal friction.

- **Context Window Management:** This is a critical, practical problem. A long conversation will exceed the LLM's
  context limit.
    - **Simple:** Use a "sliding window" approach like "Octo" does in `windowing.ts`. Keep only the last N tokens of
      the conversation.
    - **Advanced:** Implement a summarization strategy. For older parts of the conversation, use a cheaper/faster LLM
      to create a summary and replace the original messages with it.
    - **RAG (Retrieval-Augmented Generation):** For providing context about a large codebase, don't stuff entire files
      into the prompt. Use vector embeddings (e.g., with `pgvector` or a library like `llamaindex`) to find the most
      relevant
      code snippets for the user's current query and inject only those into the prompt.

- **Self-Correction and Autofix:** "Octo's" use of a separate model to fix malformed JSON is brilliant. Expand on
  this:
    - **JSON Repair:** This is the most common use case. LLMs often produce JSON with trailing commas or missing
      brackets.
    - **Code Syntax Repair:** If a tool generates code (`edit` or `create`), you can have a "linter" step that uses an
      LLM to fix basic syntax errors before writing to disk.
    - **Search String Repair:** "Octo" does this for its `diff` edits. This is a great feature to prevent frustrating
      "search text not found" errors.

### 3\. Advanced Concepts & "Next Frontier" Ideas

These are more speculative ideas that could give your tool a unique edge.

- **Multi-Step Planning:** Instead of having the LLM emit one tool call at a time, prompt it to produce a full plan of
  action as a JSON object (e.g., a list of steps with dependencies). Your agent then becomes an executor for this plan,
  running the tools in sequence and feeding the results back for the next step. This dramatically increases autonomy.

- **Sandboxed Execution Environment:** Running `bash` commands from an LLM directly on your machine is a massive
  security risk.
    - Use Docker to spin up a container for each session or command. The agent can only modify files inside the
      container's volume mount.
    - Explore WebAssembly (Wasm) as a secure, lightweight sandboxing target for running code or tools.

- **GUI / Rich Interface:** While "Octo" is a great CLI app, a simple web UI or a VS Code extension could provide huge
  value.
    - Visualize the agent's plan as a graph.
    - Provide rich diff viewers for proposed changes.
    - Allow the user to directly edit the agent's proposed tool arguments before execution.

### 4\. Technical Stack & Library Choices

- **Language:** **TypeScript**. For a project of this complexity, type safety is not optional.
- **CLI Framework:** **Ink** (like Octo) is great for rich, interactive UIs. For a more traditional CLI,
  **Commander.js** or **Yargs** are standard.
- **Schema & Validation:** **Zod** is the current industry standard and is excellent for parsing and validating
  unpredictable LLM outputs. `structural` is also a fine choice.
- **LLM Interaction:** The **Vercel AI SDK (`ai`)** is a strong starting point. It has built-in helpers for streaming,
  tool usage, and supports multiple providers.

### 5\. Product & SaaS Ideas

If you're thinking of this as more than a personal project:

- **The "Bring-Your-Own-Key" (BYOK) Model:** This is the easiest way to start. Users provide their own API keys, and
  your tool is just the client-side orchestrator. You can sell the tool itself as a one-time purchase or a subscription.
- **The Full SaaS Model:** You manage the API keys and bill users for usage (with a markup). This is more complex but
  offers more value. You could provide premium features:
    - **Hosted Sandboxes:** Users run their code in your secure, cloud-based environments.
    - **Team Collaboration:** Shared sessions, toolsets, and prompts.
    - **Specialized Fine-Tuned Models:** Offer your own fine-tuned "autofix" or planning models as a premium feature.

Start with the core loop and a solid, modular tool system. The `FileTracker` and `autofix` ideas from "Octo" are
high-impact features I'd prioritize next. Good luck.

---

Excellent question. We've built a solid foundation for Abi, which is the core agent loop. To evolve it into something as
robust and feature-rich as Octo, we need to focus on several key areas.

Think of Abi as the engine and Octo as the full vehicle with a chassis, safety systems, a dashboard, and support for
different fuel types.

Here is a breakdown of what's missing, categorized by function.

### 1. Core Functionality & Tooling

This is about expanding what the agent can actually _do_.

- **Expanded Toolset:** Abi currently only has `readFile`. Octo has a comprehensive set of tools for interacting with a
  developer's environment:
    - `list`: To list files and directories (`ls`).
    - `create`: To create new files.
    - `edit`: A powerful tool with sub-types (`diff`, `append`, `prepend`, `rewrite-whole`) for modifying files. This is
      the most critical tool for a coding assistant.
    - `bash`: To run arbitrary shell commands.
    - `fetch`: To retrieve content from URLs.
- **Autofix Mechanism:** This is one of Octo's killer features. When a primary LLM fails (e.g., by creating invalid JSON
  for a tool call or a bad search string for a file edit), Octo uses a smaller, specialized LLM to try and fix the error
  automatically instead of failing and asking the user for help.
- **Configuration File:** Octo is driven by a `config.json5` file that defines available models, user preferences, and
  API key locations. Abi currently has everything hardcoded.

### 2. Safety & Robustness

These are the features that make the tool safe to use and prevent it from making costly mistakes.

- **File Tracker for Stale Edits:** This is the most important safety feature missing from Abi. Octo's `FileTracker`
  remembers when a file was last read. If you modify the file in your editor and then Abi tries to edit it, the
  `FileTracker` will block the operation because the agent is working with outdated information. This prevents the AI
  from accidentally overwriting your work.
- **Token Tracking & Cost Management:** A production-ready tool needs to track API usage. Octo's `token-tracker.ts`
  keeps a running count of input/output tokens so the user is aware of the cost.
- **Context Window Management:** Abi's history is an array that will grow until it inevitably exceeds the LLM's context
  window, causing an API error. Octo has a `windowing.ts` module that intelligently truncates the history to ensure it
  always fits, preventing crashes on long conversations.

### 3. Architectural Maturity

These are structural differences that make Octo more maintainable and extensible.

- **LLM Abstraction (IR Layer):** Right now, Abi is hardcoded to use the OpenAI provider via the Vercel AI SDK. Octo is
  multi-provider (OpenAI, Anthropic, etc.). It achieves this with an **Intermediate Representation (`LlmIR`)**. The
  conversation history is converted to this generic IR, and then a provider-specific "compiler" (`responses.ts` or
  `anthropic.ts`) translates the IR into the exact format the target API needs. This is a major architectural step up.
- **Dedicated State Management:** Abi's state is a simple `history` array managed in a `while` loop. Octo uses `zustand`
  to manage a much more complex state machine (e.g., `mode: 'responding'`, `mode: 'tool-request'`,
  `mode: 'error-recovery'`). This is essential for driving a more complex user interface.

### 4. User Experience (UX)

- **Rich CLI with Ink:** Abi uses Node's basic `readline`, which is a simple prompt. Octo uses **Ink**, which is a
  library for building React-based user interfaces in the terminal. This allows for features like:
    - Loading spinners while the AI is thinking.
    - Properly formatted code blocks and diffs.
    - Clear visual separation between messages from the user, Abi, and the tools.
    - Interactive confirmation dialogs for tool usage.

---

### A Prioritized Roadmap to Get Abi Closer to Octo

Here's a logical order to implement these features:

1. **Expand the Toolset:** Start by implementing `list`, `create`, and especially the `edit` tool. This will give Abi
   the core capabilities of a coding assistant.
2. **Implement `FileTracker`:** Before you do any serious work with the `edit` tool, build the `FileTracker` to prevent
   accidents. This is your most important safety net.
3. **Upgrade the UI and State:** Replace the `readline` loop with an **Ink**-based UI. At the same time, introduce \*
   \*Zustand\*\* for state management. The state machine will be necessary to handle the more complex, asynchronous
   nature
   of an Ink app.
4. **Refactor for LLM Abstraction:** Once the core features are stable, undertake the larger architectural task of
   creating the `LlmIR` and separate "compiler" modules for different LLM providers.
5. **Add Advanced Features:** Finally, add the "polish" that makes a tool feel professional, like the autofix mechanism
   and token tracking.

---

After replacing these files, run make dev. Then, try these prompts one by one:

    list the files in the src/agent directory

    create a file named 'test.txt' with the content 'hello from Abi'

    read the file 'test.txt'

    append the text '\nand goodbye!' to the file 'test.txt'

    read the file 'test.txt' again

    in the file 'test.txt', replace the word 'hello' with 'greetings'

    read the file 'test.txt' one last time

---

`~/.config/abi/config.json5`

```
// ... inside your config.json5
"mcpServers": {
"linear": {
"command": "npx",
"args": [ "-y", "mcp-remote", "https://mcp.linear.app/sse" ],
},
},
```
