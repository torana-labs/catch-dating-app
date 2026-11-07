import {
  CatchBadge,
  CatchButton,
  CatchIcon,
  CatchIndexRow,
  CatchLoadingIndicator,
  CatchNotice,
  CatchPageBody,
  CatchPaneLayout,
  CatchRoot,
  CatchSection,
  CatchStack,
  CatchSurface,
  CatchText,
  CatchTopBar,
  type CatchNoticeTone,
} from "@catch/web-ui";
import {publicSiteCopy} from "@content/site";
import type {ReactNode} from "react";
import {useParams} from "react-router";
import {eventRehearsalCopy} from "../../content/eventRehearsal";
import type {
  EventRehearsalGuestAction,
  EventRehearsalGuestBootstrap,
} from "../../firebase";
import {WebsitePageMain} from "../../shared/site";
import {EventRuntimeRouteMap} from "../../shared/ui/primitives";
import {availableEventRehearsalGuestActions, canReplyToRehearsal,
  pendingRehearsalRequiredData, type RehearsalReply,
  type RehearsalReplyState, type RehearsalRequiredField} from "./eventRehearsalModel";
import {useEventRehearsalController} from "./useEventRehearsalController";

export function EventRehearsalPage() {
  const {publicRehearsalId = ""} = useParams<{
    publicRehearsalId: string;
  }>();
  return <EventRehearsalGuest key={publicRehearsalId}
    publicRehearsalId={publicRehearsalId} />;
}

function EventRehearsalGuest({publicRehearsalId}: {publicRehearsalId: string}) {
  const controller = useEventRehearsalController(publicRehearsalId);

  if (controller.isLoading) {
    return (
      <RehearsalShell banner={eventRehearsalCopy.practiceBanner}>
        <CatchText as="h1" variant="page-title">{eventRehearsalCopy.loadingTitle}</CatchText>
        <CatchLoadingIndicator label={eventRehearsalCopy.loading} />
      </RehearsalShell>
    );
  }

  if (controller.isUnavailable || !controller.bootstrap) {
    return (
      <RehearsalShell>
        <CatchStack gap={8}>
          <CatchText tone="secondary" variant="label-kicker">{eventRehearsalCopy.unavailableKicker}</CatchText>
          <CatchText as="h1" variant="page-title">{eventRehearsalCopy.unavailableTitle}</CatchText>
          <CatchText tone="secondary" variant="body">{eventRehearsalCopy.unavailableBody}</CatchText>
        </CatchStack>
        <CatchButton fill label={eventRehearsalCopy.retry} onPressed={() => void controller.refresh()} />
      </RehearsalShell>
    );
  }

  return (
    <EventRehearsalPreview
      bootstrap={controller.bootstrap}
      onAction={controller.submit}
      onReply={controller.reply}
      onRequiredData={controller.submitRequiredData}
      requiredDataRetry={controller.requiredDataRetry}
      onRefresh={controller.refresh}
      replyState={controller.replyState}
      pending={controller.pending}
      status={controller.status}
    />
  );
}

/**
 * The guest live screens in practice (P4.6): the same night ground, top bar
 * and parts as `/join`, under a practice notice. Every control changes only
 * the synthetic guest this phone holds.
 */
function RehearsalShell({banner, children}: {banner?: string; children: ReactNode}) {
  return (
    <CatchRoot theme="night">
      <CatchTopBar homeHref="/" title={publicSiteCopy.wordmark} variant="site" />
      <WebsitePageMain id="event-rehearsal">
        <CatchPageBody gutter={false} pb="s8" pt="s4">
          <CatchPaneLayout
            main={
              <CatchStack gap={16}>
                {banner ? <RehearsalNotice icon="flag" id="practice" title={banner} tone="warning" /> : null}
                {children}
              </CatchStack>
            }
            pattern="reading"
          />
        </CatchPageBody>
      </WebsitePageMain>
    </CatchRoot>
  );
}

function RehearsalNotice({id, title, tone = "status", icon = "info"}: {
  id: string;
  title: string;
  tone?: CatchNoticeTone;
  icon?: "flag" | "info";
}) {
  return <CatchNotice dismissLabel="" notice={{id, title, tone, icon: <CatchIcon name={icon} />}} />;
}

function RehearsalStatus({message, error = false}: {message: string; error?: boolean}) {
  return (
    <CatchText role="status" tone={error ? "danger" : "secondary"} variant="body-small">{message}</CatchText>
  );
}

export function EventRehearsalPreview({
  bootstrap,
  onAction,
  onReply,
  onRequiredData,
  requiredDataRetry = false,
  onRefresh,
  replyState = {fresh: true, pendingChoice: null, retryChoice: null, notice: ""},
  pending,
  status,
}: {
  bootstrap: EventRehearsalGuestBootstrap;
  onAction: (action: EventRehearsalGuestAction) => void;
  onReply: (reply: RehearsalReply) => void;
  onRequiredData: () => void;
  requiredDataRetry?: boolean;
  onRefresh: () => void;
  replyState?: RehearsalReplyState;
  pending: boolean;
  status: {message: string; tone: "" | "is-error"};
}) {
  const moment = bootstrap.actor.guestMoment;
  const complete = bootstrap.session.status === "complete" ||
    bootstrap.session.status === "expired";
  const actions = availableEventRehearsalGuestActions(bootstrap);
  const faultNotice = bootstrap.session.faultId === "none"
    ? null
    : eventRehearsalCopy.faultNotices[bootstrap.session.faultId];
  const clock = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(bootstrap.session.virtualNowMillis);
  const blocked = pending || !replyState.fresh ||
    replyState.retryChoice !== null || requiredDataRetry;
  const actionButton = (action: EventRehearsalGuestAction, variant: "primary" | "secondary") => (
    <CatchButton
      key={action}
      label={eventRehearsalActionLabel(action)}
      leadingIcon={action === "askForHelp" ? "help" : undefined}
      onPressed={blocked ? null : () => onAction(action)}
      size="sm"
      status={pending ? "loading" : "idle"}
      variant={variant}
    />
  );
  const controls = actions.filter((action) => action !== "askForHelp" && action !== "completePrompt");
  const disconnected = (bootstrap.actor.connectionState ??
    (bootstrap.actor.status === "disconnected" ? "disconnected" : "connected")) === "disconnected";

  return (
    <RehearsalShell banner={bootstrap.practiceBanner}>
      <CatchStack align="start" direction="row" gap={12} justify="between">
        <CatchStack gap={2}>
          <CatchText as="h1" variant="title-bar">{bootstrap.session.title}</CatchText>
          <CatchText tone="secondary" variant="body-meta">
            {eventRehearsalCopy.headMeta(bootstrap.session.locationName, clock)}
          </CatchText>
        </CatchStack>
        <CatchBadge label={eventRehearsalCopy.actorBadge(bootstrap.actor.displayName,
          eventRehearsalCopy.statusLabels[bootstrap.actor.status])} />
      </CatchStack>

      {bootstrap.actor.assistanceMessage ? (
        <EventRehearsalJoiningInstruction bootstrap={bootstrap}
          pending={pending} state={replyState} onReply={onReply}
          onRefresh={onRefresh} blocked={requiredDataRetry} />
      ) : null}

      {bootstrap.actor.requiredData?.request ? (
        <EventRehearsalRequiredData bootstrap={bootstrap} pending={pending}
          fresh={replyState.fresh} retryRequired={requiredDataRetry}
          blockedByReply={replyState.retryChoice !== null}
          onSubmit={onRequiredData} />
      ) : null}

      <CatchSurface block="spotlight" color="ink">
        <CatchStack gap={8}>
          <CatchText variant="label-kicker">
            {complete ? eventRehearsalCopy.completeKicker : eventRehearsalCopy.liveKicker}
          </CatchText>
          <CatchText as="h2" variant="display-lg">{eventRehearsalCopy.momentTitles[moment]}</CatchText>
          <CatchText variant="body">{eventRehearsalCopy.momentBodies[moment]}</CatchText>
        </CatchStack>
      </CatchSurface>

      <CatchSurface block="tile">
        <CatchStack gap={8}>
          <CatchText tone="secondary" variant="label-kicker">{eventRehearsalCopy.promptTitle}</CatchText>
          <CatchText as="h2" variant="display-sm">{bootstrap.session.attendeePrompt}</CatchText>
          {!complete && actions.includes("completePrompt") ? (
            <CatchStack align="start">{actionButton("completePrompt", "primary")}</CatchStack>
          ) : null}
        </CatchStack>
      </CatchSurface>

      {bootstrap.session.movementSimulation ? (
        <EventRehearsalMovementPreview
          movement={bootstrap.session.movementSimulation}
        />
      ) : null}

      {complete ? (
        <CatchSurface block="tile">
          <CatchStack gap={4}>
            <CatchText as="h2" variant="title-bar">{eventRehearsalCopy.completeTitle}</CatchText>
            <CatchText variant="body-small">{eventRehearsalCopy.completeBody}</CatchText>
          </CatchStack>
        </CatchSurface>
      ) : actions.length === 0 ? (
        <CatchSurface block="tile">
          <CatchStack gap={4}>
            <CatchText as="h2" variant="title-bar">{eventRehearsalCopy.waitingTitle}</CatchText>
            <CatchText variant="body-small">{eventRehearsalCopy.waitingBody}</CatchText>
          </CatchStack>
        </CatchSurface>
      ) : (
        <CatchSurface block="tile">
          <CatchStack gap={12}>
            <CatchStack gap={4}>
              <CatchText as="h2" variant="title-bar">{eventRehearsalCopy.actionsTitle}</CatchText>
              <CatchText tone="secondary" variant="body-small">{eventRehearsalCopy.actionsBody}</CatchText>
            </CatchStack>
            {controls.length ? (
              <CatchStack direction="row" gap={8} wrap>
                {controls.map((action) => actionButton(action, action === "optOut" ? "secondary" : "primary"))}
              </CatchStack>
            ) : null}
            <RehearsalStatus error={status.tone === "is-error"} message={status.message} />
            {!replyState.fresh && !bootstrap.actor.assistanceMessage ? (
              <CatchStack align="start">
                <CatchButton label={eventRehearsalCopy.refresh} onPressed={pending ? null : onRefresh}
                  size="sm" variant="secondary" />
              </CatchStack>
            ) : null}
          </CatchStack>
        </CatchSurface>
      )}

      {!complete && actions.includes("askForHelp") ? (
        <CatchButton fill label={eventRehearsalActionLabel("askForHelp")} leadingIcon="help"
          onPressed={blocked ? null : () => onAction("askForHelp")}
          status={pending ? "loading" : "idle"} variant="secondary" />
      ) : null}

      {disconnected ? <RehearsalNotice id="disconnected" title={eventRehearsalCopy.disconnectedNotice} tone="warning" /> : null}
      {faultNotice ? <RehearsalNotice id="fault" title={faultNotice} /> : null}
      {bootstrap.actor.optedOut ? <RehearsalNotice id="opted-out" title={eventRehearsalCopy.optedOutNotice} /> : null}
      {bootstrap.actor.helpRequested ? <RehearsalNotice id="help" title={eventRehearsalCopy.helpRequestedNotice} /> : null}
      {bootstrap.actor.promptCompleted ? (
        <RehearsalNotice id="prompt" title={eventRehearsalCopy.promptCompletedNotice} tone="success" />
      ) : null}
    </RehearsalShell>
  );
}

const requiredFieldLabels = {
  displayName: "Name",
  gender: "Gender",
  interestedInGenders: "Who you want to meet",
  relationshipGoal: "Relationship goal",
  dateOfBirth: "Age",
  paceBand: "Running pace",
  skillBand: "Skill level",
  dietaryAndSeatingNotes: "Dietary or seating needs",
  questionnaireAnswerIds: "Event questions",
  teamName: "Team name",
} satisfies Record<RehearsalRequiredField, string>;

function EventRehearsalRequiredData({bootstrap, pending, fresh, retryRequired,
  blockedByReply, onSubmit}: {
  bootstrap: EventRehearsalGuestBootstrap;
  pending: boolean;
  fresh: boolean;
  retryRequired: boolean;
  blockedByReply: boolean;
  onSubmit: () => void;
}) {
  const request = bootstrap.actor.requiredData!.request!;
  const submission = pendingRehearsalRequiredData(bootstrap);
  return (
    <CatchSurface block="tile">
      <CatchStack gap={8}>
        <CatchText as="h2" variant="title-bar">{eventRehearsalCopy.requiredDataTitle}</CatchText>
        {submission ? <>
          <CatchText tone="secondary" variant="body-small">{eventRehearsalCopy.requiredDataBody}</CatchText>
          <CatchSection>
            {submission.fieldIds.map((field) =>
              <CatchIndexRow density="compact" key={field} title={requiredFieldLabels[field]} />)}
          </CatchSection>
          <CatchStack align="start">
            <CatchButton label={eventRehearsalCopy.requiredDataSubmit}
              onPressed={pending || !fresh || blockedByReply ? null : onSubmit}
              size="sm" status={pending ? "loading" : "idle"} />
          </CatchStack>
          {retryRequired && !pending ? <RehearsalStatus message={eventRehearsalCopy.requiredDataUncertain} /> : null}
          {!fresh ? <RehearsalStatus message={eventRehearsalCopy.replyStale} /> : null}
        </> : <RehearsalStatus message={request.status === "completed"
          ? eventRehearsalCopy.requiredDataComplete
          : eventRehearsalCopy.requiredDataClosed} />}
      </CatchStack>
    </CatchSurface>
  );
}

function EventRehearsalJoiningInstruction({bootstrap, pending, state, onReply,
  onRefresh, blocked}: {
  bootstrap: EventRehearsalGuestBootstrap;
  pending: boolean;
  state: RehearsalReplyState;
  onReply: (reply: RehearsalReply) => void;
  onRefresh: () => void;
  blocked: boolean;
}) {
  const message = bootstrap.actor.assistanceMessage!;
  const saved = message.choices.find((choice) => choice.choiceId === message.responseChoiceId);
  const canRespond = canReplyToRehearsal(bootstrap);
  return (
    <CatchSurface block="tile">
      <CatchStack gap={8}>
        <CatchText tone="secondary" variant="label-kicker">{eventRehearsalCopy.joiningTitle}</CatchText>
        <CatchText variant="body">{message.text}</CatchText>
        {saved ? <RehearsalStatus message={eventRehearsalCopy.replySaved(saved.label)} /> :
          canRespond ? <>
            <CatchText tone="secondary" variant="body-small">{eventRehearsalCopy.joiningBody}</CatchText>
            <CatchStack direction="row" gap={8} wrap>
              {message.choices.map((choice) => (
                <CatchButton key={choice.choiceId} label={choice.label}
                  onPressed={pending || blocked || !state.fresh ||
                    (state.retryChoice !== null && state.retryChoice !== choice.choiceId) ? null :
                    () => onReply({messageId: message.messageId,
                      intentRevision: message.intentRevision, choiceId: choice.choiceId})}
                  size="sm" status={state.pendingChoice === choice.choiceId ? "loading" : "idle"}
                  variant="secondary" />
              ))}
            </CatchStack>
          </> : <RehearsalStatus message={eventRehearsalCopy.replyClosed} />}
        {!state.fresh ? <RehearsalStatus message={eventRehearsalCopy.replyStale} /> : null}
        {state.notice ? <RehearsalStatus error message={state.notice} /> : null}
        {!state.fresh || state.notice || (!canRespond && !saved) ? (
          <CatchStack align="start">
            <CatchButton label={eventRehearsalCopy.refresh} onPressed={pending ? null : onRefresh}
              size="sm" variant="secondary" />
          </CatchStack>
        ) : null}
      </CatchStack>
    </CatchSurface>
  );
}

function EventRehearsalMovementPreview({
  movement,
}: {
  movement: NonNullable<EventRehearsalGuestBootstrap["session"]["movementSimulation"]>;
}) {
  const routePath = movement.routePlan?.path ?? [];
  const position = [...movement.livePositions].sort((left, right) =>
    right.recordedOffsetMinutes - left.recordedOffsetMinutes
  )[0] ?? null;
  return (
    <>
      {movement.itinerary.length ? (
        <CatchSection dividers="none" timeline title={eventRehearsalCopy.runOfShowTitle}>
          {movement.itinerary.map((item) => (
            <CatchIndexRow
              density="compact"
              key={item.id}
              marker={{kind: "ring", size: 12}}
              meta={item.location?.name}
              subtitle={item.description ?? undefined}
              time={eventRehearsalCopy.itineraryOffset(item.offsetMinutes)}
              title={item.title}
              wrap
            />
          ))}
        </CatchSection>
      ) : null}
      {movement.routePlan || position || movement.lateArrivalGuidance ? (
        <CatchSurface block="tile">
          <CatchStack gap={8}>
            <CatchText as="h2" variant="title-bar">{eventRehearsalCopy.routeTitle}</CatchText>
            {routePath.length ? (
              <CatchText tone="secondary" variant="body-small">{eventRehearsalCopy.routePoints(routePath.length)}</CatchText>
            ) : null}
            {position ? (
              <CatchText variant="label-action">{eventRehearsalCopy.trackerRole(position.role)}</CatchText>
            ) : null}
            <EventRuntimeRouteMap
              ariaLabel={eventRehearsalCopy.routeMapLabel}
              help={eventRehearsalCopy.routeMapHelp}
              marker={position}
              path={routePath}
            />
            {movement.lateArrivalGuidance ? (
              <CatchText variant="body-small">{movement.lateArrivalGuidance}</CatchText>
            ) : null}
          </CatchStack>
        </CatchSurface>
      ) : null}
    </>
  );
}

function eventRehearsalActionLabel(action: EventRehearsalGuestAction): string {
  switch (action) {
    case "checkIn":
      return eventRehearsalCopy.checkedIn;
    case "confirmArrival":
      return eventRehearsalCopy.confirmArrival;
    case "optOut":
      return eventRehearsalCopy.optOut;
    case "optIn":
      return eventRehearsalCopy.optIn;
    case "askForHelp":
      return eventRehearsalCopy.askForHelp;
    case "completePrompt":
      return eventRehearsalCopy.completePrompt;
  }
}
