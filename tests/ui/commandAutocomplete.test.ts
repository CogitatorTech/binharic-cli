import { describe, it, expect } from "vitest";
import { getCommandSuggestions, COMMAND_REGISTRY, getCategoryColor } from "@/ui/commandRegistry.js";

describe("Command Registry and Autocomplete", () => {
    describe("COMMAND_REGISTRY", () => {
        it("should have all essential commands", () => {
            const commandNames = COMMAND_REGISTRY.map((cmd) => cmd.command);

            expect(commandNames).toContain("/help");
            expect(commandNames).toContain("/clear");
            expect(commandNames).toContain("/quit");
            expect(commandNames).toContain("/exit");
            expect(commandNames).toContain("/model");
            expect(commandNames).toContain("/system");
        });

        it("should have tool commands", () => {
            const commandNames = COMMAND_REGISTRY.map((cmd) => cmd.command);

            expect(commandNames).toContain("/read_file");
            expect(commandNames).toContain("/list");
            expect(commandNames).toContain("/search");
            expect(commandNames).toContain("/create");
            expect(commandNames).toContain("/edit");
        });

        it("should have git commands", () => {
            const commandNames = COMMAND_REGISTRY.map((cmd) => cmd.command);

            expect(commandNames).toContain("/git_status");
            expect(commandNames).toContain("/git_log");
            expect(commandNames).toContain("/git_diff");
        });

        it("should have descriptions for all commands", () => {
            COMMAND_REGISTRY.forEach((cmd) => {
                expect(cmd.description).toBeTruthy();
                expect(cmd.description.length).toBeGreaterThan(0);
            });
        });

        it("should have categories for all commands", () => {
            COMMAND_REGISTRY.forEach((cmd) => {
                expect(cmd.category).toBeTruthy();
                expect(["system", "config", "context", "tool", "git", "diff"]).toContain(
                    cmd.category,
                );
            });
        });
    });

    describe("getCommandSuggestions", () => {
        it("should return all commands when query is /", () => {
            const suggestions = getCommandSuggestions("/");
            expect(suggestions.length).toBe(COMMAND_REGISTRY.length);
        });

        it("should return all commands when query is empty", () => {
            const suggestions = getCommandSuggestions("");
            expect(suggestions.length).toBe(COMMAND_REGISTRY.length);
        });

        it("should filter commands by name", () => {
            const suggestions = getCommandSuggestions("/help");
            expect(suggestions.length).toBeGreaterThan(0);
            expect(suggestions.some((s) => s.command === "/help")).toBe(true);
        });

        it("should filter commands by partial match", () => {
            const suggestions = getCommandSuggestions("/git");
            expect(suggestions.length).toBeGreaterThan(0);
            suggestions.forEach((s) => {
                expect(s.command.toLowerCase()).toContain("git");
            });
        });

        it("should be case insensitive", () => {
            const lower = getCommandSuggestions("/help");
            const upper = getCommandSuggestions("/HELP");
            expect(lower.length).toBe(upper.length);
        });

        it("should search in descriptions", () => {
            const suggestions = getCommandSuggestions("exit");
            expect(suggestions.length).toBeGreaterThan(0);
            const hasExitCommand = suggestions.some(
                (s) => s.command === "/exit" || s.command === "/quit",
            );
            expect(hasExitCommand).toBe(true);
        });

        it("should filter system commands", () => {
            const suggestions = getCommandSuggestions("clear");
            expect(suggestions.length).toBeGreaterThan(0);
            expect(suggestions.some((s) => s.command === "/clear")).toBe(true);
            expect(suggestions.some((s) => s.command === "/clearHistory")).toBe(true);
        });

        it("should handle queries with no matches gracefully", () => {
            const suggestions = getCommandSuggestions("/xyz123notexist");
            expect(suggestions.length).toBe(0);
        });
    });

    describe("getCategoryColor", () => {
        it("should return correct colors for categories", () => {
            expect(getCategoryColor("system")).toBe("yellow");
            expect(getCategoryColor("config")).toBe("blue");
            expect(getCategoryColor("context")).toBe("magenta");
            expect(getCategoryColor("tool")).toBe("cyan");
            expect(getCategoryColor("git")).toBe("green");
        });

        it("should return white for unknown category", () => {
            expect(getCategoryColor("unknown")).toBe("white");
            expect(getCategoryColor(undefined)).toBe("white");
        });
    });

    describe("Command completeness", () => {
        it("should have all system commands", () => {
            const systemCommands = COMMAND_REGISTRY.filter((cmd) => cmd.category === "system");
            expect(systemCommands.length).toBeGreaterThanOrEqual(4);

            const systemCommandNames = systemCommands.map((cmd) => cmd.command);
            expect(systemCommandNames).toContain("/help");
            expect(systemCommandNames).toContain("/clear");
            expect(systemCommandNames).toContain("/quit");
            expect(systemCommandNames).toContain("/exit");
        });

        it("should have config commands", () => {
            const configCommands = COMMAND_REGISTRY.filter((cmd) => cmd.category === "config");
            expect(configCommands.length).toBeGreaterThanOrEqual(2);

            const configCommandNames = configCommands.map((cmd) => cmd.command);
            expect(configCommandNames).toContain("/model");
            expect(configCommandNames).toContain("/system");
        });

        it("should have context commands", () => {
            const contextCommands = COMMAND_REGISTRY.filter((cmd) => cmd.category === "context");
            expect(contextCommands.length).toBeGreaterThanOrEqual(1);

            const contextCommandNames = contextCommands.map((cmd) => cmd.command);
            expect(contextCommandNames).toContain("/add");
        });

        it("should have multiple tool commands", () => {
            const toolCommands = COMMAND_REGISTRY.filter((cmd) => cmd.category === "tool");
            expect(toolCommands.length).toBeGreaterThanOrEqual(10);
        });

        it("should have git commands", () => {
            const gitCommands = COMMAND_REGISTRY.filter((cmd) => cmd.category === "git");
            expect(gitCommands.length).toBeGreaterThanOrEqual(3);
        });
    });
});
