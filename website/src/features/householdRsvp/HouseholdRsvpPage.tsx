import {
  CatchButton,
  CatchCheckboxInput,
  CatchChip,
  CatchField,
  CatchLoadingIndicator,
  CatchPageBody,
  CatchPaneLayout,
  CatchRoot,
  CatchSection,
  CatchStack,
  CatchSurface,
  CatchText,
  CatchTopBar,
} from "@catch/web-ui";
import {useMemo, type ReactNode} from "react";
import {interpolateContent as fill} from "@content/interpolate";
import {programHouseholdItineraryIcsUrl} from "../../firebase";
import {householdRsvpCopy as copy} from "../../content/householdRsvp";
import {
  draftFor,
  travelDraftFor,
  travelDraftIncomplete,
  type Credential,
  type HouseholdRsvpScreen,
  type MemberFunctionView,
  type MemberView,
  type ResponseDraft,
  type RsvpStatus,
  type TravelDraft,
  type TravelKind,
} from "./householdRsvpModel";
import {useHouseholdRsvpController} from "./useHouseholdRsvpController";

export function HouseholdRsvpPage({credential}: {credential: Credential | null}) {
  const controller = useHouseholdRsvpController(credential);
  return <HouseholdRsvpView credential={credential} {...controller} />;
}

const STATUS_CHOICES: {status: RsvpStatus; label: string}[] = [
  {status: "attending", label: copy.attending},
  {status: "maybe", label: copy.maybe},
  {status: "declined", label: copy.declined},
];

const titleId = "household-rsvp-title";

function formatFunctionWindow(fn: MemberFunctionView, timezone: string): string {
  const date = new Intl.DateTimeFormat("en-IN", {
    timeZone: timezone, weekday: "short", day: "numeric", month: "short",
  }).format(new Date(fn.startsAtMillis));
  const time = new Intl.DateTimeFormat("en-IN", {
    timeZone: timezone, hour: "numeric", minute: "2-digit",
  }).format(new Date(fn.startsAtMillis));
  return `${date} · ${time}`;
}

function formatDay(millis: number, timezone: string): string {
  return new Intl.DateTimeFormat("en-IN", {timeZone: timezone, day: "numeric", month: "long"}).format(new Date(millis));
}

type View = Extract<HouseholdRsvpScreen, {kind: "ready"}>["view"];

/** The functions in time order, each with the members invited to it: the board's one tile per function. */
function functionsWithMembers(view: View) {
  const byId = new Map<string, {fn: MemberFunctionView; members: MemberView[]}>();
  for (const member of view.members) {
    for (const fn of member.functions) {
      const entry = byId.get(fn.functionId) ?? {fn, members: []};
      entry.members.push(member);
      byId.set(fn.functionId, entry);
    }
  }
  return [...byId.values()].sort((a, b) => a.fn.startsAtMillis - b.fn.startsAtMillis);
}

/** One member's reply to one function: who, coming or not, the seats and a note. */
function MemberReply({
  member,
  fn,
  draft,
  pending,
  onChange,
}: {
  member: MemberView;
  fn: MemberFunctionView;
  draft: ResponseDraft | undefined;
  pending: boolean;
  onChange: (patch: Partial<ResponseDraft>) => void;
}) {
  const status = draft?.rsvpStatus ?? fn.rsvpStatus;
  const partySize = draft?.partySize ?? fn.partySize ?? null;
  const responseNote = draft?.responseNote ?? fn.responseNote ?? "";
  const attending = status === "attending" || status === "maybe";
  const inputId = `${member.guestId}-${fn.functionId}`;
  return (
    <CatchStack gap={8}>
      <CatchText id={`${inputId}-label`} variant="label-action">{member.displayName}</CatchText>
      <CatchStack aria-labelledby={`${inputId}-label`} direction="row" gap={6} role="radiogroup" wrap>
        {STATUS_CHOICES.map((choice) => (
          <CatchChip disabled={pending} key={choice.status} kind="choice" label={choice.label}
            onPressed={() => onChange({rsvpStatus: choice.status})} selected={status === choice.status} />
        ))}
      </CatchStack>
      {attending ? (
        <CatchField
          recipe="input"
          id={`${inputId}-party`}
          title={copy.partySize}
          min={1}
          max={50}
          inputHint={copy.partySizePlaceholder}
          inputMode={pending ? "inactive" : "editable"}
          value={partySize === null ? "" : String(partySize)}
          onChanged={(value) => {
            onChange({
              partySize: value === "" ? null :
                Math.max(1, Math.min(50, Number.parseInt(value, 10) || 1)),
            });
          }}
          keyboardType="number"
        />
      ) : null}
      <CatchField
        recipe="input"
        id={`${inputId}-note`}
        title={copy.note}
        inputHint={copy.notePlaceholder}
        inputMode={pending ? "inactive" : "editable"}
        value={responseNote}
        onChanged={(value) => onChange({responseNote: value || null})}
      />
    </CatchStack>
  );
}

/** The board's function tile: the name, when and where, what to wear, then each invited member's reply. */
function FunctionTile({fn, members, timezone, children}: {
  fn: MemberFunctionView; members: MemberView[]; timezone: string; children: (member: MemberView) => ReactNode;
}) {
  return (
    <CatchSurface as="section" block="tile">
      <CatchStack gap={2}>
        <CatchText as="h2" variant="title-bar">{fn.name}</CatchText>
        <CatchText tone="secondary" variant="body-small">
          {fn.venueName ? `${formatFunctionWindow(fn, timezone)} · ${fn.venueName}` : formatFunctionWindow(fn, timezone)}
        </CatchText>
        {fn.dressCode ? <CatchText tone="secondary" variant="body-small">{`${copy.dressCodeLabel} ${fn.dressCode}`}</CatchText> : null}
        {fn.instructions ? <CatchText tone="secondary" variant="body-small">{fn.instructions}</CatchText> : null}
      </CatchStack>
      <CatchStack gap={16}>{members.map((member) => <CatchStack key={member.guestId}>{children(member)}</CatchStack>)}</CatchStack>
    </CatchSurface>
  );
}

const OTHER_DESTINATION = "__other";

function toLocalInput(millis: number | null | undefined): string {
  if (millis == null) return "";
  const date = new Date(millis);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-` +
    `${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Two fields side by side, as the board pairs the flight and its landing. */
function FieldPair({children}: {children: ReactNode}) {
  return <CatchStack direction="row" equal gap={8}>{children}</CatchStack>;
}

function TravelBlock({
  member,
  kind,
  hotels,
  draft,
  pending,
  onChange,
}: {
  member: MemberView;
  kind: TravelKind;
  hotels: {hotelId: string; name: string}[];
  draft: TravelDraft | undefined;
  pending: boolean;
  onChange: (patch: Partial<TravelDraft>) => void;
}) {
  const title = kind === "outbound" ? copy.travelDeparture : copy.travelArrival;
  const inputId = `${member.guestId}-${kind}`;
  const destination = draft?.destinationHotelId ??
    (draft?.destinationLabel ? OTHER_DESTINATION : "");
  const inputMode = pending ? "inactive" : "editable";
  return (
    <CatchStack aria-labelledby={`${inputId}-title`} as="section" gap={12}>
      <CatchText as="h3" id={`${inputId}-title`} variant="title-row">{copy.travelBlockTitle(member.displayName, title)}</CatchText>
      <FieldPair>
        <CatchField
          recipe="input"
          id={`${inputId}-flight`}
          title={copy.travelFlight}
          inputHint={copy.travelFlightPlaceholder}
          inputMode={inputMode}
          value={draft?.flightNumber ?? ""}
          onChanged={(value) => onChange({flightNumber: value || null})}
        />
        <CatchField
          recipe="input"
          id={`${inputId}-when`}
          title={kind === "outbound" ? copy.travelWhenDeparture : copy.travelWhen}
          inputMode={inputMode}
          value={toLocalInput(draft?.scheduledArrivalAtMillis)}
          onChanged={(value) => {
            onChange({scheduledArrivalAtMillis: value === "" ? null : new Date(value).getTime()});
          }}
          keyboardType="datetime"
        />
      </FieldPair>
      <FieldPair>
        <CatchField
          recipe="input"
          id={`${inputId}-from`}
          title={copy.travelFrom}
          inputHint={copy.travelFromPlaceholder}
          maxLength={3}
          inputMode={inputMode}
          value={draft?.originIata ?? ""}
          onChanged={(value) => onChange({originIata: value.toUpperCase() || null})}
        />
        <CatchField
          recipe="input"
          id={`${inputId}-to`}
          title={copy.travelTo}
          inputHint={copy.travelToPlaceholder}
          maxLength={3}
          inputMode={inputMode}
          value={draft?.destinationIata ?? ""}
          onChanged={(value) => onChange({destinationIata: value.toUpperCase() || null})}
        />
      </FieldPair>
      <CatchField
        recipe="select"
        id={`${inputId}-hotel`}
        title={copy.travelHotel}
        hintText={copy.travelHotelChoose}
        values={[...hotels.map((hotel) => hotel.hotelId), OTHER_DESTINATION]}
        itemLabelBuilder={(hotelId) => hotelId === OTHER_DESTINATION ? copy.travelHotelOther :
          hotels.find((hotel) => hotel.hotelId === hotelId)?.name ?? hotelId}
        inputMode={inputMode}
        value={destination || null}
        onChanged={(selected) => {
          const value = selected ?? "";
          onChange({
            destinationHotelId: value === "" || value === OTHER_DESTINATION ? null : value,
            destinationLabel: value === OTHER_DESTINATION ? draft?.destinationLabel ?? null : null,
          });
        }} />
      {destination === OTHER_DESTINATION ? (
        <CatchField
          recipe="input"
          id={`${inputId}-destination`}
          title={copy.travelDestinationLabel}
          inputHint={copy.travelDestinationPlaceholder}
          inputMode={inputMode}
          value={draft?.destinationLabel ?? ""}
          onChanged={(value) => onChange({destinationLabel: value || null})}
        />
      ) : null}
      <FieldPair>
        <CatchField
          recipe="input"
          id={`${inputId}-passengers`}
          title={copy.travelPassengers}
          min={1}
          max={200}
          inputMode={inputMode}
          value={draft?.passengers == null ? "" : String(draft.passengers)}
          onChanged={(value) => {
            onChange({passengers: value === "" ? null : Math.max(1, Math.min(200, Number.parseInt(value, 10) || 1))});
          }}
          keyboardType="number"
        />
        <CatchField
          recipe="input"
          id={`${inputId}-luggage`}
          title={copy.travelLuggage}
          min={0}
          max={500}
          inputMode={inputMode}
          value={draft?.luggageUnits == null ? "" : String(draft.luggageUnits)}
          onChanged={(value) => {
            onChange({luggageUnits: value === "" ? null : Math.max(0, Math.min(500, Number.parseInt(value, 10) || 0))});
          }}
          keyboardType="number"
        />
      </FieldPair>
      {draft && travelDraftIncomplete(draft) ? (
        <CatchText tone="warning" variant="body-small">{copy.travelIncomplete}</CatchText>
      ) : null}
    </CatchStack>
  );
}

/** A page head without the invitation: the title and its lead. */
function RsvpHead({title, body}: {title: string; body?: string}) {
  return (
    <CatchStack gap={8}>
      <CatchText tone="secondary" variant="label-kicker">{copy.kicker}</CatchText>
      <CatchText as="h1" id={titleId} variant="page-title">{title}</CatchText>
      {body ? <CatchText tone="secondary" variant="body">{body}</CatchText> : null}
    </CatchStack>
  );
}

/**
 * A household's reply page (web only, no app), drawn as the RbProgRsvp board
 * on the white ground: the programme's top bar, the invitation spotlight,
 * one tile per function with each invited member's reply, the travel
 * section, the messages consent, Send our reply and the footer line. The
 * drafts, the travel and the submission are the controller's; this only
 * draws them.
 */
export function HouseholdRsvpView({
  credential,
  screen,
  setResponse,
  setConsent,
  setTravel,
  submit,
  refresh,
  refreshing,
}: {
  credential: Credential | null;
  screen: HouseholdRsvpScreen;
  setResponse: (guestId: string, functionId: string,
    patch: Partial<ResponseDraft>) => void;
  setConsent: (value: boolean) => void;
  setTravel: (guestId: string, kind: TravelKind,
    patch: Partial<TravelDraft>) => void;
  submit: () => void;
  refresh: () => void;
  refreshing: boolean;
}) {
  const icsUrl = useMemo(
    () => credential ? programHouseholdItineraryIcsUrl(credential.token) : null,
    [credential],
  );
  return (
    <CatchRoot format="nightsOut" theme="day">
      <CatchTopBar title={screen.kind === "ready" ? screen.view.programTitle : copy.brand} variant="site" />
      <CatchPageBody as="main" gutter={false} pb="s0" pt="s4">
        <CatchPaneLayout
          main={
            <CatchStack aria-labelledby={titleId} as="section" gap="section">
              {screen.kind === "loading" ? (
                <>
                  <RsvpHead title={copy.loadingTitle} />
                  <CatchLoadingIndicator label={copy.loading} />
                </>
              ) : screen.kind === "unavailable" ? (
                <>
                  <RsvpHead body={screen.reason === "network" ? copy.networkBody : copy.unavailableBody}
                    title={screen.reason === "network" ? copy.networkTitle : copy.unavailableTitle} />
                  <CatchStack align="start">
                    <CatchButton label={refreshing ? copy.refreshing : copy.refresh} onPressed={refresh}
                      status={refreshing ? "loading" : "idle"} />
                  </CatchStack>
                </>
              ) : (
                <RsvpReady icsUrl={icsUrl} refresh={refresh} refreshing={refreshing} screen={screen}
                  setConsent={setConsent} setResponse={setResponse} setTravel={setTravel} submit={submit} />
              )}
              <CatchText align="center" tone="secondary" variant="body-meta">{copy.madeWith}</CatchText>
            </CatchStack>
          }
          pattern="reading"
        />
      </CatchPageBody>
    </CatchRoot>
  );
}

function RsvpReady({screen, icsUrl, setResponse, setConsent, setTravel, submit, refresh, refreshing}: {
  screen: Extract<HouseholdRsvpScreen, {kind: "ready"}>;
  icsUrl: string | null;
  setResponse: (guestId: string, functionId: string, patch: Partial<ResponseDraft>) => void;
  setConsent: (value: boolean) => void;
  setTravel: (guestId: string, kind: TravelKind, patch: Partial<TravelDraft>) => void;
  submit: () => void;
  refresh: () => void;
  refreshing: boolean;
}) {
  const {view} = screen;
  const functions = functionsWithMembers(view);
  const travellers = view.members.filter((member) => member.functions.length > 0);
  const first = functions[0]?.fn.startsAtMillis;
  const last = functions.at(-1)?.fn.startsAtMillis;
  return (
    <>
      <CatchSurface block="spotlight" color="nightsOut">
        {first !== undefined && last !== undefined ? (
          <CatchText variant="label-kicker">
            {fill(copy.dates, {first: formatDay(first, view.timezone), last: formatDay(last, view.timezone)})}
          </CatchText>
        ) : null}
        <CatchText as="h1" id={titleId} variant="display-lg">{view.programTitle}</CatchText>
        <CatchText variant="body">{fill(copy.greeting, {household: view.householdLabel})}</CatchText>
      </CatchSurface>
      {functions.map(({fn, members}) => (
        <FunctionTile fn={fn} key={fn.functionId} members={members} timezone={view.timezone}>
          {(member) => {
            const own = member.functions.find((item) => item.functionId === fn.functionId) ?? fn;
            return (
              <MemberReply draft={draftFor(screen.drafts, member.guestId, fn.functionId)} fn={own} member={member}
                onChange={(patch) => setResponse(member.guestId, fn.functionId, patch)} pending={screen.pending} />
            );
          }}
        </FunctionTile>
      ))}
      {travellers.length > 0 ? (
        <CatchSection dividers="none" note={copy.travelNote} title={copy.travelHeading}>
          <CatchStack gap={24}>
            {travellers.flatMap((member) => (["inbound", "outbound"] as const).map((kind) => (
              <TravelBlock draft={travelDraftFor(screen.travelDrafts, member.guestId, kind)} hotels={view.hotels}
                key={`${member.guestId}-${kind}`} kind={kind} member={member}
                onChange={(patch) => setTravel(member.guestId, kind, patch)} pending={screen.pending} />
            )))}
          </CatchStack>
        </CatchSection>
      ) : null}
      <CatchSurface block="tile">
        <CatchCheckboxInput label={copy.consentLabel} onChanged={screen.pending ? null : setConsent} value={screen.messagingConsent} />
      </CatchSurface>
      <CatchStack gap={8}>
        <CatchButton fill label={screen.pending ? copy.sending : copy.submit}
          onPressed={!screen.dirty || screen.pending ? null : submit} status={screen.pending ? "loading" : "idle"} />
        <CatchStack direction="row" equal gap={8}>
          {icsUrl ? <CatchButton fill href={icsUrl} label={copy.itinerary} leadingIcon="addToCalendar" variant="secondary" /> : null}
          <CatchButton fill label={refreshing ? copy.refreshing : copy.refresh} onPressed={screen.pending ? null : refresh}
            status={refreshing ? "loading" : "idle"} variant="quiet" />
        </CatchStack>
      </CatchStack>
      <CatchText role="status" tone="secondary" variant="body-small">{screen.notice}</CatchText>
    </>
  );
}
