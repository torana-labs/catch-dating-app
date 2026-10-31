import * as admin from "firebase-admin";
import {FormPaymentRuntimeConfig} from "./formPaymentRuntimeConfig";
import {FormPaymentCredentials} from "./formPaymentCredentials";
import {FormPaymentProcessor} from "./formPaymentProcessor";
import {OrganizerRazorpayConnectionService} from
  "./organizerRazorpayConnection";

let config: FormPaymentRuntimeConfig | undefined;

function runtimeConfig(): FormPaymentRuntimeConfig {
  const projectId = admin.app().options.projectId ??
    process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT ?? "";
  config ??= new FormPaymentRuntimeConfig(projectId);
  return config;
}

export async function formPaymentsConfigured(): Promise<boolean> {
  try {
    return await runtimeConfig().configured();
  } catch {
    return false;
  }
}

/**
 * Loads the newest partner config, or the exact version a record pinned.
 * The result's configurationVersion is the exact version to record.
 */
export async function formPaymentRuntime(configurationVersion?: string) {
  const runtime = await runtimeConfig().load(configurationVersion);
  const db = admin.firestore();
  const credentials = new FormPaymentCredentials({...runtime, db});
  const processor = new FormPaymentProcessor({...runtime, db, credentials});
  const connections = new OrganizerRazorpayConnectionService({...runtime, db});
  return {...runtime, configurationVersion: runtime.version,
    db, credentials, processor, connections};
}
