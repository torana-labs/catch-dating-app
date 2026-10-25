import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/primitives/catch_text.dart';
import 'package:catch_ui/src/primitives/catch_text_variant.dart';
import 'package:flutter/material.dart';

/// One acknowledgement or checklist value, with checked semantics.
/// Settings use CatchToggleInput; multiple choices use CatchChoiceInput.
class CatchCheckboxInput extends StatelessWidget {
  const CatchCheckboxInput({
    super.key,
    required this.value,
    required this.onChanged,
    required this.label,
    this.description,
    this.semanticLabel,
  });

  final bool value;
  final ValueChanged<bool>? onChanged;
  final String label;
  final String? description;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return Opacity(
      opacity: onChanged == null
          ? CatchOpacity.disabledControl
          : CatchOpacity.visible,
      child: Material(
        color: Colors.transparent,
        child: CheckboxListTile(
          value: value,
          activeColor: t.primary,
          checkColor: t.primaryInk,
          onChanged: onChanged == null ? null : (next) => onChanged!(next!),
          controlAffinity: ListTileControlAffinity.leading,
          contentPadding: EdgeInsets.zero,
          checkboxSemanticLabel: semanticLabel,
          title: ExcludeSemantics(
            excluding: semanticLabel != null,
            child: CatchText(label, variant: CatchTextVariant.bodyM),
          ),
          subtitle: description == null
              ? null
              : CatchText(description!, variant: CatchTextVariant.bodyS),
        ),
      ),
    );
  }
}
