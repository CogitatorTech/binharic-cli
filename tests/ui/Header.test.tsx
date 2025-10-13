import React from "react";
import { render } from "ink-testing-library";
import { Header } from "../../src/ui/Header";
import { describe, expect, it } from "vitest";

describe("Header", () => {
    it("should render the header with tips", () => {
        const { lastFrame } = render(<Header />);

        // Check for the Mechanicus-themed tips (more stable than testing ASCII art)
        expect(lastFrame()).toContain("Praise the Omnissiah!");
        expect(lastFrame()).toContain("1. Ask questions, edit files, or run commands.");
        expect(lastFrame()).toContain("2. Be specific for the best results.");
        expect(lastFrame()).toContain("3. Type /help for more information.");
    });
});
