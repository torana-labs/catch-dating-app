import 'package:catch_dating_app/contexts/bookings/data/booked_events_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_arrival_action.dart';
import 'package:catch_dating_app/contexts/connections/domain/swipe_window.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/messaging/data/activity_notification_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/activity_notification.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizer_membership_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/contexts/reviews/data/reviews_repository.dart';
import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'dashboard_full_view_model.g.dart';

const dashboardHomeClockTick = swipeWindowClockTick;

@riverpod
DateTime dashboardNow(Ref ref) => DateTime.now();

enum DashboardSectionStatus { loading, error, data }

class DashboardSectionModel<T> {
  const DashboardSectionModel._({
    required this.status,
    this.message,
    this.data,
    this.error,
  });

  const DashboardSectionModel.loading(String message)
    : this._(status: DashboardSectionStatus.loading, message: message);

  const DashboardSectionModel.error(String message, {Object? error})
    : this._(
        status: DashboardSectionStatus.error,
        message: message,
        error: error,
      );

  const DashboardSectionModel.data(T data)
    : this._(status: DashboardSectionStatus.data, data: data);

  final DashboardSectionStatus status;
  final String? message;
  final T? data;

  /// The original error for error-status sections, so the UI can render mapped
  /// copy + retry via the canonical error primitives instead of a fixed string.
  final Object? error;

  bool get isLoading => status == DashboardSectionStatus.loading;
  bool get hasError => status == DashboardSectionStatus.error;
}

class DashboardFullViewModel {
  const DashboardFullViewModel({
    required this.upcomingEvents,
    required this.nextEvent,
    required this.arrivalAction,
    required this.windowedEvents,
    required this.pendingReviewEvent,
    this.organizerPostNotifications = const <ActivityNotification>[],
    required this.attendedEventsSection,
  });

  final List<Event> upcomingEvents;
  final Event? nextEvent;
  final EventArrivalAction? arrivalAction;
  final List<DashboardCatchWindow> windowedEvents;
  final Event? pendingReviewEvent;
  final List<ActivityNotification> organizerPostNotifications;
  final DashboardSectionModel<List<Event>> attendedEventsSection;
}

/// The Home presentation of an attended event with an open Catch window.
class DashboardCatchWindow {
  const DashboardCatchWindow({
    required this.event,
    required this.windowClosesAt,
  });

  final Event event;
  final DateTime windowClosesAt;
  int get attendedCount => event.attendedCount;
}

List<DashboardCatchWindow> dashboardCatchWindowsFromEvents(
  Iterable<Event> events, {
  required DateTime now,
}) {
  final items =
      [
        for (final event in eventsWithOpenSwipeWindow(events, now: now))
          DashboardCatchWindow(
            event: event,
            windowClosesAt: swipeWindowClosesAt(event),
          ),
      ]..sort((a, b) {
        final expiry = a.windowClosesAt.compareTo(b.windowClosesAt);
        return expiry != 0 ? expiry : a.event.id.compareTo(b.event.id);
      });
  return List.unmodifiable(items);
}

enum DashboardHomeScreenStatus { loading, error, empty, full }

enum DashboardHomeLiveState {
  idle('idle'),
  booked('booked'),
  eventDay('event_day'),
  windowOpen('window_open');

  const DashboardHomeLiveState(this.analyticsValue);

  final String analyticsValue;
}

enum DashboardHomeRetryTarget { userProfile, memberships, signedUpEvents }

class DashboardHomeLoadError {
  const DashboardHomeLoadError({
    required this.error,
    required this.retryTarget,
    this.uid,
  });

  final Object error;
  final DashboardHomeRetryTarget retryTarget;
  final String? uid;
}

class DashboardHomeHeaderModel {
  const DashboardHomeHeaderModel._({this.userName, this.now});

  final String? userName;
  final DateTime? now;

  const factory DashboardHomeHeaderModel.empty() = DashboardHomeHeaderModel._;

  factory DashboardHomeHeaderModel.full({
    required UserProfile user,
    required DateTime now,
  }) =>
      DashboardHomeHeaderModel._(userName: user.greetingDisplayName, now: now);

  String title(AppLocalizations l10n) {
    final name = userName;
    final timestamp = now;
    if (name == null || timestamp == null) {
      return l10n.dashboardDashboardFullViewModelTitleLetSFindYour;
    }
    return l10n.dashboardDashboardFullViewModelTitleDashboardgreetingName(
      dashboardGreeting: dashboardGreeting(l10n, timestamp),
      name: name,
    );
  }
}

class DashboardHomeScreenState {
  const DashboardHomeScreenState._({
    required this.status,
    required this.header,
    this.error,
    this.user,
    this.viewModel,
    this.followedOrganizerIds = const <String>[],
    this.notificationUid,
  });

  DashboardHomeScreenState.loading()
    : this._(
        status: DashboardHomeScreenStatus.loading,
        header: const DashboardHomeHeaderModel.empty(),
      );

  DashboardHomeScreenState.error(DashboardHomeLoadError error)
    : this._(
        status: DashboardHomeScreenStatus.error,
        header: const DashboardHomeHeaderModel.empty(),
        error: error,
      );

  DashboardHomeScreenState.empty({String? notificationUid})
    : this._(
        status: DashboardHomeScreenStatus.empty,
        header: const DashboardHomeHeaderModel.empty(),
        notificationUid: notificationUid,
      );

  DashboardHomeScreenState.full({
    required DashboardHomeHeaderModel header,
    required UserProfile user,
    required DashboardFullViewModel viewModel,
    required List<String> followedOrganizerIds,
  }) : this._(
         status: DashboardHomeScreenStatus.full,
         header: header,
         user: user,
         viewModel: viewModel,
         followedOrganizerIds: followedOrganizerIds,
         notificationUid: user.uid,
       );

  final DashboardHomeScreenStatus status;
  final DashboardHomeHeaderModel header;
  final DashboardHomeLoadError? error;
  final UserProfile? user;
  final DashboardFullViewModel? viewModel;
  final List<String> followedOrganizerIds;
  final String? notificationUid;
}

String dashboardGreeting(AppLocalizations l10n, DateTime now) {
  final hour = now.hour;
  if (hour < 12) return l10n.dashboardDashboardFullViewModelVisiblecopyMorning;
  if (hour < 17) {
    return l10n.dashboardDashboardFullViewModelVisiblecopyAfternoon;
  }
  return l10n.dashboardDashboardFullViewModelVisiblecopyEvening;
}

DashboardHomeLiveState dashboardHomeLiveStateFor(
  DashboardHomeScreenState state, {
  required DateTime now,
}) {
  if (state.status != DashboardHomeScreenStatus.full) {
    return DashboardHomeLiveState.idle;
  }

  final viewModel = state.viewModel;
  if (viewModel == null) return DashboardHomeLiveState.idle;
  if (viewModel.windowedEvents.isNotEmpty) {
    return DashboardHomeLiveState.windowOpen;
  }
  if (viewModel.arrivalAction != null ||
      viewModel.upcomingEvents.any(
        (event) => _isSameLocalDay(event.startTime, now),
      )) {
    return DashboardHomeLiveState.eventDay;
  }
  if (viewModel.upcomingEvents.isNotEmpty) {
    return DashboardHomeLiveState.booked;
  }
  return DashboardHomeLiveState.idle;
}

List<String> dashboardHomeModuleImpressionsFor(DashboardHomeScreenState state) {
  if (state.status == DashboardHomeScreenStatus.loading ||
      state.status == DashboardHomeScreenStatus.error) {
    return const <String>[];
  }

  final viewModel = state.viewModel;
  if (viewModel == null) return const ['idle_cta'];

  final modules = <String>[];
  if (viewModel.windowedEvents.isNotEmpty) {
    modules.add('catch_window');
  }
  if (viewModel.upcomingEvents.isNotEmpty ||
      viewModel.arrivalAction != null ||
      viewModel.pendingReviewEvent != null) {
    modules.add('focus_rail');
  }
  final hasLiveModule = modules.isNotEmpty;
  if (!hasLiveModule) {
    modules.add('idle_cta');
  }
  if (viewModel.organizerPostNotifications.isNotEmpty) {
    modules.add('club_posts');
  }
  return List.unmodifiable(modules);
}

List<ActivityNotification> organizerPostNotificationsFromActivity(
  Iterable<ActivityNotification> notifications,
) {
  final posts =
      notifications
          .where(
            (notification) =>
                notification.isUnread &&
                (notification.type == ActivityNotificationType.organizerUpdate ||
                    notification.type ==
                        ActivityNotificationType.organizerUpdate) &&
                notification.postId != null,
          )
          .toList()
        ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
  return posts.take(3).toList(growable: false);
}

bool _isSameLocalDay(DateTime a, DateTime b) {
  return a.year == b.year && a.month == b.month && a.day == b.day;
}

DashboardFullViewModel buildDashboardFullViewModel({
  required List<Event> signedUpEvents,
  String? uid,
  required AsyncValue<List<Event>> attendedEventsAsync,
  AsyncValue<List<Review>> reviewsByUserAsync = const AsyncData<List<Review>>(
    [],
  ),
  List<ActivityNotification> organizerPostNotifications =
      const <ActivityNotification>[],
  DateTime? now,
}) {
  final effectiveNow = now ?? DateTime.now();
  final reviewsByUserState = catchAsyncStateFromAsyncValue(reviewsByUserAsync);

  final upcomingEvents =
      signedUpEvents
          .where((event) => event.startTime.isAfter(effectiveNow))
          .toList()
        ..sort((a, b) => a.startTime.compareTo(b.startTime));

  final nextEvent = upcomingEvents.firstOrNull;

  final attendedEventsSection = attendedEventsAsync.when(
    loading: () => const DashboardSectionModel<List<Event>>.loading(
      'Loading your recent events...',
    ),
    error: (error, stackTrace) => DashboardSectionModel<List<Event>>.error(
      'Unable to load your recent events.',
      error: error,
    ),
    data: DashboardSectionModel<List<Event>>.data,
  );
  final windowedEvents = attendedEventsSection.data == null
      ? const <DashboardCatchWindow>[]
      : dashboardCatchWindowsFromEvents(
          attendedEventsSection.data!,
          now: effectiveNow,
        );
  final reviewedEventIds =
      reviewsByUserState.value
          ?.map((review) => review.eventId)
          .whereType<String>()
          .toSet() ??
      const <String>{};
  final pendingReviewEvent = attendedEventsSection.data == null
      ? null
      : _latestUnreviewedAttendedEvent(
          attendedEventsSection.data!,
          reviewedEventIds: reviewedEventIds,
        );
  final arrivalAction = uid == null
      ? null
      : selectEventArrivalAction(
          signedUpEvents: signedUpEvents,
          hostedEvents: const [],
          uid: uid,
          now: effectiveNow,
        );

  return DashboardFullViewModel(
    upcomingEvents: upcomingEvents,
    nextEvent: nextEvent,
    arrivalAction: arrivalAction,
    windowedEvents: windowedEvents,
    pendingReviewEvent: pendingReviewEvent,
    organizerPostNotifications: organizerPostNotifications,
    attendedEventsSection: attendedEventsSection,
  );
}

Event? _latestUnreviewedAttendedEvent(
  List<Event> attendedEvents, {
  required Set<String> reviewedEventIds,
}) {
  final unreviewedEvents =
      attendedEvents
          .where((event) => !reviewedEventIds.contains(event.id))
          .toList()
        ..sort((a, b) => b.endTime.compareTo(a.endTime));
  return unreviewedEvents.firstOrNull;
}

/// Combines signed-up and attended events into the live-layer home model.
@riverpod
DashboardFullViewModel dashboardFullViewModel(
  Ref ref, {
  required List<Event> signedUpEvents,
  required UserProfile user,
  required String uid,
  required List<String> followedOrganizerIds,
}) {
  final notificationsAsync = ref.watch(watchActivityNotificationsProvider(uid));
  final organizerPostNotifications = organizerPostNotificationsFromActivity(
    catchAsyncStateFromAsyncValue(notificationsAsync).value ??
        const <ActivityNotification>[],
  );

  return buildDashboardFullViewModel(
    signedUpEvents: signedUpEvents,
    uid: uid,
    attendedEventsAsync: ref.watch(watchAttendedEventsProvider(uid)),
    reviewsByUserAsync: ref.watch(watchReviewsByUserProvider(uid)),
    organizerPostNotifications: organizerPostNotifications,
    now: ref.watch(dashboardNowProvider),
  );
}

/// Builds the route-level state for Dashboard Home.
///
/// The route widget should only switch over this state and compose the selected
/// sections; provider waves, retry targets, header copy, and empty/full
/// selection live here.
@riverpod
DashboardHomeScreenState dashboardHomeScreenState(Ref ref) {
  final now = ref.watch(dashboardNowProvider);
  final userAsync = ref.watch(watchUserProfileProvider);

  return userAsync.when(
    loading: DashboardHomeScreenState.loading,
    error: (error, stackTrace) => DashboardHomeScreenState.error(
      DashboardHomeLoadError(
        error: error,
        retryTarget: DashboardHomeRetryTarget.userProfile,
      ),
    ),
    data: (user) {
      if (user == null) {
        return DashboardHomeScreenState.empty();
      }

      final followedOrganizerIdsAsync = ref.watch(
        currentUserFollowedOrganizerIdsProvider,
      );
      final signedUpEventsAsync = ref.watch(
        watchSignedUpEventsProvider(user.uid),
      );
      final followedOrganizerIdsState = catchAsyncStateFromAsyncValue(
        followedOrganizerIdsAsync,
      );
      final signedUpEventsState = catchAsyncStateFromAsyncValue(
        signedUpEventsAsync,
      );

      if (followedOrganizerIdsState.isLoading ||
          signedUpEventsState.isLoading) {
        return DashboardHomeScreenState.loading();
      }
      if (followedOrganizerIdsState.hasError) {
        return DashboardHomeScreenState.error(
          DashboardHomeLoadError(
            error: followedOrganizerIdsState.error!,
            retryTarget: DashboardHomeRetryTarget.memberships,
            uid: user.uid,
          ),
        );
      }
      if (signedUpEventsState.hasError) {
        return DashboardHomeScreenState.error(
          DashboardHomeLoadError(
            error: signedUpEventsState.error!,
            retryTarget: DashboardHomeRetryTarget.signedUpEvents,
            uid: user.uid,
          ),
        );
      }

      final signedUpEvents = signedUpEventsState.value ?? const <Event>[];
      final followedOrganizerIds = [...?followedOrganizerIdsState.value]
        ..sort();
      final viewModel = ref.watch(
        dashboardFullViewModelProvider(
          signedUpEvents: signedUpEvents,
          user: user,
          uid: user.uid,
          followedOrganizerIds: followedOrganizerIds,
        ),
      );

      return DashboardHomeScreenState.full(
        header: DashboardHomeHeaderModel.full(user: user, now: now),
        user: user,
        viewModel: viewModel,
        followedOrganizerIds: followedOrganizerIds,
      );
    },
  );
}
