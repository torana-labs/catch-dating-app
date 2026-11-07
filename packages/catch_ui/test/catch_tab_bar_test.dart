import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

List<CatchTabBarItem<String>> _items({bool pinned = false}) => [
  CatchTabBarItem<String>(
    id: 'today',
    icon: CatchIcons.home,
    label: 'Today',
    section: 'Work',
    pinned: pinned,
  ),
  CatchTabBarItem<String>(
    id: 'events',
    icon: CatchIcons.event,
    label: 'Events',
    section: 'Work',
    pinned: pinned,
  ),
  CatchTabBarItem<String>(
    id: 'people',
    icon: CatchIcons.people,
    label: 'People',
    badgeCount: 3,
    section: 'Records',
  ),
  CatchTabBarItem<String>(
    id: 'organizer',
    icon: CatchIcons.organizer,
    label: 'Organizer',
    section: 'Records',
  ),
];

Future<void> _pump(
  WidgetTester tester,
  CatchTabBar<String> bar, {
  double width = 400,
}) async {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = Size(width, 800);
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    MaterialApp(
      home: CatchRoot(
        theme: CatchThemeMode.day,
        child: Align(alignment: Alignment.bottomLeft, child: bar),
      ),
    ),
  );
}

void main() {
  testWidgets('auto follows the size class', (tester) async {
    CatchTabBar<String> bar() =>
        CatchTabBar<String>(items: _items(), active: 'today');
    await _pump(tester, bar());
    expect(
      find.byKey(const ValueKey('catch_tab_bar.anchored_chrome')),
      findsOneWidget,
    );
    await _pump(tester, bar(), width: 700);
    expect(find.byKey(const ValueKey('catch_tab_bar.rail')), findsOneWidget);
    expect(
      tester.getSize(find.byKey(const ValueKey('catch_tab_bar.rail'))).width,
      GeneratedCatchLayoutTokens.rail,
    );
    await _pump(tester, bar(), width: 1000);
    expect(
      tester.getSize(find.byKey(const ValueKey('catch_tab_bar.sidebar'))).width,
      GeneratedCatchLayoutTokens.sidebar,
    );
  });

  testWidgets(
    'the sidebar draws its header, action, sections, counts and footer',
    (tester) async {
      final selected = <String>[];
      var created = 0;
      await _pump(
        tester,
        CatchTabBar<String>(
          items: _items(),
          active: 'today',
          onChanged: selected.add,
          header: const CatchTabBarIdentity(
            name: 'Lantern Lane Social',
            note: 'Switch organiser',
            switcher: true,
          ),
          primaryAction: CatchTabBarAction(
            label: 'New event',
            onPressed: () => created++,
          ),
          footer: const CatchTabBarIdentity(name: 'Meher', note: 'Settings'),
        ),
        width: 1000,
      );
      expect(find.text('Lantern Lane Social'), findsOneWidget);
      expect(find.text('Work'), findsOneWidget);
      expect(find.text('Records'), findsOneWidget);
      expect(find.text('3'), findsOneWidget);
      expect(find.text('Meher'), findsOneWidget);
      await tester.tap(find.text('New event'));
      expect(created, 1);
      await tester.tap(find.text('People'));
      expect(selected, ['people']);
      final header = tester.getRect(find.text('Lantern Lane Social'));
      expect(header.top, lessThan(CatchLayout.topBarHeight));
    },
  );

  testWidgets('the rail draws the identity compact and the action as an icon', (
    tester,
  ) async {
    var created = 0;
    await _pump(
      tester,
      CatchTabBar<String>(
        items: _items(),
        active: 'events',
        onChanged: (_) {},
        layout: CatchTabBarPlacement.rail,
        header: const CatchTabBarIdentity(name: 'Lantern Lane Social'),
        primaryAction: CatchTabBarAction(
          label: 'New event',
          onPressed: () => created++,
        ),
        footer: const CatchTabBarIdentity(name: 'Meher'),
      ),
    );
    expect(find.text('Lantern Lane Social'), findsNothing);
    expect(find.byTooltip('Lantern Lane Social'), findsOneWidget);
    expect(find.text('Meher'), findsNothing);
    expect(find.text('Records'), findsNothing);
    expect(find.text('Events'), findsOneWidget);
    await tester.tap(find.byTooltip('New event'));
    expect(created, 1);
    final semantics = tester.ensureSemantics();
    expect(
      tester.getSemantics(find.bySemanticsLabel('Events').first),
      isSemantics(isButton: true, isSelected: true),
    );
    semantics.dispose();
  });

  testWidgets('a pinned bottom bar shows the pinned items, then More', (
    tester,
  ) async {
    var moreOpened = 0;
    final selected = <String>[];
    CatchTabBar<String> bar(String active) => CatchTabBar<String>(
      items: _items(pinned: true),
      active: active,
      onChanged: selected.add,
      more: CatchTabBarMore(
        label: 'More',
        badge: 3,
        onPressed: () => moreOpened++,
      ),
    );
    await _pump(tester, bar('today'));
    expect(find.text('People'), findsNothing);
    expect(
      find.byKey(const ValueKey<Object>('catch_tab_bar.more')),
      findsOneWidget,
    );
    await tester.tap(find.byKey(const ValueKey<Object>('catch_tab_bar.more')));
    await tester.pump(const Duration(seconds: 1));
    expect(moreOpened, 1);
    expect(selected, isEmpty);
    await _pump(tester, bar('people'));
    await tester.pump(const Duration(seconds: 1));
    final more = tester.widget<CatchNavigationButton<String>>(
      find.byKey(const ValueKey<Object>('catch_tab_bar.more')),
    );
    expect(more.status, CatchNavigationButtonStatus.selected);
  });

  testWidgets('without More every item stays on the bottom bar', (
    tester,
  ) async {
    await _pump(
      tester,
      CatchTabBar<String>(items: _items(pinned: true), active: 'today'),
    );
    expect(
      find.byKey(const ValueKey<Object>('catch_tab_bar.more')),
      findsNothing,
    );
    expect(
      find.byKey(const ValueKey<Object>('catch_tab_bar.destination.people')),
      findsOneWidget,
    );
  });
}
