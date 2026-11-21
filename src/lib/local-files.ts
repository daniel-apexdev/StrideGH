import "server-only";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

/** Small JSON files in data/local/, used until Supabase is connected. */

export async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw e;
  }
}

export async function writeJson(file: string, value: unknown) {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(value, null, 2) + "\n", "utf8");
  await rename(tmp, file);
}

/** One write at a time so two quick submissions can't overwrite each other. */
let queue: Promise<unknown> = Promise.resolve();
export function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}


/** Path of a file in the local data folder (STRIDE_LOCAL_DATA_DIR overrides it, e.g. in tests). */
export function localFile(name: string): string {
  return path.join(process.env.STRIDE_LOCAL_DATA_DIR ?? path.join(process.cwd(), "data", "local"), name);
}
