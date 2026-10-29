import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/organizers/data/club_membership_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/clubs_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club_membership.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/contexts/reviews/data/reviews_repository.dart';
import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_dating_app/platform/errors/error_logger.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'club_detail_view_model.freezed.dart';
part 'club_detail_view_model.g.dart';

@freezed
abstract class ClubDetailViewModel with _$ClubDetailViewModel {
  const factory ClubDetailViewModel({
    required Club club,
    required bool isHost,
    required bool isMember,
    required List<Event> upcomingEvents,
    required List<Review> reviews,
    required UserProfile? userProfile,
    required String? uid,
    required bool isAuthenticated,
  }) = _ClubDetailViewModel;
}

/// **Pattern D: View-model provider**
///
/// Watches the club, events, reviews, user profile, and auth streams and
/// combines them into a single [ClubDetailViewModel].
///
/// Club, events, and auth identity are blocking because they control the main
/// route and schedule. Reviews, profile, and membership state are secondary;
/// they hydrate the detail screen when available without hiding newly-created
/// events behind the route's placeholder body.
@riverpod
AsyncValue<ClubDetailViewModel?> clubDetailViewModel(Ref ref, String clubId) {
  final clubAsync = ref.watch(watchClubProvider(clubId));
  final eventsAsync = ref.watch(watchEventsForClubProvider(clubId));
  final reviewsAsync = ref.watch(watchReviewsForClubProvider(clubId));
  final userProfileAsync = ref.watch(watchUserProfileProvider);
  final uidAsync = ref.watch(uidProvider);
  final reviewsState = catchAsyncStateFromAsyncValue(reviewsAsync);
  final userProfileState = catchAsyncStateFromAsyncValue(userProfileAsync);
  final uidState = catchAsyncStateFromAsyncValue(uidAsync);
  final uid = uidState.value;
  final membershipAsync = uid == null
      ? const AsyncData<ClubMembership?>(null)
      : ref.watch(watchClubMembershipProvider(clubId, uid));

  // Log errors from secondary (non-blocking) providers so they don't
  // silently disappear when discarded while building
  // buildClubDetailViewModel.
  if (reviewsState.hasError) {
    ref
        .read(errorLoggerProvider)
        .logError(
          reviewsState.error!,
          reviewsState.stackTrace,
          reason: 'Failed to load reviews for club $clubId',
        );
  }
  if (userProfileState.hasError) {
    ref
        .read(errorLoggerProvider)
        .logError(
          userProfileState.error!,
          userProfileState.stackTrace,
          reason: 'Failed to load user profile in club detail',
        );
  }

  return buildClubDetailViewModel(
    clubAsync: clubAsync,
    eventsAsync: eventsAsync,
    reviewsAsync: reviewsAsync,
    userProfileAsync: userProfileAsync,
    uidAsync: uidAsync,
    membershipAsync: membershipAsync,
    appRole: AppConfig.appRole,
  );
}

AsyncValue<ClubDetailViewModel?> buildClubDetailViewModel({
  required AsyncValue<Club?> clubAsync,
  required AsyncValue<List<Event>> eventsAsync,
  required AsyncValue<List<Review>> reviewsAsync,
  required AsyncValue<UserProfile?> userProfileAsync,
  required AsyncValue<String?> uidAsync,
  required AsyncValue<ClubMembership?> membershipAsync,
  AppRole appRole = AppRole.consumer,
  DateTime? now,
}) {
  final club = catchAsyncStateFromAsyncValue(clubAsync);
  final events = catchAsyncStateFromAsyncValue(eventsAsync);
  final reviews = catchAsyncStateFromAsyncValue(reviewsAsync);
  final userProfile = catchAsyncStateFromAsyncValue(userProfileAsync);
  final uid = catchAsyncStateFromAsyncValue(uidAsync);
  final membership = catchAsyncStateFromAsyncValue(membershipAsync);
  final uidValue = uid.value;
  final isAuthenticated = uidValue != null;

  // Always block on core data needed for the route and schedule.
  if (club.isLoading || events.isLoading || uid.isLoading) {
    return const AsyncLoading();
  }

  if (club.hasError) {
    return AsyncError(club.error!, club.stackTrace ?? StackTrace.current);
  }
  if (events.hasError) {
    return AsyncError(events.error!, events.stackTrace ?? StackTrace.current);
  }
  if (uid.hasError) {
    return AsyncError(uid.error!, uid.stackTrace ?? StackTrace.current);
  }
  final clubValue = club.value;
  if (clubValue == null) return const AsyncData(null);
  final isOwnedHostRoute = uidValue != null && clubValue.isHostedBy(uidValue);
  if (appRole.isHost && !isOwnedHostRoute) {
    return const AsyncData(null);
  }
  if (!appRole.isHost && !clubValue.isPubliclyBrowseable) {
    return const AsyncData(null);
  }
  // Membership only controls the consumer join/leave dock. An organizer owner
  // must not lose access to their own page when that unrelated edge is loading
  // or unavailable.
  if (isAuthenticated && !isOwnedHostRoute && membership.isLoading) {
    return const AsyncLoading();
  }
  if (isAuthenticated && !isOwnedHostRoute && membership.hasError) {
    return AsyncError(
      membership.error!,
      membership.stackTrace ?? StackTrace.current,
    );
  }

  final eventValues = events.value ?? const <Event>[];
  final effectiveNow = now ?? DateTime.now();
  final upcomingEvents =
      eventValues.where((event) => event.isUpcomingAt(effectiveNow)).toList()
        ..sort((a, b) => a.startTime.compareTo(b.startTime));
  final reviewValues = isAuthenticated
      ? (reviews.value ?? const <Review>[])
      : const <Review>[];
  final userProfileValue = isAuthenticated ? userProfile.value : null;
  final membershipValue = membership.value;
  final isActiveMember = membershipValue?.status == ClubMembershipStatus.active;

  return AsyncData(
    ClubDetailViewModel(
      club: clubValue,
      isHost: isAuthenticated && clubValue.isHostedBy(uidValue),
      isMember: isAuthenticated && isActiveMember,
      upcomingEvents: upcomingEvents,
      reviews: reviewValues,
      userProfile: userProfileValue,
      uid: uidValue,
      isAuthenticated: isAuthenticated,
    ),
  );
}
