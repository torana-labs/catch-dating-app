part of 'catch_field.dart';

mixin _CatchFieldProperties implements CatchFieldDividerGeometry {
  CatchFieldCopy? get _copy;

  /// Resolved copy supplied by the caller for the current locale.
  CatchFieldCopy get copy =>
      _copy ?? (throw StateError('This passive field has no editing copy.'));

  Widget? get leading;
  Widget? get actions;
  IconData? get icon;
  double? get leadingExtent;
  bool get _hasRowActions => !_explicitSaveInput && actions != null;
  bool get _hasInputLeading =>
      leading != null && (_editConfig != null || _selectConfig != null);
  bool get _hasRowLeading => leading != null && !_hasInputLeading;
  @override
  double get fieldDividerLeadingInset =>
      _rowLayout?._leadingInset ??
      (add
          ? CatchFieldRow.textLaneInset
          : _hasRowLeading
          ? (leadingExtent ?? CatchFieldTokens.leadingIconExtent) +
                CatchFieldTokens.leadingGap
          : icon != null || _hasInputLeading
          ? CatchFieldTokens.textLaneInset
          : 0);

  Record get _config;
  Set<WidgetState> get states;
  bool get enabled => !states.contains(WidgetState.disabled);
  CatchContractFieldConstraints? get contract;
  _RowConfig? get _rowConfig => switch (_config) {
    final _RowConfig config => config,
    _ => null,
  };
  _ToggleConfig? get _toggleConfig => switch (_config) {
    final _ToggleConfig config => config,
    _ => null,
  };
  _EditConfig? get _editConfig => switch (_config) {
    final _EditConfig config => config,
    _ => null,
  };
  _SelectConfig? get _selectConfig => switch (_config) {
    final _SelectConfig config => config,
    _ => null,
  };
  _ControlConfig? get _controlConfig => switch (_config) {
    final _ControlConfig config => config,
    _ => null,
  };

  CatchFieldLayout? get _rowLayout => _rowConfig?.layout;

  /// End-aligned text for compact read and navigation rows.
  String? get valueText => _rowConfig?.valueText;
  int get valueMaxLines => _rowConfig?.valueMaxLines ?? 1;
  int get titleMaxLines => switch (_config) {
    final _EditConfig config => config.titleMaxLines,
    final _RowConfig config => config.titleMaxLines,
    final _ToggleConfig config => config.titleMaxLines,
    final _ControlConfig config => config.titleMaxLines,
    _ => 1,
  };
  int get bodyMaxLines => switch (_config) {
    final _RowConfig config => config.bodyMaxLines,
    final _ToggleConfig config => config.bodyMaxLines,
    final _ControlConfig config => config.bodyMaxLines,
    _ => 2,
  };
  bool get _contentRow => _rowConfig?.contentRow ?? false;
  String? get inlineMetadata => _rowConfig?.inlineMetadata;
  String? get leadingUnit => _editConfig?.leadingUnit;
  bool? get showChevron => _rowConfig?.showChevron;

  String? get placeholder => switch (_config) {
    final _RowConfig config => config.placeholder,
    final _EditConfig config => config.placeholder,
    final _SelectConfig config => config.placeholder,
    final _ControlConfig config => config.placeholder,
    _ => null,
  };
  String? get emptyValueText => switch (_config) {
    final _EditConfig config => config.emptyValueText,
    final _ControlConfig config => config.emptyValueText,
    _ => null,
  };
  String? get inputHint => _editConfig?.inputHint;
  bool get toggled => _toggleConfig?.value ?? false;
  ValueChanged<bool>? get onToggle => _toggleConfig?.onToggleChanged;
  String? get toggleContractExemption => _toggleConfig?.contractExemption;

  /// Control revealed by a navigation-mode disclosure field.
  bool get initiallyOpen =>
      _controlConfig?.disclosureMode == CatchFieldMode.localExpanded;

  /// Caller-owned disclosure state; null keeps expansion local.
  bool? get open => switch (_controlConfig?.disclosureMode) {
    CatchFieldMode.controlledExpanded => true,
    CatchFieldMode.controlledCollapsed => false,
    _ => _editConfig?.open,
  };
  ValueChanged<bool>? get onOpenChanged =>
      _controlConfig?.onOpenChanged ?? _editConfig?.onOpenChanged;
  bool get _explicitSaveInput => _editConfig?.explicitSave ?? false;

  bool get usesExplicitSave => _explicitSaveInput;
  bool get add => _rowConfig?.add ?? false;
  bool get addable => _controlConfig?.addable ?? false;
  String? get error => switch (_config) {
    final _RowConfig config => config.error,
    final _EditConfig config => config.error,
    final _ControlConfig config => config.error,
    _ => null,
  };
  String? get errorText => switch (_config) {
    final _RowConfig config => config.errorText,
    final _EditConfig config => config.errorText,
    final _ControlConfig config => config.errorText,
    _ => null,
  };
  bool get valid => _rowConfig?.valid ?? false;
  VoidCallback? get onTap => _rowConfig?.onTap ?? _editConfig?.onTap;

  _EditConfig? get _inputConfig => _editConfig;
  TextEditingController? get controller => _inputConfig?.controller;
  String? get initialValue => _inputConfig?.initialValue;
  ValueChanged<String>? get onChanged => _inputConfig?.onChanged;
  ValueChanged<String>? get onSubmitted => _inputConfig?.onSubmitted;
  ValueChanged<String>? get onBlur => _inputConfig?.onBlur;
  ValueChanged<bool>? get onFocusChanged => _inputConfig?.onFocusChanged;
  FocusNode? get focusNode => _inputConfig?.focusNode;
  VoidCallback? get onEditingComplete => _inputConfig?.onEditingComplete;
  FormFieldValidator<String>? get onValidate => _inputConfig?.onValidate;
  TextInputType? get keyboardType => _inputConfig?.keyboardType;
  TextInputAction? get textInputAction => _inputConfig?.textInputAction;
  TextCapitalization get textCapitalization =>
      _inputConfig?.textCapitalization ?? TextCapitalization.none;
  List<TextInputFormatter>? get inputFormatters => _inputConfig != null
      ? _inputConfig!.inputFormatters
      : CatchContractFieldPolicy.effectiveInputFormatters(contract, null);
  Iterable<String>? get autofillHints => _inputConfig?.autofillHints;
  CatchTextInputVariant get inputVariant =>
      _inputConfig?.inputVariant ?? CatchTextInputVariant.plain;
  bool get obscureText => inputVariant == CatchTextInputVariant.obscured;
  int? get maxLines => _inputConfig == null ? 1 : _inputConfig!.maxLines;
  int? get minLines => _inputConfig?.minLines;
  int? get maxLength => CatchContractFieldPolicy.effectiveMaxLength(
    contract,
    _inputConfig?.maxLength,
  );
  CatchTextInputMode get inputMode =>
      _inputConfig?.inputMode ?? CatchTextInputMode.editable;
  bool get readOnly => inputMode.readOnlyText;
  bool get autofocus => _inputConfig?.autofocus ?? false;
  CatchFieldLabelTextMode get _configuredLabelMode => switch (_config) {
    final _RowConfig config => config.labelMode,
    final _EditConfig config => config.labelMode,
    final _ControlConfig config => config.labelMode,
    final _SelectConfig config =>
      config.showLabel
          ? CatchFieldLabelTextMode.visible
          : CatchFieldLabelTextMode.hidden,
    _ => CatchFieldLabelTextMode.visible,
  };
  CatchFieldLabelTextMode get labelMode {
    final mode = _configuredLabelMode;
    // Generated value constraints already distinguish required non-empty values
    // from nullable/empty values; patch-property omission is not consulted here.
    if (_inputConfig == null || contract == null) return mode;
    return contract!.required
        ? (mode.showsLabel
              ? CatchFieldLabelTextMode.visible
              : CatchFieldLabelTextMode.hidden)
        : (mode.showsLabel
              ? CatchFieldLabelTextMode.optional
              : CatchFieldLabelTextMode.hiddenOptional);
  }

  bool get isOptional => labelMode.isOptional;
  bool get showLabel => labelMode.showsLabel;
  String? get helperText => switch (_config) {
    final _ToggleConfig config => config.helperText,
    final _EditConfig config => config.helperText,
    final _SelectConfig config => config.helperText,
    final _ControlConfig config => config.helperText,
    _ => null,
  };
  CatchFieldSupportRowTone get helperTone => switch (_config) {
    final _EditConfig config => config.helperTone,
    final _SelectConfig config => config.helperTone,
    _ => CatchFieldSupportRowTone.neutral,
  };
  String? get badgeLabel => _toggleConfig?.badgeLabel;
  CatchBadgeTone? get badgeTone => _toggleConfig?.badgeTone;
  CatchFieldSize get size => switch (_config) {
    final _EditConfig config => config.size,
    final _SelectConfig config => config.size,
    _ => CatchFieldSize.md,
  };
  TextAlign get textAlign => _inputConfig?.textAlign ?? TextAlign.start;
  bool get focused => states.contains(WidgetState.focused);
  List<FontFeature>? get fontFeatures => _inputConfig?.fontFeatures;
  String? get prefixText => _inputConfig?.prefixText;
  String? get suffixText => _inputConfig?.suffixText;
  bool get showClearButton => _inputConfig?.showClearButton ?? false;
  CatchFieldSupportRowMode get counter =>
      _inputConfig?.counter ?? CatchFieldSupportRowMode.whileFocused;
  bool get floatingLabel => !_explicitSaveInput;

  List<Object?>? get _selectValues => _selectConfig?.values;
  String Function(Object? item)? get _selectItemLabel =>
      _selectConfig?.itemLabelBuilder;
  Object? get _selectValue => _selectConfig?.value;
  ValueChanged<Object?>? get _onSelectChanged => _selectConfig?.onSelectChanged;
  FormFieldValidator<Object?>? get _selectValidator =>
      _selectConfig?.selectValidator;

  VoidCallback? get _onCancel =>
      _controlConfig?.onCancel ?? _editConfig?.onCancel;
  VoidCallback? get _onSubmit =>
      _controlConfig?.onSubmit ?? _editConfig?.onSubmit;
  bool get _closeLocallyOnSubmit => true;
}
