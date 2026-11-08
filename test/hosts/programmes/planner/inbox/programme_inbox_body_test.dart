import 'package:catch_dating_app/contexts/programmes/domain/program_whatsapp_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/inbox/programme_inbox_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../../../support/catch_test_fonts.dart';
import '../planner_fixtures.dart';
import '../planner_test_pump.dart';
import '../planner_whatsapp_fixtures.dart';

void main() {
  setUpAll(loadCatchTestFonts);

  test('the inbox parses threads, counts and the number', () {
    expect(plannerWhatsappInbox.needsYou, 4);
    expect(plannerWhatsappInbox.handled, 31);
    expect(plannerWhatsappInbox.sender?.connected, isTrue);
    final mehra = plannerWhatsappInbox.threads.first;
    expect(mehra.escalation, ProgramWhatsappEscalation.notInFacts);
    expect(mehra.language, ProgramAssistantLanguage.hi);
    expect(plannerWhatsappInbox.threads.last.unknownSender, isTrue);
    expect(
      plannerCannedReplies.first.textFor(ProgramAssistantLanguage.hi),
      'Yes, at the staff rate.',
    );
    expect(
      () => ProgramWhatsappInbox.fromCallableData({'programId': 'p'}),
      throwsFormatException,
    );
  });

  testWidgets('the inbox lists, opens a thread, takes over and sends', (
    tester,
  ) async {
    final composer = TextEditingController();
    addTearDown(composer.dispose);
    ProgramWhatsappFilter? filtered;
    ProgramWhatsappHandledBy? handledBy;
    ProgramWhatsappThreadState? state;
    ProgramCannedReply? canned;
    String? sent;
    String? household;
    await pumpPlannerBody(
      tester,
      HostProgrammeInboxBody(
        status: HostProgrammeStatus.ready,
        inbox: plannerWhatsappInbox,
        filter: ProgramWhatsappFilter.needsYou,
        selectedThreadId: plannerWhatsappThread.summary.threadId,
        thread: plannerWhatsappThread,
        threadStatus: HostProgrammeStatus.ready,
        cannedReplies: plannerCannedReplies,
        composer: composer,
        now: plannerNow,
        onBack: () {},
        onSettings: () {},
        onFilter: (value) => filtered = value,
        onSelect: (_) {},
        onCloseThread: () {},
        onOpenHousehold: (id) => household = id,
        onHandling: (_, by, next) {
          handledBy = by;
          state = next;
        },
        onCanned: (reply) => canned = reply,
        onSend: (text) => sent = text,
        onRetry: () {},
      ),
      size: plannerDesktop,
    );
    expect(find.text('Guest messages'), findsWidgets);
    expect(find.text('Needs you 4'), findsOneWidget);
    expect(
      find.textContaining('Aditi’s side', findRichText: true),
      findsOneWidget,
    );
    expect(find.text('Passed to you'), findsWidgets);
    expect(
      find.text('The assistant · from their itinerary · Hindi'),
      findsOneWidget,
    );
    expect(find.text('Replies for the family · 4 guests'), findsOneWidget);
    await tester.tap(find.text('Handled 31'));
    expect(filtered, ProgramWhatsappFilter.handled);
    await tester.tap(
      find.byKey(const ValueKey<String>('host-programme-inbox-handling')),
    );
    expect(handledBy, ProgramWhatsappHandledBy.planner);
    expect(state, isNull);
    await tester.tap(find.text('Mark handled'));
    expect(state, ProgramWhatsappThreadState.handled);
    await tester.tap(
      find.byKey(
        const ValueKey<String>('host-programme-inbox-canned-staff-rate'),
      ),
    );
    expect(canned?.cannedReplyId, 'staff-rate');
    await tester.tap(
      find.byKey(const ValueKey<String>('host-programme-inbox-open-household')),
    );
    expect(household, 'mehra');
    await tester.enterText(
      find.descendant(
        of: find.byKey(const ValueKey<String>('host-programme-inbox-composer')),
        matching: find.byType(EditableText),
      ),
      'Yes, at the staff rate.',
    );
    await tester.ensureVisible(find.byTooltip('Send'));
    await tester.pump();
    await tester.tap(find.byTooltip('Send'));
    await tester.pump();
    expect(sent, 'Yes, at the staff rate.');
  });

  testWidgets('an unknown number cannot be answered from the inbox', (
    tester,
  ) async {
    final composer = TextEditingController();
    addTearDown(composer.dispose);
    final unknown = plannerWhatsappInbox.threads.last;
    await pumpPlannerBody(
      tester,
      HostProgrammeInboxBody(
        status: HostProgrammeStatus.ready,
        inbox: plannerWhatsappInbox,
        filter: ProgramWhatsappFilter.needsYou,
        selectedThreadId: unknown.threadId,
        thread: ProgramWhatsappThread(
          programId: plannerProgramId,
          summary: unknown,
          household: null,
          messages: const [],
          truncated: false,
        ),
        threadStatus: HostProgrammeStatus.ready,
        cannedReplies: plannerCannedReplies,
        composer: composer,
        now: plannerNow,
        onBack: () {},
        onSettings: () {},
        onFilter: (_) {},
        onSelect: (_) {},
        onCloseThread: () {},
        onOpenHousehold: (_) {},
        onHandling: (_, _, _) {},
        onCanned: (_) {},
        onSend: (_) {},
        onRetry: () {},
      ),
      size: plannerDesktop,
    );
    expect(
      find.text('Add this number to a household to reply.'),
      findsOneWidget,
    );
    expect(
      find.byKey(const ValueKey<String>('host-programme-inbox-handling')),
      findsNothing,
    );
    expect(
      find.byKey(
        const ValueKey<String>('host-programme-inbox-canned-staff-rate'),
      ),
      findsNothing,
    );
  });
}
