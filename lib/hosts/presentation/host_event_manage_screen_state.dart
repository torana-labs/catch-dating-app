import 'package:catch_dating_app/contexts/bookings/domain/event_participation_roster.dart';
import 'package:catch_dating_app/contexts/bookings/domain/host_attendance_window.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';

/// The part of an event an event link asks for; `hostEventRouteDestination`
/// turns it into a rebuilt screen.
enum HostEventManageSection { setup, guests, live, report }

/// Where an event is in its life: before the night, on the night, or after.
enum HostEventWorkspacePhase { preparation, runtime, recap }

HostEventWorkspacePhase hostEventWorkspacePhaseFor({
  required Event event,
  required DateTime now,
}) {
  final attendanceState = hostEventAttendanceStateFor(event: event, now: now);
  if (event.isCancelled || !now.isBefore(event.endTime)) {
    return HostEventWorkspacePhase.recap;
  }
  if (attendanceState == HostEventAttendanceState.open) {
    return HostEventWorkspacePhase.runtime;
  }
  return HostEventWorkspacePhase.preparation;
}

int hostManageBookedCount(Event event, EventParticipationRoster? roster) {
  final rosterCount = roster?.bookedCount;
  if (rosterCount == null) return event.signedUpCount;
  return rosterCount > event.signedUpCount ? rosterCount : event.signedUpCount;
}

int hostManageCheckedInCount(Event event, EventParticipationRoster? roster) {
  final rosterCount = roster?.checkedInCount;
  if (rosterCount == null) return event.attendedCount;
  return rosterCount > event.attendedCount ? rosterCount : event.attendedCount;
}
