import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy_defaults.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_policy_state.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/host_create_event_route_state.dart';
import 'package:catch_platform/catch_async_state.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart';

void main() {
  test('HostCreateEventRouteState prefers route extra club', () {
    final organizer = buildOrganizer(id: 'club-extra');

    final state = HostCreateEventRouteState.initial(organizer);

    expect(state.status, HostCreateEventRouteStatus.ready);
    expect(state.organizer, organizer);
    expect(state.usedInitialOrganizer, isTrue);
    expect(state.retryIntent, isNull);
  });

  test('HostCreateEventRouteState maps fetch states', () {
    final organizer = buildOrganizer(id: 'club-fetched');

    final loading = HostCreateEventRouteState.fromOrganizerState(
      const CatchAsyncState.loading(),
    );
    expect(loading.status, HostCreateEventRouteStatus.loading);

    final error = HostCreateEventRouteState.fromOrganizerState(
      CatchAsyncState.error(StateError('fetch failed')),
    );
    expect(error.status, HostCreateEventRouteStatus.error);
    expect(error.retryIntent, HostCreateEventRouteRetryIntent.reloadOrganizer);

    final notFound = HostCreateEventRouteState.fromOrganizerState(
      const CatchAsyncState.data(null),
    );
    expect(notFound.status, HostCreateEventRouteStatus.notFound);

    final ready = HostCreateEventRouteState.fromOrganizerState(
      CatchAsyncState.data(organizer),
    );
    expect(ready.status, HostCreateEventRouteStatus.ready);
    expect(ready.organizer, organizer);
    expect(ready.usedInitialOrganizer, isFalse);
  });

  test('HostCreateEventRouteState blocks non-host identities', () {
    final organizer = buildOrganizer();

    final loadingIdentity = HostCreateEventRouteState.resolve(
      initialOrganizer: organizer,
      fetchedOrganizer: null,
      uid: const CatchAsyncState.loading(),
    );
    expect(loadingIdentity.status, HostCreateEventRouteStatus.loading);

    final forbidden = HostCreateEventRouteState.resolve(
      initialOrganizer: organizer,
      fetchedOrganizer: null,
      uid: const CatchAsyncState.data('runner-1'),
    );
    expect(forbidden.status, HostCreateEventRouteStatus.forbidden);
    expect(forbidden.organizer, organizer);

    final ready = HostCreateEventRouteState.resolve(
      initialOrganizer: organizer,
      fetchedOrganizer: null,
      uid: const CatchAsyncState.data('host-1'),
    );
    expect(ready.status, HostCreateEventRouteStatus.ready);
    expect(ready.organizer, organizer);
  });

  test('CreateEventPolicyState maps defaults, transitions, and drafts', () {
    const defaults = EventPolicyDefaults(
      admissionPreset: EventAdmissionDefaultPreset.fixedCohortCaps,
      minAge: 23,
      maxAge: 35,
      maxMen: 10,
      maxWomen: 12,
      dynamicPricingEnabled: true,
      dynamicPricingStepInPaise: 2500,
      dynamicPricingMaxInPaise: 15000,
      cancellationPolicyId: EventCancellationPolicyId.flexible,
    );

    final form = CreateEventPolicyDefaultsFormState.fromDefaults(
      defaults,
      currencyCode: 'INR',
    );
    final inviteOnly = form.policyState.selectAdmissionPreset(
      EventAdmissionPreset.inviteOnly,
    );
    final balanced = form.policyState.selectAdmissionPreset(
      EventAdmissionPreset.balancedSingles,
    );
    final draft = CreateEventPolicyState.fromDraft(
      admissionPreset: 'fixedCohortCaps',
      cancellationPolicy: 'strict',
      maxMen: '8',
      maxWomen: null,
      dynamicPricingEnabled: false,
    );

    expect(form.policyState.admissionPreset, EventAdmissionPreset.openCapacity);
    expect(form.policyState.cohortCapsEnabled, isTrue);
    expect(form.policyState.dynamicPricingEnabled, isTrue);
    expect(
      form.policyState.cancellationPolicyId,
      EventCancellationPolicyId.flexible,
    );
    expect(form.minAgeText, '23');
    expect(form.maxAgeText, '35');
    expect(form.maxMenText, '10');
    expect(form.maxWomenText, '12');
    expect(form.dynamicPricingStepText, '25');
    expect(form.dynamicPricingMaxText, '150');
    expect(inviteOnly.cohortCapsEnabled, isFalse);
    expect(inviteOnly.dynamicPricingEnabled, isFalse);
    expect(inviteOnly.draftAdmissionPresetName, 'inviteOnly');
    expect(balanced.dynamicPricingEnabled, isTrue);
    expect(draft.admissionPreset, EventAdmissionPreset.openCapacity);
    expect(draft.cohortCapsEnabled, isTrue);
    expect(draft.dynamicPricingEnabled, isFalse);
    expect(draft.cancellationPolicyId, EventCancellationPolicyId.strict);
    expect(draft.draftAdmissionPresetName, 'fixedCohortCaps');
  });

  test('CreateEventPolicyState builds defaults and event policy bundles', () {
    const balanced = CreateEventPolicyState(
      admissionPreset: EventAdmissionPreset.balancedSingles,
      dynamicPricingEnabled: true,
      cancellationPolicyId: EventCancellationPolicyId.flexible,
    );
    const inviteOnly = CreateEventPolicyState(
      admissionPreset: EventAdmissionPreset.inviteOnly,
    );
    const requestToJoin = CreateEventPolicyState(
      admissionPreset: EventAdmissionPreset.requestToJoin,
      cancellationPolicyId: EventCancellationPolicyId.strict,
    );
    const pairInventory = CreateEventPolicyState(
      crossPathsPairInventoryEnabled: true,
    );

    final defaults = balanced.defaultsFromFields(
      minAge: '24',
      maxAge: '36',
      maxMen: '',
      maxWomen: '',
      dynamicPricingStep: '25',
      dynamicPricingMax: '150',
      currencyCode: 'INR',
    );
    final invitePolicy = inviteOnly.eventPolicyFromFields(
      capacity: '20',
      basePrice: '249.5',
      inviteCode: 'CATCH-DELHI',
      minAge: '',
      maxAge: '',
      maxMen: '',
      maxWomen: '',
      dynamicPricingStep: '',
      dynamicPricingMax: '',
      currencyCode: 'INR',
    );
    final requestPolicy = requestToJoin.eventPolicyFromFields(
      capacity: '12',
      basePrice: '0',
      inviteCode: '',
      minAge: '',
      maxAge: '',
      maxMen: '',
      maxWomen: '',
      dynamicPricingStep: '',
      dynamicPricingMax: '',
      currencyCode: 'INR',
    );
    final pairPolicy = pairInventory.eventPolicyFromFields(
      capacity: '20',
      basePrice: '0',
      inviteCode: '',
      minAge: '',
      maxAge: '',
      maxMen: '',
      maxWomen: '',
      dynamicPricingStep: '',
      dynamicPricingMax: '',
      currencyCode: 'INR',
      crossPathsPairCapacity: '4',
    );

    expect(
      defaults.admissionPreset,
      EventAdmissionDefaultPreset.balancedSingles,
    );
    expect(defaults.dynamicPricingEnabled, isTrue);
    expect(defaults.dynamicPricingStepInPaise, 2500);
    expect(defaults.dynamicPricingMaxInPaise, 15000);
    expect(defaults.cancellationPolicyId, EventCancellationPolicyId.flexible);
    expect(
      invitePolicy.admissionPolicy.format,
      EventAdmissionFormat.inviteOnly,
    );
    expect(
      invitePolicy.admissionPolicy.privateAccessPolicy.inviteCodeHint,
      'CA...HI',
    );
    expect(
      requestPolicy.admissionPolicy.format,
      EventAdmissionFormat.manualApproval,
    );
    expect(
      requestPolicy.cancellationPolicy.id,
      EventCancellationPolicyId.notApplicable,
    );
    expect(
      pairPolicy.admissionPolicy.crossPathsPairInventory.isEnabled,
      isTrue,
    );
    expect(
      pairPolicy.admissionPolicy.crossPathsPairInventory.reservedPairCapacity,
      4,
    );
    expect(CreateEventPolicyState.inviteCodeHint('ABCD'), 'ABCD');
    expect(CreateEventPolicyState.inviteCodeHint(''), isNull);
  });
}
