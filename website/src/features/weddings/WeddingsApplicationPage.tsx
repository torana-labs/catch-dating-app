import {WeddingsApplicationView} from "./sections/weddingsApplicationSections";
import {useWeddingsApplicationController} from "./useWeddingsController";
import type {WeddingsStepOneDraft, WeddingsSubmit} from "./weddingsModel";
import {submitWeddingsApplication} from "./weddingsSubmit";

/**
 * The pilot application (/weddings/apply/, the RbWebWeddingsApply board).
 * Send posts to the site's waitlist route as a weddings programme
 * application; stories and tests pass their own `submit`.
 */
export function WeddingsApplicationPage({submit = submitWeddingsApplication, initialStepOne}: {submit?: WeddingsSubmit; initialStepOne?: WeddingsStepOneDraft | null} = {}) {
  const application = useWeddingsApplicationController({submit, initialStepOne});
  return <WeddingsApplicationView application={application} />;
}
