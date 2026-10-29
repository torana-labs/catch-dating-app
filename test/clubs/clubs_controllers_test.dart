import 'dart:async';
import 'dart:typed_data';

import 'package:catch_dating_app/clubs/presentation/detail/club_detail_screen_state.dart';
import 'package:catch_dating_app/clubs/presentation/detail/club_detail_view_model.dart';
import 'package:catch_dating_app/clubs/presentation/detail/club_host_contact_controller.dart';
import 'package:catch_dating_app/clubs/presentation/detail/club_membership_controller.dart';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/organizers/data/clubs_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club_membership.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_authority.dart';
import 'package:catch_dating_app/contexts/profiles/data/image_upload_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_photo_policy.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_prompts.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import 'package:catch_dating_app/hosts/presentation/club_management/create/create_club_controller.dart';
import 'package:catch_dating_app/hosts/presentation/club_management/host_club_edit_controller.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_dating_app/platform/catch_async_state.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image_picker/image_picker.dart';

import 'clubs_test_helpers.dart';

part 'clubs_controller_media_reliability_tests.dart';

ClubMembership _membership({
  String clubId = 'club-1',
  String uid = 'runner-1',
  ClubMembershipStatus status = ClubMembershipStatus.active,
}) => ClubMembership(
  id: clubMembershipId(clubId: clubId, uid: uid),
  clubId: clubId,
  uid: uid,
  role: ClubMembershipRole.member,
  status: status,
  joinedAt: DateTime(2026),
);

void main() {
  tearDown(AppConfig.resetEntrypointRoleOverrideForTesting);

  group('ClubMembershipController', () {
    test('join requires sign-in and forwards the club id', () async {
      final fakeRepository = FakeClubsRepository();
      final container = ProviderContainer(
        overrides: [
          clubsRepositoryProvider.overrideWith((ref) => fakeRepository),
          uidProvider.overrideWith((ref) => Stream.value('runner-7')),
        ],
      );
      addTearDown(container.dispose);
      final uidSubscription = container.listen(
        uidProvider,
        (_, _) {},
        fireImmediately: true,
      );
      addTearDown(uidSubscription.close);
      await container.pump();
      await container
          .read(clubMembershipControllerProvider.notifier)
          .join('club-7');

      expect(fakeRepository.joinedClubId, 'club-7');
    });

    test('join throws when there is no signed-in user', () async {
      final container = ProviderContainer(
        overrides: [uidProvider.overrideWith((ref) => Stream.value(null))],
      );
      addTearDown(container.dispose);
      final uidSubscription = container.listen(
        uidProvider,
        (_, _) {},
        fireImmediately: true,
      );
      addTearDown(uidSubscription.close);
      await container.pump();

      expect(
        () => container
            .read(clubMembershipControllerProvider.notifier)
            .join('club-123'),
        throwsA(isA<SignInRequiredException>()),
      );
    });

    test('leave requires sign-in and forwards the club id', () async {
      final fakeRepository = FakeClubsRepository();
      final container = ProviderContainer(
        overrides: [
          clubsRepositoryProvider.overrideWith((ref) => fakeRepository),
          uidProvider.overrideWith((ref) => Stream.value('runner-9')),
        ],
      );
      addTearDown(container.dispose);
      final uidSubscription = container.listen(
        uidProvider,
        (_, _) {},
        fireImmediately: true,
      );
      addTearDown(uidSubscription.close);
      await container.pump();
      await container
          .read(clubMembershipControllerProvider.notifier)
          .leave('club-9');

      expect(fakeRepository.leftClubId, 'club-9');
    });

    test('setPushNotifications forwards the club id and preference', () async {
      final fakeRepository = FakeClubsRepository();
      final container = ProviderContainer(
        overrides: [
          clubsRepositoryProvider.overrideWith((ref) => fakeRepository),
          uidProvider.overrideWith((ref) => Stream.value('runner-10')),
        ],
      );
      addTearDown(container.dispose);
      final uidSubscription = container.listen(
        uidProvider,
        (_, _) {},
        fireImmediately: true,
      );
      addTearDown(uidSubscription.close);
      await container.pump();
      await container
          .read(clubMembershipControllerProvider.notifier)
          .setPushNotifications(clubId: 'club-10', enabled: true);

      expect(fakeRepository.notificationsClubId, 'club-10');
      expect(fakeRepository.notificationsEnabled, isTrue);
    });
  });

  group('ClubHostContactController', () {
    test('starts a host conversation through the repository', () async {
      final fakeRepository = FakeClubsRepository();
      final container = ProviderContainer(
        overrides: [
          clubsRepositoryProvider.overrideWith((ref) => fakeRepository),
          uidProvider.overrideWith((ref) => Stream.value('owner-1')),
        ],
      );
      addTearDown(container.dispose);
      final uidSubscription = container.listen(
        uidProvider,
        (_, _) {},
        fireImmediately: true,
      );
      addTearDown(uidSubscription.close);
      await container.pump();

      final controller = container.read(
        clubHostContactControllerProvider.notifier,
      );
      final matchId = await controller.startConversation(
        clubId: 'club-1',
        hostUid: 'host-2',
        eventId: 'event-7',
      );

      expect(fakeRepository.startedConversationClubId, 'club-1');
      expect(fakeRepository.startedConversationHostUid, 'host-2');
      expect(fakeRepository.startedConversationEventId, 'event-7');
      expect(matchId, fakeRepository.nextHostConversationMatchId);
    });
  });

  group('ClubDetailViewModel', () {
    test('builds derived state for hosts, members, and upcoming events', () {
      final now = DateTime(2025, 1, 1, 9);
      final futureEvent = buildEvent(
        id: 'future-event',
        startTime: now.add(const Duration(hours: 2)),
      );
      final soonerFutureRun = buildEvent(
        id: 'sooner-future-event',
        startTime: now.add(const Duration(hours: 1)),
      );
      final pastEvent = buildEvent(
        id: 'past-event',
        startTime: now.subtract(const Duration(hours: 2)),
      );
      final result = buildClubDetailViewModel(
        clubAsync: AsyncData(buildClub()),
        eventsAsync: AsyncData([futureEvent, pastEvent, soonerFutureRun]),
        reviewsAsync: AsyncData([buildReview()]),
        userProfileAsync: AsyncData(buildUser(uid: 'runner-1')),
        uidAsync: const AsyncData('runner-1'),
        membershipAsync: AsyncData(_membership()),
        now: now,
      );

      final vm = result.requireValue!;
      expect(vm.isHost, isFalse);
      expect(vm.isMember, isTrue);
      expect(vm.upcomingEvents.map((event) => event.id), [
        'sooner-future-event',
        'future-event',
      ]);
      expect(vm.reviews, hasLength(1));
    });

    test('returns loading while a core dependency is still loading', () {
      final result = buildClubDetailViewModel(
        clubAsync: const AsyncLoading(),
        eventsAsync: const AsyncData(<Event>[]),
        reviewsAsync: const AsyncData(<Review>[]),
        userProfileAsync: AsyncData(buildUser(uid: 'runner-1')),
        uidAsync: const AsyncData('runner-1'),
        membershipAsync: const AsyncData(null),
      );

      expect(result.isLoading, isTrue);
    });

    test('consumer owner relationship suppresses self-directed actions', () {
      final now = DateTime(2025, 1, 1, 9);
      final futureEvent = buildEvent(
        id: 'future-event',
        startTime: now.add(const Duration(hours: 1)),
      );

      final result = buildClubDetailViewModel(
        clubAsync: AsyncData(buildClub()),
        eventsAsync: AsyncData([futureEvent]),
        reviewsAsync: const AsyncLoading(),
        userProfileAsync: const AsyncLoading(),
        uidAsync: const AsyncData('host-1'),
        membershipAsync: const AsyncLoading(),
        now: now,
      );

      final vm = result.requireValue!;
      expect(vm.isHost, isTrue);
      expect(vm.upcomingEvents.map((event) => event.id), ['future-event']);
      expect(vm.reviews, isEmpty);
      expect(vm.userProfile, isNull);
      expect(vm.isMember, isFalse);
    });

    test('consumer direct reads reject hidden or suppressed organizers', () {
      final hidden = buildClub().copyWith(
        appVisibility: ClubAppVisibility.hidden,
      );
      final suppressed = buildClub().copyWith(
        claim: OrganizerClaim.fromJson({'state': 'suppressed'}),
      );

      for (final club in [hidden, suppressed]) {
        final result = buildClubDetailViewModel(
          clubAsync: AsyncData(club),
          eventsAsync: const AsyncData(<Event>[]),
          reviewsAsync: const AsyncData(<Review>[]),
          userProfileAsync: const AsyncData(null),
          uidAsync: const AsyncData(null),
          membershipAsync: const AsyncData(null),
        );
        expect(
          result.value,
          isNull,
          reason: club.organizerAuthority.trustState.name,
        );
      }
    });

    test('host runtime may preview a hidden organizer', () {
      final result = buildClubDetailViewModel(
        clubAsync: AsyncData(
          buildClub().copyWith(appVisibility: ClubAppVisibility.hidden),
        ),
        eventsAsync: const AsyncData(<Event>[]),
        reviewsAsync: const AsyncData(<Review>[]),
        userProfileAsync: AsyncData(buildUser(uid: 'host-1')),
        uidAsync: const AsyncData('host-1'),
        membershipAsync: const AsyncData(null),
        appRole: AppRole.host,
      );

      expect(result.requireValue, isNotNull);
      expect(result.requireValue!.isHost, isTrue);
    });

    test(
      'host runtime denies a discoverable organizer owned by someone else',
      () {
        final result = buildClubDetailViewModel(
          clubAsync: AsyncData(buildClub(hostUserId: 'owner-1')),
          eventsAsync: const AsyncData(<Event>[]),
          reviewsAsync: const AsyncData(<Review>[]),
          userProfileAsync: AsyncData(buildUser(uid: 'other-host')),
          uidAsync: const AsyncData('other-host'),
          membershipAsync: const AsyncData(null),
          appRole: AppRole.host,
        );

        expect(result.value, isNull);
      },
    );

    test('cancelled events do not appear in organizer schedules', () {
      final now = DateTime(2026);
      final cancelled = buildEvent(
        id: 'cancelled',
        startTime: now.add(const Duration(days: 1)),
      ).copyWith(status: EventLifecycleStatus.cancelled);
      final active = buildEvent(
        id: 'active',
        startTime: now.add(const Duration(days: 2)),
      );

      final result = buildClubDetailViewModel(
        clubAsync: AsyncData(buildClub()),
        eventsAsync: AsyncData([cancelled, active]),
        reviewsAsync: const AsyncData(<Review>[]),
        userProfileAsync: const AsyncData(null),
        uidAsync: const AsyncData(null),
        membershipAsync: const AsyncData(null),
        now: now,
      );

      expect(result.requireValue!.upcomingEvents.map((event) => event.id), [
        'active',
      ]);
    });

    test('host role derives host club detail state', () {
      AppConfig.configureEntrypointRole(AppRole.host);

      final result = buildClubDetailViewModel(
        clubAsync: AsyncData(buildClub()),
        eventsAsync: const AsyncData(<Event>[]),
        reviewsAsync: const AsyncData(<Review>[]),
        userProfileAsync: const AsyncLoading(),
        uidAsync: const AsyncData('host-1'),
        membershipAsync: const AsyncLoading(),
      );

      expect(result.requireValue!.isHost, isTrue);
    });

    test('returns null data when the club stream yields no club', () {
      final result = buildClubDetailViewModel(
        clubAsync: const AsyncData(null),
        eventsAsync: const AsyncData(<Event>[]),
        reviewsAsync: const AsyncData(<Review>[]),
        userProfileAsync: AsyncData(buildUser(uid: 'runner-1')),
        uidAsync: const AsyncData('runner-1'),
        membershipAsync: const AsyncData(null),
      );

      expect(result.value, isNull);
    });

    test('surfaces club stream errors', () {
      final result = buildClubDetailViewModel(
        clubAsync: AsyncError(StateError('club failed'), StackTrace.empty),
        eventsAsync: const AsyncData(<Event>[]),
        reviewsAsync: const AsyncData(<Review>[]),
        userProfileAsync: AsyncData(buildUser(uid: 'runner-1')),
        uidAsync: const AsyncData('runner-1'),
        membershipAsync: const AsyncData(null),
      );

      expect(result.hasError, isTrue);
      expect(result.error, isA<StateError>());
    });

    test('surfaces event stream errors', () {
      final result = buildClubDetailViewModel(
        clubAsync: AsyncData(buildClub()),
        eventsAsync: AsyncError(StateError('events failed'), StackTrace.empty),
        reviewsAsync: const AsyncData(<Review>[]),
        userProfileAsync: AsyncData(buildUser(uid: 'runner-1')),
        uidAsync: const AsyncData('runner-1'),
        membershipAsync: const AsyncData(null),
      );

      expect(result.hasError, isTrue);
      expect(result.error, isA<StateError>());
    });

    test('uses empty reviews when the review stream is unavailable', () {
      final result = buildClubDetailViewModel(
        clubAsync: AsyncData(buildClub()),
        eventsAsync: const AsyncData(<Event>[]),
        reviewsAsync: AsyncError(
          StateError('reviews failed'),
          StackTrace.empty,
        ),
        userProfileAsync: AsyncData(buildUser(uid: 'runner-1')),
        uidAsync: const AsyncData('runner-1'),
        membershipAsync: const AsyncData(null),
      );

      expect(result.requireValue!.reviews, isEmpty);
    });

    test('surfaces uid stream errors', () {
      final result = buildClubDetailViewModel(
        clubAsync: AsyncData(buildClub()),
        eventsAsync: const AsyncData(<Event>[]),
        reviewsAsync: const AsyncData(<Review>[]),
        userProfileAsync: AsyncData(buildUser(uid: 'runner-1')),
        uidAsync: AsyncError(StateError('uid failed'), StackTrace.empty),
        membershipAsync: const AsyncData(null),
      );

      expect(result.hasError, isTrue);
      expect(result.error, isA<StateError>());
    });

    test('uses null profile when profile stream is unavailable', () {
      final result = buildClubDetailViewModel(
        clubAsync: AsyncData(buildClub()),
        eventsAsync: const AsyncData(<Event>[]),
        reviewsAsync: const AsyncData(<Review>[]),
        userProfileAsync: AsyncError(
          StateError('app user failed'),
          StackTrace.empty,
        ),
        uidAsync: const AsyncData('runner-1'),
        membershipAsync: const AsyncData(null),
      );

      expect(result.requireValue!.userProfile, isNull);
    });
  });

  group('HostClubDetailScreenState', () {
    test('rejects an optimistic organizer for a different route id', () {
      expect(
        clubDetailInitialClubForRoute(
          clubId: 'expected-club',
          initialClub: buildClub(id: 'different-club'),
        ),
        isNull,
      );
    });

    test('wraps a live host view model as public preview content', () {
      final club = buildClub();
      final state = HostClubDetailScreenState.fromState(
        viewModel: CatchAsyncState<ClubDetailViewModel?>.data(
          ClubDetailViewModel(
            club: club,
            isHost: true,
            isMember: false,
            upcomingEvents: const <Event>[],
            reviews: const <Review>[],
            userProfile: buildUser(uid: 'host-1'),
            uid: 'host-1',
            isAuthenticated: true,
          ),
        ),
        initialClub: null,
        currentUid: 'host-1',
        currentUserProfile: buildUser(uid: 'host-1'),
        currentMembership: null,
        appRole: AppRole.host,
      );

      expect(state, isA<HostClubDetailContent>());
      final content = state as HostClubDetailContent;
      expect(content.club, club);
      expect(content.isHost, isTrue);
      expect(content.publicPreviewMode, isTrue);
      expect(content.showMembershipDock, isFalse);
      expect(content.isInitialFallback, isFalse);

      final bodyState = ClubDetailBodyState.fromContent(
        content,
        appRole: AppRole.host,
      );
      expect(bodyState.isHost, isFalse);
      expect(bodyState.isMember, isFalse);
      expect(bodyState.dockState, isNull);
      expect(bodyState.canMessageHosts, isFalse);
    });

    test('uses initial club fallback while live host data loads', () {
      final club = buildClub(
        ownerUserId: 'host-1',
        hostUserIds: const ['host-1'],
      );
      final state = HostClubDetailScreenState.fromState(
        viewModel: const CatchAsyncState<ClubDetailViewModel?>.loading(),
        initialClub: club,
        currentUid: 'host-1',
        currentUserProfile: buildUser(uid: 'host-1'),
        currentMembership: null,
        appRole: AppRole.host,
      );

      expect(state, isA<HostClubDetailContent>());
      final content = state as HostClubDetailContent;
      expect(content.club, club);
      expect(content.isHost, isTrue);
      expect(content.isAuthenticated, isTrue);
      expect(content.publicPreviewMode, isTrue);
      expect(content.showMembershipDock, isFalse);
      expect(content.isInitialFallback, isTrue);
    });

    test('does not derive guest fallback actions before auth resolves', () {
      final state = HostClubDetailScreenState.fromState(
        viewModel: const CatchAsyncState<ClubDetailViewModel?>.loading(),
        initialClub: buildClub(),
        currentUid: null,
        currentUserProfile: null,
        currentMembership: null,
        appRole: AppRole.consumer,
        authResolved: false,
      );

      expect(state, isA<HostClubDetailLoading>());
    });

    test('maps blocking async branches to loading, error, and not found', () {
      expect(
        HostClubDetailScreenState.fromState(
          viewModel: const CatchAsyncState<ClubDetailViewModel?>.loading(),
          initialClub: null,
          currentUid: null,
          currentUserProfile: null,
          currentMembership: null,
          appRole: AppRole.consumer,
        ),
        isA<HostClubDetailLoading>(),
      );

      final errorState =
          HostClubDetailScreenState.fromState(
                viewModel: CatchAsyncState<ClubDetailViewModel?>.error(
                  StateError('club failed'),
                ),
                initialClub: null,
                currentUid: null,
                currentUserProfile: null,
                currentMembership: null,
                appRole: AppRole.consumer,
              )
              as HostClubDetailError;
      expect(errorState.retryIntent, HostClubDetailRetryIntent.reloadDetail);

      expect(errorState, isA<HostClubDetailError>());

      expect(
        HostClubDetailScreenState.fromState(
          viewModel: const CatchAsyncState<ClubDetailViewModel?>.data(null),
          initialClub: null,
          currentUid: null,
          currentUserProfile: null,
          currentMembership: null,
          appRole: AppRole.consumer,
        ),
        isA<HostClubDetailNotFound>(),
      );
    });

    test('derives consumer body display policy from domain data', () {
      final club = buildClub(
        hostProfiles: const [
          ClubHostProfile(uid: 'owner-1', displayName: 'Owner Host'),
          ClubHostProfile(uid: 'runner-1', displayName: 'Current Viewer'),
          ClubHostProfile(uid: 'host-2', displayName: 'Co Host'),
        ],
        instagramHandle: '@stridesocial',
        phoneNumber: '+15551234567',
        email: 'hello@stridesocial.test',
      );
      final earlierEvent = buildEvent(
        id: 'event-earlier',
        startTime: DateTime(2026, 1, 1, 8),
      );
      final laterEvent = buildEvent(
        id: 'event-later',
        startTime: DateTime(2026, 1, 2, 8),
      );

      final state = ClubDetailBodyState.fromDomain(
        club: club,
        upcomingEvents: [laterEvent, earlierEvent],
        reviews: [buildReview()],
        userProfile: _socialReadyUser('runner-1'),
        uid: 'runner-1',
        isMember: true,
        isAuthenticated: true,
        clubPushNotificationsEnabled: true,
      );

      expect(state.nextEvent, earlierEvent);
      expect(state.contactActions.map((action) => action.kind), [
        ClubContactActionKind.instagram,
        ClubContactActionKind.phone,
        ClubContactActionKind.email,
      ]);
      expect(state.contactActions.map((action) => action.label), [
        '@stridesocial',
        '+15551234567',
        'hello@stridesocial.test',
      ]);
      final instagramAction = state.contactActions[0];
      expect(instagramAction.uri.scheme, 'https');
      expect(instagramAction.uri.host, 'instagram.com');
      expect(instagramAction.uri.path, '/stridesocial');
      expect(instagramAction.openExternally, isTrue);
      final phoneAction = state.contactActions[1];
      expect(phoneAction.uri.scheme, 'tel');
      expect(phoneAction.uri.path, '+15551234567');
      expect(phoneAction.openExternally, isFalse);
      final emailAction = state.contactActions[2];
      expect(emailAction.uri.scheme, 'mailto');
      expect(emailAction.uri.path, 'hello@stridesocial.test');
      expect(emailAction.openExternally, isFalse);
      expect(state.showReviews, isTrue);
      expect(state.messageableHostUids, {'owner-1', 'host-2'});
      expect(state.canMessageHost('runner-1'), isFalse);
      expect(
        state.eventRouteTarget,
        ClubDetailEventRouteTarget.consumerEventDetail,
      );
      expect(state.dockState, isNotNull);
      expect(state.dockState!.isMember, isTrue);
      expect(state.dockState!.pushNotificationsEnabled, isTrue);
    });

    test(
      'derives host body policy without consumer dock or host messaging',
      () {
        final club = buildClub(
          hostProfiles: const [
            ClubHostProfile(uid: 'owner-1', displayName: 'Owner Host'),
            ClubHostProfile(uid: 'host-2', displayName: 'Co Host'),
          ],
        );

        final state = ClubDetailBodyState.fromDomain(
          club: club,
          uid: 'owner-1',
          isHost: true,
          isMember: true,
          isAuthenticated: true,
          appRole: AppRole.host,
        );

        expect(state.canMessageHosts, isFalse);
        expect(state.messageableHostUids, isEmpty);
        expect(state.dockState, isNull);
        expect(state.showReviews, isTrue);
        expect(
          state.eventRouteTarget,
          ClubDetailEventRouteTarget.hostEventDetail,
        );
      },
    );

    test(
      'public preview keeps consumer display policy but removes the dock',
      () {
        final club = buildClub(
          hostProfiles: const [
            ClubHostProfile(uid: 'owner-1', displayName: 'Owner Host'),
            ClubHostProfile(uid: 'host-2', displayName: 'Co Host'),
          ],
        );

        final state = ClubDetailBodyState.publicPreview(
          club: club,
          uid: 'owner-1',
        );

        expect(state.isHost, isFalse);
        expect(state.isMember, isFalse);
        expect(state.dockState, isNull);
        expect(state.canMessageHosts, isFalse);
        expect(state.messageableHostUids, isEmpty);
        expect(
          state.eventRouteTarget,
          ClubDetailEventRouteTarget.consumerEventDetail,
        );
      },
    );
  });

  group('CreateClubController', () {
    _registerClubMediaReliabilityTests();

    test('deduplicates an active organizer submit snapshot', () async {
      final pendingCreate = Completer<String>();
      final fakeRepository = FakeClubsRepository()
        ..createClubCompleter = pendingCreate;
      final container = ProviderContainer(
        overrides: [
          clubsRepositoryProvider.overrideWith((ref) => fakeRepository),
          imageUploadRepositoryProvider.overrideWith(
            (ref) => FakeImageUploadRepository(),
          ),
          uidProvider.overrideWith((ref) => Stream.value('host-1')),
        ],
      );
      addTearDown(container.dispose);
      final uidSubscription = container.listen(
        uidProvider,
        (_, _) {},
        fireImmediately: true,
      );
      addTearDown(uidSubscription.close);
      await container.pump();
      final controller = container.read(createClubControllerProvider.notifier);

      final first = controller.submit(
        name: 'Sunset Striders',
        location: buildClub().location,
        area: 'Bandra',
        description: 'Frozen request',
      );
      final duplicate = controller.submit(
        name: 'Different organizer',
        location: 'Delhi',
        area: 'Hauz Khas',
        description: 'Must not replace the first request',
      );

      expect(identical(first, duplicate), isTrue);
      expect(fakeRepository.createClubCallCount, 1);
      pendingCreate.complete(fakeRepository.generatedId);
      await Future.wait([first, duplicate]);

      fakeRepository.createClubCompleter = null;
      await controller.submit(
        name: 'Next organizer',
        location: buildClub().location,
        area: 'Bandra',
        description: 'New request after completion',
      );
      expect(fakeRepository.createClubCallCount, 2);
    });

    test('picks multiple club photos and reads preview bytes', () async {
      final images = [
        XFile.fromData(Uint8List.fromList(const [1]), name: 'club-a.png'),
        XFile.fromData(Uint8List.fromList(const [2]), name: 'club-b.png'),
      ];
      final fakeImageUploadRepository = FakeImageUploadRepository(
        pickedImages: images,
      );
      final container = ProviderContainer(
        overrides: [
          imageUploadRepositoryProvider.overrideWith(
            (ref) => fakeImageUploadRepository,
          ),
        ],
      );
      addTearDown(container.dispose);

      final picked = await container
          .read(createClubControllerProvider.notifier)
          .pickClubPhotos();

      expect(picked.map((photo) => photo.image), images);
      expect(picked.map((photo) => photo.bytes.single), [1, 2]);
    });

    test(
      'creates a club through the repository when there are no club photos',
      () async {
        final fakeRepository = FakeClubsRepository();
        final fakeImageUploadRepository = FakeImageUploadRepository();
        final container = ProviderContainer(
          overrides: [
            clubsRepositoryProvider.overrideWith((ref) => fakeRepository),
            imageUploadRepositoryProvider.overrideWith(
              (ref) => fakeImageUploadRepository,
            ),
            uidProvider.overrideWith((ref) => Stream.value('host-1')),
          ],
        );
        addTearDown(container.dispose);
        final uidSubscription = container.listen(
          uidProvider,
          (_, _) {},
          fireImmediately: true,
        );
        addTearDown(uidSubscription.close);
        await container.pump();

        await container
            .read(createClubControllerProvider.notifier)
            .submit(
              name: 'Sunset Striders',
              location: buildClub().location,
              area: 'Bandra',
              description: 'Easy social club',
              organizerType: OrganizerType.eventProducer,
            );

        expect(fakeRepository.lastCreateCall, isNotNull);
        expect(
          fakeRepository.lastCreateCall!.clubId,
          fakeRepository.generatedId,
        );
        expect(fakeRepository.lastCreateCall!.imageUrl, isNull);
        expect(
          fakeRepository.lastCreateCall!.organizerType,
          OrganizerType.eventProducer,
        );
        expect(fakeImageUploadRepository.lastUploadClubId, isNull);
      },
    );

    test('creates the club before uploading new club media', () async {
      final fakeRepository = FakeClubsRepository()..generatedId = 'club-42';
      final fakeImageUploadRepository = FakeImageUploadRepository(
        pickedImage: XFile('/tmp/club-photo.jpg'),
      );
      final container = ProviderContainer(
        overrides: [
          clubsRepositoryProvider.overrideWith((ref) => fakeRepository),
          imageUploadRepositoryProvider.overrideWith(
            (ref) => fakeImageUploadRepository,
          ),
          uidProvider.overrideWith((ref) => Stream.value('host-1')),
          watchUserProfileProvider.overrideWith(
            (ref) => Stream.value(buildUser(uid: 'host-1', name: 'Priya')),
          ),
        ],
      );
      addTearDown(container.dispose);
      final uidSubscription = container.listen(
        uidProvider,
        (_, _) {},
        fireImmediately: true,
      );
      addTearDown(uidSubscription.close);
      final userProfileSubscription = container.listen(
        watchUserProfileProvider,
        (_, _) {},
        fireImmediately: true,
      );
      addTearDown(userProfileSubscription.close);
      await container.pump();
      await container.pump();

      await container
          .read(createClubControllerProvider.notifier)
          .submit(
            name: 'Sunset Striders',
            location: buildClub().location,
            area: 'Bandra',
            description: 'Easy social club',
            clubPhotoInputs: [
              NewClubPhotoInput(fakeImageUploadRepository.pickedImage!),
            ],
          );

      expect(fakeImageUploadRepository.lastUploadClubId, 'club-42');
      expect(fakeImageUploadRepository.lastUploadUid, 'host-1');
      expect(fakeRepository.lastCreateCall, isNotNull);
      expect(fakeRepository.lastCreateCall!.clubId, 'club-42');
      expect(fakeRepository.lastCreateCall!.imageUrl, isNull);
      expect(fakeRepository.lastUpdatedClubId, 'club-42');
      expect(
        fakeRepository.lastUpdatedFields,
        containsPair('imageUrl', fakeImageUploadRepository.uploadResult),
      );
    });

    test('creates a club with multiple ordered club photos', () async {
      final fakeRepository = FakeClubsRepository()..generatedId = 'club-42';
      final photos = [XFile('/tmp/club-a.jpg'), XFile('/tmp/club-b.jpg')];
      final fakeImageUploadRepository = FakeImageUploadRepository();
      final container = ProviderContainer(
        overrides: [
          clubsRepositoryProvider.overrideWith((ref) => fakeRepository),
          imageUploadRepositoryProvider.overrideWith(
            (ref) => fakeImageUploadRepository,
          ),
          uidProvider.overrideWith((ref) => Stream.value('host-1')),
        ],
      );
      addTearDown(container.dispose);
      final uidSubscription = container.listen(
        uidProvider,
        (_, _) {},
        fireImmediately: true,
      );
      addTearDown(uidSubscription.close);
      await container.pump();

      await container
          .read(createClubControllerProvider.notifier)
          .submit(
            name: 'Sunset Striders',
            location: buildClub().location,
            area: 'Bandra',
            description: 'Easy social club',
            clubPhotoInputs: [
              for (final photo in photos) NewClubPhotoInput(photo),
            ],
          );

      expect(fakeImageUploadRepository.lastUploadClubId, 'club-42');
      expect(fakeImageUploadRepository.uploadedClubPhotoPositions, [0, 1]);
      expect(fakeImageUploadRepository.uploadedClubPhotoImages, photos);
      final fields = fakeRepository.lastUpdatedFields!;
      expect(fields['imageUrl'], fakeImageUploadRepository.uploadResult);
      final clubPhotos = fields['clubPhotos'] as List<Object?>;
      expect(clubPhotos, hasLength(2));
      expect(
        clubPhotos.cast<Map<String, Object?>>().map(
          (photo) => photo['position'],
        ),
        [0, 1],
      );
    });

    test(
      'create cleanup removes uploads when media attachment fails',
      () async {
        final fakeRepository = FakeClubsRepository()
          ..generatedId = 'club-42'
          ..updateError = StateError('attach failed');
        final image = XFile('/tmp/club-a.jpg');
        final uploads = FakeImageUploadRepository();
        final container = ProviderContainer(
          overrides: [
            clubsRepositoryProvider.overrideWith((ref) => fakeRepository),
            imageUploadRepositoryProvider.overrideWith((ref) => uploads),
            uidProvider.overrideWith((ref) => Stream.value('host-1')),
          ],
        );
        addTearDown(container.dispose);
        final uidSubscription = container.listen(
          uidProvider,
          (_, _) {},
          fireImmediately: true,
        );
        addTearDown(uidSubscription.close);
        await container.pump();

        await expectLater(
          container
              .read(createClubControllerProvider.notifier)
              .submit(
                name: 'Sunset Striders',
                location: buildClub().location,
                area: 'Bandra',
                description: 'Easy social club',
                clubPhotoInputs: [NewClubPhotoInput(image)],
              ),
          throwsStateError,
        );

        expect(uploads.deletedStoragePaths, hasLength(1));
        expect(
          uploads.deletedStoragePaths.single,
          startsWith('organizers/club-42/media/'),
        );
      },
    );

    test('creates a club without requiring profile state', () async {
      final fakeRepository = FakeClubsRepository();
      final fakeImageUploadRepository = FakeImageUploadRepository();
      final container = ProviderContainer(
        overrides: [
          clubsRepositoryProvider.overrideWith((ref) => fakeRepository),
          imageUploadRepositoryProvider.overrideWith(
            (ref) => fakeImageUploadRepository,
          ),
          uidProvider.overrideWith((ref) => Stream.value('host-1')),
        ],
      );
      addTearDown(container.dispose);
      final uidSubscription = container.listen(
        uidProvider,
        (_, _) {},
        fireImmediately: true,
      );
      addTearDown(uidSubscription.close);
      await container.pump();

      await container
          .read(createClubControllerProvider.notifier)
          .submit(
            name: 'Sunset Striders',
            location: buildClub().location,
            area: 'Bandra',
            description: 'Easy social club',
          );

      expect(fakeRepository.lastCreateCall, isNotNull);
      expect(fakeRepository.lastCreateCall!.clubId, fakeRepository.generatedId);
    });

    test('co-host media edits update only media fields', () async {
      final club = buildClub(
        hostUserId: 'owner-1',
        ownerUserId: 'owner-1',
        hostUserIds: const ['owner-1', 'cohost-1'],
        imageUrl: 'https://example.com/old.jpg',
      );
      final fakeRepository = FakeClubsRepository();
      final fakeImageUploadRepository = FakeImageUploadRepository(
        pickedImage: XFile('/tmp/club-photo.jpg'),
        uploadResult: 'https://example.com/new.jpg',
      );
      final container = ProviderContainer(
        overrides: [
          clubsRepositoryProvider.overrideWith((ref) => fakeRepository),
          imageUploadRepositoryProvider.overrideWith(
            (ref) => fakeImageUploadRepository,
          ),
          uidProvider.overrideWith((ref) => Stream.value('cohost-1')),
        ],
      );
      addTearDown(container.dispose);
      final uidSubscription = container.listen(
        uidProvider,
        (_, _) {},
        fireImmediately: true,
      );
      addTearDown(uidSubscription.close);
      await container.pump();

      await container
          .read(hostClubEditControllerProvider)
          .updateClubMedia(
            club: club,
            photoInputs: [
              HostNewClubPhotoInput(
                id: 'photo-one',
                image: fakeImageUploadRepository.pickedImage!,
              ),
            ],
          );

      expect(fakeImageUploadRepository.lastUploadUid, 'cohost-1');
      expect(fakeRepository.lastUpdatedClubId, club.id);
      final fields = fakeRepository.lastUpdatedFields!;
      expect(fields.keys, unorderedEquals(['imageUrl', 'clubPhotos']));
      expect(fields['imageUrl'], 'https://example.com/new.jpg');
    });

    test('club logo removal clears both logo projections', () async {
      final club = buildClub(
        ownerUserId: 'host-1',
        hostUserIds: const ['host-1'],
        profileImageUrl: 'https://example.com/old-logo.jpg',
      );
      final fakeRepository = FakeClubsRepository();
      final container = ProviderContainer(
        overrides: [
          clubsRepositoryProvider.overrideWith((ref) => fakeRepository),
          uidProvider.overrideWith((ref) => Stream.value('host-1')),
        ],
      );
      addTearDown(container.dispose);
      final uidSubscription = container.listen(
        uidProvider,
        (_, _) {},
        fireImmediately: true,
      );
      addTearDown(uidSubscription.close);
      await container.pump();

      await container
          .read(hostClubEditControllerProvider)
          .updateClubMedia(club: club, removeLogo: true);

      expect(fakeRepository.lastUpdatedClubId, club.id);
      expect(
        fakeRepository.lastUpdatedFields,
        equals({'profileImageUrl': null, 'logoPhoto': null}),
      );
    });

    test('failed club media writes clean up newly uploaded files', () async {
      final club = buildClub(
        ownerUserId: 'host-1',
        hostUserIds: const ['host-1'],
      );
      final fakeRepository = FakeClubsRepository()
        ..updateError = StateError('write failed');
      final fakeImageUploadRepository = FakeImageUploadRepository(
        pickedImage: XFile('/tmp/club-photo.jpg'),
      );
      final container = ProviderContainer(
        overrides: [
          clubsRepositoryProvider.overrideWith((ref) => fakeRepository),
          imageUploadRepositoryProvider.overrideWith(
            (ref) => fakeImageUploadRepository,
          ),
          uidProvider.overrideWith((ref) => Stream.value('host-1')),
        ],
      );
      addTearDown(container.dispose);
      final uidSubscription = container.listen(
        uidProvider,
        (_, _) {},
        fireImmediately: true,
      );
      addTearDown(uidSubscription.close);
      await container.pump();

      await expectLater(
        container
            .read(hostClubEditControllerProvider)
            .updateClubMedia(
              club: club,
              photoInputs: [
                HostNewClubPhotoInput(
                  id: 'photo-one',
                  image: fakeImageUploadRepository.pickedImage!,
                ),
              ],
            ),
        throwsStateError,
      );

      expect(fakeImageUploadRepository.deletedStoragePaths, [
        'organizers/${club.id}/media/photo-one/original.jpg',
      ]);
    });

    test('club media edits reject non-host users', () async {
      final container = ProviderContainer(
        overrides: [
          uidProvider.overrideWith((ref) => Stream.value('runner-1')),
        ],
      );
      addTearDown(container.dispose);
      final uidSubscription = container.listen(
        uidProvider,
        (_, _) {},
        fireImmediately: true,
      );
      addTearDown(uidSubscription.close);
      await container.pump();

      expect(
        () => container
            .read(hostClubEditControllerProvider)
            .updateClubMedia(
              club: buildClub(),
              photoInputs: const <HostClubMediaInput>[],
            ),
        throwsA(isA<BackendOperationException>()),
      );
    });
  });
}

UserProfile _socialReadyUser(String uid) {
  return buildUser(
    uid: uid,
    photoUrls: List.generate(
      minimumProfilePhotoCount,
      (index) => 'https://example.com/$uid-$index.jpg',
    ),
  ).copyWith(
    profilePrompts: [
      for (final promptId in defaultProfilePromptIds)
        ProfilePromptAnswer(
          promptId: promptId,
          prompt: promptId,
          answer: 'Ready for social actions.',
        ),
    ],
  );
}
