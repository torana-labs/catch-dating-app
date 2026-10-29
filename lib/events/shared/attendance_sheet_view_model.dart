import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation_roster.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'attendance_sheet_view_model.g.dart';

class AttendanceSheetViewModel {
  const AttendanceSheetViewModel({
    required this.event,
    required this.attendeeIds,
    required this.attendedIds,
    required this.waitlistedIds,
    required this.profileIds,
    required this.participationsByUid,
  });

  final Event event;
  final List<String> attendeeIds;
  final Set<String> attendedIds;
  final List<String> waitlistedIds;
  final List<String> profileIds;
  final Map<String, EventParticipation> participationsByUid;

  int get checkedInCount => attendeeIds.where(attendedIds.contains).length;

  int get totalCount => attendeeIds.length;

  int get waitlistCount => waitlistedIds.length;

  bool get isEmpty => attendeeIds.isEmpty && waitlistedIds.isEmpty;

  bool isAttended(String uid) => attendedIds.contains(uid);

  EventParticipation? participationFor(String uid) => participationsByUid[uid];
}

@riverpod
AsyncValue<AttendanceSheetViewModel?> attendanceSheetViewModel(
  Ref ref,
  String eventId,
) {
  return buildAttendanceSheetViewModel(
    eventAsync: ref.watch(watchEventProvider(eventId)),
    participationsAsync: ref.watch(
      watchEventParticipationsForEventProvider(eventId),
    ),
  );
}

AsyncValue<AttendanceSheetViewModel?> buildAttendanceSheetViewModel({
  required AsyncValue<Event?> eventAsync,
  required AsyncValue<List<EventParticipation>> participationsAsync,
}) {
  if (eventAsync.isLoading || participationsAsync.isLoading) {
    return const AsyncLoading();
  }

  if (eventAsync.hasError) {
    return AsyncError(
      eventAsync.error!,
      eventAsync.stackTrace ?? StackTrace.current,
    );
  }
  if (participationsAsync.hasError) {
    return AsyncError(
      participationsAsync.error!,
      participationsAsync.stackTrace ?? StackTrace.current,
    );
  }

  final event = eventAsync.asData?.value;
  if (event == null) return const AsyncData(null);

  final roster = EventParticipationRoster.fromParticipations(
    participationsAsync.asData?.value ?? const [],
  );
  final participations =
      participationsAsync.asData?.value ?? const <EventParticipation>[];

  return AsyncData(
    AttendanceSheetViewModel(
      event: event,
      attendeeIds: roster.bookedIds,
      attendedIds: Set.unmodifiable(roster.checkedInIds),
      waitlistedIds: roster.waitlistedIds,
      profileIds: _uniqueOrderedIds([
        ...roster.bookedIds,
        ...roster.waitlistedIds,
      ]),
      participationsByUid: Map.unmodifiable({
        for (final participation in participations)
          participation.uid: participation,
      }),
    ),
  );
}

List<String> _uniqueOrderedIds(List<String> ids) {
  final seen = <String>{};
  return [
    for (final id in ids)
      if (seen.add(id)) id,
  ];
}
