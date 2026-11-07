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

/// A pane dock owns its note controller.
class _PaneDock extends StatefulWidget {
  const _PaneDock();

  @override
  State<_PaneDock> createState() => _PaneDockState();
}

class _PaneDockState extends State<_PaneDock> {
  final _note = TextEditingController();

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => CatchDock(
    placement: CatchDockPlacement.pane,
    primary: CatchDockAction(label: 'Approve', onPressed: () {}),
    secondary: CatchDockAction(label: 'Ask', onPressed: () {}),
    danger: CatchDockAction(label: 'Reject', onPressed: () {}),
    note: CatchDockNote(
      label: 'Why? Only your team sees this',
      controller: _note,
    ),
    next: const CatchText(
      'Then: Harbor Social · 3 left',
      variant: CatchTextVariant.bodyMeta,
      tone: CatchTextTone.secondary,
    ),
  );
}

void main() {
  testWidgets('bars on a phone and a pane dock', (tester) async {
    await matchCatchGolden(
      tester,
      'dock_family',
      size: const Size(390, 560),
      builder: (context) => CatchRoot(
        theme: _themeOf(context),
        size: CatchWindowSize.compact,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          spacing: CatchSpacing.s6,
          children: [
            CatchDock(
              primary: CatchDockAction(label: 'Publish', onPressed: () {}),
            ),
            CatchDock(
              primary: CatchDockAction(label: 'Publish', onPressed: () {}),
              secondary: CatchDockAction(label: 'Preview', onPressed: () {}),
            ),
            CatchDock(
              primary: CatchDockAction(label: 'Book a spot', onPressed: () {}),
              summary: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  CatchText('₹1,200', variant: CatchTextVariant.titleRow),
                  CatchText(
                    'Thu 7 Nov',
                    variant: CatchTextVariant.bodyMeta,
                    tone: CatchTextTone.secondary,
                  ),
                ],
              ),
            ),
            const CatchDock(
              primary: CatchDockAction(label: 'Saving', loading: true),
            ),
            const _PaneDock(),
          ],
        ),
      ),
    );
  });

  testWidgets('a floating card on a desktop', (tester) async {
    await matchCatchGolden(
      tester,
      'dock_family_card',
      size: const Size(900, 240),
      builder: (context) => CatchRoot(
        theme: _themeOf(context),
        size: CatchWindowSize.expanded,
        child: Align(
          alignment: Alignment.bottomCenter,
          child: CatchDock(
            primary: CatchDockAction(
              label: 'Open the door',
              icon: CatchIcons.ticket,
              onPressed: () {},
            ),
            secondary: CatchDockAction(
              label: 'Message guests',
              onPressed: () {},
            ),
          ),
        ),
      ),
    );
  });
}
