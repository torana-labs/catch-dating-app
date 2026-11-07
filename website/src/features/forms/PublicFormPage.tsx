import {
  CatchAvatar,
  CatchButton,
  CatchCheckboxInput,
  CatchChip,
  CatchField,
  CatchFilePickerButton,
  CatchIndexRow,
  CatchLoadingIndicator,
  CatchMetaRow,
  CatchMeter,
  CatchPageBody,
  CatchPaneLayout,
  CatchRoot,
  CatchStack,
  CatchSurface,
  CatchText,
  catchFormatOf,
  useCatchPane,
} from "@catch/web-ui";
import {eventDetailCopy} from "../../content/events";
import {publicSiteCopy, siteFooterLegalLinks} from "@content/site";
import {useEffect, useId, useRef, useState, type FormEvent, type ReactNode} from "react";
import {useParams} from "react-router";
import {PublicSiteHeader, WebsitePageMain} from "../../shared/site";
import {Form} from "../../shared/ui/primitives";
import {PublicFormFileInput, PublicFormSignatureInput} from "../../shared/ui/primitives/publicForms";
import type {FormStatus as FormStatusModel} from "../../shared/forms/types";
import {publicFormsCopy, publicFormPaymentStatuses, formFeeLabel,
  formFeePayLabel} from "../../content/forms";
import {
  answerSummary,
  type PublicFormAnswer,
  type PublicFormQuestion as Question,
} from "./publicFormModel";
import {formProfileReviewUrl} from "./formProfileReviewLink";
import {embedParentOrigin, resizePayload} from "./publicFormEmbed";
import {usePublicFormController} from "./usePublicFormController";

type Controller = ReturnType<typeof usePublicFormController>;

/** A submit button's press is the form's submit; the button needs a handler to stay enabled. */
const submitsForm = () => undefined;
const titleId = "public-form-title";

/**
 * An organiser's public form at `/f/:publicFormId/`, drawn as the RbWebForm
 * board on the white ground: the site top bar, the organiser's row, the
 * form's title and lead, the questions, the messages tile, Send and the
 * privacy line, then the site footer. Embedded in another site's page it
 * keeps only the form. The stages, autosave, the receipt, withdrawal and the
 * payment are the controller's; this only draws them.
 */
export function PublicFormPage() {
  const {publicFormId = ""} = useParams<{publicFormId: string}>();
  return <PublicFormView controller={usePublicFormController(publicFormId)} />;
}

/** The form for one controller, as the route and the stories draw it. */
export function PublicFormView({controller}: {controller: Controller}) {
  const frameRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!controller.embed || window.parent === window || !frameRef.current) return;
    const embedId = new URLSearchParams(window.location.search).get("embedId") ?? "";
    const parentOrigin = embedParentOrigin(document.referrer);
    if (!parentOrigin) return;
    const frame = frameRef.current;
    const sendHeight = () => {
      const payload = resizePayload(embedId, frame.getBoundingClientRect().height);
      if (payload) window.parent.postMessage(payload, parentOrigin);
    };
    const observer = new ResizeObserver(sendHeight);
    observer.observe(frame);
    sendHeight();
    return () => observer.disconnect();
  }, [controller.embed]);
  const hasProfileFields = controller.form?.definition.sections?.some((section) =>
    section.questions.some((question) => question.answerDestination === "catchProfile" ||
      question.answerDestination === "organizerCard")) ?? false;
  const privacy = (
    <CatchText tone="secondary" variant="body-small">
      {hasProfileFields ? publicFormsCopy.profilePrivacyNote : publicFormsCopy.privacyNote}
    </CatchText>
  );
  const organizer = <OrganizerRow controller={controller} />;

  return (
    <div data-public-form="" ref={frameRef}>
      <CatchRoot format={catchFormatOf(controller.form?.definition.appearance?.activityKind ?? "") ?? undefined} theme="day">
        {controller.embed ? null : <PublicSiteHeader />}
        <WebsitePageMain id="public-form">
          <CatchPageBody gutter={false} pb="s0" pt={controller.embed ? "s0" : "s4"}>
            <CatchPaneLayout
              aside={<SplitOnly><CatchStack gap={16}>{organizer}{privacy}</CatchStack></SplitOnly>}
              main={
                <CatchStack aria-labelledby={titleId} as="section" gap={24}>
                  <UnsplitOnly>{organizer}</UnsplitOnly>
                  <PublicFormStage controller={controller} />
                  <UnsplitOnly>{privacy}</UnsplitOnly>
                </CatchStack>
              }
              pattern="reading"
            />
          </CatchPageBody>
        </WebsitePageMain>
        {controller.embed ? null : <FormSiteFooter />}
      </CatchRoot>
    </div>
  );
}

/** Beside the lane on a wide page; in the lane, where the phone board puts it, on a phone. */
function SplitOnly({children}: {children: ReactNode}) {
  return useCatchPane().split ? <>{children}</> : null;
}

function UnsplitOnly({children}: {children: ReactNode}) {
  return useCatchPane().split ? null : <>{children}</>;
}

/** The board's organiser row: the logo (or initials), the name and the activity. */
function OrganizerRow({controller}: {controller: Controller}) {
  const organizer = controller.form?.organizer;
  if (!organizer?.name) return null;
  const logoUrl = organizer.logoUrl?.trim() || undefined;
  return (
    <CatchIndexRow
      density="compact"
      leading={<CatchAvatar imageUrl={logoUrl} name={organizer.name} size={32} />}
      subtitle={controller.form?.definition.appearance?.activityKind ?? undefined}
      title={organizer.name}
    />
  );
}

/** A stage's opening: an optional kicker, the page title and its lead. */
function FormHead({kicker, title, body}: {kicker?: ReactNode; title: ReactNode; body?: ReactNode}) {
  return (
    <CatchStack gap={8}>
      {kicker ? <CatchText tone="secondary" variant="label-kicker">{kicker}</CatchText> : null}
      <CatchText as="h1" id={titleId} variant="page-title">{title}</CatchText>
      {body ? <CatchText tone="secondary" variant="body">{body}</CatchText> : null}
    </CatchStack>
  );
}

/** A live line: the controller's status, or a payment's. */
function StatusLine({status}: {status: FormStatusModel}) {
  return (
    <CatchText aria-live="polite" tone={status.tone === "is-error" ? "danger" : "secondary"} variant="body-small">
      {status.message}
    </CatchText>
  );
}

function Note({children}: {children: ReactNode}) {
  return <StatusLine status={{message: String(children), tone: ""}} />;
}

/** The stage's buttons, the main one last on a row; on a phone each fills the row. */
function Actions({children}: {children: ReactNode}) {
  return <CatchStack direction="row" gap={8} wrap>{children}</CatchStack>;
}

function FormProgress({current, total}: {current: number; total: number}) {
  const percent = total === 0 ? 0 : Math.round((current / total) * 100);
  return <CatchMeter label={publicFormsCopy.stepLabel} max={100} showLabel value={percent} />;
}

function PublicFormStage({controller}: {controller: Controller}) {
  const definition = controller.form?.definition;

  if (controller.stage === "loading") {
    return <FormLoading />;
  }
  if (controller.stage === "unavailable") {
    return (
      <>
        <FormHead body={controller.form?.availabilityMessage ?? publicFormsCopy.unavailableBody}
          kicker={controller.form?.organizer.name ?? publicFormsCopy.brand} title={publicFormsCopy.unavailableTitle} />
        <StatusLine status={controller.status} />
        {controller.form ? (
          <Actions>
            <CatchButton label={publicFormsCopy.paymentRecoveryAction} onPressed={controller.recoverPayment} variant="secondary" />
          </Actions>
        ) : null}
      </>
    );
  }
  if (controller.stage === "identity" || controller.stage === "phoneCode" || controller.stage === "emailSent") {
    return <IdentityStage controller={controller} />;
  }
  if (controller.stage === "form" && definition && controller.activeSection) {
    return <QuestionStage controller={controller} />;
  }
  if (controller.stage === "review" && definition) {
    return <ReviewStage controller={controller} />;
  }
  if (controller.stage === "payment") {
    return <PaymentStage controller={controller} />;
  }
  if (controller.stage === "complete" && controller.receipt) {
    return <CompleteStage controller={controller} />;
  }
  if (controller.stage === "withdrawn") {
    return <FormHead body={publicFormsCopy.withdrawnBody} kicker={publicFormsCopy.completionKicker} title={publicFormsCopy.withdrawnTitle} />;
  }
  return <FormLoading />;
}

function FormLoading() {
  return (
    <CatchStack align="center" direction="row" gap={12}>
      <CatchLoadingIndicator />
      <CatchText role="status" tone="secondary" variant="body">{publicFormsCopy.loading}</CatchText>
    </CatchStack>
  );
}

function CompleteStage({controller}: {controller: Controller}) {
  const receipt = controller.receipt!;
  const completion = receipt.completion;
  const reviewUrl = receipt.profileReviewAvailable === true ? formProfileReviewUrl(receipt.responseId) : null;
  const target = controller.form?.definition;
  return (
    <>
      <FormHead body={completion.message} kicker={publicFormsCopy.completionKicker} title={completion.title} />
      {controller.payments?.payment ? (
        <CatchStack gap={4}>
          {controller.payments.payment.status === "refunded" ? <Note>{publicFormsCopy.paymentReceiptRefunded}</Note> :
            controller.payments.payment.status === "reviewRequired" ? <Note>{publicFormPaymentStatuses.reviewRequired}</Note> : null}
          <Note>{publicFormsCopy.paymentWithdrawNote}</Note>
        </CatchStack>
      ) : null}
      {reviewUrl ? <Note>{publicFormsCopy.profileReviewHelp}</Note> : null}
      <Actions>
        {target?.defaultTargetKind === "event" && target.defaultTargetId ?
          <CatchButton href={`/booking/${encodeURIComponent(target.defaultTargetId)}/`} label={eventDetailCopy.hero.guestAction} /> : null}
        {controller.pendingConsentResponseId === receipt.responseId ? (
          <CatchButton label={publicFormsCopy.messagingVerifyAction} onPressed={() => void controller.startConsentPromotion()}
            status={controller.pending ? "loading" : "idle"} />
        ) : null}
        {reviewUrl ? <CatchButton href={reviewUrl} label={publicFormsCopy.profileReviewAction} /> : null}
        {completion.actionUrl && completion.actionLabel ? <CatchButton href={completion.actionUrl} label={completion.actionLabel} /> : null}
        <CatchButton label={controller.pending ? publicFormsCopy.withdrawing : publicFormsCopy.withdraw}
          onPressed={() => void controller.withdraw()} status={controller.pending ? "loading" : "idle"} variant="quiet" />
      </Actions>
      <StatusLine status={controller.status} />
    </>
  );
}

function IdentityStage({controller}: {controller: Controller}) {
  const policy = controller.form?.definition.identityPolicy;
  const permitsPhone = controller.verifyingConsent ||
    controller.recoveringPayment || policy === "phoneVerified" ||
    policy === "emailOrPhoneVerified" || policy === "catchAccount";
  const permitsEmail = !controller.verifyingConsent &&
    !controller.recoveringPayment && (policy === "emailVerified" ||
    policy === "emailOrPhoneVerified" || policy === "catchAccount");
  if (controller.stage === "emailSent") {
    return (
      <>
        <FormHead body={publicFormsCopy.emailSentBody} kicker={publicFormsCopy.identityKicker} title={publicFormsCopy.emailSentTitle} />
        <StatusLine status={controller.status} />
      </>
    );
  }
  return (
    <>
      <FormHead
        body={controller.recoveringPayment ? publicFormsCopy.paymentRecoveryBody : publicFormsCopy.identityBody}
        kicker={publicFormsCopy.identityKicker}
        title={controller.recoveringPayment ? publicFormsCopy.paymentRecoveryTitle : publicFormsCopy.identityTitle}
      />
      {controller.stage === "phoneCode" ? (
        <FormStep onSubmit={controller.handleCodeSubmit} pending={controller.pending}>
          <CodeField controller={controller} id="public-form-code" />
          <CatchButton fill label={controller.pending ? publicFormsCopy.confirmingCode : publicFormsCopy.confirmCode}
            onPressed={submitsForm} status={controller.pending ? "loading" : "idle"} type="submit" />
        </FormStep>
      ) : (
        <>
          {permitsPhone ? (
            <FormStep onSubmit={controller.handlePhoneSubmit} pending={controller.pending}>
              <PhoneNumberField id="public-form-phone" label={publicFormsCopy.phoneLabel}
                onChange={controller.setPhoneNumber} value={controller.phoneNumber} />
              <CatchButton fill label={controller.pending ? publicFormsCopy.sendingCode : publicFormsCopy.sendCode}
                onPressed={submitsForm} status={controller.pending ? "loading" : "idle"} type="submit" />
            </FormStep>
          ) : null}
          {permitsEmail ? (
            <FormStep onSubmit={controller.handleEmailSubmit} pending={controller.pending}>
              <CatchField
                recipe="input"
                autoComplete="email"
                id="public-form-email"
                title={publicFormsCopy.emailLabel}
                onChanged={(value) => controller.setEmail(value)}
                value={controller.email}
                keyboardType="emailAddress"
              />
              <CatchButton fill
                label={controller.pending ? publicFormsCopy.sendingEmailLink :
                  window.location.href.includes("mode=signIn") ? publicFormsCopy.completeEmailSignIn : publicFormsCopy.sendEmailLink}
                onPressed={submitsForm} status={controller.pending ? "loading" : "idle"} type="submit"
                variant={permitsPhone ? "secondary" : "primary"} />
            </FormStep>
          ) : null}
        </>
      )}
      <div id={controller.recaptchaContainerId} />
      <StatusLine status={controller.status} />
    </>
  );
}

/** One step's own form: its fields over its button. */
function FormStep({onSubmit, pending, children}: {
  onSubmit: (event: FormEvent<HTMLFormElement>) => void; pending: boolean; children: ReactNode;
}) {
  return <Form onSubmit={onSubmit} pending={pending}><CatchStack gap={12}>{children}</CatchStack></Form>;
}

function CodeField({controller, id}: {controller: Controller; id: string}) {
  return (
    <CatchField
      recipe="input"
      autoComplete="one-time-code"
      id={id}
      title={publicFormsCopy.codeLabel}
      maxLength={6}
      onChanged={(value) => controller.setCode(value.replace(/\D/gu, ""))}
      value={controller.code}
      keyboardType="number"
    />
  );
}

function QuestionStage({controller}: {controller: Controller}) {
  const definition = controller.form!.definition;
  const section = controller.activeSection!;
  const finalSection = controller.sectionIndex === controller.visibleSections.length - 1;
  const verifiedPhoneQuestion = definition.sections.flatMap((part) =>
    part.questions).find((question) => question.kind === "phone" &&
      question.canonicalFieldId === "phoneNumber");
  const phoneVerificationForm = definition.identityPolicy === "phoneVerified";
  return (
    <>
      <FormHead body={definition.description} title={definition.title} />
      <FormProgress current={controller.sectionIndex + 1} total={controller.visibleSections.length + 1} />
      <AnswerReuseSection controller={controller} />
      <CatchStack aria-labelledby="public-form-section-title" as="section" gap={20}>
        <CatchStack gap={4}>
          <CatchText as="h2" id="public-form-section-title" variant="title-bar">{section.title}</CatchText>
          {section.description ? <CatchText tone="secondary" variant="body-small">{section.description}</CatchText> : null}
        </CatchStack>
        {phoneVerificationForm && controller.sectionIndex === 0 ? (
          <InlinePhoneVerification controller={controller} question={verifiedPhoneQuestion} />
        ) : null}
        {section.questions.filter((question) => !phoneVerificationForm ||
          question.questionId !== verifiedPhoneQuestion?.questionId).map((question) => (
          <QuestionField
            answer={controller.answers[question.questionId]}
            cityOptions={controller.form?.cityOptions ?? []}
            error={controller.errors[question.questionId]}
            key={question.questionId}
            onChange={(answer) => controller.updateAnswer(question.questionId, answer)}
            onBlur={() => controller.blurQuestion(question.questionId)}
            onUpload={(files) => controller.uploadAnswer(question, files)}
            question={question}
            upload={controller.uploads[question.questionId]}
          />
        ))}
      </CatchStack>
      <Actions>
        {controller.sectionIndex > 0 ? (
          <CatchButton label={publicFormsCopy.previous} onPressed={controller.previousSection} variant="secondary" />
        ) : null}
        <CatchButton label={finalSection ? publicFormsCopy.review : publicFormsCopy.next}
          onPressed={controller.uploadInProgress || controller.reusePending ? null : () => void controller.nextSection()} />
      </Actions>
      <StatusLine status={controller.status} />
      <Note>{controller.saveState === "saving" ? publicFormsCopy.saveStatus :
        controller.saveState === "saved" ? publicFormsCopy.savedStatus : ""}</Note>
    </>
  );
}

function AnswerReuseSection({controller}: {controller: Controller}) {
  if (!controller.canReuseAnswers) return null;
  if (!controller.reuseOpen) {
    return (
      <Actions>
        <CatchButton label={publicFormsCopy.reuseOpen} onPressed={controller.pending ? null : controller.openAnswerReuse}
          size="sm" variant="secondary" />
      </Actions>
    );
  }
  const activity = controller.reuseActivity;
  const preview = controller.reusePreview;
  const questions = controller.form!.definition.sections.flatMap((section) => section.questions);
  const suggestions = preview ? questions.filter((question) =>
    Object.hasOwn(preview.answers, question.questionId) &&
    !Object.hasOwn(controller.answers, question.questionId)) : [];
  return (
    <CatchSurface aria-labelledby="public-form-reuse-title" as="section" block="tile">
      <CatchStack gap={4}>
        <CatchText as="h2" id="public-form-reuse-title" variant="label-action">{publicFormsCopy.reuseTitle}</CatchText>
        <CatchText tone="secondary" variant="body-small">{publicFormsCopy.reuseHelp}</CatchText>
      </CatchStack>
      {activity.isFetching ? <Note>{publicFormsCopy.reuseLoading}</Note> : null}
      {activity.isError ? <>
        <StatusLine status={{message: publicFormsCopy.genericError, tone: "is-error"}} />
        <Actions>
          <CatchButton label={publicFormsCopy.reuseRetry} onPressed={() => void activity.refetch()} size="sm" variant="secondary" />
        </Actions>
      </> : null}
      {!activity.isPending && controller.reuseSources.length === 0 ? <Note>{publicFormsCopy.reuseEmpty}</Note> : null}
      {controller.reuseSources.length > 0 ? <>
        <CatchField recipe="select" id="public-form-reuse-source" title={publicFormsCopy.reuseSourceLabel}
          hintText={publicFormsCopy.reuseSourcePlaceholder} values={controller.reuseSources}
          itemLabelBuilder={(source) => publicFormsCopy.reuseSourceDate(source.submittedAtMillis)}
          itemValueBuilder={(source) => source.sourceId}
          value={controller.reuseSources.find((source) => source.sourceId === controller.reuseSourceId) ?? null}
          inputMode={controller.reusePending || controller.pending ? "inactive" : "editable"}
          onChanged={(source) => controller.chooseReuseSource(source?.sourceId ?? "")} />
        <Actions>
          <CatchButton label={controller.reusePending ? publicFormsCopy.reuseChecking : publicFormsCopy.reusePreview}
            onPressed={!controller.reuseSourceId || controller.pending ? null : () => void controller.previewReusableAnswers()}
            size="sm" status={controller.reusePending ? "loading" : "idle"} />
        </Actions>
      </> : null}
      {activity.hasNextPage ? (
        <Actions>
          <CatchButton label={publicFormsCopy.reuseLoadMore}
            onPressed={controller.reusePending || controller.pending ? null : () => void activity.fetchNextPage()}
            size="sm" status={activity.isFetchingNextPage ? "loading" : "idle"} variant="secondary" />
        </Actions>
      ) : null}
      {preview ? <>
        <Note>{publicFormsCopy.reuseSourceDate(preview.source.submittedAtMillis)}</Note>
        {suggestions.length === 0 ? <Note>{publicFormsCopy.reuseNoAnswers}</Note> : (
          <CatchStack gap={12}>
            {suggestions.map((question) => (
              <CatchStack gap={2} key={question.questionId}>
                <CatchCheckboxInput label={question.label}
                  onChanged={controller.pending ? null : (checked) => controller.selectReusableAnswer(question.questionId, checked)}
                  value={controller.reuseSelectedIds.includes(question.questionId)} />
                <CatchText tone="secondary" variant="body-small">
                  {answerSummary(question, preview.answers[question.questionId], controller.form?.cityOptions)}
                </CatchText>
              </CatchStack>
            ))}
          </CatchStack>
        )}
        {suggestions.length > 0 ? (
          <Actions>
            <CatchButton label={publicFormsCopy.reuseApply}
              onPressed={controller.pending || !suggestions.some((question) =>
                controller.reuseSelectedIds.includes(question.questionId)) ? null : controller.acceptReusableAnswers}
              size="sm" />
          </Actions>
        ) : null}
      </> : null}
      <StatusLine status={controller.reuseStatus} />
      <Actions>
        <CatchButton label={publicFormsCopy.reuseDismiss} onPressed={controller.dismissAnswerReuse} size="sm" variant="quiet" />
      </Actions>
    </CatchSurface>
  );
}

function InlinePhoneVerification({controller, question}: {controller: Controller; question?: Question}) {
  const phoneValue = controller.verifiedPhone ?? controller.phoneNumber;
  if (controller.verifiedPhone) {
    return (
      <CatchField id="public-form-verified-phone" inputMode="readOnly" keyboardType="phone" recipe="input"
        suffixText={publicFormsCopy.phoneVerified} title={question?.label ?? publicFormsCopy.phoneLabel} value={phoneValue} />
    );
  }
  return (
    <CatchStack gap={12}>
      <CatchText tone="secondary" variant="body-small">{publicFormsCopy.phoneVerificationHelp}</CatchText>
      {question && controller.errors[question.questionId] && controller.verificationStep === "code" ? (
        <CatchText role="alert" tone="danger" variant="body-small">{controller.errors[question.questionId]}</CatchText>
      ) : null}
      {controller.verificationStep === "code" ? (
        <FormStep onSubmit={controller.handleCodeSubmit} pending={controller.pending}>
          <CodeField controller={controller} id="public-form-inline-code" />
          <Actions>
            <CatchButton label={publicFormsCopy.editPhone} onPressed={controller.resetPhoneVerification} variant="secondary" />
            <CatchButton label={publicFormsCopy.confirmCode} onPressed={submitsForm} status={controller.pending ? "loading" : "idle"} type="submit" />
          </Actions>
        </FormStep>
      ) : (
        <FormStep onSubmit={controller.handlePhoneSubmit} pending={controller.pending}>
          <PhoneNumberField
            id="public-form-inline-phone"
            errorText={question ? controller.errors[question.questionId] : undefined}
            label={question?.label ?? publicFormsCopy.phoneLabel}
            onBlur={question ? () => controller.blurQuestion(question.questionId) : undefined}
            onChange={(value) => {
              controller.setPhoneNumber(value);
              if (question) controller.updateAnswer(question.questionId, value);
            }}
            value={phoneValue}
          />
          <Actions>
            <CatchButton label={publicFormsCopy.sendCode} onPressed={submitsForm} status={controller.pending ? "loading" : "idle"} type="submit" />
          </Actions>
        </FormStep>
      )}
      <div id={controller.recaptchaContainerId} />
    </CatchStack>
  );
}

/**
 * A question the board draws with its label over the control: the label and
 * whether it is required, its help, where the answer is kept, the control and
 * its error. Fields carry the label themselves, hidden, so they keep their
 * names; choices and uploads are a labelled group.
 */
function QuestionBlock({children, disclosure, error, help, label, requiredLabel}: {
  children: ReactNode; disclosure?: string; error?: string; help?: string; label: string; requiredLabel: string;
}) {
  const id = useId();
  return (
    <CatchStack aria-describedby={disclosure ? `${id}-disclosure` : undefined} aria-labelledby={`${id}-label`} gap={8} role="group">
      <CatchStack gap={2}>
        <CatchText id={`${id}-label`} variant="label-action">
          {label} <CatchText as="span" tone="secondary" variant="body-meta">{requiredLabel}</CatchText>
        </CatchText>
        {help ? <CatchText tone="secondary" variant="body-small">{help}</CatchText> : null}
        {disclosure ? <CatchText id={`${id}-disclosure`} tone="secondary" variant="body-small">{disclosure}</CatchText> : null}
      </CatchStack>
      {children}
      {error ? <CatchText role="alert" tone="danger" variant="body-small">{error}</CatchText> : null}
    </CatchStack>
  );
}

function QuestionField({
  answer,
  cityOptions,
  error,
  onChange,
  onBlur,
  onUpload,
  question,
  upload,
}: {
  answer: PublicFormAnswer | undefined;
  cityOptions: NonNullable<Controller["form"]>["cityOptions"];
  error?: string;
  onChange: (answer: PublicFormAnswer) => void;
  onBlur: () => void;
  onUpload: (files: Array<{blob: Blob; name: string}>) => Promise<void>;
  question: Question;
  upload?: {status: "uploading" | "ready" | "error"; label: string};
}) {
  const requiredLabel = question.required ? publicFormsCopy.requiredSuffix : publicFormsCopy.optionalSuffix;
  const disclosure = question.answerDestination === "catchProfile" ?
    publicFormsCopy.profileFieldDisclosure :
    question.answerDestination === "organizerCard" ?
      publicFormsCopy.organizerCardFieldDisclosure : undefined;
  const common = {
    help: question.helpText ?? undefined,
    disclosure,
    label: question.label,
    requiredLabel,
  };
  const fieldId = `form-question-${question.questionId}`;
  if (question.canonicalFieldId === "city" &&
      question.answerDestination === "catchProfile" &&
      cityOptions && cityOptions.length > 0) {
    return (
      <QuestionBlock {...common}>
        <CatchField
          recipe="select"
          id={fieldId}
          title={question.label}
          labelMode="hidden"
          errorText={error}
          hintText={publicFormsCopy.chooseOne}
          values={cityOptions}
          itemLabelBuilder={(city) => `${city.label}, ${city.regionName}`}
          itemValueBuilder={(city) => city.marketId}
          onBlur={onBlur}
          onChanged={(city) => onChange(city?.marketId ?? null)}
          required={question.required}
          value={cityOptions.find((city) => city.marketId === answer) ?? null}
        />
      </QuestionBlock>
    );
  }
  if (question.kind === "longText") {
    return (
      <QuestionBlock {...common}>
        <CatchField
          recipe="input"
          id={fieldId}
          title={question.label}
          labelMode="hidden"
          errorText={error}
          maxLength={question.validation.maxLength ?? undefined}
          onChanged={(value) => onChange(value)}
          onBlur={onBlur}
          required={question.required}
          minLines={3}
          maxLines={5}
          value={typeof answer === "string" ? answer : ""}
        />
      </QuestionBlock>
    );
  }
  if (question.kind === "phone") {
    return (
      <QuestionBlock {...common}>
        <PhoneNumberField
          id={fieldId}
          errorText={error}
          label={question.label}
          onBlur={onBlur}
          onChange={onChange}
          value={typeof answer === "string" ? answer : ""}
        />
      </QuestionBlock>
    );
  }
  if (["shortText", "date", "email", "url", "number"].includes(question.kind)) {
    const keyboardType = question.kind === "number" ? "number" :
      question.kind === "date" ? "date" :
      question.kind === "email" ? "emailAddress" :
      question.kind === "url" ? "url" : "text";
    return (
      <QuestionBlock {...common}>
        <CatchField
          recipe="input"
          id={fieldId}
          title={question.label}
          labelMode="hidden"
          errorText={error}
          max={question.kind === "number" ?
            question.validation.maxNumber ?? undefined :
            question.validation.latestDate ?? undefined}
          maxLength={question.validation.maxLength ?? undefined}
          min={question.kind === "number" ?
            question.validation.minNumber ?? undefined :
            question.validation.earliestDate ?? undefined}
          onChanged={(value) => onChange(question.kind === "number" ?
            (value === "" ? null : Number(value)) : value)}
          onBlur={onBlur}
          required={question.required}
          keyboardType={keyboardType}
          value={typeof answer === "string" || typeof answer === "number" ? String(answer) : ""}
        />
      </QuestionBlock>
    );
  }
  if (question.kind === "singleChoice" && question.options.length > 4) {
    return (
      <QuestionBlock {...common}>
        <CatchField
          recipe="select"
          id={fieldId}
          title={question.label}
          labelMode="hidden"
          errorText={error}
          hintText={publicFormsCopy.chooseOne}
          values={question.options}
          itemLabelBuilder={(option) => option.label}
          itemValueBuilder={(option) => option.value}
          onChanged={(option) => onChange(option?.value ?? null)}
          onBlur={onBlur}
          required={question.required}
          value={question.options.find((option) => option.value === answer) ?? null}
        />
      </QuestionBlock>
    );
  }
  if (question.kind === "singleChoice" || question.kind === "multiChoice") {
    const single = question.kind === "singleChoice";
    const selected = Array.isArray(answer) ? answer : typeof answer === "string" ? [answer] : [];
    return (
      <QuestionBlock {...common} error={error}>
        <CatchStack direction="row" gap={6} role={single ? "radiogroup" : undefined} wrap>
          {question.options.map((option) => (
            <CatchChip
              key={option.optionId}
              kind={single ? "choice" : "filter"}
              label={option.label}
              onPressed={() => onChange(single ? option.value : toggleValue(selected, option.value))}
              selected={selected.includes(option.value)}
            />
          ))}
        </CatchStack>
      </QuestionBlock>
    );
  }
  if (question.kind === "boolean") {
    return (
      <QuestionBlock {...common} error={error}>
        <CatchStack direction="row" gap={6} role="radiogroup" wrap>
          <CatchChip kind="choice" label={publicFormsCopy.yes} onPressed={() => onChange(true)} selected={answer === true} />
          <CatchChip kind="choice" label={publicFormsCopy.no} onPressed={() => onChange(false)} selected={answer === false} />
        </CatchStack>
      </QuestionBlock>
    );
  }
  if (question.kind === "acknowledgement") {
    return (
      <QuestionBlock {...common} error={error}>
        <CatchCheckboxInput label={publicFormsCopy.confirmAcknowledgement} onChanged={(checked) => onChange(checked)}
          value={answer === true} />
      </QuestionBlock>
    );
  }
  if (question.kind === "file") {
    const current = Array.isArray(answer) ? answer : [];
    const accepted = question.validation.allowedMimeTypes.length > 0 ?
      question.validation.allowedMimeTypes.join(",") :
      "image/jpeg,image/png,image/webp,application/pdf";
    const label = current.length > 0 ? publicFormsCopy.replaceFiles : publicFormsCopy.selectFiles;
    const status = upload?.label ?? (current.length > 0 ? publicFormsCopy.uploadedFile : undefined);
    const uploading = upload?.status === "uploading";
    return (
      <QuestionBlock {...common} error={error}>
        {(question.validation.maxFileCount ?? 1) > 1 ? (
          // The system file picker takes one file; several go through the form's own picker.
          <PublicFormFileInput accept={accepted} disabled={uploading} label={label} multiple
            onFiles={(files) => void onUpload(files.map((file) => ({blob: file, name: file.name})))} status={status} />
        ) : (
          <CatchStack gap={6}>
            <CatchStack align="start">
              <CatchFilePickerButton accept={accepted} label={label}
                onChanged={uploading ? null : (file) => { if (file) void onUpload([{blob: file, name: file.name}]); }} />
            </CatchStack>
            {status ? <CatchText role="status" tone="secondary" variant="body-small">{status}</CatchText> : null}
          </CatchStack>
        )}
        {current.length > 0 ? (
          <CatchStack align="start">
            <CatchButton label={publicFormsCopy.removeUpload} onPressed={() => onChange([])} size="sm" variant="quiet" />
          </CatchStack>
        ) : null}
      </QuestionBlock>
    );
  }
  return (
    <QuestionBlock {...common} error={error}>
      {/* The system has no signature pad; the form keeps its own. */}
      <PublicFormSignatureInput
        clearLabel={publicFormsCopy.clearSignature}
        disabled={upload?.status === "uploading"}
        instruction={publicFormsCopy.signatureInstruction}
        onSave={(blob) => onUpload([{blob, name: "signature.png"}])}
        saveLabel={answer ? publicFormsCopy.replaceFiles : publicFormsCopy.saveSignature}
        status={upload?.label ?? (answer ? publicFormsCopy.signatureReady : undefined)}
        typedNameLabel={publicFormsCopy.typedSignatureLabel}
      />
    </QuestionBlock>
  );
}

const phoneDialOptions = [
  {country: "India", dialCode: "+91"},
  {country: "Nepal", dialCode: "+977"},
  {country: "Australia", dialCode: "+61"},
  {country: "United States", dialCode: "+1"},
] as const;

function PhoneNumberField({
  id,
  errorText,
  label,
  onBlur,
  onChange,
  value,
}: {
  id: string;
  errorText?: string;
  label: string;
  onBlur?: () => void;
  onChange: (value: string) => void;
  value: string;
}) {
  const [preferredCode, setPreferredCode] = useState("+91");
  const known = phoneDialOptions.find((option) => value.startsWith(option.dialCode));
  const selectedCode = known?.dialCode ?? (value.startsWith("+") ? "other" : preferredCode);
  const national = known ? value.slice(known.dialCode.length) : value;
  return (
    <CatchStack align="start" direction="row" equal gap={8}>
      <CatchField
        recipe="select"
        id={`${id}-country`}
        title={publicFormsCopy.phoneCountryLabel}
        values={[...phoneDialOptions.map((option) => option.dialCode), "other"]}
        itemLabelBuilder={(code) => {
          const option = phoneDialOptions.find((item) => item.dialCode === code);
          return option ? `${option.country} ${option.dialCode}` : publicFormsCopy.phoneOtherCountry;
        }}
        onBlur={onBlur}
        onChanged={(nextCode) => {
          if (!nextCode) return;
          setPreferredCode(nextCode);
          onChange(nextCode === "other" ? "" :
            national ? `${nextCode}${national.replace(/\D/gu, "")}` : "");
        }}
        value={selectedCode}
      />
      <CatchField
          recipe="input"
          autoComplete={selectedCode === "other" ? "tel" : "tel-national"}
          id={id}
          keyboardType="phone"
          errorText={errorText}
          title={label}
          onBlur={onBlur}
          onChanged={(entered) => {
            const trimmed = entered.trim();
            if (!trimmed) { onChange(""); return; }
            if (trimmed.startsWith("+") || selectedCode === "other") {
              onChange(trimmed.replace(/[^+\d]/gu, ""));
            } else {
              onChange(`${selectedCode}${trimmed.replace(/\D/gu, "")}`);
            }
          }}
          inputHint={selectedCode === "other" ? "+44 7123 456789" : publicFormsCopy.phoneNationalPlaceholder}
          value={national}
        />
    </CatchStack>
  );
}

function ReviewStage({controller}: {controller: Controller}) {
  const definition = controller.form!.definition;
  const questions = controller.visibleSections.flatMap((section) => section.questions);
  const offer = controller.form?.messagingOffer;
  const v2 = offer?.termsVersion === "form-whatsapp-v2";
  return (
    <>
      <FormHead body={publicFormsCopy.reviewBody} kicker={publicFormsCopy.reviewKicker} title={publicFormsCopy.reviewTitle} />
      <FormProgress current={controller.visibleSections.length + 1} total={controller.visibleSections.length + 1} />
      <CatchMetaRow columns={1} entries={questions.map((question) => ({
        label: question.label,
        value: question.kind === "file" || question.kind === "signature" ?
          (controller.answers[question.questionId] ? publicFormsCopy.uploadedAnswer : publicFormsCopy.unanswered) :
          answerSummary(question, controller.answers[question.questionId], controller.form?.cityOptions) ||
            publicFormsCopy.unanswered,
      }))} />
      {definition.payment ? (
        <CatchStack gap={8}>
          <CatchMetaRow columns={1} entries={[
            {label: definition.payment.description || publicFormsCopy.paymentTitle, value: formFeeLabel(definition.payment.amountPaise)},
            {label: publicFormsCopy.paymentRefundPolicy, value: definition.payment.refundPolicy},
          ]} />
          <Note>{publicFormsCopy.paymentBody}</Note>
        </CatchStack>
      ) : null}
      <CatchSurface aria-labelledby="public-form-consent-title" as="section" block="tile">
        <CatchText as="h2" id="public-form-consent-title" variant="label-action">{publicFormsCopy.consentHeading}</CatchText>
        <CatchText tone="secondary" variant="body-small">{definition.consent.retentionCopy}</CatchText>
        <CatchCheckboxInput label={definition.consent.consentCopy} onChanged={(checked) => controller.updateConsent(checked)}
          value={controller.consentAccepted} />
      </CatchSurface>
      {offer && (offer.organizerWhatsapp || offer.catchWhatsapp || offer.organizerOperationsWhatsapp ||
        offer.organizerMarketingWhatsapp || offer.catchMarketingWhatsapp) ? (
        <CatchSurface aria-labelledby="public-form-messaging-title" as="section" block="tile">
          <CatchText as="h2" id="public-form-messaging-title" variant="label-action">{publicFormsCopy.messagingHeading}</CatchText>
          <CatchText tone="secondary" variant="body-small">{v2 ? publicFormsCopy.messagingPurposeHelp : publicFormsCopy.messagingHelp}</CatchText>
          {v2 && !controller.messagingEndpointAvailable ? (
            <CatchText tone="secondary" variant="body-small">{publicFormsCopy.messagingPhoneRequired}</CatchText>
          ) : null}
          {(["organizerWhatsapp", "catchWhatsapp",
            "organizerOperationsWhatsapp", "organizerMarketingWhatsapp",
            "catchMarketingWhatsapp"] as const).map((scope) => {
            const label = offer[scope];
            return label ? (
              <CatchCheckboxInput key={scope} label={label}
                onChanged={v2 && !controller.messagingEndpointAvailable ? null :
                  (checked) => controller.updateMessagingChoice(scope, checked)}
                value={controller.messagingChoices[scope] ?? false} />
            ) : null;
          })}
        </CatchSurface>
      ) : null}
      <CatchStack gap={4}>
        <CatchButton fill label={controller.pending ? publicFormsCopy.submitting :
          definition.payment ? publicFormsCopy.paymentContinue : publicFormsCopy.submit}
        onPressed={() => void controller.submit()} status={controller.pending ? "loading" : "idle"} />
        <CatchButton fill label={publicFormsCopy.previous} onPressed={() => {
          controller.setSectionIndex(controller.visibleSections.length - 1);
          controller.setStage("form");
        }} variant="quiet" />
      </CatchStack>
      <StatusLine status={controller.status} />
    </>
  );
}

function PaymentStage({controller}: {controller: Controller}) {
  const {payment, pending, pay, refresh, status} = controller.payments;
  const fee = controller.form?.definition.payment;
  const busy = pending || controller.pending;
  return (
    <>
      <FormHead body={publicFormsCopy.paymentBody} kicker={publicFormsCopy.paymentKicker}
        title={payment ? formFeeLabel(payment.amountPaise) : publicFormsCopy.paymentTitle} />
      <Note>{payment?.status === "failed" && !payment.checkout ? publicFormsCopy.paymentUnavailable :
        payment ? publicFormPaymentStatuses[payment.status] : publicFormsCopy.paymentPreparing}</Note>
      {payment?.mode === "test" ? <Note>{publicFormsCopy.paymentTestMode}</Note> : null}
      <CatchMetaRow columns={1} entries={[{label: publicFormsCopy.paymentRefundPolicy, value: payment?.refundPolicy ?? fee?.refundPolicy ?? ""}]} />
      <CatchStack gap={4}>
        {payment?.checkout ? (
          <CatchButton fill label={busy ? publicFormsCopy.paymentChecking : formFeePayLabel(payment.amountPaise)}
            onPressed={() => void pay(controller.form?.organizer.name ?? publicFormsCopy.brand)} status={busy ? "loading" : "idle"} />
        ) : null}
        <CatchButton fill label={busy ? publicFormsCopy.paymentChecking : publicFormsCopy.paymentCheck}
          onPressed={() => void refresh()} status={busy ? "loading" : "idle"} variant="secondary" />
        {payment && ["expired", "refunded"].includes(payment.status) ? (
          <CatchButton fill label={publicFormsCopy.paymentRestart} onPressed={busy ? null : () => void controller.restartAfterPayment()}
            variant="quiet" />
        ) : null}
      </CatchStack>
      <StatusLine status={status} />
      <StatusLine status={controller.status} />
    </>
  );
}

/** The board's site footer: the wordmark beside the site and legal links, then the operator line. */
function FormSiteFooter() {
  return (
    <CatchPageBody constrainToContentWidth pb="s8" pt="s6">
      <CatchStack as="footer" gap={12}>
        <CatchStack align="center" direction="row" gap={12} justify="between" wrap>
          <CatchText variant="display-xs">{publicSiteCopy.wordmark}</CatchText>
          <CatchStack aria-label={publicFormsCopy.footerLabel} as="nav" direction="row" gap={4} wrap>
            {[...publicSiteCopy.nav, ...siteFooterLegalLinks].map((link) => (
              <CatchButton href={link.href} key={link.href} label={link.label} size="sm" variant="quiet" />
            ))}
          </CatchStack>
        </CatchStack>
        <CatchText tone="secondary" variant="body-meta">{publicSiteCopy.footerOperator}</CatchText>
      </CatchStack>
    </CatchPageBody>
  );
}

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}
