import 'dart:async';

import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/contexts/connections/data/swipe_candidate_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_constraints.dart';
import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:catch_dating_app/contexts/events/domain/event_itinerary.dart';
import 'package:catch_dating_app/contexts/events/domain/route_event_plan.dart';
import 'package:catch_dating_app/core/external_links.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/events/presentation/event_detail_information_state.dart';
import 'package:catch_dating_app/events/presentation/event_detail_view_model.dart';
import 'package:catch_dating_app/events/presentation/event_location_map_screen.dart';
import 'package:catch_dating_app/events/presentation/event_location_map_state.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_detail_fact_list.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_detail_overview_section.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_photo_header.dart';
import 'package:catch_dating_app/events/presentation/widgets/who_is_going_section.dart';
import 'package:catch_dating_app/events/shared/event_agenda_list.dart';
import 'package:catch_dating_app/events/shared/event_tiles/event_tiles.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/widgets/when_step.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_stepper_dock.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/locations/domain/location_coordinate.dart';
import 'package:catch_dating_app/locations/shared/map_preview.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:url_launcher/url_launcher.dart';

import 'events_test_helpers.dart';

void main() {
  group('Events widgets', () {
    testWidgets('basic input widgets render their states and handle taps', (
      tester,
    ) async {
      var pickerTapped = false;
      var decreased = false;
      var increased = false;

      await pumpEventsTestApp(
        tester,
        Scaffold(
          body: Column(
            children: [
              CatchFieldLabelText(
                copy: catchFieldLabelTextCopy(AppLocalizationsEn()),
                label: 'Distance',
                size: CatchFieldLabelTextSize.lg,
              ),
              _TestPickerTile(
                icon: CatchIcons.date,
                value: null,
                placeholder: 'Select a date',
                onTap: () => pickerTapped = true,
              ),
              _TestPickerTile(
                icon: CatchIcons.time,
                value: '23/04/2026',
                placeholder: 'Unused',
                onTap: () {},
              ),
              CatchStepper.actions(
                value: 75,
                onDecrease: () => decreased = true,
                onIncrease: () => increased = true,
                decreaseSemanticLabel: 'Decrease duration',
                increaseSemanticLabel: 'Increase duration',
                valueLabelBuilder: (minutes) => '${minutes.round()} min',
              ),
            ],
          ),
        ),
      );

      expect(find.text('Distance'), findsOneWidget);
      expect(find.text('Select a date'), findsOneWidget);
      expect(find.text('23/04/2026'), findsOneWidget);
      expect(find.text('75 min'), findsOneWidget);
      expect(
        tester
            .getSize(find.widgetWithText(CatchControlSurface, 'Select a date'))
            .height,
        CatchControlMetrics.mdMinHeight,
      );
      expect(
        tester.getSize(find.widgetWithText(CatchStepper, '75 min')).height,
        CatchStepperRepeatButton.hitExtent,
      );

      await tester.tap(find.text('Select a date'));
      await tester.tap(find.byTooltip('Decrease duration'));
      await tester.tap(find.byTooltip('Increase duration'));
      await tester.pump();

      expect(pickerTapped, isTrue);
      expect(decreased, isTrue);
      expect(increased, isTrue);
    });

    testWidgets('itinerary, map and photo header render event details', (
      tester,
    ) async {
      final event = buildEvent(
        startTime: DateTime(2025, 4, 23, 6, 30),
        endTime: DateTime(2025, 4, 23, 7, 45),
        meetingPoint: 'Bandra Fort',
        locationDetails: 'Meet by the parking lot',
        itinerary: const [
          EventItineraryItem(
            id: 'gather',
            kind: EventItineraryKind.gather,
            offsetMinutes: 0,
            title: 'Gather at Bandra Fort',
          ),
          EventItineraryItem(
            id: 'run',
            kind: EventItineraryKind.activity,
            offsetMinutes: 15,
            title: 'Social 5K',
          ),
          EventItineraryItem(
            id: 'finish',
            kind: EventItineraryKind.finish,
            offsetMinutes: 75,
            title: 'Coffee and cooldown',
          ),
        ],
        distanceKm: 5.5,
        bookedCount: 3,
        constraints: const EventConstraints(
          minAge: 21,
          maxAge: 35,
          maxMen: 8,
          maxWomen: 10,
        ),
      );

      await pumpEventsTestApp(
        tester,
        Scaffold(
          body: ListView(
            children: [
              EventDetailItineraryList(event: event),
              const SizedBox(height: 16),
              EventDetailMapCard(event: event, enableNetworkTiles: false),
              const SizedBox(height: 16),
              SizedBox(height: 320, child: EventPhotoHeader(event: event)),
            ],
          ),
        ),
      );

      expect(find.text('6:30 AM'), findsOneWidget);
      expect(find.text('6:45 AM'), findsOneWidget);
      expect(find.text('7:45 AM'), findsOneWidget);
      expect(find.text('Gather at Bandra Fort'), findsOneWidget);
      expect(find.text('Social 5K'), findsOneWidget);
      expect(find.text('Coffee and cooldown'), findsOneWidget);
      expect(find.text('Bandra Fort'), findsOneWidget);
      expect(find.text('PIN DROPS MORNING-OF'), findsNothing);
      expect(find.text('Wednesday Morning Run'), findsNothing);
      expect(find.text('3/20 spots'), findsNothing);
      expect(find.text('5.5km'), findsNothing);
    });

    testWidgets('does not fabricate an itinerary for legacy event documents', (
      tester,
    ) async {
      final event = buildEvent();
      await pumpEventsTestApp(
        tester,
        Scaffold(
          body: SingleChildScrollView(
            child: Builder(
              builder: (context) => EventDetailOverviewSection(
                event: event,
                informationState: eventDetailInformationStateFrom(
                  event: event,
                  l10n: context.l10n,
                ),
                enableMapNetworkTiles: false,
              ),
            ),
          ),
        ),
      );

      expect(find.text('Itinerary'), findsNothing);
      expect(find.textContaining('Gather at'), findsNothing);
      expect(find.text('Wrap up'), findsNothing);
    });

    testWidgets('location card uses the event required exact coordinates', (
      tester,
    ) async {
      var tapped = false;
      final mappedRun = buildEvent(
        meetingPoint: 'Race Course Road main gate',
        startingPointLat: 22.7196,
        startingPointLng: 75.8577,
        itinerary: const [
          EventItineraryItem(
            id: 'water-stop',
            kind: EventItineraryKind.stop,
            offsetMinutes: 30,
            title: 'Water stop',
            location: EventMeetingLocation(
              name: 'Central fountain',
              latitude: 22.722,
              longitude: 75.86,
            ),
          ),
        ],
        eventFormat: EventFormatSnapshot.fromActivityKind(
          ActivityKind.socialRun,
          activityDetails: {
            'routePlan': RouteEventPlan.socialRun
                .copyWith(
                  path: const [
                    RoutePoint(latitude: 22.7196, longitude: 75.8577),
                    RoutePoint(latitude: 22.7241, longitude: 75.8621),
                  ],
                )
                .toJson(),
          },
        ),
      );

      await pumpEventsTestApp(
        tester,
        Scaffold(
          body: EventDetailMapCard(
            event: mappedRun,
            onTap: () => tapped = true,
            enableNetworkTiles: false,
          ),
        ),
      );

      expect(find.byIcon(CatchIcons.disclosure), findsOneWidget);
      final preview = tester.widget<MapPreview>(find.byType(MapPreview));
      expect(preview.coordinate, const LocationCoordinate(22.7196, 75.8577));
      expect(preview.path, const [
        LocationCoordinate(22.7196, 75.8577),
        LocationCoordinate(22.7241, 75.8621),
      ]);
      expect(preview.markers, hasLength(1));
      expect(preview.markers.single.infoTitle, 'Water stop');
      expect(
        preview.markers.single.position,
        const LocationCoordinate(22.722, 75.86),
      );
      expect(preview.enableNetworkTiles, isFalse);

      await tester.tap(find.text('Race Course Road main gate'));
      await tester.pump();

      expect(tapped, isTrue);
    });

    testWidgets('location card always exposes map for a valid event', (
      tester,
    ) async {
      var tapped = false;

      await pumpEventsTestApp(
        tester,
        Scaffold(
          body: EventDetailMapCard(
            event: buildEvent(meetingPoint: 'Race Course Road main gate'),
            onTap: () => tapped = true,
            enableNetworkTiles: false,
          ),
        ),
      );

      expect(find.byIcon(CatchIcons.disclosure), findsOneWidget);

      await tester.tap(find.text('Race Course Road main gate'));
      await tester.pump();

      expect(tapped, isTrue);
    });

    testWidgets('event location map centers a pinned event and labels it', (
      tester,
    ) async {
      final event = buildEvent(
        meetingPoint: 'Race Course Road main gate',
        locationDetails: 'Look for the Catch demo pacer near the entrance.',
        startingPointLat: 22.7196,
        startingPointLng: 75.8577,
      );

      await pumpEventsTestApp(
        tester,
        EventLocationMapScreen(
          state: EventLocationMapState.fromEvent(
            event,
            enableNetworkTiles: false,
          ),
          onGetDirections: () {},
        ),
      );

      expect(find.text('Event location'), findsNothing);
      // The map marker and the address row both draw the location role.
      expect(find.byIcon(CatchIcons.location), findsNWidgets(2));
      expect(find.text('Race Course Road main gate'), findsOneWidget);
      expect(
        find.text('Look for the Catch demo pacer near the entrance.'),
        findsOneWidget,
      );
    });

    testWidgets(
      'event location route shows map-shaped skeleton while loading',
      (tester) async {
        await pumpEventsTestApp(
          tester,
          const EventLocationMapRouteScreen(
            eventId: 'loading-event',
            enableNetworkTiles: false,
          ),
          overrides: [
            eventDetailViewModelProvider(
              'loading-event',
            ).overrideWithValue(const AsyncLoading<EventDetailViewModel?>()),
          ],
        );

        expect(find.byType(CatchScaffold), findsOneWidget);
        expect(find.byType(EventLocationMapLoadingBody), findsOneWidget);
        expect(find.byType(CatchSkeleton), findsWidgets);
        expect(find.byType(CircularProgressIndicator), findsNothing);
        expect(find.byTooltip('Back'), findsOneWidget);
        expect(find.text('Get directions'), findsNothing);
      },
    );

    testWidgets('event location map keeps directions as an explicit action', (
      tester,
    ) async {
      var openedDirections = false;
      final event = buildEvent(
        meetingPoint: 'Race Course Road main gate',
        startingPointLat: 22.7196,
        startingPointLng: 75.8577,
      );

      await pumpEventsTestApp(
        tester,
        EventLocationMapScreen(
          state: EventLocationMapState.fromEvent(
            event,
            enableNetworkTiles: false,
          ),
          onGetDirections: () => openedDirections = true,
        ),
      );

      await tester.tap(find.text('Get directions'));
      await tester.pump();

      expect(openedDirections, isTrue);
    });

    testWidgets('event location route opens directions externally', (
      tester,
    ) async {
      Uri? openedUri;
      LaunchMode? openedMode;
      final event = buildEvent(
        id: 'directions-event',
        meetingPoint: 'Race Course Road main gate',
        startingPointLat: 22.7196,
        startingPointLng: 75.8577,
      );

      await pumpEventsTestApp(
        tester,
        EventLocationMapRouteScreen(
          eventId: event.id,
          enableNetworkTiles: false,
        ),
        overrides: [
          eventDetailViewModelProvider(event.id).overrideWithValue(
            AsyncData<EventDetailViewModel?>(
              EventDetailViewModel(
                event: event,
                userProfile: null,
                reviews: const [],
                isAuthenticated: false,
                isHost: false,
                isSaved: false,
                participation: null,
              ),
            ),
          ),
          externalUrlLauncherProvider.overrideWithValue((
            uri, {
            mode = LaunchMode.platformDefault,
          }) async {
            openedUri = uri;
            openedMode = mode;
            return true;
          }),
        ],
      );

      await tester.tap(find.text('Get directions'));
      await tester.pump();

      expect(openedMode, LaunchMode.externalApplication);
      expect(
        openedUri.toString(),
        'https://www.google.com/maps/dir/?api=1&destination=22.7196%2C75.8577&travelmode=walking',
      );
    });

    testWidgets('event location route reports a false directions result', (
      tester,
    ) async {
      final event = buildEvent(
        id: 'directions-false',
        meetingPoint: 'Race Course Road main gate',
        startingPointLat: 22.7196,
        startingPointLng: 75.8577,
      );

      await pumpEventsTestApp(
        tester,
        EventLocationMapRouteScreen(
          eventId: event.id,
          enableNetworkTiles: false,
        ),
        overrides: [
          eventDetailViewModelProvider(event.id).overrideWithValue(
            AsyncData<EventDetailViewModel?>(
              EventDetailViewModel(
                event: event,
                userProfile: null,
                reviews: const [],
                isAuthenticated: false,
                isHost: false,
                isSaved: false,
                participation: null,
              ),
            ),
          ),
          externalUrlLauncherProvider.overrideWithValue(
            (uri, {mode = LaunchMode.platformDefault}) async => false,
          ),
        ],
      );

      await tester.tap(find.text('Get directions'));
      await tester.pump();

      expect(
        find.text('Could not open directions. Please try again.'),
        findsOneWidget,
      );
    });

    testWidgets(
      'event location route guards duplicate directions taps while pending',
      (tester) async {
        final launchResult = Completer<bool>();
        var launchCallCount = 0;
        final event = buildEvent(
          id: 'directions-pending',
          meetingPoint: 'Race Course Road main gate',
          startingPointLat: 22.7196,
          startingPointLng: 75.8577,
        );

        await pumpEventsTestApp(
          tester,
          EventLocationMapRouteScreen(
            eventId: event.id,
            enableNetworkTiles: false,
          ),
          overrides: [
            eventDetailViewModelProvider(event.id).overrideWithValue(
              AsyncData<EventDetailViewModel?>(
                EventDetailViewModel(
                  event: event,
                  userProfile: null,
                  reviews: const [],
                  isAuthenticated: false,
                  isHost: false,
                  isSaved: false,
                  participation: null,
                ),
              ),
            ),
            externalUrlLauncherProvider.overrideWithValue((
              uri, {
              mode = LaunchMode.platformDefault,
            }) {
              launchCallCount += 1;
              return launchResult.future;
            }),
          ],
        );

        await tester.tap(find.byType(CatchButton));
        await tester.pump();
        expect(
          tester.widget<CatchButton>(find.byType(CatchButton)).isLoading,
          isTrue,
        );

        await tester.tap(find.byType(CatchButton));
        await tester.pump();
        expect(launchCallCount, 1);

        launchResult.complete(true);
        await tester.pump();
        expect(
          tester.widget<CatchButton>(find.byType(CatchButton)).isLoading,
          isFalse,
        );
      },
    );

    testWidgets('event location route reports a thrown directions failure', (
      tester,
    ) async {
      final event = buildEvent(
        id: 'directions-error',
        meetingPoint: 'Race Course Road main gate',
        startingPointLat: 22.7196,
        startingPointLng: 75.8577,
      );

      await pumpEventsTestApp(
        tester,
        EventLocationMapRouteScreen(
          eventId: event.id,
          enableNetworkTiles: false,
        ),
        overrides: [
          eventDetailViewModelProvider(event.id).overrideWithValue(
            AsyncData<EventDetailViewModel?>(
              EventDetailViewModel(
                event: event,
                userProfile: null,
                reviews: const [],
                isAuthenticated: false,
                isHost: false,
                isSaved: false,
                participation: null,
              ),
            ),
          ),
          externalUrlLauncherProvider.overrideWithValue(
            (uri, {mode = LaunchMode.platformDefault}) async =>
                throw StateError('launcher unavailable'),
          ),
        ],
      );

      await tester.tap(find.text('Get directions'));
      await tester.pump();

      expect(
        find.text('Could not open directions. Please try again.'),
        findsOneWidget,
      );
    });

    test('event location state derives map and directions data', () {
      final event = buildEvent(
        meetingPoint: 'Race Course Road main gate',
        locationDetails: 'Look for the Catch demo pacer near the entrance.',
        startingPointLat: 22.7196,
        startingPointLng: 75.8577,
      );

      final state = EventLocationMapState.fromEvent(
        event,
        enableNetworkTiles: false,
      );

      expect(state.event, event);
      expect(state.enableNetworkTiles, isFalse);
      expect(state.startingPoint?.latitude, 22.7196);
      expect(state.startingPoint?.longitude, 75.8577);
      expect(state.locationName, 'Race Course Road main gate');
      expect(
        state.locationNotes,
        'Look for the Catch demo pacer near the entrance.',
      );
      expect(
        state.directionsUri.toString(),
        'https://www.google.com/maps/dir/?api=1&destination=22.7196%2C75.8577&travelmode=walking',
      );
    });

    testWidgets('when step renders schedule validation text', (tester) async {
      final dateController = TextEditingController(text: '23/04/2026');
      final startTimeController = TextEditingController(text: '6:30 AM');
      addTearDown(dateController.dispose);
      addTearDown(startTimeController.dispose);

      await pumpEventsTestApp(
        tester,
        Scaffold(
          body: WhenStep(
            formKey: GlobalKey<FormState>(),
            dateController: dateController,
            startTimeController: startTimeController,
            durationMinutes: 60,
            onPickDate: _noop,
            onPickTime: _noop,
            onDecreaseDuration: _noop,
            onIncreaseDuration: _noop,
            formatDuration: (minutes) => '$minutes min',
            scheduleErrorText: 'Start time must be in the future',
          ),
        ),
      );

      expect(find.text('Start time must be in the future'), findsOneWidget);
    });

    testWidgets('agenda and action widgets render and handle selection', (
      tester,
    ) async {
      final now = DateTime(2026, 5, 5);
      final event = buildEvent(
        id: 'event-7',
        startTime: DateTime(now.year, now.month, now.day, 8),
        endTime: DateTime(now.year, now.month, now.day, 9),
        distanceKm: 7,
        bookedCount: 2,
      );
      String? selectedEventId;
      var footerTapped = false;

      await pumpEventsTestApp(
        tester,
        Scaffold(
          body: ListView(
            children: [
              CatchButton(
                label: 'Next',
                onPressed: () => footerTapped = true,
                fullWidth: true,
                leading: Icon(CatchIcons.forward),
              ),
              const CatchButton(
                label: 'Schedule event',
                onPressed: _noop,
                status: CatchButtonStatus.loading,
                fullWidth: true,
              ),
              SizedBox(
                height: 240,
                child: CustomScrollView(
                  slivers: [
                    EventAgendaSliverList(
                      events: [event],
                      badgeLabel: 'VIEW',
                      today: now,
                      onEventSelected: (selected) =>
                          selectedEventId = selected.id,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      );

      expect(find.text('TODAY'), findsOneWidget);
      expect(find.text('CARTER ROAD'), findsOneWidget);
      expect(find.text(event.eventFormat.label), findsOneWidget);
      expect(
        find.byKey(const ValueKey('event_date_rail_card.decision')),
        findsOneWidget,
      );
      expect(find.text('FREE'), findsOneWidget);
      expect(find.text('VIEW'), findsNothing);
      expect(find.text('Next'), findsOneWidget);
      expect(find.text('Schedule event'), findsNothing);
      expect(
        find.byWidgetPredicate(
          (widget) => widget is CatchButton && widget.isLoading,
        ),
        findsOneWidget,
      );

      await tester.tap(find.text(event.eventFormat.label));
      await tester.tap(find.text('Next'));
      await tester.pump();

      expect(selectedEventId, 'event-7');
      expect(footerTapped, isTrue);
    });

    testWidgets(
      'stepper footer fades scrolling content without restoring dock chrome',
      (tester) async {
        tester.view.physicalSize = const Size(320, 640);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);

        await pumpEventsTestApp(
          tester,
          Scaffold(
            body: HostStepperDock(
              body: ListView(
                padding: CatchInsets.formStepBodyWithBottomActions,
                children: const [
                  SizedBox(height: 560),
                  Text('Last form field'),
                ],
              ),
              isLastStep: true,
              isLoading: false,
              onPrimary: _noop,
              onPrevious: _noop,
              lastStepLabel: 'Schedule event',
            ),
          ),
        );

        expect(tester.takeException(), isNull);
        expect(find.text('Previous'), findsOneWidget);
        expect(find.text('Schedule event'), findsOneWidget);
        expect(
          find.byWidgetPredicate(
            (widget) =>
                widget is CatchDock &&
                widget.variant == CatchDockVariant.utility,
          ),
          findsNothing,
        );
        expect(find.byType(Divider), findsNothing);
        expect(find.byType(BackdropFilter), findsOneWidget);

        final scrim = tester.widget<DecoratedBox>(
          find.byKey(const ValueKey('catch_bottom_action_overlay.scrim')),
        );
        final gradient = (scrim.decoration as BoxDecoration).gradient;
        expect(gradient, isA<LinearGradient>());
        final colors = (gradient! as LinearGradient).colors;
        expect(colors.first.a, CatchOpacity.none);
        expect(colors.last.a, CatchOpacity.visible);

        final bodyRect = tester.getRect(
          find.byKey(const ValueKey('catch_bottom_action_overlay.body')),
        );
        final scrimRect = tester.getRect(
          find.byKey(const ValueKey('catch_bottom_action_overlay.scrim')),
        );
        final actionsRect = tester.getRect(
          find.byKey(const ValueKey('catch_bottom_action_overlay.actions')),
        );
        final overlayRect = tester.getRect(
          find.byType(CatchBottomActionOverlay),
        );
        expect(scrimRect.top, lessThan(bodyRect.bottom));
        expect(actionsRect.top, bodyRect.bottom);
        expect(actionsRect.bottom, lessThanOrEqualTo(overlayRect.bottom));
        expect(actionsRect.top, greaterThan(scrimRect.top));
        expect(actionsRect.left, greaterThanOrEqualTo(CatchSpacing.screenPx));
        expect(
          actionsRect.right,
          lessThanOrEqualTo(320 - CatchSpacing.screenPx),
        );
        await tester.drag(find.byType(ListView), const Offset(0, -160));
        await tester.pump();
        expect(find.text('Last form field').hitTestable(), findsOneWidget);
      },
    );

    testWidgets('agenda list sorts events and forwards selected-event taps', (
      tester,
    ) async {
      final now = DateTime(2026, 5, 5);
      final laterRun = buildEvent(
        id: 'event-later',
        startTime: DateTime(now.year, now.month, now.day, 10),
        endTime: DateTime(now.year, now.month, now.day, 11),
        meetingPoint: 'Later start',
      );
      final soonerRun = buildEvent(
        id: 'event-sooner',
        startTime: DateTime(now.year, now.month, now.day, 8),
        endTime: DateTime(now.year, now.month, now.day, 9),
        meetingPoint: 'Sooner start',
      );
      String? tappedEventId;

      await pumpEventsTestApp(
        tester,
        Scaffold(
          body: SizedBox(
            height: 360,
            child: CustomScrollView(
              slivers: [
                EventAgendaSliverList(
                  events: [laterRun, soonerRun],
                  today: now,
                  onEventSelected: (selected) => tappedEventId = selected.id,
                ),
              ],
            ),
          ),
        ),
      );

      expect(
        tester.getTopLeft(find.text('SOONER START')).dy <
            tester.getTopLeft(find.text('LATER START')).dy,
        isTrue,
      );

      await tester.tap(find.text('SOONER START'));
      await tester.pump();

      expect(tappedEventId, 'event-sooner');
      final tickets = tester
          .widgetList<EventDateRailCard>(find.byType(EventDateRailCard))
          .toList(growable: false);
      expect(tickets.map((ticket) => ticket.stripPosition), [
        EventDateRailCardStripPosition.first,
        EventDateRailCardStripPosition.last,
      ]);
    });

    testWidgets('agenda list renders provided club names in global context', (
      tester,
    ) async {
      final now = DateTime(2026, 5, 5);
      final event = buildEvent(
        id: 'event-with-club',
        startTime: DateTime(now.year, now.month, now.day, 8),
        meetingPoint: 'Global surface start',
      );

      await pumpEventsTestApp(
        tester,
        Scaffold(
          body: SizedBox(
            height: 300,
            child: CustomScrollView(
              slivers: [
                EventAgendaSliverList(
                  events: [event],
                  today: now,
                  showClubName: true,
                  clubNameBuilder: (_) => 'Stride Social',
                ),
              ],
            ),
          ),
        ),
      );

      expect(find.text('GLOBAL SURFACE START'), findsNothing);
      expect(find.text('STRIDE SOCIAL'), findsOneWidget);
      expect(find.text(event.eventFormat.label), findsOneWidget);
    });

    testWidgets('event action card renders badges, meta, and actions', (
      tester,
    ) async {
      var actionTapped = false;
      final event = buildEvent(
        startTime: DateTime.now().add(const Duration(days: 1)),
        meetingPoint: 'Race Course Road',
      );

      await pumpEventsTestApp(
        tester,
        Scaffold(
          body: SizedBox(
            width: 380,
            child: EventActionCard(
              event: event,
              subtitle: 'Stride Social',
              badges: const [
                EventActionCardBadge(
                  label: 'Next event',
                  tone: CatchBadgeTone.brand,
                ),
              ],
              metaRows: [
                [
                  CatchMetaEntry(
                    icon: CatchIcons.time,
                    label: event.timeRangeLabel,
                  ),
                ],
              ],
              actions: [
                EventActionCardAction(
                  label: 'View event',
                  icon: CatchIcons.forward,
                  onPressed: () => actionTapped = true,
                ),
              ],
            ),
          ),
        ),
      );

      expect(find.text(event.title), findsOneWidget);
      expect(find.text('Stride Social'), findsOneWidget);
      expect(find.text('Next event'), findsOneWidget);
      expect(find.text('View event'), findsOneWidget);

      await tester.tap(find.text('View event'));
      await tester.pump();

      expect(actionTapped, isTrue);
    });

    testWidgets(
      'event photo header uses the shared branded fallback without a photo',
      (tester) async {
        final event = buildEvent();

        await tester.pumpWidget(
          MaterialApp(
            theme: ThemeData(extensions: const [CatchTokens.editorialLight]),
            home: Scaffold(
              body: SizedBox(
                height: 320,
                child: EventPhotoHeader(event: event),
              ),
            ),
          ),
        );
        await tester.pump();

        expect(find.byIcon(CatchIcons.activity), findsNothing);
        expect(find.byType(Image), findsNothing);
      },
    );

    testWidgets('event photo header does not duplicate event detail copy', (
      tester,
    ) async {
      final event = buildEvent(
        meetingPoint: 'Deuce',
        eventFormat: EventFormatSnapshot.fromActivityKind(
          ActivityKind.pickleball,
        ),
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeData(extensions: const [CatchTokens.editorialLight]),
          home: Scaffold(
            body: SizedBox(height: 320, child: EventPhotoHeader(event: event)),
          ),
        ),
      );
      await tester.pump();

      // Only the backdrop art draws the activity; no chip repeats it.
      expect(find.byIcon(CatchIcons.activityPickleball), findsOneWidget);
      expect(find.text(event.title), findsNothing);
      expect(find.text('Deuce'), findsNothing);
      expect(find.text('Pickleball'), findsNothing);
      expect(find.text('0/20 spots'), findsNothing);
    });

    testWidgets('event photo header prefers event photos when available', (
      tester,
    ) async {
      final event = buildEvent(
        photoUrl: 'https://img.example/events/event-1.jpg',
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeData(extensions: const [CatchTokens.editorialLight]),
          home: Scaffold(
            body: SizedBox(height: 320, child: EventPhotoHeader(event: event)),
          ),
        ),
      );
      await tester.pump();

      expect(find.byType(Image), findsOneWidget);
      expect(find.text(event.title), findsNothing);
    });

    testWidgets('who is going shows the empty upcoming state', (tester) async {
      await pumpEventsTestApp(
        tester,
        Scaffold(body: WhoIsGoingSection(event: buildEvent(bookedCount: 0))),
      );

      expect(find.text("Who's going"), findsOneWidget);
      expect(find.text('0/20'), findsOneWidget);
      expect(find.text('No attendees yet'), findsOneWidget);
      expect(find.text('Be the first to book this event.'), findsOneWidget);
      expect(find.textContaining('Swiping unlocks'), findsNothing);
    });

    testWidgets(
      'who is going loads profiles and shows overflow for past events',
      (tester) async {
        final candidateRepository = FakeSwipeCandidateRepository(
          List.generate(
            7,
            (index) =>
                buildPublicProfile(uid: 'runner-$index', name: 'Runner $index'),
          ),
        );
        final event = buildEvent(
          startTime: DateTime.now().subtract(const Duration(hours: 2)),
          endTime: DateTime.now().subtract(const Duration(hours: 1)),
          checkedInCount: 8,
        );

        await pumpEventsTestApp(
          tester,
          Scaffold(body: WhoIsGoingSection(event: event)),
          overrides: [
            swipeCandidateRepositoryProvider.overrideWith(
              (ref) => candidateRepository,
            ),
          ],
        );
        await tester.pump();

        expect(candidateRepository.lastEventId, event.id);
        expect(find.text('8/20'), findsOneWidget);
        expect(find.text('+1'), findsOneWidget);
        expect(
          find.text(
            'The catch window is open for 24 hours after the event finishes.',
          ),
          findsOneWidget,
        );
      },
    );
  });
}

void _noop() {}

class _TestPickerTile extends StatelessWidget {
  const _TestPickerTile({
    required this.icon,
    required this.value,
    required this.placeholder,
    required this.onTap,
  });

  final IconData icon;
  final String? value;
  final String placeholder;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return CatchControlSurface(
      onTap: onTap,
      tone: CatchControlSurfaceTone.raised,
      padding: CatchControlMetrics.contentPadding(CatchControlSurfaceSize.md),
      semanticButton: true,
      child: Row(
        children: [
          Icon(icon, size: CatchIconSize.control, color: t.ink2),
          gapW12,
          Expanded(
            child: Text(
              value ?? placeholder,
              style: value != null
                  ? CatchTextStyles.bodyLead(context)
                  : CatchTextStyles.bodyLead(context, color: t.ink3),
            ),
          ),
          Icon(CatchIcons.disclosure, size: CatchIconSize.md, color: t.ink3),
        ],
      ),
    );
  }
}
