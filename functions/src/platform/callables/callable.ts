import type {ValidateFunction} from "ajv";
import {
  type CallableOptions,
  type CallableRequest,
  onCall,
} from "firebase-functions/v2/https";
import {
  appCheckCallableOptions,
  appCheckCallableOptionsWithLimits,
} from "../../shared/callableOptions";
import {validateCallableWithAjv} from "../../shared/validation";
import type {CallablePolicy} from "./policies";

/**
 * One callable (STR-10, issue #2532). The policy and the payload validator
 * are required: a callable cannot be built without saying who may call it
 * and what it accepts.
 */
export interface CallableSpec<P, A, R> {
  /** The Function's exported name, for review and errors. */
  name: string;
  /** Who may call it; see policies.ts. */
  policy: CallablePolicy<P, A>;
  /** The generated validator for its payload contract. */
  input: ValidateFunction<P>;
  /** Shapes the raw payload before validation, such as null to {}. */
  normalize?: (data: unknown) => unknown;
  /** The work, given the validated payload and the policy's actor. */
  handle: (context: CallableContext<P, A>) => Promise<R>;
}

/** What a callable's handler receives. */
export interface CallableContext<P, A> {
  request: CallableRequest<unknown>;
  data: P;
  actor: A;
}

/**
 * Runs a callable the way its deployed Function does: the policy's request
 * check, payload validation, the policy's payload check, then the handler.
 * Tests call this to exercise the deployed path.
 * @param {CallableSpec} spec The callable.
 * @param {CallableRequest} request The request.
 * @return {Promise} The handler's result.
 */
export async function runCallable<P, A, R>(spec: CallableSpec<P, A, R>,
  request: CallableRequest<unknown>): Promise<R> {
  const requestActor = await spec.policy.authorizeRequest(request);
  const data = validateCallableWithAjv<P>(request, spec.input,
    spec.normalize);
  const actor = spec.policy.authorizeData ?
    await spec.policy.authorizeData(request, data, requestActor) :
    requestActor;
  return spec.handle({request, data, actor});
}

/**
 * Builds a callable Function with the shared App Check options. The options
 * are fixed inside the wrapper rather than passed in, because
 * tool/firebase/function_binding_intent.mjs resolves them statically and
 * refuses an options object handed to anything but a reviewed helper; it
 * lists this wrapper, so its body must remain a single onCall return.
 * @param {CallableSpec} spec The callable.
 * @return {object} The Function.
 */
export function callable<P, A, R>(spec: CallableSpec<P, A, R>) {
  return onCall(appCheckCallableOptions,
    (request) => runCallable(spec, request));
}

/**
 * The same with runtime ceilings (`appCheckCallableOptionsWithLimits`).
 * @param {object} limits Concurrency, instances, memory and timeout.
 * @param {CallableSpec} spec The callable.
 * @return {object} The Function.
 */
export function callableWithLimits<P, A, R>(limits: Pick<CallableOptions,
  "concurrency" | "maxInstances" | "memory" | "timeoutSeconds">,
spec: CallableSpec<P, A, R>) {
  return onCall(appCheckCallableOptionsWithLimits(limits),
    (request) => runCallable(spec, request));
}
