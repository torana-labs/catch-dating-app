import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class HostFormValidationTextField extends StatelessWidget {
  const HostFormValidationTextField({
    super.key,
    required this.fieldKey,
    required this.questionId,
    required this.title,
    required this.value,
    required this.onChanged,
  });

  final String fieldKey;
  final String questionId;
  final String title;
  final String? value;
  final ValueChanged<String?> onChanged;

  @override
  Widget build(BuildContext context) => CatchFieldLanes.single(
    child: CatchField.input(
      copy: catchFieldCopy(context.l10n),
      key: ValueKey('$fieldKey-$questionId-$value'),
      title: title,
      initialValue: value,
      labelMode: CatchFieldLabelTextMode.optional,
      contractExemption: 'The form contract validates this answer rule.',
      onBlur: (text) => onChanged(text.trim().isEmpty ? null : text.trim()),
    ),
  );
}
