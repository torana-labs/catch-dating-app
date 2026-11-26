import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_manage_screen_state.dart';
import 'package:catch_test_support/events_test_helpers.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('An event is in exactly one lifecycle phase', () {
    final now = DateTime(2026, 8, 15, 12);
    final upcoming = buildEvent(
      startTime: now.add(const Duration(hours: 2)),
      endTime: now.add(const Duration(hours: 3)),
    );
    final runtime = buildEvent(
      startTime: now.add(const Duration(minutes: 5)),
      endTime: now.add(const Duration(hours: 2)),
    );
    final ended = buildEvent(
      startTime: now.subtract(const Duration(hours: 5)),
      endTime: now.subtract(const Duration(hours: 3)),
    );
    final cancelled = buildEvent(
      startTime: now.add(const Duration(days: 1)),
      endTime: now.add(const Duration(days: 1, hours: 2)),
      status: EventLifecycleStatus.cancelled,
    );

    expect(
      hostEventWorkspacePhaseFor(event: upcoming, now: now),
      HostEventWorkspacePhase.preparation,
    );
    expect(
      hostEventWorkspacePhaseFor(event: runtime, now: now),
      HostEventWorkspacePhase.runtime,
    );
    expect(
      hostEventWorkspacePhaseFor(event: ended, now: now),
      HostEventWorkspacePhase.recap,
    );
    expect(
      hostEventWorkspacePhaseFor(event: cancelled, now: now),
      HostEventWorkspacePhase.recap,
    );
  });
}
