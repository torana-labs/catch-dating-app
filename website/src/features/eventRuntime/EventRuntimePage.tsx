import {CatchField, CatchGap} from "@catch/web-ui";
import {EventWhatsappPreferencesPanel} from "../eventMessaging/EventWhatsappPreferencesPanel";
import {EventRcsPreferencesPanel} from "../eventMessaging/EventRcsPreferencesPanel";
import {EventSmsPreferencePanel} from "../eventMessaging/EventSmsPreferencePanel";
import {useEffect, useState} from "react";
import {useParams} from "react-router";
import {
  eventRuntimeCopy,
  eventRuntimeGenderOptions,
  eventRuntimePaceBandOptions,
  eventRuntimeSkillBandOptions,
} from "../../content/eventRuntime";
import {
  Button,
  ButtonLink,
  ChoiceChip,
  ChoiceChipGrid,
  EventRuntimeArrivalRing,
  EventRuntimeAssignments,
  EventRuntimeConsent,
  EventRuntimeFieldset,
  EventRuntimeFrame,
  Form,
  EventRuntimeKicker,
  EventRuntimeLive,
  EventRuntimeLiveHeader,
  EventRuntimeLoading,
  EventRuntimeMission,
  EventRuntimeModule,
  EventRuntimePanel,
  EventRuntimePrivacy,
  EventRuntimeRoomMap,
  EventRuntimeRouteMap,
  EventRuntimeStageMarquee,
  FormStatus,
} from "../../shared/ui/primitives";
import {useEventRuntimeController} from "./useEventRuntimeController";
import {
  normalizeEventRuntimeLayoutUnits,
  eventVenueSessionTokenFromFragment,
  resolveEventRuntimeCeremony,
  resolveEventRuntimeSocialMission,
  shouldRenderEventRuntimeRoomMap,
  type EventRuntimeCeremony,
  visibleEventRuntimeStandingRound,
} from "./eventRuntimeModel";
import {
  eventRuntimeActivityIdForPresentation,
  eventRuntimeCeremonyTickMs,
  eventRuntimeVisualAssetForMotif,
  eventRuntimeVisualAssetPath,
  resolveEventRuntimeMarqueeFrame,
  resolveEventRuntimeStagePresentation,
} from "./eventRuntimeMotion";

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
  const event = controller.bootstrap?.event ?? null;

  if (controller.stage === "loading") {
    return (
      <EventRuntimeFrame
        brandLabel={eventRuntimeCopy.brand}
        brandWord={eventRuntimeCopy.brandWord}
        eventTitle={event?.title}
      >
        <EventRuntimeLoading label={eventRuntimeCopy.brand} />
      </EventRuntimeFrame>
    );
  }

  if (controller.stage === "unavailable") {
    return (
      <EventRuntimeFrame
        brandLabel={eventRuntimeCopy.brand}
        brandWord={eventRuntimeCopy.brandWord}
        eventTitle={event?.title}
      >
        <EventRuntimePanel
          kicker={eventRuntimeCopy.brand}
          title={eventRuntimeCopy.unavailableTitle}
          body={eventRuntimeCopy.unavailableBody}
        >
          <FormStatus status={controller.status} />
          <ButtonLink href="/help" variant="ghost">
            {eventRuntimeCopy.helpAction}
          </ButtonLink>
        </EventRuntimePanel>
      </EventRuntimeFrame>
    );
  }

  return (
    <EventRuntimeFrame
      brandLabel={eventRuntimeCopy.brand}
      brandWord={eventRuntimeCopy.brandWord}
      eventTitle={event?.title}
    >
      {controller.stage === "phone" ? (
        <EventRuntimePanel
          kicker={eventRuntimeCopy.phoneKicker}
          title={eventRuntimeCopy.phoneTitle}
          body={eventRuntimeCopy.phoneBody}
        >
          <Form onSubmit={controller.handlePhoneSubmit} pending={controller.pending}>
            <CatchGap size="formField">
            <CatchField
              recipe="input"
              autoComplete="tel"
              id="event-runtime-phone"
              title={eventRuntimeCopy.phoneLabel}
              onChanged={(value) => controller.setPhoneNumber(value)}
              inputHint={eventRuntimeCopy.phonePlaceholder}
              value={controller.phoneNumber}
              keyboardType="phone"
            />
            <div id={controller.recaptchaContainerId} />
            <Button loading={controller.pending} loadingLabel={eventRuntimeCopy.sendingCode} type="submit">
              {eventRuntimeCopy.sendCode}
            </Button>
            <FormStatus status={controller.status} />
            </CatchGap>
          </Form>
        </EventRuntimePanel>
      ) : null}

      {controller.stage === "otp" ? (
        <EventRuntimePanel
          kicker={eventRuntimeCopy.otpKicker}
          title={eventRuntimeCopy.otpTitle}
          body={eventRuntimeCopy.otpBody}
        >
          <Form onSubmit={controller.handleCodeSubmit} pending={controller.pending}>
            <CatchGap size="formField">
            <CatchField
              recipe="input"
              autoComplete="one-time-code"
              id="event-runtime-code"
              title={eventRuntimeCopy.otpLabel}
              maxLength={6}
              onChanged={(value) => controller.setCode(value.replace(/\D/gu, ""))}
              value={controller.code}
              keyboardType="number"
            />
            <Button loading={controller.pending} loadingLabel={eventRuntimeCopy.confirmingCode} type="submit">
              {eventRuntimeCopy.confirmCode}
            </Button>
            <FormStatus status={controller.status} />
            </CatchGap>
          </Form>
        </EventRuntimePanel>
      ) : null}

      {controller.stage === "profile" ? (
        <EventRuntimePanel
          kicker={eventRuntimeCopy.profileKicker}
          title={eventRuntimeCopy.profileTitle}
          body={eventRuntimeCopy.profileBody}
        >
          <Form onSubmit={controller.handleProfileSubmit} pending={controller.pending}>
            <CatchGap size="formField">
            <CatchField
              recipe="input"
              autoComplete="name"
              id="event-runtime-name"
              title={eventRuntimeCopy.displayNameLabel}
              maxLength={120}
              onChanged={(value) => controller.setDisplayName(value)}
              value={controller.displayName}
            />
            {controller.preEventFieldId ? (
              <>
                <PreEventProfileField controller={controller} />
                <EventRuntimeConsent
                  checked={controller.preEventConsent}
                  onChange={(event) => controller.setPreEventConsent(
                    event.target.checked
                  )}
                >
                  {eventRuntimeCopy.preEventSensitiveConsent}
                </EventRuntimeConsent>
              </>
            ) : null}
            {controller.offersPreferenceProfile ? (
              <>
                <EventRuntimeConsent
                  checked={controller.preferenceProfileEnabled}
                  onChange={(event) => controller.setPreferenceProfileEnabled(event.target.checked)}
                >
                  {eventRuntimeCopy.preferenceOptIn}
                </EventRuntimeConsent>
                {controller.preferenceProfileEnabled ? (
                  <CompatibilityProfileFields controller={controller} />
                ) : (
                  <p>{eventRuntimeCopy.preferenceSkipped}</p>
                )}
              </>
            ) : null}
            <EventRuntimeConsent
              checked={controller.saveAsCatchPrefill}
              onChange={(event) => controller.setSaveAsCatchPrefill(event.target.checked)}
            >
              {eventRuntimeCopy.prefillConsent}
            </EventRuntimeConsent>
            <Button loading={controller.pending} loadingLabel={eventRuntimeCopy.savingProfile} type="submit">
              {eventRuntimeCopy.continueAction}
            </Button>
            <FormStatus status={controller.status} />
            </CatchGap>
          </Form>
        </EventRuntimePanel>
      ) : null}

      {controller.stage === "approval" ? (
        <EventRuntimePanel
          kicker={eventRuntimeCopy.approvalKicker}
          title={eventRuntimeCopy.approvalTitle}
          body={eventRuntimeCopy.approvalBody}
        >
          <Button
            loading={controller.pending}
            onClick={() => void controller.handleRefresh()}
            type="button"
          >
            {eventRuntimeCopy.refreshAction}
          </Button>
          <FormStatus status={controller.status} />
        </EventRuntimePanel>
      ) : null}

      {controller.stage === "venue" ? (
        <EventRuntimePanel
          kicker={eventRuntimeCopy.venueKicker}
          title={eventRuntimeCopy.venueTitle}
          body={eventRuntimeCopy.venueBody}
        >
          {event ? <EventArrivalGuidance event={event} /> : null}
          {event && controller.bootstrap?.participant?.eventAttendeeId ?
            <>
              <EventSmsPreferencePanel eventId={event.eventId}
                attendeeId={controller.bootstrap.participant.eventAttendeeId} />
              <EventRcsPreferencesPanel eventId={event.eventId}
                attendeeId={controller.bootstrap.participant.eventAttendeeId} />
              <EventWhatsappPreferencesPanel eventId={event.eventId}
                attendeeId={controller.bootstrap.participant.eventAttendeeId} />
            </> : null}
          <FormStatus status={controller.status} />
        </EventRuntimePanel>
      ) : null}

      {controller.stage === "runtime" && event ? (
        <LiveEventRuntime controller={controller} />
      ) : null}
    </EventRuntimeFrame>
  );
}

function PreEventProfileField({
  controller,
}: {
  controller: ReturnType<typeof useEventRuntimeController>;
}) {
  switch (controller.preEventFieldId) {
    case "paceBand":
      return (
        <EventRuntimeFieldset>
          <legend>{eventRuntimeCopy.paceBandLabel}</legend>
          <ChoiceChipGrid aria-label={eventRuntimeCopy.paceBandLabel}>
            {eventRuntimePaceBandOptions.map((option) => (
              <ChoiceChip
                key={option.id}
                onClick={() => controller.setPaceBand(option.id)}
                selected={controller.paceBand === option.id}
              >
                {option.label}
              </ChoiceChip>
            ))}
          </ChoiceChipGrid>
        </EventRuntimeFieldset>
      );
    case "skillBand":
      return (
        <EventRuntimeFieldset>
          <legend>{eventRuntimeCopy.skillBandLabel}</legend>
          <ChoiceChipGrid aria-label={eventRuntimeCopy.skillBandLabel}>
            {eventRuntimeSkillBandOptions.map((option) => (
              <ChoiceChip
                key={option.id}
                onClick={() => controller.setSkillBand(option.id)}
                selected={controller.skillBand === option.id}
              >
                {option.label}
              </ChoiceChip>
            ))}
          </ChoiceChipGrid>
        </EventRuntimeFieldset>
      );
    case "dietaryAndSeatingNotes":
      return (
        <CatchField
          recipe="input"
          id="event-runtime-dietary-seating"
          title={eventRuntimeCopy.dietaryAndSeatingLabel}
          maxLength={300}
          onChanged={(value) => controller.setDietaryAndSeatingNotes(
            value
          )}
          inputHint={eventRuntimeCopy.dietaryAndSeatingPlaceholder}
          maxLines={3}
          value={controller.dietaryAndSeatingNotes}
        />
      );
    case "questionnaireAnswerIds":
      return (
        <CatchGap size="section">
          <h3>{controller.questionnaire.title}</h3>
          <p>{eventRuntimeCopy.preEventBody}</p>
          <CatchGap size="section">
            {controller.questionnaire.questions.map((question) => (
              <EventRuntimeFieldset key={question.id}>
                <legend>{question.prompt}</legend>
                <ChoiceChipGrid aria-label={question.prompt}>
                  {question.options.map((answer) => (
                    <ChoiceChip
                      key={answer.id}
                      onClick={() => controller.selectQuestionAnswer(
                        question.id,
                        answer.id
                      )}
                      selected={controller.questionAnswers[question.id] ===
                        answer.id}
                    >
                      {answer.label}
                    </ChoiceChip>
                  ))}
                </ChoiceChipGrid>
              </EventRuntimeFieldset>
            ))}
          </CatchGap>
        </CatchGap>
      );
    case "teamName":
      return (
        <CatchField
          recipe="input"
          id="event-runtime-team-name"
          title={eventRuntimeCopy.teamNameLabel}
          maxLength={80}
          onChanged={(value) => controller.setTeamName(value)}
          inputHint={eventRuntimeCopy.teamNamePlaceholder}
          value={controller.teamName}
        />
      );
    case null:
      return null;
  }
}

function CompatibilityProfileFields({
  controller,
}: {
  controller: ReturnType<typeof useEventRuntimeController>;
}) {
  return (
    <CatchGap size="section">
      <EventRuntimeFieldset>
        <legend>{eventRuntimeCopy.genderLabel}</legend>
        <ChoiceChipGrid aria-label={eventRuntimeCopy.genderLabel}>
          {eventRuntimeGenderOptions.map((option) => (
            <ChoiceChip
              key={option.id}
              onClick={() => controller.setGender(option.id)}
              selected={controller.gender === option.id}
            >
              {option.label}
            </ChoiceChip>
          ))}
        </ChoiceChipGrid>
      </EventRuntimeFieldset>
      <EventRuntimeFieldset>
        <legend>{eventRuntimeCopy.interestedLabel}</legend>
        <ChoiceChipGrid aria-label={eventRuntimeCopy.interestedLabel}>
          {eventRuntimeGenderOptions.map((option) => (
            <ChoiceChip
              key={option.id}
              onClick={() => controller.toggleInterest(option.id)}
              selected={controller.interestedInGenders.includes(option.id)}
            >
              {option.label}
            </ChoiceChip>
          ))}
        </ChoiceChipGrid>
      </EventRuntimeFieldset>
      <EventRuntimeConsent
        checked={controller.sensitiveConsent}
        onChange={(event) => controller.setSensitiveConsent(event.target.checked)}
      >
        {eventRuntimeCopy.sensitiveConsent}
      </EventRuntimeConsent>
    </CatchGap>
  );
}

function LiveEventRuntime({
  controller,
}: {
  controller: ReturnType<typeof useEventRuntimeController>;
}) {
  const event = controller.bootstrap!.event;
  const plan = controller.liveState.plan;
  const modules = new Set(event.moduleIds);
  const mission = controller.liveState.mission;
  const revealBlocked = modules.has("live_reveal") &&
    controller.liveState.plan?.revealStatus !== "revealed";
  const standings = controller.liveState.standings;
  const standingRound = visibleEventRuntimeStandingRound(
    controller.liveState.plan,
    standings
  );
  const lateArrival = controller.liveState.lateArrival;
  const showLateArrival = lateArrival !== null &&
    lateArrival.targetRoundIndex >
      (plan?.publishedRotationRoundIndex ?? -1);
  const presentation = resolveEventRuntimeStagePresentation(controller.liveState);
  const theatricalSource = eventRuntimeVisualAssetPath("theatrical");
  const socialMission = modules.has("social_missions") ?
    resolveEventRuntimeSocialMission(
      event.interactionModel,
      plan?.activeStepIndex ?? 0
    ) : null;
  return (
    <EventRuntimeLive
      activityId={eventRuntimeActivityIdForPresentation(
        presentation,
        plan?.revealStatus ?? "idle"
      )}
      background={(
        <EventRuntimeLiveMotion
          ceremony={resolveEventRuntimeCeremony(event.eventId, plan)}
          checkedInCount={event.checkedInCount}
          motifId={presentation.motifId}
          revealStatus={plan?.revealStatus ?? "idle"}
        />
      )}
    >
      <EventRuntimeLiveHeader badge={(
        <EventRuntimeArrivalRing
          ariaLabel={eventRuntimeCopy.checkedInCount(event.checkedInCount)}
          count={event.checkedInCount}
          label={eventRuntimeCopy.checkedIn}
          source={theatricalSource}
        />
      )}>
        <EventRuntimeKicker>{eventRuntimeCopy.runtimeEyebrow}</EventRuntimeKicker>
        <h1>{event.title}</h1>
        <p>{event.locationName} · {formatEventTime(event.startTimeMillis)}</p>
      </EventRuntimeLiveHeader>

      <EventArrivalGuidance event={event} />

      <EventRuntimeModule title={eventRuntimeCopy.shareTitle}>
        <p>{eventRuntimeCopy.shareBody}</p>
        <Button
          loading={controller.attendeeInviteLinkLoading}
          loadingLabel={eventRuntimeCopy.sharePreparing}
          onClick={() => controller.attendeeInviteLink ?
            void controller.shareEvent() : controller.retryAttendeeInviteLink()}
          type="button"
        >
          {controller.attendeeInviteLink ?
            eventRuntimeCopy.shareAction : eventRuntimeCopy.shareRetry}
        </Button>
      </EventRuntimeModule>

      <EventRuntimeModule
        title={standings ? eventRuntimeCopy.standingsTitle : eventRuntimeCopy.assignmentTitle}
        accent="coral"
      >
        {standings ? (
          standingRound ? (
            <EventRuntimeAssignments>
              {standingRound.entries.map((entry) => (
                <article key={entry.unitId}>
                  <span>#{entry.position}</span>
                  <h3>{entry.unitLabel}</h3>
                  <p>{standings.unitOutcome === "score" ?
                    `${entry.value} points` : `Rank ${entry.value}`}</p>
                  <small>{entry.roundsRecorded} {entry.roundsRecorded === 1 ?
                    "round recorded" : "rounds recorded"}</small>
                </article>
              ))}
            </EventRuntimeAssignments>
          ) : <p>{eventRuntimeCopy.revealWaiting}</p>
        ) : revealBlocked ? <p>{eventRuntimeCopy.revealWaiting}</p> :
          controller.liveState.assignments.length ? (
          <EventRuntimeAssignments>
            {controller.liveState.assignments.map((assignment) => (
              <article key={assignment.moduleId}>
                <span>{assignment.label}</span>
                <h3>{assignment.displayTitle}</h3>
                {assignment.displaySubtitle ? <p>{assignment.displaySubtitle}</p> : null}
                {assignment.whySummary ? <small>{assignment.whySummary}</small> : null}
                {shouldRenderEventRuntimeRoomMap(event.layout, assignment) ? (
                  <EventRuntimeRoomMap
                    assignedLabel={eventRuntimeCopy.roomMapAssigned}
                    assignedUnitId={assignment.layoutUnitId!}
                    confirmedLabel={eventRuntimeCopy.roomMapConfirmed}
                    confirmedUnitId={assignment.confirmedLayoutUnitId}
                    positions={normalizeEventRuntimeLayoutUnits(event.layout.units)}
                    selfLabel={eventRuntimeCopy.roomMapSelf}
                    subtitle={eventRuntimeCopy.roomMapSubtitle}
                    title={eventRuntimeCopy.roomMapTitle}
                    units={event.layout.units}
                  />
                ) : null}
              </article>
            ))}
          </EventRuntimeAssignments>
          ) : <p>{eventRuntimeCopy.assignmentEmpty}</p>}
      </EventRuntimeModule>

      {showLateArrival ? (
        <EventRuntimeModule title={eventRuntimeCopy.lateArrivalTitle}>
          <p>{lateArrival.reason}</p>
        </EventRuntimeModule>
      ) : null}

      {controller.liveState.plan?.attendeePrompt ? (
        <EventRuntimeModule title={eventRuntimeCopy.hostPromptTitle}>
          <p>{controller.liveState.plan.attendeePrompt}</p>
        </EventRuntimeModule>
      ) : null}

      {socialMission ? (
        <EventRuntimeModule title={socialMission.title}>
          <p>{socialMission.body}</p>
          <small>{socialMission.disclosureLabel}</small>
        </EventRuntimeModule>
      ) : null}

      {modules.has("first_hello_check_in") ? (
        <EventRuntimeModule title={eventRuntimeCopy.firstHelloTitle}>
          <p>{eventRuntimeCopy.firstHelloBody}</p>
          {!mission ? (
            <Button
              loading={controller.pending}
              loadingLabel={eventRuntimeCopy.firstHelloStarting}
              onClick={() => void controller.startFirstHello()}
              type="button"
            >
              {eventRuntimeCopy.firstHelloStart}
            </Button>
          ) : (
            <EventRuntimeMission>
              <span>{mission.targetContext}</span>
              <h3>{mission.targetDisplayName}</h3>
              <p>{mission.question}</p>
              <ChoiceChipGrid aria-label={mission.question}>
                {mission.answerOptions.map((answer) => (
                  <ChoiceChip
                    disabled={controller.pending || mission.status !== "active"}
                    key={answer.id}
                    onClick={() => void controller.completeFirstHello(answer.id)}
                    selected={mission.selectedAnswerId === answer.id}
                  >
                    {answer.label}
                  </ChoiceChip>
                ))}
              </ChoiceChipGrid>
              {mission.status === "active" ? <small>{eventRuntimeCopy.firstHelloComplete}</small> : null}
            </EventRuntimeMission>
          )}
        </EventRuntimeModule>
      ) : null}

      {modules.has("compatibility_questionnaire") ? (
        <EventRuntimeModule title={controller.questionnaire.title}>
          <p>{eventRuntimeCopy.compatibilityBody}</p>
          <CatchGap size="section">
            {controller.questionnaire.questions.map((question) => (
              <EventRuntimeFieldset key={question.id}>
                <legend>{question.prompt}</legend>
                <ChoiceChipGrid aria-label={question.prompt}>
                  {question.options.map((answer) => (
                    <ChoiceChip
                      key={answer.id}
                      onClick={() => controller.selectQuestionAnswer(question.id, answer.id)}
                      selected={controller.questionAnswers[question.id] === answer.id}
                    >
                      {answer.label}
                    </ChoiceChip>
                  ))}
                </ChoiceChipGrid>
              </EventRuntimeFieldset>
            ))}
          </CatchGap>
          <Button onClick={() => void controller.saveCompatibilityAnswers()} type="button">
            {eventRuntimeCopy.compatibilitySave}
          </Button>
        </EventRuntimeModule>
      ) : null}

      {modules.has("wingman_requests") ? (
        <EventRuntimeModule title={eventRuntimeCopy.wingmanTitle}>
          <p>{eventRuntimeCopy.wingmanBody}</p>
          {controller.wingmanCandidates.length ? (
            <CatchField
              recipe="select"
              id="event-runtime-wingman"
              title={eventRuntimeCopy.wingmanSelect}
              hintText={eventRuntimeCopy.wingmanSelect}
              values={controller.wingmanCandidates}
              itemLabelBuilder={(candidate) => candidate.displayName}
              itemValueBuilder={(candidate) => candidate.uid}
              value={controller.wingmanCandidates.find(
                (candidate) => candidate.uid === controller.wingmanTargetUid) ?? null}
              onChanged={(candidate) => controller.setWingmanTargetUid(candidate?.uid ?? "")}
            />
          ) : <p>{eventRuntimeCopy.wingmanEmpty}</p>}
          {controller.liveState.wingmanTargetUid ? (
            <Button onClick={() => void controller.withdrawWingmanRequest()} type="button" variant="ghost">
              {eventRuntimeCopy.wingmanWithdraw}
            </Button>
          ) : (
            <Button
              disabled={!controller.wingmanTargetUid}
              onClick={() => void controller.submitWingmanRequest()}
              type="button"
            >
              {eventRuntimeCopy.wingmanSubmit}
            </Button>
          )}
        </EventRuntimeModule>
      ) : null}

      {controller.eventEnded ? (
        <EventRuntimeModule
          title={controller.conversationGraph?.prompt ??
            eventRuntimeCopy.conversationTitle}
          accent="coral"
        >
          <p>{eventRuntimeCopy.conversationBody}</p>
          {controller.conversationGraphLoading ? (
            <p>{eventRuntimeCopy.conversationLoading}</p>
          ) : controller.conversationGraph?.candidates.length ? (
            <>
              <ChoiceChipGrid aria-label={controller.conversationGraph.prompt}>
                {controller.conversationGraph.candidates.map((candidate) => (
                  <ChoiceChip
                    key={candidate.uid}
                    onClick={() => controller.toggleConversationUid(candidate.uid)}
                    selected={controller.selectedConversationUids.includes(candidate.uid)}
                  >
                    {candidate.displayName}
                    {candidate.assigned ?
                      ` · ${eventRuntimeCopy.conversationSuggested}` : ""}
                  </ChoiceChip>
                ))}
              </ChoiceChipGrid>
              <Button
                loading={controller.pending}
                onClick={() => void controller.submitConversationGraph()}
                type="button"
              >
                {eventRuntimeCopy.conversationSave}
              </Button>
              <Button
                disabled={controller.pending}
                onClick={() => void controller.submitConversationGraph(true)}
                type="button"
                variant="ghost"
              >
                {eventRuntimeCopy.conversationSkip}
              </Button>
            </>
          ) : controller.conversationGraph ? (
            <p>{eventRuntimeCopy.conversationEmpty}</p>
          ) : null}
          <small>{eventRuntimeCopy.conversationPrivacy}</small>
        </EventRuntimeModule>
      ) : null}

      {modules.has("decomposed_feedback") && controller.eventEnded ? (
        <EventRuntimeModule title={eventRuntimeCopy.feedbackTitle}>
          <p>{eventRuntimeCopy.feedbackBody}</p>
          <Form onSubmit={(submitEvent) => {
            submitEvent.preventDefault();
            void controller.submitFeedback();
          }} pending={controller.pending}>
            <CatchGap size="formField">
            <RuntimeRating
              label={eventRuntimeCopy.welcomeRating}
              onChange={controller.setWelcomeRating}
              value={controller.welcomeRating}
            />
            <RuntimeRating
              label={eventRuntimeCopy.structureRating}
              onChange={controller.setStructureRating}
              value={controller.structureRating}
            />
            <CatchField
              recipe="input"
              id="event-runtime-people-met"
              title={eventRuntimeCopy.peopleMet}
              max={100}
              min={0}
              onChanged={(value) => controller.setMetNewPeopleCount(
                Math.max(0, Math.min(100, Number(value) || 0))
              )}
              value={String(controller.metNewPeopleCount)}
              keyboardType="number"
            />
            <EventRuntimeConsent
              checked={controller.safetyConcern}
              onChange={(changeEvent) => controller.setSafetyConcern(changeEvent.target.checked)}
              required={controller.safetyConcern}
            >
              {eventRuntimeCopy.safetyConcern}
            </EventRuntimeConsent>
            <CatchField
              recipe="input"
              id="event-runtime-private-note"
              title={eventRuntimeCopy.privateNote}
              maxLength={500}
              onChanged={(value) => controller.setPrivateNote(value)}
              maxLines={3}
              value={controller.privateNote}
            />
            <Button type="submit">{eventRuntimeCopy.feedbackSave}</Button>
            </CatchGap>
          </Form>
        </EventRuntimeModule>
      ) : null}

      <FormStatus status={controller.status} />
      {controller.bootstrap?.participant?.eventAttendeeId ?
        <>
          <EventSmsPreferencePanel eventId={event.eventId}
            attendeeId={controller.bootstrap.participant.eventAttendeeId} />
          <EventRcsPreferencesPanel eventId={event.eventId}
            attendeeId={controller.bootstrap.participant.eventAttendeeId} />
          <EventWhatsappPreferencesPanel eventId={event.eventId}
            attendeeId={controller.bootstrap.participant.eventAttendeeId} />
        </> : null}
      <EventRuntimePrivacy>{eventRuntimeCopy.privacyNote}</EventRuntimePrivacy>
    </EventRuntimeLive>
  );
}

function EventArrivalGuidance({
  event,
}: {
  event: NonNullable<ReturnType<typeof useEventRuntimeController>["bootstrap"]>["event"];
}) {
  const itinerary = [...(event.itinerary ?? [])].sort((left, right) =>
    left.offsetMinutes - right.offsetMinutes || left.id.localeCompare(right.id)
  );
  const routePlan = event.routePlan ?? null;
  const livePosition = [...(event.livePositions ?? [])].sort((left, right) =>
    right.recordedAtMillis - left.recordedAtMillis
  )[0] ?? null;
  const nextPublishedStop = itinerary.find((item) =>
    event.startTimeMillis + item.offsetMinutes * 60_000 >=
      event.serverTimeMillis &&
    (item.kind === "stop" || item.kind === "finish" || Boolean(item.location))
  ) ?? null;

  return (
    <>
      {itinerary.length ? (
        <EventRuntimeModule title={eventRuntimeCopy.runOfShowTitle}>
          <EventRuntimeAssignments>
            {itinerary.map((item) => (
              <article key={item.id}>
                <span>{formatEventTime(
                  event.startTimeMillis + item.offsetMinutes * 60_000
                )}</span>
                <h3>{item.title}</h3>
                {item.description ? <p>{item.description}</p> : null}
                {item.location?.name ? <small>{item.location.name}</small> : null}
              </article>
            ))}
          </EventRuntimeAssignments>
        </EventRuntimeModule>
      ) : null}

      {routePlan ? (
        <EventRuntimeModule title={eventRuntimeCopy.movementTitle} accent="coral">
          {routePlan.path?.length ? (
            <p>{eventRuntimeCopy.mappedRoute(routePlan.path.length)}</p>
          ) : null}
          {routePlan.paceGroups?.length ? (
            <EventRuntimeAssignments>
              {[...routePlan.paceGroups]
                .sort((left, right) => left.sortOrder - right.sortOrder)
                .map((group) => (
                  <article key={group.id}>
                    <h3>{group.label}</h3>
                    {group.targetPaceSecondsPerKm ? (
                      <p>{eventRuntimeCopy.paceTarget(
                        group.targetPaceSecondsPerKm
                      )}</p>
                    ) : null}
                  </article>
                ))}
            </EventRuntimeAssignments>
          ) : null}
        </EventRuntimeModule>
      ) : null}

      {livePosition || nextPublishedStop ? (
        <EventRuntimeModule title={eventRuntimeCopy.movingGroupTitle}>
          <p>{livePosition ?
            eventRuntimeCopy.movingGroupBody :
            eventRuntimeCopy.movingGroupScheduledBody}</p>
          {livePosition ? (
            <>
              <small>{eventRuntimeCopy.movingGroupUpdated(
                livePosition.recordedAtMillis
              )}</small>
              <EventRuntimeRouteMap
                ariaLabel={eventRuntimeCopy.movingGroupMapLabel}
                help={eventRuntimeCopy.movingGroupMapHelp}
                marker={livePosition}
                path={routePlan?.path ?? []}
              />
            </>
          ) : null}
          {nextPublishedStop ? (
            <p>{eventRuntimeCopy.nextPublishedStop(nextPublishedStop.title)}</p>
          ) : null}
        </EventRuntimeModule>
      ) : null}
    </>
  );
}

function EventRuntimeLiveMotion({
  ceremony,
  checkedInCount,
  motifId,
  revealStatus,
}: {
  ceremony: EventRuntimeCeremony | null;
  checkedInCount: number;
  motifId: string;
  revealStatus: "idle" | "countingDown" | "revealed";
}) {
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
  const frame = resolveEventRuntimeMarqueeFrame(
    ceremony,
    revealStatus,
    ceremonyNowMillis
  );
  return (
    <EventRuntimeStageMarquee
      participantCount={checkedInCount}
      particles={frame.particles}
      phase={frame.phase}
      phaseProgress={frame.phaseProgress}
      seedAngleTurns={frame.seedAngleTurns}
      stageSource={eventRuntimeVisualAssetPath(
        eventRuntimeVisualAssetForMotif(motifId)
      )}
      sunriseSource={eventRuntimeVisualAssetPath("sunrise")}
      tickProgress={frame.tickProgress}
    />
  );
}

function RuntimeRating({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <EventRuntimeFieldset>
      <legend>{label}</legend>
      <ChoiceChipGrid aria-label={label}>
        {[1, 2, 3, 4, 5].map((score) => (
          <ChoiceChip
            key={score}
            onClick={() => onChange(score)}
            selected={value === score}
          >
            {score}
          </ChoiceChip>
        ))}
      </ChoiceChipGrid>
    </EventRuntimeFieldset>
  );
}

function formatEventTime(millis: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(millis));
}
