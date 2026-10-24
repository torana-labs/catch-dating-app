import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// An entire reviewed answer, never an ellipsized summary of what will be shared.
/// The optional toggle uses the same interaction and tokens as CatchField.
class EventProfileAnswerField extends StatelessWidget {
  const EventProfileAnswerField.read({
    super.key,
    required this.label,
    required this.answer,
  }) : selected = null,
       onChanged = null;

  const EventProfileAnswerField.share({
    super.key,
    required this.label,
    required this.answer,
    required bool this.selected,
    required this.onChanged,
  });

  final String label, answer;
  final bool? selected;
  final ValueChanged<bool>? onChanged;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(
      vertical: CatchLayout.fieldRowVerticalPadding,
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: CatchText(label, variant: CatchTextVariant.fieldLabel),
            ),
            if (selected case final value?) ...[
              gapW16,
              CatchToggleInput.field(
                value: value,
                onChanged: onChanged,
                semanticLabel: label,
                contractExemption:
                    'Only explicitly selected eligible fields at the reviewed account, profile and organizer card revisions can be shared.',
              ),
            ],
          ],
        ),
        gapH4,
        CatchText(
          answer,
          variant: CatchTextVariant.bodyL,
          color: CatchTokens.of(context).ink,
        ),
      ],
    ),
  );
}
