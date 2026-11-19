#!/usr/bin/env node
import {parseCommonArgs, isMain} from "../../../tool/lib/cli_args.mjs";
import {applyFirestoreEmulatorHost, assertProdWriteAllowed, resolveFirebaseProjectId} from "../../../tool/lib/firebase_project.mjs";
import {createFunctionsRequire} from "../../../tool/lib/repo_paths.mjs";
import {parsePublicContactDocument, validPublicContactEmail} from "../../src/content/publicContact.ts";

const documentPath = "config/publicContact";

export function planPublicContactChange(raw, expectedRevision, supportEmail) {
  if (!validPublicContactEmail(supportEmail)) throw new Error("Invalid public contact email");
  const before = raw === null ? null : parsePublicContactDocument(raw);
  if (raw !== null && before === null) throw new Error("Existing public contact document is malformed; preserve and investigate it");
  if (expectedRevision !== (before?.revision ?? "absent")) throw new Error("Public contact revision changed; refresh the plan");
  if (before?.supportEmail === supportEmail) throw new Error("Public contact already has this address");
  if (before?.revision === Number.MAX_SAFE_INTEGER) throw new Error("Public contact revision exhausted");
  return {before, after: {schemaVersion: 1, revision: (before?.revision ?? 0) + 1, supportEmail}};
}

export async function runPublicContactChange(db, {expectedRevision, supportEmail, apply}) {
  const ref = db.doc(documentPath);
  if (!apply) {
    const snapshot = await ref.get();
    return {applied: false, ...planPublicContactChange(snapshot.exists ? snapshot.data() : null, expectedRevision, supportEmail)};
  }
  const planned = await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref);
    const result = planPublicContactChange(snapshot.exists ? snapshot.data() : null, expectedRevision, supportEmail);
    transaction.set(ref, result.after);
    return result;
  });
  return {applied: true, ...planned};
}

async function main() {
  const args = parseCommonArgs(process.argv.slice(2), {
    valueFlags: ["--email", "--expect-revision"], allowPositionals: false,
  });
  if (args.help) {
    console.log("Usage: node --experimental-strip-types website/scripts/next/publicContactOperator.mjs --env dev|prod --email <address> --expect-revision absent|<number> [--apply] [--allow-prod] [--emulator]\nDry-run is the default. Only config/publicContact is read or written. Roll back by writing the previous email as a new revision.");
    return;
  }
  if (!["dev", "prod"].includes(args.env) || !args.email || !args.expect_revision) {
    throw new Error("Explicit environment, email and expected revision are required");
  }
  const expectedRevision = args.expect_revision === "absent" ? "absent" : Number(args.expect_revision);
  if (expectedRevision !== "absent" && (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1)) {
    throw new Error("Expected revision must be absent or a positive safe integer");
  }
  if (args.env === "prod" && args.emulatorHost) throw new Error("Production cannot target an emulator");
  const projectId = resolveFirebaseProjectId({env: args.env});
  assertProdWriteAllowed({env: args.env, projectId, apply: args.apply, allowProd: args.allowProd,
    action: "write public contact to"});
  applyFirestoreEmulatorHost(args.emulatorHost);
  const requireFromFunctions = createFunctionsRequire();
  const admin = requireFromFunctions("firebase-admin");
  const {getFirestore} = requireFromFunctions("firebase-admin/firestore");
  const app = admin.initializeApp({projectId}, `public-contact-operator-${process.pid}`);
  try {
    const result = await runPublicContactChange(getFirestore(app), {
      expectedRevision, supportEmail: args.email, apply: args.apply,
    });
    console.log(JSON.stringify({projectId, documentPath, ...result}));
  } finally {
    await app.delete();
  }
}

if (isMain(import.meta.url)) main().catch(error => {console.error(error.message); process.exitCode = 1;});
