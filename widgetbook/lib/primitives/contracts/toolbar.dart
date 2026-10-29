import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/contract_preview.dart';

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchToolbarButton,
  path: '[Core primitives]/Navigation',
)
Widget catchToolbarButtonContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchToolbarButton',
    contractId: 'catch.top_bar.labelled_control',
    states: const ['selector', 'action', 'disabled', 'large-text'],
    children: [
      WidgetbookContractStateCard(
        label: 'selector',
        child: WidgetbookContractTopBarFrame(child: _selectorBar(context)),
      ),
      WidgetbookContractStateCard(
        label: 'action',
        child: CatchToolbarButton.action(
          label: 'Create event',
          semanticLabel: 'Create event',
          tooltip: 'Create event',
          icon: CatchIcons.add,
          onPressed: widgetbookNoop,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'disabled',
        child: Wrap(
          spacing: CatchToolbarMetrics.gap,
          runSpacing: CatchToolbarMetrics.gap,
          children: [
            CatchToolbarButton.selector(
              label: 'Mumbai',
              semanticLabel: 'Choose Mumbai',
              tooltip: 'Choose city',
              icon: CatchIcons.location,
              onPressed: null,
            ),
            CatchToolbarButton.action(
              label: 'Create event',
              semanticLabel: 'Create event',
              tooltip: 'Create event',
              icon: CatchIcons.add,
              onPressed: null,
            ),
          ],
        ),
      ),
      WidgetbookContractStateCard(
        label: 'large-text',
        child: MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: const TextScaler.linear(2)),
          child: Builder(
            builder: (context) =>
                WidgetbookContractTopBarFrame(child: _selectorBar(context)),
          ),
        ),
      ),
    ],
  );
}

Widget _selectorBar(BuildContext context) => CatchTopBar.screen(
  title: 'Explore',
  leading: const _ToolbarSelectorPreview(),
  actions: [
    CatchIconAction.toolbar(
      icon: CatchIcons.bookmark,
      tooltip: 'Saved events',
      onPressed: widgetbookNoop,
    ),
  ],
  search: CatchTopBarSearch(
    copy: catchSearchFieldCopy(context.l10n),
    placeholder: 'Search events',
    tooltip: 'Search events',
  ),
);

/// Models the same measured leading contract used by the production city picker.
class _ToolbarSelectorPreview extends StatelessWidget
    implements CatchToolbarLeading {
  const _ToolbarSelectorPreview();

  @override
  Size toolbarSizeFor(BuildContext context) =>
      CatchToolbarButton.sizeFor(context, label: 'Mumbai', maxWidth: 132);

  @override
  Widget build(BuildContext context) => ConstrainedBox(
    constraints: BoxConstraints(
      maxWidth: CatchToolbarScope.selectorReflowOf(context)
          ? double.infinity
          : 132,
    ),
    child: CatchToolbarButton.selector(
      label: 'Mumbai',
      semanticLabel: 'Choose Mumbai',
      tooltip: 'Choose city',
      icon: CatchIcons.location,
      onPressed: widgetbookNoop,
    ),
  );
}

@widgetbook.UseCase(
  name: 'Control inheritance',
  type: CatchToolbarScope,
  path: '[Core primitives]/Navigation',
)
Widget catchToolbarScopeContractStates(BuildContext context) =>
    catchToolbarButtonContractStates(context);
