import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/primitives/contracts/shell_preview.dart';
import 'package:widgetbook_workspace/support/contract_preview.dart';

/// A pane dock owns a note controller for as long as the preview shows.
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

/// The dock at the foot of a window of [width].
class _DockWindow extends StatelessWidget {
  const _DockWindow({
    required this.width,
    required this.sizeClass,
    required this.dock,
  });

  final double width;
  final CatchWindowSize sizeClass;
  final Widget dock;

  @override
  Widget build(BuildContext context) => WidgetbookShellWindow(
    width: width,
    sizeClass: sizeClass,
    child: Material(
      type: MaterialType.transparency,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: CatchSpacing.s8),
          dock,
        ],
      ),
    ),
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchDock,
  path: '[Core primitives]/Product composites',
)
Widget catchSystemDockContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchDock',
    contractId: 'catch.bottom_action',
    states: const ['auto', 'bar', 'card', 'pane'],
    children: [
      WidgetbookContractStateCard(
        label: 'auto',
        description: 'A bar on a phone, a floating card on a desktop.',
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          spacing: CatchSpacing.s3,
          children: [
            for (final (width, sizeClass) in const [
              (WidgetbookShellLayout.phone, CatchWindowSize.compact),
              (WidgetbookShellLayout.laptop, CatchWindowSize.expanded),
            ])
              _DockWindow(
                width: width,
                sizeClass: sizeClass,
                dock: CatchDock(
                  primary: CatchDockAction(label: 'Publish', onPressed: () {}),
                  secondary: CatchDockAction(
                    label: 'Preview',
                    onPressed: () {},
                  ),
                ),
              ),
          ],
        ),
      ),
      WidgetbookContractStateCard(
        label: 'bar',
        description: 'A summary before the primary action.',
        child: _DockWindow(
          width: WidgetbookShellLayout.phone,
          sizeClass: CatchWindowSize.compact,
          dock: CatchDock(
            placement: CatchDockPlacement.bar,
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
        ),
      ),
      WidgetbookContractStateCard(
        label: 'card',
        description: 'A floating card at any size, here on a tablet.',
        child: _DockWindow(
          width: WidgetbookShellLayout.tablet,
          sizeClass: CatchWindowSize.medium,
          dock: CatchDock(
            placement: CatchDockPlacement.card,
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
      const WidgetbookContractStateCard(
        label: 'pane',
        description: 'The decision bar at the foot of a detail pane.',
        child: _DockWindow(
          width: WidgetbookShellLayout.pane,
          sizeClass: CatchWindowSize.medium,
          dock: _PaneDock(),
        ),
      ),
    ],
  );
}
