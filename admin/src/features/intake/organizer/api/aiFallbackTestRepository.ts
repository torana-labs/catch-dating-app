import {httpsCallable} from "firebase/functions";
import type {AdminAiFallbackTestCallCallableResponse} from
  "../../../../generated/contracts/adminAiFallbackTestCallCallableResponse";
import {dataMode} from "../../../../shared/api/dataMode";
import {functions} from "../../../../shared/api/firebaseFunctions";

export type AiFallbackTestResult = AdminAiFallbackTestCallCallableResponse;

const sampleResult: AiFallbackTestResult = {ok: true, dryRun: false, failedStep: null, refusal: null,
  httpStatus: null, modelId: "claude-opus-5-5", inputTokens: 320, outputTokens: 30, costMicros: 1880,
  durationMs: 2400};

/** One live test call through the AI fallback's federated sign-in (a fixed, fictional request). */
export async function runAiFallbackTestCall(input: {dryRun: boolean}): Promise<AiFallbackTestResult> {
  if (dataMode() === "sample") return {...sampleResult, dryRun: input.dryRun};
  const {validateAdminCallableRequest, validateAdminCallableResponse} =
    await import("../../../../generated/validators/adminCallableValidators")
      .then((validators) => validators.loadAdminCallableValidators("adminAiFallbackTestCall"));
  validateAdminCallableRequest("adminAiFallbackTestCall", input);
  const result = await httpsCallable<{dryRun: boolean}, AiFallbackTestResult>(functions,
    "adminAiFallbackTestCall")(input);
  validateAdminCallableResponse("adminAiFallbackTestCall", result.data);
  return result.data;
}

const stepLabels: Record<NonNullable<AiFallbackTestResult["failedStep"]>, string> = {
  config: "The federation settings are not set on this project",
  token_mint: "Google would not issue the identity token",
  token_exchange: "Anthropic refused the token exchange",
  messages_call: "The model call failed",
  schema: "The model answered in the wrong shape",
  budget: "The monthly cap or today's test limit refused it",
};

/** One plain line for the result. */
export function describeAiFallbackTest(result: AiFallbackTestResult): string {
  if (result.ok && result.dryRun) return "Sign-in works: the token exchange succeeded. No model call was made.";
  if (result.ok) {
    return `It works: ${result.modelId} answered in ${(result.durationMs / 1000).toFixed(1)} s, ` +
      `${result.inputTokens} tokens in, ${result.outputTokens} out, US$${(result.costMicros / 1_000_000).toFixed(4)}.`;
  }
  const step = result.failedStep ? stepLabels[result.failedStep] : "It failed";
  const detail = [result.httpStatus ? `HTTP ${result.httpStatus}` : null, result.refusal].filter(Boolean).join(", ");
  return detail ? `${step} (${detail}).` : `${step}.`;
}
