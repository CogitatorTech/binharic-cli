// src/ui/UserInput.tsx
// CORRECTED: Updated the status check to use the new 'responding' state.

import React, { useEffect, useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import TextInput from "ink-text-input";
import { useStore } from "@/agent/state.js";
import { useShallow } from "zustand/react/shallow";
import { FileSearch } from "./FileSearch.js";
import { runTool } from "@/agent/tools/index.js";

const MAX_VISIBLE_FILES = 5;

export function UserInput() {
    const [useStateInput, setInputValue] = useState("");
    const [searchActive, setSearchActive] = useState(false);
    // ... (other state hooks remain the same) ...
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<string[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [visibleFileCount, setVisibleFileCount] = useState(MAX_VISIBLE_FILES);

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
        config,
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
            config: s.config,
        })),
    );
    const { exit } = useApp();

    // CORRECTED: The 'thinking' status is now 'responding'.
    const isAgentBusy = status === "responding" || status === "executing-tool";

    // ... (the rest of the component's logic and hooks remain the same) ...
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
        } else {
            setSearchActive(false);
        }
    }, [useStateInput]);

    useEffect(() => {
        if (searchActive) {
            const debounce = setTimeout(() => {
                if (searchQuery) {
                    runTool({ toolName: "search", args: { query: searchQuery } }, config!)
                        .then((result) => {
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
        } else if (!isAgentBusy) {
            if (key.upArrow) {
                const prevCommand = getPreviousCommand();
                if (prevCommand) {
                    setInputValue(prevCommand);
                }
            } else if (key.downArrow) {
                const nextCommand = getNextCommand();
                setInputValue(nextCommand ?? "");
            } else if (key.ctrl && input === "l") {
                clearOutput();
            }
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

        if (searchActive && searchResults.length > 0) {
            const lastAtIndex = useStateInput.lastIndexOf("@");
            const file = searchResults[selectedIndex];
            if (file) {
                try {
                    const content = await runTool(
                        { toolName: "readFile", args: { path: file } },
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

        if (value && !isAgentBusy) {
            addCommandToHistory(value);
            if (value.startsWith("/")) {
                const [command, ...args] = value.slice(1).split(" ");
                const rest = args.join(" ");
                switch (command) {
                    case "clear":
                        clearOutput();
                        break;
                    case "clearHistory":
                        clearCommandHistory();
                        break;
                    case "quit":
                        exit();
                        break;
                    case "system":
                        setSystemPrompt(rest);
                        break;
                    case "model":
                        setModel(rest);
                        break;
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
            {searchActive && searchResults.length > 0 && (
                <FileSearch
                    query={searchQuery}
                    visibleFiles={visibleFiles}
                    totalFiles={searchResults.length}
                    selectedIndex={selectedIndex}
                />
            )}
            <Box borderStyle="round" borderColor="blue" marginTop={1}>
                <Text>&gt; </Text>
                <TextInput
                    value={useStateInput}
                    onChange={setInputValue}
                    onSubmit={handleSubmit}
                    placeholder={isAgentBusy ? "..." : "Type your message..."}
                />
            </Box>
        </Box>
    );
}
