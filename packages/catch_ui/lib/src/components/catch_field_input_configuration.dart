part of 'catch_field.dart';

/// Read-only data consumed by the field input renderer.
///
/// Contains no widget lifecycle or build contract. CatchField implements it
/// directly, retaining controller ownership without copying a configuration
/// object on each rebuild; independent consumers can supply plain data.
abstract interface class CatchFieldInputConfiguration {
  Widget? get actions;
  Iterable<String>? get autofillHints;
  bool get autofocus;
  String? get badgeLabel;
  CatchBadgeTone? get badgeTone;
  CatchContractFieldConstraints? get contract;
  CatchFieldCopy get copy;
  String? get error;
  String? get errorText;
  String? get helperText;
  CatchFieldSupportRowTone get helperTone;
  List<TextInputFormatter>? get inputFormatters;
  CatchTextInputVariant get inputVariant;
  CatchFieldLabelTextMode get labelMode;
  TextInputType? get keyboardType;
  Widget? get leading;
  String? get leadingUnit;
  int? get maxLength;

  /// When the length counter shows; [CatchFieldSupportRowMode.always] keeps
  /// it painted at rest.
  CatchFieldSupportRowMode get counter;
  int? get maxLines;
  int? get minLines;
  List<FontFeature>? get fontFeatures;
  ValueChanged<String>? get onChanged;
  VoidCallback? get onTap;
  FormFieldValidator<String>? get onValidate;
  String? get prefixText;
  CatchTextInputMode get inputMode;
  VoidCallback? get onEditingComplete;
  bool get showClearButton;
  CatchFieldSize get size;
  Set<WidgetState> get states;
  String? get suffixText;
  TextAlign get textAlign;
  TextCapitalization get textCapitalization;
  TextInputAction? get textInputAction;
  String? get title;
  int get titleMaxLines;
  CatchFieldTone get tone;
  Widget? get trailing;
  CatchFieldVariant get variant;
}
