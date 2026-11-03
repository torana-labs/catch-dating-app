import {CatchField, CatchGap, CatchLegacyText} from "@catch/web-ui";
import {websiteCopy} from "@content/generated";
import {hostApplicationCopy} from "@content/host";
import {websiteTemplates} from "@content/templates";
import {activeHostApplicationCityOptions} from "@content/markets";
import {
  Button,
  ActionGroup,
  ButtonLink,
  ChoiceChip,
  ChoiceChipGrid,
  FormStatus,
  HostApplicationCompletenessSummary,
  HostApplicationPanel,
  HostApplicationReviewCard,
  HostApplicationReviewGrid,
  HostApplicationShell,
  HostApplicationStage,
  HostApplicationSubmitted,
  OperationalNote,
  ProfileStrength,
  StepRail,
} from "../../../shared/ui/primitives";
import {
  hostApplicationChecklist,
  hostApplicationCompleteness,
  hostApplicationSteps,
  hostFormatOptions,
  hostSuccessModuleOptions,
} from "./applicationModel";
import {useHostApplicationController} from "./useHostApplicationController";

export function HostApplicationFlow() {
  const {
    currentStepIndex,
    draft,
    goBack,
    goNext,
    goToStep,
    handleFormStart,
    handleSubmit,
    isSubmitting,
    resolvedCity,
    status,
    step,
    submitted,
    toggleDraftList,
    updateDraft,
  } = useHostApplicationController();

  return (
    <HostApplicationShell
      onFocus={handleFormStart}
      onSubmit={handleSubmit}
      pending={isSubmitting}
    >
      <StepRail
        currentIndex={currentStepIndex}
        items={hostApplicationSteps}
        label={websiteCopy["hostapplicationflow_0232"]}
        onSelect={goToStep}
      />

      <HostApplicationPanel>
        {submitted ? (
          <HostApplicationSubmitted
            label={websiteCopy["hostapplicationflow_0231"]}
            title={websiteTemplates.hostPacketReceived(draft.organizationName)}
            body={websiteCopy["hostapplicationflow_0208"]}
          />
        ) : null}

        {!submitted && step === "profile" ? (
          <HostApplicationStage>
            <CatchGap size="formField">
              <CatchField
                recipe="input"
                id="host-full-name"
                title={websiteCopy["hostapplicationflow_0230"]}
                value={draft.fullName}
                autoComplete="name"
                onChanged={(value) => updateDraft("fullName", value)}
                required
              />
              <CatchField
                recipe="input"
                id="host-email"
                title={websiteCopy["hostapplicationflow_0221"]}
                value={draft.email}
                autoComplete="email"
                onChanged={(value) => updateDraft("email", value)}
                required
                keyboardType="emailAddress"
              />
              <CatchField
                recipe="select"
                id="host-city"
                title={websiteCopy["hostapplicationflow_0245"]}
                values={activeHostApplicationCityOptions}
                itemLabelBuilder={(city) => city}
                value={draft.city}
                onChanged={(city) => updateDraft("city", city ?? "")}
                required
              />
              {draft.city === "Other" ? (
                <CatchField
                  recipe="input"
                  id="host-custom-city"
                  title={websiteCopy["hostapplicationflow_0265"]}
                  value={draft.customCity}
                  autoComplete="address-level2"
                  onChanged={(value) => updateDraft("customCity", value)}
                  required
                />
              ) : null}
              <CatchField
                recipe="input"
                id="host-org-name"
                title={websiteCopy["hostapplicationflow_0248"]}
                value={draft.organizationName}
                onChanged={(value) => updateDraft("organizationName", value)}
                required
              />
              <CatchField
                recipe="select"
                id="host-org-type"
                title={websiteCopy["hostapplicationflow_0233"]}
                values={[
                  websiteCopy["hostapplicationflow_0234"],
                  websiteCopy["hostapplicationflow_0255"],
                  websiteCopy["hostapplicationflow_0259"],
                  websiteCopy["hostapplicationflow_0217"],
                  websiteCopy["hostapplicationflow_0222"],
                ]}
                itemLabelBuilder={(type) => type}
                value={draft.organizationType}
                onChanged={(type) => updateDraft("organizationType", type ?? "")}
              />
              <CatchField
                recipe="input"
                id="host-community-link"
                title={websiteCopy["hostapplicationflow_0218"]}
                value={draft.communityLink}
                autoComplete="url"
                inputHint={websiteCopy["hostapplicationflow_0235"]}
                onChanged={(value) => updateDraft("communityLink", value)}
                required
              />
            </CatchGap>
          </HostApplicationStage>
        ) : null}

        {!submitted && step === "event" ? (
          <HostApplicationStage>
            <CatchGap size="inline">
              <CatchLegacyText as="span" variant="fieldLabel">{websiteCopy["hostapplicationflow_0228"]}</CatchLegacyText>
              <ChoiceChipGrid aria-label={websiteCopy["hostapplicationflow_0228"]}>
                {hostFormatOptions.map((format) => (
                  <ChoiceChip
                    selected={draft.formats.includes(format)}
                    key={format}
                    onClick={() => toggleDraftList("formats", format)}
                  >
                    {format}
                  </ChoiceChip>
                ))}
              </ChoiceChipGrid>
            </CatchGap>
            <CatchGap size="formField">
              <CatchField
                recipe="select"
                id="host-event-cadence"
                title={websiteCopy["hostapplicationflow_0215"]}
                values={[
                  websiteCopy["hostapplicationflow_0262"],
                  websiteCopy["hostapplicationflow_0212"],
                  websiteCopy["hostapplicationflow_0240"],
                  websiteCopy["hostapplicationflow_0252"],
                  websiteCopy["hostapplicationflow_0243"],
                ]}
                itemLabelBuilder={(cadence) => cadence}
                value={draft.eventCadence}
                onChanged={(cadence) => updateDraft("eventCadence", cadence ?? "")}
              />
              <CatchField
                recipe="input"
                id="host-event-name"
                title={websiteCopy["hostapplicationflow_0226"]}
                value={draft.nextEventName}
                inputHint={websiteCopy["hostapplicationflow_0237"]}
                onChanged={(value) => updateDraft("nextEventName", value)}
                required
              />
              <CatchField
                recipe="select"
                id="host-event-pricing"
                title={hostApplicationCopy.eventPricing.label}
                hintText={hostApplicationCopy.eventPricing.placeholder}
                values={hostApplicationCopy.eventPricing.options}
                itemLabelBuilder={(option) => option.label}
                itemValueBuilder={(option) => option.value}
                value={hostApplicationCopy.eventPricing.options.find(
                  (option) => option.value === draft.eventPricing) ?? null}
                required
                onChanged={(option) => updateDraft("eventPricing", option?.value ?? "")}
              />
              <CatchField
                recipe="input"
                id="host-event-date"
                title={websiteCopy["hostapplicationflow_0257"]}
                value={draft.nextEventDate}
                onChanged={(value) => updateDraft("nextEventDate", value)}
                keyboardType="date"
              />
              <CatchField
                recipe="input"
                id="host-event-location"
                title={websiteCopy["hostapplicationflow_0260"]}
                value={draft.eventLocation}
                onChanged={(value) => updateDraft("eventLocation", value)}
                required
              />
            </CatchGap>
          </HostApplicationStage>
        ) : null}

        {!submitted && step === "setup" ? (
          <HostApplicationStage>
            <CatchGap size="formField">
              <CatchField
                recipe="input"
                id="host-capacity"
                title={hostApplicationCopy.setup.guestCountLabel}
                value={draft.expectedCapacity}
                onChanged={(value) => updateDraft("expectedCapacity", value)}
                required
                keyboardType="number"
              />
              <CatchField
                recipe="select"
                id="host-booking-platform"
                title={hostApplicationCopy.setup.bookingPlatformLabel}
                values={hostApplicationCopy.setup.bookingPlatforms}
                itemLabelBuilder={(platform) => platform}
                value={draft.bookingPlatform}
                onChanged={(platform) => updateDraft("bookingPlatform", platform ?? "")}
              />
              <CatchField
                recipe="select"
                id="host-guest-list-format"
                title={hostApplicationCopy.setup.guestListFormatLabel}
                values={hostApplicationCopy.setup.guestListFormats}
                itemLabelBuilder={(format) => format}
                value={draft.guestListFormat}
                onChanged={(format) => updateDraft("guestListFormat", format ?? "")}
              />
            </CatchGap>
          </HostApplicationStage>
        ) : null}

        {!submitted && step === "success" ? (
          <HostApplicationStage>
            <CatchGap size="inline">
              <CatchLegacyText as="span" variant="fieldLabel">{websiteCopy["hostapplicationflow_0224"]}</CatchLegacyText>
              <ChoiceChipGrid aria-label={websiteCopy["hostapplicationflow_0224"]}>
                {hostSuccessModuleOptions.map((module) => (
                  <ChoiceChip
                    selected={draft.eventSuccessModules.includes(module)}
                    key={module}
                    onClick={() => toggleDraftList("eventSuccessModules", module)}
                  >
                    {module}
                  </ChoiceChip>
                ))}
              </ChoiceChipGrid>
            </CatchGap>
            <CatchGap size="formField">
              <CatchField
                recipe="input"
                id="host-goals"
                title={websiteCopy["hostapplicationflow_0263"]}
                value={draft.hostGoals}
                maxLines={3}
                inputHint={websiteCopy["hostapplicationflow_0211"]}
                onChanged={(value) => updateDraft("hostGoals", value)}
                required
              />
              <CatchField
                recipe="input"
                id="host-operating-notes"
                title={websiteCopy["hostapplicationflow_0246"]}
                value={draft.operatingNotes}
                maxLines={3}
                inputHint={websiteCopy["hostapplicationflow_0219"]}
                onChanged={(value) => updateDraft("operatingNotes", value)}
              />
            </CatchGap>
          </HostApplicationStage>
        ) : null}

        {!submitted && step === "review" ? (
          <HostApplicationStage>
            <HostApplicationReviewGrid>
              <HostApplicationReviewCard title={websiteCopy["hostapplicationflow_0251"]} rows={[
                ["Host", draft.fullName],
                ["Organization", draft.organizationName],
                ["City", resolvedCity],
                ["Link", draft.communityLink],
              ]} />
              <HostApplicationReviewCard title={websiteCopy["hostapplicationflow_0227"]} rows={[
                ["Formats", draft.formats.join(", ")],
                ["Event", draft.nextEventName],
                [hostApplicationCopy.eventPricing.label, hostApplicationCopy.eventPricing.options.find((option) => option.value === draft.eventPricing)?.label ?? ""],
                ["Location", draft.eventLocation],
                ["Cadence", draft.eventCadence],
              ]} />
              <HostApplicationReviewCard title={hostApplicationCopy.review.setupTitle} rows={[
                [hostApplicationCopy.review.platformLabel, draft.bookingPlatform],
                [hostApplicationCopy.review.formatLabel, draft.guestListFormat],
                [hostApplicationCopy.review.guestsLabel, draft.expectedCapacity],
              ]} />
              <HostApplicationReviewCard title={websiteCopy["hostapplicationflow_0223"]} rows={[
                ["Modules", draft.eventSuccessModules.join(", ")],
                ["Goal", draft.hostGoals],
              ]} />
            </HostApplicationReviewGrid>
            <OperationalNote
              title={hostApplicationCopy.review.noteTitle}
              body={hostApplicationCopy.review.noteBody}
            />
          </HostApplicationStage>
        ) : null}

        <HostApplicationCompletenessSummary
          label={websiteCopy["hostapplicationflow_0207"]}
          meter={<ProfileStrength value={hostApplicationCompleteness(draft)} />}
          items={hostApplicationChecklist(draft)}
        />

        {!submitted ? (
          <ActionGroup>
            <Button
              disabled={currentStepIndex === 0}
              onClick={goBack}
              type="button"
              variant="ghost"
            >{websiteCopy["hostapplicationflow_0209"]}</Button>
            {step === "review" ? (
              <Button key="submit" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Submitting..." : "Submit host packet"}
              </Button>
            ) : (
              <Button key="continue" onClick={goNext} type="button">{websiteCopy["hostapplicationflow_0220"]}</Button>
            )}
          </ActionGroup>
        ) : (
          <ActionGroup>
            <ButtonLink href="/organizers/" variant="ghost">{websiteCopy["hostapplicationflow_0214"]}</ButtonLink>
            <ButtonLink href="/claim/">{websiteCopy["hostapplicationflow_0216"]}</ButtonLink>
          </ActionGroup>
        )}

        <FormStatus status={status} />
      </HostApplicationPanel>
    </HostApplicationShell>
  );
}
