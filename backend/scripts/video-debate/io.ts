import { randomUUID } from "node:crypto";
import { mkdir, open, rename, unlink } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

function missingFile(error: unknown): boolean {
  if (typeof error !== "object" || error === null || Array.isArray(error)) return false;
  return Object.entries(error).some(([key, value]) => key === "code" && value === "ENOENT");
}

export async function writeTextAtomic(
  path: string,
  value: string,
  temporaryId: () => string = randomUUID,
): Promise<void> {
  const directory = dirname(path);
  const temporaryPath = join(directory, `.${basename(path)}.${temporaryId()}.tmp`);
  let file: Awaited<ReturnType<typeof open>> | undefined;
  let ownsTemporaryPath = false;
  try {
    await mkdir(directory, { recursive: true });
    file = await open(temporaryPath, "wx", 0o600);
    ownsTemporaryPath = true;
    await file.writeFile(value, "utf8");
    await file.sync();
    await file.close();
    file = undefined;
    await rename(temporaryPath, path);
  } catch (error) {
    await file?.close();
    if (ownsTemporaryPath) {
      await unlink(temporaryPath).catch((unlinkError: unknown) => {
        if (!missingFile(unlinkError)) throw unlinkError;
      });
    }
    throw error;
  }
}

export async function writeJsonAtomic(path: string, value: unknown): Promise<void> {
  await writeTextAtomic(path, `${JSON.stringify(value, null, 2)}\n`);
}
