// src/agent/tools/definitions/index.ts
import readFileTool from "./readFile.js";
import listTool from "./list.js";
import createTool from "./create.js";
import editTool from "./edit.js";
import bashTool from "./bash.js";
import fetchTool from "./fetch.js";
import mcpTool from "./mcp.js";
import searchTool from "./search.js";
import insertEditIntoFileTool from "./insertEditIntoFile.js";
import { getTerminalOutputTool, runInTerminalTool } from "./terminalSession.js";
import getErrorsTool from "./getErrors.js";
import grepSearchTool from "./grepSearch.js";
import validateTool from "./validate.js";
import gitTools from "./git.js";
import diffTools from "./diff.js";
import multiReadTools from "./multiRead.js";

export const tools = {
    read_file: readFileTool,
    list: listTool,
    create: createTool,
    edit: editTool,
    bash: bashTool,
    fetch: fetchTool,
    mcp: mcpTool,
    search: searchTool,
    insert_edit_into_file: insertEditIntoFileTool,
    run_in_terminal: runInTerminalTool,
    get_terminal_output: getTerminalOutputTool,
    get_errors: getErrorsTool,
    grep_search: grepSearchTool,
    validate: validateTool,
    ...gitTools,
    ...diffTools,
    ...multiReadTools,
};
