// src/agent/tools/definitions/index.ts
import readFile from "./readFile.js";
import list from "./list.js";
import create from "./create.js";
import edit from "./edit.js";
import bash from "./bash.js";
import fetch from "./fetch.js";
import mcp from "./mcp.js";
import search from "./search.js";
import insertEditIntoFile from "./insertEditIntoFile.js";
import { runInTerminal, getTerminalOutput } from "./terminalSession.js";
import getErrors from "./getErrors.js";
import grepSearch from "./grepSearch.js";

// Export the full module definitions as a single object
export const toolModules = {
    read_file: readFile,
    list,
    create,
    edit,
    bash,
    fetch,
    mcp,
    search,
    insert_edit_into_file: insertEditIntoFile,
    run_in_terminal: runInTerminal,
    get_terminal_output: getTerminalOutput,
    get_errors: getErrors,
    grep_search: grepSearch,
};

// Create and export an array of just the schemas for convenience
export const toolSchemas = [
    readFile.schema,
    list.schema,
    create.schema,
    edit.schema,
    bash.schema,
    fetch.schema,
    mcp.schema,
    search.schema,
    insertEditIntoFile.schema,
    runInTerminal.schema,
    getTerminalOutput.schema,
    getErrors.schema,
    grepSearch.schema,
] as const;

// Add this to src/agent/tools/definitions/index.ts
export const toolArgumentSchemas = {
    read_file: readFile.schema.shape.arguments,
    list: list.schema.shape.arguments,
    create: create.schema.shape.arguments,
    edit: edit.schema.shape.arguments,
    bash: bash.schema.shape.arguments,
    fetch: fetch.schema.shape.arguments,
    mcp: mcp.schema.shape.arguments,
    search: search.schema.shape.arguments,
    insert_edit_into_file: insertEditIntoFile.schema.shape.arguments,
    run_in_terminal: runInTerminal.schema.shape.arguments,
    get_terminal_output: getTerminalOutput.schema.shape.arguments,
    get_errors: getErrors.schema.shape.arguments,
    grep_search: grepSearch.schema.shape.arguments,
};
