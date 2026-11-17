import {CatchButton, CatchGroundCard, CatchLoadingIndicator, CatchStack, CatchText} from "@catch/web-ui";
import type {ReactNode} from "react";
import {interpolateContent as fill} from "@content/interpolate";
import {EventMessageWithdrawalPanel} from "../eventMessaging/EventMessageWithdrawalPanel";
import {eventAssistanceCopy as copy} from "../../content/eventAssistance";
import {EventBookingFrame} from "../../shared/site/EventBookingFrame";
import type {AssistanceScreen, Credential} from "./eventAssistanceModel";
import {useEventAssistanceController} from "./useEventAssistanceController";

export function EventAssistancePage({credential}: {credential: Credential | null}) {
  const controller = useEventAssistanceController(credential);
  return <EventAssistanceView {...controller}
    textPreferences={<>
      <EventMessageWithdrawalPanel credential={credential} channel="sms" />
      <EventMessageWithdrawalPanel credential={credential} channel="whatsapp" />
      <EventMessageWithdrawalPanel credential={credential} channel="rcs" />
    </>} />;
}

/** One block of the flow's column, as the board's flat cards. */
function Block({children, ground = "white"}: {children: ReactNode; ground?: "white" | "mint"}) {
  return <CatchGroundCard ground={ground} outlined={ground === "white"}>{children}</CatchGroundCard>;
}

/**
 * The event update on the LiveEventUpdate board: the kit's flow on the
 * one-job chrome. The head names the event and the instructions; the column
 * holds the latest instructions, the reply choices (or the recorded reply),
 * the event message preferences and the refresh. A closed or unavailable
 * update says why in its head and keeps the preferences and the refresh.
 */
export function EventAssistanceView({screen, submit, refresh, refreshing, textPreferences}: {
  textPreferences?: ReactNode;
  screen: AssistanceScreen;
  submit: (choiceId: string) => void;
  refresh: () => void;
  refreshing: boolean;
}) {
  if (screen.kind === "loading") {
    return (
      <EventBookingFrame card={false} kicker={copy.kicker} title={copy.loadingTitle}>
        <Block><CatchLoadingIndicator label={copy.loading} /></Block>
        {textPreferences}
      </EventBookingFrame>
    );
  }
  if (screen.kind === "unavailable") {
    return (
      <EventBookingFrame
        body={screen.reason === "network" ? copy.networkBody :
          screen.reason === "invalid" ? copy.unavailableBody : copy.closed[screen.reason]}
        card={false}
        kicker={copy.kicker}
        title={screen.reason === "network" ? copy.networkTitle : copy.unavailableTitle}
      >
        {textPreferences}
        <CatchStack align="start">
          <CatchButton label={copy.refresh} onPressed={refresh} size="md"
            status={refreshing ? "loading" : "idle"} variant="primary" />
        </CatchStack>
      </EventBookingFrame>
    );
  }
  const {view} = screen;
  return (
    <EventBookingFrame card={false} kicker={fill(copy.eventKicker, {event: view.eventTitle})} title={view.title}>
      <Block>
        <CatchStack gap={6}>
          <CatchText as="h2" tone="secondary" variant="label-kicker">{copy.current}</CatchText>
          <CatchText as="p" variant="body-lead">{view.text}</CatchText>
        </CatchStack>
      </Block>
      {view.response ? (
        <Block ground="mint">
          <CatchStack gap={6}>
            <CatchText as="h2" variant="title-row">{copy.saved}</CatchText>
            <CatchText as="p" role="status" variant="body">{view.response.label}</CatchText>
          </CatchStack>
        </Block>
      ) : (
        <Block>
          <CatchStack gap={12}>
            <CatchText as="h2" variant="title-row">{copy.replyHeading}</CatchText>
            <CatchStack direction="row" gap={8} wrap>
              {view.choices.map((choice, index) => (
                <CatchButton key={choice.choiceId} label={choice.label} size="md"
                  onPressed={!screen.fresh || screen.pending ||
                    (screen.retryChoice !== null && screen.retryChoice !== choice.choiceId) ? null : () => submit(choice.choiceId)}
                  status={screen.pendingChoice === choice.choiceId ? "loading" : "idle"}
                  variant={index === 0 ? "primary" : "secondary"} />
              ))}
            </CatchStack>
          </CatchStack>
        </Block>
      )}
      {textPreferences}
      <CatchStack gap={8}>
        {!screen.fresh ? <CatchText as="p" role="status" variant="body-small">
          {view.response ? copy.refreshRecorded : copy.stale}
        </CatchText> : null}
        {screen.notice ? <CatchText as="p" role="status" tone="secondary" variant="body-small">{screen.notice}</CatchText> : null}
        <CatchStack align="start">
          <CatchButton label={copy.refresh} onPressed={screen.pending ? null : refresh} size="md"
            status={refreshing ? "loading" : "idle"} variant="secondary" />
        </CatchStack>
      </CatchStack>
    </EventBookingFrame>
  );
}
