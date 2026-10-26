import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/widgetbook_harness.dart';

@widgetbook.UseCase(
  name: 'Native input and validation states',
  type: CatchFieldInput,
  path: '[Core primitives]/Fields',
)
Widget fieldTextEntryStates(BuildContext context) {
  final copy = catchFieldCopy(context.l10n);
  final formKey = GlobalKey<FormState>();
  WidgetsBinding.instance.addPostFrameCallback((_) {
    formKey.currentState?.validate();
  });
  return WidgetbookCatalogFrame(
    title: 'Field text entry',
    catalogId: 'catch.field.text_entry',
    children: [
      CatchField.input(
        copy: copy,
        title: 'Display name',
        initialValue: 'Aanya',
        variant: CatchFieldVariant.underline,
        helperText: 'Visible on your profile.',
      ),
      CatchField.input(
        copy: copy,
        title: 'Short introduction',
        initialValue: 'Coffee, conversation, and a walk by the river.',
        minLines: 2,
        maxLines: 3,
      ),
      CatchField.input(
        copy: copy,
        title: 'Invitation code',
        initialValue: 'ABCD',
        inputMode: CatchTextInputMode.inactiveWithoutSelection,
        leading: Icon(CatchIcons.ticket),
      ),
      CatchField.input(
        copy: copy,
        title: 'Private code',
        initialValue: '1234',
        inputVariant: CatchTextInputVariant.obscured,
        states: const <WidgetState>{WidgetState.disabled},
      ),
      Form(
        key: formKey,
        child: CatchField.input(
          copy: copy,
          title: 'Required name',
          onValidate: (value) =>
              value?.isNotEmpty == true ? null : 'Enter a name.',
        ),
      ),
      WidgetbookTextControllerScope(
        initialText: 'An editable introduction',
        builder: (context, controller) => CatchField.inputActions(
          copy: copy,
          title: 'Introduction',
          contract: const CatchContractFieldConstraints(
            path: 'preview.introduction',
            maxLength: 300,
          ),
          controller: controller,
          open: true,
          onOpenChanged: (_) {},
          onCancel: () {},
          onSubmit: () {},
        ),
      ),
    ],
  );
}
