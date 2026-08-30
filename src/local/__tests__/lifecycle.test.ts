import { describe, expect, it, vi } from "vitest";
import { closeServer, startupErrorMessage } from "../lifecycle";

describe("local server lifecycle", () => {
  it("turns EADDRINUSE into an actionable message without a stack trace", async () => {
    const error = Object.assign(new Error("listen EADDRINUSE: address already in use :::3901"), {
      code: "EADDRINUSE",
    });

    const message = await startupErrorMessage(error, 3901, async () => 4242);

    expect(message).toContain("port 3901 is already in use (PID 4242)");
    expect(message).toContain("lsof -nP -iTCP:3901 -sTCP:LISTEN");
    expect(message).toContain("PORT=3902 pnpm dev");
    expect(message).not.toContain("at Server");
  });

  it("keeps non-listen startup errors concise", async () => {
    await expect(startupErrorMessage(new Error("broken catalog"), 3901)).resolves.toBe(
      "MCPIMP could not start: broken catalog",
    );
  });

  it("waits for the server close callback", async () => {
    let callback: ((error?: Error) => void) | undefined;
    const server = {
      close: vi.fn((next: (error?: Error) => void) => {
        callback = next;
      }),
    };

    const closing = closeServer(server, 1_000);
    expect(server.close).toHaveBeenCalledOnce();
    callback?.();
    await closing;
  });
});
