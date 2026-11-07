@Tags(['golden'])
library;

import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/golden_pump.dart';

CatchThemeMode _themeOf(BuildContext context) =>
    Theme.of(context).brightness == Brightness.dark
    ? CatchThemeMode.night
    : CatchThemeMode.day;

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
    badgeCount: 4,
    section: 'Audience',
  ),
  CatchTabBarItem<String>(
    id: 'organizer',
    icon: CatchIcons.organizer,
    label: 'Organizer',
    section: 'Audience',
  ),
];

CatchTabBar<String> _side(CatchTabBarPlacement layout) => CatchTabBar<String>(
  items: _items(),
  active: 'people',
  onChanged: (_) {},
  layout: layout,
  header: const CatchTabBarIdentity(
    name: 'Lantern Lane Social',
    note: 'Switch organiser',
    switcher: true,
  ),
  primaryAction: CatchTabBarAction(label: 'New event', onPressed: () {}),
  footer: const CatchTabBarIdentity(name: 'Meher Rao', note: 'Settings'),
);

void main() {
  testWidgets('the bottom bar, and pinned items with More', (tester) async {
    await matchCatchGolden(
      tester,
      'navigation_family_bottom',
      size: const Size(390, 300),
      builder: (context) => CatchRoot(
        theme: _themeOf(context),
        size: CatchWindowSize.compact,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          spacing: CatchSpacing.s6,
          children: [
            const SizedBox(height: CatchSpacing.s4),
            CatchTabBar<String>(
              items: _items(),
              active: 'today',
              onChanged: (_) {},
            ),
            CatchTabBar<String>(
              items: _items(pinned: true),
              active: 'organizer',
              onChanged: (_) {},
              more: const CatchTabBarMore(label: 'More', badge: 4),
            ),
          ],
        ),
      ),
    );
  });

  testWidgets('the rail and the sidebar with every part', (tester) async {
    await matchCatchGolden(
      tester,
      'navigation_family_side',
      size: const Size(560, 600),
      builder: (context) => CatchRoot(
        theme: _themeOf(context),
        size: CatchWindowSize.expanded,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          spacing: CatchSpacing.s12,
          children: [
            _side(CatchTabBarPlacement.rail),
            _side(CatchTabBarPlacement.sidebar),
          ],
        ),
      ),
    );
  });
}
