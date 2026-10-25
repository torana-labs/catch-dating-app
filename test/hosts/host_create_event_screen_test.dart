import 'dart:async';

import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/auth/data/auth_repository.dart';
import 'package:catch_dating_app/clubs/data/clubs_repository.dart';
import 'package:catch_dating_app/clubs/domain/club.dart';
import 'package:catch_dating_app/clubs/domain/club_host_defaults.dart';
import 'package:catch_dating_app/core/persistence/command_journal_provider.dart';
import 'package:catch_dating_app/core/persistence/command_journal_storage.dart';
import 'package:catch_dating_app/core/persistence/memory_command_journal_storage.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_overlay.dart';
import 'package:catch_dating_app/core/theme/activity_palette.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/event_policies/domain/event_policy.dart';
import 'package:catch_dating_app/event_success/data/event_success_repository.dart';
import 'package:catch_dating_app/event_success/domain/event_success_defaults.dart';
import 'package:catch_dating_app/event_success/domain/event_success_plan.dart';
import 'package:catch_dating_app/events/data/event_attendee_repository.dart';
import 'package:catch_dating_app/events/data/event_draft_repository.dart';
import 'package:catch_dating_app/events/data/event_participation_repository.dart';
import 'package:catch_dating_app/events/data/event_repository.dart';
import 'package:catch_dating_app/events/data/organizer_event_venue_repository.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/events/domain/event_attendee.dart';
import 'package:catch_dating_app/events/domain/event_draft.dart';
import 'package:catch_dating_app/events/domain/event_participation.dart';
import 'package:catch_dating_app/events/domain/event_private_access.dart';
import 'package:catch_dating_app/events/domain/event_public_details.dart';
import 'package:catch_dating_app/events/domain/organizer_event_venue.dart';
import 'package:catch_dating_app/events/domain/route_event_plan.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/exceptions/error_logger.dart';
import 'package:catch_dating_app/hosts/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/hosts/data/event_photo_recovery_journal.dart';
import 'package:catch_dating_app/hosts/domain/crm/host_event_roster_insights.dart';
import 'package:catch_dating_app/hosts/domain/event_photo_recovery.dart';
import 'package:catch_dating_app/hosts/domain/host_roster_import.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_controller.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_form_keys.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_prefill.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_schedule_state.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_screen.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_success_screen.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/private_event_create_screen.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/host_create_event_screen.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_manage_screen.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_manage_screen_state.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_event_participants_section.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_event_roster_section.dart';
import 'package:catch_dating_app/image_uploads/data/image_upload_repository.dart';
import 'package:catch_dating_app/locations/data/places_repository.dart';
import 'package:catch_dating_app/locations/domain/location_coordinate.dart';
import 'package:catch_dating_app/public_profile/data/public_profile_repository.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart' as gmaps;
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../clubs/clubs_test_helpers.dart' show FakeImageUploadRepository;
import '../events/events_test_helpers.dart';
import '../test_pump_helpers.dart';
import 'host_control_room_test_helpers.dart';

part 'host_manage_from_create_event_tests.dart';
part 'host_create_event_lifecycle_tests.dart';
part 'host_create_event_format_tests.dart';
part 'host_create_event_saved_venue_tests.dart';
part 'host_create_event_interaction_test_helpers.dart';
part 'host_create_event_wizard_flow_tests.dart';

void main() {
  group('CreateEventScreen', () {
    setUp(() {
      SharedPreferences.setMockInitialValues({});
    });

    runEventPhotoRecoveryUITests();
    _registerCreateEventWizardFlowTests();
    _registerCreateEventSavedVenueTests();

    testWidgets(
      'basics disclosures start collapsed, share one accordion, and color activity chips',
      (tester) async {
        await _pumpCreateEventFlow(tester);
        await _openCreateEventFlow(tester);
        expect(
          find.byWidgetPredicate(
            (widget) => widget is CatchChip && widget.mode != null,
          ),
          findsNothing,
        );
        await _openCatchField(tester, 'Activity type');
        final walking = tester.widget<CatchChip>(
          find.byWidgetPredicate(
            (widget) =>
                widget is CatchChip &&
                widget.mode != null &&
                widget.label == 'Walking',
          ),
        );
        final socialRun = tester.widget<CatchChip>(
          find.byWidgetPredicate(
            (widget) =>
                widget is CatchChip &&
                widget.mode != null &&
                widget.label == 'Social run',
          ),
        );
        final context = tester.element(find.text('Activity type'));
        expect(
          walking.accent,
          ActivityPalette.resolve(context, ActivityKind.walking).accent,
        );
        expect(
          socialRun.accent,
          ActivityPalette.resolve(context, ActivityKind.socialRun).accent,
        );
        await _openCatchField(tester, 'Pace level');
        expect(
          find.byWidgetPredicate(
            (widget) =>
                widget is CatchChip &&
                widget.mode != null &&
                widget.label == 'Walking',
          ),
          findsNothing,
        );
        expect(
          find.byWidgetPredicate(
            (widget) =>
                widget is CatchChip &&
                widget.mode != null &&
                widget.label == 'Moderate',
          ),
          findsOneWidget,
        );
      },
    );

    runHostCreateEventFormatTests();

    testWidgets('route blocks users outside the club host team', (
      tester,
    ) async {
      await pumpEventsTestApp(
        tester,
        HostCreateEventRouteScreen(clubId: 'club-1', initialClub: buildClub()),
      );
      await tester.pump();
      expect(find.text('Host access required'), findsOneWidget);
      expect(
        find.text(
          "Only this organizer's host team can create events for this organizer.",
        ),
        findsOneWidget,
      );
      expect(find.text('Event basics'), findsNothing);
    });

    testWidgets(
      'route hydrates the private create flow from initial club extra',
      (tester) async {
        final initialClub = buildClub(
          id: 'club-extra',
          name: 'Extra Hydration Club',
        );

        await pumpEventsTestApp(
          tester,
          HostCreateEventRouteScreen(
            clubId: initialClub.id,
            initialClub: initialClub,
          ),
          overrides: [
            fetchClubProvider(
              initialClub.id,
            ).overrideWithValue(const AsyncLoading<Club?>()),
          ],
          signedInUid: 'host-1',
        );
        await _pumpTestAnimation(tester);

        expect(find.byType(PrivateEventCreateScreen), findsOneWidget);
        expect(find.text('Loading club'), findsNothing);
        expect(find.text('Host access required'), findsNothing);
      },
    );

    testWidgets('route rejects an initial club that disagrees with its path', (
      tester,
    ) async {
      await pumpEventsTestApp(
        tester,
        HostCreateEventRouteScreen(
          clubId: 'path-club',
          initialClub: buildClub(id: 'extra-club'),
        ),
        signedInUid: 'host-1',
      );
      await tester.pump();

      expect(find.text('Event setup unavailable'), findsOneWidget);
      expect(
        find.text('That organizer does not match this event route.'),
        findsOneWidget,
      );
      expect(find.text('Event basics'), findsNothing);
    });

    testWidgets(
      'walks through the wizard, validates rules, submits, and pops',
      (tester) async {
        final fakeEventRepository = FakeEventRepository();
        await _pumpCreateEventFlow(
          tester,
          overrides: [
            eventRepositoryProvider.overrideWith((ref) => fakeEventRepository),
          ],
        );
        await _openCreateEventFlow(tester);

        expect(find.byType(CatchSection), findsWidgets);
        expect(
          find.byWidgetPredicate(
            (widget) => widget is CatchChip && widget.mode != null,
          ),
          findsNothing,
        );
        await _fillBasicsStep(tester);
        await _enterCreateEventText(
          tester,
          CreateEventFormKeys.accessibility,
          'Step-free entrance',
        );
        await _enterCreateEventText(
          tester,
          CreateEventFormKeys.included,
          'Water and a guide',
        );
        expect(
          find.byWidgetPredicate(
            (widget) =>
                widget is CatchField &&
                widget.title == 'Pace level' &&
                widget.body == 'Moderate',
          ),
          findsOneWidget,
        );

        await _tapPrimaryButton(tester, 'Next');
        await _pumpTestAnimation(tester);

        await _enterCreateEventText(
          tester,
          CreateEventFormKeys.meetingPoint,
          'Bandra Fort',
        );
        await _pickMapPoint(tester);
        await _enterCreateEventText(
          tester,
          CreateEventFormKeys.locationDetails,
          'Meet at the gate',
        );
        await _pumpTestAnimation(tester);
        await _pumpTestAnimation(tester);

        await _pickFutureDate(tester);
        await acceptInitialTime(tester);
        await _openCatchField(tester, 'Duration');
        await tester.tap(find.byTooltip('Increase duration'));
        await tester.tap(find.byTooltip('Decrease duration'));
        await tester.pump();
        await _tapPrimaryButton(tester, 'Next');
        await _pumpTestAnimation(tester);

        expect(find.text('Booking & live guide'), findsOneWidget);
        expect(_fieldToggle('Cohort caps'), findsOneWidget);
        expect(
          find.byWidgetPredicate(
            (widget) =>
                widget is CatchChoiceTile &&
                widget.title == 'Open capacity' &&
                widget.selected,
            skipOffstage: false,
          ),
          findsOneWidget,
        );
        await _enterCreateEventText(tester, CreateEventFormKeys.capacity, '18');
        await _enterCreateEventText(tester, CreateEventFormKeys.price, '249.5');
        await _setEventAgeRange(tester, 21, 35);
        await _pumpTestAnimation(tester);
        await _pumpTestAnimation(tester);

        expect(find.text('Live event guide'), findsWidgets);
        expect(
          find.textContaining('Optional host tools for running the event.'),
          findsOneWidget,
        );

        await _tapPrimaryButton(tester, 'Review event');
        await _pumpTestAnimation(tester);
        expect(
          find.textContaining('Review every section before publishing.'),
          findsOneWidget,
        );
        await _tapPrimaryButton(tester, 'Create event');
        await _pumpTestAnimation(tester);

        expect(find.text('Your event is live.'), findsOneWidget);
        expect(find.text('Manage event'), findsOneWidget);
        expect(
          find.textContaining('is now listed on Stride Social'),
          findsOneWidget,
        );
        expect(
          find.textContaining('People can discover it from their home feed'),
          findsOneWidget,
        );
        expect(find.textContaining('visible to'), findsNothing);
        expect(fakeEventRepository.createdEvent, isNotNull);
        expect(fakeEventRepository.createdEvent!.clubId, 'club-1');
        expect(
          fakeEventRepository.createdEvent!.eventFormat.accessibilityNotes,
          'Step-free entrance',
        );
        expect(
          fakeEventRepository.createdEvent!.eventFormat.includedNotes,
          'Water and a guide',
        );
        expect(fakeEventRepository.createdEvent!.meetingPoint, 'Bandra Fort');
        expect(fakeEventRepository.createdEvent!.startingPointLat, 19.12345);
        expect(fakeEventRepository.createdEvent!.startingPointLng, 72.98765);
        expect(
          fakeEventRepository.createdEvent!.locationDetails,
          'Meet at the gate',
        );
        expect(fakeEventRepository.createdEvent!.distanceKm, 7.5);
        expect(fakeEventRepository.createdEvent!.capacityLimit, 18);
        expect(fakeEventRepository.createdEvent!.priceInPaise, 24950);
        expect(fakeEventRepository.createdEvent!.pace.name, 'moderate');
        expect(
          fakeEventRepository.createdEvent!.eventFormat.routePlan,
          RouteEventPlan.socialRun,
        );
        expect(fakeEventRepository.createdEvent!.constraints.minAge, 21);
        expect(fakeEventRepository.createdEvent!.constraints.maxAge, 35);
        expect(fakeEventRepository.createdEvent!.constraints.maxMen, isNull);
        expect(fakeEventRepository.createdEvent!.constraints.maxWomen, isNull);
        expect(fakeEventRepository.createdEvent!.eventPolicy, isNotNull);
        expect(
          fakeEventRepository
              .createdEvent!
              .eventPolicy!
              .admissionPolicy
              .cohortCapacityLimits,
          isEmpty,
        );
        expect(
          fakeEventRepository.createdEvent!.eventPolicy!.cancellationPolicy.id,
          EventCancellationPolicyId.standard,
        );

        final manageRunButton = find.text('Manage event');
        await tester.ensureVisible(manageRunButton);
        await tester.tap(manageRunButton);
        await _pumpTestAnimation(tester);

        expect(find.text('STRIDE SOCIAL'), findsNothing);
        expect(find.text('Event preparation'), findsOneWidget);
      },
    );

    testWidgets('live guide uses capacity-aware pub quiz team plan', (
      tester,
    ) async {
      await _pumpCreateEventFlow(
        tester,
        clubOverride: buildClub(name: 'Saket Run Club').copyWith(
          hostDefaults: ClubHostDefaults(
            primaryActivityKind: ActivityKind.pubQuiz,
            eventSuccess: EventSuccessDefaults.recommendedForActivity(
              ActivityKind.pubQuiz,
              enabled: true,
              targetAttendeeCount: 50,
            ),
          ),
        ),
      );
      await _openCreateEventFlow(tester);
      await _enterCreateEventText(
        tester,
        CreateEventFormKeys.description,
        'Trivia with balanced teams.',
      );
      await _pumpTestAnimation(tester);
      await _tapPrimaryButton(tester, 'Next');
      await _pumpTestAnimation(tester);
      await _enterCreateEventText(
        tester,
        CreateEventFormKeys.meetingPoint,
        'Quiz hall',
      );
      await _pickMapPoint(tester);
      await _pumpTestAnimation(tester);
      await _pickFutureDate(tester);
      await acceptInitialTime(tester);
      await _tapPrimaryButton(tester, 'Next');
      await _pumpTestAnimation(tester);

      await _enterCreateEventText(tester, CreateEventFormKeys.capacity, '50');
      await _enterCreateEventText(tester, CreateEventFormKeys.price, '0');
      await _pumpTestAnimation(tester);

      await _openCatchField(tester, 'Customize guide');
      await tester.ensureVisible(find.text('Customize'));
      await tester.tap(find.text('Customize'));
      await _pumpTestAnimation(tester);

      expect(
        find.textContaining('about 10 teams', skipOffstage: false),
        findsWidgets,
      );
      expect(find.textContaining('3 teams'), findsNothing);
      expect(find.text('Match clue questions'), findsOneWidget);
      expect(
        find.text('"Help me say hi" requests', skipOffstage: false),
        findsNothing,
      );
      expect(
        find.text('Suggested first-message openers', skipOffstage: false),
        findsNothing,
      );

      expect(
        find.text('Switch partners every', skipOffstage: false),
        findsNothing,
      );
    });

    testWidgets('custom event format persists label and structure', (
      tester,
    ) async {
      final fakeEventRepository = FakeEventRepository();
      await _pumpCreateEventFlow(
        tester,
        clubOverride: buildClub().copyWith(
          hostDefaults: ClubHostDefaults(
            eventSuccess: EventSuccessDefaults.recommendedForActivity(
              ActivityKind.openActivity,
              enabled: true,
              targetAttendeeCount: 24,
            ),
          ),
        ),
        overrides: [
          eventRepositoryProvider.overrideWith((ref) => fakeEventRepository),
        ],
      );
      await _openCreateEventFlow(tester);
      await _tapActivityKind(tester, 'Open activity');
      await _pumpTestAnimation(tester);
      await _enterCreateEventText(
        tester,
        CreateEventFormKeys.customActivityLabel,
        'Salsa night',
      );
      await _openCatchField(tester, 'Format structure');
      final pairedRotationsChip = find.byWidgetPredicate(
        (widget) =>
            widget is CatchChip &&
            widget.mode != null &&
            widget.label == EventInteractionModel.pairedRotations.label,
        description: 'paired-rotations CatchField choice',
        skipOffstage: false,
      );
      await Scrollable.ensureVisible(
        tester.element(pairedRotationsChip),
        alignment: 0.25,
      );
      await tester.pump();
      await tester.tap(pairedRotationsChip);
      await _enterCreateEventText(
        tester,
        CreateEventFormKeys.description,
        'Beginner-friendly partner rotations.',
      );
      await _pumpTestAnimation(tester);

      await _tapPrimaryButton(tester, 'Next');
      await _pumpTestAnimation(tester);
      await _enterCreateEventText(
        tester,
        CreateEventFormKeys.meetingPoint,
        'Dance studio',
      );
      await _pickMapPoint(tester);
      await _pumpTestAnimation(tester);

      await _pickFutureDate(tester);
      await acceptInitialTime(tester);
      await _tapPrimaryButton(tester, 'Next');
      await _pumpTestAnimation(tester);

      await _enterCreateEventText(tester, CreateEventFormKeys.capacity, '24');
      await _enterCreateEventText(tester, CreateEventFormKeys.price, '0');
      await _pumpTestAnimation(tester);
      await _tapPrimaryButton(tester, 'Review event');
      await _pumpTestAnimation(tester);
      await _tapPrimaryButton(tester, 'Create event');
      await _pumpTestAnimation(tester);

      final created = fakeEventRepository.createdEvent;
      expect(created, isNotNull);
      expect(created!.eventFormat.activityKind, ActivityKind.openActivity);
      expect(created.eventFormat.label, 'Salsa night');
      expect(
        created.eventFormat.interactionModel,
        EventInteractionModel.pairedRotations,
      );
      expect(created.eventFormat.defaultPlaybookId, isNull);
      expect(created.eventFormat.activityDetails['formatSource'], 'custom');
      expect(created.distanceKm, 0);
      final defaults = fakeEventRepository.createdEventSuccessDefaults
          ?.toJson();
      final structure = defaults?['structureConfig'] as Map<String, Object?>?;
      expect(defaults, isNotNull);
      expect(defaults!['playbookId'], 'pickleball_rotations');
      expect(structure?['unitKind'], 'pairs');
      expect(defaults['selectedModuleIds'], contains('guided_rotations'));
      expect(defaults['selectedModuleIds'], contains('live_reveal'));
    });

    testWidgets(
      'invite-only creation copy says the event is listed but booking-gated',
      (tester) async {
        final event = buildEvent(
          id: 'event-private',
          capacityLimit: 12,
          eventPolicy: EventPolicyBundle.inviteOnlyEvent(
            capacityLimit: 12,
            basePriceInPaise: 0,
          ),
        );

        await pumpEventsTestApp(
          tester,
          CreateEventSuccessScreen(
            club: buildClub(),
            event: event,
            inviteCode: 'CATCH-DELHI',
            onManageEvent: () {},
            onDone: () {},
          ),
        );

        expect(find.text('Your event is live.'), findsOneWidget);
        expect(find.text('EVENT CREATED'), findsOneWidget);
        expect(find.byIcon(CatchIcons.celebration), findsOneWidget);
        expect(
          find.textContaining('is now listed on Stride Social'),
          findsOneWidget,
        );
        expect(find.textContaining('People can discover it'), findsOneWidget);
        expect(
          find.textContaining(
            'only attendees with the invite code or private link can book',
          ),
          findsOneWidget,
        );
        expect(
          find.textContaining('Followers can discover it from their home feed'),
          findsNothing,
        );
        expect(find.text('WHEN'), findsOneWidget);
        expect(find.text('WHERE'), findsOneWidget);
        expect(find.text('Carter Road'), findsOneWidget);
        expect(find.text('EVENT'), findsOneWidget);
        expect(find.text('5 km easy social run'), findsOneWidget);
        expect(find.text('CAPACITY'), findsOneWidget);
        expect(find.text('12 attendees'), findsOneWidget);
        expect(find.text('INVITE CODE'), findsOneWidget);
        expect(find.text('CATCH-DELHI'), findsOneWidget);
        expect(find.text('PRIVATE LINK'), findsOneWidget);
        expect(
          find.text(
            'https://catchdates.com/organizers/club-1/events/event-private?invite=CATCH-DELHI',
          ),
          findsOneWidget,
        );
        expect(
          find.text(
            'Bookings, waitlist, and attendance are tracked from Manage event.',
          ),
          findsOneWidget,
        );
        expect(find.text('Manage event'), findsOneWidget);
        expect(find.text('Back to organizer'), findsOneWidget);
      },
    );

    testWidgets(
      'shows the past-time validation, clears it on repick, and renders mixed durations',
      (tester) async {
        final now = DateTime(2026, 5, 1, 14);
        await _pumpCreateEventFlow(
          tester,
          alwaysUse24HourFormat: true,
          now: () => now,
        );
        await _openCreateEventFlow(tester);

        await _fillBasicsStep(tester);
        await _tapPrimaryButton(tester, 'Next');
        await _pumpTestAnimation(tester);

        await _enterCreateEventText(
          tester,
          CreateEventFormKeys.meetingPoint,
          'Bandra Fort',
        );
        await _pickMapPoint(tester);
        await _pumpTestAnimation(tester);
        await _pumpTestAnimation(tester);

        await _openCatchField(tester, 'Duration');
        await tester.tap(find.byTooltip('Increase duration'));
        await tester.tap(find.byTooltip('Increase duration'));
        await tester.pump();

        final durationValue = find.byKey(
          const ValueKey('catch-field-stepper-value'),
        );
        expect(durationValue, findsOneWidget);
        expect(tester.widget<Text>(durationValue).data, '1h 30m');

        await _pickTodayDate(tester, today: now);
        await _pickTimeInInputMode(tester, hour: '1', minute: '59');

        expect(find.text('Choose a start time later than now'), findsOneWidget);
        expect(find.text('Select start time'), findsOneWidget);

        await _pickFutureDate(tester);
        await acceptInitialTime(tester);

        expect(find.text('Choose a start time later than now'), findsNothing);

        await _tapPrimaryButton(tester, 'Next');
        await _pumpTestAnimation(tester);

        expect(find.text('Booking & live guide'), findsOneWidget);
      },
    );

    testWidgets('restored past schedule draft shows validation error', (
      tester,
    ) async {
      final now = DateTime(2026, 5, 1, 14);
      final selectedDate = DateTime(now.year, now.month, now.day);
      await _pumpCreateEventFlow(
        tester,
        now: () => now,
        initialDraft: _buildEventDraft(
          id: 'past-schedule-draft',
          savedAt: now,
          selectedDateMillis: selectedDate.millisecondsSinceEpoch,
          selectedStartHour: 13,
          selectedStartMinute: 30,
        ),
        initialStep: 1,
      );
      await _openCreateEventFlow(tester);

      expect(find.text(createEventFutureStartError), findsOneWidget);
    });

    testWidgets('shows the submission error banner when creation fails', (
      tester,
    ) async {
      final fakeEventRepository = FakeEventRepository()
        ..createError = StateError('create failed');
      await _pumpCreateEventFlow(
        tester,
        overrides: [
          eventRepositoryProvider.overrideWith((ref) => fakeEventRepository),
        ],
      );
      await _openCreateEventFlow(tester);

      await _submitValidEvent(tester);

      expect(
        find.text('Something went wrong. Please try again.'),
        findsOneWidget,
      );
      expect(find.text('Create event'), findsOneWidget);
    });

    testWidgets('keeps create-event backend diagnostics out of the banner', (
      tester,
    ) async {
      final fakeEventRepository = FakeEventRepository()
        ..createError = const BackendOperationException(
          code: 'invalid-argument',
          message: 'Unable to create event right now. Please try again.',
          debugMessage:
              'functions.create event failed with firebase_functions/'
              'invalid-argument: eventSuccessDefaults: must NOT have '
              'additional properties',
          context: BackendErrorContext(
            service: BackendService.functions,
            action: 'create event',
            resource: 'events',
          ),
        );
      await _pumpCreateEventFlow(
        tester,
        overrides: [
          eventRepositoryProvider.overrideWith((ref) => fakeEventRepository),
        ],
      );
      await _openCreateEventFlow(tester);

      await _submitValidEvent(tester);

      expect(
        find.text('Something went wrong. Please try again.'),
        findsOneWidget,
      );
      expect(find.textContaining('[DEBUG]'), findsNothing);
      expect(find.textContaining('firebase_functions'), findsNothing);
      expect(find.textContaining('additional properties'), findsNothing);
      expect(find.text('Create event'), findsOneWidget);
    });

    _registerHostManageFromCreateEventTests();

    testWidgets('draft picker deletes persisted drafts and resumes another', (
      tester,
    ) async {
      final draftRepository = EventDraftRepository(ErrorLogger());
      await draftRepository.saveDraft(
        userId: 'runner-1',
        draft: _buildEventDraft(
          id: 'keep-draft',
          savedAt: DateTime.now().subtract(const Duration(minutes: 5)),
          distance: '9',
          capacity: '18',
          meetingPoint: 'Keep Point',
        ),
      );
      await draftRepository.saveDraft(
        userId: 'runner-1',
        draft: _buildEventDraft(
          id: 'delete-draft',
          savedAt: DateTime.now(),
          distance: '5',
          meetingPoint: 'Delete Point',
        ),
      );

      await _pumpCreateEventFlow(tester);
      await _openCreateEventFlow(tester);

      expect(
        find.byKey(const ValueKey<String>('host-event-entry-sheet')),
        findsOneWidget,
      );
      expect(find.textContaining('Delete Point'), findsOneWidget);
      expect(find.textContaining('Keep Point'), findsOneWidget);

      await tester.tap(
        find.byKey(CreateEventFormKeys.deleteDraft('delete-draft')),
      );
      await _pumpTestAnimation(tester);
      await tester.tap(_dialogAction('Delete'));
      await _pumpTestAnimation(tester);

      final remainingDrafts = await draftRepository.loadDrafts(
        clubId: 'club-1',
        userId: 'runner-1',
      );
      expect(remainingDrafts.map((draft) => draft.id), ['keep-draft']);
      expect(find.textContaining('Delete Point'), findsNothing);
      expect(find.textContaining('Keep Point'), findsOneWidget);

      await tester.tap(find.textContaining('Keep Point'));
      await _pumpTestAnimation(tester);

      expect(
        find.byKey(const ValueKey<String>('host-event-entry-sheet')),
        findsNothing,
      );
      expect(find.text('9'), findsOneWidget);
    });

    testWidgets('repeat prefill stays separate from persisted draft state', (
      tester,
    ) async {
      final now = DateTime(2026, 7, 10, 12);
      final draftRepository = EventDraftRepository(ErrorLogger());
      await draftRepository.saveDraft(
        userId: 'runner-1',
        draft: _buildEventDraft(
          id: 'saved-draft',
          savedAt: DateTime.now(),
          distance: '9',
          meetingPoint: 'Saved draft point',
        ),
      );
      final source = buildEvent(
        id: 'repeat-source',
        startTime: DateTime(2026, 7, 3, 20, 15),
        endTime: DateTime(2026, 7, 3, 21, 45),
      );
      final prefill = CreateEventPrefill.repeat(event: source, createdAt: now);

      await _pumpCreateEventFlow(
        tester,
        now: () => now,
        initialPrefill: prefill,
        initialStep: 1,
      );
      await _openCreateEventFlow(tester);

      expect(find.text('When & where'), findsWidgets);
      expect(find.text('Select a date'), findsOneWidget);
      expect(find.text('8:15 PM'), findsOneWidget);
      expect(
        find.byKey(const ValueKey<String>('host-event-entry-sheet')),
        findsNothing,
      );
      final drafts = await draftRepository.loadDrafts(
        clubId: 'club-1',
        userId: 'runner-1',
      );
      expect(drafts.map((draft) => draft.id), ['saved-draft']);
    });
  });
}

Finder _fieldToggle(String label) {
  return find.byWidgetPredicate(
    (widget) => widget is CatchField && widget.title == label,
  );
}

EventDraft _buildEventDraft({
  required String id,
  required DateTime savedAt,
  String? distance,
  String? capacity,
  String? meetingPoint,
  int? selectedDateMillis,
  int? selectedStartHour,
  int? selectedStartMinute,
}) {
  return EventDraft(
    id: id,
    clubId: 'club-1',
    savedAt: savedAt,
    distance: distance,
    capacity: capacity,
    meetingPoint: meetingPoint,
    selectedDateMillis: selectedDateMillis,
    selectedStartHour: selectedStartHour,
    selectedStartMinute: selectedStartMinute,
  );
}

Future<void> _pumpCreateEventFlow(
  WidgetTester tester, {
  Iterable overrides = const [],
  CommandJournalStorage? recoveryStorage,
  bool alwaysUse24HourFormat = false,
  DateTime Function()? now,
  Club? clubOverride,
  EventDraft? initialDraft,
  CreateEventPrefill? initialPrefill,
  HostRosterImportPlan? initialRosterImportPlan,
  List<OrganizerEventVenue> savedVenues = const [],
  int initialStep = 0,
}) async {
  // Interaction fixtures exercise the compact editor. Wide geometry has its
  // own explicit viewport test and must not duplicate summary-label finders.
  if (tester.view.physicalSize.width / tester.view.devicePixelRatio == 800) {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(430, 1000);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);
  }
  final club = clubOverride ?? buildClub();
  final router = GoRouter(
    initialLocation: '/',
    routes: [
      GoRoute(
        path: '/',
        builder: (context, state) => Scaffold(
          body: Center(
            child: ElevatedButton(
              onPressed: () => context.push('/create-event-test'),
              child: const Text('Open'),
            ),
          ),
        ),
      ),
      GoRoute(
        path: '/create-event-test',
        builder: (context, state) => CreateEventScreen(
          club: club,
          loadMapTiles: false,
          now: now ?? DateTime.now,
          initialDraft: initialDraft,
          initialPrefill: initialPrefill,
          initialRosterImportPlan: initialRosterImportPlan,
          initialStep: initialStep,
        ),
      ),
      GoRoute(
        path: Routes.hostAppEventManageScreen.path,
        name: Routes.hostAppEventManageScreen.name,
        builder: (context, state) => HostEventManageScreen(
          club: club,
          event: switch (state.extra) {
            final Event event => event,
            _ => buildEvent(clubId: club.id),
          },
          onBackToSuccess: () => context.pop(),
        ),
      ),
    ],
  );

  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        uidProvider.overrideWithValue(const AsyncData<String?>('runner-1')),
        commandJournalStorageProvider.overrideWith((ref) {
          final storage = recoveryStorage ?? MemoryCommandJournalStorage();
          return () async => storage;
        }),
        watchOrganizerEventVenuesProvider(
          club.id,
        ).overrideWith((ref) => Stream.value(savedVenues)),
        ...overrides,
      ],
      child: MaterialApp.router(
        theme: AppTheme.light,
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(alwaysUse24HourFormat: alwaysUse24HourFormat),
          child: CatchNoticeOverlay(child: child!),
        ),
        routerConfig: router,
      ),
    ),
  );
  await _pumpTestAnimation(tester);
}

Future<void> _submitValidEvent(WidgetTester tester) async {
  await _fillBasicsStep(tester);
  await _tapPrimaryButton(tester, 'Next');
  await _pumpTestAnimation(tester);

  await _enterCreateEventText(
    tester,
    CreateEventFormKeys.meetingPoint,
    'Bandra Fort',
  );
  await _pickMapPoint(tester);
  await _enterCreateEventText(
    tester,
    CreateEventFormKeys.locationDetails,
    'Meet at the gate',
  );
  await _pumpTestAnimation(tester);
  await _pumpTestAnimation(tester);

  await _pickFutureDate(tester);
  await acceptInitialTime(tester);
  await _tapPrimaryButton(tester, 'Next');
  await _pumpTestAnimation(tester);

  await _enterCreateEventText(tester, CreateEventFormKeys.capacity, '18');
  await _enterCreateEventText(tester, CreateEventFormKeys.price, '249.5');
  await _setEventAgeRange(tester, 21, 35);
  await _pumpTestAnimation(tester);
  await _pumpTestAnimation(tester);
  await _tapPrimaryButton(tester, 'Review event');
  await _pumpTestAnimation(tester);
  await _tapPrimaryButton(tester, 'Create event');
  await _pumpTestAnimation(tester);
}

Future<void> _setEventAgeRange(
  WidgetTester tester,
  int minAge,
  int maxAge,
) async {
  final slider = tester.widget<CatchRangeInput>(
    find.byKey(const ValueKey('event-age-range-slider'), skipOffstage: false),
  );
  final values = RangeValues(minAge.toDouble(), maxAge.toDouble());
  slider.onChanged!(values);
  await tester.pump();
  tester
      .widget<CatchRangeInput>(
        find.byKey(
          const ValueKey('event-age-range-slider'),
          skipOffstage: false,
        ),
      )
      .onChangeEnd
      ?.call(values);
  await tester.pump();
}

Future<void> _pickMapPoint(WidgetTester tester) async {
  final mapPicker = find.byKey(
    CreateEventFormKeys.mapPicker,
    skipOffstage: false,
  );
  await Scrollable.ensureVisible(tester.element(mapPicker), alignment: 0.25);
  await tester.pump();
  await tester.tap(mapPicker);
  await _pumpTestAnimation(tester);

  final googleMap = tester.widget<gmaps.GoogleMap>(
    find.byType(gmaps.GoogleMap),
  );
  const selectedPoint = LocationCoordinate(19.12345, 72.98765);
  googleMap.onTap?.call(
    gmaps.LatLng(selectedPoint.latitude, selectedPoint.longitude),
  );
  await tester.pump();
  await tester.tap(find.widgetWithText(CatchButton, 'Confirm location'));
  await _pumpTestAnimation(tester);
}

Future<void> _fillBasicsStep(WidgetTester tester) async {
  await _enterCreateEventText(tester, CreateEventFormKeys.distance, '7.5');
  await _openCatchField(tester, 'Pace level');
  await _tapCreateEventChip(tester, 'Moderate');
  await _enterCreateEventText(
    tester,
    CreateEventFormKeys.description,
    'Social pacing with a coffee stop.',
  );
  await _pumpTestAnimation(tester);
}

Future<void> _enterCreateEventText(
  WidgetTester tester,
  Key fieldKey,
  String text,
) async {
  tester.testTextInput.hide();
  await tester.pump();

  if (fieldKey == CreateEventFormKeys.description &&
      find.byKey(fieldKey).evaluate().isEmpty) {
    await _openCatchField(tester, 'Description & photos · Optional');
  }
  final field = find.byKey(fieldKey);
  await Scrollable.ensureVisible(tester.element(field), alignment: 0.25);
  await tester.pump();

  final textField = find.descendant(
    of: field,
    matching: find.byType(TextField),
  );
  await tester.enterText(textField, text);
  tester.testTextInput.hide();
  await tester.pump();
}

Future<void> _tapPrimaryButton(WidgetTester tester, String label) async {
  await _dismissKeyboard(tester);
  final buttonFinder = find.widgetWithText(CatchButton, label);
  await tester.ensureVisible(buttonFinder);
  await tester.tap(buttonFinder);
  await _pumpTestAnimation(tester);
}

Future<void> _dismissKeyboard(WidgetTester tester) async {
  tester.testTextInput.hide();
  await tester.pump();
}

Future<void> _pickTodayDate(WidgetTester tester, {DateTime? today}) async {
  await tester.ensureVisible(find.byKey(CreateEventFormKeys.datePicker));
  await tester.tap(find.byKey(CreateEventFormKeys.datePicker));
  await _pumpTestAnimation(tester);
  await tester.tap(find.text('${(today ?? DateTime.now()).day}').hitTestable());
  await _pumpTestAnimation(tester);
  await tester.tap(find.text('OK'));
  await _pumpTestAnimation(tester);
}

Future<void> _pickFutureDate(WidgetTester tester) async {
  await tester.ensureVisible(find.byKey(CreateEventFormKeys.datePicker));
  await tester.tap(find.byKey(CreateEventFormKeys.datePicker));
  await _pumpTestAnimation(tester);
  await tester.tap(find.byTooltip('Next month'));
  await _pumpTestAnimation(tester);
  await tester.tap(find.text('1').hitTestable());
  await _pumpTestAnimation(tester);
  await tester.tap(find.text('OK'));
  await _pumpTestAnimation(tester);
}

Future<void> _pickTimeInInputMode(
  WidgetTester tester, {
  required String hour,
  required String minute,
}) async {
  await tester.ensureVisible(find.byKey(CreateEventFormKeys.timePicker));
  await tester.tap(find.byKey(CreateEventFormKeys.timePicker));
  await _pumpTestAnimation(tester);
  // Material's time picker owns this toggle and draws its own glyph.
  await tester.tap(find.byTooltip('Switch to text input mode'));
  await _pumpTestAnimation(tester);

  final timeFields = find.descendant(
    of: find.byType(Dialog),
    matching: find.byType(EditableText),
  );
  await tester.enterText(timeFields.at(0), hour);
  await tester.enterText(timeFields.at(1), minute);
  await tester.tap(find.text('OK'));
  await _pumpTestAnimation(tester);
}

Future<void> _pumpTestAnimation(WidgetTester tester) async {
  await pumpFeatureUi(tester);
}

Future<void> _pumpHostActionFrame(WidgetTester tester) async {
  await tester.pump();
  await pumpFeatureUiFor(tester, const Duration(milliseconds: 300));
}

Finder _dialogAction(String label) {
  return find.descendant(
    of: find.byType(Dialog),
    matching: find.widgetWithText(CatchButton, label),
  );
}
