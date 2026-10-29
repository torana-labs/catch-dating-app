import 'dart:ui';

import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../test_pump_helpers.dart';

void main() {
  for (final platform in [TargetPlatform.iOS, TargetPlatform.android]) {
    testWidgets(
      'floating nav retains its label and pill geometry on $platform',
      (tester) async {
        await _pumpTabBar(tester);
        final label = find.byKey(const ValueKey('catch_tab_bar.label.Events'));
        final style = tester
            .widget<Text>(
              find.descendant(of: label, matching: find.byType(Text)),
            )
            .style!;
        expect(style.fontSize, 13);
        expect(style.height, 1);
        expect(style.fontWeight, FontWeight.w600);
        expect(style.letterSpacing, 0);
        final painter = TextPainter(
          text: TextSpan(text: 'Events', style: style),
          textDirection: TextDirection.ltr,
        )..layout();
        addTearDown(painter.dispose);
        final chrome = tester.getRect(
          find.byKey(const ValueKey('catch_tab_bar.floating_chrome')),
        );
        final indicator = tester.getRect(
          find.byKey(const ValueKey('catch_tab_bar.indicator')),
        );
        expect(indicator.height, CatchLayout.tabBarIndicatorExtent);
        expect(
          indicator.width,
          CatchLayout.tabBarSelectedExtentFor(
            availableWidth:
                chrome.width -
                CatchLayout.tabBarFloatingContentHorizontalPadding * 2,
            itemCount: 5,
            labelWidth: painter.width,
          ),
        );
      },
      variant: TargetPlatformVariant.only(platform),
    );
  }

  testWidgets('floating tab indicator owns exact inset geometry', (
    tester,
  ) async {
    await _pumpTabBar(tester);

    final chromeRect = tester.getRect(
      find.byKey(const ValueKey('catch_tab_bar.floating_chrome')),
    );
    final indicatorRect = tester.getRect(
      find.byKey(const ValueKey('catch_tab_bar.indicator')),
    );

    expect(chromeRect.height, CatchLayout.tabBarExtent);
    expect(indicatorRect.height, CatchLayout.tabBarIndicatorExtent);
    expect(
      indicatorRect.top - chromeRect.top,
      (CatchLayout.tabBarExtent - CatchLayout.tabBarIndicatorExtent) / 2,
    );
    expect(
      chromeRect.bottom - indicatorRect.bottom,
      (CatchLayout.tabBarExtent - CatchLayout.tabBarIndicatorExtent) / 2,
    );
    expect(
      indicatorRect.left - chromeRect.left,
      CatchLayout.tabBarFloatingContentHorizontalPadding,
    );
  });

  testWidgets(
    'inactive contact preview matches the selected indicator height',
    (tester) async {
      final changes = <String>[];
      await _pumpTabBar(tester, onChanged: changes.add);

      final customers = find.byKey(
        const ValueKey<Object>('catch_tab_bar.destination.customers'),
      );
      final gesture = await tester.startGesture(tester.getCenter(customers));
      await tester.pump(kPressTimeout);
      await tester.pump(CatchMotion.standard);

      final indicatorRect = tester.getRect(
        find.byKey(const ValueKey('catch_tab_bar.indicator')),
      );
      expect(changes, isEmpty);
      expect(indicatorRect.size, const Size.square(48));
      expect(
        indicatorRect.center.dx,
        closeTo(tester.getCenter(customers).dx, 0.5),
      );
      expect(find.text('Events'), findsNothing);
      expect(
        tester
            .widget<CatchNavigationButton<String>>(customers)
            .semanticSelected,
        isFalse,
      );
      expect(
        tester
            .widget<CatchNavigationButton<String>>(
              find.byKey(
                const ValueKey<Object>('catch_tab_bar.destination.events'),
              ),
            )
            .semanticSelected,
        isTrue,
      );

      await gesture.up();
      await pumpFeatureUi(tester);
      expect(changes, ['customers']);
      expect(find.text('Customers'), findsOneWidget);
    },
  );

  testWidgets(
    'hold and slide previews destinations and commits only on release',
    (tester) async {
      final changes = <String>[];
      await _pumpTabBar(tester, onChanged: changes.add);

      final events = find.byKey(
        const ValueKey<Object>('catch_tab_bar.destination.events'),
      );
      final customers = find.byKey(
        const ValueKey<Object>('catch_tab_bar.destination.customers'),
      );
      final inbox = find.byKey(
        const ValueKey<Object>('catch_tab_bar.destination.inbox'),
      );
      final gesture = await tester.startGesture(tester.getCenter(events));
      await tester.pump(kPressTimeout);
      await gesture.moveTo(tester.getCenter(customers));
      await tester.pump();
      await gesture.moveTo(tester.getCenter(inbox));
      await tester.pump();
      await tester.pump(CatchMotion.standard);

      final previewRect = tester.getRect(
        find.byKey(const ValueKey('catch_tab_bar.indicator')),
      );
      expect(changes, isEmpty);
      expect(
        previewRect.width,
        closeTo(CatchLayout.tabBarCompactItemExtent, 0.01),
      );
      expect(
        previewRect.height,
        closeTo(CatchLayout.tabBarIndicatorExtent, 0.01),
      );
      expect(previewRect.center.dx, closeTo(tester.getCenter(inbox).dx, 0.5));

      await gesture.up();
      await pumpFeatureUi(tester);
      expect(changes, ['inbox']);
      expect(find.text('Inbox'), findsOneWidget);
    },
  );

  testWidgets('dragging outside the dock cancels selection', (tester) async {
    final changes = <String>[];
    await _pumpTabBar(tester, onChanged: changes.add);

    final events = find.byKey(
      const ValueKey<Object>('catch_tab_bar.destination.events'),
    );
    final inbox = find.byKey(
      const ValueKey<Object>('catch_tab_bar.destination.inbox'),
    );
    final chromeRect = tester.getRect(
      find.byKey(const ValueKey('catch_tab_bar.floating_chrome')),
    );
    final gesture = await tester.startGesture(tester.getCenter(events));
    await tester.pump(kPressTimeout);
    await gesture.moveTo(
      Offset(tester.getCenter(inbox).dx, chromeRect.top - CatchSpacing.s10),
    );
    await tester.pump(CatchMotion.standard);
    await gesture.up();
    await pumpFeatureUi(tester);

    expect(changes, isEmpty);
    expect(find.text('Events'), findsOneWidget);
  });

  testWidgets('organizer stationary long press does not select the tab', (
    tester,
  ) async {
    final changes = <String>[];
    var longPresses = 0;
    await _pumpTabBar(
      tester,
      onChanged: changes.add,
      onOrganizerLongPress: () => longPresses += 1,
    );

    final organizer = find.byKey(
      const ValueKey<Object>('catch_tab_bar.destination.organizer'),
    );
    final gesture = await tester.startGesture(tester.getCenter(organizer));
    await tester.pump(kLongPressTimeout + CatchMotion.fast);

    expect(longPresses, 1);
    expect(changes, isEmpty);

    await gesture.up();
    await pumpFeatureUi(tester);
    expect(changes, isEmpty);
  });

  testWidgets('pointer hover uses a matching secondary indicator', (
    tester,
  ) async {
    await _pumpTabBar(tester);

    final selectedRect = tester.getRect(
      find.byKey(const ValueKey('catch_tab_bar.indicator')),
    );
    final customers = find.byKey(
      const ValueKey<Object>('catch_tab_bar.destination.customers'),
    );
    final mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
    await mouse.addPointer(location: Offset.zero);
    addTearDown(mouse.removePointer);
    await mouse.moveTo(tester.getCenter(customers));
    await pumpFeatureUi(tester);

    final hoverRect = tester.getRect(
      find.byKey(const ValueKey('catch_tab_bar.interaction_indicator')),
    );
    expect(hoverRect.size, const Size.square(48));
    expect(hoverRect.center.dx, closeTo(tester.getCenter(customers).dx, 0.5));
    expect(
      tester.getRect(find.byKey(const ValueKey('catch_tab_bar.indicator'))),
      selectedRect,
    );
  });

  testWidgets('large text preserves every full-size destination target', (
    tester,
  ) async {
    await _pumpTabBar(tester, textScaler: const TextScaler.linear(2));

    for (final id in ['events', 'customers', 'forms', 'inbox', 'organizer']) {
      final rect = tester.getRect(
        find.byKey(ValueKey<Object>('catch_tab_bar.destination.$id')),
      );
      expect(
        rect.width,
        greaterThanOrEqualTo(CatchLayout.tabBarMinimumTapExtent),
      );
      expect(rect.height, CatchLayout.tabBarExtent);
    }
    expect(
      find.byKey(const ValueKey('catch_tab_bar.label.Events')),
      findsNothing,
    );
    expect(
      tester.getSize(find.byKey(const ValueKey('catch_tab_bar.indicator'))),
      const Size.square(CatchLayout.tabBarCompactItemExtent),
    );
    final eventsSemantics = tester.getSemantics(
      find.byKey(const ValueKey<Object>('catch_tab_bar.destination.events')),
    );
    expect(eventsSemantics.label, 'Events');
    expect(tester.takeException(), isNull);
  });
}

Future<void> _pumpTabBar(
  WidgetTester tester, {
  ValueChanged<String>? onChanged,
  VoidCallback? onOrganizerLongPress,
  TextScaler textScaler = TextScaler.noScaling,
}) async {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(393, 300);
  addTearDown(tester.view.resetDevicePixelRatio);
  addTearDown(tester.view.resetPhysicalSize);

  var active = 'events';
  await tester.pumpWidget(
    MaterialApp(
      theme: AppTheme.light.copyWith(platform: TargetPlatform.iOS),
      home: MediaQuery(
        data: MediaQueryData(
          size: const Size(393, 300),
          padding: const EdgeInsets.only(bottom: 34),
          viewPadding: const EdgeInsets.only(bottom: 34),
          textScaler: textScaler,
        ),
        child: StatefulBuilder(
          builder: (context, setState) => Scaffold(
            body: const SizedBox.expand(),
            bottomNavigationBar: CatchTabBar<String>(
              active: active,
              items: [
                const CatchTabBarItem(
                  id: 'events',
                  icon: Icons.confirmation_number_outlined,
                  activeIcon: Icons.confirmation_number,
                  label: 'Events',
                ),
                const CatchTabBarItem(
                  id: 'customers',
                  icon: Icons.groups_outlined,
                  activeIcon: Icons.groups,
                  label: 'Customers',
                ),
                const CatchTabBarItem(
                  id: 'forms',
                  icon: Icons.description_outlined,
                  activeIcon: Icons.description,
                  label: 'Forms',
                ),
                const CatchTabBarItem(
                  id: 'inbox',
                  icon: Icons.chat_bubble_outline,
                  activeIcon: Icons.chat_bubble,
                  label: 'Inbox',
                ),
                CatchTabBarItem(
                  id: 'organizer',
                  icon: Icons.person_outline,
                  activeIcon: Icons.person,
                  label: 'Organizer',
                  onLongPress: onOrganizerLongPress,
                ),
              ],
              onChanged: (next) {
                onChanged?.call(next);
                setState(() => active = next);
              },
            ),
          ),
        ),
      ),
    ),
  );
  await pumpFeatureUi(tester);
}
