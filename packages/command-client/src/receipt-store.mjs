import fs from "node:fs/promises";
import path from "node:path";
import {stableStringify} from "./canonical-json.mjs";
import {OperationsError} from "./errors.mjs";

// Immutable local receipts, one file per execution id. Writing the same
// receipt again is a no-op; writing a different one under the same id fails.
export class LocalReceiptStore {
  constructor(root, {conflictCode = "COMMAND_RECEIPT_CONFLICT"} = {}) {
    this.root = path.resolve(root);
    this.conflictCode = conflictCode;
  }

  async put(receipt) {
    await fs.mkdir(this.root, {recursive: true});
    const target = path.join(this.root, `${receipt.executionId}.json`);
    const temporary = `${target}.${process.pid}.tmp`;
    const content = `${stableStringify(receipt, {space: 2})}\n`;
    const existing = await readIfPresent(target);
    if (existing !== null) return this.resolveExisting(target, existing, content);
    await fs.writeFile(temporary, content, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
    try {
      await fs.link(temporary, target);
      return target;
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      return this.resolveExisting(target, await fs.readFile(target, "utf8"), content);
    } finally {
      await fs.unlink(temporary).catch(() => undefined);
    }
  }

  resolveExisting(target, existing, content) {
    if (existing === content) return target;
    throw new OperationsError(
      this.conflictCode,
      "A different immutable local receipt already uses this execution id.",
      {details: {receiptPath: target}}
    );
  }
}

async function readIfPresent(target) {
  try {
    return await fs.readFile(target, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}
