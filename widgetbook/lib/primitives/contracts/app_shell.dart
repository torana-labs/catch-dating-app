import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/primitives/contracts/shell_preview.dart';
import 'package:widgetbook_workspace/support/contract_preview.dart';

/// A tab home: the top bar, a few sections and nothing else.
class _TodayScreen extends StatelessWidget {
  const _TodayScreen();

  @override
  Widget build(BuildContext context) => CatchScreen(
    topBar: const CatchTopBar(
      variant: CatchTopBarVariant.tabHome,
      kicker: 'Tuesday 27 October',
      title: 'Good evening, Meher',
    ),
    body: Padding(
      padding: const EdgeInsets.all(CatchSpacing.s5),
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
  );
}

/// What a screen inside the shell reads from CatchShellScope.
class _ScopeReadout extends StatelessWidget {
  const _ScopeReadout();

  @override
  Widget build(BuildContext context) {
    final shell = CatchShellScope.maybeOf(context);
    return CatchScreen(
      bodyScrolls: false,
      body: Padding(
        padding: const EdgeInsets.all(CatchSpacing.s5),
        child: CatchStack(
          gap: CatchStackGap.g4,
          children: [
            CatchText(
              'navigationPlacement: ${shell?.navigationPlacement.name}',
              variant: CatchTextVariant.labelCode,
            ),
            CatchText(
              'bottomInset: ${shell?.bottomInset}',
              variant: CatchTextVariant.labelCode,
            ),
            CatchText(
              'inShell: ${CatchShellScope.inShellOf(context)}',
              variant: CatchTextVariant.labelCode,
            ),
          ],
        ),
      ),
    );
  }
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchAppShell,
  path: '[Core patterns]/Viewport',
)
Widget catchAppShellContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchAppShell',
    contractId: 'catch.app_shell',
    states: const ['bottom', 'rail', 'sidebar'],
    children: [
      for (final (label, description, width, sizeClass) in const [
        (
          'bottom',
          'Under 600 px: the bar below the screen.',
          WidgetbookShellLayout.phone,
          CatchWindowSize.compact,
        ),
        (
          'rail',
          'From 600 px: a 96 px rail beside the screen.',
          WidgetbookShellLayout.tablet,
          CatchWindowSize.medium,
        ),
        (
          'sidebar',
          'From 840 px: a 240 px sidebar.',
          WidgetbookShellLayout.desktop,
          CatchWindowSize.expanded,
        ),
      ])
        WidgetbookContractStateCard(
          label: label,
          description: description,
          child: WidgetbookShellWindow(
            width: width,
            height: WidgetbookShellLayout.shellHeight,
            sizeClass: sizeClass,
            child: CatchAppShell(
              navigation: widgetbookShellNavigation(),
              child: const _TodayScreen(),
            ),
          ),
        ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchShellScope,
  path: '[Core patterns]/Viewport',
)
Widget catchShellScopeContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchShellScope',
    contractId: 'catch.app_shell.scope',
    states: const ['read'],
    children: [
      WidgetbookContractStateCard(
        label: 'read',
        description: 'A screen in a tablet shell reads where the rail sits.',
        child: WidgetbookShellWindow(
          width: WidgetbookShellLayout.tablet,
          height: WidgetbookShellLayout.readoutHeight,
          sizeClass: CatchWindowSize.medium,
          child: CatchAppShell(
            navigation: widgetbookShellNavigation(),
            child: const _ScopeReadout(),
          ),
        ),
      ),
    ],
  );
}
