import {
  CatchBadge,
  CatchButton,
  CatchCheckboxInput,
  CatchChip,
  CatchField,
  CatchIndexRow,
  CatchLoadingIndicator,
  CatchMeter,
  CatchPageBody,
  CatchPaneLayout,
  CatchRoot,
  CatchSection,
  CatchStack,
  CatchSurface,
  CatchText,
  CatchTopBar,
  type CatchFormat,
  type CatchMarkerProps,
} from "@catch/web-ui";
import {publicSiteCopy} from "@content/site";
import {useEffect, useState, type ReactNode} from "react";
import {useParams} from "react-router";
import {
  eventRuntimeCopy as copy,
  eventRuntimeGenderOptions,
  eventRuntimePaceBandOptions,
  eventRuntimeSkillBandOptions,
} from "../../content/eventRuntime";
import type {FormStatus} from "../../shared/forms/types";
import {WebsitePageMain} from "../../shared/site";
import {
  EventRuntimeRoomMap,
  EventRuntimeRouteMap,
  Form,
} from "../../shared/ui/primitives";
import {EventRcsPreferencesPanel} from "../eventMessaging/EventRcsPreferencesPanel";
import {EventSmsPreferencePanel} from "../eventMessaging/EventSmsPreferencePanel";
import {EventWhatsappPreferencesPanel} from "../eventMessaging/EventWhatsappPreferencesPanel";
import {useEventRuntimeController} from "./useEventRuntimeController";
import {
  eventVenueSessionTokenFromFragment,
  normalizeEventRuntimeLayoutUnits,
  resolveEventRuntimeCeremony,
  resolveEventRuntimeSocialMission,
  shouldRenderEventRuntimeRoomMap,
  visibleEventRuntimeStandingRound,
  type EventRuntimeBootstrap,
  type EventRuntimeCeremony,
  type EventRuntimeStandingRound,
  type EventRuntimeStandings,
} from "./eventRuntimeModel";
import {
  eventRuntimeCeremonyTickMs,
  resolveEventRuntimeMarqueeFrame,
} from "./eventRuntimeMotion";

export type EventRuntimeController = ReturnType<typeof useEventRuntimeController>;
type RuntimeEvent = EventRuntimeBootstrap["event"];
type ItineraryItem = NonNullable<RuntimeEvent["itinerary"]>[number];

const noop = () => undefined;

/** The night's colour comes from how the evening runs; a host-led or open night stays ink. */
const formatForInteractionModel: Record<RuntimeEvent["interactionModel"], CatchFormat | null> = {
  pacePods: "run",
  pairedRotations: "courts",
  teamRotations: "games",
  seatedTable: "dinner",
  freeFormMixer: "nightsOut",
  hostLedProgram: null,
  openFormat: null,
};

export function EventRuntimePage() {
  const {publicRuntimeId = ""} = useParams<{publicRuntimeId: string}>();
  const [venueSessionToken] = useState(() =>
    eventVenueSessionTokenFromFragment(window.location.hash)
  );
  useEffect(() => {
    if (!venueSessionToken) return;
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}`
    );
  }, [venueSessionToken]);
  const controller = useEventRuntimeController(
    publicRuntimeId,
    venueSessionToken
  );
  return <EventRuntimeView controller={controller} />;
}

/**
 * A guest's night in the browser, without the app (P4.6): the RbWebLiveJoin
 * board until the guest is in, then the RbWebLive round and the
 * RbWebLiveReveal scores, all on the night ground under the site top bar.
 * The phone-code entry, the session, the live state and every action are the
 * controller's; this only draws them.
 */
export function EventRuntimeView({controller}: {controller: EventRuntimeController}) {
  const event = controller.bootstrap?.event ?? null;
  const format = event ? formatForInteractionModel[event.interactionModel] : null;
  return (
    <RuntimeShell format={format}>
      <RuntimeStage controller={controller} format={format} />
    </RuntimeShell>
  );
}

function RuntimeShell({format, children}: {format: CatchFormat | null; children: ReactNode}) {
  return (
    <CatchRoot format={format ?? undefined} theme="night">
      <CatchTopBar
        actions={<CatchButton href={copy.getAppHref} label={copy.getApp} size="sm" />}
        homeHref="/"
        title={publicSiteCopy.wordmark}
        variant="site"
      />
      <WebsitePageMain id="event-runtime">
        <CatchPageBody gutter={false} pb="s8" pt="s4">
          <CatchPaneLayout main={<CatchStack gap={16}>{children}</CatchStack>} pattern="reading" />
        </CatchPageBody>
      </WebsitePageMain>
    </CatchRoot>
  );
}

function RuntimeStage({controller, format}: {controller: EventRuntimeController; format: CatchFormat | null}) {
  const event = controller.bootstrap?.event ?? null;
  const pending = controller.pending;
  switch (controller.stage) {
    case "loading":
      return <CatchLoadingIndicator label={copy.brand} />;
    case "unavailable":
      return (
        <>
          <JoinHead body={copy.unavailableBody} title={copy.unavailableTitle} />
          <RuntimeStatus status={controller.status} />
          <CatchButton fill href="/help/" label={copy.helpAction} variant="quiet" />
        </>
      );
    case "phone":
      return (
        <>
          <JoinHead body={copy.joinLead} event={event} title={event ? copy.joinTitle(event.title) : copy.phoneTitle} />
          <Form onSubmit={controller.handlePhoneSubmit} pending={pending}>
            <CatchStack gap={16}>
              <CatchField autoComplete="tel" id="event-runtime-phone" inputHint={copy.phonePlaceholder}
                keyboardType="phone" onChanged={(value) => controller.setPhoneNumber(value)} recipe="input"
                title={copy.phoneLabel} value={controller.phoneNumber} />
              <div id={controller.recaptchaContainerId} />
              <CatchButton fill label={copy.sendCode} onPressed={noop} status={pending ? "loading" : "idle"} type="submit" />
              <RuntimeStatus status={controller.status} />
            </CatchStack>
          </Form>
          <QrNote />
        </>
      );
    case "otp":
      return (
        <>
          <JoinHead body={copy.otpBody} event={event} title={event ? copy.joinTitle(event.title) : copy.otpTitle} />
          <Form onSubmit={controller.handleCodeSubmit} pending={pending}>
            <CatchStack gap={16}>
              <CatchField autoComplete="one-time-code" id="event-runtime-code"
                keyboardType="number" maxLength={6} onChanged={(value) => controller.setCode(value.replace(/\D/gu, ""))}
                recipe="input" title={copy.otpLabel} value={controller.code} />
              <CatchButton fill label={copy.confirmCode} onPressed={noop} status={pending ? "loading" : "idle"} type="submit" />
              <RuntimeStatus status={controller.status} />
            </CatchStack>
          </Form>
        </>
      );
    case "profile":
      return (
        <>
          <JoinHead body={copy.joinLead} event={event} title={event ? copy.joinTitle(event.title) : copy.profileTitle} />
          <Form onSubmit={controller.handleProfileSubmit} pending={pending}>
            <CatchStack gap={16}>
              {controller.phoneNumber ? (
                <CatchField id="event-runtime-phone-verified" inputMode="readOnly" keyboardType="phone" recipe="input"
                  suffixText={copy.verified} title={copy.phoneLabel} value={controller.phoneNumber} />
              ) : null}
              <CatchField autoComplete="name" id="event-runtime-name" maxLength={120}
                onChanged={(value) => controller.setDisplayName(value)} recipe="input"
                title={copy.displayNameLabel} value={controller.displayName} />
              {controller.preEventFieldId ? (
                <>
                  <PreEventProfileField controller={controller} />
                  <CatchCheckboxInput label={copy.preEventSensitiveConsent}
                    onChanged={(checked) => controller.setPreEventConsent(checked)} value={controller.preEventConsent} />
                </>
              ) : null}
              {controller.offersPreferenceProfile ? (
                <>
                  <CatchCheckboxInput label={copy.preferenceOptIn}
                    onChanged={(checked) => controller.setPreferenceProfileEnabled(checked)}
                    value={controller.preferenceProfileEnabled} />
                  {controller.preferenceProfileEnabled ? (
                    <PreferenceProfileFields controller={controller} />
                  ) : (
                    <CatchText tone="secondary" variant="body-small">{copy.preferenceSkipped}</CatchText>
                  )}
                </>
              ) : null}
              <CatchCheckboxInput label={copy.prefillConsent}
                onChanged={(checked) => controller.setSaveAsCatchPrefill(checked)} value={controller.saveAsCatchPrefill} />
              <CatchButton fill label={copy.continueAction} onPressed={noop} status={pending ? "loading" : "idle"} type="submit" />
              <RuntimeStatus status={controller.status} />
            </CatchStack>
          </Form>
          <QrNote />
        </>
      );
    case "approval":
      return (
        <>
          <JoinHead body={copy.approvalBody} event={event} title={copy.approvalTitle} />
          <CatchButton fill label={copy.refreshAction} onPressed={() => void controller.handleRefresh()}
            status={pending ? "loading" : "idle"} />
          <RuntimeStatus status={controller.status} />
        </>
      );
    case "venue":
      return (
        <>
          <JoinHead body={copy.venueBody} event={event} title={copy.venueTitle} />
          {event ? <ArrivalGuidance event={event} /> : null}
          <MessagingPreferences controller={controller} />
          <RuntimeStatus status={controller.status} />
        </>
      );
    case "runtime":
      return event ? <LiveRuntime controller={controller} format={format} /> : null;
  }
}

/** The join frame's opening: the tonight badge, the page title and its lead. */
function JoinHead({event, title, body}: {event?: RuntimeEvent | null; title: string; body?: string}) {
  return (
    <>
      {event ? (
        <CatchStack align="start">
          <CatchBadge label={event.serverTimeMillis >= event.startTimeMillis ?
            copy.joinBadge(event.locationName) :
            copy.joinBadgeUpcoming(event.locationName, formatEventTime(event.startTimeMillis))} recipe="live" />
        </CatchStack>
      ) : null}
      <CatchStack gap={8}>
        <CatchText as="h1" variant="page-title">{title}</CatchText>
        {body ? <CatchText tone="secondary" variant="body">{body}</CatchText> : null}
      </CatchStack>
    </>
  );
}

function QrNote() {
  return <CatchText tone="secondary" variant="body-small">{copy.qrNote}</CatchText>;
}

function RuntimeStatus({status}: {status: FormStatus}) {
  return (
    <CatchText role="status" tone={status.tone === "is-error" ? "danger" : "secondary"} variant="body-small">
      {status.message}
    </CatchText>
  );
}

/** A labelled row of chips: radios for one answer, pressed toggles for several. */
function ChoiceGroup({label, options, isSelected, onSelect, multiple = false, disabled = false}: {
  label: string;
  options: readonly {id: string; label: string}[];
  isSelected: (id: string) => boolean;
  onSelect: (id: string) => void;
  multiple?: boolean;
  disabled?: boolean;
}) {
  return (
    <CatchStack gap={8}>
      <CatchText variant="label-action">{label}</CatchText>
      <CatchStack aria-label={label} direction="row" gap={6} role={multiple ? "group" : "radiogroup"} wrap>
        {options.map((option) => (
          <CatchChip disabled={disabled} key={option.id} kind={multiple ? "filter" : "choice"} label={option.label}
            onPressed={() => onSelect(option.id)} selected={isSelected(option.id)} />
        ))}
      </CatchStack>
    </CatchStack>
  );
}

function PreEventProfileField({controller}: {controller: EventRuntimeController}) {
  switch (controller.preEventFieldId) {
    case "paceBand":
      return <ChoiceGroup isSelected={(id) => controller.paceBand === id} label={copy.paceBandLabel}
        onSelect={(id) => controller.setPaceBand(id as typeof eventRuntimePaceBandOptions[number]["id"])}
        options={eventRuntimePaceBandOptions} />;
    case "skillBand":
      return <ChoiceGroup isSelected={(id) => controller.skillBand === id} label={copy.skillBandLabel}
        onSelect={(id) => controller.setSkillBand(id as typeof eventRuntimeSkillBandOptions[number]["id"])}
        options={eventRuntimeSkillBandOptions} />;
    case "dietaryAndSeatingNotes":
      return (
        <CatchField id="event-runtime-dietary-seating" inputHint={copy.dietaryAndSeatingPlaceholder} maxLength={300}
          maxLines={3} onChanged={(value) => controller.setDietaryAndSeatingNotes(value)} recipe="input"
          title={copy.dietaryAndSeatingLabel} value={controller.dietaryAndSeatingNotes} />
      );
    case "questionnaireAnswerIds":
      return (
        <CatchStack gap={16}>
          <CatchStack gap={4}>
            <CatchText as="h2" variant="title-bar">{controller.questionnaire.title}</CatchText>
            <CatchText tone="secondary" variant="body-small">{copy.preEventBody}</CatchText>
          </CatchStack>
          <QuestionnaireQuestions controller={controller} />
        </CatchStack>
      );
    case "teamName":
      return (
        <CatchField helperText={copy.teamNameHelp} id="event-runtime-team-name" inputHint={copy.teamNamePlaceholder}
          maxLength={80} onChanged={(value) => controller.setTeamName(value)} recipe="input"
          title={copy.teamNameLabel} value={controller.teamName} />
      );
    case null:
      return null;
  }
}

function QuestionnaireQuestions({controller}: {controller: EventRuntimeController}) {
  return (
    <CatchStack gap={16}>
      {controller.questionnaire.questions.map((question) => (
        <ChoiceGroup isSelected={(id) => controller.questionAnswers[question.id] === id} key={question.id}
          label={question.prompt} onSelect={(id) => controller.selectQuestionAnswer(question.id, id)}
          options={question.options} />
      ))}
    </CatchStack>
  );
}

function PreferenceProfileFields({controller}: {controller: EventRuntimeController}) {
  return (
    <CatchStack gap={16}>
      <ChoiceGroup isSelected={(id) => controller.gender === id} label={copy.genderLabel}
        onSelect={(id) => controller.setGender(id as typeof eventRuntimeGenderOptions[number]["id"])}
        options={eventRuntimeGenderOptions} />
      <ChoiceGroup isSelected={(id) => controller.interestedInGenders.includes(id as typeof eventRuntimeGenderOptions[number]["id"])}
        label={copy.interestedLabel} multiple
        onSelect={(id) => controller.toggleInterest(id as typeof eventRuntimeGenderOptions[number]["id"])}
        options={eventRuntimeGenderOptions} />
      <CatchCheckboxInput label={copy.sensitiveConsent}
        onChanged={(checked) => controller.setSensitiveConsent(checked)} value={controller.sensitiveConsent} />
    </CatchStack>
  );
}

function MessagingPreferences({controller}: {controller: EventRuntimeController}) {
  const event = controller.bootstrap?.event;
  const attendeeId = controller.bootstrap?.participant?.eventAttendeeId;
  if (!event || !attendeeId) return null;
  return (
    <>
      <EventSmsPreferencePanel attendeeId={attendeeId} eventId={event.eventId} />
      <EventRcsPreferencesPanel attendeeId={attendeeId} eventId={event.eventId} />
      <EventWhatsappPreferencesPanel attendeeId={attendeeId} eventId={event.eventId} />
    </>
  );
}

/** The round (RbWebLive) and, once the final scores are out, the reveal (RbWebLiveReveal). */
function LiveRuntime({controller, format}: {controller: EventRuntimeController; format: CatchFormat | null}) {
  const bootstrap = controller.bootstrap!;
  const event = bootstrap.event;
  const plan = controller.liveState.plan;
  const standings = controller.liveState.standings;
  const standingRound = visibleEventRuntimeStandingRound(plan, standings);
  const finalReveal = standingRound !== null && (plan?.status === "complete" || controller.eventEnded);
  const assignments = controller.liveState.assignments;
  const profile = bootstrap.participant?.runtimeProfile ?? null;
  const yours = yourUnitLabels(controller);
  const meta = copy.liveMeta([...new Set([
    profile?.displayName || controller.displayName,
    profile?.teamName ?? "",
    ...assignments.map((assignment) => assignment.displayTitle),
  ].filter(Boolean))]);

  return (
    <>
      <CatchStack align="start" direction="row" gap={12} justify="between">
        <CatchStack gap={2}>
          <CatchText as="h1" variant="title-bar">{event.title}</CatchText>
          {meta ? <CatchText tone="secondary" variant="body-meta">{meta}</CatchText> : null}
        </CatchStack>
        <CatchBadge label={copy.checkedInCount(event.checkedInCount)} />
      </CatchStack>

      {finalReveal && standings ? (
        <>
          <RevealSpotlight format={format} round={standingRound} standings={standings} yours={yours} />
          <StandingsSection round={standingRound} standings={standings} title={copy.everyoneTitle} yours={yours} />
          <CatchStack gap={8}>
            <CatchButton fill href={copy.getAppHref} label={copy.stayInTouch} />
            <HelpButton />
          </CatchStack>
          <AfterTheNight controller={controller} />
        </>
      ) : (
        <>
          <NowSpotlight controller={controller} format={format} />
          <LiveModules controller={controller} />
          <ArrivalGuidance event={event} />
          <ShareTile controller={controller} />
          <AfterTheNight controller={controller} />
          <HelpButton />
          <CatchText align="center" tone="secondary" variant="body-small">{copy.noAppNote}</CatchText>
        </>
      )}

      <RuntimeStatus status={controller.status} />
      <MessagingPreferences controller={controller} />
      <CatchText tone="tertiary" variant="body-small">{copy.privacyNote}</CatchText>
    </>
  );
}

/** The team, table or pod names that are yours, to find your row in the scores. */
function yourUnitLabels(controller: EventRuntimeController): ReadonlySet<string> {
  return new Set([
    controller.bootstrap?.participant?.runtimeProfile?.teamName ?? "",
    ...controller.liveState.assignments.flatMap((assignment) => [assignment.unitLabel ?? "", assignment.displayTitle]),
  ].filter(Boolean));
}

function HelpButton() {
  return <CatchButton fill href="/help/" label={copy.helpAction} leadingIcon="help" variant="secondary" />;
}

/** The step happening now, in the night's colour: where it sits in the run of show, the host's note and the time left. */
function NowSpotlight({controller, format}: {controller: EventRuntimeController; format: CatchFormat | null}) {
  const event = controller.bootstrap!.event;
  const plan = controller.liveState.plan;
  const nowMillis = useClock(event.serverTimeMillis);
  const frame = useCeremonyFrame(resolveEventRuntimeCeremony(event.eventId, plan), plan?.revealStatus ?? "idle");
  const itinerary = sortedItinerary(event);
  const currentIndex = currentItineraryIndex(event, itinerary, nowMillis);
  const current = currentIndex >= 0 ? itinerary[currentIndex] : null;
  const startsAt = current ? itemStartMillis(event, current) : 0;
  const endsAt = current ? itemEndMillis(event, itinerary, currentIndex) : null;
  const timed = current !== null && endsAt !== null && endsAt > nowMillis;
  const note = plan?.attendeePrompt ?? current?.description ?? null;
  return (
    <CatchSurface block="spotlight" color={format ?? "ink"} data-phase={frame.phase}>
      <CatchStack gap={8}>
        <CatchStack direction="row" gap={12} justify="between">
          <CatchText variant="label-kicker">
            {current ? copy.nowStep(currentIndex + 1, itinerary.length) : copy.nowKicker}
          </CatchText>
          {timed ? (
            <CatchText numeric variant="label-kicker">{copy.minutesLeft(Math.ceil((endsAt - nowMillis) / 60_000))}</CatchText>
          ) : null}
        </CatchStack>
        <CatchText as="h2" variant="display-lg">{current?.title ?? copy.runtimeEyebrow}</CatchText>
        {note ? <CatchText variant="body">{note}</CatchText> : null}
        {timed ? (
          <CatchMeter fill="format" label={copy.stepMeterLabel} max={endsAt - startsAt} value={nowMillis - startsAt} />
        ) : null}
        {frame.phase !== "idle" ? (
          <CatchMeter fill="format" label={copy.revealMeterLabel} value={Math.round(frame.phaseProgress * 100)} />
        ) : null}
      </CatchStack>
    </CatchSurface>
  );
}

/** Ticks the reveal ceremony on the server's clock while it runs. */
function useCeremonyFrame(ceremony: EventRuntimeCeremony | null, revealStatus: "idle" | "countingDown" | "revealed") {
  const [ceremonyNowMillis, setCeremonyNowMillis] = useState(() => Date.now());
  useEffect(() => {
    if (!ceremony || revealStatus === "idle") return;
    setCeremonyNowMillis(Date.now());
    const interval = window.setInterval(
      () => setCeremonyNowMillis(Date.now()),
      eventRuntimeCeremonyTickMs
    );
    return () => window.clearInterval(interval);
  }, [ceremony?.timeline.completesAtMillis, revealStatus]);
  return resolveEventRuntimeMarqueeFrame(ceremony, revealStatus, ceremonyNowMillis);
}

/** A minute clock that never runs behind the server's bootstrap time. */
function useClock(serverTimeMillis: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);
  return Math.max(now, serverTimeMillis);
}

/** The live modules a host has switched on: the hello, the prompts, your place and the scores. */
function LiveModules({controller}: {controller: EventRuntimeController}) {
  const event = controller.bootstrap!.event;
  const plan = controller.liveState.plan;
  const modules = new Set(event.moduleIds);
  const mission = controller.liveState.mission;
  const standings = controller.liveState.standings;
  const standingRound = visibleEventRuntimeStandingRound(plan, standings);
  const revealBlocked = modules.has("live_reveal") && plan?.revealStatus !== "revealed";
  const lateArrival = controller.liveState.lateArrival;
  const showLateArrival = lateArrival !== null &&
    lateArrival.targetRoundIndex > (plan?.publishedRotationRoundIndex ?? -1);
  const socialMission = modules.has("social_missions") ?
    resolveEventRuntimeSocialMission(event.interactionModel, plan?.activeStepIndex ?? 0) : null;
  const assignments = controller.liveState.assignments;
  const yours = yourUnitLabels(controller);

  return (
    <>
      {modules.has("first_hello_check_in") ? (
        <CatchSurface block="tile">
          <CatchStack gap={8}>
            <CatchText tone="secondary" variant="label-kicker">
              {mission ? copy.liveMeta([copy.helloKicker, mission.targetContext]) : copy.helloKicker}
            </CatchText>
            {!mission ? (
              <>
                <CatchText as="h2" variant="display-sm">{copy.firstHelloBody}</CatchText>
                <CatchStack align="start">
                  <CatchButton label={copy.firstHelloStart} onPressed={() => void controller.startFirstHello()}
                    size="sm" status={controller.pending ? "loading" : "idle"} />
                </CatchStack>
              </>
            ) : (
              <>
                <CatchText as="h2" variant="display-sm">{mission.targetDisplayName}</CatchText>
                <CatchText variant="body">{mission.question}</CatchText>
                <ChoiceGroup disabled={controller.pending || mission.status !== "active"}
                  isSelected={(id) => mission.selectedAnswerId === id} label={mission.question}
                  onSelect={(id) => void controller.completeFirstHello(id)} options={mission.answerOptions} />
                {mission.status === "active" ? (
                  <CatchText tone="secondary" variant="body-small">{copy.firstHelloComplete}</CatchText>
                ) : null}
              </>
            )}
          </CatchStack>
        </CatchSurface>
      ) : null}

      {socialMission ? (
        <CatchSurface block="tile">
          <CatchStack gap={8}>
            <CatchText tone="secondary" variant="label-kicker">{socialMission.disclosureLabel}</CatchText>
            <CatchText as="h2" variant="title-bar">{socialMission.title}</CatchText>
            <CatchText variant="body">{socialMission.body}</CatchText>
          </CatchStack>
        </CatchSurface>
      ) : null}

      {showLateArrival ? (
        <CatchSurface block="tile">
          <CatchStack gap={4}>
            <CatchText as="h2" variant="title-bar">{copy.lateArrivalTitle}</CatchText>
            <CatchText variant="body">{lateArrival.reason}</CatchText>
          </CatchStack>
        </CatchSurface>
      ) : null}

      {standings ? (
        standingRound ? (
          <StandingsSection round={standingRound} standings={standings}
            title={copy.scoresAfterRound(standingRound.roundIndex + 1)} yours={yours} />
        ) : (
          <CatchSection title={copy.standingsTitle}>
            <CatchText tone="secondary" variant="body-small">{copy.revealWaiting}</CatchText>
          </CatchSection>
        )
      ) : (
        <CatchSection title={copy.assignmentTitle}>
          {revealBlocked ? (
            <CatchText tone="secondary" variant="body-small">{copy.revealWaiting}</CatchText>
          ) : assignments.length ? assignments.map((assignment) => (
            <CatchIndexRow
              body={assignment.whySummary}
              footer={shouldRenderEventRuntimeRoomMap(event.layout, assignment) ? (
                <EventRuntimeRoomMap
                  assignedLabel={copy.roomMapAssigned}
                  assignedUnitId={assignment.layoutUnitId!}
                  confirmedLabel={copy.roomMapConfirmed}
                  confirmedUnitId={assignment.confirmedLayoutUnitId}
                  positions={normalizeEventRuntimeLayoutUnits(event.layout.units)}
                  selfLabel={copy.roomMapSelf}
                  subtitle={copy.roomMapSubtitle}
                  title={copy.roomMapTitle}
                  units={event.layout.units}
                />
              ) : undefined}
              key={assignment.moduleId}
              meta={assignment.label}
              subtitle={assignment.displaySubtitle ?? undefined}
              title={assignment.displayTitle}
              wrap
            />
          )) : (
            <CatchText tone="secondary" variant="body-small">{copy.assignmentEmpty}</CatchText>
          )}
        </CatchSection>
      )}

      {modules.has("compatibility_questionnaire") ? (
        <CatchSurface block="tile">
          <CatchStack gap={16}>
            <CatchStack gap={4}>
              <CatchText as="h2" variant="title-bar">{controller.questionnaire.title}</CatchText>
              <CatchText tone="secondary" variant="body-small">{copy.compatibilityBody}</CatchText>
            </CatchStack>
            <QuestionnaireQuestions controller={controller} />
            <CatchButton label={copy.compatibilitySave} onPressed={() => void controller.saveCompatibilityAnswers()} size="sm" />
          </CatchStack>
        </CatchSurface>
      ) : null}

      {modules.has("wingman_requests") ? (
        <CatchSurface block="tile">
          <CatchStack gap={12}>
            <CatchStack gap={4}>
              <CatchText as="h2" variant="title-bar">{copy.wingmanTitle}</CatchText>
              <CatchText tone="secondary" variant="body-small">{copy.wingmanBody}</CatchText>
            </CatchStack>
            {controller.wingmanCandidates.length ? (
              <CatchField
                hintText={copy.wingmanSelect}
                id="event-runtime-wingman"
                itemLabelBuilder={(candidate) => candidate.displayName}
                itemValueBuilder={(candidate) => candidate.uid}
                onChanged={(candidate) => controller.setWingmanTargetUid(candidate?.uid ?? "")}
                recipe="select"
                title={copy.wingmanSelect}
                value={controller.wingmanCandidates.find(
                  (candidate) => candidate.uid === controller.wingmanTargetUid) ?? null}
                values={controller.wingmanCandidates}
              />
            ) : <CatchText tone="secondary" variant="body-small">{copy.wingmanEmpty}</CatchText>}
            {controller.liveState.wingmanTargetUid ? (
              <CatchButton label={copy.wingmanWithdraw} onPressed={() => void controller.withdrawWingmanRequest()}
                size="sm" variant="secondary" />
            ) : (
              <CatchButton label={copy.wingmanSubmit}
                onPressed={controller.wingmanTargetUid ? () => void controller.submitWingmanRequest() : null} size="sm" />
            )}
          </CatchStack>
        </CatchSurface>
      ) : null}
    </>
  );
}

function ShareTile({controller}: {controller: EventRuntimeController}) {
  return (
    <CatchSurface block="tile">
      <CatchStack gap={8}>
        <CatchText as="h2" variant="title-bar">{copy.shareTitle}</CatchText>
        <CatchText tone="secondary" variant="body-small">{copy.shareBody}</CatchText>
        <CatchStack align="start">
          <CatchButton
            label={controller.attendeeInviteLink ? copy.shareAction : copy.shareRetry}
            onPressed={() => controller.attendeeInviteLink ?
              void controller.shareEvent() : controller.retryAttendeeInviteLink()}
            size="sm"
            status={controller.attendeeInviteLinkLoading ? "loading" : "idle"}
            variant="secondary"
          />
        </CatchStack>
      </CatchStack>
    </CatchSurface>
  );
}

/** Once the night is over: who you talked to, and a private read on the event. */
function AfterTheNight({controller}: {controller: EventRuntimeController}) {
  const modules = new Set(controller.bootstrap!.event.moduleIds);
  if (!controller.eventEnded) return null;
  const graph = controller.conversationGraph;
  return (
    <>
      <CatchSurface block="tile">
        <CatchStack gap={12}>
          <CatchStack gap={4}>
            <CatchText as="h2" variant="title-bar">{graph?.prompt ?? copy.conversationTitle}</CatchText>
            <CatchText tone="secondary" variant="body-small">{copy.conversationBody}</CatchText>
          </CatchStack>
          {controller.conversationGraphLoading ? (
            <CatchText tone="secondary" variant="body-small">{copy.conversationLoading}</CatchText>
          ) : graph?.candidates.length ? (
            <>
              <CatchStack aria-label={graph.prompt} direction="row" gap={6} role="group" wrap>
                {graph.candidates.map((candidate) => (
                  <CatchChip key={candidate.uid} kind="filter"
                    label={copy.conversationChip(candidate.displayName, candidate.assigned ? copy.conversationSuggested : null)}
                    onPressed={() => controller.toggleConversationUid(candidate.uid)}
                    selected={controller.selectedConversationUids.includes(candidate.uid)} />
                ))}
              </CatchStack>
              <CatchStack direction="row" gap={8} wrap>
                <CatchButton label={copy.conversationSave} onPressed={() => void controller.submitConversationGraph()}
                  size="sm" status={controller.pending ? "loading" : "idle"} />
                <CatchButton label={copy.conversationSkip}
                  onPressed={controller.pending ? null : () => void controller.submitConversationGraph(true)}
                  size="sm" variant="secondary" />
              </CatchStack>
            </>
          ) : graph ? (
            <CatchText tone="secondary" variant="body-small">{copy.conversationEmpty}</CatchText>
          ) : null}
          <CatchText tone="tertiary" variant="body-small">{copy.conversationPrivacy}</CatchText>
        </CatchStack>
      </CatchSurface>

      {modules.has("decomposed_feedback") ? (
        <CatchSurface block="tile">
          <Form onSubmit={(submitEvent) => {
            submitEvent.preventDefault();
            void controller.submitFeedback();
          }} pending={controller.pending}>
            <CatchStack gap={16}>
              <CatchStack gap={4}>
                <CatchText as="h2" variant="title-bar">{copy.feedbackTitle}</CatchText>
                <CatchText tone="secondary" variant="body-small">{copy.feedbackBody}</CatchText>
              </CatchStack>
              <RatingGroup label={copy.welcomeRating} onChange={controller.setWelcomeRating} value={controller.welcomeRating} />
              <RatingGroup label={copy.structureRating} onChange={controller.setStructureRating} value={controller.structureRating} />
              <CatchField id="event-runtime-people-met" keyboardType="number" max={100} min={0}
                onChanged={(value) => controller.setMetNewPeopleCount(Math.max(0, Math.min(100, Number(value) || 0)))}
                recipe="input" title={copy.peopleMet} value={String(controller.metNewPeopleCount)} />
              <CatchCheckboxInput label={copy.safetyConcern}
                onChanged={(checked) => controller.setSafetyConcern(checked)} value={controller.safetyConcern} />
              <CatchField id="event-runtime-private-note" maxLength={500} maxLines={3}
                onChanged={(value) => controller.setPrivateNote(value)} recipe="input"
                title={copy.privateNote} value={controller.privateNote} />
              <CatchButton label={copy.feedbackSave} onPressed={noop} type="submit" />
            </CatchStack>
          </Form>
        </CatchSurface>
      ) : null}
    </>
  );
}

const ratingOptions = [1, 2, 3, 4, 5].map((score) => ({id: String(score), label: String(score)}));

function RatingGroup({label, onChange, value}: {label: string; onChange: (value: number) => void; value: number}) {
  return <ChoiceGroup isSelected={(id) => id === String(value)} label={label}
    onSelect={(id) => onChange(Number(id))} options={ratingOptions} />;
}

/** The reveal: your place, large, in the night's colour. */
function RevealSpotlight({format, round, standings, yours}: {
  format: CatchFormat | null;
  round: EventRuntimeStandingRound;
  standings: EventRuntimeStandings;
  yours: ReadonlySet<string>;
}) {
  const mine = round.entries.find((entry) => yours.has(entry.unitLabel)) ?? null;
  return (
    <CatchSurface block="spotlight" color={format ?? "ink"}>
      <CatchStack gap={8}>
        <CatchText variant="label-kicker">{copy.finalScoresKicker}</CatchText>
        {mine ? (
          <>
            <CatchText as="h2" numeric variant="display-hero">{copy.placeOrdinal(mine.position)}</CatchText>
            <CatchText variant="title-bar">
              {standings.unitOutcome === "score" ?
                copy.placeScore(mine.unitLabel, mine.value) : copy.placeRank(mine.unitLabel, mine.value)}
            </CatchText>
          </>
        ) : (
          <CatchText as="h2" variant="display-lg">{copy.standingsTitle}</CatchText>
        )}
      </CatchStack>
    </CatchSurface>
  );
}

function StandingsSection({title, round, standings, yours}: {
  title: string;
  round: EventRuntimeStandingRound;
  standings: EventRuntimeStandings;
  yours: ReadonlySet<string>;
}) {
  return (
    <CatchSection title={title}>
      {round.entries.map((entry) => {
        const mine = yours.has(entry.unitLabel);
        return (
          <CatchIndexRow
            density="compact"
            key={entry.unitId}
            rank={entry.position}
            selected={mine}
            title={mine ? copy.yourRow(entry.unitLabel) : entry.unitLabel}
            value={standings.unitOutcome === "score" ? copy.scoreValue(entry.value) : copy.placeOrdinal(entry.value)}
          />
        );
      })}
    </CatchSection>
  );
}

/** The run of show as a timeline, then route and pace groups and where the moving group is. */
function ArrivalGuidance({event}: {event: RuntimeEvent}) {
  const nowMillis = useClock(event.serverTimeMillis);
  const itinerary = sortedItinerary(event);
  const currentIndex = currentItineraryIndex(event, itinerary, nowMillis);
  const routePlan = event.routePlan ?? null;
  const livePosition = [...(event.livePositions ?? [])].sort((left, right) =>
    right.recordedAtMillis - left.recordedAtMillis
  )[0] ?? null;
  const nextPublishedStop = itinerary.find((item) =>
    itemStartMillis(event, item) >= event.serverTimeMillis &&
    (item.kind === "stop" || item.kind === "finish" || Boolean(item.location))
  ) ?? null;
  const paceGroups = [...(routePlan?.paceGroups ?? [])].sort((left, right) => left.sortOrder - right.sortOrder);

  return (
    <>
      {itinerary.length ? (
        <CatchSection dividers="none" timeline title={copy.runOfShowTitle}>
          {itinerary.map((item, index) => (
            <CatchIndexRow
              density="compact"
              key={item.id}
              marker={timelineMarker(index, currentIndex)}
              subtitle={copy.liveMeta([item.description ?? "", item.location?.name ?? ""].filter(Boolean)) || undefined}
              time={formatEventTime(itemStartMillis(event, item))}
              title={item.title}
              wrap
            />
          ))}
        </CatchSection>
      ) : null}

      {routePlan ? (
        <CatchSection note={routePlan.path?.length ? copy.mappedRoute(routePlan.path.length) : undefined}
          title={copy.movementTitle}>
          {paceGroups.map((group) => (
            <CatchIndexRow
              density="compact"
              key={group.id}
              title={group.label}
              value={group.targetPaceSecondsPerKm ? copy.paceTarget(group.targetPaceSecondsPerKm) : undefined}
            />
          ))}
        </CatchSection>
      ) : null}

      {livePosition || nextPublishedStop ? (
        <CatchSurface block="tile">
          <CatchStack gap={8}>
            <CatchText as="h2" variant="title-bar">{copy.movingGroupTitle}</CatchText>
            <CatchText variant="body-small">
              {livePosition ? copy.movingGroupBody : copy.movingGroupScheduledBody}
            </CatchText>
            {livePosition ? (
              <>
                <CatchText tone="secondary" variant="body-meta">{copy.movingGroupUpdated(livePosition.recordedAtMillis)}</CatchText>
                <EventRuntimeRouteMap
                  ariaLabel={copy.movingGroupMapLabel}
                  help={copy.movingGroupMapHelp}
                  marker={livePosition}
                  path={routePlan?.path ?? []}
                />
              </>
            ) : null}
            {nextPublishedStop ? (
              <CatchText variant="label-action">{copy.nextPublishedStop(nextPublishedStop.title)}</CatchText>
            ) : null}
          </CatchStack>
        </CatchSurface>
      ) : null}
    </>
  );
}

function timelineMarker(index: number, currentIndex: number): CatchMarkerProps {
  if (index < currentIndex) return {tone: "muted", size: 12};
  if (index === currentIndex) return {kind: "dot", tone: "format", size: 12, live: true};
  return {kind: "ring", size: 12};
}

function sortedItinerary(event: RuntimeEvent): ItineraryItem[] {
  return [...(event.itinerary ?? [])].sort((left, right) =>
    left.offsetMinutes - right.offsetMinutes || left.id.localeCompare(right.id)
  );
}

function itemStartMillis(event: RuntimeEvent, item: ItineraryItem) {
  return event.startTimeMillis + item.offsetMinutes * 60_000;
}

/** A step ends after its own duration, or when the next step starts. */
function itemEndMillis(event: RuntimeEvent, itinerary: readonly ItineraryItem[], index: number): number | null {
  const item = itinerary[index]!;
  if (item.durationMinutes) return itemStartMillis(event, item) + item.durationMinutes * 60_000;
  const next = itinerary[index + 1];
  return next ? itemStartMillis(event, next) : null;
}

function currentItineraryIndex(event: RuntimeEvent, itinerary: readonly ItineraryItem[], nowMillis: number) {
  let current = -1;
  itinerary.forEach((item, index) => {
    if (itemStartMillis(event, item) <= nowMillis) current = index;
  });
  return current;
}

function formatEventTime(millis: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(millis));
}
