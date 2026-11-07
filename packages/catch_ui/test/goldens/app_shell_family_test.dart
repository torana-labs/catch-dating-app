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

CatchTabBar<String> _navigation() => CatchTabBar<String>(
  items: [
    CatchTabBarItem<String>(id: 'today', icon: CatchIcons.home, label: 'Today'),
    CatchTabBarItem<String>(
      id: 'events',
      icon: CatchIcons.event,
      label: 'Events',
    ),
    CatchTabBarItem<String>(
      id: 'people',
      icon: CatchIcons.people,
      label: 'People',
      badgeCount: 4,
    ),
    CatchTabBarItem<String>(
      id: 'organizer',
      icon: CatchIcons.organizer,
      label: 'Organizer',
    ),
  ],
  active: 'today',
  onChanged: (_) {},
  header: const CatchTabBarIdentity(
    name: 'Lantern Lane Social',
    note: 'Switch organiser',
    switcher: true,
  ),
  primaryAction: CatchTabBarAction(label: 'New event', onPressed: () {}),
  footer: const CatchTabBarIdentity(name: 'Meher Rao', note: 'Settings'),
);

/// Three event tiles: a tab home's body.
class _Events extends StatelessWidget {
  const _Events({this.hero = false});

  final bool hero;

  @override
  Widget build(BuildContext context) => CatchStack(
    gap: CatchStackGap.g16,
    children: [
      if (hero)
        const CatchSurface(
          block: CatchSurfaceBlock.band,
          color: CatchSurfaceColor.run,
          child: SizedBox(height: CatchSpacing.s16 * 3),
        ),
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: CatchSpacing.s5),
        child: CatchStack(
          gap: CatchStackGap.g16,
          children: [
            for (final (title, meta) in const [
              ('Thursday social run', 'Tonight · 42 going'),
              ('Supper club', 'Sat 9 Nov · 18 going'),
              ('Padel ladder', 'Sun 10 Nov · 12 going'),
            ])
              CatchSurface(
                child: CatchStack(
                  gap: CatchStackGap.g4,
                  children: [
                    CatchText(title, variant: CatchTextVariant.titleRow),
                    CatchText(
                      meta,
                      variant: CatchTextVariant.bodyMeta,
                      tone: CatchTextTone.secondary,
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    ],
  );
}

/// The shell in a window of [size], holding a tab home with a dock.
Future<void> _shell(
  WidgetTester tester,
  String name,
  Size size,
  CatchWindowSize sizeClass,
) => matchCatchGolden(
  tester,
  name,
  size: size,
  builder: (context) => CatchRoot(
    theme: _themeOf(context),
    size: sizeClass,
    child: CatchAppShell(
      navigation: _navigation(),
      child: CatchScreen(
        topBar: const CatchTopBar(
          variant: CatchTopBarVariant.tabHome,
          kicker: 'Tuesday 27 October',
          title: 'Good evening, Meher',
        ),
        body: const Padding(
          padding: EdgeInsets.only(top: CatchSpacing.s4),
          child: _Events(),
        ),
        dock: CatchDock(
          primary: CatchDockAction(label: 'Open the door', onPressed: () {}),
          secondary: CatchDockAction(label: 'Message', onPressed: () {}),
        ),
      ),
    ),
  ),
);

void main() {
  testWidgets('a phone shell: the screen above the bottom bar', (tester) async {
    await _shell(
      tester,
      'app_shell_family_compact',
      const Size(390, 720),
      CatchWindowSize.compact,
    );
  });

  testWidgets('a tablet shell: the rail beside the screen', (tester) async {
    await _shell(
      tester,
      'app_shell_family_medium',
      const Size(834, 720),
      CatchWindowSize.medium,
    );
  });

  testWidgets('a desktop shell: the sidebar, the card dock', (tester) async {
    await _shell(
      tester,
      'app_shell_family_expanded',
      const Size(1180, 720),
      CatchWindowSize.expanded,
    );
  });

  testWidgets('a subject screen over its hero, at rest', (tester) async {
    await matchCatchGolden(
      tester,
      'app_shell_family_subject',
      size: const Size(390, 520),
      builder: (context) => CatchRoot(
        theme: _themeOf(context),
        size: CatchWindowSize.compact,
        child: CatchScreen(
          topBar: CatchTopBar(
            variant: CatchTopBarVariant.subject,
            title: 'Harbor Social',
            back: CatchTopBarBack(onPressed: () {}),
          ),
          body: const _Events(hero: true),
        ),
      ),
    );
  });
}
