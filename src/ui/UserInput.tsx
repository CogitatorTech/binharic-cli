import React, { useEffect, useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import TextInput from "ink-text-input";
import { useStore } from "@/agent/core/state.js";
import { useShallow } from "zustand/react/shallow";
import { CommandAutocomplete } from "./CommandAutocomplete.js";
import { HighlightedInput } from "./HighlightedInput.js";
import { FileSearch } from "./FileSearch.js";
import { getCommandSuggestions } from "./commandRegistry.js";
import { runTool } from "@/agent/tools/index.js";
import { randomUUID } from "crypto";

const MAX_VISIBLE_FILES = 5;
const MAX_VISIBLE_COMMANDS = 10;

export function UserInput() {
    const [useStateInput, setInputValue] = useState("");
    const [searchActive, setSearchActive] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<string[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [visibleFileCount, setVisibleFileCount] = useState(MAX_VISIBLE_FILES);
    const [commandAutocompleteActive, setCommandAutocompleteActive] = useState(false);
    const [commandSuggestions, setCommandSuggestions] = useState<
        ReturnType<typeof getCommandSuggestions>
    >([]);
    const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);

    const {
        startAgent,
        status,
        openHelpMenu,
        closeHelpMenu,
        helpMenuOpen,
        clearOutput,
        clearCommandHistory,
        getPreviousCommand,
        getNextCommand,
        setSystemPrompt,
        setModel,
        addCommandToHistory,
        addContextFile,
        config,
        stopAgent,
    } = useStore(
        useShallow((s) => ({
            startAgent: s.actions.startAgent,
            status: s.status,
            openHelpMenu: s.actions.openHelpMenu,
            closeHelpMenu: s.actions.closeHelpMenu,
            helpMenuOpen: s.helpMenuOpen,
            clearOutput: s.actions.clearOutput,
            clearCommandHistory: s.actions.clearCommandHistory,
            getPreviousCommand: s.actions.getPreviousCommand,
            getNextCommand: s.actions.getNextCommand,
            setSystemPrompt: s.actions.setSystemPrompt,
            setModel: s.actions.setModel,
            addCommandToHistory: s.actions.addCommandToHistory,
            addContextFile: s.actions.addContextFile,
            config: s.config,
            stopAgent: s.actions.stopAgent,
        })),
    );
    const { exit } = useApp();

    const isAgentBusy = status === "responding" || status === "executing-tool";
    const canSubmitNewRequest = status === "idle" || status === "error";

    useEffect(() => {
        const lastAtIndex = useStateInput.lastIndexOf("@");
        if (lastAtIndex !== -1) {
            const query = useStateInput.slice(lastAtIndex + 1);
            if (query.includes(" ")) {
                setSearchActive(false);
                return;
            }
            setSearchActive(true);
            setSearchQuery(query);
            setSelectedIndex(0);
            setVisibleFileCount(MAX_VISIBLE_FILES);
            setCommandAutocompleteActive(false);
        } else {
            setSearchActive(false);
        }

        if (useStateInput.startsWith("/") && !useStateInput.includes(" ")) {
            const suggestions = getCommandSuggestions(useStateInput);
            setCommandSuggestions(suggestions);
            setCommandAutocompleteActive(suggestions.length > 0);
            setSelectedCommandIndex(0);
        } else {
            setCommandAutocompleteActive(false);
        }
    }, [useStateInput]);

    useEffect(() => {
        if (searchActive) {
            const debounce = setTimeout(() => {
                if (searchQuery) {
                    runTool({ toolName: "search", args: { query: searchQuery } }, config!)
                        .then((result: unknown) => {
                            const files = (result as string).split("\n").filter(Boolean);
                            setSearchResults(files);
                        })
                        .catch(() => {
                            setSearchResults([]);
                        });
                } else {
                    setSearchResults([]);
                }
            }, 300);
            return () => clearTimeout(debounce);
        }
    }, [searchQuery, searchActive, config]);

    useInput((input, key) => {
        if (key.escape) {
            if (isAgentBusy) {
                stopAgent();
                return;
            }
            if (commandAutocompleteActive) {
                setCommandAutocompleteActive(false);
                setInputValue("");
                return;
            }
            if (searchActive) {
                setSearchActive(false);
                setSearchResults([]);
                setInputValue("");
                return;
            }
        }

        if (commandAutocompleteActive) {
            if (key.upArrow) {
                setSelectedCommandIndex((prev) => (prev > 0 ? prev - 1 : prev));
            } else if (key.downArrow) {
                setSelectedCommandIndex((prev) =>
                    prev < commandSuggestions.length - 1 ? prev + 1 : prev,
                );
            } else if (key.tab || (key.return && commandSuggestions.length > 0)) {
                const selectedCommand = commandSuggestions[selectedCommandIndex];
                if (selectedCommand) {
                    setInputValue(selectedCommand.command + " ");
                    setCommandAutocompleteActive(false);
                }
            }
            return;
        }

        if (searchActive) {
            if (key.upArrow) {
                setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
            } else if (key.downArrow) {
                setSelectedIndex((prev) => {
                    const newIndex = prev + 1;
                    if (newIndex >= visibleFileCount && newIndex < searchResults.length) {
                        setVisibleFileCount((prevCount) => prevCount + 1);
                    }
                    return newIndex < searchResults.length ? newIndex : prev;
                });
            }
            return;
        }

        if (key.upArrow) {
            const prevCommand = getPreviousCommand();
            if (prevCommand !== null) {
                setInputValue(prevCommand);
            }
        } else if (key.downArrow) {
            const nextCommand = getNextCommand();
            if (nextCommand !== null) {
                setInputValue(nextCommand);
            }
        } else if (key.ctrl && input === "l") {
            clearOutput();
        }
    });

    const handleSubmit = async () => {
        const value = useStateInput.trim();

        if (value === "/help") {
            if (helpMenuOpen) {
                closeHelpMenu();
            } else {
                openHelpMenu();
            }
            setInputValue("");
            return;
        }

        if (helpMenuOpen) {
            closeHelpMenu();
        }

        if (commandAutocompleteActive && commandSuggestions.length > 0) {
            const selectedCommand = commandSuggestions[selectedCommandIndex];
            if (selectedCommand) {
                setInputValue(selectedCommand.command + " ");
                setCommandAutocompleteActive(false);
            }
            return;
        }

        if (searchActive && searchResults.length > 0) {
            const lastAtIndex = useStateInput.lastIndexOf("@");
            const file = searchResults[selectedIndex];
            if (file) {
                try {
                    const content = await runTool(
                        { toolName: "read_file", args: { path: file } },
                        config!,
                    );
                    const fileBlock = `File: ${file}\n\n${content}`;
                    const newValue = `${useStateInput.slice(0, lastAtIndex)}${fileBlock}`;
                    setInputValue(newValue);
                } catch (error) {
                    const newValue = `${useStateInput.slice(0, lastAtIndex)}@${file} `;
                    setInputValue(newValue);
                } finally {
                    setSearchActive(false);
                    setSearchResults([]);
                }
            }
            return;
        }

        if (value && canSubmitNewRequest) {
            addCommandToHistory(value);
            if (value.startsWith("/")) {
                const [command, ...args] = value.slice(1).split(" ");
                const rest = args.join(" ").trim();
                switch (command) {
                    case "clear":
                        clearOutput();
                        break;
                    case "clearHistory":
                        clearCommandHistory();
                        break;
                    case "quit":
                    case "exit":
                        exit();
                        break;
                    case "system":
                        setSystemPrompt(rest);
                        break;
                    case "model":
                        setModel(rest);
                        break;
                    case "add": {
                        if (rest.length > 0) {
                            rest.split(/\s+/)
                                .filter(Boolean)
                                .forEach((p) => addContextFile(p));
                        }
                        break;
                    }
                    case "models": {
                        if (config) {
                            const providers = new Map<string, typeof config.models>();
                            config.models.forEach((model) => {
                                if (!providers.has(model.provider)) {
                                    providers.set(model.provider, []);
                                }
                                providers.get(model.provider)!.push(model);
                            });

                            let output = "\n Available Models \n";

                            providers.forEach((models, provider) => {
                                const providerName =
                                    provider.charAt(0).toUpperCase() + provider.slice(1);
                                output += `${providerName}:\n`;

                                models.forEach((model) => {
                                    const isDefault = model.name === config.defaultModel;
                                    const marker = isDefault ? " (current)" : "";
                                    const contextSize = (model.context / 1000).toFixed(0) + "K";
                                    output += `  • ${model.name}${marker} - ${model.modelId} [${contextSize} context]\n`;
                                });
                            });

                            output += "\nUse '/model <name>' to switch models\n";

                            useStore.setState((state) => ({
                                history: [
                                    ...state.history,
                                    {
                                        id: randomUUID(),
                                        role: "assistant",
                                        content: output,
                                    },
                                ],
                            }));
                        }
                        break;
                    }
                    default:
                        startAgent(value);
                        break;
                }
            } else {
                switch (value) {
                    case "clear":
                        clearOutput();
                        break;
                    case "clear history":
                        clearCommandHistory();
                        break;
                    default:
                        startAgent(value);
                        break;
                }
            }
            setInputValue("");
        }
    };

    const visibleFiles = searchResults.slice(0, visibleFileCount);

    return (
        <Box flexDirection="column">
            {commandAutocompleteActive && commandSuggestions.length > 0 && (
                <CommandAutocomplete
                    query={useStateInput}
                    suggestions={commandSuggestions}
                    selectedIndex={selectedCommandIndex}
                    maxVisible={MAX_VISIBLE_COMMANDS}
                />
            )}
            {searchActive && searchResults.length > 0 && (
                <FileSearch
                    query={searchQuery}
                    visibleFiles={visibleFiles}
                    totalFiles={searchResults.length}
                    selectedIndex={selectedIndex}
                />
            )}
            {useStateInput.startsWith("/") &&
                useStateInput.length > 1 &&
                !commandAutocompleteActive && (
                    <Box marginBottom={1}>
                        <HighlightedInput value={useStateInput} placeholder="" />
                    </Box>
                )}
            <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
                <Box>
                    <Text color="cyan" bold>
                        &gt;{" "}
                    </Text>
                    <TextInput
                        value={useStateInput}
                        onChange={setInputValue}
                        onSubmit={handleSubmit}
                        placeholder={
                            isAgentBusy
                                ? "Agent is working... (Press Esc to cancel)"
                                : "Type your message or @path/to/file"
                        }
                    />
                </Box>
            </Box>
        </Box>
    );
}
