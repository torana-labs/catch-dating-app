import 'package:catch_dating_app/contexts/programmes/domain/program_live_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_message_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_branding_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_live_board_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_message_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_messages_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../../support/catch_test_fonts.dart';
import '../staff/staff_live_fixtures.dart';
import 'planner_board_fixtures.dart';
import 'planner_fixtures.dart';
import 'planner_test_pump.dart';

void main() {
  setUpAll(loadCatchTestFonts);

  test('planned messages parse plans and fall back without them', () {
    expect(plannerMessages.messages.map((m) => m.momentId), [
      'save-date',
      'reply-chase',
      'itinerary',
      'sangeet-reminder',
    ]);
    expect(plannerMessages.next?.momentId, 'itinerary');
    expect(plannerMessages.plannedCount, 2);
    expect(plannerMessages.forFunction('sangeet').single.offsetMinutes, -120);
    final legacy = ProgramPlannedMessages.fromCallableData({
      'moments': [
        {
          'momentId': 'm',
          'name': 'Mehendi',
          'revision': 2,
          'status': 'armed',
          'initiation': {
            'kind': 'anchored',
            'anchorKind': 'functionStart',
            'anchorId': 'mehendi',
            'offsetMinutes': 0,
          },
          'audience': {'kind': 'households', 'rsvpPendingOnly': false},
          'action': {'kind': 'push'},
        },
      ],
    });
    final message = legacy.messages.single;
    expect(message.anchorKind, ProgramMessageAnchorKind.function);
    expect(message.anchorId, 'mehendi');
    expect(message.state, ProgramMessageState.planned);
    expect(legacy.senderConnectionId, isNull);
  });

  test('a draft becomes the upsert initiation, audience and anchor', () {
    const draft = ProgramMessageDraft(
      anchorKind: ProgramMessageAnchorKind.function,
      anchorId: 'sangeet',
      offsetMinutes: -30,
      scheduledAt: null,
      audience: ProgramMessageAudience.comingOrMaybe,
      template: ProgramMessageTemplate.getReady,
      name: 'Get ready',
    );
    expect(draft.initiationJson(), {
      'kind': 'anchored',
      'anchorKind': 'functionStart',
      'anchorId': 'sangeet',
      'offsetMinutes': -30,
    });
    expect(draft.audienceJson()['rsvp'], ['attending', 'maybe']);
    expect(draft.anchorJson(), {'kind': 'function', 'id': 'sangeet'});
  });

  testWidgets('planned messages show state badges and open a message', (
    tester,
  ) async {
    String? opened;
    var planned = 0;
    await pumpPlannerBody(
      tester,
      HostProgrammeMessagesBody(
        status: HostProgrammeStatus.ready,
        messages: plannerMessages,
        functions: plannerState.functions,
        onOpen: (message) => opened = message.momentId,
        onPlan: () => planned++,
        onRetry: () {},
      ),
    );
    expect(find.text('Save the date'), findsOneWidget);
    expect(find.text('Sent to 118'), findsOneWidget);
    expect(find.text('Next'), findsOneWidget);
    expect(find.text('Draft'), findsOneWidget);
    await tester.tap(find.text('Sangeet tonight'));
    expect(opened, 'sangeet-reminder');
    await tester.tap(find.text('Plan another message'));
    expect(planned, 1);
  });

  testWidgets('the workspace tile names the next message', (tester) async {
    var seeAll = 0;
    await pumpPlannerBody(
      tester,
      HostProgrammeBody(
        state: plannerState,
        onView: (_) {},
        onOpenFunction: (_) {},
        onAddFunction: () {},
        onWaiting: () {},
        onRetry: () {},
        messages: plannerMessages,
        onMessages: () => seeAll++,
      ),
    );
    expect(find.text('Next: The itinerary, on 5 December'), findsOneWidget);
    expect(find.text('2 planned'), findsOneWidget);
    await tester.tap(find.text('See all'));
    expect(seeAll, 1);
  });

  testWidgets('the message editor offers lead times and audiences', (
    tester,
  ) async {
    ProgramMessageDraft? changed;
    await pumpPlannerBody(
      tester,
      HostProgrammeMessageBody(
        draft: const ProgramMessageDraft(
          anchorKind: ProgramMessageAnchorKind.function,
          anchorId: 'sangeet',
          offsetMinutes: -1440,
          scheduledAt: null,
          audience: ProgramMessageAudience.everyone,
          template: ProgramMessageTemplate.functionStarting,
          name: '',
        ),
        functions: plannerState.functions,
        flights: const [],
        hostName: 'Aditi and Kabir',
        hasSender: false,
        onChanged: (draft) => changed = draft,
        onPickDate: () {},
      ),
    );
    expect(
      find.text(
        'Connect a WhatsApp number in messaging before planning messages.',
      ),
      findsOneWidget,
    );
    await tester.tap(find.text('2 hours before'));
    expect(changed?.offsetMinutes, -120);
    await tester.tap(find.text('Guests coming to it'));
    expect(changed?.audience, ProgramMessageAudience.coming);
    expect(find.byType(HostProgrammeMessageBody), findsOneWidget);
    expect(
      find.byKey(const ValueKey('host-programme-message-function')),
      findsOneWidget,
    );
  });

  testWidgets('the live board shows the function on now and open alerts', (
    tester,
  ) async {
    final actions = <ProgramAlertAction>[];
    var all = 0;
    await pumpPlannerBody(
      tester,
      HostProgrammeLiveBoardBody(
        status: HostProgrammeStatus.ready,
        board: staffLiveBoard(),
        onRetry: () {},
        onAction: (_, action) => actions.add(action),
        onAllAlerts: () => all++,
      ),
    );
    expect(find.text('Checked in: 184 of 266'), findsOneWidget);
    expect(find.text('Dinner opens'), findsOneWidget);
    expect(find.text('2 open'), findsOneWidget);
    expect(
      find.text('A car has waited 20 minutes at the airport'),
      findsNothing,
    );
    await tester.tap(find.text('Take it'));
    expect(actions, [ProgramAlertAction.claim]);
    await tester.tap(find.text('All alerts'));
    expect(all, 1);
  });

  test('branding reads its default and the stored look', () {
    expect(ProgramBranding.fromMap(null).color, ProgramBrandColor.rani);
    expect(plannerBrandedProgram.branding.color, ProgramBrandColor.marigold);
    expect(plannerBrandedProgram.branding.creditLine, 'Meher Shah Weddings');
  });

  testWidgets('branding picks a colour and hides the credit', (tester) async {
    ProgramBranding? changed;
    bool? shown;
    await pumpPlannerBody(
      tester,
      HostProgrammeBrandingBody(
        program: plannerBrandedProgram,
        branding: plannerBrandedProgram.branding,
        showCredit: true,
        onChanged: (value) => changed = value,
        onShowCredit: (value) => shown = value,
      ),
    );
    expect(find.text('Planned by Meher Shah Weddings'), findsOneWidget);
    await tester.tap(find.text('Haldi yellow'));
    expect(changed?.color, ProgramBrandColor.haldi);
    await tester.tap(
      find.byKey(const ValueKey('host-programme-branding-show')),
    );
    expect(shown, isFalse);
  });
}
