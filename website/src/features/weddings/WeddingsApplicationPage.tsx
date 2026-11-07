import {WeddingsApplicationView} from "./sections/weddingsApplicationSections";
import {useWeddingsApplicationController} from "./useWeddingsController";
import type {WeddingsStepOneDraft, WeddingsSubmit} from "./weddingsModel";

/**
 * The pilot application (/weddings/apply/, the RbWebWeddingsApply board).
 * No intake front door accepts this application yet, so the route renders
 * without a `submit` and Send stays disabled until one is chosen.
 */
export function WeddingsApplicationPage({submit, initialStepOne}: {submit?: WeddingsSubmit; initialStepOne?: WeddingsStepOneDraft | null} = {}) {
  const application = useWeddingsApplicationController({submit, initialStepOne});
  return <WeddingsApplicationView application={application} />;
}
