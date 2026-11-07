import {CatchPageBody, CatchPaneLayout, CatchRoot, CatchTopBar} from "@catch/web-ui";
import {weddingsCopy as copy} from "@content/weddings";
import {StepOneCard, StepTwo, Sent} from "./sections/weddingsApplicationSections";
import {useWeddingsApplicationController, type WeddingsApplicationController} from "./useWeddingsController";
import type {WeddingsStepOneDraft, WeddingsSubmit} from "./weddingsModel";

/** The application's current stage: step 1 if the landing did not hand it over, step 2, or sent. */
export function WeddingsApplicationView({application}: {application: WeddingsApplicationController}) {
  return (
    <CatchRoot format="nightsOut" theme="day">
      <CatchTopBar homeHref="/weddings/" title={copy.header.title} variant="site" />
      <CatchPageBody as="main" gutter={false} pb="s0" pt="s4">
        <CatchPaneLayout
          main={application.stage === "sent" ? <Sent name={application.stepOne.draft.name} /> :
            application.stage === "stepTwo" ? <StepTwo application={application} /> :
            <StepOneCard idPrefix="weddings-apply" onContinue={application.continueToStepTwo} stepOne={application.stepOne} />}
          pattern="reading"
        />
      </CatchPageBody>
    </CatchRoot>
  );
}

/**
 * The pilot application (/weddings/apply/, the RbWebWeddingsApply board).
 * No intake front door accepts this application yet, so the route renders
 * without a `submit` and Send stays disabled until one is chosen.
 */
export function WeddingsApplicationPage({submit, initialStepOne}: {submit?: WeddingsSubmit; initialStepOne?: WeddingsStepOneDraft | null} = {}) {
  const application = useWeddingsApplicationController({submit, initialStepOne});
  return <WeddingsApplicationView application={application} />;
}
