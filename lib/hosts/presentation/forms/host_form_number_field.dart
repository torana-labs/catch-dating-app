import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class HostFormNumberField extends StatelessWidget {
  const HostFormNumberField({
    super.key,
    required this.fieldKey,
    required this.questionId,
    required this.title,
    required this.value,
    required this.onChanged,
    this.decimal = false,
  });

  final String fieldKey;
  final String questionId;
  final String title;
  final num? value;
  final ValueChanged<num?> onChanged;
  final bool decimal;

  @override
  Widget build(BuildContext context) => CatchFieldLanes.single(
    child: CatchField.input(
      copy: catchFieldCopy(context.l10n),
      key: ValueKey('$fieldKey-$questionId-$value'),
      title: title,
      initialValue: value?.toString(),
      labelMode: CatchFieldLabelTextMode.optional,
      keyboardType: TextInputType.numberWithOptions(
        decimal: decimal,
        signed: decimal,
      ),
      contractExemption: 'The form contract validates numeric answer limits.',
      onBlur: (text) => onChanged(
        text.trim().isEmpty
            ? null
            : decimal
            ? num.tryParse(text.trim())
            : int.tryParse(text.trim()),
      ),
    ),
  );
}
