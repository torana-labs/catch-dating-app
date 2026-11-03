import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/contract_preview.dart';

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchText,
  path: '[Core primitives]/Typography',
)
Widget catchTextContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchText',
    contractId: 'catch.text',
    states: const ['roles', 'recolored', 'aligned', 'clamped', 'numeric'],
    children: [
      WidgetbookContractStateCard(
        label: 'roles',
        description: 'The 19 type roles, then the three responsive ones.',
        child: _Root(
          child: CatchStack(
            gap: CatchStackGap.g6,
            children: [
              for (final variant in CatchTextVariant.values)
                CatchText(variant.name, variant: variant, maxLines: 1),
            ],
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'recolored',
        description: 'Tones; inherit takes the ground ink.',
        child: _Root(
          child: CatchStack(
            direction: CatchStackDirection.row,
            wrap: true,
            gap: CatchStackGap.g12,
            children: [
              for (final tone in CatchTextTone.values)
                CatchText(
                  tone.name,
                  variant: CatchTextVariant.titleRow,
                  tone: tone,
                ),
            ],
          ),
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'aligned',
        child: _Root(
          child: CatchStack(
            gap: CatchStackGap.g4,
            children: [
              CatchText('Start'),
              CatchText('Centred', align: TextAlign.center),
              CatchText('End', align: TextAlign.end),
            ],
          ),
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'clamped',
        child: _Root(
          child: CatchText(
            'A long description of the evening wraps past the line limit '
            'and ends in an ellipsis instead of growing the block, however '
            'much more of it there is to read.',
            maxLines: 2,
          ),
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'numeric',
        child: _Root(
          child: CatchStack(
            gap: CatchStackGap.g4,
            children: [
              CatchText('11:11 · 1,111', variant: CatchTextVariant.titleBar),
              CatchText(
                '11:11 · 1,111',
                variant: CatchTextVariant.titleBar,
                numeric: true,
              ),
            ],
          ),
        ),
      ),
    ],
  );
}

class _Root extends StatelessWidget {
  const _Root({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) => CatchRoot(
    theme: CatchThemeMode.day,
    size: CatchWindowSize.compact,
    child: child,
  );
}
