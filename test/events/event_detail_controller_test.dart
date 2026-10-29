import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/discovery/data/saved_event_repository.dart';
import 'package:catch_dating_app/contexts/discovery/domain/saved_event.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/club_membership_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/clubs_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_authority.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/reviews/data/reviews_repository.dart';
import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import 'package:catch_dating_app/core/app_config.dart';
import 'package:catch_dating_app/events/presentation/event_detail_controller.dart';
import 'package:catch_dating_app/events/presentation/event_detail_view_model.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/exceptions/error_logger.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'events_test_helpers.dart';

void main() {
  tearDown(AppConfig.resetEntrypointRoleOverrideForTesting);

  group('buildEventDetailViewModel', () {
    test('does not derive guest actions before auth resolves', () {
      final result = buildEventDetailViewModel(
        eventAsync: AsyncData(buildEvent()),
        userProfileAsync: const AsyncData(null),
        reviewsAsync: const AsyncData(<Review>[]),
        clubAsync: AsyncData(buildClub()),
        savedEventAsync: const AsyncData(null),
        participationAsync: const AsyncData(null),
        currentUid: null,
        isAuthenticated: false,
        authResolved: false,
      );

      expect(result.isLoading, isTrue);
    });

    test('returns loading while any dependency is still loading', () {
      final result = buildEventDetailViewModel(
        eventAsync: const AsyncLoading(),
        userProfileAsync: AsyncData(buildUser()),
        reviewsAsync: const AsyncData(<Review>[]),
        clubAsync: AsyncData(buildClub()),
        savedEventAsync: const AsyncData(null),
        participationAsync: const AsyncData(null),
        currentUid: 'runner-1',
        isAuthenticated: true,
      );

      expect(result.isLoading, isTrue);
    });

    test('consumer owner relationship suppresses attendee actions', () {
      final event = buildEvent();
      final user = buildUser();
      final review = buildReview(reviewerUserId: 'runner-2');

      final result = buildEventDetailViewModel(
        eventAsync: AsyncData(event),
        userProfileAsync: AsyncData(user),
        reviewsAsync: AsyncData([review]),
        clubAsync: AsyncData(buildClub(hostUserId: 'runner-1')),
        savedEventAsync: const AsyncData(null),
        participationAsync: const AsyncData(null),
        currentUid: 'runner-1',
        isAuthenticated: true,
      );

      final value = result.requireValue;
      expect(value, isNotNull);
      expect(value!.event, event);
      expect(value.userProfile, user);
      expect(value.reviews, [review]);
      expect(value.isHost, isTrue);
      expect(value.isSaved, isFalse);
      expect(value.participation, isNull);
    });

    test('host role derives host event detail state', () {
      AppConfig.configureEntrypointRole(AppRole.host);

      final result = buildEventDetailViewModel(
        eventAsync: AsyncData(buildEvent()),
        userProfileAsync: AsyncData(buildUser(uid: 'host-1')),
        reviewsAsync: const AsyncData(<Review>[]),
        clubAsync: AsyncData(buildClub()),
        savedEventAsync: const AsyncData(null),
        participationAsync: const AsyncData(null),
        currentUid: 'host-1',
        isAuthenticated: true,
      );

      expect(result.requireValue!.isHost, isTrue);
    });

    test(
      'host role waits for club ownership before rendering detail state',
      () {
        AppConfig.configureEntrypointRole(AppRole.host);

        final result = buildEventDetailViewModel(
          eventAsync: AsyncData(buildEvent()),
          userProfileAsync: AsyncData(buildUser(uid: 'host-1')),
          reviewsAsync: const AsyncData(<Review>[]),
          clubAsync: const AsyncLoading(),
          savedEventAsync: const AsyncData(null),
          participationAsync: const AsyncData(null),
          currentUid: 'host-1',
          isAuthenticated: true,
        );

        expect(result.isLoading, isTrue);
      },
    );

    test(
      'host role surfaces club errors before falling back to consumer state',
      () {
        AppConfig.configureEntrypointRole(AppRole.host);

        final result = buildEventDetailViewModel(
          eventAsync: AsyncData(buildEvent()),
          userProfileAsync: AsyncData(buildUser(uid: 'host-1')),
          reviewsAsync: const AsyncData(<Review>[]),
          clubAsync: AsyncError(StateError('club failed'), StackTrace.empty),
          savedEventAsync: const AsyncData(null),
          participationAsync: const AsyncData(null),
          currentUid: 'host-1',
          isAuthenticated: true,
        );

        expect(result.hasError, isTrue);
        expect(result.error, isA<StateError>());
      },
    );

    test('consumer detail surfaces organizer authority failures', () {
      final result = buildEventDetailViewModel(
        eventAsync: AsyncData(buildEvent()),
        userProfileAsync: AsyncData(buildUser()),
        reviewsAsync: const AsyncData(<Review>[]),
        clubAsync: AsyncError(StateError('club failed'), StackTrace.empty),
        savedEventAsync: const AsyncData(null),
        participationAsync: const AsyncData(null),
        currentUid: 'runner-1',
        isAuthenticated: true,
      );

      expect(result.hasError, isTrue);
      expect(result.error, isA<StateError>());
    });

    test('consumer detail rejects hidden or suppressed organizers', () {
      final hidden = buildClub().copyWith(
        appVisibility: ClubAppVisibility.hidden,
      );
      final suppressed = buildClub().copyWith(
        claim: OrganizerClaim.fromJson({'state': 'suppressed'}),
      );

      for (final club in [hidden, suppressed]) {
        final result = buildEventDetailViewModel(
          eventAsync: AsyncData(buildEvent()),
          userProfileAsync: const AsyncData(null),
          reviewsAsync: const AsyncData(<Review>[]),
          clubAsync: AsyncData(club),
          savedEventAsync: const AsyncData(null),
          participationAsync: const AsyncData(null),
          currentUid: null,
          isAuthenticated: false,
        );

        expect(
          result.value,
          isNull,
          reason: club.organizerAuthority.trustState.name,
        );
      }
    });

    test('host runtime may preview an event for a hidden organizer', () {
      final result = buildEventDetailViewModel(
        eventAsync: AsyncData(buildEvent()),
        userProfileAsync: AsyncData(buildUser(uid: 'host-1')),
        reviewsAsync: const AsyncData(<Review>[]),
        clubAsync: AsyncData(
          buildClub().copyWith(appVisibility: ClubAppVisibility.hidden),
        ),
        savedEventAsync: const AsyncData(null),
        participationAsync: const AsyncData(null),
        currentUid: 'host-1',
        isAuthenticated: true,
        appRole: AppRole.host,
      );

      expect(result.requireValue, isNotNull);
      expect(result.requireValue!.isHost, isTrue);
    });

    test('host runtime denies an event owned by another organizer', () {
      final result = buildEventDetailViewModel(
        eventAsync: AsyncData(buildEvent()),
        userProfileAsync: AsyncData(buildUser(uid: 'other-host')),
        reviewsAsync: const AsyncData(<Review>[]),
        clubAsync: AsyncData(buildClub(hostUserId: 'owner-1')),
        savedEventAsync: const AsyncData(null),
        participationAsync: const AsyncData(null),
        currentUid: 'other-host',
        isAuthenticated: true,
        appRole: AppRole.host,
      );

      expect(result.value, isNull);
    });

    test('returns saved state from the saved event relationship doc', () {
      final result = buildEventDetailViewModel(
        eventAsync: AsyncData(buildEvent()),
        userProfileAsync: AsyncData(buildUser()),
        reviewsAsync: const AsyncData(<Review>[]),
        clubAsync: AsyncData(buildClub()),
        savedEventAsync: AsyncData(
          SavedEvent(
            id: savedEventId(uid: 'runner-1', eventId: 'event-1'),
            uid: 'runner-1',
            eventId: 'event-1',
            savedAt: DateTime(2026),
          ),
        ),
        currentUid: 'runner-1',
        isAuthenticated: true,
        participationAsync: const AsyncData(null),
      );

      expect(result.requireValue!.isSaved, isTrue);
    });

    test('returns participation state from the event participation edge', () {
      final participation = _participation(
        eventId: 'event-1',
        uid: 'runner-1',
        status: EventParticipationStatus.signedUp,
      );

      final result = buildEventDetailViewModel(
        eventAsync: AsyncData(buildEvent()),
        userProfileAsync: AsyncData(buildUser()),
        reviewsAsync: const AsyncData(<Review>[]),
        clubAsync: AsyncData(buildClub()),
        savedEventAsync: const AsyncData(null),
        participationAsync: AsyncData(participation),
        currentUid: 'runner-1',
        isAuthenticated: true,
      );

      expect(result.requireValue!.participation, participation);
    });

    test('returns null data when the event does not exist', () {
      final result = buildEventDetailViewModel(
        eventAsync: const AsyncData(null),
        userProfileAsync: AsyncData(buildUser()),
        reviewsAsync: const AsyncData(<Review>[]),
        clubAsync: AsyncData(buildClub()),
        savedEventAsync: const AsyncData(null),
        participationAsync: const AsyncData(null),
        currentUid: 'runner-1',
        isAuthenticated: true,
      );

      expect(result.value, isNull);
    });

    test('returns data with null userProfile when user is authenticated and '
        'the app user stream yields null', () {
      final result = buildEventDetailViewModel(
        eventAsync: AsyncData(buildEvent()),
        userProfileAsync: const AsyncData(null),
        reviewsAsync: const AsyncData(<Review>[]),
        clubAsync: AsyncData(buildClub()),
        savedEventAsync: const AsyncData(null),
        participationAsync: const AsyncData(null),
        currentUid: 'runner-1',
        isAuthenticated: true,
      );

      expect(result.requireValue, isNotNull);
      expect(result.requireValue!.userProfile, isNull);
    });

    test('surfaces event stream errors', () {
      final result = buildEventDetailViewModel(
        eventAsync: AsyncError(StateError('event failed'), StackTrace.empty),
        userProfileAsync: AsyncData(buildUser()),
        reviewsAsync: const AsyncData(<Review>[]),
        clubAsync: AsyncData(buildClub()),
        savedEventAsync: const AsyncData(null),
        participationAsync: const AsyncData(null),
        currentUid: 'runner-1',
        isAuthenticated: true,
      );

      expect(result.hasError, isTrue);
      expect(result.error, isA<StateError>());
    });

    test('surfaces app user stream errors', () {
      final result = buildEventDetailViewModel(
        eventAsync: AsyncData(buildEvent()),
        userProfileAsync: AsyncError(
          StateError('user failed'),
          StackTrace.empty,
        ),
        reviewsAsync: const AsyncData(<Review>[]),
        clubAsync: AsyncData(buildClub()),
        savedEventAsync: const AsyncData(null),
        participationAsync: const AsyncData(null),
        currentUid: 'runner-1',
        isAuthenticated: true,
      );

      expect(result.hasError, isTrue);
      expect(result.error, isA<StateError>());
    });

    test('surfaces review stream errors instead of swallowing them', () {
      final result = buildEventDetailViewModel(
        eventAsync: AsyncData(buildEvent()),
        userProfileAsync: AsyncData(buildUser()),
        reviewsAsync: AsyncError(
          StateError('reviews failed'),
          StackTrace.empty,
        ),
        clubAsync: AsyncData(buildClub()),
        savedEventAsync: const AsyncData(null),
        participationAsync: const AsyncData(null),
        currentUid: 'runner-1',
        isAuthenticated: true,
      );

      expect(result.hasError, isTrue);
      expect(result.error, isA<StateError>());
    });

    test('fails closed when saved state cannot be resolved', () {
      final result = buildEventDetailViewModel(
        eventAsync: AsyncData(buildEvent()),
        userProfileAsync: AsyncData(buildUser()),
        reviewsAsync: const AsyncData(<Review>[]),
        clubAsync: AsyncData(buildClub()),
        savedEventAsync: AsyncError(
          StateError('saved event failed'),
          StackTrace.empty,
        ),
        participationAsync: const AsyncData(null),
        currentUid: 'runner-1',
        isAuthenticated: true,
      );

      expect(result.hasError, isTrue);
      expect(result.error, isA<StateError>());
    });

    test('fails closed when participation state cannot be resolved', () {
      final result = buildEventDetailViewModel(
        eventAsync: AsyncData(buildEvent()),
        userProfileAsync: AsyncData(buildUser()),
        reviewsAsync: const AsyncData(<Review>[]),
        clubAsync: AsyncData(buildClub()),
        savedEventAsync: const AsyncData(null),
        participationAsync: AsyncError(
          StateError('participation failed'),
          StackTrace.empty,
        ),
        currentUid: 'runner-1',
        isAuthenticated: true,
      );

      expect(result.hasError, isTrue);
      expect(result.error, isA<StateError>());
    });

    test(
      'provider wires together the event, user, and reviews streams',
      () async {
        final event = buildEvent(id: 'event-77');
        final user = buildUser(uid: 'runner-77');
        final review = buildReview(eventId: 'event-77');
        final container = ProviderContainer(
          overrides: [
            uidProvider.overrideWith((ref) => Stream.value('runner-77')),
            watchEventProvider(
              event.id,
            ).overrideWith((ref) => Stream.value(event)),
            watchUserProfileProvider.overrideWith((ref) => Stream.value(user)),
            fetchClubProvider(
              event.clubId,
            ).overrideWith((ref) async => buildClub(hostUserId: 'host-77')),
            watchReviewsForEventProvider(
              event.id,
            ).overrideWith((ref) => Stream.value([review])),
            watchSavedEventProvider(
              user.uid,
              event.id,
            ).overrideWith((ref) => Stream.value(null)),
            watchEventParticipationProvider(
              event.id,
              user.uid,
            ).overrideWith((ref) => Stream.value(null)),
            watchClubMembershipProvider(
              event.clubId,
              user.uid,
            ).overrideWith((ref) => Stream.value(null)),
          ],
        );
        addTearDown(container.dispose);
        final subscription = container.listen(
          eventDetailViewModelProvider(event.id),
          (_, _) {},
          fireImmediately: true,
        );
        addTearDown(subscription.close);

        await container.read(watchEventProvider(event.id).future);
        await container.read(watchUserProfileProvider.future);
        await container.read(watchReviewsForEventProvider(event.id).future);
        await container.read(
          watchSavedEventProvider(user.uid, event.id).future,
        );
        await container.read(
          watchEventParticipationProvider(event.id, user.uid).future,
        );
        await container.read(
          watchClubMembershipProvider(event.clubId, user.uid).future,
        );
        await container.pump();
        await container.pump();

        final value = subscription.read().requireValue;
        expect(value, isNotNull);
        expect(value!.event, event);
        expect(value.userProfile, user);
        expect(value.reviews, [review]);
        expect(value.isHost, isFalse);
        expect(value.isSaved, isFalse);
        expect(value.participation, isNull);
      },
    );
  });

  group('EventDetailController', () {
    test('saves an unsaved event and returns the new saved state', () async {
      final repository = FakeSavedEventRepository();
      final container = ProviderContainer(
        overrides: [savedEventRepositoryProvider.overrideWithValue(repository)],
      );
      addTearDown(container.dispose);

      final nowSaved = await container
          .read(eventDetailControllerProvider.notifier)
          .toggleSavedEvent(
            event: buildEvent(id: 'event-9'),
            userProfile: buildUser(uid: 'runner-9'),
            isSaved: false,
          );

      expect(nowSaved, isTrue);
      expect(repository.savedUid, 'runner-9');
      expect(repository.savedEventId, 'event-9');
      expect(repository.unsavedEventId, isNull);
    });

    test('unsaves a saved event and returns the new saved state', () async {
      final repository = FakeSavedEventRepository();
      final container = ProviderContainer(
        overrides: [savedEventRepositoryProvider.overrideWithValue(repository)],
      );
      addTearDown(container.dispose);

      final nowSaved = await container
          .read(eventDetailControllerProvider.notifier)
          .toggleSavedEvent(
            event: buildEvent(id: 'event-10'),
            userProfile: buildUser(uid: 'runner-10'),
            isSaved: true,
          );

      expect(nowSaved, isFalse);
      expect(repository.unsavedUid, 'runner-10');
      expect(repository.unsavedEventId, 'event-10');
      expect(repository.savedEventId, isNull);
    });

    test(
      'records invite-link opens through the event repository seam',
      () async {
        final repository = FakeEventRepository();
        final container = ProviderContainer(
          overrides: [
            eventRepositoryProvider.overrideWith((ref) => repository),
          ],
        );
        addTearDown(container.dispose);

        await container
            .read(eventDetailControllerProvider.notifier)
            .recordInviteLinkOpenBestEffort(
              eventId: 'event-11',
              inviteLinkId: 'invite-11',
            );

        expect(repository.recordedInviteOpenEventId, 'event-11');
        expect(repository.recordedInviteOpenLinkId, 'invite-11');
      },
    );

    test(
      'logs but does not surface invite-link attribution failures',
      () async {
        final repository = FakeEventRepository()
          ..recordInviteOpenError = StateError('attribution failed');
        final errorLogger = _RecordingErrorLogger();
        final container = ProviderContainer(
          overrides: [
            eventRepositoryProvider.overrideWith((ref) => repository),
            errorLoggerProvider.overrideWithValue(errorLogger),
          ],
        );
        addTearDown(container.dispose);

        await container
            .read(eventDetailControllerProvider.notifier)
            .recordInviteLinkOpenBestEffort(
              eventId: 'event-12',
              inviteLinkId: 'invite-12',
            );

        expect(repository.recordedInviteOpenEventId, isNull);
        expect(repository.recordedInviteOpenLinkId, isNull);
        expect(errorLogger.loggedExceptions, hasLength(1));
        expect(
          errorLogger.loggedExceptions.single.message,
          contains('Unable to record invite link open best effort'),
        );
      },
    );
  });
}

class _RecordingErrorLogger extends ErrorLogger {
  _RecordingErrorLogger()
    : super(crashReporter: null, shouldReportErrors: false);

  final List<AppException> loggedExceptions = [];

  @override
  void logAppException(AppException exception) {
    loggedExceptions.add(exception);
  }

  @override
  void log({
    required LogLevel level,
    required String message,
    Object? error,
    StackTrace? stackTrace,
    Map<String, String>? context,
  }) {}
}

EventParticipation _participation({
  required String eventId,
  required String uid,
  required EventParticipationStatus status,
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
  );
}
