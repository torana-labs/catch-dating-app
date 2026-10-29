import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/discovery/data/saved_event_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_calendar_links.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_constraints.dart';
import 'package:catch_dating_app/contexts/events/parts/event_thumbnail.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/clubs_repository.dart';
import 'package:catch_dating_app/contexts/payments/data/payment_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import 'package:catch_dating_app/events/presentation/event_detail_display_state.dart';
import 'package:catch_dating_app/events/presentation/event_detail_information_state.dart';
import 'package:catch_dating_app/events/presentation/event_detail_screen.dart';
import 'package:catch_dating_app/events/presentation/event_detail_view_model.dart';
import 'package:catch_dating_app/events/presentation/event_location_map_screen.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_detail_body.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_detail_dock.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_detail_fact_list.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_detail_hero_top_bar.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_detail_loading_skeleton.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_detail_surface_style.dart';
import 'package:catch_dating_app/events/shared/event_detail_route_transition.dart';
import 'package:catch_dating_app/events/shared/event_share_card.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_dating_app/platform/device/external_share.dart';
import 'package:catch_dating_app/platform/media/uploaded_photo.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';

import '../clubs/clubs_test_helpers.dart'
    show FakeClubsRepository, seededClubsRepository;
import '../test_pump_helpers.dart';
import 'event_viewer_state_fixtures.dart';
import 'events_test_helpers.dart';

void main() {
  group('EventDetailScreen', () {
    test('stores the route arguments', () {
      final event = buildEvent();
      final screen = EventDetailScreen(
        enableMapNetworkTiles: false,
        clubId: 'club-1',
        eventId: 'event-1',
        initialEvent: event,
      );

      expect(screen.clubId, 'club-1');
      expect(screen.eventId, 'event-1');
      expect(screen.initialEvent, event);
    });

    testWidgets('renders the loading state', (tester) async {
      await pumpEventsTestApp(
        tester,
        const EventDetailScreen(
          enableMapNetworkTiles: false,
          clubId: 'club-1',
          eventId: 'event-1',
        ),
        overrides: [
          clubsRepositoryProvider.overrideWithValue(FakeClubsRepository()),
          eventDetailViewModelProvider(
            'event-1',
          ).overrideWith((ref) => const AsyncLoading()),
        ],
      );

      expect(find.byType(CatchScaffold), findsOneWidget);
      expect(find.byType(CatchSkeleton), findsWidgets);
      expect(find.byType(CircularProgressIndicator), findsNothing);
    });

    testWidgets('uses initialEvent while live data is still loading', (
      tester,
    ) async {
      final event = buildEvent(meetingPoint: 'Marine Drive');

      await pumpEventsTestApp(
        tester,
        EventDetailScreen(
          enableMapNetworkTiles: false,
          clubId: 'club-1',
          eventId: 'event-1',
          initialEvent: event,
        ),
        signedInUid: null,
        overrides: [
          uidProvider.overrideWith((ref) => Stream.value(null)),
          fetchClubProvider('club-1').overrideWith((ref) async => buildClub()),
          eventDetailViewModelProvider(
            'event-1',
          ).overrideWith((ref) => const AsyncLoading()),
        ],
      );

      expect(find.byType(EventDetailBody), findsOneWidget);
      expect(find.text(event.title), findsWidgets);
      expect(find.byType(EventDetailHostsSkeleton), findsOneWidget);
      expect(find.byType(EventDetailSocialSkeleton), findsOneWidget);
      expect(find.byType(CatchSkeleton), findsWidgets);
      expect(find.byType(CircularProgressIndicator), findsNothing);
      expect(find.byTooltip('Share event'), findsNothing);
      expect(find.byTooltip('Add to calendar'), findsNothing);
      expect(find.byTooltip('Save event'), findsOneWidget);
      expect(find.text('Sign in to book this event'), findsOneWidget);
    });

    testWidgets(
      'initial event does not impersonate a guest while auth resolves',
      (tester) async {
        final event = buildEvent(meetingPoint: 'Marine Drive');

        await pumpEventsTestApp(
          tester,
          EventDetailScreen(
            enableMapNetworkTiles: false,
            clubId: 'club-1',
            eventId: 'event-1',
            initialEvent: event,
          ),
          signedInUid: null,
          overrides: [
            uidProvider.overrideWithValue(const AsyncLoading<String?>()),
            fetchClubProvider(
              'club-1',
            ).overrideWith((ref) async => buildClub()),
            eventDetailViewModelProvider(
              'event-1',
            ).overrideWith((ref) => const AsyncLoading()),
          ],
        );

        expect(find.byType(EventDetailBody), findsNothing);
        expect(find.byType(CatchSkeleton), findsWidgets);
        expect(find.text('Sign in to book this event'), findsNothing);
      },
    );

    testWidgets('renders the error state', (tester) async {
      await pumpEventsTestApp(
        tester,
        const EventDetailScreen(
          enableMapNetworkTiles: false,
          clubId: 'club-1',
          eventId: 'event-1',
        ),
        overrides: [
          clubsRepositoryProvider.overrideWithValue(FakeClubsRepository()),
          eventDetailViewModelProvider('event-1').overrideWith(
            (ref) => AsyncError(StateError('boom'), StackTrace.empty),
          ),
        ],
      );

      expect(
        find.text('Something went wrong. Please try again.'),
        findsWidgets,
      );
    });

    testWidgets('renders the missing state', (tester) async {
      await pumpEventsTestApp(
        tester,
        const EventDetailScreen(
          enableMapNetworkTiles: false,
          clubId: 'club-1',
          eventId: 'event-1',
        ),
        overrides: [
          clubsRepositoryProvider.overrideWithValue(FakeClubsRepository()),
          eventDetailViewModelProvider(
            'event-1',
          ).overrideWith((ref) => const AsyncData(null)),
        ],
      );

      expect(find.text('Event not found'), findsOneWidget);
      expect(find.text('This event is no longer available.'), findsOneWidget);
    });

    testWidgets('renders the offline state with recovery', (tester) async {
      await pumpEventsTestApp(
        tester,
        const EventDetailScreen(
          enableMapNetworkTiles: false,
          clubId: 'club-1',
          eventId: 'event-1',
        ),
        overrides: [
          clubsRepositoryProvider.overrideWithValue(FakeClubsRepository()),
          eventDetailViewModelProvider('event-1').overrideWith(
            (ref) => AsyncError(
              StateError('No network connection for Event Detail'),
              StackTrace.empty,
            ),
          ),
        ],
      );

      expect(find.byType(CatchScaffold), findsOneWidget);
      final body = tester.widget<CatchErrorState>(find.byType(CatchErrorState));
      expect(body.onRetry, isNotNull);
    });

    testWidgets('renders the loaded state at text scale 2', (tester) async {
      final media = MediaQueryData.fromView(
        tester.view,
      ).copyWith(textScaler: const TextScaler.linear(2));

      await pumpEventsTestApp(
        tester,
        MediaQuery(
          data: media,
          child: const EventDetailScreen(clubId: 'club-1', eventId: 'event-1'),
        ),
        viewerState: viewerFixture(),
        overrides: [
          clubsRepositoryProvider.overrideWithValue(FakeClubsRepository()),
          eventDetailViewModelProvider('event-1').overrideWith(
            (ref) => AsyncData(
              EventDetailViewModel(
                event: buildEvent(),
                userProfile: buildUser(),
                reviews: const [],
                isAuthenticated: true,
                isHost: false,
                isSaved: false,
                participation: null,
              ),
            ),
          ),
          paymentRepositoryProvider.overrideWithValue(FakePaymentRepository()),
        ],
      );

      final body = tester.element(find.byType(EventDetailBody));
      expect(MediaQuery.textScalerOf(body).scale(1), 2);
    });

    testWidgets('renders the loaded state with reduced motion', (tester) async {
      final media = MediaQueryData.fromView(
        tester.view,
      ).copyWith(disableAnimations: true);

      await pumpEventsTestApp(
        tester,
        MediaQuery(
          data: media,
          child: const EventDetailScreen(
            enableMapNetworkTiles: false,
            clubId: 'club-1',
            eventId: 'event-1',
          ),
        ),
        viewerState: viewerFixture(),
        overrides: [
          clubsRepositoryProvider.overrideWithValue(FakeClubsRepository()),
          eventDetailViewModelProvider('event-1').overrideWith(
            (ref) => AsyncData(
              EventDetailViewModel(
                event: buildEvent(),
                userProfile: buildUser(),
                reviews: const [],
                isAuthenticated: true,
                isHost: false,
                isSaved: false,
                participation: null,
              ),
            ),
          ),
          paymentRepositoryProvider.overrideWithValue(FakePaymentRepository()),
        ],
      );

      final body = tester.element(find.byType(EventDetailBody));
      expect(MediaQuery.disableAnimationsOf(body), isTrue);
    });

    testWidgets('renders the loaded state', (tester) async {
      await pumpEventsTestApp(
        tester,
        const EventDetailScreen(
          enableMapNetworkTiles: false,
          clubId: 'club-1',
          eventId: 'event-1',
        ),
        viewerState: viewerFixture(reason: 'past'),
        overrides: [
          clubsRepositoryProvider.overrideWithValue(FakeClubsRepository()),
          eventDetailViewModelProvider('event-1').overrideWith(
            (ref) => AsyncData(
              EventDetailViewModel(
                event: buildEvent(
                  startTime: DateTime(2025, 4, 23, 18),
                  endTime: DateTime(2025, 4, 23, 19),
                ),
                userProfile: buildUser(),
                reviews: const [],
                isAuthenticated: true,
                isHost: false,
                isSaved: false,
                participation: null,
              ),
            ),
          ),
          paymentRepositoryProvider.overrideWithValue(FakePaymentRepository()),
        ],
      );

      expect(find.text('Wednesday Evening Run'), findsWidgets);
      await tester.scrollUntilVisible(
        find.text('GOOD TO KNOW'),
        400,
        scrollable: verticalScroll(const ValueKey('event_detail.scroll_view')),
      );
      expect(find.textContaining('Attendance matters'), findsOneWidget);
      expect(find.text('What to expect'), findsNothing);
      expect(find.text('Booking policy'), findsNothing);
    });
  });

  group('Event Detail section loading states', () {
    testWidgets('companion loading renders a callout skeleton', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: Builder(
              builder: (context) => EventCompanionCard(
                state: const EventDetailCompanionState.loading(),
                surfaceStyle: EventDetailSurfaceStyle.light(
                  CatchTokens.of(context),
                ),
                onOpen: () {},
                onRetry: () {},
              ),
            ),
          ),
        ),
      );

      expect(find.byType(EventDetailCompanionSkeleton), findsOneWidget);
      expect(find.byType(CatchSkeleton), findsWidgets);
      expect(find.byType(CircularProgressIndicator), findsNothing);
    });

    testWidgets('hosts loading renders the shared hosts skeleton', (
      tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: Builder(
              builder: (context) => EventDetailHostsSection(
                event: buildEvent(),
                state: const EventDetailHostState.loading(),
                onViewClub: (_) {},
                onMessageHost: (_, _) {},
                onRetry: () {},
                surfaceStyle: EventDetailSurfaceStyle.light(
                  CatchTokens.of(context),
                ),
              ),
            ),
          ),
        ),
      );

      expect(find.byType(EventDetailHostsSkeleton), findsOneWidget);
      expect(find.text('HOSTED BY'), findsOneWidget);
      expect(find.byType(CatchSkeleton), findsWidgets);
      expect(find.byType(CircularProgressIndicator), findsNothing);
    });
  });

  group('EventDetailCalloutCard', () {
    testWidgets('renders configured copy and forwards button context', (
      tester,
    ) async {
      BuildContext? actionContext;

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: Builder(
              builder: (context) => EventDetailCalloutCard(
                leadingIcon: CatchIcons.magic,
                title: 'Event companion',
                body: 'Use the companion after the event.',
                actionLabel: 'Open companion',
                actionIcon: CatchIcons.mobile,
                onAction: (context) {
                  actionContext = context;
                },
                surfaceStyle: EventDetailSurfaceStyle.light(
                  CatchTokens.of(context),
                ),
              ),
            ),
          ),
        ),
      );

      expect(find.text('Event companion'), findsOneWidget);
      expect(find.text('Use the companion after the event.'), findsOneWidget);

      await tester.tap(find.text('Open companion'));
      await tester.pump();

      expect(actionContext, isNotNull);
    });
  });

  group('EventDetailPhotoGrid', () {
    testWidgets('renders supplied photos without empty slots', (tester) async {
      final event = buildEvent().copyWith(
        eventPhotos: [
          UploadedPhoto.fromUpload(
            url: 'https://example.test/event-photo.jpg',
            storagePath: 'events/event-1/photos/photo-0.jpg',
            position: 0,
            now: DateTime(2026, 6, 15),
          ),
        ],
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: SizedBox(
              width: 360,
              child: EventDetailPhotoGrid(event: event),
            ),
          ),
        ),
      );

      expect(find.text('EVENT PHOTOS'), findsOneWidget);
      expect(find.text('1 UPLOADED'), findsOneWidget);
      expect(
        find.byKey(const ValueKey('event-photo-strip-tile-0')),
        findsOneWidget,
      );
      expect(
        find.byKey(const ValueKey('event-photo-strip-tile-1')),
        findsNothing,
      );
      expect(
        find.byKey(const ValueKey('event-photo-strip-tile-2')),
        findsNothing,
      );
      expect(
        find.byKey(const ValueKey('event-photo-strip-image-0')),
        findsOneWidget,
      );
      expect(
        find.byKey(const ValueKey('event-photo-strip-placeholder-1')),
        findsNothing,
      );
      expect(
        find.byKey(const ValueKey('event-photo-strip-placeholder-2')),
        findsNothing,
      );
    });
  });

  group('EventDetailHeroTopBar', () {
    testWidgets('uses canonical outer gutters and action gaps', (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(390, 800);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: CustomScrollView(
              slivers: [
                EventDetailHeroTopBar(
                  event: buildEvent(),
                  isSaved: false,
                  savePending: false,
                  onBack: () {},
                  onShare: (_) {},
                  showAddToCalendar: true,
                  onAddToCalendar: (_) {},
                  onToggleSaved: () {},
                ),
                const SliverToBoxAdapter(child: SizedBox(height: 900)),
              ],
            ),
          ),
        ),
      );
      await tester.pump();

      final back = tester.getRect(find.byTooltip('Back'));
      final share = tester.getRect(find.byTooltip('Share event'));
      final calendar = tester.getRect(find.byTooltip('Add to calendar'));
      final save = tester.getRect(find.byTooltip('Save event'));

      expect(back.left, CatchSpacing.screenPx);
      expect(390 - save.right, CatchSpacing.screenPx);
      expect(calendar.left - share.right, CatchSpacing.s2);
      expect(save.left - calendar.right, CatchSpacing.s2);
      expect(find.byType(CatchTopBarActionRow), findsOneWidget);
    });

    testWidgets('reveals the event title in the collapsed toolbar', (
      tester,
    ) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(430, 800);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);

      final event = buildEvent(
        startTime: DateTime(2026, 5, 28, 1, 42),
        endTime: DateTime(2026, 5, 28, 2, 42),
      );
      var saved = false;

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: CustomScrollView(
              slivers: [
                EventDetailHeroTopBar(
                  event: event,
                  isSaved: false,
                  savePending: false,
                  onBack: () {},
                  onShare: (_) {},
                  showAddToCalendar: false,
                  onAddToCalendar: (_) {},
                  onToggleSaved: () => saved = true,
                ),
                const SliverToBoxAdapter(child: SizedBox(height: 900)),
              ],
            ),
          ),
        ),
      );
      await tester.pump();

      expect(
        find.byKey(const ValueKey('event-detail-collapsed-title')),
        findsNothing,
      );

      await tester.drag(find.byType(CustomScrollView), const Offset(0, -320));
      await tester.pump();

      final collapsedTitle = find.byKey(
        const ValueKey('event-detail-collapsed-title'),
      );
      expect(collapsedTitle, findsOneWidget);
      expect(tester.getTopLeft(collapsedTitle).dy, lessThan(96));

      await tester.tap(find.byTooltip('Save event'));
      await tester.pump();
      expect(saved, true);
    });

    testWidgets('keeps the expanded hero title-only', (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(430, 800);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);

      final event = buildEvent(
        startTime: DateTime(2026, 5, 28, 7, 30),
        endTime: DateTime(2026, 5, 28, 8, 45),
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: CustomScrollView(
              slivers: [
                EventDetailHeroTopBar(
                  event: event,
                  isSaved: true,
                  savePending: false,
                  onBack: () {},
                  onShare: (_) {},
                  showAddToCalendar: true,
                  onAddToCalendar: (_) {},
                  onToggleSaved: () {},
                ),
                const SliverToBoxAdapter(child: SizedBox(height: 900)),
              ],
            ),
          ),
        ),
      );
      await tester.pump();

      expect(find.text('Thursday Morning Run'), findsOneWidget);
      expect(find.textContaining('THU'), findsNothing);
      expect(find.textContaining('7:30'), findsNothing);
      expect(find.text("You're in"), findsNothing);
      expect(find.text('Saved'), findsNothing);
      expect(find.byTooltip('Share event'), findsOneWidget);
      expect(find.byTooltip('Add to calendar'), findsOneWidget);
      expect(find.byTooltip('Unsave event'), findsOneWidget);
    });

    testWidgets('prefers event photos across detail hero presentations', (
      tester,
    ) async {
      final event = buildEvent(
        photoUrl: 'https://example.com/event-detail-photo.jpg',
      );

      Future<void> pumpHero(EventDetailPresentationMode mode) async {
        await tester.pumpWidget(
          MaterialApp(
            theme: AppTheme.light,
            home: Scaffold(
              body: CustomScrollView(
                slivers: [
                  EventDetailHeroTopBar(
                    event: event,
                    isSaved: false,
                    savePending: false,
                    onBack: () {},
                    onShare: (_) {},
                    showAddToCalendar: false,
                    onAddToCalendar: (_) {},
                    onToggleSaved: () {},
                    presentationMode: mode,
                  ),
                  const SliverToBoxAdapter(child: SizedBox(height: 900)),
                ],
              ),
            ),
          ),
        );
      }

      for (final mode in EventDetailPresentationMode.values) {
        await pumpHero(mode);
        final thumbnail = tester.widget<EventThumbnail>(
          find.byType(EventThumbnail),
        );
        expect(
          thumbnail.photoUrl,
          'https://example.com/event-detail-photo.jpg',
        );
        expect(thumbnail.preferActivityArtwork, isFalse);
      }
    });

    testWidgets('uses semantic expanded heights for detail presentations', (
      tester,
    ) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(430, 800);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);

      final event = buildEvent();

      Future<void> pumpHero(EventDetailPresentationMode mode) async {
        await tester.pumpWidget(
          MaterialApp(
            theme: AppTheme.light,
            home: Scaffold(
              body: CustomScrollView(
                slivers: [
                  EventDetailHeroTopBar(
                    event: event,
                    isSaved: false,
                    savePending: false,
                    onBack: () {},
                    onShare: (_) {},
                    showAddToCalendar: false,
                    onAddToCalendar: (_) {},
                    onToggleSaved: () {},
                    presentationMode: mode,
                  ),
                  const SliverToBoxAdapter(child: SizedBox(height: 900)),
                ],
              ),
            ),
          ),
        );
      }

      await pumpHero(EventDetailPresentationMode.standard);
      final standardHeight =
          (430 * CatchLayout.eventDetailHeroStandardHeightRatio)
              .clamp(
                CatchLayout.eventDetailHeroStandardMinHeight,
                CatchLayout.eventDetailHeroStandardMaxHeight,
              )
              .toDouble();
      expect(
        tester.widget<SliverAppBar>(find.byType(SliverAppBar)).expandedHeight,
        standardHeight,
      );

      await pumpHero(EventDetailPresentationMode.ticket);
      expect(
        tester.widget<SliverAppBar>(find.byType(SliverAppBar)).expandedHeight,
        CatchLayout.eventDetailHeroTicketPhoneHeight,
      );

      await pumpHero(EventDetailPresentationMode.spotlightDark);
      expect(
        tester.widget<SliverAppBar>(find.byType(SliverAppBar)).expandedHeight,
        CatchLayout.eventDetailHeroTicketPhoneHeight,
      );
    });
  });

  group('EventDetailBody', () {
    testWidgets('renders overview detail sections for attended events', (
      tester,
    ) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(430, 3000);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);
      final user = buildUser();
      final event = buildEvent(
        constraints: const EventConstraints(minAge: 21, maxAge: 35),
      );

      await pumpEventsTestApp(
        tester,
        _eventDetailBody(
          event: event,
          userProfile: user,
          clubId: 'club-1',
          isHost: false,
          reviews: const [],
          isAuthenticated: true,
          isSaved: false,
          participation: _participation(
            status: EventParticipationStatus.attended,
          ),
          companionState: const EventDetailCompanionState.available(),
        ),
        overrides: [
          clubsRepositoryProvider.overrideWithValue(FakeClubsRepository()),
          paymentRepositoryProvider.overrideWithValue(FakePaymentRepository()),
        ],
      );

      expect(find.text(event.title), findsWidgets);
      await _scrollEventDetailUntilVisible(tester, find.text('GOOD TO KNOW'));
      expect(find.textContaining('Requirements'), findsOneWidget);
      expect(find.text('About this event'), findsOneWidget);
      expect(find.text(event.description), findsOneWidget);
      expect(find.text('Event companion'), findsOneWidget);
      expect(find.text('Open companion'), findsOneWidget);
    });

    testWidgets('hides the companion entry until the host saves setup', (
      tester,
    ) async {
      final event = buildEvent();

      await pumpEventsTestApp(
        tester,
        _eventDetailBody(
          event: event,
          userProfile: buildUser(),
          clubId: 'club-1',
          isHost: false,
          reviews: const [],
          isAuthenticated: true,
          isSaved: false,
          participation: _participation(),
        ),
        overrides: [
          clubsRepositoryProvider.overrideWithValue(FakeClubsRepository()),
          paymentRepositoryProvider.overrideWithValue(FakePaymentRepository()),
          watchEventSuccessPlanProvider(
            event.id,
          ).overrideWith((ref) => Stream.value(null)),
        ],
      );

      expect(find.text('Event companion'), findsNothing);
      expect(find.text('Open companion'), findsNothing);
    });

    testWidgets('does not unlock reviews for stale future attendance data', (
      tester,
    ) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(430, 6000);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);
      final now = DateTime(2026, 5, 13, 19);
      final futureStart = DateTime(2026, 5, 14, 3, 10);
      final event = buildEvent(
        startTime: futureStart,
        endTime: futureStart.add(const Duration(hours: 1)),
      );

      await pumpEventsTestApp(
        tester,
        _eventDetailBody(
          event: event,
          userProfile: buildUser(),
          clubId: 'club-1',
          isHost: false,
          reviews: const [],
          isAuthenticated: true,
          isSaved: false,
          participation: _participation(
            status: EventParticipationStatus.attended,
          ),
          now: now,
        ),
        overrides: [
          clubsRepositoryProvider.overrideWithValue(FakeClubsRepository()),
          paymentRepositoryProvider.overrideWithValue(FakePaymentRepository()),
          watchEventSuccessPlanProvider(
            event.id,
          ).overrideWith((ref) => Stream.value(null)),
        ],
      );

      final body = tester.widget<EventDetailBody>(find.byType(EventDetailBody));
      expect(body.socialState.reviews.mode, EventDetailReviewsMode.hidden);
      expect(find.text('REVIEWS'), findsNothing);
      expect(find.text('Write a review'), findsNothing);
      expect(find.text('Edit your review'), findsNothing);
    });

    testWidgets('route renders guest roster prompt and sign-in CTA', (
      tester,
    ) async {
      final event = buildEvent();
      await pumpEventsTestApp(
        tester,
        EventDetailScreen(
          enableMapNetworkTiles: false,
          clubId: event.clubId,
          eventId: event.id,
        ),
        signedInUid: null,
        overrides: [
          clubsRepositoryProvider.overrideWithValue(
            seededClubsRepository(buildClub(id: event.clubId)),
          ),
          eventDetailViewModelProvider(event.id).overrideWith(
            (ref) => AsyncData(
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
        ],
      );
      await _scrollEventDetailUntilVisible(
        tester,
        find.text('Sign in to see who has booked this event.'),
      );

      expect(find.text(event.title), findsWidgets);
      expect(
        find.text('Sign in to see who has booked this event.'),
        findsOneWidget,
      );
      expect(find.text('Sign in to book this event'), findsOneWidget);
      expect(find.text('Reviews'), findsNothing);
      expect(find.text('Write a review'), findsNothing);
    });

    testWidgets(
      'route gates a non-null incomplete profile from booking and saving',
      (tester) async {
        final event = buildEvent();
        final incompleteProfile = buildUser().copyWith(
          phoneNumber: '',
          interestedInGenders: const [],
          profileComplete: false,
        );
        final router = GoRouter(
          initialLocation: '/detail',
          routes: [
            GoRoute(
              path: '/detail',
              builder: (context, state) => EventDetailScreen(
                enableMapNetworkTiles: false,
                clubId: event.clubId,
                eventId: event.id,
              ),
            ),
            GoRoute(
              path: Routes.onboardingScreen.path,
              builder: (context, state) => const Text(
                'Profile completion route',
                textDirection: TextDirection.ltr,
              ),
            ),
          ],
        );
        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              uidProvider.overrideWith((ref) => Stream.value('runner-1')),
              clubsRepositoryProvider.overrideWithValue(
                seededClubsRepository(buildClub(id: event.clubId)),
              ),
              eventDetailViewModelProvider(event.id).overrideWith(
                (ref) => AsyncData(
                  EventDetailViewModel(
                    event: event,
                    userProfile: incompleteProfile,
                    reviews: const [],
                    isAuthenticated: true,
                    isHost: false,
                    isSaved: false,
                    participation: null,
                  ),
                ),
              ),
              paymentRepositoryProvider.overrideWithValue(
                FakePaymentRepository(),
              ),
            ],
            child: MaterialApp.router(
              theme: AppTheme.light,
              routerConfig: router,
            ),
          ),
        );
        await tester.pump();
        expect(find.text('Complete booking profile'), findsOneWidget);
        expect(find.byType(EventDetailDock), findsNothing);

        await tester.tap(find.byTooltip('Save event'));
        await pumpFeatureUi(tester);
        expect(find.text('Profile completion route'), findsOneWidget);
      },
    );

    testWidgets('does not render a host bottom action footer', (tester) async {
      final event = buildEvent();
      await pumpEventsTestApp(
        tester,
        _eventDetailBody(
          event: event,
          userProfile: buildUser(uid: 'host-1'),
          clubId: 'club-1',
          isHost: true,
          reviews: const [],
          isAuthenticated: true,
          isSaved: false,
          participation: null,
        ),
        overrides: [
          clubsRepositoryProvider.overrideWithValue(FakeClubsRepository()),
          paymentRepositoryProvider.overrideWithValue(FakePaymentRepository()),
        ],
      );
      expect(find.text(event.title), findsWidgets);
      expect(find.text('HOST TOOLS'), findsNothing);
      expect(find.text('Manage event'), findsNothing);
      expect(find.text('Take attendance'), findsNothing);
      expect(find.text('Join event — 20 spots left'), findsNothing);
    });

    testWidgets('route shows a full-screen celebration after booking', (
      tester,
    ) async {
      await pumpEventsTestApp(
        tester,
        const EventDetailScreen(
          enableMapNetworkTiles: false,
          clubId: 'club-1',
          eventId: 'event-1',
        ),
        viewerState: viewerFixture(),
        overrides: [
          clubsRepositoryProvider.overrideWithValue(
            seededClubsRepository(buildClub()),
          ),
          eventDetailViewModelProvider('event-1').overrideWith(
            (ref) => AsyncData(
              EventDetailViewModel(
                event: buildEvent(),
                userProfile: buildUser(),
                reviews: const [],
                isAuthenticated: true,
                isHost: false,
                isSaved: false,
                participation: null,
              ),
            ),
          ),
          paymentRepositoryProvider.overrideWithValue(FakePaymentRepository()),
        ],
      );
      await tester.tap(find.text('Join event — 20 spots left'));
      await pumpFeatureUi(tester);
      expect(find.text('BOOKING CONFIRMED'), findsOneWidget);
      expect(find.text("You're in."), findsOneWidget);
      expect(find.text('View event'), findsOneWidget);
    });

    testWidgets('route shows a snackbar after cancelling a booking', (
      tester,
    ) async {
      final fakeEventRepository = FakeEventRepository();
      await pumpEventsTestApp(
        tester,
        const EventDetailScreen(
          enableMapNetworkTiles: false,
          clubId: 'club-1',
          eventId: 'event-1',
        ),
        viewerState: viewerFixture(admission: 'nativeParticipation'),
        overrides: [
          clubsRepositoryProvider.overrideWithValue(
            seededClubsRepository(buildClub()),
          ),
          eventRepositoryProvider.overrideWith((ref) => fakeEventRepository),
          eventDetailViewModelProvider('event-1').overrideWith(
            (ref) => AsyncData(
              EventDetailViewModel(
                event: buildEvent(bookedCount: 1),
                userProfile: buildUser(),
                reviews: const [],
                isAuthenticated: true,
                isHost: false,
                isSaved: false,
                participation: _participation(),
              ),
            ),
          ),
          paymentRepositoryProvider.overrideWithValue(FakePaymentRepository()),
          watchEventSuccessPlanProvider(
            'event-1',
          ).overrideWith((ref) => Stream.value(null)),
        ],
      );
      await tester.tap(find.text('Cancel booking'));
      await tester.pump();
      expect(find.text('Booking cancelled.'), findsOneWidget);
    });

    testWidgets('top action buttons are tappable and the back button pops', (
      tester,
    ) async {
      final event = buildEvent();
      var sharedEventId = '';
      CalendarEventPayload? calendarEvent;
      var saveTapped = false;

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            clubsRepositoryProvider.overrideWithValue(FakeClubsRepository()),
            paymentRepositoryProvider.overrideWithValue(
              FakePaymentRepository(),
            ),
            watchEventSuccessPlanProvider(
              'event-1',
            ).overrideWith((ref) => Stream.value(null)),
          ],
          child: MaterialApp(
            theme: AppTheme.light.copyWith(platform: TargetPlatform.iOS),
            initialRoute: '/detail',
            routes: {
              '/': (context) =>
                  const Scaffold(body: Center(child: Text('Home'))),
              '/detail': (context) => _eventDetailBody(
                event: event,
                userProfile: buildUser(),
                clubId: 'club-1',
                isHost: false,
                reviews: const [],
                isAuthenticated: true,
                isSaved: false,
                participation: _participation(),
                showAddToCalendar: true,
                onBack: () => Navigator.of(context).pop(),
                onShare: (_) {
                  sharedEventId = event.id;
                },
                onAddToCalendar: (_) {
                  calendarEvent = calendarEventPayloadForEvent(event);
                },
                onToggleSaved: () {
                  saveTapped = true;
                },
              ),
            },
          ),
        ),
      );
      await tester.pump();
      expect(find.byTooltip('Back'), findsOneWidget);
      expect(find.byTooltip('Share event'), findsOneWidget);
      expect(
        find.descendant(
          of: find.byTooltip('Share event'),
          matching: find.byIcon(CatchIcons.platformShare(platform: .iOS)),
        ),
        findsOneWidget,
      );
      expect(
        find.descendant(
          of: find.byTooltip('Share event'),
          matching: find.byIcon(CatchIcons.share),
        ),
        findsNothing,
      );
      expect(find.byTooltip('Add to calendar'), findsOneWidget);
      expect(find.byTooltip('Save event'), findsOneWidget);
      await tester.tap(find.byTooltip('Share event'));
      await tester.pump();
      await tester.tap(find.byTooltip('Add to calendar'));
      await tester.pump();
      await tester.tap(find.byTooltip('Save event'));
      await tester.pump();
      await tester.tap(find.byTooltip('Back'));
      await _pumpUntilFound(tester, find.text('Home'));

      expect(sharedEventId, 'event-1');
      expect(calendarEvent?.title, event.title);
      expect(saveTapped, isTrue);
      expect(find.text('Home'), findsOneWidget);
    });

    testWidgets('booked attendee invite card shares a rich event invite', (
      tester,
    ) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(430, 2600);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);
      ShareParams? sharedParams;
      final event = buildEvent(
        meetingPoint: 'Bandra',
        startTime: DateTime(2026, 6, 1, 18),
        endTime: DateTime(2026, 6, 1, 20),
      );

      await pumpEventsTestApp(
        tester,
        _eventDetailBody(
          event: event,
          userProfile: buildUser(),
          clubId: 'club-1',
          isHost: false,
          reviews: const [],
          isAuthenticated: true,
          isSaved: false,
          participation: _participation(),
          inviteCode: 'VIP42',
          inviteLinkId: 'invite-link-1',
          onShare: (buttonContext) => unawaited(
            showEventShareCardSheet(
              buttonContext,
              event: event,
              share: ProviderScope.containerOf(
                buttonContext,
                listen: false,
              ).read(externalShareControllerProvider),
              inviteCode: 'VIP42',
              inviteLinkId: 'invite-link-1',
            ),
          ),
          now: DateTime(2026, 5, 25),
        ),
        overrides: [
          clubsRepositoryProvider.overrideWithValue(FakeClubsRepository()),
          paymentRepositoryProvider.overrideWithValue(FakePaymentRepository()),
          watchEventSuccessPlanProvider(
            event.id,
          ).overrideWith((ref) => Stream.value(null)),
          externalShareLauncherProvider.overrideWithValue((params) async {
            sharedParams = params;
          }),
        ],
      );

      await _scrollEventDetailUntilVisible(
        tester,
        find.text('Bring someone into the room'),
      );
      await tester.tap(find.text('Invite a friend'));
      await pumpFeatureUi(tester);

      expect(sharedParams, isNull);
      expect(find.byKey(CatchShareCardSheet.cardPreviewKey), findsOneWidget);
      expect(find.byType(EventShareCard), findsOneWidget);
      expect(find.text('CATCH INVITE'), findsOneWidget);

      await tester.tap(find.byKey(CatchShareCardSheet.shareButtonKey));
      await tester.pump();
      await pumpFeatureUi(tester);
      await tester.runAsync(() async {
        for (var i = 0; i < 20 && sharedParams == null; i++) {
          await Future<void>.delayed(const Duration(milliseconds: 10));
        }
      });

      expect(sharedParams?.subject, 'Join me at ${event.title}');
      expect(sharedParams?.text, contains(event.title));
      expect(sharedParams?.text, contains('Bandra'));
      expect(sharedParams?.text, contains('invite=VIP42'));
      expect(sharedParams?.text, contains('il=invite-link-1'));
      expect(sharedParams?.files, hasLength(1));
      expect(sharedParams?.fileNameOverrides, ['catch-event-invite.png']);
    });

    testWidgets('route saved event button renders selected and unsaves', (
      tester,
    ) async {
      final fakeSavedEventRepository = FakeSavedEventRepository();

      await pumpEventsTestApp(
        tester,
        const EventDetailScreen(
          enableMapNetworkTiles: false,
          clubId: 'club-1',
          eventId: 'event-1',
        ),
        viewerState: viewerFixture(),
        overrides: [
          clubsRepositoryProvider.overrideWithValue(FakeClubsRepository()),
          eventDetailViewModelProvider('event-1').overrideWith(
            (ref) => AsyncData(
              EventDetailViewModel(
                event: buildEvent(),
                userProfile: buildUser(),
                reviews: const [],
                isAuthenticated: true,
                isHost: false,
                isSaved: true,
                participation: null,
              ),
            ),
          ),
          paymentRepositoryProvider.overrideWithValue(FakePaymentRepository()),
          savedEventRepositoryProvider.overrideWithValue(
            fakeSavedEventRepository,
          ),
        ],
      );

      expect(find.byTooltip('Unsave event'), findsOneWidget);

      await tester.tap(find.byTooltip('Unsave event'));
      await tester.pump();

      expect(fakeSavedEventRepository.unsavedUid, 'runner-1');
      expect(fakeSavedEventRepository.unsavedEventId, 'event-1');
      expect(find.text('Event removed.'), findsOneWidget);
    });

    testWidgets('route saved event button surfaces save failures', (
      tester,
    ) async {
      final fakeSavedEventRepository = FakeSavedEventRepository()
        ..throwOnSave = true;

      await pumpEventsTestApp(
        tester,
        const EventDetailScreen(
          enableMapNetworkTiles: false,
          clubId: 'club-1',
          eventId: 'event-1',
        ),
        viewerState: viewerFixture(),
        overrides: [
          clubsRepositoryProvider.overrideWithValue(FakeClubsRepository()),
          eventDetailViewModelProvider('event-1').overrideWith(
            (ref) => AsyncData(
              EventDetailViewModel(
                event: buildEvent(),
                userProfile: buildUser(),
                reviews: const [],
                isAuthenticated: true,
                isHost: false,
                isSaved: false,
                participation: null,
              ),
            ),
          ),
          paymentRepositoryProvider.overrideWithValue(FakePaymentRepository()),
          savedEventRepositoryProvider.overrideWithValue(
            fakeSavedEventRepository,
          ),
        ],
      );

      await tester.tap(find.byTooltip('Save event'));
      await pumpFeatureUi(tester);

      expect(fakeSavedEventRepository.savedUid, isNull);
      expect(
        find.text('Something went wrong. Please try again.'),
        findsWidgets,
      );
    });

    testWidgets('location tap opens the in-app event map', (tester) async {
      final event = buildEvent(
        meetingPoint: 'Race Course Road main gate',
        startingPointLat: 22.7196,
        startingPointLng: 75.8577,
      );
      final router = GoRouter(
        initialLocation: '/detail',
        routes: [
          GoRoute(
            path: '/detail',
            builder: (context, state) => _eventDetailBody(
              event: event,
              userProfile: buildUser(),
              clubId: 'club-1',
              isHost: false,
              reviews: const [],
              isAuthenticated: true,
              isSaved: false,
              participation: null,
              onLocationTap: () => context.pushNamed(
                Routes.eventLocationMapScreen.name,
                pathParameters: {'eventId': event.id},
              ),
            ),
          ),
          GoRoute(
            path: Routes.eventLocationMapScreen.path,
            name: Routes.eventLocationMapScreen.name,
            builder: (context, state) => EventLocationMapRouteScreen(
              eventId: state.pathParameters['eventId']!,
              enableNetworkTiles: false,
            ),
          ),
        ],
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            clubsRepositoryProvider.overrideWithValue(FakeClubsRepository()),
            paymentRepositoryProvider.overrideWithValue(
              FakePaymentRepository(),
            ),
            eventDetailViewModelProvider('event-1').overrideWith(
              (ref) => AsyncData(
                EventDetailViewModel(
                  event: event,
                  userProfile: buildUser(),
                  reviews: const [],
                  isAuthenticated: true,
                  isHost: false,
                  isSaved: false,
                  participation: null,
                ),
              ),
            ),
          ],
          child: MaterialApp.router(
            theme: AppTheme.light,
            routerConfig: router,
          ),
        ),
      );

      await tester.pump();
      final mapCard = find.byKey(const ValueKey('event-detail-map-event-1'));
      await tester.ensureVisible(mapCard);
      await tester.pump();
      await tester.tap(mapCard);
      await pumpFeatureUi(tester);

      expect(find.text('Event location'), findsNothing);
      expect(find.text('Get directions'), findsOneWidget);
    });
  });
}

Widget _eventDetailBody({
  required Event event,
  required UserProfile? userProfile,
  required String clubId,
  required List<Review> reviews,
  required bool isAuthenticated,
  required bool isHost,
  required bool isSaved,
  required EventParticipation? participation,
  EventDetailSectionVisibilityState? sectionVisibility,
  bool savePending = false,
  VoidCallback? onBack,
  ValueChanged<BuildContext>? onShare,
  bool showAddToCalendar = false,
  ValueChanged<BuildContext>? onAddToCalendar,
  VoidCallback? onToggleSaved,
  EventDetailCompanionState companionState =
      const EventDetailCompanionState.hidden(),
  EventDetailHostState hostState = const EventDetailHostState.hidden(),
  EventDetailSocialState? socialState,
  VoidCallback? onLocationTap,
  VoidCallback? onOpenCompanion,
  VoidCallback? onRetryCompanion,
  ValueChanged<String>? onViewClub,
  EventDetailMessageHostCallback? onMessageHost,
  VoidCallback? onRetryHosts,
  String? inviteCode,
  String? inviteLinkId,
  DateTime? now,
  EventDetailPresentationMode presentationMode =
      EventDetailPresentationMode.standard,
  Object? heroTag,
}) {
  final referenceNow = now ?? DateTime.now();
  return EventDetailBody(
    event: event,
    userProfile: userProfile,
    clubId: clubId,
    reviews: reviews,
    isAuthenticated: isAuthenticated,
    sectionVisibility:
        sectionVisibility ??
        eventDetailSectionVisibilityStateFrom(
          event: event,
          participation: participation,
          isHostApp: false,
          isHost: isHost,
          now: referenceNow,
        ),
    isSaved: isSaved,
    participation: participation,
    savePending: savePending,
    onBack: onBack ?? () {},
    onShare: onShare ?? (_) {},
    showAddToCalendar: showAddToCalendar,
    onAddToCalendar: onAddToCalendar ?? (_) {},
    onToggleSaved: onToggleSaved ?? () {},
    companionState: companionState,
    hostState: hostState,
    informationState: eventDetailInformationStateFrom(
      event: event,
      l10n: AppLocalizationsEn(),
    ),
    socialState:
        socialState ??
        eventDetailSocialStateFrom(
          event: event,
          hasReviews: reviews.isNotEmpty,
          userProfile: userProfile,
          isAuthenticated: isAuthenticated,
          renderAsHost:
              (sectionVisibility ??
                      eventDetailSectionVisibilityStateFrom(
                        event: event,
                        participation: participation,
                        isHostApp: false,
                        isHost: isHost,
                        now: referenceNow,
                      ))
                  .renderSocialAsHost,
          participation: participation,
          now: referenceNow,
        ),
    onLocationTap: onLocationTap,
    onOpenCompanion: onOpenCompanion ?? () {},
    onRetryCompanion: onRetryCompanion ?? () {},
    onViewClub: onViewClub ?? (_) {},
    onMessageHost: onMessageHost ?? (_, _) {},
    onRetryHosts: onRetryHosts ?? () {},
    inviteCode: inviteCode,
    inviteLinkId: inviteLinkId,
    now: referenceNow,
    enableMapNetworkTiles: false,
    presentationMode: presentationMode,
    heroTag: heroTag,
  );
}

Future<void> _pumpUntilFound(
  WidgetTester tester,
  Finder finder, {
  int maxFrames = 30,
}) async {
  for (var i = 0; i < maxFrames; i += 1) {
    await tester.pump();
    if (finder.evaluate().isNotEmpty) return;
  }
}

Future<void> _scrollEventDetailUntilVisible(
  WidgetTester tester,
  Finder finder,
) async {
  final scrollView = find.byKey(
    const ValueKey<String>('event_detail.scroll_view'),
  );
  for (var attempt = 0; attempt < 40; attempt += 1) {
    if (finder.evaluate().isNotEmpty) {
      await tester.ensureVisible(finder.first);
      await tester.pump();
      return;
    }
    await tester.drag(scrollView, const Offset(0, -240));
    await tester.pump();
  }
  throw TestFailure('Could not reveal $finder.');
}

EventParticipation _participation({
  String eventId = 'event-1',
  String uid = 'runner-1',
  EventParticipationStatus status = EventParticipationStatus.signedUp,
  EventJoinRequestStatus? hostApprovalStatus,
  EventWaitlistOfferStatus? waitlistOfferStatus,
  DateTime? waitlistOfferExpiresAt,
  String? waitlistOfferId,
}) {
  final now = DateTime(2026);
  return EventParticipation(
    id: eventParticipationId(eventId: eventId, uid: uid),
    eventId: eventId,
    clubId: 'club-1',
    uid: uid,
    status: status,
    createdAt: now,
    updatedAt: now,
    hostApprovalStatus: hostApprovalStatus,
    waitlistOfferStatus: waitlistOfferStatus,
    waitlistOfferExpiresAt: waitlistOfferExpiresAt,
    waitlistOfferId: waitlistOfferId,
  );
}
