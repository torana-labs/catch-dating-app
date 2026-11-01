import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/discovery/data/saved_event_repository.dart';
import 'package:catch_dating_app/contexts/discovery/domain/saved_event.dart';
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
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_detail_view_model.freezed.dart';
part 'event_detail_view_model.g.dart';

@freezed
abstract class EventDetailViewModel with _$EventDetailViewModel {
  const factory EventDetailViewModel({
    required Event event,
    required UserProfile? userProfile,
    required List<Review> reviews,
    required bool isAuthenticated,
    required bool isHost,
    required bool isSaved,
    @Default(false) bool isOrganizerMember,
    required EventParticipation? participation,
  }) = _EventDetailViewModel;
}

// provider-graph: high-fan-out:eventDetailViewModelProvider accepted -- The eight dependencies form one Event Detail route projection: auth resolution, event and organizer authority, viewer profile, reviews, saved state, participation, and organizer membership. Their loading and error precedence is intentionally centralized so Event Detail and its map route cannot render inconsistent visibility or viewer actions.
/// **Pattern D: View-model provider**
///
/// Watches several stream/future providers and combines them into one
/// [AsyncValue] via [buildEventDetailViewModel]. Each input is individually
/// checked for loading/error so the combined result is [AsyncError] if any
/// input fails or [AsyncLoading] if any input is still loading.
///
/// **When to use this pattern:** Screens that need data from multiple
/// independent sources and want a single `.when(loading:error:data:)` call
/// instead of managing multiple async states.
@riverpod
AsyncValue<EventDetailViewModel?> eventDetailViewModel(
  Ref ref,
  String eventId,
) {
  final uidAsync = ref.watch(uidProvider);
  final uidState = catchAsyncStateFromAsyncValue(uidAsync);
  final uid = uidState.value;
  final isAuthenticated = uid != null;
  final eventAsync = ref.watch(watchEventProvider(eventId));
  final event = catchAsyncStateFromAsyncValue(eventAsync).value;
  final organizerAsync = event == null
      ? const AsyncData<Organizer?>(null)
      : ref.watch(fetchOrganizerProvider(event.organizerId));
  final savedEventAsync = uid == null
      ? const AsyncData<SavedEvent?>(null)
      : ref.watch(watchSavedEventProvider(uid, eventId));
  final participationAsync = uid == null
      ? const AsyncData<EventParticipation?>(null)
      : ref.watch(watchEventParticipationProvider(eventId, uid));
  final membershipAsync = uid == null || event == null
      ? const AsyncData<OrganizerMembership?>(null)
      : ref.watch(watchOrganizerMembershipProvider(event.organizerId, uid));

  return buildEventDetailViewModel(
    eventAsync: eventAsync,
    userProfileAsync: ref.watch(watchUserProfileProvider),
    reviewsAsync: ref.watch(watchReviewsForEventProvider(eventId)),
    organizerAsync: organizerAsync,
    savedEventAsync: savedEventAsync,
    participationAsync: participationAsync,
    membershipAsync: membershipAsync,
    currentUid: uid,
    isAuthenticated: isAuthenticated,
    appRole: AppConfig.appRole,
    authResolved: uidState.hasData || uidState.hasError,
    authError: uidState.hasError ? uidState.error : null,
    authStackTrace: uidState.hasError ? uidState.stackTrace : null,
  );
}

AsyncValue<EventDetailViewModel?> buildEventDetailViewModel({
  required AsyncValue<Event?> eventAsync,
  required AsyncValue<UserProfile?> userProfileAsync,
  required AsyncValue<List<Review>> reviewsAsync,
  required AsyncValue<Organizer?> organizerAsync,
  required AsyncValue<SavedEvent?> savedEventAsync,
  required AsyncValue<EventParticipation?> participationAsync,
  AsyncValue<OrganizerMembership?> membershipAsync =
      const AsyncData<OrganizerMembership?>(null),
  required String? currentUid,
  required bool isAuthenticated,
  AppRole appRole = AppRole.consumer,
  bool authResolved = true,
  Object? authError,
  StackTrace? authStackTrace,
}) {
  final eventState = catchAsyncStateFromAsyncValue(eventAsync);
  final userProfileState = catchAsyncStateFromAsyncValue(userProfileAsync);
  final reviewsState = catchAsyncStateFromAsyncValue(reviewsAsync);
  final organizerState = catchAsyncStateFromAsyncValue(organizerAsync);
  final savedEventState = catchAsyncStateFromAsyncValue(savedEventAsync);
  final participationState = catchAsyncStateFromAsyncValue(participationAsync);
  final membershipState = catchAsyncStateFromAsyncValue(membershipAsync);

  // Do not transiently derive guest actions while Firebase auth is resolving.
  // This is especially important for route-extra fallbacks and save/review
  // controls whose policy differs for a signed-in viewer.
  if (!authResolved) return const AsyncLoading();

  if (authError != null) {
    return AsyncError(authError, authStackTrace ?? StackTrace.current);
  }

  // Event and organizer authority are blocking for every viewer. Rendering a
  // public event before its organizer resolves can leak a hidden listing and
  // transiently show the wrong guest actions.
  if (eventState.isLoading || organizerState.isLoading) {
    return const AsyncLoading();
  }
  // For authenticated users, also block on reviews + user profile.
  if (isAuthenticated) {
    if (userProfileState.isLoading ||
        reviewsState.isLoading ||
        savedEventState.isLoading ||
        participationState.isLoading) {
      return const AsyncLoading();
    }
  }

  // Event error is always fatal.
  if (eventState.hasError) {
    return AsyncError(
      eventState.error!,
      eventState.stackTrace ?? StackTrace.current,
    );
  }
  if (organizerState.hasError) {
    return AsyncError(
      organizerState.error!,
      organizerState.stackTrace ?? StackTrace.current,
    );
  }

  // Reviews and userProfile errors only fatal for authenticated users.
  if (isAuthenticated) {
    if (userProfileState.hasError) {
      return AsyncError(
        userProfileState.error!,
        userProfileState.stackTrace ?? StackTrace.current,
      );
    }
    if (reviewsState.hasError) {
      return AsyncError(
        reviewsState.error!,
        reviewsState.stackTrace ?? StackTrace.current,
      );
    }
    if (savedEventState.hasError) {
      return AsyncError(
        savedEventState.error!,
        savedEventState.stackTrace ?? StackTrace.current,
      );
    }
    if (participationState.hasError) {
      return AsyncError(
        participationState.error!,
        participationState.stackTrace ?? StackTrace.current,
      );
    }
  }

  final event = eventState.value;
  if (event == null) return const AsyncData(null);
  final organizer = organizerState.value;
  if (organizer == null) return const AsyncData(null);
  final isOwnedHostRoute =
      isAuthenticated && currentUid != null && organizer.isHostedBy(currentUid);
  if (appRole.isHost && !isOwnedHostRoute) {
    return const AsyncData(null);
  }
  if (!appRole.isHost && !organizer.isPubliclyBrowseable) {
    return const AsyncData(null);
  }
  if (isAuthenticated && !isOwnedHostRoute && membershipState.isLoading) {
    return const AsyncLoading();
  }
  if (isAuthenticated && !isOwnedHostRoute && membershipState.hasError) {
    return AsyncError(
      membershipState.error!,
      membershipState.stackTrace ?? StackTrace.current,
    );
  }

  final userProfile = isAuthenticated ? userProfileState.value : null;
  final reviews = isAuthenticated
      ? (reviewsState.value ?? const <Review>[])
      : const <Review>[];
  final participation = isAuthenticated ? participationState.value : null;
  final isHost =
      isAuthenticated && currentUid != null && organizer.isHostedBy(currentUid);
  final isSaved = isAuthenticated && savedEventState.value != null;
  final isOrganizerMember =
      isAuthenticated &&
      membershipState.value?.status == OrganizerMembershipStatus.active;

  return AsyncData(
    EventDetailViewModel(
      event: event,
      userProfile: userProfile,
      reviews: reviews,
      isAuthenticated: isAuthenticated,
      isHost: isHost,
      isSaved: isSaved,
      isOrganizerMember: isOrganizerMember,
      participation: participation,
    ),
  );
}
