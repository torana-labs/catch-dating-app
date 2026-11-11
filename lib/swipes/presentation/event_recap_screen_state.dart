import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/connections/domain/swipe_window.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:catch_dating_app/contexts/events/parts/event_catch_format.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/contexts/messaging/domain/event_chat.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/swipes/presentation/event_recap_view_model.dart';
import 'package:catch_dating_app/swipes/presentation/swipe_empty_content.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/catch_async_state.dart';
import 'package:catch_tokens/catch_tokens.dart';

/// After the event (RbAppAfter, RbAppDinnerAfter): a private rating, the
/// event's group chat, the people you'd like to see again, and the next
/// event from the same organiser.
sealed class EventRecapScreenState {
  const EventRecapScreenState();
}

final class EventRecapLoading extends EventRecapScreenState {
  const EventRecapLoading();
}

final class EventRecapError extends EventRecapScreenState {
  const EventRecapError({required this.error, required this.retryIntent});

  final Object error;
  final EventRecapRetryIntent retryIntent;
}

final class EventRecapMissingEvent extends EventRecapScreenState {
  const EventRecapMissingEvent();
}

enum EventRecapProfileLookupStatus { loading, error, ready }

final class EventRecapReady extends EventRecapScreenState {
  const EventRecapReady({
    required this.eventId,
    required this.organizerId,
    required this.format,
    required this.kicker,
    required this.rating,
    required this.chat,
    required this.people,
    required this.next,
    required this.organizerName,
    required this.following,
  });

  final String eventId;
  final String organizerId;
  final CatchFormat format;

  /// Null until the organiser's page is read.
  final String? organizerName;

  /// Whether the guest follows the organiser; null until known.
  final bool? following;

  /// "Tuesday Trivia Night · Lantern Lane Social".
  final String kicker;
  final EventRecapRatingState rating;

  /// Null when the event has no group chat this guest can open.
  final EventRecapChatState? chat;
  final EventRecapPeopleState people;

  /// Null when the organiser has nothing coming up.
  final EventRecapNextState? next;
}

/// The private rating: one to five stars, saved as Event Success feedback
/// that only reaches the organiser inside the event's summary.
class EventRecapRatingState {
  const EventRecapRatingState({
    required this.rating,
    required this.privacyNote,
    required this.enabled,
    this.existingFeedback,
  });

  /// 0 until the guest rates.
  final int rating;

  /// "Only Lantern Lane Social sees this, as part of a summary."
  final String privacyNote;

  /// False until the guest's profile is known.
  final bool enabled;
  final EventSuccessFeedback? existingFeedback;
}

class EventRecapChatState {
  const EventRecapChatState({required this.title, required this.subtitle});

  final String title;

  /// When it closes, or that the host hasn't opened it yet.
  final String subtitle;
}

class EventRecapPeopleState {
  const EventRecapPeopleState({
    required this.status,
    required this.rows,
    required this.attendeeIds,
    required this.windowNote,
    required this.countNote,
    required this.canPick,
    this.error,
    this.empty,
  });

  final EventRecapProfileLookupStatus status;
  final List<EventRecapPersonRow> rows;
  final List<String> attendeeIds;

  /// "Picks are open until 9:30 PM", or that they've closed.
  final String windowNote;

  /// "6 people from Tuesday Trivia Night, by your filters".
  final String? countNote;

  /// The 24-hour window after the event is open.
  final bool canPick;
  final Object? error;

  /// Why there's nobody to pick, when the list is empty.
  final SwipeEmptyContent? empty;
}

class EventRecapPersonRow {
  const EventRecapPersonRow({
    required this.attendeeId,
    required this.name,
    required this.subtitle,
    required this.picked,
    this.body,
    this.photoUrl,
  });

  final String attendeeId;
  final String name;

  /// "Your team · Harbour Lights", or the person's city and age.
  final String subtitle;

  /// What they do, when their profile says.
  final String? body;
  final String? photoUrl;
  final bool picked;
}

class EventRecapNextState {
  const EventRecapNextState({
    required this.eventId,
    required this.organizerId,
    required this.kicker,
    required this.title,
    required this.event,
  });

  final String eventId;
  final String organizerId;

  /// "Next · Tue, 3 Nov".
  final String kicker;
  final String title;
  final Event event;
}

class EventRecapRetryIntent {
  const EventRecapRetryIntent({required this.eventId});

  final String eventId;
}

/// Everything the after-event screen reads, as loaded state.
class EventRecapInputs {
  const EventRecapInputs({
    required this.viewModel,
    required this.rosterProfiles,
    this.organizerName,
    this.currentUser,
    this.participation,
    this.feedback,
    this.assignment,
    this.chatAccess,
    this.organizerEvents = const <Event>[],
    this.pickedIds = const <String>{},
    this.pendingRating,
    this.followedOrganizerIds,
  });

  final CatchAsyncState<EventRecapViewModel?> viewModel;
  final CatchAsyncState<Map<String, PublicProfile>> rosterProfiles;
  final String? organizerName;
  final UserProfile? currentUser;
  final EventParticipation? participation;
  final EventSuccessFeedback? feedback;
  final EventSuccessAssignment? assignment;
  final EventChatAccess? chatAccess;
  final List<Event> organizerEvents;

  /// People picked on this screen; a pick can't be taken back.
  final Set<String> pickedIds;

  /// A rating tapped but not yet saved.
  final int? pendingRating;

  /// Organisers the guest follows; null until known.
  final Set<String>? followedOrganizerIds;
}

EventRecapScreenState buildEventRecapScreenState({
  required String eventId,
  required EventRecapInputs inputs,
  required AppLocalizations l10n,
  DateTime? now,
}) {
  final viewModel = inputs.viewModel;
  return switch (viewModel.status) {
    CatchAsyncStatus.loading => const EventRecapLoading(),
    CatchAsyncStatus.error => EventRecapError(
      error: viewModel.error!,
      retryIntent: EventRecapRetryIntent(eventId: eventId),
    ),
    CatchAsyncStatus.data => _readyState(
      viewModel: viewModel.value,
      inputs: inputs,
      l10n: l10n,
      now: now ?? DateTime.now(),
    ),
  };
}

EventRecapScreenState _readyState({
  required EventRecapViewModel? viewModel,
  required EventRecapInputs inputs,
  required AppLocalizations l10n,
  required DateTime now,
}) {
  if (viewModel == null) return const EventRecapMissingEvent();
  final event = viewModel.event;
  final organizerName = inputs.organizerName?.trim();
  final hasOrganizerName = organizerName != null && organizerName.isNotEmpty;
  final feedback = inputs.feedback;

  return EventRecapReady(
    eventId: event.id,
    organizerId: event.organizerId,
    format: catchFormatForActivity(event.activityKind),
    kicker: hasOrganizerName
        ? l10n.afterEventKicker(
            eventTitle: event.title,
            organizer: organizerName,
          )
        : event.title,
    rating: EventRecapRatingState(
      rating: inputs.pendingRating ?? feedback?.welcomeRating ?? 0,
      privacyNote: hasOrganizerName
          ? l10n.afterEventRatingPrivacy(organizer: organizerName)
          : l10n.afterEventRatingPrivacyFallback,
      enabled: inputs.currentUser != null,
      existingFeedback: feedback,
    ),
    chat: _chatState(inputs.chatAccess, l10n),
    people: _peopleState(
      event: event,
      viewModel: viewModel,
      inputs: inputs,
      l10n: l10n,
      now: now,
    ),
    next: _nextState(event, inputs.organizerEvents, l10n, now),
    organizerName: hasOrganizerName ? organizerName : null,
    following: inputs.followedOrganizerIds?.contains(event.organizerId),
  );
}

EventRecapChatState? _chatState(
  EventChatAccess? access,
  AppLocalizations l10n,
) {
  if (access == null) return null;
  if (!access.canReadMessages && !access.canJoin) return null;
  final closesAtMillis = access.closesAtMillis;
  final String subtitle;
  if (!access.isRoomOpen) {
    subtitle = l10n.eventChatGuestWaiting;
  } else if (closesAtMillis != null) {
    subtitle = l10n.afterEventChatOpenUntil(
      date: EventFormatters.shortDate(
        DateTime.fromMillisecondsSinceEpoch(closesAtMillis),
      ),
    );
  } else {
    subtitle = l10n.eventChatEntryBody;
  }
  return EventRecapChatState(title: access.title, subtitle: subtitle);
}

EventRecapPeopleState _peopleState({
  required Event event,
  required EventRecapViewModel viewModel,
  required EventRecapInputs inputs,
  required AppLocalizations l10n,
  required DateTime now,
}) {
  final closesAt = swipeWindowClosesAt(event);
  final canPick = hasOpenSwipeWindow(event, now: now);
  final windowNote = canPick
      ? l10n.afterEventPicksOpenUntil(time: EventFormatters.time(closesAt))
      : l10n.afterEventPicksClosed;
  final attendeeIds = viewModel.attendeeIds;
  if (attendeeIds.isEmpty) {
    return EventRecapPeopleState(
      status: EventRecapProfileLookupStatus.ready,
      rows: const [],
      attendeeIds: const [],
      windowNote: windowNote,
      countNote: null,
      canPick: canPick,
      empty: buildSwipeEmptyContent(
        l10n: l10n,
        event: event,
        currentUser: inputs.currentUser,
        currentUserParticipation: inputs.participation,
        now: now,
      ),
    );
  }

  final roster = inputs.rosterProfiles;
  final status = switch (roster.status) {
    CatchAsyncStatus.loading => EventRecapProfileLookupStatus.loading,
    CatchAsyncStatus.error => EventRecapProfileLookupStatus.error,
    CatchAsyncStatus.data => EventRecapProfileLookupStatus.ready,
  };
  final profiles = roster.value ?? const <String, PublicProfile>{};
  final assignment = inputs.assignment;
  final teammates = assignment?.peerUids.toSet() ?? const <String>{};
  final teamName = assignment?.displayTitle.trim();
  final rows = status == EventRecapProfileLookupStatus.ready
      ? [
          for (final id in attendeeIds)
            _personRow(
              id: id,
              profile: profiles[id],
              onTeam: teammates.contains(id),
              teamName: teamName,
              picked: inputs.pickedIds.contains(id),
              l10n: l10n,
            ),
        ]
      : <EventRecapPersonRow>[];
  // Your team or table first, then everyone else in check-in order.
  final ordered = [
    ...rows.where((row) => teammates.contains(row.attendeeId)),
    ...rows.where((row) => !teammates.contains(row.attendeeId)),
  ];

  return EventRecapPeopleState(
    status: status,
    rows: List.unmodifiable(ordered),
    attendeeIds: List.unmodifiable(attendeeIds),
    windowNote: windowNote,
    countNote: l10n.afterEventPeopleCount(
      count: attendeeIds.length,
      eventTitle: event.title,
    ),
    canPick: canPick,
    error: roster.error,
  );
}

EventRecapPersonRow _personRow({
  required String id,
  required PublicProfile? profile,
  required bool onTeam,
  required String? teamName,
  required bool picked,
  required AppLocalizations l10n,
}) {
  final name =
      profile?.name ?? l10n.swipesEventRecapScreenStateDisplaynameGuest;
  final city = profile?.city?.trim();
  final String subtitle;
  if (onTeam) {
    subtitle = teamName == null || teamName.isEmpty
        ? l10n.afterEventYourGroup
        : l10n.afterEventYourGroupNamed(group: teamName);
  } else if (profile != null && city != null && city.isNotEmpty) {
    subtitle = l10n.afterEventPersonCityAge(city: city, age: profile.age);
  } else if (profile != null) {
    subtitle = l10n.afterEventPersonAge(age: profile.age);
  } else {
    subtitle = l10n.afterEventPersonCameToo;
  }
  final occupation = profile?.occupation?.trim();
  return EventRecapPersonRow(
    attendeeId: id,
    name: name,
    subtitle: subtitle,
    body: occupation == null || occupation.isEmpty ? null : occupation,
    photoUrl: profile?.primaryPhotoThumbnailUrl,
    picked: picked,
  );
}

EventRecapNextState? _nextState(
  Event event,
  List<Event> organizerEvents,
  AppLocalizations l10n,
  DateTime now,
) {
  final upcoming =
      organizerEvents
          .where((e) => e.id != event.id && e.startTime.isAfter(now))
          .toList()
        ..sort((a, b) => a.startTime.compareTo(b.startTime));
  if (upcoming.isEmpty) return null;
  final next = upcoming.first;
  return EventRecapNextState(
    eventId: next.id,
    organizerId: next.organizerId,
    kicker: l10n.afterEventNextKicker(date: next.shortDateLabel),
    title: next.title,
    event: next,
  );
}
