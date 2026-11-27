import 'package:catch_dating_app/contexts/events/data/private_event_preferences_repository.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_setup_models.dart';
import 'package:catch_dating_app/contexts/events/domain/event_draft.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy_defaults.dart';
import 'package:catch_dating_app/contexts/events/domain/manager_event_setup_preferences.dart';
import 'package:catch_dating_app/hosts/create/create_draft_values.dart';
import 'package:catch_dating_app/hosts/create/create_event_policy_state.dart';
import 'package:catch_dating_app/hosts/create/create_tickets_body.dart';
import 'package:catch_dating_app/hosts/create/edit_event_values.dart';
import 'package:collection/collection.dart';

// The create flow's admission values: the organizer's policy defaults a
// fresh draft starts from, the terms the tickets step sends, and the
// preferences saved beside them. Pure values; the create controller and
// tests share them.

/// A new event is priced in rupees.
const createCurrency = 'INR';

/// A fresh draft filled from the organizer's event policy defaults: the
/// admission format, the age range, cohort caps, demand pricing and the
/// cancellation policy of a paid event.
EventDraft createDraftWithPolicyDefaults(
  EventDraft draft,
  EventPolicyDefaults defaults,
) {
  String rupees(int? paise) => CreateEventPolicyState.minorUnitsText(
    paise,
    currencyCode: createCurrency,
  );
  final caps =
      defaults.admissionPreset == EventAdmissionDefaultPreset.fixedCohortCaps;
  final balanced =
      defaults.admissionPreset == EventAdmissionDefaultPreset.balancedSingles;
  return draft.copyWith(
    admissionPreset: defaults.admissionPreset.name,
    minAge: defaults.minAge == 0 ? '' : '${defaults.minAge}',
    maxAge: defaults.maxAge == 99 ? '' : '${defaults.maxAge}',
    maxMen: caps ? defaults.maxMen?.toString() : null,
    maxWomen: caps ? defaults.maxWomen?.toString() : null,
    dynamicPricingEnabled: balanced && defaults.dynamicPricingEnabled,
    dynamicPricingStep: balanced
        ? rupees(defaults.dynamicPricingStepInPaise)
        : null,
    dynamicPricingMax: balanced
        ? rupees(defaults.dynamicPricingMaxInPaise)
        : null,
    cancellationPolicy: defaults.cancellationPolicyId.isApplicable
        ? defaults.cancellationPolicyId.name
        : null,
  );
}

/// The draft with a saved private event's admission fields: format, ages,
/// cohort caps, demand pricing, cancellation and cross-paths places, read
/// as an edit reads them. Resuming setup loads them first, so a policy
/// rebuilt after the host changes one field keeps the others.
EventDraft createDraftWithSavedPolicy(
  EventDraft draft,
  PrivateEventSavedPolicy saved,
) {
  final policy = saved.eventPolicy;
  final limits = saved.constraints;
  final demand = policy.pricingPolicy.demandPricingRules.firstOrNull;
  final pairs = policy.admissionPolicy.crossPathsPairInventory;
  String rupees(int? paise) => CreateEventPolicyState.minorUnitsText(
    paise,
    currencyCode: saved.currency,
  );
  final cancellation = policy.cancellationPolicy.id;
  return draft.copyWith(
    admissionPreset: policy.usesFixedCohortCaps
        ? editFixedCohortCapsPreset
        : editAdmissionPresetForPolicy(policy).name,
    minAge: limits.minAge == 0 ? '' : '${limits.minAge}',
    maxAge: limits.maxAge == 99 ? '' : '${limits.maxAge}',
    maxMen: limits.maxMen?.toString(),
    maxWomen: limits.maxWomen?.toString(),
    dynamicPricingEnabled: policy.usesDemandPricing,
    dynamicPricingStep: demand == null
        ? draft.dynamicPricingStep
        : rupees(demand.stepAdjustment.inPaise),
    dynamicPricingMax: demand == null
        ? draft.dynamicPricingMax
        : rupees(demand.maxAdjustment.inPaise),
    cancellationPolicy: cancellation.isApplicable
        ? cancellation.name
        : draft.cancellationPolicy,
    crossPathsPairInventoryEnabled: pairs.isEnabled,
    crossPathsPairCapacity: '${pairs.reservedPairCapacity}',
  );
}

/// The draft with the organizer's setup defaults in its empty price and
/// places, and their refund policy as the cancellation choice unless
/// [keepCancellation].
EventDraft createDraftWithSetupDefaults(
  EventDraft draft,
  ManagerEventSetupPreferences defaults, {
  required bool keepCancellation,
}) {
  final price = defaults.startingPriceMinor;
  final refund = defaults.refundPolicy;
  return draft.copyWith(
    price: draft.price ?? (price == null ? null : '${price ~/ 100}'),
    capacity: draft.capacity ?? defaults.places?.toString(),
    cancellationPolicy: refund == null || keepCancellation
        ? draft.cancellationPolicy
        : refund,
  );
}

/// The cancellation policy [draft] sends: not applicable when free, else
/// the host's choice, else [refundPolicy] (the organizer's default).
EventCancellationPolicyId createCancellationPolicy(
  EventDraft draft, {
  required String refundPolicy,
}) {
  if (createPricePaise(draft.price) == 0) {
    return EventCancellationPolicyId.notApplicable;
  }
  EventCancellationPolicyId? applicable(String? name) =>
      EventCancellationPolicyId.values.firstWhereOrNull(
        (id) => id.name == name && id.isApplicable,
      );
  return applicable(draft.cancellationPolicy) ??
      applicable(refundPolicy) ??
      EventCancellationPolicyId.standard;
}

/// The terms the tickets step sends for [draft]: the places, the price in
/// paise and the cancellation policy. With [includePolicy] they also carry
/// the event policy, the age and cohort limits and an invite-only event's
/// code, built from the admission fields as an edit builds them; without
/// it the event keeps the ones it has.
PrivateEventAdmissionTerms createAdmissionTerms(
  EventDraft draft, {
  required String refundPolicy,
  required bool includePolicy,
}) {
  final price = createPricePaise(draft.price)!;
  final capacity = int.tryParse(draft.capacity ?? '') ?? createDefaultPlaces;
  final cancellation = createCancellationPolicy(
    draft,
    refundPolicy: refundPolicy,
  );
  if (!includePolicy) {
    return PrivateEventAdmissionTerms(
      capacityLimit: capacity,
      priceInPaise: price,
      currency: createCurrency,
      cancellationPolicyId: cancellation.name,
    );
  }
  final terms = editPolicyTermsOfDraft(
    draft,
    currencyCode: createCurrency,
    capacityLimit: capacity,
    basePriceInPaise: price,
    cancellationPolicyId: cancellation,
    crossPathsPairCapacity: draft.crossPathsPairInventoryEnabled
        ? int.tryParse(draft.crossPathsPairCapacity ?? '') ?? 0
        : 0,
  );
  final invite = (draft.inviteCode ?? '').trim();
  return PrivateEventAdmissionTerms(
    capacityLimit: capacity,
    priceInPaise: price,
    currency: createCurrency,
    cancellationPolicyId: cancellation.name,
    eventPolicy: Map<String, Object?>.from(terms.eventPolicy.toJson()),
    constraints: Map<String, Object?>.from(terms.constraints.toJson()),
    inviteCode:
        editAdmissionPreset(draft) == EventAdmissionPreset.inviteOnly &&
            invite.isNotEmpty
        ? invite
        : null,
  );
}

/// The admission preset the preferences command stores for [draft]: one of
/// open capacity, invite only, balanced singles and fixed cohort caps. A
/// request-to-join format is open capacity that asks the host first; an
/// event sold elsewhere is open capacity or invite only.
String createPreferencePreset(EventDraft draft) {
  final preset = editAdmissionPreset(draft);
  // Selling elsewhere offers only anyone or invite only.
  if (draft.externalBookingMode) {
    return preset == EventAdmissionPreset.inviteOnly
        ? EventAdmissionPreset.inviteOnly.name
        : EventAdmissionPreset.openCapacity.name;
  }
  if (editCohortCapsEnabled(draft)) return editFixedCohortCapsPreset;
  return switch (preset) {
    EventAdmissionPreset.inviteOnly => EventAdmissionPreset.inviteOnly.name,
    EventAdmissionPreset.balancedSingles =>
      EventAdmissionPreset.balancedSingles.name,
    EventAdmissionPreset.openCapacity ||
    EventAdmissionPreset.requestToJoin ||
    EventAdmissionPreset.requestToJoinMembersExempt =>
      EventAdmissionPreset.openCapacity.name,
  };
}

/// Whether bookings ask the host first. Publishing applies the booking
/// preference to the policy, so a request-to-join format must ask, or
/// publishing would open it.
bool createAsksFirst(EventDraft draft, {required bool approveEach}) =>
    approveEach ||
    (!draft.externalBookingMode && editAdmissionPreset(draft).requiresReview);

/// The tickets step's preferences: [intents] as saved, with the admission
/// [preset], the [booking] mode and the [waitlist] choice set.
PrivateEventPreferenceIntents createTicketIntents(
  PrivateEventPreferenceIntents intents, {
  required String preset,
  required String booking,
  required bool waitlist,
}) => PrivateEventPreferenceIntents(
  usualDurationMinutes: intents.usualDurationMinutes,
  preferredVenueId: intents.preferredVenueId,
  offerValidityMinutes: intents.offerValidityMinutes,
  collectionPreference: intents.collectionPreference,
  currency: intents.currency,
  offerMessageTemplate: intents.offerMessageTemplate,
  paymentInstructions: intents.paymentInstructions,
  reusablePaymentPage: intents.reusablePaymentPage,
  admissionPreset: EventSetupValue.set(preset),
  expectedAmountMinor: intents.expectedAmountMinor,
  bookingMode: EventSetupValue.set(booking),
  waitlistEnabled: EventSetupValue.set(waitlist),
);
