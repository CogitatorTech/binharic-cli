import React from "react";
import { render } from "ink-testing-library";
import { Header } from "@/ui/Header.js";
import { describe, it, expect } from "vitest";

describe("Header", () => {
    it("should render the header with logo and tips", () => {
        const { lastFrame } = render(<Header />);

        expect(lastFrame()).toContain("BINHARIC");
        expect(lastFrame()).toContain("1. Ask questions, edit files, or run commands.");
        expect(lastFrame()).toContain("2. Be specific for the best results.");
        expect(lastFrame()).toContain(
            "3. Create BINHARIC.md files to customize your interactions with Binharic.",
        );
        expect(lastFrame()).toContain("4. /help for more information.");
    });
});
