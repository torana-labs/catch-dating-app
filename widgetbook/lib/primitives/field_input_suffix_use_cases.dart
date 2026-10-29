import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/widgetbook_harness.dart';

@widgetbook.UseCase(
  name: 'Text-entry suffix and clear states',
  type: CatchFieldTrailingRow,
  path: '[Core primitives]/Fields',
)
Widget fieldInputSuffixStates(BuildContext context) => WidgetbookCatalogFrame(
  title: 'Text-entry trailing content',
  catalogId: 'catch.field.trailing',
  children: [
    WidgetbookTextControllerScope(
      initialText: 'A short note',
      builder: (context, controller) => CatchField.input(
        copy: catchFieldCopy(context.l10n),
        title: 'Clear with fallback',
        contractExemption: 'Catalog-only text-entry suffix fixture.',
        controller: controller,
        variant: CatchFieldVariant.underline,
        showClearButton: true,
        trailing: Icon(CatchIcons.check),
      ),
    ),
    WidgetbookTextControllerScope(
      initialText: 'ABC123',
      builder: (context, controller) => CatchField.input(
        copy: catchFieldCopy(context.l10n),
        title: 'Custom action',
        contractExemption: 'Catalog-only text-entry suffix fixture.',
        controller: controller,
        variant: CatchFieldVariant.underline,
        actions: CatchButton.text(label: 'Verify', onPressed: () {}),
      ),
    ),
    WidgetbookTextControllerScope(
      initialText: 'Confirmed',
      builder: (context, controller) => CatchField.input(
        copy: catchFieldCopy(context.l10n),
        title: 'Suffix icon',
        contractExemption: 'Catalog-only text-entry suffix fixture.',
        controller: controller,
        variant: CatchFieldVariant.underline,
        trailing: Icon(CatchIcons.check),
      ),
    ),
    WidgetbookTextControllerScope(
      initialText: '',
      builder: (context, controller) => CatchField.input(
        copy: catchFieldCopy(context.l10n),
        title: 'Empty clear slot',
        contractExemption: 'Catalog-only text-entry suffix fixture.',
        controller: controller,
        variant: CatchFieldVariant.underline,
        showClearButton: true,
      ),
    ),
    WidgetbookTextControllerScope(
      initialText: 'Full text width',
      builder: (context, controller) => CatchField.input(
        copy: catchFieldCopy(context.l10n),
        title: 'No suffix',
        contractExemption: 'Catalog-only text-entry suffix fixture.',
        controller: controller,
        variant: CatchFieldVariant.underline,
      ),
    ),
  ],
);
