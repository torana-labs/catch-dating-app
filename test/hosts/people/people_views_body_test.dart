import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_automation.dart';
import 'package:catch_dating_app/hosts/people/automations_body.dart';
import 'package:catch_dating_app/hosts/people/compose_body.dart';
import 'package:catch_dating_app/hosts/people/compose_state.dart';
import 'package:catch_dating_app/hosts/people/messages_body.dart';
import 'package:catch_dating_app/hosts/people/messages_state.dart';
import 'package:catch_dating_app/hosts/people/saved_group_body.dart';
import 'package:catch_dating_app/hosts/people/saved_group_state.dart';
import 'package:catch_dating_app/hosts/people/widgets/people_tabs.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../test_pump_helpers.dart';
import 'people_fixtures.dart';
import 'people_test_pump.dart';

void main() {
  testWidgets('Messages shows the chips, Automatic messages and the '
      'conversations, bold while they wait on the host', (tester) async {
    final views = <HostPeopleView>[];
    final filters = <HostMessagesFilter>[];
    final threads = <HostMessageThread>[];
    var automations = 0;
    await pumpPeopleBody(
      tester,
      HostMessagesBody(
        state: messagesState(),
        now: peopleNow,
        onView: views.add,
        onFilter: filters.add,
        onOpenThread: threads.add,
        onAutomations: () => automations++,
        onRetry: () {},
      ),
    );

    expect(find.text('All'), findsOneWidget);
    expect(find.text('Unread'), findsOneWidget);
    expect(find.text('Tonight'), findsNWidgets(3));
    expect(find.text('Automatic messages'), findsOneWidget);
    expect(find.text('6 on · 1,204 sent this month'), findsOneWidget);
    expect(find.text('Zoya Merchant'), findsOneWidget);
    expect(
      find.text('Can I bring my sister? She’s visiting till Sunday'),
      findsOneWidget,
    );
    expect(find.text('7:12 PM'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('host-messages-filter-unread')));
    await tester.tap(find.text('Automatic messages'));
    await tester.tap(find.text('Zoya Merchant'));
    await tester.tap(find.text('Forms'));
    expect(filters, [HostMessagesFilter.unread]);
    expect(automations, 1);
    expect(threads.single.personId, 'uid:zm');
    expect(views, [HostPeopleView.forms]);
  });

  testWidgets('an empty chip says so', (tester) async {
    await pumpPeopleBody(
      tester,
      HostMessagesBody(
        state: const HostMessagesState(
          status: HostMessagesStatus.ready,
          filter: HostMessagesFilter.tonight,
        ),
        now: peopleNow,
        onView: (_) {},
        onFilter: (_) {},
        onOpenThread: (_) {},
        onAutomations: () {},
        onRetry: () {},
      ),
    );
    expect(find.text('No messages about tonight.'), findsOneWidget);
  });

  testWidgets('Compose shows who it is from, the audience with Change, the '
      'message and the event', (tester) async {
    final audiences = <HostComposeAudience>[];
    final controller = TextEditingController();
    addTearDown(controller.dispose);
    await pumpPeopleBody(
      tester,
      HostComposeBody(
        state: composeState,
        organizerName: 'Lantern Lane',
        audience: HostComposeAudience.booked,
        message: controller,
        onAudience: audiences.add,
        onEvent: (_) {},
        onRetry: () {},
      ),
    );

    expect(find.text('From Lantern Lane on Catch'), findsOneWidget);
    expect(find.text('New message'), findsOneWidget);
    expect(find.text('Booked'), findsOneWidget);
    expect(find.text('79 people'), findsOneWidget);
    expect(find.text('Tuesday Trivia Night'), findsOneWidget);
    expect(find.text('Event'), findsOneWidget);

    await tester.tap(find.text('Change'));
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Booked and waitlist'));
    await pumpFeatureUi(tester);
    expect(audiences, [HostComposeAudience.everyone]);
  });

  testWidgets('Compose with no event to message about', (tester) async {
    final controller = TextEditingController();
    addTearDown(controller.dispose);
    await pumpPeopleBody(
      tester,
      HostComposeBody(
        state: const HostComposeState(status: HostComposeStatus.noEvent),
        organizerName: 'Lantern Lane',
        audience: HostComposeAudience.booked,
        message: controller,
        onAudience: (_) {},
        onEvent: (_) {},
        onRetry: () {},
      ),
    );
    expect(find.text('No event to message about'), findsOneWidget);
  });

  testWidgets('Automatic messages shows the WhatsApp tile, the stat and the '
      'two sections of switches', (tester) async {
    final switched = <(String, bool)>[];
    var whatsapp = 0;
    var add = 0;
    await pumpPeopleBody(
      tester,
      HostAutomationsBody(
        state: automationsState,
        onWhatsapp: () => whatsapp++,
        onSwitch: (HostFormAutomationRule rule, bool enabled) =>
            switched.add((rule.ruleId, enabled)),
        onAdd: () => add++,
        onRetry: () {},
      ),
    );

    expect(find.text('Messages on WhatsApp'), findsOneWidget);
    expect(find.text('Sent this month'), findsOneWidget);
    expect(find.text('1,204'), findsOneWidget);
    expect(find.text('Around each event'), findsOneWidget);
    expect(find.text('Keeping people coming'), findsOneWidget);
    expect(find.text('After someone comes to a night'), findsOneWidget);

    await tester.tap(find.text('Welcome, here’s what’s on'));
    await tester.tap(find.text('Messages on WhatsApp'));
    await tester.ensureVisible(find.text('Add an automatic message'));
    await tester.tap(find.text('Add an automatic message'));
    expect(switched, [('answer', true)]);
    expect(whatsapp, 1);
    expect(add, 1);
  });

  testWidgets('a saved group shows its rules, the stepper and who matches', (
    tester,
  ) async {
    final values = <int>[];
    await pumpPeopleBody(
      tester,
      HostSavedGroupBody(
        state: savedGroupState,
        atLeast: 3,
        onAtLeast: values.add,
        onOpenPerson: (_) {},
        onRetry: () {},
      ),
    );

    expect(find.text('People who'), findsOneWidget);
    expect(find.text('At least'), findsOneWidget);
    expect(find.text('3 times'), findsOneWidget);
    expect(find.text('In the last'), findsOneWidget);
    expect(find.text('90 days'), findsOneWidget);
    expect(find.text('61 people match'), findsOneWidget);
    expect(find.text('Aanya Sharma'), findsOneWidget);

    await tester.tap(find.byIcon(CatchIcons.add));
    expect(values, [4]);
  });

  testWidgets('a new saved group asks for a name', (tester) async {
    final name = TextEditingController();
    addTearDown(name.dispose);
    await pumpPeopleBody(
      tester,
      HostSavedGroupBody(
        state: const HostSavedGroupState.creating(),
        atLeast: 1,
        name: name,
        onAtLeast: (_) {},
        onOpenPerson: (_) {},
        onRetry: () {},
      ),
    );
    expect(find.byKey(const ValueKey('host-group-name')), findsOneWidget);
    expect(find.text('once'), findsOneWidget);
    expect(find.textContaining('people match'), findsNothing);
  });
}
