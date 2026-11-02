import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Widget _button({required bool expanded, int badgeCount = 3}) => MaterialApp(
  theme: CatchTheme.light,
  home: Scaffold(
    body: SizedBox(
      width: 220,
      child: CatchNavigationButton<int>.rail(
        item: CatchTabBarItem<int>(
          id: 1,
          icon: CatchIcons.people,
          label: 'People',
          badgeCount: badgeCount,
        ),
        selected: false,
        expanded: expanded,
        onTap: () {},
      ),
    ),
  ),
);

void main() {
  const count = ValueKey('catch_navigation.sidebar_count.1');

  testWidgets('the sidebar right-aligns its count beside the label', (
    tester,
  ) async {
    await tester.pumpWidget(_button(expanded: true));
    expect(find.byKey(count), findsOneWidget);
    expect(find.text('3'), findsOneWidget);
    expect(
      tester.getCenter(find.byKey(count)).dx,
      greaterThan(tester.getCenter(find.text('People')).dx),
    );
    expect(tester.getTopRight(find.byKey(count)).dx, greaterThan(180));
  });

  testWidgets('no count draws nothing', (tester) async {
    await tester.pumpWidget(_button(expanded: true, badgeCount: 0));
    expect(find.byKey(count), findsNothing);
  });

  testWidgets('the narrow rail keeps the count on its icon', (tester) async {
    await tester.pumpWidget(_button(expanded: false));
    expect(find.byKey(count), findsNothing);
    expect(find.text('3'), findsOneWidget);
  });
}
