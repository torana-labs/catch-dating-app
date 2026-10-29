import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/widgetbook_harness.dart';

@widgetbook.UseCase(
  name: 'Selection value and validation states',
  type: CatchSelectionField,
  path: '[Core primitives]/Fields',
)
Widget fieldSelectControlStates(BuildContext context) {
  final formKey = GlobalKey<FormState>();
  WidgetsBinding.instance.addPostFrameCallback((_) {
    formKey.currentState?.validate();
  });
  final copy = catchFieldCopy(context.l10n);
  const values = ['City centre', 'Riverside', 'Outside the city'];
  return WidgetbookCatalogFrame(
    title: 'Field selection menus',
    catalogId: 'catch.field.select_control',
    children: [
      CatchField<String>.select(
        copy: copy,
        title: 'Choose a location',
        contractExemption: 'Catalog-only field selection fixture.',
        values: values,
        itemLabelBuilder: (value) => value,
        onChanged: (_) {},
      ),
      CatchField<String>.select(
        copy: copy,
        title: 'Meeting area',
        contractExemption: 'Catalog-only field selection fixture.',
        values: values,
        itemLabelBuilder: (value) => value,
        value: 'Riverside',
        leading: Icon(CatchIcons.location),
        onChanged: (_) {},
      ),
      CatchField<String>.select(
        copy: copy,
        title: 'Location without a visible label',
        contractExemption: 'Catalog-only field selection fixture.',
        values: values,
        itemLabelBuilder: (value) => value,
        value: 'City centre',
        showLabel: false,
        size: CatchFieldSize.compact,
        onChanged: (_) {},
      ),
      CatchField<String>.select(
        copy: copy,
        title: 'Unavailable selection',
        contractExemption: 'Catalog-only field selection fixture.',
        values: values,
        itemLabelBuilder: (value) => value,
        value: 'Outside the city',
        states: const <WidgetState>{WidgetState.disabled},
      ),
      Form(
        key: formKey,
        child: CatchField<String>.select(
          copy: copy,
          title: 'Required location',
          contractExemption: 'Catalog-only field selection fixture.',
          values: values,
          itemLabelBuilder: (value) => value,
          onValidate: (value) => value == null ? 'Choose a location.' : null,
          onChanged: (_) {},
        ),
      ),
    ],
  );
}
