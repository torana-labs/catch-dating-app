import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/contract_preview.dart';

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchStack,
  path: '[Core primitives]/Layout',
)
Widget catchStackContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchStack',
    contractId: 'catch.stack',
    states: const ['gaps', 'equal', 'wrap', 'collapse'],
    children: [
      WidgetbookContractStateCard(
        label: 'gaps',
        child: CatchRoot(
          size: CatchWindowSize.compact,
          child: CatchStack(
            gap: CatchStackGap.g8,
            children: [
              for (final gap in const [
                CatchStackGap.g4,
                CatchStackGap.g12,
                CatchStackGap.g24,
                CatchStackGap.section,
              ])
                CatchStack(
                  direction: CatchStackDirection.row,
                  align: CatchStackAlign.center,
                  gap: gap,
                  children: [
                    CatchText(gap.name, variant: CatchTextVariant.labelBadge),
                    const _Cell('a'),
                    const _Cell('b'),
                  ],
                ),
            ],
          ),
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'equal',
        child: CatchRoot(
          child: CatchStack(
            direction: CatchStackDirection.row,
            equal: true,
            gap: CatchStackGap.g8,
            children: [_Cell('one'), _Cell('two'), _Cell('three')],
          ),
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'wrap',
        child: CatchRoot(
          child: CatchStack(
            direction: CatchStackDirection.row,
            wrap: true,
            gap: CatchStackGap.g8,
            children: [
              _Cell('chips'),
              _Cell('flow'),
              _Cell('onto'),
              _Cell('new'),
              _Cell('runs'),
              _Cell('with'),
              _Cell('the'),
              _Cell('same'),
              _Cell('gap'),
            ],
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'collapse',
        description: 'A row that stacks below medium.',
        child: CatchStack(
          gap: CatchStackGap.g12,
          children: [
            for (final size in CatchWindowSize.values)
              CatchRoot(
                size: size,
                child: CatchStack(
                  gap: CatchStackGap.g4,
                  children: [
                    CatchText(size.name, variant: CatchTextVariant.bodyMeta),
                    const CatchStack(
                      direction: CatchStackDirection.row,
                      equal: true,
                      collapseBelow: CatchWindowSize.medium,
                      gap: CatchStackGap.section,
                      children: [_Cell('first'), _Cell('second')],
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

class _Cell extends StatelessWidget {
  const _Cell(this.label);

  final String label;

  @override
  Widget build(BuildContext context) => CatchSurface(
    padding: CatchSurfacePadding.sm,
    child: CatchText(label, variant: CatchTextVariant.bodyMeta, maxLines: 1),
  );
}
