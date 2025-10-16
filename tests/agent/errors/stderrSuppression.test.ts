import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };
let originalWrite: typeof process.stderr.write;

function makeMockLogger() {
  return { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } as any;
}

describe("stderr suppression gating", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.BINHARIC_SUPPRESS_STDERR;
    originalWrite = process.stderr.write;
  });

  afterEach(async () => {
    const mod = await import("../../../src/agent/errors/stderrSuppression.js");
    mod.restoreStderrWrite();
    process.stderr.write = originalWrite;
    process.env = { ...ORIGINAL_ENV };
  });

  it("is enabled by default and suppresses matching stderr output", async () => {
    const writeSpy = vi.fn();
    process.stderr.write = writeSpy as any;

    const logger = makeMockLogger();
    const { initStderrSuppression } = await import("../../../src/agent/errors/stderrSuppression.js");

    initStderrSuppression(logger);

    process.stderr.write("APICallError: test stack\n");

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(writeSpy).not.toHaveBeenCalled();
  });

  it("can be disabled via BINHARIC_SUPPRESS_STDERR=false and passes through writes", async () => {
    process.env.BINHARIC_SUPPRESS_STDERR = "false";

    const writeSpy = vi.fn();
    process.stderr.write = writeSpy as any;

    const logger = makeMockLogger();
    const { initStderrSuppression } = await import("../../../src/agent/errors/stderrSuppression.js");

    initStderrSuppression(logger);

    process.stderr.write("APICallError: will not be suppressed\n");

    expect(writeSpy).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
  });
});

