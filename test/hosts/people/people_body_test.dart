import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact.dart';
import 'package:catch_dating_app/hosts/people/people_body.dart';
import 'package:catch_dating_app/hosts/people/people_desktop_body.dart';
import 'package:catch_dating_app/hosts/people/people_state.dart';
import 'package:catch_dating_app/hosts/people/person_body.dart';
import 'package:catch_dating_app/hosts/people/person_state.dart';
import 'package:catch_dating_app/hosts/people/widgets/people_tab_bar.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import 'people_fixtures.dart';
import 'people_test_pump.dart';

class _Calls {
  final views = <HostPeopleView>[];
  final filters = <HostPeopleFilter>[];
  final groups = <HostPeopleGroup>[];
  final people = <HostAudienceContact>[];
  final searches = <String>[];
  int more = 0;
  int retry = 0;
  int compose = 0;
  int message = 0;
  int tag = 0;
}

Future<_Calls> _pumpPhone(WidgetTester tester, HostPeopleState state) async {
  final calls = _Calls();
  await pumpPeopleBody(
    tester,
    HostPeopleBody(
      state: state,
      onView: calls.views.add,
      onFilter: calls.filters.add,
      onOpenGroup: calls.groups.add,
      onOpenPerson: calls.people.add,
      onLoadMore: () => calls.more++,
      onRetry: () => calls.retry++,
    ),
  );
  return calls;
}

void main() {
  testWidgets('the phone list shows the views, the Show rail, the kicker '
      'and the rows with their badges', (tester) async {
    final calls = await _pumpPhone(tester, peopleState());

    expect(find.text('People'), findsWidgets);
    expect(find.text('Messages'), findsOneWidget);
    expect(find.text('Forms'), findsOneWidget);
    expect(find.text('Show'), findsNothing);
    for (final label in ['Everyone', 'Regulars', 'New', 'Drifting']) {
      expect(find.text(label), findsWidgets);
    }
    expect(find.text('Trivia regulars'), findsOneWidget);
    expect(find.text('Everyone · 1,284, most recent first'), findsOneWidget);
    expect(find.text('Rhea Kapoor'), findsOneWidget);
    expect(find.text('6 nights · last on Tue 20 Oct'), findsOneWidget);
    expect(find.text('No nights yet'), findsNWidgets(2));
    expect(find.text('Regular'), findsNWidgets(2));

    final drifting = find.byKey(const ValueKey('host-people-filter-drifting'));
    await tester.ensureVisible(drifting);
    await tester.tap(drifting);
    final trivia = find.byKey(const ValueKey('host-people-group-trivia'));
    await tester.ensureVisible(trivia);
    await tester.tap(trivia);
    await tester.tap(find.text('Rhea Kapoor'));
    await tester.tap(find.text('Messages'));
    await tester.ensureVisible(find.text('Show more'));
    await tester.tap(find.text('Show more'));

    expect(calls.filters, [HostPeopleFilter.drifting]);
    expect(calls.groups.single.audienceId, 'trivia');
    expect(calls.people.single.contactId, 'rk');
    expect(calls.views, [HostPeopleView.messages]);
    expect(calls.more, 1);
  });

  testWidgets('a filter names itself in the kicker', (tester) async {
    await _pumpPhone(
      tester,
      peopleState(
        filter: HostPeopleFilter.regulars,
        people: peopleContacts.take(1).toList(),
      ),
    );
    expect(find.text('Regulars · 1,284, most recent first'), findsOneWidget);
  });

  testWidgets('loading, error and empty', (tester) async {
    final calls = await _pumpPhone(
      tester,
      peopleState(status: HostPeopleStatus.error),
    );
    expect(find.text('We couldn’t load your people'), findsOneWidget);
    await tester.tap(find.text('Try again'));
    expect(calls.retry, 1);

    await _pumpPhone(tester, peopleState(status: HostPeopleStatus.loading));
    expect(find.byType(CatchLoadingIndicator), findsOneWidget);

    await _pumpPhone(tester, peopleState(people: const []));
    expect(find.text('Nobody here yet.'), findsOneWidget);
  });

  testWidgets('desktop puts the list pane beside the selected person', (
    tester,
  ) async {
    final calls = _Calls();
    await pumpPeopleBody(
      tester,
      HostPeopleDesktopBody(
        state: peopleState(),
        person: personState(),
        selectedContactId: 'rk',
        onView: calls.views.add,
        onSearch: calls.searches.add,
        onSelectPerson: calls.people.add,
        onCompose: () => calls.compose++,
        onMessagePerson: () => calls.message++,
        onAddTag: () => calls.tag++,
        onLoadMore: () => calls.more++,
        onRetry: () => calls.retry++,
        onRetryPerson: () => calls.retry++,
      ),
      size: peopleDesktop,
    );

    expect(find.byType(CatchPaneHeader), findsNWidgets(2));
    expect(find.text('Everyone, most recent first'), findsOneWidget);
    expect(find.text('Search 1,284 people'), findsOneWidget);
    expect(find.text('Rhea Kapoor'), findsWidgets);
    expect(find.text('Coming since March'), findsOneWidget);
    expect(find.text('Nights with you'), findsOneWidget);
    expect(find.text('Notes and tags'), findsOneWidget);
    expect(find.text('Only your team sees these'), findsOneWidget);
    expect(find.text('Trivia regular'), findsOneWidget);
    expect(find.text('Add a tag'), findsOneWidget);

    await tester.tap(find.text('Aanya Sharma'));
    await tester.tap(find.text('Add a tag'));
    await tester.enterText(find.byType(EditableText), 'Kabir');
    expect(calls.people.single.contactId, 'as');
    expect(calls.tag, 1);
    expect(calls.searches, ['Kabir']);
  });

  testWidgets('a person on a phone stacks who they are, Message, the stats, '
      'notes and tags and their nights', (tester) async {
    var message = 0;
    var tag = 0;
    await pumpPeopleBody(
      tester,
      CatchPageBody(
        child: HostPersonBody(
          state: personState(),
          onMessage: () => message++,
          onAddTag: () => tag++,
          onRetry: () {},
        ),
      ),
    );

    expect(find.text('Rhea Kapoor'), findsOneWidget);
    expect(find.text('Coming since March'), findsOneWidget);
    expect(find.text('Nights'), findsOneWidget);
    expect(find.text('since March'), findsOneWidget);
    expect(find.text('Spent'), findsOneWidget);
    expect(find.text('₹3,494'), findsOneWidget);
    expect(find.text('Missed'), findsWidgets);
    expect(find.text('never a no-show'), findsOneWidget);
    expect(find.text('Booked'), findsOneWidget);
    expect(find.text('Came'), findsNWidgets(4));
    expect(find.textContaining('Loves the food round'), findsOneWidget);

    await tester.tap(find.text('Message'));
    await tester.tap(find.text('Add a tag'));
    expect(message, 1);
    expect(tag, 1);
  });

  testWidgets('a person with no nights says so', (tester) async {
    await pumpPeopleBody(
      tester,
      CatchPageBody(
        child: HostPersonBody(
          state: HostPersonState(
            status: HostPersonStatus.ready,
            detail: peopleDetail(events: const [], nights: 0, tags: const []),
          ),
          onMessage: () {},
          onAddTag: () {},
          onRetry: () {},
        ),
      ),
    );
    expect(find.text('No nights with you yet'), findsOneWidget);
    expect(find.text('No nights yet.'), findsOneWidget);
    expect(find.text('never a no-show'), findsNothing);
  });
}
