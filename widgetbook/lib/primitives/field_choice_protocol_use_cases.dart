import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/widgetbook_harness.dart';

@widgetbook.UseCase(
  name: 'Single-choice disclosure protocol',
  type: CatchFieldChoicePickedNotification,
  path: '[Core primitives]/Fields',
)
Widget fieldChoiceDisclosureProtocol(BuildContext context) {
  var selected = 'Morning';
  return StatefulBuilder(
    builder: (context, setState) => WidgetbookCatalogFrame(
      title: 'Single-choice disclosure',
      catalogId: 'catch.field.choice_picked_notification',
      children: [
        CatchField<String>.choices(
          copy: catchFieldCopy(context.l10n),
          title: 'Preferred time',
          values: const ['Morning', 'Evening'],
          itemLabelBuilder: (value) => value,
          selected: {selected},
          disclosureMode: CatchFieldMode.localExpanded,
          onSelectionChanged: (values) =>
              setState(() => selected = values.single),
        ),
        CatchField<String>.optionCards(
          copy: catchFieldCopy(context.l10n),
          title: 'Time details',
          values: const ['Morning', 'Evening'],
          itemTitleBuilder: (value) => value,
          itemDescriptionBuilder: (value) => value == 'Morning'
              ? 'Start your day together.'
              : 'Meet after the working day.',
          selected: selected,
          disclosureMode: CatchFieldMode.localExpanded,
          onChanged: (value) => setState(() => selected = value),
        ),
      ],
    ),
  );
}
