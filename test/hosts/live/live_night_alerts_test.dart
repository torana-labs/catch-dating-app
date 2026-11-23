import 'package:catch_dating_app/contexts/bookings/domain/event_participation_roster.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_wingman_request.dart';
import 'package:catch_dating_app/hosts/live/live_needs_body.dart';
import 'package:catch_dating_app/hosts/live/live_night_alerts_controller.dart';
import 'package:catch_dating_app/hosts/live/live_night_alerts_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_test_support/catch_test_fonts.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../events/events_test_helpers.dart';

final _start = DateTime(2026, 11, 20, 19);

EventSuccessWingmanRequest _request(
  String id,
  String from,
  String to, {
  required int minute,
  bool active = true,
  String? note,
}) => EventSuccessWingmanRequest(
  id: id,
  eventId: 'event-1',
  organizerId: 'club-1',
  requesterUid: from,
  targetUid: to,
  status: active
      ? EventSuccessWingmanRequestStatus.active
      : EventSuccessWingmanRequestStatus.withdrawn,
  hostVisibleConsent: true,
  note: note,
  createdAt: _start,
  updatedAt: _start.add(Duration(minutes: minute)),
);

EventSuccessAssignment _pod(String uid, List<String> peers) =>
    EventSuccessAssignment(
      id: 'pod-$uid',
      eventId: 'event-1',
      organizerId: 'club-1',
      uid: uid,
      moduleId: 'micro_pods',
      label: 'Table 1',
      displayTitle: 'Table 1',
      peerUids: peers,
      source: 'generated',
      createdAt: _start,
      updatedAt: _start,
    );

void main() {
  setUpAll(loadCatchTestFonts);

  test('open intro requests come newest first with names and notes', () {
    final alerts = hostLiveNightAlertsFrom(
      requests: [
        _request('old', 'u-asha', 'u-dev', minute: 5, note: '  '),
        _request('gone', 'u-dev', 'u-asha', minute: 9, active: false),
        _request('new', 'u-zoya', 'u-dev', minute: 20, note: 'By the bar'),
      ],
      leftOutUids: const ['u-neel'],
      profiles: [
        buildPublicProfile(uid: 'u-asha', name: 'Asha'),
        buildPublicProfile(uid: 'u-dev', name: 'Dev'),
        buildPublicProfile(uid: 'u-zoya', name: 'Zoya'),
      ],
    );

    expect([for (final intro in alerts.intros) intro.id], ['new', 'old']);
    expect(alerts.intros.first.requesterName, 'Zoya');
    expect(alerts.intros.first.targetName, 'Dev');
    expect(alerts.intros.first.note, 'By the bar');
    expect(alerts.intros.last.note, isNull);
    expect(alerts.leftOut.single.uid, 'u-neel');
    expect(alerts.leftOut.single.name, isNull);
    expect(alerts.leftOutMinutes, 40);
  });

  test('a night without groups leaves nobody out', () {
    final event = buildEvent(
      startTime: _start,
      endTime: _start.add(const Duration(hours: 3)),
    );
    final roster = EventParticipationRoster(
      bookedIds: const ['u-asha', 'u-neel'],
      checkedInIds: const ['u-asha', 'u-neel'],
      waitlistedIds: const [],
      checkedInAtByUid: {'u-asha': _start, 'u-neel': _start},
    );
    final later = _start.add(const Duration(minutes: 50));

    expect(
      hostLiveLeftOutUids(
        event: event,
        roster: roster,
        assignments: const [],
        now: later,
      ),
      isEmpty,
    );
    // Asha has a table; Neel has had none for 50 minutes.
    expect(
      hostLiveLeftOutUids(
        event: event,
        roster: roster,
        assignments: [
          _pod('u-asha', const ['u-dev']),
        ],
        now: later,
      ),
      ['u-neel'],
    );
  });

  testWidgets('Needs lists the left out, then intro requests', (tester) async {
    tester.view.physicalSize = const Size(390, 1600);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      MaterialApp(
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: CatchRoot(
          theme: CatchThemeMode.night,
          child: CatchScreen(
            body: HostLiveNeedsBody(
              needs: const [],
              now: _start,
              onOpenNeed: (_) {},
              alerts: const HostLiveNightAlerts(
                leftOut: [HostLiveLeftOut(uid: 'u-neel', name: 'Neel Shah')],
                intros: [
                  HostLiveIntroRequest(
                    id: 'r1',
                    requesterName: 'Zoya',
                    targetName: 'Dev',
                    note: 'By the bar',
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('Guests need an introduction'), findsOneWidget);
    expect(find.text('Neel Shah'), findsOneWidget);
    expect(find.text('Asked for help meeting Dev'), findsOneWidget);
    expect(find.text('By the bar'), findsOneWidget);
    expect(
      tester.getTopLeft(find.text('Neel Shah')).dy,
      lessThan(tester.getTopLeft(find.text('Zoya')).dy),
    );
  });
}
