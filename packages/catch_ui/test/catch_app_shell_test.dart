import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

final _items = [
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
  ),
];

/// Records what the shell tells the screen and keeps a counter, so a test
/// can see whether the screen survives a change of placement.
class _ScreenProbe extends StatefulWidget {
  const _ScreenProbe(this.seen);

  final List<({CatchShellScopeData shell, double bottomPadding})> seen;

  @override
  State<_ScreenProbe> createState() => _ScreenProbeState();
}

class _ScreenProbeState extends State<_ScreenProbe> {
  int taps = 0;

  @override
  Widget build(BuildContext context) {
    widget.seen.add((
      shell: CatchShellScope.maybeOf(context)!,
      bottomPadding: MediaQuery.paddingOf(context).bottom,
    ));
    return GestureDetector(
      onTap: () => setState(() => taps++),
      child: ColoredBox(
        key: const ValueKey('screen'),
        color: const Color(0x00000000),
        child: Center(child: Text('taps $taps')),
      ),
    );
  }
}

Future<void> _pump(
  WidgetTester tester,
  List<({CatchShellScopeData shell, double bottomPadding})> seen, {
  required double width,
  EdgeInsets padding = EdgeInsets.zero,
  EdgeInsets viewInsets = EdgeInsets.zero,
  TargetPlatform? platform,
}) async {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = Size(width, 800);
  tester.view.padding = FakeViewPadding(bottom: padding.bottom);
  tester.view.viewInsets = FakeViewPadding(bottom: viewInsets.bottom);
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    MaterialApp(
      home: CatchRoot(
        theme: CatchThemeMode.day,
        // CatchTheme is built once per test isolate, so a platform is set on
        // the subtree rather than through debugDefaultTargetPlatformOverride.
        child: Builder(
          builder: (context) => Theme(
            data: Theme.of(
              context,
            ).copyWith(platform: platform ?? Theme.of(context).platform),
            child: CatchAppShell(
              navigation: CatchTabBar<String>(
                items: _items,
                active: 'today',
                onChanged: (_) {},
              ),
              child: _ScreenProbe(seen),
            ),
          ),
        ),
      ),
    ),
  );
}

void main() {
  testWidgets(
    'under 600 px the bar sits below the screen and takes the inset',
    (tester) async {
      final seen = <({CatchShellScopeData shell, double bottomPadding})>[];
      await _pump(
        tester,
        seen,
        width: 400,
        padding: const EdgeInsets.only(bottom: 34),
      );
      expect(seen.last.shell.navigationPlacement, CatchTabBarPlacement.bottom);
      expect(seen.last.shell.bottomInset, 0);
      expect(seen.last.bottomPadding, 0);
      final screen = tester.getRect(find.byKey(const ValueKey('screen')));
      final bar = tester.getRect(find.byType(CatchTabBar<String>));
      expect(screen.bottom, bar.top);
      expect(bar.bottom, 800);
      final viewport = tester.widget<CatchTabViewportScope>(
        find.byType(CatchTabViewportScope),
      );
      expect(
        viewport.bottomBarPlacement,
        CatchTabViewportScopePlacement.anchored,
      );
    },
  );

  testWidgets('from 600 px a 96 px rail, from 840 px a 240 px sidebar', (
    tester,
  ) async {
    final seen = <({CatchShellScopeData shell, double bottomPadding})>[];
    await _pump(tester, seen, width: 700);
    expect(seen.last.shell.navigationPlacement, CatchTabBarPlacement.rail);
    expect(
      tester.getSize(find.byType(CatchTabBar<String>)).width,
      GeneratedCatchLayoutTokens.rail,
    );
    expect(
      tester.getRect(find.byKey(const ValueKey('screen'))).left,
      GeneratedCatchLayoutTokens.rail,
    );
    await _pump(tester, seen, width: 1000);
    expect(seen.last.shell.navigationPlacement, CatchTabBarPlacement.sidebar);
    expect(
      tester.getSize(find.byType(CatchTabBar<String>)).width,
      GeneratedCatchLayoutTokens.sidebar,
    );
  });

  testWidgets('the screen keeps its state when the placement changes', (
    tester,
  ) async {
    final seen = <({CatchShellScopeData shell, double bottomPadding})>[];
    await _pump(tester, seen, width: 400);
    await tester.tap(find.byKey(const ValueKey('screen')));
    await tester.pump();
    expect(find.text('taps 1'), findsOneWidget);
    await _pump(tester, seen, width: 1000);
    expect(find.text('taps 1'), findsOneWidget);
    await _pump(
      tester,
      seen,
      width: 400,
      viewInsets: const EdgeInsets.only(bottom: 300),
    );
    expect(find.text('taps 1'), findsOneWidget);
  });

  testWidgets('the bottom bar steps aside while the keyboard is up', (
    tester,
  ) async {
    final seen = <({CatchShellScopeData shell, double bottomPadding})>[];
    await _pump(
      tester,
      seen,
      width: 400,
      viewInsets: const EdgeInsets.only(bottom: 300),
    );
    expect(find.byType(CatchTabBar<String>), findsNothing);
    expect(seen.last.shell.bottomInset, 0);
  });

  testWidgets('a floating bar covers the screen and reports what it covers', (
    tester,
  ) async {
    final seen = <({CatchShellScopeData shell, double bottomPadding})>[];
    await _pump(
      tester,
      seen,
      width: 400,
      padding: const EdgeInsets.only(bottom: 34),
      platform: TargetPlatform.iOS,
    );
    expect(seen.last.shell.bottomInset, greaterThan(34));
    expect(seen.last.bottomPadding, 34);
    expect(tester.getRect(find.byKey(const ValueKey('screen'))).bottom, 800);
    final viewport = tester.widget<CatchTabViewportScope>(
      find.byType(CatchTabViewportScope),
    );
    expect(
      viewport.bottomBarPlacement,
      CatchTabViewportScopePlacement.floating,
    );
    expect(viewport.bottomOverlayInset, seen.last.shell.bottomInset);
  });
}
