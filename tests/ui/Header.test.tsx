import React from "react";
import { render } from "ink-testing-library";
import { Header } from "../../src/ui/Header";
import { describe, expect, it } from "vitest";

describe("Header", () => {
    it("should render the header with logo and tips", () => {
        const { lastFrame } = render(<Header />);

        // Check for the logo (or a part of it)
        expect(lastFrame()).toContain("████████╗");

        // Check for the tips
        expect(lastFrame()).toContain("Tips for getting started:");
        expect(lastFrame()).toContain("1. Ask questions, edit files, or run commands.");
        expect(lastFrame()).toContain("2. Be specific for the best results.");
        expect(lastFrame()).toContain("3. Type /help for more information.");
    });
});
