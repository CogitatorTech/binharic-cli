import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: () => () => ({})
}));

const streamObjectMock = vi.fn();
vi.mock("ai", () => ({
  streamObject: (...args: any[]) => streamObjectMock(...args)
}));

describe("autofix workflows", () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    vi.useRealTimers();
    Object.assign(process.env, ORIGINAL_ENV);
    delete process.env.OPENAI_API_KEY;
    streamObjectMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    process.env = { ...ORIGINAL_ENV };
  });

  it("autofixEdit returns null when OPENAI_API_KEY is missing", async () => {
    const { autofixEdit } = await import("../../../src/agent/workflows/autofix.js");
    const res = await autofixEdit("content", "search");
    expect(res).toBeNull();
    expect(streamObjectMock).not.toHaveBeenCalled();
  });

  it("autofixJson returns null when OPENAI_API_KEY is missing", async () => {
    const { autofixJson } = await import("../../../src/agent/workflows/autofix.js");
    const res = await autofixJson((await import("zod")).z.object({ ok: (await import("zod")).z.string() }), "{}");
    expect(res).toBeNull();
    expect(streamObjectMock).not.toHaveBeenCalled();
  });

  it("autofixEdit times out and returns null without leaking", async () => {
    process.env.OPENAI_API_KEY = "test";
    streamObjectMock.mockImplementation(() => new Promise(() => {}));

    const { autofixEdit } = await import("../../../src/agent/workflows/autofix.js");

    vi.useFakeTimers();
    const promise = autofixEdit("file content", "missing");

    vi.advanceTimersByTime(10000);
    const res = await promise;
    expect(res).toBeNull();
  });

  it("autofixEdit returns corrected search when present in file", async () => {
    process.env.OPENAI_API_KEY = "test";
    streamObjectMock.mockResolvedValue({
      object: Promise.resolve({ success: true, correctedSearch: "needle", confidence: "high" })
    });

    const { autofixEdit } = await import("../../../src/agent/workflows/autofix.js");
    const res = await autofixEdit("haystack with needle inside", "x");
    expect(res).toBe("needle");
  });

  it("autofixJson parses and returns validated object", async () => {
    process.env.OPENAI_API_KEY = "test";
    streamObjectMock.mockResolvedValue({ object: Promise.resolve({ ok: "yes" }) });

    const { autofixJson } = await import("../../../src/agent/workflows/autofix.js");
    const { z } = await import("zod");
    const schema = z.object({ ok: z.string() });
    const res = await autofixJson(schema, "broken");
    expect(res).toEqual({ ok: "yes" });
  });
});

