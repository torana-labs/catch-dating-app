import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_companion_screen.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

final _start = DateTime(2026, 11, 6, 17);

EventSuccessRotationSlot _doublesSlot(int round) => EventSuccessRotationSlot(
  roundIndex: round,
  label: 'Round ${round + 1}',
  startsAt: _start.add(Duration(minutes: 15 * round)),
  endsAt: _start.add(Duration(minutes: 15 * round + 15)),
  peerUid: 'tara',
  partnerUid: 'tara',
  opponentUids: const ['nikhil', 'zoya'],
  courtIndex: 1,
  peerCount: 3,
  compatibility: 'social',
);

EventSuccessSitOutSlot _bench(int round, {EventSuccessBenchNote? note}) =>
    EventSuccessSitOutSlot(
      roundIndex: round,
      label: 'Round ${round + 1}',
      startsAt: _start.add(Duration(minutes: 15 * round)),
      endsAt: _start.add(Duration(minutes: 15 * round + 15)),
      whySummary: 'Sitting out this round.',
      whyCodes: const ['sit_out'],
      benchNote: note,
    );

EventSuccessAssignment _assignment({
  required List<EventSuccessRotationSlot> slots,
  required List<EventSuccessSitOutSlot> sitOuts,
}) => EventSuccessAssignment(
  id: 'event-1_guided_rotations_me',
  eventId: 'event-1',
  organizerId: 'club-1',
  uid: 'me',
  moduleId: 'guided_rotations',
  label: 'Guided rotations',
  displayTitle: 'Guided rotations',
  peerUids: const ['tara', 'nikhil', 'zoya'],
  source: 'server_v1',
  createdAt: _start,
  updatedAt: _start,
  rotationSlots: slots,
  sitOutSlots: sitOuts,
);

Future<void> _pump(WidgetTester tester, Widget child) async {
  await tester.pumpWidget(
    MaterialApp(
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: CatchRoot(
        child: Material(child: SingleChildScrollView(child: child)),
      ),
    ),
  );
  await tester.pump();
}

void main() {
  test('the schedule lists doubles bench rounds in round order', () {
    final entries = rotationScheduleEntries(
      _assignment(
        slots: [_doublesSlot(0), _doublesSlot(2)],
        sitOuts: [_bench(1, note: EventSuccessBenchNote.commonArea)],
      ),
    );

    expect(entries.map((entry) => entry.roundIndex), [0, 1, 2]);
    expect(entries[1], isA<RotationScheduleBench>());
  });

  test('a singles break without a bench note stays off the schedule', () {
    final entries = rotationScheduleEntries(
      _assignment(slots: [_doublesSlot(0)], sitOuts: [_bench(1)]),
    );
    expect(entries, hasLength(1));
  });

  testWidgets('a doubles game names the court, the partner and both '
      'opponents', (tester) async {
    await _pump(
      tester,
      RotationSlotRow(
        slot: _doublesSlot(0),
        peerName: 'Tara',
        opponentNames: const ['Nikhil', 'Zoya'],
      ),
    );

    expect(
      find.textContaining('Court 2 · You and Tara against Nikhil and Zoya'),
      findsOneWidget,
    );
  });

  testWidgets('the bench says to mix in the common area', (tester) async {
    await _pump(
      tester,
      BenchSlotRow(slot: _bench(1, note: EventSuccessBenchNote.commonArea)),
    );

    expect(
      find.textContaining('Sitting out this round · mix in the common area'),
      findsOneWidget,
    );
  });

  testWidgets('every prompt has Skip, and skipping puts it away', (
    tester,
  ) async {
    await _pump(
      tester,
      const StagePromptCard(prompt: 'Find someone who has never been here.'),
    );

    expect(find.text('You can skip any prompt.'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('companionPromptSkip')));
    await tester.pump();

    expect(find.text('Find someone who has never been here.'), findsNothing);
  });
}
