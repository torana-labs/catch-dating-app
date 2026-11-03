import {CatchField, CatchGap, CatchLegacyText} from "@catch/web-ui";
import {useMemo} from "react";
import {
  Button,
  ButtonLink,
  ChoiceChip,
  ChoiceChipGrid,
  EventRuntimeConsent,
  EventRuntimeFrame,
  EventRuntimeLoading,
  EventRuntimeModule,
  EventRuntimeNoticeStack,
  EventRuntimePanel,
  FormStatus,
} from "../../shared/ui/primitives";
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

function formatFunctionWindow(
  fn: MemberFunctionView,
  timezone: string,
): string {
  const date = new Intl.DateTimeFormat("en-IN", {
    timeZone: timezone, weekday: "short", day: "numeric", month: "short",
  }).format(new Date(fn.startsAtMillis));
  const time = new Intl.DateTimeFormat("en-IN", {
    timeZone: timezone, hour: "numeric", minute: "2-digit",
  }).format(new Date(fn.startsAtMillis));
  return `${date} · ${time}`;
}

function MemberFunctionCard({
  member,
  fn,
  timezone,
  draft,
  pending,
  onChange,
}: {
  member: MemberView;
  fn: MemberFunctionView;
  timezone: string;
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
    <EventRuntimeModule title={fn.name}>
      <p>{formatFunctionWindow(fn, timezone)}</p>
      {fn.venueName ? <p>{fn.venueName}</p> : null}
      {fn.dressCode ? <p>{copy.dressCodeLabel} {fn.dressCode}</p> : null}
      {fn.instructions ? <p>{fn.instructions}</p> : null}
      <CatchGap size="inline">
        <CatchLegacyText as="span" id={`${inputId}-label`} variant="fieldLabel">{member.displayName}</CatchLegacyText>
        <ChoiceChipGrid aria-labelledby={`${inputId}-label`}>
          {STATUS_CHOICES.map((choice) => (
            <ChoiceChip key={choice.status}
              selected={status === choice.status}
              disabled={pending}
              onClick={() => onChange({rsvpStatus: choice.status})}>
              {choice.label}
            </ChoiceChip>
          ))}
        </ChoiceChipGrid>
      </CatchGap>
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
    </EventRuntimeModule>
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

function TravelBlockCard({
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
  return (
    <EventRuntimeModule
      title={copy.travelBlockTitle(member.displayName, title)}>
      <CatchField
        recipe="input"
        id={`${inputId}-flight`}
        title={copy.travelFlight}
        inputHint={copy.travelFlightPlaceholder}
        inputMode={pending ? "inactive" : "editable"}
        value={draft?.flightNumber ?? ""}
        onChanged={(value) => onChange({flightNumber: value || null})}
      />
      <CatchField
        recipe="input"
        id={`${inputId}-from`}
        title={copy.travelFrom}
        inputHint={copy.travelFromPlaceholder}
        maxLength={3}
        inputMode={pending ? "inactive" : "editable"}
        value={draft?.originIata ?? ""}
        onChanged={(value) => onChange({originIata: value.toUpperCase() || null})}
      />
      <CatchField
        recipe="input"
        id={`${inputId}-to`}
        title={copy.travelTo}
        inputHint={copy.travelToPlaceholder}
        maxLength={3}
        inputMode={pending ? "inactive" : "editable"}
        value={draft?.destinationIata ?? ""}
        onChanged={(value) => onChange({destinationIata: value.toUpperCase() || null})}
      />
      <CatchField
        recipe="input"
        id={`${inputId}-when`}
        title={kind === "outbound" ? copy.travelWhenDeparture :
          copy.travelWhen}
        inputMode={pending ? "inactive" : "editable"}
        value={toLocalInput(draft?.scheduledArrivalAtMillis)}
        onChanged={(value) => {
          onChange({scheduledArrivalAtMillis:
            value === "" ? null : new Date(value).getTime()});
        }}
        keyboardType="datetime"
      />
      <CatchField
        recipe="select"
        id={`${inputId}-hotel`}
        title={copy.travelHotel}
        hintText={copy.travelHotelChoose}
        values={[...hotels.map((hotel) => hotel.hotelId), OTHER_DESTINATION]}
        itemLabelBuilder={(hotelId) => hotelId === OTHER_DESTINATION ? copy.travelHotelOther :
          hotels.find((hotel) => hotel.hotelId === hotelId)?.name ?? hotelId}
        inputMode={pending ? "inactive" : "editable"}
        value={destination || null}
        onChanged={(selected) => {
          const value = selected ?? "";
          onChange({
            destinationHotelId: value === "" || value === OTHER_DESTINATION ?
              null : value,
            destinationLabel: value === OTHER_DESTINATION ?
              draft?.destinationLabel ?? null : null,
          });
        }} />
      {destination === OTHER_DESTINATION ? (
        <CatchField
          recipe="input"
          id={`${inputId}-destination`}
          title={copy.travelDestinationLabel}
          inputHint={copy.travelDestinationPlaceholder}
          inputMode={pending ? "inactive" : "editable"}
          value={draft?.destinationLabel ?? ""}
          onChanged={(value) => onChange({destinationLabel: value || null})}
        />
      ) : null}
      <CatchField
        recipe="input"
        id={`${inputId}-passengers`}
        title={copy.travelPassengers}
        min={1}
        max={200}
        inputMode={pending ? "inactive" : "editable"}
        value={draft?.passengers == null ? "" : String(draft.passengers)}
        onChanged={(value) => {
          onChange({passengers: value === "" ? null :
            Math.max(1, Math.min(200, Number.parseInt(value, 10) || 1))});
        }}
        keyboardType="number"
      />
      <CatchField
        recipe="input"
        id={`${inputId}-luggage`}
        title={copy.travelLuggage}
        min={0}
        max={500}
        inputMode={pending ? "inactive" : "editable"}
        value={draft?.luggageUnits == null ? "" : String(draft.luggageUnits)}
        onChanged={(value) => {
          onChange({luggageUnits: value === "" ? null :
            Math.max(0, Math.min(500, Number.parseInt(value, 10) || 0))});
        }}
        keyboardType="number"
      />
      {draft && travelDraftIncomplete(draft) ? (
        <p>{copy.travelIncomplete}</p>
      ) : null}
    </EventRuntimeModule>
  );
}

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
    <EventRuntimeFrame brandLabel={copy.brand} brandWord={copy.brandWord}
      eventTitle={screen.kind === "ready" ? screen.view.programTitle : null}>
      {screen.kind === "loading" ? (
        <EventRuntimePanel kicker={copy.kicker} title={copy.loadingTitle} body="">
          <CatchGap size="section">
            <EventRuntimeLoading label={copy.loading} />
          </CatchGap>
        </EventRuntimePanel>
      ) : screen.kind === "unavailable" ? (
        <EventRuntimePanel kicker={copy.kicker}
          title={screen.reason === "network" ?
            copy.networkTitle : copy.unavailableTitle}
          body={screen.reason === "network" ?
            copy.networkBody : copy.unavailableBody}>
          <CatchGap size="section">
            <Button type="button" onClick={refresh} loading={refreshing}
              loadingLabel={copy.refreshing}>{copy.refresh}</Button>
          </CatchGap>
        </EventRuntimePanel>
      ) : (
        <EventRuntimePanel kicker={copy.kicker}
          title={screen.view.householdLabel} body="">
          <CatchGap size="section">
            {screen.view.members.map((member) =>
              member.functions.length === 0 ? null : (
                <div key={member.guestId}>
                  {member.functions.map((fn) => (
                    <MemberFunctionCard
                      key={fn.functionId}
                      member={member}
                      fn={fn}
                      timezone={screen.view.timezone}
                      draft={draftFor(screen.drafts,
                        member.guestId, fn.functionId)}
                      pending={screen.pending}
                      onChange={(patch) =>
                        setResponse(member.guestId, fn.functionId, patch)}
                    />
                  ))}
                  {(["inbound", "outbound"] as const).map((kind) => (
                    <TravelBlockCard
                      key={kind}
                      member={member}
                      kind={kind}
                      hotels={screen.view.hotels}
                      draft={travelDraftFor(
                        screen.travelDrafts, member.guestId, kind)}
                      pending={screen.pending}
                      onChange={(patch) =>
                        setTravel(member.guestId, kind, patch)}
                    />
                  ))}
                </div>
              ))}
            <EventRuntimeConsent
              checked={screen.messagingConsent}
              disabled={screen.pending}
              onChange={(event) => setConsent(event.target.checked)}>
              {copy.consentLabel}
            </EventRuntimeConsent>
            <CatchGap direction="horizontal" size="related" wrap>
              <Button type="button" onClick={submit}
                disabled={!screen.dirty || screen.pending}
                loading={screen.pending} loadingLabel={copy.sending}>
                {copy.submit}
              </Button>
              {icsUrl ? (
                <ButtonLink href={icsUrl} variant="ghost">
                  {copy.itinerary}
                </ButtonLink>
              ) : null}
              <Button type="button" variant="ghost" onClick={refresh}
                disabled={screen.pending} loading={refreshing}
                loadingLabel={copy.refreshing}>{copy.refresh}</Button>
            </CatchGap>
            {screen.notice ? (
              <EventRuntimeNoticeStack>
                <FormStatus status={{message: screen.notice, tone: ""}} />
              </EventRuntimeNoticeStack>
            ) : null}
          </CatchGap>
        </EventRuntimePanel>
      )}
    </EventRuntimeFrame>
  );
}
