import 'package:catch_dating_app/contexts/profiles/domain/form_profile_draft.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/kernel/city_catalog.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// A typed field in the participant's explicit profile review.
/// The parent owns draft changes, text controllers and claim acknowledgement.
class FormProfileValueField extends StatelessWidget {
  const FormProfileValueField({
    super.key,
    required this.fieldKey,
    required this.label,
    required this.draft,
    required this.controller,
    required this.onChanged,
  });
  final String fieldKey, label;
  final FormProfileDraft draft;
  final TextEditingController controller;
  final ValueChanged<Object?> onChanged;
  bool get selectedKey => draft.review.fields.any(
    (field) =>
        draft.selected.contains(field.questionId) &&
        (field.definition?.privateProfilePath ?? field.canonicalFieldId) ==
            fieldKey,
  );

  @override
  Widget build(BuildContext context) {
    final key = fieldKey;
    final l10n = context.l10n;
    final contract =
        CatchContractConstraints.all[key == 'linkedinUrl'
            ? 'claimParticipantFormProfileCallablePayload.reviewedLinkedinUrl'
            : 'claimParticipantFormProfileCallablePayload.profile.$key'];
    final values = FormProfileDraft.choices(key);
    final value = draft.profile[key];
    if (key == 'languages' || key == 'interestedInGenders') {
      return CatchFieldLanes.single(
        child: CatchField<String>.choices(
          copy: catchFieldCopy(l10n),
          key: ValueKey('edit-$key'),
          title: label,
          contract: contract,
          contractValueBuilder: (v) => v,
          values: values.keys.toList(),
          itemLabelBuilder: (v) => values[v]!,
          selected: value is List ? value.cast<String>().toSet() : <String>{},
          mode: CatchChipMode.multiple,
          allowEmptySelection: true,
          onSelectionChanged: (values) => onChanged(values.toList()),
        ),
      );
    }
    if (values.isNotEmpty) {
      return CatchFieldLanes.single(
        child: CatchField<String>.select(
          copy: catchFieldCopy(l10n),
          key: ValueKey('edit-$key'),
          title: label,
          contract: contract,
          contractValueBuilder: (v) => v,
          values: values.keys.toList(),
          itemLabelBuilder: (v) => values[v]!,
          value: values.containsKey(value) ? value as String : null,
          onValidate: (v) =>
              (FormProfileDraft.requiredKeys.contains(key) || selectedKey) &&
                  v == null
              ? l10n.formProfileRequired
              : null,
          onChanged: (v) => onChanged(v),
        ),
      );
    }
    if (key == 'city') {
      final cities = {
        for (final city in defaultCityOptions)
          city.effectiveMarketId: city.label,
      };
      return CatchFieldLanes.single(
        child: CatchField<String>.select(
          copy: catchFieldCopy(l10n),
          key: ValueKey('edit-$key'),
          title: label,
          contract: contract,
          contractValueBuilder: (v) => v,
          values: cities.keys.toList(),
          itemLabelBuilder: (v) => cities[v]!,
          value: cities.containsKey(value) ? value as String : null,
          onChanged: (v) => onChanged(v),
        ),
      );
    }
    final isBirthDate = key == 'dateOfBirth';
    return CatchFieldLanes.single(
      child: CatchField.input(
        copy: catchFieldCopy(l10n),
        key: ValueKey('edit-$key'),
        title: label,
        contract: contract,
        controller: controller,
        helperText: isBirthDate ? l10n.formProfileDateHint : null,
        keyboardType: switch (key) {
          'height' => TextInputType.number,
          'email' => TextInputType.emailAddress,
          'linkedinUrl' => TextInputType.url,
          'dateOfBirth' => TextInputType.datetime,
          _ => TextInputType.text,
        },
        onValidate: (value) {
          final text = value?.trim() ?? '';
          if ((FormProfileDraft.requiredKeys.contains(key) || selectedKey) &&
              text.isEmpty) {
            return l10n.formProfileRequired;
          }
          if (isBirthDate) {
            final date = DateTime.tryParse(text);
            final now = DateTime.now();
            if (date == null ||
                date.toIso8601String().split('T').first != text ||
                date.isAfter(DateTime(now.year - 18, now.month, now.day))) {
              return l10n.formProfileDateHint;
            }
          }
          return null;
        },
        onChanged: (value) =>
            onChanged(key == 'height' ? int.tryParse(value) : value.trim()),
      ),
    );
  }
}
