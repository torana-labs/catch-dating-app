import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_repository.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_details_repository.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_preferences_repository.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_setup_repository.dart';
import 'package:catch_dating_app/contexts/events/data/read_models/host_event_setup_default_view_reads.dart';
import 'package:catch_dating_app/contexts/events/domain/event_constraints.dart';
import 'package:catch_dating_app/contexts/events/domain/event_draft.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy_defaults.dart';
import 'package:catch_dating_app/contexts/events/domain/manager_event_setup_preferences.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_host_defaults.dart';
import 'package:catch_dating_app/hosts/create/create_controller.dart';
import 'package:catch_dating_app/hosts/create/create_flow_state.dart';
import 'package:catch_dating_app/hosts/create/create_policy_values.dart';
import 'package:catch_dating_app/hosts/create/edit_event_values.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_policy_state.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_prefill.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/event_publication_controller.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/private_event_details_controller.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/private_event_preferences_controller.dart';
import 'package:catch_test_support/events_test_helpers.dart' as events;
import 'package:catch_test_support/organizers_test_helpers.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

final _hash = 'a' * 64;

final _defaults = ManagerEventSetupDefaults(
  organizerId: 'club-1',
  cityId: 'in-mh-mumbai',
  marketId: 'in-mh-mumbai',
  timezone: 'Asia/Kolkata',
  organizerDefaultsRevision: 1,
  basicsReviewedHash: _hash,
  preferencesRevision: 1,
  preferences: const ManagerEventSetupPreferences(),
  preferencesHash: _hash,
  reviewedDefaultsHash: _hash,
);

/// The private event a step reads, open for every setup command.
const _summary = PrivateEventBasicSummary(
  eventId: 'event-1',
  organizerId: 'club-1',
  setupRevision: 2,
  name: 'Tuesday Trivia Night',
  city: EventSetupCity(cityId: 'in-mh-mumbai', marketId: 'in-mh-mumbai'),
  localDate: '2026-12-01',
  localStartTime: '19:30',
  timezone: 'Asia/Kolkata',
  startTimeMillis: 1796139000000,
  status: 'active',
  setupDefaults: <String, Object?>{},
  detailsConfigured: false,
  eventPreferences: null,
  canEditBasics: true,
);

/// Ready at once; records each details patch.
class _FakeDetails extends PrivateEventDetailsController {
  _FakeDetails(this.patches);
  final List<PrivateEventDetailsPatch> patches;

  @override
  PrivateEventDetailsState build(PrivateEventDetailsScope scope) =>
      PrivateEventDetailsState(event: _summary, defaults: _defaults);

  @override
  Future<void> load() async {}

  @override
  Future<void> save(PrivateEventDetailsPatch details) async =>
      patches.add(details);
}

/// Ready at once; records each preferences command.
class _FakePreferences extends PrivateEventPreferencesController {
  _FakePreferences(this.saved);
  final List<PrivateEventPreferenceIntents> saved;

  @override
  EventPreferencesEditorState build(EventEditorScope scope) =>
      EventPreferencesEditorState(event: _summary, defaults: _defaults);

  @override
  Future<void> load() async {}

  @override
  Future<void> save(PrivateEventPreferenceIntents intents) async =>
      saved.add(intents);
}

class _FakePublication extends EventPublicationController {
  @override
  EventPublicationState build(EventEditorScope scope) =>
      const EventPublicationState();

  @override
  Future<void> load() async {}
}

class _NoDefaults extends HostEventSetupDefaultViewReads {
  _NoDefaults() : super(FakeFirebaseFirestore());

  @override
  Stream<ManagerEventSetupDefaultsView> watch(String organizerId) =>
      Stream.error(StateError('no defaults view'));
}

/// A draft whose event already exists, filled up to the tickets step.
EventDraft _savedDraft(EventDraft Function(EventDraft) change) => change(
  EventDraft(
    id: 'draft-1',
    organizerId: 'club-1',
    savedAt: DateTime(2026, 11, 27),
    name: 'Tuesday Trivia Night',
    activityKind: 'pubQuiz',
    eventLocalDate: '2026-12-01',
    eventLocalStartTime: '19:30',
    price: '499',
    capacity: '24',
    eventCreateReceiptEventId: 'event-1',
  ),
);

void main() {
  late List<PrivateEventDetailsPatch> patches;
  late List<PrivateEventPreferenceIntents> preferences;
  late ProviderContainer container;

  setUp(() {
    patches = [];
    preferences = [];
    container = ProviderContainer(
      overrides: [
        hostEventSetupDefaultViewReadsProvider.overrideWithValue(_NoDefaults()),
        privateEventDetailsControllerProvider.overrideWith2(
          (_) => _FakeDetails(patches),
        ),
        privateEventPreferencesControllerProvider.overrideWith2(
          (_) => _FakePreferences(preferences),
        ),
        eventPublicationControllerProvider.overrideWith2(
          (_) => _FakePublication(),
        ),
      ],
    );
    addTearDown(container.dispose);
  });

  CreateFlowArgs start(CreateFlowArgs args) {
    container.listen(createControllerProvider(args), (_, _) {});
    return args;
  }

  CreateController controller(CreateFlowArgs args) =>
      container.read(createControllerProvider(args).notifier);
  CreateFlowState state(CreateFlowArgs args) =>
      container.read(createControllerProvider(args));

  /// Lets the setup views' subscriptions open.
  Future<void> settle() => flushTestEventQueue();

  CreateFlowArgs args({
    EventDraft? draft,
    String? savedEventId,
    CreateEventPrefill? prefill,
    OrganizerHostDefaults? hostDefaults,
  }) => start(
    CreateFlowArgs(
      organizer: buildOrganizer(
        locationCityId: 'in-mh-mumbai',
        locationMarketId: 'in-mh-mumbai',
      ).copyWith(hostDefaults: hostDefaults ?? const OrganizerHostDefaults()),
      userId: 'host-1',
      initialDraft: draft,
      initialSavedEventId: savedEventId,
      initialPrefill: prefill,
    ),
  );

  group('the tickets step', () {
    test('sends the policy, the limits and the invite code', () async {
      final flow = args(
        draft: _savedDraft(
          (draft) => draft.copyWith(
            admissionPreset: EventAdmissionPreset.inviteOnly.name,
            inviteCode: ' LANTERN ',
            minAge: '21',
            maxAge: '35',
            cancellationPolicy: 'flexible',
          ),
        ),
      );
      await settle();
      controller(flow).goTo(CreateStep.tickets);
      await controller(flow).next();

      expect(state(flow).error, isNull);
      expect(state(flow).step, CreateStep.plan);
      final terms = patches.single.admissionTerms!;
      expect(terms.capacityLimit, 24);
      expect(terms.priceInPaise, 49900);
      expect(terms.cancellationPolicyId, 'flexible');
      expect(terms.inviteCode, 'LANTERN');
      expect(terms.constraints, {
        'minAge': 21,
        'maxAge': 35,
        'maxMen': null,
        'maxWomen': null,
      });
      final policy = EventPolicyBundle.fromJson(terms.eventPolicy!);
      expect(policy.usesInviteOnly, isTrue);
      expect(policy.cancellationPolicy.id, EventCancellationPolicyId.flexible);
      expect(policy.admissionPolicy.capacityLimit, 24);
      expect(terms.toJson()['privateAccess'], {'inviteCode': 'LANTERN'});

      final intents = preferences.single;
      expect(intents.admissionPreset.value, 'inviteOnly');
      expect(intents.bookingMode?.value, 'anyone');
    });

    test('a request-to-join format asks first, or publishing would open '
        'it', () async {
      final flow = args(
        draft: _savedDraft(
          (draft) => draft.copyWith(
            admissionPreset:
                EventAdmissionPreset.requestToJoinMembersExempt.name,
          ),
        ),
      );
      await settle();
      controller(flow).goTo(CreateStep.tickets);
      await controller(flow).next();

      final policy = EventPolicyBundle.fromJson(
        patches.single.admissionTerms!.eventPolicy!,
      );
      expect(policy.admissionPolicy.manualApprovalRequired, isTrue);
      expect(policy.admissionPolicy.approvedMembersSkipReview, isTrue);
      final intents = preferences.single;
      // The preferences command takes no request-to-join preset.
      expect(intents.admissionPreset.value, 'openCapacity');
      expect(intents.bookingMode?.value, 'askFirst');
    });

    test('cohort caps save as their own preset with the caps', () async {
      final flow = args(
        draft: _savedDraft(
          (draft) => draft.copyWith(
            admissionPreset: editFixedCohortCapsPreset,
            maxMen: '10',
            maxWomen: '12',
          ),
        ),
      );
      await settle();
      controller(flow).goTo(CreateStep.tickets);
      await controller(flow).next();

      final terms = patches.single.admissionTerms!;
      expect(terms.constraints?['maxMen'], 10);
      expect(terms.constraints?['maxWomen'], 12);
      expect(preferences.single.admissionPreset.value, 'fixedCohortCaps');
    });

    test('does not move on with a bad code, caps or demand pricing', () async {
      final flow = args(
        draft: _savedDraft(
          (draft) => draft.copyWith(
            admissionPreset: EventAdmissionPreset.inviteOnly.name,
            inviteCode: 'AB',
          ),
        ),
      );
      await settle();
      controller(flow).goTo(CreateStep.tickets);
      await controller(flow).next();
      expect(state(flow).problems, {CreateProblem.inviteCode});
      expect(state(flow).step, CreateStep.tickets);

      controller(flow)
        ..setCohortCaps(true)
        ..policyHandlers.onMaxMen('0');
      await controller(flow).next();
      expect(state(flow).problems, {CreateProblem.cohortCaps});

      controller(flow)
        ..setAdmission(EventAdmissionPreset.balancedSingles)
        ..setDemandPricing(true)
        ..policyHandlers.onDemandStep('');
      await controller(flow).next();
      expect(state(flow).problems, {CreateProblem.demandPricing});
      expect(patches, isEmpty);
    });
  });

  group('resuming a saved event', () {
    test('keeps its saved policy until the host changes it', () async {
      final flow = args(savedEventId: 'event-1');
      await settle();
      expect(state(flow).loadingSaved, isFalse);
      controller(flow)
        ..edit((draft) => draft.copyWith(price: '499'))
        ..goTo(CreateStep.tickets);
      await controller(flow).next();

      final untouched = patches.single.admissionTerms!;
      expect(untouched.eventPolicy, isNull);
      expect(untouched.constraints, isNull);
      expect(untouched.inviteCode, isNull);

      controller(flow)
        ..goTo(CreateStep.tickets)
        ..setCancellationPolicy(EventCancellationPolicyId.strict);
      await controller(flow).next();
      final changed = patches.last.admissionTerms!;
      expect(changed.eventPolicy, isNotNull);
      expect(changed.cancellationPolicyId, 'strict');
    });

    test(
      'lets an invite-only code stay empty for the backend to keep',
      () async {
        final flow = args(savedEventId: 'event-1');
        await settle();
        controller(flow)
          ..edit((draft) => draft.copyWith(price: '0'))
          ..goTo(CreateStep.tickets)
          ..setAdmission(EventAdmissionPreset.inviteOnly);
        await controller(flow).next();

        expect(state(flow).problems, isEmpty);
        final terms = patches.single.admissionTerms!;
        expect(terms.inviteCode, isNull);
        expect(terms.cancellationPolicyId, 'notApplicable');
        expect(
          EventPolicyBundle.fromJson(terms.eventPolicy!).usesInviteOnly,
          isTrue,
        );
      },
    );
  });

  group('prefill', () {
    test("a fresh draft starts from the organizer's policy defaults", () {
      final flow = args(
        hostDefaults: const OrganizerHostDefaults(
          eventPolicy: EventPolicyDefaults(
            admissionPreset: EventAdmissionDefaultPreset.fixedCohortCaps,
            minAge: 21,
            maxAge: 40,
            maxMen: 10,
            maxWomen: 12,
            cancellationPolicyId: EventCancellationPolicyId.strict,
          ),
        ),
      );
      final draft = state(flow).draft;
      expect(draft.admissionPreset, editFixedCohortCapsPreset);
      expect(draft.minAge, '21');
      expect(draft.maxAge, '40');
      expect(draft.maxMen, '10');
      expect(draft.maxWomen, '12');
      expect(draft.cancellationPolicy, 'strict');
    });

    test('demand pricing defaults fill in rupees', () {
      final flow = args(
        hostDefaults: const OrganizerHostDefaults(
          eventPolicy: EventPolicyDefaults(
            admissionPreset: EventAdmissionDefaultPreset.balancedSingles,
            dynamicPricingEnabled: true,
            dynamicPricingStepInPaise: 25000,
            dynamicPricingMaxInPaise: 150000,
          ),
        ),
      );
      final draft = state(flow).draft;
      expect(draft.admissionPreset, 'balancedSingles');
      expect(draft.dynamicPricingEnabled, isTrue);
      expect(draft.dynamicPricingStep, '250');
      expect(draft.dynamicPricingMax, '1500');
    });

    test('a saved event is not refilled from the defaults', () {
      final flow = args(
        savedEventId: 'event-1',
        hostDefaults: const OrganizerHostDefaults(
          eventPolicy: EventPolicyDefaults(minAge: 30),
        ),
      );
      expect(state(flow).draft.minAge, isNull);
    });

    test('repeating an event carries its terms but not its code', () {
      final source = events.buildEvent(
        name: 'Tuesday Trivia Night',
        capacityLimit: 24,
        priceInPaise: 49900,
        constraints: const EventConstraints(minAge: 21, maxAge: 35),
        eventPolicy: EventPolicyBundle.balancedSinglesEvent(
          capacityLimit: 24,
          basePriceInPaise: 49900,
          cancellationPolicy: const EventCancellationPolicy.flexible(),
        ),
      );
      final flow = args(
        prefill: CreateEventPrefill.repeat(
          event: source,
          createdAt: DateTime(2026, 11, 27),
        ),
        // A repeat keeps its own terms over the organizer's defaults.
        hostDefaults: const OrganizerHostDefaults(
          eventPolicy: EventPolicyDefaults(minAge: 30),
        ),
      );
      final draft = state(flow).draft;
      expect(draft.admissionPreset, 'balancedSingles');
      expect(draft.minAge, '21');
      expect(draft.maxAge, '35');
      expect(draft.cancellationPolicy, 'flexible');
      expect(draft.inviteCode, isNull);

      final terms = createAdmissionTerms(
        draft,
        refundPolicy: 'standard',
        includePolicy: true,
      );
      expect(terms.cancellationPolicyId, 'flexible');
      expect(terms.constraints?['minAge'], 21);
      expect(
        EventPolicyBundle.fromJson(terms.eventPolicy!).usesBalancedRatio,
        isTrue,
      );
    });
  });
}
