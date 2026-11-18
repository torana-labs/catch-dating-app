import {asOperationsError, OperationsError} from "../platform/errors.mjs";

// Runs one live callable with receipts around it. The local receipt is always
// written. An optional remote recorder (the admin catalog's
// adminRecordActionExecution) must accept the start before the callable runs,
// and is told the terminal status afterwards. Transport failures that may have
// reached the server are reported as indeterminate: actionCompleted is null,
// never false.
//
// Returns {response, responseHash, receiptPath, remoteReceiptStatus}.
export async function executeWithReceipts({
  client,
  callable,
  payload,
  executionId,
  receiptStore,
  baseReceipt,
  now = () => new Date(),
  hash,
  isIndeterminate,
  remoteRecorder = null,
  codes = {},
}) {
  const startFailedCode = codes.receiptStartFailed ?? "COMMAND_RECEIPT_START_FAILED";
  const incompleteCode = codes.receiptIncomplete ?? "COMMAND_RECEIPT_INCOMPLETE";
  const subject = codes.subject ?? "command";
  if (remoteRecorder) {
    try {
      await remoteRecorder({status: "started"});
    } catch (error) {
      const normalized = asOperationsError(error);
      const receiptPath = await receiptStore.put({
        ...baseReceipt,
        status: "failed",
        finishedAt: now().toISOString(),
        error: {code: normalized.code, message: normalized.message},
        remoteReceiptStatus: "not-started",
      });
      throw new OperationsError(
        startFailedCode,
        `The remote receipt could not start, so the ${subject} was not invoked.`,
        {
          cause: error,
          details: {
            actionCompleted: false,
            executionId,
            receiptPath,
            remoteErrorCode: normalized.code,
          },
          exitCode: normalized.exitCode,
        }
      );
    }
  }
  let response;
  try {
    response = await client.invoke(callable, payload, {executionId});
  } catch (error) {
    const normalized = asOperationsError(error);
    const finishedAt = now().toISOString();
    const terminalStatus = isIndeterminate(normalized) ? "indeterminate" : "failed";
    let remoteReceiptStatus = "none";
    if (remoteRecorder) {
      const recorded = await bestEffort(() => remoteRecorder({
        status: terminalStatus,
        errorCode: normalized.code,
        errorMessage: normalized.message,
      }));
      remoteReceiptStatus = recorded ? terminalStatus : "started-only";
    }
    const receiptPath = await receiptStore.put({
      ...baseReceipt,
      status: terminalStatus,
      finishedAt,
      error: {code: normalized.code, message: normalized.message},
      ...(remoteRecorder ? {remoteReceiptStatus} : {}),
    });
    throw new OperationsError(normalized.code, normalized.message, {
      cause: error,
      details: {
        ...normalized.details,
        actionCompleted: terminalStatus === "indeterminate" ? null : false,
        executionId,
        receiptPath,
        ...(remoteRecorder ? {remoteReceiptStatus} : {}),
      },
      exitCode: normalized.exitCode,
    });
  }
  const responseHash = hash(response);
  let remoteReceiptError = null;
  if (remoteRecorder) {
    try {
      await remoteRecorder({status: "succeeded", responseHash});
    } catch (error) {
      remoteReceiptError = asOperationsError(error);
    }
  }
  const remoteReceiptStatus = !remoteRecorder ? "none" :
    remoteReceiptError ? "started-only" : "succeeded";
  const receiptPath = await receiptStore.put({
    ...baseReceipt,
    status: "succeeded",
    responseHash,
    finishedAt: now().toISOString(),
    ...(remoteRecorder ? {remoteReceiptStatus} : {}),
  });
  if (remoteReceiptError) {
    throw new OperationsError(
      incompleteCode,
      `The ${subject} succeeded, but its remote receipt did not become terminal.`,
      {
        cause: remoteReceiptError,
        details: {
          actionCompleted: true,
          executionId,
          receiptPath,
          remoteErrorCode: remoteReceiptError.code,
        },
      }
    );
  }
  return {response, responseHash, receiptPath, remoteReceiptStatus};
}

async function bestEffort(fn) {
  try {
    await fn();
    return true;
  } catch {
    // The primary callable failure stays authoritative; the local receipt
    // keeps the attempt when the remote receipt cannot advance.
    return false;
  }
}
