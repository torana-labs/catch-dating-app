import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/primitives/contracts/shell_preview.dart';
import 'package:widgetbook_workspace/support/contract_preview.dart';

/// Rows of guests: enough body to scroll.
class _Guests extends StatelessWidget {
  const _Guests({this.hero = false});

  final bool hero;

  @override
  Widget build(BuildContext context) => CatchStack(
    gap: CatchStackGap.g12,
    children: [
      if (hero)
        const CatchSurface(
          block: CatchSurfaceBlock.band,
          color: CatchSurfaceColor.run,
          child: SizedBox(height: 180),
        ),
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: CatchSpacing.s5),
        child: CatchStack(
          gap: CatchStackGap.g12,
          children: [
            for (final name in const [
              'Aarav Mehta',
              'Diya Kapoor',
              'Kabir Singh',
              'Meera Iyer',
              'Rohan Das',
              'Sana Khan',
              'Tara Nair',
            ])
              CatchSurface(
                child: CatchText(name, variant: CatchTextVariant.titleRow),
              ),
          ],
        ),
      ),
    ],
  );
}

/// A screen whose body starts scrolled, as after a restore.
class _ScrolledScreen extends StatefulWidget {
  const _ScrolledScreen();

  @override
  State<_ScrolledScreen> createState() => _ScrolledScreenState();
}

class _ScrolledScreenState extends State<_ScrolledScreen> {
  final _controller = ScrollController(initialScrollOffset: 48);

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => PrimaryScrollController(
    controller: _controller,
    child: const CatchScreen(
      topBar: CatchTopBar(
        variant: CatchTopBarVariant.tool,
        kicker: 'Thursday social run',
        title: 'Guests',
      ),
      body: _Guests(),
    ),
  );
}

const _tool = CatchTopBar(
  variant: CatchTopBarVariant.tool,
  kicker: 'Thursday social run',
  title: 'Guests',
);

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchScreen,
  path: '[Core patterns]/Viewport',
)
Widget catchScreenContractStates(BuildContext context) {
  final states = <(String, String, Widget)>[
    (
      'rest',
      'The body at its top: no hairline.',
      const CatchScreen(topBar: _tool, body: _Guests()),
    ),
    (
      'scrolled',
      'Past 4 px the top bar shows its hairline.',
      const _ScrolledScreen(),
    ),
    (
      'subject',
      'A subject top bar over the hero, its titles hidden.',
      CatchScreen(
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.subject,
          title: 'Harbor Social',
          back: CatchTopBarBack(onPressed: () {}),
        ),
        body: const _Guests(hero: true),
      ),
    ),
    (
      'with-dock',
      'The dock below the body; the body never runs under it.',
      CatchScreen(
        topBar: _tool,
        body: const _Guests(),
        dock: CatchDock(
          primary: CatchDockAction(label: 'Message guests', onPressed: () {}),
        ),
      ),
    ),
    (
      'in-shell',
      'Inside a phone shell, above the bottom bar.',
      CatchAppShell(
        navigation: widgetbookShellNavigation(active: 'people'),
        child: const CatchScreen(topBar: _tool, body: _Guests()),
      ),
    ),
  ];
  return WidgetbookContractFrame(
    title: 'CatchScreen',
    contractId: 'catch.screen',
    states: const ['rest', 'scrolled', 'subject', 'with-dock', 'in-shell'],
    children: [
      for (final (label, description, screen) in states)
        WidgetbookContractStateCard(
          label: label,
          description: description,
          child: WidgetbookShellWindow(
            width: 390,
            height: 520,
            sizeClass: CatchWindowSize.compact,
            child: screen,
          ),
        ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchScreenScope,
  path: '[Core patterns]/Viewport',
)
Widget catchScreenScopeContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchScreenScope',
    contractId: 'catch.screen.scope',
    states: const ['rest', 'scrolled'],
    children: [
      for (final scrolled in const [false, true])
        WidgetbookContractStateCard(
          label: scrolled ? 'scrolled' : 'rest',
          description: 'What a top bar reads from the screen.',
          child: WidgetbookShellWindow(
            width: 390,
            sizeClass: CatchWindowSize.compact,
            child: CatchScreenScope(
              data: CatchScreenScopeData(scrolled: scrolled),
              child: _tool,
            ),
          ),
        ),
    ],
  );
}
