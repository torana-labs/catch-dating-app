import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy_defaults.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_policy_state.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
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
