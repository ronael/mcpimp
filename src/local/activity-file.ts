import { mkdir, open, rename, unlink, type FileHandle } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { McpActivityEvent } from "../mcp/activity";

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;
const DEFAULT_MAX_ARCHIVES = 5;

export interface ActivityFileOptions {
  path: string;
  maxBytes: number;
  maxArchives: number;
  onError?: (error: Error) => void;
}

function integerSetting(
  env: Record<string, string | undefined>,
  name: string,
  fallback: number,
  minimum: number,
): number {
  const raw = env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new Error(`${name} must be an integer greater than or equal to ${minimum}`);
  }
  return value;
}

export function activityFileOptionsFromEnv(
  root: string,
  env: Record<string, string | undefined> = process.env,
): Omit<ActivityFileOptions, "onError"> {
  return {
    path: join(root, "logs", "mcpimp.ndjson"),
    maxBytes: integerSetting(env, "MCPIMP_ACTIVITY_MAX_BYTES", DEFAULT_MAX_BYTES, 1),
    maxArchives: integerSetting(env, "MCPIMP_ACTIVITY_MAX_ARCHIVES", DEFAULT_MAX_ARCHIVES, 0),
  };
}

async function ignoreMissing(operation: () => Promise<unknown>): Promise<void> {
  try {
    await operation();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

export class ActivityFileWriter {
  #handle: FileHandle;
  #currentBytes: number;
  #pending = Promise.resolve();
  #closed = false;
  #lastError?: Error;

  private constructor(private readonly options: ActivityFileOptions, handle: FileHandle, currentBytes: number) {
    this.#handle = handle;
    this.#currentBytes = currentBytes;
  }

  static async open(options: ActivityFileOptions): Promise<ActivityFileWriter> {
    if (!Number.isSafeInteger(options.maxBytes) || options.maxBytes < 1) {
      throw new Error("Activity maxBytes must be a positive integer");
    }
    if (!Number.isSafeInteger(options.maxArchives) || options.maxArchives < 0) {
      throw new Error("Activity maxArchives must be a non-negative integer");
    }

    await mkdir(dirname(options.path), { recursive: true });
    const handle = await open(options.path, "a");
    const current = await handle.stat();
    return new ActivityFileWriter(options, handle, current.size);
  }

  append(event: McpActivityEvent): void {
    if (this.#closed) throw new Error("Activity file writer is closed");
    const line = `${JSON.stringify(event)}\n`;
    this.#pending = this.#pending
      .then(() => this.#write(line))
      .catch((error) => {
        this.#lastError = error instanceof Error ? error : new Error(String(error));
        this.options.onError?.(this.#lastError);
      });
  }

  async flush(): Promise<void> {
    await this.#pending;
    if (this.#lastError) throw this.#lastError;
    await this.#handle.sync();
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    this.#closed = true;
    await this.#pending;
    await this.#handle.close();
    if (this.#lastError) throw this.#lastError;
  }

  async #write(line: string): Promise<void> {
    const bytes = Buffer.byteLength(line);
    if (this.#currentBytes > 0 && this.#currentBytes + bytes > this.options.maxBytes) {
      await this.#rotate();
    }
    await this.#handle.writeFile(line);
    this.#currentBytes += bytes;
  }

  async #rotate(): Promise<void> {
    await this.#handle.close();

    if (this.options.maxArchives === 0) {
      await ignoreMissing(() => unlink(this.options.path));
    } else {
      await ignoreMissing(() => unlink(`${this.options.path}.${this.options.maxArchives}`));
      for (let index = this.options.maxArchives - 1; index >= 1; index -= 1) {
        await ignoreMissing(() => rename(`${this.options.path}.${index}`, `${this.options.path}.${index + 1}`));
      }
      await ignoreMissing(() => rename(this.options.path, `${this.options.path}.1`));
    }

    this.#handle = await open(this.options.path, "a");
    this.#currentBytes = 0;
  }
}
