import 'dart:typed_data';

import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_draft.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy_defaults.dart';
import 'package:catch_dating_app/contexts/events/domain/route_event_plan.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_defaults.dart';
import 'package:catch_dating_app/core/business_rules.dart';
import 'package:catch_dating_app/core/presentation/catch_async_state.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_controller.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_draft_restore_state.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_draft_snapshot.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_location_state.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_photo_draft_state.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_policy_state.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_schedule_state.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_wizard_state.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/host_create_event_route_state.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_dating_app/locations/domain/location_coordinate.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image_picker/image_picker.dart';

import '../events/events_test_helpers.dart';

part 'host_create_event_draft_signature_tests.dart';

void main() {
  final l10n = AppLocalizationsEn();
  final steps = [
    for (final step in CreateEventWizardStep.values) step.toSpec(l10n: l10n),
  ];

  test('HostCreateEventRouteState prefers route extra club', () {
    final club = buildClub(id: 'club-extra');

    final state = HostCreateEventRouteState.initial(club);

    expect(state.status, HostCreateEventRouteStatus.ready);
    expect(state.club, club);
    expect(state.usedInitialClub, isTrue);
    expect(state.retryIntent, isNull);
  });

  test('HostCreateEventRouteState maps fetch states', () {
    final club = buildClub(id: 'club-fetched');

    final loading = HostCreateEventRouteState.fromClubState(
      const CatchAsyncState.loading(),
    );
    expect(loading.status, HostCreateEventRouteStatus.loading);

    final error = HostCreateEventRouteState.fromClubState(
      CatchAsyncState.error(StateError('fetch failed')),
    );
    expect(error.status, HostCreateEventRouteStatus.error);
    expect(error.retryIntent, HostCreateEventRouteRetryIntent.reloadClub);

    final notFound = HostCreateEventRouteState.fromClubState(
      const CatchAsyncState.data(null),
    );
    expect(notFound.status, HostCreateEventRouteStatus.notFound);

    final ready = HostCreateEventRouteState.fromClubState(
      CatchAsyncState.data(club),
    );
    expect(ready.status, HostCreateEventRouteStatus.ready);
    expect(ready.club, club);
    expect(ready.usedInitialClub, isFalse);
  });

  test('HostCreateEventRouteState blocks non-host identities', () {
    final club = buildClub();

    final loadingIdentity = HostCreateEventRouteState.resolve(
      initialClub: club,
      fetchedClub: null,
      uid: const CatchAsyncState.loading(),
    );
    expect(loadingIdentity.status, HostCreateEventRouteStatus.loading);

    final forbidden = HostCreateEventRouteState.resolve(
      initialClub: club,
      fetchedClub: null,
      uid: const CatchAsyncState.data('runner-1'),
    );
    expect(forbidden.status, HostCreateEventRouteStatus.forbidden);
    expect(forbidden.club, club);

    final ready = HostCreateEventRouteState.resolve(
      initialClub: club,
      fetchedClub: null,
      uid: const CatchAsyncState.data('host-1'),
    );
    expect(ready.status, HostCreateEventRouteStatus.ready);
    expect(ready.club, club);
  });

  test(
    'CreateEventWizardState maps step, footer, and mutation display state',
    () {
      final state = CreateEventWizardState.resolve(
        club: buildClub(),
        activeSteps: steps,
        currentStep: 1,
        submitPending: false,
        saveDraftPending: true,
        mutationError: 'Unable to save draft.',
        createdEvent: null,
        inviteCode: null,
      );

      expect(state.title, 'When & where');
      expect(state.currentStep, 1);
      expect(state.totalSteps, 3);
      expect(state.isLastStep, isFalse);
      expect(state.isLoading, isTrue);
      expect(state.closeIntent, CreateEventWizardCloseIntent.close);
      expect(
        state.previousIntent,
        CreateEventWizardPreviousIntent.previousStep,
      );
      expect(state.primaryIntent, CreateEventWizardPrimaryIntent.nextStep);
      expect(state.successNavigation, isNull);
      expect(state.mutationError, 'Unable to save draft.');
    },
  );

  test('CreateEventWizardState maps success and clamps invalid step index', () {
    final event = buildEvent(id: 'event-created');

    final state = CreateEventWizardState.resolve(
      club: buildClub(),
      activeSteps: steps,
      currentStep: 99,
      submitPending: false,
      saveDraftPending: false,
      mutationError: null,
      createdEvent: event,
      inviteCode: 'CATCH-DELHI',
    );

    expect(state.currentStep, 2);
    expect(state.currentStepKind, CreateEventWizardStep.eventPolicy);
    expect(state.title, 'Booking & live guide');
    expect(state.isLastStep, isTrue);
    expect(state.closeIntent, CreateEventWizardCloseIntent.close);
    expect(state.previousIntent, CreateEventWizardPreviousIntent.previousStep);
    expect(state.primaryIntent, CreateEventWizardPrimaryIntent.review);
    expect(state.createdEvent, event);
    expect(state.inviteCode, 'CATCH-DELHI');
    expect(state.successNavigation?.club.id, 'club-1');
    expect(state.successNavigation?.event, event);
    expect(state.successNavigation?.inviteCode, 'CATCH-DELHI');

    final manageEffect = CreateEventSuccessNavigationEffect.resolve(
      intent: CreateEventSuccessNavigationIntent.manageEvent,
      state: state.successNavigation!,
    );
    final backEffect = CreateEventSuccessNavigationEffect.resolve(
      intent: CreateEventSuccessNavigationIntent.backToClub,
      state: state.successNavigation!,
    );

    expect(
      manageEffect.destination,
      CreateEventSuccessNavigationDestination.manageEventRoute,
    );
    expect(manageEffect.pathParameters, {
      'clubId': 'club-1',
      'eventId': 'event-created',
    });
    expect(manageEffect.extra, event);
    expect(
      backEffect.destination,
      CreateEventSuccessNavigationDestination.popRoute,
    );
    expect(backEffect.pathParameters, isEmpty);
    expect(backEffect.extra, isNull);
  });

  test('CreateEventWizardStep maps canonical form specs', () {
    final eventDetailsFormKey = GlobalKey<FormState>();
    final scheduleFormKey = GlobalKey<FormState>();
    final eventPolicyFormKey = GlobalKey<FormState>();

    final stepSpecs = createEventWizardStepSpecs(
      eventDetailsFormKey: eventDetailsFormKey,
      l10n: l10n,
      scheduleFormKey: scheduleFormKey,
      eventPolicyFormKey: eventPolicyFormKey,
    );

    expect(stepSpecs.map((step) => step.title), [
      'Event basics',
      'When & where',
      'Booking & live guide',
    ]);
    expect(formKeyForStep(stepSpecs, 0), eventDetailsFormKey);
    expect(formKeyForStep(stepSpecs, 1), scheduleFormKey);
    expect(formKeyForStep(stepSpecs, 2), eventPolicyFormKey);
    expect(formKeyForStep(stepSpecs, 3), isNull);
    expect(createEventWizardStepValidatesSchedule(1), isTrue);
    expect(createEventWizardStepValidatesSchedule(0), isFalse);
    expect(createEventWizardStepValidatesSchedule(99), isFalse);
  });

  test('CreateEventWizardValidationPlan maps form and schedule policy', () {
    final eventDetailsFormKey = GlobalKey<FormState>();
    final scheduleFormKey = GlobalKey<FormState>();
    final eventPolicyFormKey = GlobalKey<FormState>();
    final stepSpecs = createEventWizardStepSpecs(
      eventDetailsFormKey: eventDetailsFormKey,
      l10n: l10n,
      scheduleFormKey: scheduleFormKey,
      eventPolicyFormKey: eventPolicyFormKey,
    );
    final now = DateTime(2026, 7, 1, 9);

    final schedulePlan = CreateEventWizardValidationPlan.resolve(
      activeSteps: stepSpecs,
      currentStep: CreateEventWizardStep.schedule.index,
      scheduleState: CreateEventScheduleState(
        selectedDate: DateTime(2026, 7),
        selectedStartTime: const TimeOfDay(hour: 8, minute: 30),
      ),
      now: now,
    );
    final detailsPlan = CreateEventWizardValidationPlan.resolve(
      activeSteps: stepSpecs,
      currentStep: CreateEventWizardStep.eventDetails.index,
      scheduleState: CreateEventScheduleState(
        selectedDate: DateTime(2026, 7),
        selectedStartTime: const TimeOfDay(hour: 8, minute: 30),
      ),
      now: now,
    );

    expect(schedulePlan.formKey, scheduleFormKey);
    expect(schedulePlan.scheduleAllowsContinue, isFalse);
    expect(schedulePlan.scheduleErrorText, createEventFutureStartError);
    expect(detailsPlan.formKey, eventDetailsFormKey);
    expect(detailsPlan.scheduleAllowsContinue, isTrue);
    expect(detailsPlan.scheduleErrorText, isNull);
  });

  test('CreateEventWizardState maps global close intents', () {
    final clean = CreateEventWizardState.resolve(
      club: buildClub(),
      activeSteps: steps,
      currentStep: 0,
      submitPending: false,
      saveDraftPending: false,
      mutationError: null,
      createdEvent: null,
      inviteCode: null,
    );
    final dirty = CreateEventWizardState.resolve(
      club: buildClub(),
      activeSteps: steps,
      currentStep: 0,
      submitPending: false,
      saveDraftPending: false,
      mutationError: null,
      createdEvent: null,
      inviteCode: null,
      hasUnsavedChanges: true,
    );

    expect(clean.closeIntent, CreateEventWizardCloseIntent.close);
    expect(
      dirty.closeIntent,
      CreateEventWizardCloseIntent.confirmUnsavedChanges,
    );
    expect(clean.previousIntent, isNull);
  });

  test('CreateEventWizardReviewState gates only required sections', () {
    final now = DateTime(2026, 8, 19, 9);
    final review = CreateEventWizardReviewState.resolve(
      activeSteps: steps,
      name: 'Sunday social run',
      activityKind: ActivityKind.socialRun,
      customActivityLabel: '',
      distance: '5',
      pace: PaceLevel.moderate,
      externalBookingMode: false,
      externalEventUrl: '',
      hasStartingPoint: true,
      meetingPoint: 'Saket sports complex',
      scheduleState: CreateEventScheduleState(
        selectedDate: DateTime(2026, 8, 20),
        selectedStartTime: const TimeOfDay(hour: 7, minute: 0),
      ),
      now: now,
      capacity: '20',
      price: '0',
      currencyCode: 'INR',
      admissionPreset: EventAdmissionPreset.openCapacity,
      inviteCode: '',
      cohortCapsEnabled: false,
      maxMen: '',
      maxWomen: '',
      crossPathsPairInventoryEnabled: false,
      crossPathsPairCapacity: '2',
      dynamicPricingEnabled: false,
      dynamicPricingStep: '',
      dynamicPricingMax: '',
      minAge: '',
      maxAge: '',
    );

    expect(review.canSubmit, isTrue);
    expect(review.items.map((item) => item.status), [
      CatchFormStepListStatus.complete,
      CatchFormStepListStatus.complete,
      CatchFormStepListStatus.complete,
    ]);

    final missingName = CreateEventWizardReviewState.resolve(
      activeSteps: steps,
      name: '  ',
      activityKind: ActivityKind.socialRun,
      customActivityLabel: '',
      distance: '5',
      pace: PaceLevel.moderate,
      externalBookingMode: false,
      externalEventUrl: '',
      hasStartingPoint: true,
      meetingPoint: 'Saket sports complex',
      scheduleState: CreateEventScheduleState(
        selectedDate: DateTime(2026, 8, 20),
        selectedStartTime: const TimeOfDay(hour: 7, minute: 0),
      ),
      now: now,
      capacity: '20',
      price: '0',
      currencyCode: 'INR',
      admissionPreset: EventAdmissionPreset.openCapacity,
      inviteCode: '',
      cohortCapsEnabled: false,
      maxMen: '',
      maxWomen: '',
      crossPathsPairInventoryEnabled: false,
      crossPathsPairCapacity: '2',
      dynamicPricingEnabled: false,
      dynamicPricingStep: '',
      dynamicPricingMax: '',
      minAge: '',
      maxAge: '',
    );

    expect(missingName.canSubmit, isFalse);
    expect(
      missingName.items.first.status,
      CatchFormStepListStatus.needsInformation,
    );

    final incomplete = CreateEventWizardReviewState.resolve(
      activeSteps: steps,
      name: '',
      activityKind: ActivityKind.socialRun,
      customActivityLabel: '',
      distance: '',
      pace: null,
      externalBookingMode: false,
      externalEventUrl: '',
      hasStartingPoint: false,
      meetingPoint: '',
      scheduleState: const CreateEventScheduleState(
        selectedDate: null,
        selectedStartTime: null,
      ),
      now: now,
      capacity: '',
      price: '',
      currencyCode: 'INR',
      admissionPreset: EventAdmissionPreset.openCapacity,
      inviteCode: '',
      cohortCapsEnabled: false,
      maxMen: '',
      maxWomen: '',
      crossPathsPairInventoryEnabled: false,
      crossPathsPairCapacity: '2',
      dynamicPricingEnabled: false,
      dynamicPricingStep: '',
      dynamicPricingMax: '',
      minAge: '',
      maxAge: '',
    );

    expect(incomplete.canSubmit, isFalse);
    expect(incomplete.firstIncompleteStep, 0);
  });

  for (final scenario in [
    (
      name: 'requires roster reattachment',
      url: 'https://lu.ma/dinner',
      reattach: true,
      capacity: '20',
      ready: 20,
      valid: false,
    ),
    (
      name: 'rejects capacity below roster',
      url: '',
      reattach: false,
      capacity: '19',
      ready: 20,
      valid: false,
    ),
    (
      name: 'validates an optional source URL',
      url: 'http://lu.ma/dinner',
      reattach: false,
      capacity: '20',
      ready: 20,
      valid: false,
    ),
    (
      name: 'rejects capacity above the contract limit',
      url: '',
      reattach: false,
      capacity: '1001',
      ready: 20,
      valid: false,
    ),
    (
      name: 'accepts no roster and no source URL',
      url: '',
      reattach: false,
      capacity: '20',
      ready: null,
      valid: true,
    ),
    (
      name: 'accepts an attached capacity-matched roster',
      url: 'https://lu.ma/dinner',
      reattach: false,
      capacity: '20',
      ready: 20,
      valid: true,
    ),
  ]) {
    test('external event review ${scenario.name}', () {
      final review = CreateEventWizardReviewState.resolve(
        activeSteps: steps,
        name: 'Sunday dinner',
        activityKind: ActivityKind.dinner,
        customActivityLabel: '',
        distance: '',
        pace: null,
        externalBookingMode: true,
        externalEventUrl: scenario.url,
        rosterAttachmentRequired: scenario.reattach,
        hasStartingPoint: true,
        meetingPoint: 'Venue',
        scheduleState: CreateEventScheduleState(
          selectedDate: DateTime(2026, 8, 20),
          selectedStartTime: const TimeOfDay(hour: 19, minute: 0),
        ),
        now: DateTime(2026, 8, 19),
        capacity: scenario.capacity,
        rosterReadyCount: scenario.ready,
        price: '0',
        currencyCode: 'INR',
        admissionPreset: EventAdmissionPreset.openCapacity,
        inviteCode: '',
        cohortCapsEnabled: false,
        maxMen: '',
        maxWomen: '',
        crossPathsPairInventoryEnabled: false,
        crossPathsPairCapacity: '2',
        dynamicPricingEnabled: false,
        dynamicPricingStep: '',
        dynamicPricingMax: '',
        minAge: '',
        maxAge: '',
      );

      expect(review.canSubmit, scenario.valid);
      expect(review.firstIncompleteStep, scenario.valid ? null : 2);
    });
  }

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

  test('CreateEventScheduleState maps initial picker time', () {
    final today = DateTime(2026, 7);
    final sameDay = CreateEventScheduleState(
      selectedDate: today,
      selectedStartTime: null,
    );
    final futureDay = CreateEventScheduleState(
      selectedDate: today.add(const Duration(days: 1)),
      selectedStartTime: null,
    );

    expect(
      sameDay.initialStartTime(now: DateTime(2026, 7, 1, 9, 10)),
      const TimeOfDay(hour: 9, minute: 15),
    );
    expect(
      futureDay.initialStartTime(now: DateTime(2026, 7, 1, 9, 10)),
      const TimeOfDay(hour: 7, minute: 0),
    );
  });

  test('CreateEventScheduleState maps picker result transitions', () {
    final today = DateTime(2026, 7);
    final tomorrow = today.add(const Duration(days: 1));
    const selectedTime = TimeOfDay(hour: 9, minute: 0);
    final now = DateTime(2026, 7, 1, 9, 5);
    const state = CreateEventScheduleState(
      selectedDate: null,
      selectedStartTime: selectedTime,
    );

    final validFutureDate = state.selectDate(tomorrow, now: now);
    final invalidToday = state.selectDate(today, now: now);
    final invalidTime = CreateEventScheduleState(
      selectedDate: today,
      selectedStartTime: null,
    ).selectStartTime(selectedTime, now: now);
    final validTime = CreateEventScheduleState(
      selectedDate: today,
      selectedStartTime: null,
    ).selectStartTime(const TimeOfDay(hour: 9, minute: 30), now: now);

    expect(validFutureDate.selectedDate, tomorrow);
    expect(validFutureDate.selectedStartTime, selectedTime);
    expect(validFutureDate.dateText, '02/07/2026');
    expect(validFutureDate.startTimeText, '9:00 AM');
    expect(validFutureDate.errorText, isNull);
    expect(invalidToday.selectedDate, today);
    expect(invalidToday.selectedStartTime, isNull);
    expect(invalidToday.dateText, '01/07/2026');
    expect(invalidToday.startTimeText, isEmpty);
    expect(invalidToday.errorText, createEventFutureStartError);
    expect(invalidTime.selectedStartTime, isNull);
    expect(invalidTime.startTimeText, isEmpty);
    expect(invalidTime.errorText, createEventFutureStartError);
    expect(validTime.selectedStartTime, const TimeOfDay(hour: 9, minute: 30));
    expect(validTime.startTimeText, '9:30 AM');
    expect(validTime.errorText, isNull);
  });

  test('CreateEventScheduleState validates future start time', () {
    final today = DateTime(2026, 7);
    const pastTime = TimeOfDay(hour: 9, minute: 0);
    const futureTime = TimeOfDay(hour: 9, minute: 30);
    final missingTime = CreateEventScheduleState(
      selectedDate: today,
      selectedStartTime: null,
    );
    final past = CreateEventScheduleState(
      selectedDate: today,
      selectedStartTime: pastTime,
    );
    final future = CreateEventScheduleState(
      selectedDate: today,
      selectedStartTime: futureTime,
    );
    final now = DateTime(2026, 7, 1, 9, 5);

    expect(missingTime.selectedStartDateTime, isNull);
    expect(
      missingTime.validate(isScheduleStep: true, now: now).isValid,
      isFalse,
    );
    expect(
      missingTime.validate(isScheduleStep: true, now: now).errorText,
      isNull,
    );
    expect(past.selectedStartDateTime, DateTime(2026, 7, 1, 9));
    expect(past.errorText(now: now), createEventFutureStartError);
    expect(
      past.validate(isScheduleStep: true, now: now).errorText,
      createEventFutureStartError,
    );
    expect(future.errorText(now: now), isNull);
    expect(future.validate(isScheduleStep: true, now: now).isValid, isTrue);
    expect(past.validate(isScheduleStep: false, now: now).isValid, isTrue);
  });

  test('CreateEventScheduleState maps duration bounds and transitions', () {
    const minimum = CreateEventScheduleState(
      selectedDate: null,
      selectedStartTime: null,
      durationMinutes: BusinessRules.eventMinDurationMinutes,
    );
    const middle = CreateEventScheduleState(
      selectedDate: null,
      selectedStartTime: null,
    );
    const maximum = CreateEventScheduleState(
      selectedDate: null,
      selectedStartTime: null,
      durationMinutes: BusinessRules.eventMaxDurationMinutes,
    );

    expect(minimum.canDecreaseDuration, isFalse);
    expect(minimum.decreaseDuration(), same(minimum));
    expect(middle.canDecreaseDuration, isTrue);
    expect(middle.canIncreaseDuration, isTrue);
    expect(
      middle.decreaseDuration().durationMinutes,
      BusinessRules.eventDefaultDurationMinutes -
          BusinessRules.eventDurationStepMinutes,
    );
    expect(
      middle.increaseDuration().durationMinutes,
      BusinessRules.eventDefaultDurationMinutes +
          BusinessRules.eventDurationStepMinutes,
    );
    expect(maximum.canIncreaseDuration, isFalse);
    expect(maximum.increaseDuration(), same(maximum));
  });

  test('CreateEventPhotoDraftState caps, previews, removes, and reorders', () {
    final photoA = _pickedEventPhoto('a', 1);
    final photoB = _pickedEventPhoto('b', 2);
    final photoC = _pickedEventPhoto('c', 3);
    final photoD = _pickedEventPhoto('d', 4);

    final initial = CreateEventPhotoDraftState.fromPicked([
      photoA,
      photoB,
    ], maxPhotos: 3);
    final capped = initial.addPicked([photoC, photoD]);
    final removed = capped.removeAt(1);
    final reordered = removed.reorder(1, 0);

    expect(initial.remainingSlots, 1);
    expect(initial.signature, '0,1');
    expect(initial.previews.map((photo) => photo.id), [
      'picked_event_0',
      'picked_event_1',
    ]);
    expect(capped.photos.length, 3);
    expect(capped.remainingSlots, 0);
    expect(capped.signature, '0,1,2');
    expect(capped.pickedPhotos, [photoA, photoB, photoC]);
    expect(capped.addPicked([photoD]), same(capped));
    expect(removed.signature, '0,2');
    expect(removed.removeAt(-1), same(removed));
    expect(reordered.signature, '2,0');
    expect(reordered.reorder(0, 0), same(reordered));
  });

  test('CreateEventLocationState maps picker selection and payload', () {
    const empty = CreateEventLocationState();
    const deviceLocation = LocationCoordinate(19.076, 72.877);
    const pickedCoordinate = LocationCoordinate(19.043, 72.818);

    final selection = empty.selectLocation(
      coordinate: pickedCoordinate,
      displayName: ' Bandstand Steps ',
      address: ' Bandra Bandstand ',
      placeId: ' place-1 ',
    );
    final selected = selection.state;
    final payload = selected.meetingLocation(
      meetingPoint: ' Bandstand Steps ',
      notes: ' Meet near the steps ',
    );

    expect(empty.initialCenter(deviceLocation), deviceLocation);
    expect(empty.initialLabel(meetingPoint: 'Bandstand'), isNull);
    expect(selection.meetingPointText, 'Bandstand Steps');
    expect(selected.startingPoint, pickedCoordinate);
    expect(selected.meetingLocationAddress, 'Bandra Bandstand');
    expect(selected.meetingLocationPlaceId, 'place-1');
    expect(selected.initialCenter(deviceLocation), pickedCoordinate);
    expect(
      selected.initialLabel(meetingPoint: ' Bandstand Steps '),
      'Bandstand Steps',
    );
    expect(payload?.name, 'Bandstand Steps');
    expect(payload?.address, 'Bandra Bandstand');
    expect(payload?.placeId, 'place-1');
    expect(payload?.latitude, pickedCoordinate.latitude);
    expect(payload?.longitude, pickedCoordinate.longitude);
    expect(payload?.notes, 'Meet near the steps');
    expect(selected.meetingLocation(meetingPoint: ' ', notes: null), isNull);
  });

  test('CreateEventDraftActionState maps dirty state and save policy', () {
    const cleanNewDraft = CreateEventDraftActionState(
      activeDraftId: null,
      initialDraftContentSignature: 'initial',
      lastSavedDraftSignature: null,
      currentDraftContentSignature: 'initial',
    );
    const dirtyNewDraft = CreateEventDraftActionState(
      activeDraftId: null,
      initialDraftContentSignature: 'initial',
      lastSavedDraftSignature: null,
      currentDraftContentSignature: 'changed',
    );
    const cleanExistingDraft = CreateEventDraftActionState(
      activeDraftId: 'draft-1',
      initialDraftContentSignature: 'initial',
      lastSavedDraftSignature: 'saved',
      currentDraftContentSignature: 'saved',
    );
    const dirtyExistingDraft = CreateEventDraftActionState(
      activeDraftId: 'draft-1',
      initialDraftContentSignature: 'initial',
      lastSavedDraftSignature: 'saved',
      currentDraftContentSignature: 'changed',
    );
    final now = DateTime(2026, 7);

    expect(cleanNewDraft.hasUnsavedChanges, isFalse);
    expect(cleanNewDraft.isUpdatingDraft, isFalse);
    expect(cleanNewDraft.saveSuccessMessage, 'Draft saved');
    expect(
      cleanNewDraft.draftIdForSave(now: now),
      now.millisecondsSinceEpoch.toString(),
    );
    expect(dirtyNewDraft.hasUnsavedChanges, isTrue);
    expect(cleanExistingDraft.hasUnsavedChanges, isFalse);
    expect(cleanExistingDraft.isUpdatingDraft, isTrue);
    expect(cleanExistingDraft.saveSuccessMessage, 'Draft updated');
    expect(cleanExistingDraft.draftIdForSave(now: now), 'draft-1');
    expect(dirtyExistingDraft.hasUnsavedChanges, isTrue);
  });

  test('CreateEventDraftSideEffectState maps load and delete intents', () {
    const unchecked = CreateEventDraftSideEffectState(
      hasCheckedDrafts: false,
      activeDraftId: null,
    );
    const checkedWithDraft = CreateEventDraftSideEffectState(
      hasCheckedDrafts: true,
      activeDraftId: 'draft-1',
    );
    final draft = EventDraft(
      id: 'picker-draft',
      clubId: 'club-1',
      savedAt: DateTime(2026, 7),
    );

    expect(unchecked.shouldLoadDrafts, isTrue);
    expect(unchecked.shouldShowDraftPicker(const []), isFalse);
    expect(unchecked.deleteAfterSuccessfulSubmitIntent, isNull);
    expect(checkedWithDraft.shouldLoadDrafts, isFalse);
    expect(checkedWithDraft.shouldShowDraftPicker([draft]), isTrue);

    final submitDelete = checkedWithDraft.deleteAfterSuccessfulSubmitIntent;
    final pickerDelete = checkedWithDraft.deleteFromPickerIntent(draft);

    expect(submitDelete?.draftId, 'draft-1');
    expect(submitDelete?.reason, CreateEventDraftDeleteReason.successfulSubmit);
    expect(pickerDelete.draftId, 'picker-draft');
    expect(pickerDelete.reason, CreateEventDraftDeleteReason.picker);
  });

  test('CreateEventDraftRestoreState maps draft fields and stale values', () {
    const eventSuccessDefaults = EventSuccessDefaults(
      enabled: true,
      attendeePrompt: 'Ask what brought them here.',
    );
    final selectedDate = DateTime(2026, 7);
    final draft = EventDraft(
      id: 'draft-restore',
      clubId: 'club-1',
      savedAt: DateTime(2026, 6, 30),
      distance: '5',
      capacity: '24',
      price: '10',
      description: 'Sunset social run',
      activityKind: 'openActivity',
      customActivityLabel: 'Trail loop',
      interactionModel: 'unknown-model',
      paceName: 'unknown-pace',
      routePlan: RouteEventPlan.customWalk.toJson(),
      meetingPoint: 'Bandstand',
      locationDetails: 'Meet by the steps',
      meetingLocationAddress: 'Bandra Bandstand',
      meetingLocationPlaceId: 'place-1',
      startingPointLat: 19.043,
      startingPointLng: 72.818,
      selectedDateMillis: selectedDate.millisecondsSinceEpoch,
      selectedStartHour: 18,
      selectedStartMinute: 30,
      durationMinutes: 90,
      minAge: '24',
      maxAge: '34',
      maxMen: '12',
      maxWomen: '12',
      admissionPreset: 'fixedCohortCaps',
      inviteCode: 'SUNSET',
      dynamicPricingEnabled: true,
      dynamicPricingStep: '5',
      dynamicPricingMax: '25',
      cancellationPolicy: 'flexible',
      crossPathsPairInventoryEnabled: true,
      crossPathsPairCapacity: '4',
      eventSuccessDefaults: eventSuccessDefaults,
    );

    final state = CreateEventDraftRestoreState.fromDraft(
      draft,
      now: DateTime(2026, 7),
    );

    expect(state.distanceText, '5');
    expect(state.capacityText, '24');
    expect(state.priceText, '10');
    expect(state.descriptionText, 'Sunset social run');
    expect(state.activityKind, ActivityKind.openActivity);
    expect(state.customActivityLabelText, 'Trail loop');
    expect(
      state.interactionModel,
      ActivityKind.openActivity.defaultInteractionModel,
    );
    expect(state.pace, isNull);
    expect(state.routePlan, RouteEventPlan.customWalk);
    expect(state.meetingPointText, 'Bandstand');
    expect(state.locationDetailsText, 'Meet by the steps');
    expect(state.locationState.startingPoint?.latitude, 19.043);
    expect(state.locationState.startingPoint?.longitude, 72.818);
    expect(state.locationState.meetingLocationAddress, 'Bandra Bandstand');
    expect(state.locationState.meetingLocationPlaceId, 'place-1');
    expect(state.selectedDate, selectedDate);
    expect(state.selectedStartTime, const TimeOfDay(hour: 18, minute: 30));
    expect(state.dateText, '01/07/2026');
    expect(state.startTimeText, '6:30 PM');
    expect(state.durationMinutes, 90);
    expect(state.scheduleErrorText, isNull);
    expect(state.minAgeText, '24');
    expect(state.maxAgeText, '34');
    expect(state.maxMenText, '12');
    expect(state.maxWomenText, '12');
    expect(state.inviteCodeText, 'SUNSET');
    expect(state.dynamicPricingStepText, '5');
    expect(state.dynamicPricingMaxText, '25');
    expect(state.policyState.cohortCapsEnabled, isTrue);
    expect(state.policyState.dynamicPricingEnabled, isTrue);
    expect(state.policyState.cancellationPolicyId.name, 'flexible');
    expect(state.policyState.crossPathsPairInventoryEnabled, isTrue);
    expect(state.crossPathsPairCapacityText, '4');
    expect(state.eventSuccessDefaults, eventSuccessDefaults);
  });

  test('CreateEventDraftRestoreState marks restored past schedule invalid', () {
    final draft = EventDraft(
      id: 'draft-past-schedule',
      clubId: 'club-1',
      savedAt: DateTime(2026, 6, 30),
      selectedDateMillis: DateTime(2026, 7).millisecondsSinceEpoch,
      selectedStartHour: 8,
      selectedStartMinute: 0,
    );

    final state = CreateEventDraftRestoreState.fromDraft(
      draft,
      now: DateTime(2026, 7, 1, 9),
    );

    expect(state.scheduleErrorText, createEventFutureStartError);
  });

  test('CreateEventDraftSnapshot maps serializable draft fields', () {
    final savedAt = DateTime(2026, 7);
    const eventSuccessDefaults = EventSuccessDefaults(
      enabled: true,
      attendeePrompt: 'Ask about the route.',
    );
    const snapshot = CreateEventDraftSnapshot(
      distance: '5',
      capacity: '24',
      price: '10',
      description: 'Sunset social run',
      externalBookingMode: true,
      externalBookingProvider: 'luma',
      externalEventUrl: 'https://lu.ma/sunset',
      externalEventId: 'sunset',
      runtimeWalkInPolicy: 'hostApproval',
      rosterFileName: 'guests.csv',
      rosterFileFingerprint: 'abc123',
      rosterReadyCount: 24,
      activityKind: 'socialRun',
      customActivityLabel: 'Trail loop',
      interactionModel: 'paired',
      paceName: 'easy',
      routePlan: RouteEventPlan.socialRun,
      meetingPoint: 'Bandstand',
      locationDetails: 'Meet by the steps',
      meetingLocationAddress: 'Bandra Bandstand',
      meetingLocationPlaceId: 'place-1',
      startingPointLat: 19.043,
      startingPointLng: 72.818,
      selectedDateMillis: 1782864000000,
      selectedStartHour: 18,
      selectedStartMinute: 30,
      durationMinutes: 90,
      minAge: '24',
      maxAge: '34',
      maxMen: '12',
      maxWomen: '12',
      cohortCapsEnabled: true,
      admissionPreset: 'fixedCohortCaps',
      inviteCode: 'SUNSET',
      dynamicPricingEnabled: true,
      dynamicPricingStep: '5',
      dynamicPricingMax: '25',
      cancellationPolicy: 'flexible',
      crossPathsPairInventoryEnabled: true,
      crossPathsPairCapacity: '4',
      eventSuccessDefaults: eventSuccessDefaults,
      eventPhotoIds: 'photo-1,photo-2',
    );

    final draft = snapshot.toDraft(
      id: 'draft-1',
      clubId: 'club-1',
      savedAt: savedAt,
    );

    expect(draft.id, 'draft-1');
    expect(draft.clubId, 'club-1');
    expect(draft.savedAt, savedAt);
    expect(draft.distance, '5');
    expect(draft.capacity, '24');
    expect(draft.price, '10');
    expect(draft.description, 'Sunset social run');
    expect(draft.externalBookingMode, isTrue);
    expect(draft.externalBookingProvider, 'luma');
    expect(draft.externalEventUrl, 'https://lu.ma/sunset');
    expect(draft.externalEventId, 'sunset');
    expect(draft.runtimeWalkInPolicy, 'hostApproval');
    expect(draft.rosterFileName, 'guests.csv');
    expect(draft.rosterFileFingerprint, 'abc123');
    expect(draft.rosterReadyCount, 24);
    expect(draft.activityKind, 'socialRun');
    expect(draft.customActivityLabel, 'Trail loop');
    expect(draft.interactionModel, 'paired');
    expect(draft.paceName, 'easy');
    expect(
      RouteEventPlan.tryFromJson(draft.routePlan),
      RouteEventPlan.socialRun,
    );
    expect(draft.meetingPoint, 'Bandstand');
    expect(draft.locationDetails, 'Meet by the steps');
    expect(draft.meetingLocationAddress, 'Bandra Bandstand');
    expect(draft.meetingLocationPlaceId, 'place-1');
    expect(draft.startingPointLat, 19.043);
    expect(draft.startingPointLng, 72.818);
    expect(draft.selectedDateMillis, 1782864000000);
    expect(draft.selectedStartHour, 18);
    expect(draft.selectedStartMinute, 30);
    expect(draft.durationMinutes, 90);
    expect(draft.minAge, '24');
    expect(draft.maxAge, '34');
    expect(draft.maxMen, '12');
    expect(draft.maxWomen, '12');
    expect(draft.admissionPreset, 'fixedCohortCaps');
    expect(draft.inviteCode, 'SUNSET');
    expect(draft.dynamicPricingEnabled, isTrue);
    expect(draft.dynamicPricingStep, '5');
    expect(draft.dynamicPricingMax, '25');
    expect(draft.cancellationPolicy, 'flexible');
    expect(draft.crossPathsPairInventoryEnabled, isTrue);
    expect(draft.crossPathsPairCapacity, '4');
    expect(draft.eventSuccessDefaults, eventSuccessDefaults);
  });

  _registerCreateEventDraftSignatureTests();
}

PickedEventPhoto _pickedEventPhoto(String name, int byte) {
  final bytes = Uint8List.fromList([byte]);
  return PickedEventPhoto(
    image: XFile.fromData(bytes, name: '$name.jpg'),
    bytes: bytes,
  );
}
