import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:catch_dating_app/hosts/programmes/planner/widgets/programme_answers_sheet.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import 'planner_test_pump.dart';

const _answers = [
  HostProgrammeAnswer(
    functionId: 'sangeet',
    name: 'Sangeet',
    reply: HostProgrammeReply.noReply,
  ),
  HostProgrammeAnswer(
    functionId: 'haldi',
    name: 'Haldi',
    reply: HostProgrammeReply.notInvited,
  ),
];

void main() {
  testWidgets('a changed answer is recorded and shown', (tester) async {
    final recorded = <(String, HostProgrammeReply)>[];
    await pumpPlannerBody(
      tester,
      HostProgrammeAnswersSheet(
        guestName: 'Kamla Mehra',
        household: 'The Mehra family',
        answers: _answers,
        onAnswer: (functionId, reply) async {
          recorded.add((functionId, reply));
          return true;
        },
      ),
    );
    expect(find.text('Kamla Mehra'), findsOneWidget);
    expect(find.text('Sangeet'), findsOneWidget);
    await tester.tap(
      find.byKey(const ValueKey('host-programme-answer-sangeet-coming')),
    );
    await tester.pump();
    // An uninvited function takes an answer too.
    await tester.tap(
      find.byKey(const ValueKey('host-programme-answer-haldi-declined')),
    );
    await tester.pump();
    expect(recorded, [
      ('sangeet', HostProgrammeReply.coming),
      ('haldi', HostProgrammeReply.declined),
    ]);
  });

  testWidgets('a failed write keeps the old answer', (tester) async {
    var calls = 0;
    var succeed = false;
    await pumpPlannerBody(
      tester,
      HostProgrammeAnswersSheet(
        guestName: 'Kamla Mehra',
        answers: _answers,
        onAnswer: (_, _) async {
          calls++;
          return succeed;
        },
      ),
    );
    final maybe = find.byKey(
      const ValueKey('host-programme-answer-sangeet-maybe'),
    );
    await tester.tap(maybe);
    await tester.pump();
    // The failed answer was not kept, so choosing it again writes again;
    // once it is saved, choosing it again does nothing.
    succeed = true;
    await tester.tap(maybe);
    await tester.pump();
    await tester.tap(maybe);
    await tester.pump();
    expect(calls, 2);
  });

  test('every choice maps to a recordProgramFunctionRsvp status', () {
    expect(
      [for (final r in hostProgrammeAnswerChoices) hostProgrammeRsvpStatus(r)],
      ['attending', 'maybe', 'declined', 'pending'],
    );
  });
}
