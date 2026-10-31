import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizer_membership_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_membership.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/contexts/reviews/data/reviews_repository.dart';
import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import 'package:catch_dating_app/explore/presentation/explore_feed_providers.dart';
import 'package:catch_dating_app/explore/presentation/explore_feed_view_model.dart';
import 'package:catch_dating_app/explore/presentation/explore_screen.dart';
import 'package:catch_dating_app/organizers/presentation/detail/organizer_detail_screen.dart';
import 'package:catch_dating_app/organizers/presentation/detail/organizer_detail_view_model.dart';
import 'package:catch_dating_app/organizers/presentation/discovery/widgets/organizer_discover_list.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../test_pump_helpers.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  tearDown(AppConfig.resetEntrypointRoleOverrideForTesting);

  group('Clubs flow', () {
    testWidgets('club taps navigate with the required route param', (
      tester,
    ) async {
      final organizer = _buildOrganizer();
      final user = _buildUser(uid: 'runner-1');
      final router = GoRouter(
        initialLocation: Routes.exploreScreen.path,
        routes: [
          GoRoute(
            path: Routes.exploreScreen.path,
            builder: (_, _) => Scaffold(
              body: CustomScrollView(
                slivers: [
                  Builder(
                    builder: (context) => SliverMainAxisGroup(
                      slivers: buildOrganizerDirectorySlivers(
                        context: context,
                        organizers: [organizer],
                        joinedOrganizerIds: const {},
                      ),
                    ),
                  ),
                ],
              ),
            ),
            routes: [
              GoRoute(
                path: ':organizerId',
                name: Routes.organizerDetailScreen.name,
                builder: (_, state) => Text(
                  'Club ${state.pathParameters['organizerId']}',
                  textDirection: TextDirection.ltr,
                ),
              ),
            ],
          ),
        ],
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            watchUserProfileProvider.overrideWith((ref) => Stream.value(user)),
            watchOrganizersByLocationProvider(
              'mumbai',
            ).overrideWith((ref) => Stream.value([organizer])),
            uidProvider.overrideWith((ref) => Stream.value(user.uid)),
            watchActiveOrganizerMembershipsForUserProvider(
              user.uid,
            ).overrideWith(
              (ref) => Stream.value(const <OrganizerMembership>[]),
            ),
            exploreFeedViewModelProvider.overrideWithValue(
              const AsyncData(ExploreFeedViewModel(items: [])),
            ),
          ],
          child: MaterialApp.router(
            theme: AppTheme.light,
            routerConfig: router,
          ),
        ),
      );
      await _pumpOrganizerFlow(tester);

      await tester.ensureVisible(find.text(organizer.name));
      await _pumpOrganizerFlow(tester);
      await tester.tap(find.text(organizer.name));
      await _pumpOrganizerFlow(tester);

      expect(find.text('Club ${organizer.id}'), findsOneWidget);
    });

    testWidgets('guest join CTA opens phone auth with the club as from route', (
      tester,
    ) async {
      final organizer = _buildOrganizer();
      final router = GoRouter(
        initialLocation: Routes.organizerDetailScreen.path.replaceFirst(
          ':organizerId',
          organizer.id,
        ),
        routes: [
          GoRoute(
            path: Routes.authScreen.path,
            builder: (_, state) => Text(
              'Auth ${state.uri.queryParameters['from']}',
              textDirection: TextDirection.ltr,
            ),
          ),
          GoRoute(
            path: Routes.exploreScreen.path,
            builder: (_, _) => const ExploreScreen(),
            routes: [
              GoRoute(
                path: ':organizerId',
                name: Routes.organizerDetailScreen.name,
                builder: (_, state) => OrganizerDetailScreen(
                  organizerId: state.pathParameters['organizerId']!,
                  initialOrganizer: state.extra is Organizer
                      ? state.extra! as Organizer
                      : null,
                ),
              ),
            ],
          ),
        ],
      );
      addTearDown(router.dispose);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            uidProvider.overrideWith((ref) => Stream.value(null)),
            watchUserProfileProvider.overrideWith((ref) => Stream.value(null)),
            watchOrganizersByLocationProvider(
              'mumbai',
            ).overrideWith((ref) => Stream.value([organizer])),
            watchOrganizerProvider(
              organizer.id,
            ).overrideWith((ref) => Stream.value(organizer)),
            watchEventsForOrganizerProvider(
              organizer.id,
            ).overrideWith((ref) => Stream.value(const <Event>[])),
            watchReviewsForOrganizerProvider(
              organizer.id,
            ).overrideWith((ref) => Stream.value(const <Review>[])),
            exploreFeedViewModelProvider.overrideWithValue(
              const AsyncData(ExploreFeedViewModel(items: [])),
            ),
          ],
          child: MaterialApp.router(
            theme: AppTheme.light,
            routerConfig: router,
          ),
        ),
      );
      await _pumpOrganizerFlow(tester);

      expect(find.text('Sign in to follow'), findsOneWidget);
      await tester.tap(find.text('Sign in to follow'));
      await _pumpOrganizerFlow(tester);

      expect(find.text('Auth /organizers/${organizer.id}'), findsOneWidget);
    });

    testWidgets(
      'detail screen shows club-shaped skeleton while live data loads',
      (tester) async {
        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              organizerDetailViewModelProvider(
                'club-loading',
              ).overrideWithValue(
                const AsyncLoading<OrganizerDetailViewModel?>(),
              ),
            ],
            child: MaterialApp(
              theme: AppTheme.light,
              home: const OrganizerDetailScreen(organizerId: 'club-loading'),
            ),
          ),
        );
        await tester.pump();

        expect(find.byType(CatchScaffold), findsOneWidget);
        expect(find.byType(CatchStateViewport), findsOneWidget);
        expect(find.byType(CatchSkeleton), findsNothing);
        expect(find.byType(CircularProgressIndicator), findsOneWidget);
        expect(find.text('Club not found'), findsNothing);
      },
    );

    testWidgets(
      'detail screen can load from live data without navigation extra',
      (tester) async {
        final organizer = _buildOrganizer();

        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              watchOrganizerProvider(
                organizer.id,
              ).overrideWith((ref) => Stream.value(organizer)),
              watchEventsForOrganizerProvider(
                organizer.id,
              ).overrideWith((ref) => Stream.value(const <Event>[])),
              watchReviewsForOrganizerProvider(
                organizer.id,
              ).overrideWith((ref) => Stream.value(const <Review>[])),
              uidProvider.overrideWith((ref) => Stream.value(null)),
              watchUserProfileProvider.overrideWith(
                (ref) => Stream.value(null),
              ),
            ],
            child: MaterialApp(
              theme: AppTheme.light,
              home: OrganizerDetailScreen(organizerId: organizer.id),
            ),
          ),
        );
        await _pumpOrganizerFlow(tester);

        expect(find.text(organizer.name), findsOneWidget);
        expect(find.text('Club not found.'), findsNothing);
      },
    );

    testWidgets('host detail schedule opens the host event detail route', (
      tester,
    ) async {
      AppConfig.configureEntrypointRole(AppRole.host);
      final organizer = _buildOrganizer();
      final event = _buildEvent(id: 'event-7', organizerId: organizer.id);
      final router = GoRouter(
        initialLocation: Routes.hostOrganizerDetailScreen.path.replaceFirst(
          ':organizerId',
          organizer.id,
        ),
        routes: [
          GoRoute(
            path: Routes.hostOrganizerDetailScreen.path,
            name: Routes.hostOrganizerDetailScreen.name,
            builder: (_, state) =>
                OrganizerDetailScreen(organizerId: state.pathParameters['organizerId']!),
          ),
          GoRoute(
            path: Routes.hostAppEventDetailScreen.path,
            name: Routes.hostAppEventDetailScreen.name,
            builder: (_, state) => Text(
              'Host event ${state.pathParameters['organizerId']}/'
              '${state.pathParameters['eventId']}',
              textDirection: TextDirection.ltr,
            ),
          ),
        ],
      );
      addTearDown(router.dispose);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            organizerDetailViewModelProvider(organizer.id).overrideWithValue(
              AsyncData(
                OrganizerDetailViewModel(
                  organizer: organizer,
                  isHost: true,
                  isMember: false,
                  upcomingEvents: [event],
                  reviews: const <Review>[],
                  userProfile: _buildUser(uid: 'host-1'),
                  uid: 'host-1',
                  isAuthenticated: true,
                ),
              ),
            ),
            uidProvider.overrideWith((ref) => Stream.value('host-1')),
            watchUserProfileProvider.overrideWith(
              (ref) => Stream.value(_buildUser(uid: 'host-1')),
            ),
            watchOrganizerMembershipProvider(
              organizer.id,
              'host-1',
            ).overrideWith((ref) => Stream.value(null)),
          ],
          child: MaterialApp.router(
            theme: AppTheme.light,
            routerConfig: router,
          ),
        ),
      );
      await _pumpOrganizerFlow(tester);

      await tester.scrollUntilVisible(find.text(event.eventFormat.label), 500);
      await _pumpOrganizerFlow(tester);
      await tester.tap(find.text(event.eventFormat.label));
      await _pumpOrganizerFlow(tester);

      expect(
        find.text('Host event ${organizer.id}/${event.id}'),
        findsOneWidget,
      );
    });

    testWidgets(
      'detail screen refreshes membership UI when the membership stream updates',
      (tester) async {
        final organizer = _buildOrganizer();
        final controller = StreamController<Organizer?>.broadcast();
        final membershipController =
            StreamController<OrganizerMembership?>.broadcast();
        addTearDown(controller.close);
        addTearDown(membershipController.close);

        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              watchOrganizerProvider(
                organizer.id,
              ).overrideWith((ref) => controller.stream),
              watchEventsForOrganizerProvider(
                organizer.id,
              ).overrideWith((ref) => Stream.value(const <Event>[])),
              watchReviewsForOrganizerProvider(
                organizer.id,
              ).overrideWith((ref) => Stream.value(const <Review>[])),
              uidProvider.overrideWith((ref) => Stream.value('runner-2')),
              watchUserProfileProvider.overrideWith(
                (ref) => Stream.value(_buildUser(uid: 'runner-2')),
              ),
              watchOrganizerMembershipProvider(
                organizer.id,
                'runner-2',
              ).overrideWith((ref) => membershipController.stream),
            ],
            child: MaterialApp(
              theme: AppTheme.light,
              home: OrganizerDetailScreen(
                organizerId: organizer.id,
                initialOrganizer: organizer,
              ),
            ),
          ),
        );
        // Pump once so the provider subscribes to controller.stream, then emit initial value.
        await tester.pump();
        controller.add(organizer);
        membershipController.add(null);
        await _pumpOrganizerFlow(tester);

        expect(find.text('Follow organizer'), findsOneWidget);
        expect(find.text('Following'), findsNothing);

        membershipController.add(
          _membership(organizerId: organizer.id, uid: 'runner-2'),
        );
        await _pumpOrganizerFlow(tester);

        expect(find.text('Follow organizer'), findsNothing);
        // The follower dock renders the quiet "Following" control.
        expect(find.text('Following'), findsOneWidget);
      },
    );
  });
}

Future<void> _pumpOrganizerFlow(WidgetTester tester) async {
  await pumpFeatureUi(tester);
}

Event _buildEvent({required String id, required String organizerId}) {
  final start = DateTime(2026, 1, 7, 8);
  return Event(
    id: id,
    organizerId: organizerId,
    startTime: start,
    endTime: start.add(const Duration(hours: 1)),
    meetingPoint: 'Start',
    meetingLocation: const EventMeetingLocation(
      name: 'Start',
      latitude: 19.0608,
      longitude: 72.8365,
    ),
    startingPointLat: 19.0608,
    startingPointLng: 72.8365,
    distanceKm: 5,
    pace: PaceLevel.easy,
    capacityLimit: 20,
    description: 'Easy paced event.',
    priceInPaise: 0,
  );
}

Organizer _buildOrganizer({
  String id = 'club-1',
  String hostUserId = 'host-1',
}) {
  return Organizer(
    id: id,
    name: 'Stride Social',
    description: 'Morning runners who like easy city loops.',
    location: 'in-mh-mumbai',
    locationCityId: 'in-mh-mumbai',
    locationMarketId: 'in-mh-mumbai',
    area: 'Bandra',
    hostUserId: hostUserId,
    hostName: 'Host',
    createdAt: DateTime(2025),
    appVisibility: OrganizerAppVisibility.discoverable,
  );
}

UserProfile _buildUser({required String uid}) {
  return UserProfile(
    uid: uid,
    email: '$uid@example.com',
    name: 'Runner $uid',
    dateOfBirth: DateTime(1995, 6, 15),
    gender: Gender.man,
    phoneNumber: '+10000000000',
    profileComplete: true,
    interestedInGenders: const [Gender.woman],
  );
}

OrganizerMembership _membership({
  required String organizerId,
  required String uid,
}) => OrganizerMembership(
  id: organizerMembershipId(organizerId: organizerId, uid: uid),
  organizerId: organizerId,
  uid: uid,
  role: OrganizerMembershipRole.member,
  status: OrganizerMembershipStatus.active,
  joinedAt: DateTime(2026),
);
