import 'dart:ui' show SemanticsAction, Tristate;

import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets(
    'preview glyph and committed route semantics remain independent',
    (tester) async {
      final semantics = tester.ensureSemantics();
      try {
        for (final (status, visual, committed) in [
          (CatchNavigationButtonStatus.unselected, false, false),
          (CatchNavigationButtonStatus.selected, true, true),
          (CatchNavigationButtonStatus.preview, true, false),
          (CatchNavigationButtonStatus.retainedSelection, false, true),
        ]) {
          await tester.pumpWidget(
            _wrap(
              CatchNavigationButton<String>.sharedIndicator(
                item: _item,
                status: status,
                showSelectedLabel: false,
                onTap: () {},
              ),
            ),
          );
          await tester.pump(CatchMotion.standard);
          final node = tester.getSemantics(
            find.byType(CatchNavigationButton<String>),
          );
          expect(node.flagsCollection.isSelected == Tristate.isTrue, committed);
          expect(
            node.getSemanticsData().hasAction(SemanticsAction.tap),
            isTrue,
          );
          expect(node.label, 'Inbox');
          expect(
            find.byIcon(visual ? Icons.chat_bubble : Icons.chat_bubble_outline),
            findsOneWidget,
          );
          expect(find.text('Inbox'), findsNothing);
        }
      } finally {
        semantics.dispose();
      }
    },
  );

  for (final expanded in [false, true]) {
    testWidgets(
      'rail expanded=$expanded exposes one actionable selected destination',
      (tester) async {
        var taps = 0;
        var longPresses = 0;
        final semantics = tester.ensureSemantics();
        try {
          await tester.pumpWidget(
            _wrap(
              CatchNavigationButton<String>.rail(
                item: CatchTabBarItem(
                  id: 'inbox',
                  icon: Icons.chat_bubble_outline,
                  activeIcon: Icons.chat_bubble,
                  label: 'Inbox',
                  badgeCount: 104,
                  semanticValue: '104 unread messages',
                  semanticHint: 'Hold for options',
                  onLongPress: () => longPresses++,
                ),
                selected: true,
                expanded: expanded,
                onTap: () => taps++,
              ),
            ),
          );
          final button = find.byType(CatchNavigationButton<String>);
          final node = find.semantics.byLabel('Inbox').evaluate().single;
          expect(node.label, 'Inbox');
          expect(node.value, '104 unread messages');
          expect(node.hint, 'Hold for options');
          expect(node.flagsCollection.isSelected == Tristate.isTrue, isTrue);
          expect(
            node.getSemanticsData().hasAction(SemanticsAction.tap),
            isTrue,
          );
          expect(
            node.getSemanticsData().hasAction(SemanticsAction.longPress),
            isTrue,
          );
          final owner = node.owner!;
          owner.performAction(node.id, SemanticsAction.tap);
          expect(taps, 1);
          owner.performAction(node.id, SemanticsAction.longPress);
          expect(longPresses, 1);
          await tester.tap(button);
          expect(taps, 2);
          await tester.longPress(button);
          expect(longPresses, 2);
          expect(taps, 2);
          expect(find.text('99+'), findsOneWidget);
          expect(
            find.byType(Tooltip),
            expanded ? findsNothing : findsOneWidget,
          );
          expect(
            tester.getSize(button).height,
            greaterThanOrEqualTo(
              expanded
                  ? CatchLayout.appShellSidebarItemMinHeight
                  : CatchLayout.appShellRailItemMinHeight,
            ),
          );
          expect(tester.takeException(), isNull);
        } finally {
          semantics.dispose();
        }
      },
    );
  }

  testWidgets(
    'standalone and rail own one haptic; shared indicator delegates it',
    (tester) async {
      final calls = <MethodCall>[];
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        SystemChannels.platform,
        (call) async {
          calls.add(call);
          return null;
        },
      );
      addTearDown(
        () => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
          SystemChannels.platform,
          null,
        ),
      );
      var taps = 0;
      final recipes = <Widget>[
        CatchNavigationButton(
          item: _item,
          selected: false,
          onTap: () => taps++,
        ),
        CatchNavigationButton.rail(
          item: _item,
          selected: false,
          expanded: true,
          onTap: () => taps++,
        ),
        CatchNavigationButton.sharedIndicator(
          item: _item,
          status: CatchNavigationButtonStatus.unselected,
          showSelectedLabel: false,
          onTap: () => taps++,
        ),
      ];
      for (final (index, button) in recipes.indexed) {
        await tester.pumpWidget(_wrap(button));
        await tester.pump(CatchMotion.standard);
        calls.clear();
        await tester.tap(find.byType(CatchNavigationButton<String>));
        expect(taps, index + 1);
        expect(
          calls.where((c) => c.method == 'HapticFeedback.vibrate'),
          hasLength(index == 2 ? 0 : 1),
        );
      }
    },
  );

  testWidgets(
    'disabled rail omits activation and keeps its custom selected glyph',
    (tester) async {
      final semantics = tester.ensureSemantics();
      try {
        await tester.pumpWidget(
          _wrap(
            const CatchNavigationButton<String>.rail(
              item: CatchTabBarItem(
                id: 'account',
                icon: Icons.person_outline,
                label: 'Account',
                iconWidget: Text('inactive glyph'),
                activeIconWidget: Text('active glyph'),
              ),
              selected: true,
              expanded: true,
              onTap: null,
            ),
          ),
        );
        final node = tester.getSemantics(
          find.byType(CatchNavigationButton<String>),
        );
        expect(node.getSemanticsData().hasAction(SemanticsAction.tap), isFalse);
        expect(node.label, 'Account');
        expect(find.text('active glyph'), findsOneWidget);
        expect(find.text('inactive glyph'), findsNothing);
      } finally {
        semantics.dispose();
      }
    },
  );

  testWidgets(
    'navigation count preserves glyph box at zero and 99+ with custom content',
    (tester) async {
      for (final count in [0, 7, 104]) {
        await tester.pumpWidget(
          _wrap(
            CatchCountBadge.navigationIcon(
              key: const ValueKey('navigation-icon'),
              icon: Icons.chat_bubble_outline,
              color: Colors.black,
              count: count,
              child: const SizedBox(
                key: ValueKey('glyph'),
                width: 20,
                height: 20,
              ),
            ),
          ),
        );
        expect(
          tester.getSize(find.byKey(const ValueKey('navigation-icon'))),
          const Size.square(CatchLayout.tabBarIconBoxExtent),
        );
        expect(
          tester.getCenter(find.byKey(const ValueKey('glyph'))),
          tester.getCenter(find.byKey(const ValueKey('navigation-icon'))),
        );
        expect(
          find.text(catchCountLabel(count)),
          count == 0 ? findsNothing : findsOneWidget,
        );
        expect(find.byType(Icon), findsNothing);
      }
    },
  );
}

const _item = CatchTabBarItem<String>(
  id: 'inbox',
  icon: Icons.chat_bubble_outline,
  activeIcon: Icons.chat_bubble,
  label: 'Inbox',
);

Widget _wrap(Widget child) => MaterialApp(
  theme: AppTheme.light,
  home: Scaffold(
    body: Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 240),
        child: child,
      ),
    ),
  ),
);
