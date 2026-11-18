import 'package:catch_dating_app/hosts/presentation/host_event_manage_screen_state.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_route_destination.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  HostEventRouteDestination resolve(
    HostEventManageSection section, {
    HostEventWorkspacePhase phase = HostEventWorkspacePhase.preparation,
    bool fits = true,
  }) => hostEventRouteDestination(
    section: section,
    phase: phase,
    liveConsoleFits: fits,
  );

  group('hostEventRouteDestination', () {
    test('setup opens the rebuilt workspace in every phase', () {
      for (final phase in HostEventWorkspacePhase.values) {
        for (final fits in [true, false]) {
          expect(
            resolve(HostEventManageSection.setup, phase: phase, fits: fits),
            HostEventRouteDestination.workspace,
          );
        }
      }
    });

    test('guests opens the rebuilt guest lists in every phase', () {
      for (final phase in HostEventWorkspacePhase.values) {
        expect(
          resolve(HostEventManageSection.guests, phase: phase, fits: false),
          HostEventRouteDestination.guests,
        );
      }
    });

    test('report opens the rebuilt report in every phase', () {
      for (final phase in HostEventWorkspacePhase.values) {
        expect(
          resolve(HostEventManageSection.report, phase: phase),
          HostEventRouteDestination.report,
        );
      }
    });

    test('live opens the rebuilt console for a night in one room', () {
      expect(
        resolve(
          HostEventManageSection.live,
          phase: HostEventWorkspacePhase.runtime,
        ),
        HostEventRouteDestination.liveConsole,
      );
      expect(
        resolve(HostEventManageSection.live),
        HostEventRouteDestination.liveConsole,
      );
    });

    test('live keeps the movement console for a night that moves', () {
      expect(
        resolve(
          HostEventManageSection.live,
          phase: HostEventWorkspacePhase.runtime,
          fits: false,
        ),
        HostEventRouteDestination.movementConsole,
      );
      expect(
        resolve(HostEventManageSection.live, fits: false),
        HostEventRouteDestination.movementConsole,
      );
    });

    test('live after the night opens the report', () {
      for (final fits in [true, false]) {
        expect(
          resolve(
            HostEventManageSection.live,
            phase: HostEventWorkspacePhase.recap,
            fits: fits,
          ),
          HostEventRouteDestination.report,
        );
      }
    });
  });

  test('only setup and guests open before the event is read', () {
    expect(
      HostEventManageSection.values.where(hostEventRouteOpensWithoutEvent),
      [HostEventManageSection.setup, HostEventManageSection.guests],
    );
  });
}
