import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/connections/data/swipe_candidate_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_recap_view_model.g.dart';

class EventRecapViewModel {
  const EventRecapViewModel({
    required this.event,
    required this.attendeeIds,
    required this.checkedInCount,
  });

  final Event event;
  final List<String> attendeeIds;
  final int checkedInCount;
}

@riverpod
AsyncValue<EventRecapViewModel?> eventRecapViewModel(Ref ref, String eventId) {
  return buildEventRecapViewModel(
    eventAsync: ref.watch(watchEventProvider(eventId)),
    uidAsync: ref.watch(uidProvider),
    candidatesAsync: ref.watch(swipeCandidatesProvider(eventId)),
  );
}

AsyncValue<EventRecapViewModel?> buildEventRecapViewModel({
  required AsyncValue<Event?> eventAsync,
  required AsyncValue<String?> uidAsync,
  required AsyncValue<List<PublicProfile>> candidatesAsync,
}) {
  final eventState = catchAsyncStateFromAsyncValue(eventAsync);
  final uidState = catchAsyncStateFromAsyncValue(uidAsync);
  final candidatesState = catchAsyncStateFromAsyncValue(candidatesAsync);
  if (eventState.isLoading || uidState.isLoading || candidatesState.isLoading) {
    return const AsyncLoading();
  }

  if (eventState.hasError) {
    return AsyncError(
      eventState.error!,
      eventState.stackTrace ?? StackTrace.current,
    );
  }
  if (uidState.hasError) {
    return AsyncError(
      uidState.error!,
      uidState.stackTrace ?? StackTrace.current,
    );
  }
  if (candidatesState.hasError) {
    return AsyncError(
      candidatesState.error!,
      candidatesState.stackTrace ?? StackTrace.current,
    );
  }

  final event = eventState.value;
  if (event == null) return const AsyncData(null);

  final currentUid = uidState.value;
  final attendeeIds = (candidatesState.value ?? const <PublicProfile>[])
      .map((profile) => profile.uid)
      .where((uid) => uid != currentUid)
      .toList(growable: false);

  return AsyncData(
    EventRecapViewModel(
      event: event,
      attendeeIds: List.unmodifiable(attendeeIds),
      checkedInCount: event.attendedCount,
    ),
  );
}
