### **1. Feature: Advanced System Prompt Generation**

- **Goal:** To make the agent highly context-aware of the user's current project by dynamically building a rich system
  prompt before every LLM call. This ensures the agent's advice and actions are relevant to the specific codebase it's
  working on.
- **Core Functionality:**
    - **Dynamic Context Injection:** The system prompt should not be a static string from the config. It should be
      assembled on-demand.
    - **Workspace Awareness:** The function must identify and list the files and directories in the current working
      directory (`process.cwd()`).
    - **Instruction File Discovery:** The system should search recursively upwards from the current directory to the
      user's home directory for special instruction files (e.g., `TOBI.md`, `AGENTS.md`). If found, their content must
      be read and included in the prompt, clearly labeled as user-provided instructions.
    - **Tool Schema Serialization:** All available tool schemas (from `src/agent/tools/definitions/`) must be converted
      from Zod objects into human-readable TypeScript type definitions. This gives the LLM a perfect, strongly-typed "
      API documentation" for the tools it can use.
- **Implementation Guidance:**
    1. Create a new file: `src/agent/system-prompt.ts`.
    2. This file will export an async function: `generateSystemPrompt(config: Config): Promise<string>`.
    3. **Dependencies:** Add `zod-to-typescript` to the project (`npm install zod-to-typescript`).
    4. **Logic:**
        - Use `fs/promises` to read the current directory contents.
        - Implement the recursive search for `TOBI.md`.
        - Import all tool schemas. Use `zod-to-typescript`'s `zodToTs` function to convert each schema into a TypeScript
          string.
        - Assemble all parts into a single, well-formatted prompt string using template literals.
    5. **Integration:** In `src/agent/state.ts`, within the `_runAgentLogic` function, call `generateSystemPrompt`
       before calling `streamAssistantResponse`. Pass the generated prompt to the `system` parameter of
       `streamAssistantResponse`.
- **Reference (Octofriend):** `source/system-prompt.ts`

---

### **2. Feature: Autofix for Diff Edits**

- **Goal:** To dramatically improve the success rate of the `edit` tool. LLMs frequently make minor errors in the
  `search` block of a `replace` action (e.g., extra whitespace, slightly wrong indentation), causing the tool to fail.
  This feature uses a specialized, cheap model to fix these errors automatically.
- **Core Functionality:**
    - When an `edit` tool call with `type: "replace"` is executed, the implementation first checks if the `search`
      string exists in the target file.
    - If the `search` string is _not_ found, the tool does not fail immediately. Instead, it triggers the autofix
      mechanism.
    - The autofix function is called with the full file content and the LLM's incorrect `search` block.
    - This function calls a fast, inexpensive model (e.g., `gpt-4.1-mini`) with a highly specific prompt, asking it to
      find the most likely intended code block and return a corrected, perfectly matching `search` string.
    - If autofix returns a corrected string, the `edit` tool retries the `replace` operation using the new string.
    - If autofix fails or cannot find a match, only then does the `edit` tool report a failure.
- **Implementation Guidance:**
    1. In `src/agent/autofix.ts`, add a new async function:
       `autofixEdit(fileContent: string, incorrectSearch: string): Promise<string | null>`.
    2. This function will be similar to `autofixJson`. It will call `streamObject` with a Zod schema designed for the
       response, such as `z.object({ success: z.boolean(), correctedSearch: z.string().optional() })`.
    3. The prompt will clearly state the goal: "The provided 'search' string was not found in the file. Find the most
       similar and logical block of code in the file and return it as 'correctedSearch'."
    4. In `src/agent/tools/definitions/edit.ts`, modify the `implementation`. Inside the `case "replace"`, if
       `!originalContent.includes(args.edit.search)`, call `autofixEdit`. If it returns a result, use it to perform the
       replacement. Otherwise, throw a `ToolError`.
- **Reference (Octofriend):** `source/compilers/autofix.ts` (the `autofixEdit` function) and
  `source/autofix-prompts.ts`.

---

### **3. Feature: Explicit Context Window Management**

- **Goal:** To prevent API errors and manage costs by programmatically ensuring the conversation history never exceeds
  the LLM's token limit.
- **Core Functionality:**
    - Before each LLM call, the agent must calculate the approximate token count of the entire message history.
    - If the token count surpasses a safe threshold (e.g., 80%) of the currently configured model's context limit, the
      history must be trimmed.
    - The trimming strategy should be a "sliding window": the system prompt (if any) and the most recent messages are
      always preserved. Older messages from the middle of the conversation are removed one by one until the total token
      count is within the budget.
- **Implementation Guidance:**
    1. **Dependencies:** Add a lightweight tokenizer library (`npm install gpt-tokenizer`).
    2. Create a new file: `src/agent/context-window.ts`.
    3. Export a function `applyContextWindow(history: ModelMessage[], modelConfig: ModelConfig): ModelMessage[]`.
    4. **Logic:**
        - Get the `context` limit from the `modelConfig`.
        - Use the tokenizer to sum the tokens for all messages in the `history` array.
        - If the sum is over the limit, enter a loop that removes messages at index `1` (preserving the first message,
          which is often a system prompt or initial user message) until the context fits.
    5. **Integration:** In `src/agent/state.ts`, within `_runAgentLogic`, modify the line that creates
       `sdkCompliantHistory`. Pass this array to `applyContextWindow` before it's sent to the `streamAssistantResponse`
       function.
- **Reference (Octofriend):** `source/ir/ir-windowing.ts`.

---

### **4. Feature: Transport Layer Abstraction**

- **Goal:** Decouple the agent's tools from direct I/O (filesystem, network, shell) to make the code cleaner, easier to
  test with mocks, and extensible for future capabilities like remote execution.
- **Core Functionality:**
    - A TypeScript `interface` named `Transport` must be defined.
    - This interface will declare methods for all I/O, such as `readFile(path: string): Promise<string>`,
      `writeFile(path: string, content: string): Promise<void>`, `execShell(command: string): Promise<string>`, etc.
    - A concrete class, `LocalTransport`, will implement this interface using the standard Node.js `fs`, `fetch`, and
      `child_process` modules.
    - All tool definitions (`bash.ts`, `edit.ts`, `create.ts`, etc.) must be refactored. Their `implementation`
      functions will now accept a `transport: Transport` object as an argument.
    - All direct calls to `fs.readFile`, `spawn`, `fetch`, etc., within the tools must be replaced with calls to the
      corresponding method on the `transport` object (e.g., `transport.readFile(path)`).
- **Implementation Guidance:**
    1. Create a new directory `src/agent/transport`.
    2. Inside it, create `transport.ts` to define the `Transport` interface.
    3. Create `local.ts` to define the `LocalTransport` class.
    4. In `src/cli.ts` or `src/ui/App.tsx`, create a single instance: `const transport = new LocalTransport()`.
    5. This `transport` instance must be passed through the application's state or as a prop until it reaches the
       `runTool` function in `src/agent/tools/index.ts`.
    6. The `runTool` function will then pass the transport object to the specific tool's `implementation`.
- **Reference (Octofriend):** `source/transports/transport-common.ts` and `source/transports/local.ts`.

---

### **5. Feature: Interactive Main Menu**

- **Goal:** Provide a user-friendly, in-app interface for managing configuration and application state, removing the
  need to manually edit JSON files.
- **Core Functionality:**
    - Pressing the `Escape` key while the agent status is `idle` will toggle a full-screen menu overlay.
    - The menu must be navigable with arrow keys and the Enter key.
    - The menu will provide options to:
        - **Switch Model:** Temporarily change the active LLM for the current session from a list of configured models.
        - **Manage Models:** Enter a sub-menu to permanently add a new model (triggering a setup flow) or remove an
          existing one.
        - **Settings:** Access other options, such as enabling/disabling autofix features.
        - **Return/Quit:** Exit the menu or the entire application.
- **Implementation Guidance:**
    1. Add a new boolean to the Zustand state: `isMenuOpen: boolean`.
    2. Create a new store action `toggleMenu()` that flips this boolean.
    3. In `src/ui/UserInput.tsx`, add a `useInput` hook that detects `Escape` and calls `toggleMenu()`.
    4. Create a new top-level component `src/ui/Menu.tsx`. This component will render different screens based on its own
       internal state (e.g., `'main'`, `'add-model'`, `'settings'`).
    5. Use `ink-select-input` to build the navigable lists.
    6. In `src/ui/App.tsx`, implement a conditional render: `return isMenuOpen ? <Menu /> : <ChatInterface />`.
    7. The menu actions (e.g., "Set Default Model") will call the corresponding actions in the Zustand store (
       `setModel`, etc.) to update the application's config and state.
- **Reference (Octofriend):** `source/menu.tsx`, `source/components/menu-panel.tsx`, and
  `source/components/add-model-flow.tsx`.

---

### **6. Feature: Token Usage Tracking**

- **Goal:** To give the user visibility into their API usage and costs by tracking and displaying the number of tokens
  processed during a session.
- **Core Functionality:**
    - The Vercel AI SDK's response object from a model call includes a `usage` field (
      `{ promptTokens, completionTokens }`). This data must be captured after every LLM call.
    - A global, in-memory tracker must accumulate these tokens. The totals should be stored separately for input (
      prompt) and output (completion), and ideally grouped by the model name used for the call.
    - When the user quits the application, a summary of the session's token usage must be printed clearly to the
      console.
- **Implementation Guidance:**
    1. Create a new file: `src/agent/token-tracker.ts`. This module will not use any framework state; it can be a simple
       singleton with an in-memory object and exported functions like `trackTokens(model, type, count)` and
       `getTokenCounts()`.
    2. The `streamAssistantResponse` function returns the full result after the stream completes. In
       `src/agent/state.ts`, after the `await streamAssistantResponse(...)` call resolves, inspect the result object for
       the `usage` property.
    3. If `usage` exists, call the `trackTokens` function with the model name, token counts, and types.
    4. In `src/cli.ts`, register a process exit handler: `process.on('exit', () => { ... })`. Inside the handler, call
       `getTokenCounts()` and `console.log` a formatted summary.
- **Reference (Octofriend):** `source/token-tracker.ts` and `source/cli.tsx`.

---

### **7. Feature: "Unchained" Mode**

- **Goal:** Provide a "power-user" mode that allows the agent to run fully autonomously without pausing for user
  confirmation on tool calls.
- **Core Functionality:**
    - The application must be able to accept a command-line flag on startup, e.g., `tobi --unchained`.
    - If this flag is present, the agent's behavior changes: it must bypass the `tool-request` state.
    - When the LLM generates tool calls, the agent should immediately proceed to the `executing-tool` state without
      waiting for user input.
- **Implementation Guidance:**
    1. **Dependencies:** Add a CLI argument parsing library (`npm install commander`).
    2. In `src/cli.ts`, use `commander` to define the `--unchained` flag. Pass the value of this flag as a prop to the
       main `<App>` component.
    3. Add a boolean `isUnchained: boolean` to the Zustand store, initialized from the prop.
    4. In `src/agent/state.ts`, inside `_runAgentLogic`, after the LLM returns tool calls, check the `isUnchained` flag.
        - If `true`, call the `actions.confirmToolExecution()` action immediately.
        - If `false`, set the status to `tool-request` as normal.
- **Reference (Octofriend):** `source/cli.tsx` (for the commander setup) and the conditional logic in `source/state.ts`.
