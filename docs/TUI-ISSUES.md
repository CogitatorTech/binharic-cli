Based on my analysis of the application's state management (`src/agent/state.ts`) and overall architecture, I can
identify several potential issues, missing features, and areas for improvement in the Terminal User Interface (TUI).
While I cannot see the specific React code for the UI components, the state is the source of truth that dictates the
UI's capabilities.

Here is my breakdown.

### 1. Potential UI Issues That Need to Be Fixed

These are fundamental user experience problems that likely exist due to the current agent logic.

1. **No Response Streaming:** The `_runAgentLogic` function awaits the full response from the LLM before updating the
   history. This means the user sees a "thinking" indicator for a potentially long time and then gets a large block of
   text all at once. For a chat application, this feels slow and unresponsive. The UI is not showing progress.
2. **No Interactive Confirmation for Dangerous Tools:** The agent executes tools like `bash` (arbitrary command
   execution) and `edit` (file modification/overwriting) immediately upon the LLM's decision. This is a significant
   safety risk. The user is given no opportunity to review and approve potentially destructive operations before they
   happen.
3. **Lack of Granular Status Updates:** The `mode` state is limited to `"idle"`, `"thinking"`, or `"running-tool"`. If
   the LLM decides to run three tools in sequence, the user will only see a generic "running-tool" status. They won't
   know which tool is currently active (`readFile`, `bash`, etc.) or what the progress is. This lack of feedback can be
   confusing.
4. **Unstructured Tool Output:** Tool calls and their results are likely rendered as plain text or stringified JSON in
   the history. This makes it difficult to distinguish a tool's operations from the AI's conversational text and can be
   hard to read, especially for complex outputs.

### 2. Suggestions for UI/UX Improvements

These are suggestions to enhance the existing UI, making it more polished and user-friendly.

1. **Implement a Collapsible, Rich Display for Tool Calls:**
    - Each tool call in the history should be a distinct, structured component.
    - It should clearly show the tool name and arguments (e.g., `edit(path: 'src/main.ts', ...)`).
    - The component should be collapsible, hiding the (potentially long) tool output by default to keep the chat history
      clean.
    - For the `edit` tool, render its output as a colorized diff (`+` for additions, `-` for deletions) instead of just
      new content.

2. **Enhance the Footer/Status Bar:**
    - Use the `mode` state to display more descriptive text: "Tobi is thinking...", "Running `bash`...", "Waiting for
      confirmation...".
    - Display the current Git branch (`branchName` from the store) prominently.
    - Show dynamic keyboard shortcuts relevant to the current context (e.g., `Y/N` for confirmation prompts).

3. **Improve the User Input Component:**
    - Add support for multi-line input (`Shift+Enter` for a new line) to allow users to paste code blocks or write more
      complex prompts easily.
    - Consider basic autocomplete for file paths when the user is typing arguments for tools like `readFile` or `edit`.

4. **Add Syntax Highlighting:**
    - All code blocks, whether from the user, the assistant, or tool results, should have syntax highlighting to improve
      readability. There are several libraries that can achieve this in an Ink TUI.

### 3. Missing TUI Features (Compared to Similar Tools)

These are larger features commonly found in modern AI assistants that are absent from Tobi's current design.

1. **Interactive User Confirmation Workflow:** This is the most critical missing feature. The TUI needs a workflow where
   it can:
    - Pause execution when the agent wants to run a tool.
    - Display the planned tool call(s) to the user in a clear format.
    - Prompt the user for approval (`[Y]es / [N]o / [A]lways / [E]dit`).
    - Allow the user to edit the arguments of a tool call before execution.
    - The state machine needs a new mode like `awaiting-confirmation` to support this.

2. **Explicit Context Management:** The user currently has no way to see or manage which files the AI "knows about." A
   key feature of tools like this is the ability to manually add files to the context.
    - **Missing UI:** A dedicated panel or command (`/add <file_path>`) to add files to the conversation context. The UI
      should display a list of these active files.
    - **Missing Logic:** The `FileTracker` is for safety, but there's no corresponding "ContextManager" that holds the
      content of files explicitly added by the user to be included in subsequent LLM prompts.

3. **Session Management:** The application appears to have one continuous history. Users often need to work on multiple,
   distinct tasks.
    - **Missing UI:** Commands or keybindings to save the current session, start a new one, and list/load previous
      sessions.

4. **"Plan" Visualization:** More advanced agents first generate a step-by-step plan before execution. Tobi follows a
   simpler one-step-at-a-time loop.
    - **Missing Feature:** The ability for the agent to output a plan (e.g., 1. Read `package.json`. 2. Install
      dependencies with `bash`. 3. Read `src/index.ts`.). The TUI should then display this as a checklist, updating it
      as the agent completes each step. This gives the user immense insight into the AI's intentions.

5. **In-App Configuration:** To change the model or system prompt, the user must edit the `config.json5` file and
   restart the app.
    - **Missing UI:** Special commands within the TUI to manage configuration on the fly, for example:
        - `/model claude-3.5-sonnet` to switch the active LLM.
        - `/system "You are an expert in React."` to change the system prompt for the current session.
        - `/clear` to clear the current session history. (The `clearHistory` action exists but needs to be exposed).
