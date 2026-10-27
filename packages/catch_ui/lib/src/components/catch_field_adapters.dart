part of 'catch_field.dart';

// Contract normalization and native-control adaptation behind the Field facade.
CatchField<T> _catchFieldChoices<T>({
  required CatchFieldCopy copy,
  Key? key,
  required String title,
  String? body,
  CatchContractFieldConstraints? contract,
  String Function(T value)? contractValueBuilder,
  required List<T> values,
  required String Function(T value) itemLabelBuilder,
  required Set<T> selected,
  required ValueChanged<Set<T>>? onSelectionChanged,
  CatchChipMode mode = CatchChipMode.single,
  bool allowEmptySelection = false,
  CatchFieldMode disclosureMode = CatchFieldMode.localCollapsed,
  ValueChanged<bool>? onOpenChanged,
  VoidCallback? onCancel,
  VoidCallback? onSubmit,
  CatchFieldStatus status = CatchFieldStatus.idle,
  Set<WidgetState> states = const <WidgetState>{},
  bool addable = false,
  CatchFieldLabelTextMode labelMode = CatchFieldLabelTextMode.visible,
  String? helperText,
  Color? Function(T item)? itemAccentBuilder,
  IconData? icon,
  Color? iconColor,
  CatchFieldTone tone = CatchFieldTone.normal,
  String? emptyValueText,
  String? error,
  String? errorText,
}) {
  final supportedValues = CatchContractFieldPolicy.supportedChoiceValues(
    contract,
    values,
    contractValueBuilder,
    multi: mode == CatchChipMode.multiple,
  );
  final supportedSelection = selected.intersection(supportedValues.toSet());
  final selectedSummary = supportedValues
      .where(supportedSelection.contains)
      .map(itemLabelBuilder)
      .join(' · ');
  return CatchField<T>.control(
    copy: copy,
    key: key,
    title: title,
    contract: contract,
    body: body ?? (selectedSummary.isEmpty ? null : selectedSummary),
    disclosureMode: disclosureMode,
    onOpenChanged: onOpenChanged,
    onCancel: onCancel,
    onSubmit: onSubmit,
    status: status,
    states: states,
    addable: addable,
    labelMode: labelMode,
    helperText: helperText,
    icon: icon,
    iconColor: iconColor,
    tone: tone,
    emptyValueText: emptyValueText,
    error: error,
    errorText: errorText,
    child: CatchChoiceInput<T>(
      values: supportedValues,
      selected: supportedSelection,
      allowEmptySelection: allowEmptySelection,
      autoClose: mode == CatchChipMode.single && onSubmit == null,
      mode: mode,
      itemLabelBuilder: itemLabelBuilder,
      itemAccentBuilder: itemAccentBuilder,
      onChanged:
          !states.contains(WidgetState.disabled) &&
              status != CatchFieldStatus.saving
          ? onSelectionChanged
          : null,
    ),
  );
}

CatchField<T> _catchFieldOptionCards<T>({
  required CatchFieldCopy copy,
  Key? key,
  required String title,
  String? body,
  CatchContractFieldConstraints? contract,
  String Function(T value)? contractValueBuilder,
  required List<T> values,
  required String Function(T value) itemTitleBuilder,
  required String Function(T value) itemDescriptionBuilder,
  required T selected,
  required ValueChanged<T>? onChanged,
  CatchFieldMode disclosureMode = CatchFieldMode.localCollapsed,
  ValueChanged<bool>? onOpenChanged,
  VoidCallback? onCancel,
  VoidCallback? onSubmit,
  CatchFieldStatus status = CatchFieldStatus.idle,
  Set<WidgetState> states = const <WidgetState>{},
  String? helperText,
  IconData? icon,
  Color? iconColor,
  CatchFieldTone tone = CatchFieldTone.normal,
  String? error,
  String? errorText,
}) {
  final supportedValues = CatchContractFieldPolicy.supportedChoiceValues(
    contract,
    values,
    contractValueBuilder,
    multi: false,
  );
  assert(
    supportedValues.isNotEmpty,
    'CatchField.optionCards needs at least one value.',
  );
  assert(
    supportedValues.contains(selected),
    'CatchField.optionCards selected must be allowed by the schema '
    'contract.',
  );
  return CatchField<T>.control(
    copy: copy,
    key: key,
    title: title,
    contract: contract,
    body: body ?? itemTitleBuilder(selected),
    disclosureMode: disclosureMode,
    onOpenChanged: onOpenChanged,
    onCancel: onCancel,
    onSubmit: onSubmit,
    status: status,
    states: states,
    helperText: helperText,
    icon: icon,
    iconColor: iconColor,
    tone: tone,
    error: error,
    errorText: errorText,
    child: CatchChoiceInput<T>.described(
      values: supportedValues,
      selected: {selected},
      autoClose: onSubmit == null,
      onChanged:
          !states.contains(WidgetState.disabled) &&
              status != CatchFieldStatus.saving &&
              onChanged != null
          ? (selection) => onChanged(selection.single)
          : null,
      itemLabelBuilder: itemTitleBuilder,
      itemSubtitleBuilder: itemDescriptionBuilder,
    ),
  );
}

CatchField<T> _catchFieldStepper<T>({
  required CatchFieldCopy copy,
  Key? key,
  required String title,
  String? body,
  CatchContractFieldConstraints? contract,
  required num value,
  required ValueChanged<num>? onChanged,
  VoidCallback? onClear,
  num? min,
  num? max,
  num? step,
  String? unit,
  String Function(num value)? valueLabelBuilder,
  required String decreaseSemanticLabel,
  required String increaseSemanticLabel,
  CatchFieldMode disclosureMode = CatchFieldMode.localCollapsed,
  ValueChanged<bool>? onOpenChanged,
  VoidCallback? onCancel,
  VoidCallback? onSubmit,
  CatchFieldStatus status = CatchFieldStatus.idle,
  Set<WidgetState> states = const <WidgetState>{},
  bool addable = false,
  CatchFieldLabelTextMode labelMode = CatchFieldLabelTextMode.visible,
  IconData? icon,
  Color? iconColor,
  CatchFieldTone tone = CatchFieldTone.normal,
  String? emptyValueText,
  String? error,
  String? errorText,
}) {
  assert(
    step == null || step > 0,
    'CatchField.stepper requires a positive step.',
  );
  final effectiveMin = CatchContractFieldPolicy.effectiveMinimum(contract, min);
  final effectiveMax = CatchContractFieldPolicy.effectiveMaximum(contract, max);
  final effectiveStep = CatchContractFieldPolicy.effectiveStep(contract, step);
  final stepper = CatchStepper(
    value: value,
    min: effectiveMin,
    max: effectiveMax,
    step: effectiveStep,
    unit: unit,
    valueLabelBuilder: valueLabelBuilder,
    decreaseSemanticLabel: decreaseSemanticLabel,
    increaseSemanticLabel: increaseSemanticLabel,
    enabled: status != CatchFieldStatus.saving,
    onChanged: onChanged,
  );
  return CatchField<T>.control(
    copy: copy,
    key: key,
    title: title,
    contract: contract,
    body: body,
    disclosureMode: disclosureMode,
    onOpenChanged: onOpenChanged,
    onCancel: onCancel,
    onSubmit: onSubmit,
    status: status,
    states: states,
    addable: addable,
    labelMode: labelMode,
    icon: icon,
    iconColor: iconColor,
    tone: tone,
    emptyValueText: emptyValueText,
    error: error,
    errorText: errorText,
    child: onClear == null
        ? stepper
        : OverflowBar(
            alignment: MainAxisAlignment.spaceBetween,
            overflowAlignment: OverflowBarAlignment.end,
            spacing: CatchSpacing.s2,
            children: [
              IntrinsicWidth(child: stepper),
              IconButton(
                key: const ValueKey('catch-field-stepper-clear'),
                tooltip: copy.clearTooltip(title),
                constraints: CatchFieldTrailingRow.clearTargetConstraints,
                icon: Icon(CatchIcons.close, size: CatchIconSize.xs),
                onPressed: status == CatchFieldStatus.saving ? null : onClear,
              ),
            ],
          ),
  );
}

CatchField<T> _catchFieldSelect<T>({
  required CatchFieldCopy copy,
  Key? key,
  required String title,
  CatchContractFieldConstraints? contract,
  String? contractExemption,
  String Function(T value)? contractValueBuilder,
  required List<T> values,
  required String Function(T item) itemLabelBuilder,
  T? value,
  String? hintText,
  Widget? leading,
  ValueChanged<T?>? onChanged,
  FormFieldValidator<T>? onValidate,
  Set<WidgetState> states = const <WidgetState>{},
  bool showLabel = true,
  CatchFieldSize size = CatchFieldSize.md,
  String? helperText,
  CatchFieldSupportRowTone helperTone = CatchFieldSupportRowTone.neutral,
}) {
  final supportedValues = CatchContractFieldPolicy.supportedChoiceValues(
    contract,
    values,
    contractValueBuilder,
    multi: false,
  );
  assert(
    supportedValues.toSet().length == supportedValues.length,
    'CatchField.select values must be unique.',
  );
  return CatchField<T>._select(
    copy: copy,
    key: key,
    title: title,
    contract: contract,
    contractExemption: contractExemption,
    values: List<Object?>.unmodifiable(supportedValues),
    itemLabelBuilder: (item) => itemLabelBuilder(item as T),
    value: value,
    onSelectChanged: onChanged == null ? null : (item) => onChanged(item as T?),
    selectValidator: onValidate == null
        ? null
        : (item) => onValidate(item as T?),
    placeholder: hintText,
    leading: leading,
    showLabel: showLabel,
    size: size,
    helperText: helperText,
    helperTone: helperTone,
    states: states,
  );
}

String _resolveFieldEmptyValueText(
  CatchFieldCopy copy, {
  required String title,
  String? emptyValueText,
}) {
  final label = title.trim();
  final explicit = emptyValueText?.trim();
  if (explicit != null &&
      explicit.isNotEmpty &&
      explicit.toLowerCase() != label.toLowerCase()) {
    return explicit;
  }
  return CatchField.defaultEmptyValueText(copy, label);
}
