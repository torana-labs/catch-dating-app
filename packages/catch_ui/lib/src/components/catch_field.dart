// size-exemption: the Field facade, one public API for every field variant.
// Public constructor names deliberately differ from private storage.
// ignore_for_file: prefer_initializing_formals

import 'dart:async';

import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:catch_ui/src/components/catch_field_activity_notification.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter/services.dart';

part 'catch_field_render.dart';
part 'catch_field_behavior.dart';
part 'catch_field_configs.dart';
part 'catch_field_adapters.dart';
part 'catch_field_control.dart';
part 'catch_field_edit.dart';
part 'catch_field_input.dart';
part 'catch_field_layout.dart';
part 'catch_field_properties.dart';
part 'catch_field_row_modes.dart';
part 'catch_field_secondary_action.dart';
part 'catch_field_state.dart';

/// Design-system `Field`: the unified field primitive for row, text-entry,
/// navigation, toggle, disclosure-control, add, validation, and helper states.
/// Stack fields in a CatchSection when the surrounding section owns box or
/// divider chrome.
///
/// Named constructors reject unsupported mode mixtures, such as a text
/// controller on a toggle. Sections consume its numeric divider geometry.
final class CatchField<T> extends StatefulWidget
    with _CatchFieldProperties
    implements CatchFieldDividerGeometry, CatchFieldInputConfiguration {
  /// Stable key for the contextual pressed surface used by field rows.
  ///
  /// The enclosing section or lane supplies the interaction shape. Divided
  /// fields may reach a page/lane plane or use an inset rounded perimeter;
  /// contained rows remain rectangular bands inside one section-owned clip.
  static const pressOverlayKey = ValueKey<String>('catch-field-press-overlay');

  const CatchField.read({
    CatchFieldCopy? copy,
    CatchFieldLayout? content,
    Key? key,
    CatchFieldSecondaryAction? secondaryAction,
    Set<WidgetState> states = const <WidgetState>{},
    String? title,
    String? body,
    Widget? actions,
    int titleMaxLines = 1,
    int bodyMaxLines = 2,
    CatchFieldEmphasis emphasis = CatchFieldEmphasis.body,
    CatchFieldTone tone = CatchFieldTone.normal,
    IconData? icon,
    Color? iconColor,
    Widget? leading,
    double? leadingExtent,
    String? valueText,
    int valueMaxLines = 1,
    String? placeholder,
    bool valid = false,
    CatchFieldStatus status = CatchFieldStatus.idle,
  }) : this._row(
         copy: copy,
         key: key,
         secondaryAction: secondaryAction,
         states: states,
         title: title,
         body: body,
         actions: actions,
         titleMaxLines: titleMaxLines,
         bodyMaxLines: bodyMaxLines,
         emphasis: emphasis,
         tone: tone,
         icon: icon,
         iconColor: iconColor,
         leading: leading,
         leadingExtent: leadingExtent,
         valueText: valueText,
         valueMaxLines: valueMaxLines,
         placeholder: placeholder,
         valid: valid,
         status: status,
         layout: content,
       );

  /// A natural-height title plus supporting-copy row.
  ///
  /// The React handoff calls its supporting copy `body`, while legacy Flutter
  /// CatchField rows use [body] as their primary value. Keeping this as an
  /// explicit constructor preserves those existing value rows while exposing
  /// the handoff's independent two-line title and three-line body contract.
  const CatchField.content({
    required CatchFieldCopy copy,
    Key? key,
    required String title,
    required String body,
    Widget? actions,
    VoidCallback? onTap,
    int titleMaxLines = 2,
    int bodyMaxLines = 3,
    CatchFieldEmphasis emphasis = CatchFieldEmphasis.body,
    CatchFieldTone tone = CatchFieldTone.normal,
    IconData? icon,
    Color? iconColor,
    Widget? leading,
    double? leadingExtent,
    String? valueText,
    int valueMaxLines = 1,
    bool? showChevron,
    CatchFieldLabelTextMode labelMode = CatchFieldLabelTextMode.visible,
    bool valid = false,
    CatchFieldStatus status = CatchFieldStatus.idle,
  }) : this._row(
         copy: copy,
         key: key,
         title: title,
         body: body,
         actions: actions,
         onTap: onTap,
         titleMaxLines: titleMaxLines,
         bodyMaxLines: bodyMaxLines,
         emphasis: emphasis,
         tone: tone,
         icon: icon,
         iconColor: iconColor,
         leading: leading,
         leadingExtent: leadingExtent,
         valueText: valueText,
         valueMaxLines: valueMaxLines,
         showChevron: showChevron,
         labelMode: labelMode,
         valid: valid,
         status: status,
         contentRow: true,
         navigation: onTap != null,
       );

  /// An ordinary destination row with a passive, typed content layout.
  const CatchField.navigate({
    Key? key,
    required CatchFieldLayout content,
    required VoidCallback onActivate,
    CatchFieldSecondaryAction? secondaryAction,
    Set<WidgetState> states = const {},
  }) : this._row(
         copy: null,
         key: key,
         secondaryAction: secondaryAction,
         states: states,
         onTap: onActivate,
         layout: content,
         navigation: true,
       );

  /// Inert row with the same layout and disclosure geometry as a live Field.
  ///
  /// Use through a loading Section, which applies the skeleton effect while
  /// retaining the real row gutter, divider, and interaction-plane geometry.
  @internal
  const CatchField.loading({
    Key? key,
    required CatchFieldLayout content,
    bool navigable = true,
  }) : this._row(
         copy: null,
         key: key,
         showChevron: navigable,
         navigation: navigable,
         layout: content,
       );

  const CatchField.nav({
    required CatchFieldCopy copy,
    Key? key,
    String? title,
    String? body,
    Widget? actions,
    VoidCallback? onTap,
    int titleMaxLines = 1,
    int bodyMaxLines = 2,
    CatchFieldEmphasis emphasis = CatchFieldEmphasis.body,
    CatchFieldTone tone = CatchFieldTone.normal,
    IconData? icon,
    Color? iconColor,
    Widget? leading,
    double? leadingExtent,
    String? valueText,
    int valueMaxLines = 1,
    bool? showChevron,
    String? placeholder,
    String? error,
    String? errorText,
    bool valid = false,
    CatchFieldStatus status = CatchFieldStatus.idle,
  }) : this._row(
         copy: copy,
         key: key,
         title: title,
         body: body,
         actions: actions,
         onTap: onTap,
         titleMaxLines: titleMaxLines,
         bodyMaxLines: bodyMaxLines,
         emphasis: emphasis,
         tone: tone,
         icon: icon,
         iconColor: iconColor,
         leading: leading,
         leadingExtent: leadingExtent,
         valueText: valueText,
         valueMaxLines: valueMaxLines,
         showChevron: showChevron,
         placeholder: placeholder,
         error: error,
         errorText: errorText,
         valid: valid,
         status: status,
         navigation: true,
       );

  /// A reorderable record with a full-width title and supporting metadata.
  ///
  /// The caller owns drag behavior through [leading]. The field owns the
  /// left-handle lane, naturally wrapping title and metadata, press semantics, and
  /// trailing disclosure affordance.
  const CatchField.sortable({
    required CatchFieldCopy copy,
    Key? key,
    required String title,
    required String metadata,
    required Widget leading,
    required VoidCallback? onTap,
    bool showChevron = true,
  }) : this._row(
         copy: copy,
         key: key,
         title: title,
         leading: leading,
         onTap: onTap,
         showChevron: showChevron,
         inlineMetadata: metadata,
         emphasis: CatchFieldEmphasis.title,
         leadingExtent: CatchSpacing.s11,
         bodyMaxLines: 1,
         navigation: true,
       );

  /// A tappable field-shaped row whose action does not navigate or edit the
  /// value. Unlike [CatchField.nav], this constructor never renders a chevron.
  const CatchField.action({
    required CatchFieldCopy copy,
    Key? key,
    String? title,
    String? body,
    Widget? actions,
    required VoidCallback? onTap,
    Set<WidgetState> states = const <WidgetState>{},
    int titleMaxLines = 1,
    int bodyMaxLines = 2,
    CatchFieldEmphasis emphasis = CatchFieldEmphasis.body,
    CatchFieldTone tone = CatchFieldTone.normal,
    IconData? icon,
    Color? iconColor,
    Widget? leading,
    double? leadingExtent,
    String? valueText,
    int valueMaxLines = 1,
    String? placeholder,
    String? error,
    String? errorText,
    bool valid = false,
    CatchFieldStatus status = CatchFieldStatus.idle,
  }) : this._row(
         copy: copy,
         key: key,
         title: title,
         body: body,
         actions: actions,
         onTap: onTap,
         states: states,
         titleMaxLines: titleMaxLines,
         bodyMaxLines: bodyMaxLines,
         emphasis: emphasis,
         tone: tone,
         icon: icon,
         iconColor: iconColor,
         leading: leading,
         leadingExtent: leadingExtent,
         valueText: valueText,
         valueMaxLines: valueMaxLines,
         placeholder: placeholder,
         error: error,
         errorText: errorText,
         valid: valid,
         status: status,
       );

  const CatchField.toggle({
    required CatchFieldCopy copy,
    super.key,
    this.title,
    this.body,
    this.contract,
    String? contractExemption,
    required bool value,
    required ValueChanged<bool>? onChanged,
    int titleMaxLines = 1,
    int bodyMaxLines = 2,
    this.emphasis = CatchFieldEmphasis.body,
    this.tone = CatchFieldTone.normal,
    this.icon,
    this.iconColor,
    String? helperText,
    String? badgeLabel,
    CatchBadgeTone? badgeTone,
    this.status = CatchFieldStatus.idle,
  }) : _copy = copy,
       actions = null,
       variant = CatchFieldVariant.row,
       leading = null,
       leadingExtent = null,
       states = const <WidgetState>{},
       child = null,
       meta = null,
       trailing = null,
       _config = (
         value: value,
         contractExemption: contractExemption,
         titleMaxLines: titleMaxLines,
         bodyMaxLines: bodyMaxLines,
         helperText: helperText,
         badgeLabel: badgeLabel,
         badgeTone: badgeTone,
         onToggleChanged: onChanged,
       );

  const CatchField.input({
    required CatchFieldCopy copy,
    super.key,
    required String this.title,
    int titleMaxLines = 1,
    this.contract,
    String? contractExemption,
    String? placeholder,
    String? emptyValueText,
    String? inputHint,
    TextEditingController? controller,
    String? initialValue,
    ValueChanged<String>? onChanged,
    ValueChanged<String>? onSubmitted,
    ValueChanged<String>? onBlur,
    ValueChanged<bool>? onFocusChanged,
    FocusNode? focusNode,
    VoidCallback? onEditingComplete,
    FormFieldValidator<String>? onValidate,
    TextInputType? keyboardType,
    TextInputAction? textInputAction,
    TextCapitalization textCapitalization = TextCapitalization.none,
    List<TextInputFormatter>? inputFormatters,
    Iterable<String>? autofillHints,
    CatchTextInputVariant inputVariant = CatchTextInputVariant.plain,
    int? maxLines = 1,
    int? minLines,
    int? maxLength,
    CatchTextInputMode inputMode = CatchTextInputMode.editable,
    bool autofocus = false,
    this.states = const <WidgetState>{},
    CatchFieldLabelTextMode labelMode = CatchFieldLabelTextMode.visible,
    String? helperText,
    CatchFieldSupportRowTone helperTone = CatchFieldSupportRowTone.neutral,
    CatchFieldSize size = CatchFieldSize.md,
    TextAlign textAlign = TextAlign.start,
    this.status = CatchFieldStatus.idle,
    List<FontFeature>? fontFeatures,
    this.leading,
    String? prefixText,
    this.trailing,
    String? suffixText,
    bool showClearButton = false,
    this.variant = CatchFieldVariant.row,
    this.icon,
    this.iconColor,
    String? leadingUnit,
    this.actions,
    String? error,
    String? errorText,
    VoidCallback? onTap,
  }) : _copy = copy,
       assert(
         inputHint == null || placeholder == null,
         'Use inputHint for editable fields; do not also pass placeholder.',
       ),
       assert(
         controller == null || initialValue == null,
         'CatchField.input cannot include both controller and initialValue.',
       ),
       body = null,
       emphasis = CatchFieldEmphasis.body,
       tone = CatchFieldTone.normal,
       leadingExtent = null,
       child = null,
       meta = null,
       _config = (
         titleMaxLines: titleMaxLines,
         controller: controller,
         contractExemption: contractExemption,
         initialValue: initialValue,
         onChanged: onChanged,
         onSubmitted: onSubmitted,
         onBlur: onBlur,
         onFocusChanged: onFocusChanged,
         focusNode: focusNode,
         onEditingComplete: onEditingComplete,
         onValidate: onValidate,
         keyboardType: keyboardType,
         textInputAction: textInputAction,
         textCapitalization: textCapitalization,
         inputFormatters: inputFormatters,
         autofillHints: autofillHints,
         inputVariant: inputVariant,
         maxLines: maxLines,
         minLines: minLines,
         maxLength: maxLength,
         inputMode: inputMode,
         autofocus: autofocus,
         size: size,
         textAlign: textAlign,
         fontFeatures: fontFeatures,
         prefixText: prefixText,
         suffixText: suffixText,
         showClearButton: showClearButton,
         placeholder: placeholder,
         emptyValueText: emptyValueText,
         inputHint: inputHint,
         leadingUnit: leadingUnit,
         error: error,
         errorText: errorText,
         onTap: onTap,
         labelMode: labelMode,
         helperText: helperText,
         helperTone: helperTone,
         explicitSave: false,
         open: null,
         onOpenChanged: null,
         onCancel: null,
         onSubmit: null,
       );

  /// A row-owned disclosure control. The row remains stable while [child]
  /// reveals below it. [disclosureMode] selects caller-owned expansion or
  /// the initial local state. Save and error state remain caller-owned.
  const CatchField.control({
    required CatchFieldCopy copy,
    super.key,
    required String this.title,
    this.body,
    this.contract,
    String? contractExemption,
    required Widget this.child,
    CatchFieldMode disclosureMode = CatchFieldMode.localCollapsed,
    ValueChanged<bool>? onOpenChanged,
    VoidCallback? onCancel,
    VoidCallback? onSubmit,
    this.status = CatchFieldStatus.idle,
    this.states = const <WidgetState>{},
    bool addable = false,
    CatchFieldLabelTextMode labelMode = CatchFieldLabelTextMode.visible,
    String? helperText,
    int titleMaxLines = 1,
    int bodyMaxLines = 2,
    this.emphasis = CatchFieldEmphasis.body,
    this.tone = CatchFieldTone.normal,
    this.icon,
    this.iconColor,
    String? placeholder,
    String? emptyValueText,
    String? error,
    String? errorText,
  }) : _copy = copy,
       assert(
         labelMode == CatchFieldLabelTextMode.visible ||
             labelMode == CatchFieldLabelTextMode.optional,
         'Disclosure controls require a visible label.',
       ),
       actions = null,
       variant = CatchFieldVariant.row,
       leading = null,
       leadingExtent = null,
       meta = null,
       trailing = null,
       _config = (
         contractExemption: contractExemption,
         titleMaxLines: titleMaxLines,
         bodyMaxLines: bodyMaxLines,
         disclosureMode: disclosureMode,
         onOpenChanged: onOpenChanged,
         onCancel: onCancel,
         onSubmit: onSubmit,
         addable: addable,
         labelMode: labelMode,
         helperText: helperText,
         placeholder: placeholder,
         emptyValueText: emptyValueText,
         error: error,
         errorText: errorText,
       );

  /// Canonical disclosure field for a wrapping set of single- or multi-select
  /// options. Selection state stays caller-owned; this method owns the exact
  /// chip geometry, wrapping, press motion, and field commit bar.
  factory CatchField.choices({
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
  }) => _catchFieldChoices<T>(
    copy: copy,
    key: key,
    title: title,
    body: body,
    contract: contract,
    contractValueBuilder: contractValueBuilder,
    values: values,
    itemLabelBuilder: itemLabelBuilder,
    selected: selected,
    onSelectionChanged: onSelectionChanged,
    mode: mode,
    allowEmptySelection: allowEmptySelection,
    disclosureMode: disclosureMode,
    onOpenChanged: onOpenChanged,
    onCancel: onCancel,
    onSubmit: onSubmit,
    status: status,
    states: states,
    addable: addable,
    labelMode: labelMode,
    helperText: helperText,
    itemAccentBuilder: itemAccentBuilder,
    icon: icon,
    iconColor: iconColor,
    tone: tone,
    emptyValueText: emptyValueText,
    error: error,
    errorText: errorText,
  );

  /// Canonical single-select disclosure for choices that need both a title
  /// and explanatory copy. Terse labels stay in [choices]; policy, admission,
  /// and setup choices use the existing [CatchChoiceTile] primitive through
  /// this field-owned facade.
  factory CatchField.optionCards({
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
  }) => _catchFieldOptionCards<T>(
    copy: copy,
    key: key,
    title: title,
    body: body,
    contract: contract,
    contractValueBuilder: contractValueBuilder,
    values: values,
    itemTitleBuilder: itemTitleBuilder,
    itemDescriptionBuilder: itemDescriptionBuilder,
    selected: selected,
    onChanged: onChanged,
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
  );

  /// Numeric disclosure with 44px repeat targets and optional draft clearing.
  factory CatchField.stepper({
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
  }) => _catchFieldStepper<T>(
    copy: copy,
    key: key,
    title: title,
    body: body,
    contract: contract,
    value: value,
    onChanged: onChanged,
    onClear: onClear,
    min: min,
    max: max,
    step: step,
    unit: unit,
    valueLabelBuilder: valueLabelBuilder,
    decreaseSemanticLabel: decreaseSemanticLabel,
    increaseSemanticLabel: increaseSemanticLabel,
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
  );

  /// An explicit-save row with a stable label/value lane and animated content.
  /// This primitive owns edit affordances, focus, typography, and actions.
  /// Content and commit actions animate below the row.
  const CatchField.inputActions({
    required CatchFieldCopy copy,
    super.key,
    required String this.title,
    this.contract,
    String? contractExemption,
    required TextEditingController controller,
    required bool open,
    required ValueChanged<bool> onOpenChanged,
    required VoidCallback onCancel,
    required VoidCallback onSubmit,
    String? placeholder,
    String? emptyValueText,
    String? inputHint,
    this.meta,
    this.actions,
    this.child,
    this.status = CatchFieldStatus.idle,
    TextInputType? keyboardType,
    TextInputAction? textInputAction,
    TextCapitalization textCapitalization = TextCapitalization.sentences,
    List<TextInputFormatter>? inputFormatters,
    Iterable<String>? autofillHints,
    int? maxLines = 1,
    int? minLines,
    int? maxLength,
    bool showClearButton = true,
    this.states = const <WidgetState>{},
    this.icon,
    this.iconColor,
    this.tone = CatchFieldTone.normal,
    String? error,
    ValueChanged<String>? onChanged,
    ValueChanged<String>? onSubmitted,
    ValueChanged<String>? onBlur,
    ValueChanged<bool>? onFocusChanged,
    FocusNode? focusNode,
  }) : _copy = copy,
       body = null,
       emphasis = CatchFieldEmphasis.body,
       variant = CatchFieldVariant.row,
       leading = null,
       leadingExtent = null,
       trailing = null,
       _config = (
         titleMaxLines: 1,
         controller: controller,
         contractExemption: contractExemption,
         onChanged: onChanged,
         onSubmitted: onSubmitted,
         onBlur: onBlur,
         onFocusChanged: onFocusChanged,
         focusNode: focusNode,
         keyboardType: keyboardType,
         textInputAction: textInputAction,
         textCapitalization: textCapitalization,
         inputFormatters: inputFormatters,
         autofillHints: autofillHints,
         maxLines: maxLines,
         minLines: minLines,
         maxLength: maxLength,
         placeholder: placeholder,
         emptyValueText: emptyValueText,
         inputHint: inputHint,
         error: error,
         open: open,
         onOpenChanged: onOpenChanged,
         onCancel: onCancel,
         onSubmit: onSubmit,
         initialValue: null,
         onEditingComplete: null,
         onValidate: null,
         inputVariant: CatchTextInputVariant.plain,
         inputMode: CatchTextInputMode.editable,
         autofocus: false,
         labelMode: CatchFieldLabelTextMode.visible,
         helperText: null,
         helperTone: CatchFieldSupportRowTone.neutral,
         size: CatchFieldSize.md,
         textAlign: TextAlign.start,
         fontFeatures: null,
         prefixText: null,
         suffixText: null,
         showClearButton: showClearButton,
         leadingUnit: null,
         errorText: null,
         onTap: null,
         explicitSave: true,
       );
  const CatchField.add({
    required CatchFieldCopy copy,
    Key? key,
    required String title,
    VoidCallback? onTap,
    IconData? icon,
    CatchFieldTone tone = CatchFieldTone.primary,
  }) : this._row(
         copy: copy,
         key: key,
         title: title,
         onTap: onTap,
         icon: icon,
         tone: tone,
         add: true,
       );

  // One const initialization path keeps row modes on the same slot defaults.
  const CatchField._row({
    required CatchFieldCopy? copy,
    super.key,
    this.title,
    this.body,
    this.actions,
    this.states = const <WidgetState>{},
    this.emphasis = CatchFieldEmphasis.body,
    this.tone = CatchFieldTone.normal,
    this.icon,
    this.iconColor,
    this.leading,
    this.leadingExtent,
    this.status = CatchFieldStatus.idle,
    CatchFieldLayout? layout,
    CatchFieldSecondaryAction? secondaryAction,
    int titleMaxLines = 1,
    int bodyMaxLines = 2,
    bool contentRow = false,
    String? inlineMetadata,
    String? valueText,
    int valueMaxLines = 1,
    bool? showChevron,
    String? placeholder,
    CatchFieldLabelTextMode labelMode = CatchFieldLabelTextMode.visible,
    String? error,
    String? errorText,
    bool valid = false,
    VoidCallback? onTap,
    bool add = false,
    bool navigation = false,
  }) : assert(copy != null || layout != null),
       assert(status == CatchFieldStatus.idle || copy != null),
       assert(
         layout == null ||
             (title == null &&
                 body == null &&
                 actions == null &&
                 icon == null &&
                 iconColor == null &&
                 leading == null &&
                 leadingExtent == null &&
                 valueText == null &&
                 placeholder == null),
         'Typed Field content owns all passive slots; do not mix legacy slots.',
       ),
       assert(
         !contentRow ||
             labelMode == CatchFieldLabelTextMode.visible ||
             labelMode == CatchFieldLabelTextMode.optional,
         'Content rows require a visible label.',
       ),
       assert(
         leading == null || icon == null,
         'Use either CatchField.leading or CatchField.icon, not both.',
       ),
       assert(
         leading == null || leadingExtent != null,
         'CatchField.leading requires an explicit leadingExtent.',
       ),
       assert(
         leadingExtent == null || (leading != null && leadingExtent > 0),
         'CatchField.leadingExtent requires non-null leading content.',
       ),
       _copy = copy,
       contract = null,
       variant = CatchFieldVariant.row,
       child = null,
       meta = null,
       trailing = null,
       _config = (
         layout: layout,
         secondaryAction: secondaryAction,
         titleMaxLines: titleMaxLines,
         bodyMaxLines: bodyMaxLines,
         contentRow: contentRow,
         inlineMetadata: inlineMetadata,
         valueText: valueText,
         valueMaxLines: valueMaxLines,
         showChevron: showChevron,
         placeholder: placeholder,
         labelMode: labelMode,
         error: error,
         errorText: errorText,
         valid: valid,
         onTap: onTap,
         add: add,
         navigation: navigation,
       );

  const CatchField._select({
    required CatchFieldCopy copy,
    super.key,
    required String this.title,
    this.contract,
    String? contractExemption,
    required List<Object?> values,
    required String Function(Object? item) itemLabelBuilder,
    required Object? value,
    required ValueChanged<Object?>? onSelectChanged,
    required FormFieldValidator<Object?>? selectValidator,
    required String? placeholder,
    required this.leading,
    required bool showLabel,
    required CatchFieldSize size,
    required String? helperText,
    required CatchFieldSupportRowTone helperTone,
    required this.states,
  }) : _copy = copy,
       body = null,
       actions = null,
       emphasis = CatchFieldEmphasis.body,
       tone = CatchFieldTone.normal,
       variant = CatchFieldVariant.row,
       icon = null,
       iconColor = null,
       leadingExtent = null,
       status = CatchFieldStatus.idle,
       child = null,
       meta = null,
       trailing = null,
       _config = (
         values: values,
         contractExemption: contractExemption,
         itemLabelBuilder: itemLabelBuilder,
         value: value,
         onSelectChanged: onSelectChanged,
         selectValidator: selectValidator,
         placeholder: placeholder,
         showLabel: showLabel,
         size: size,
         helperText: helperText,
         helperTone: helperTone,
       );

  factory CatchField.select({
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
  }) => _catchFieldSelect<T>(
    copy: copy,
    key: key,
    title: title,
    contract: contract,
    contractExemption: contractExemption,
    contractValueBuilder: contractValueBuilder,
    values: values,
    itemLabelBuilder: itemLabelBuilder,
    value: value,
    hintText: hintText,
    leading: leading,
    onChanged: onChanged,
    onValidate: onValidate,
    states: states,
    showLabel: showLabel,
    size: size,
    helperText: helperText,
    helperTone: helperTone,
  );

  static const double compactControlHeight =
      CatchControlMetrics.compactMinHeight;
  static const double mdControlHeight = CatchControlMetrics.mdMinHeight;

  /// Canonical at-rest copy for an empty editable row.
  static String defaultEmptyValueText(CatchFieldCopy copy, String title) =>
      copy.emptyValueText(title);

  /// Resolves an optional domain override without repeating the field label.
  static String resolveEmptyValueText(
    CatchFieldCopy copy, {
    required String title,
    String? emptyValueText,
  }) => _resolveFieldEmptyValueText(
    copy,
    title: title,
    emptyValueText: emptyValueText,
  );

  @override
  final CatchFieldCopy? _copy;

  /// Primary row text or input label.
  @override
  final String? title;

  /// Generated schema constraint bound to this editable field.
  @override
  final CatchContractFieldConstraints? contract;

  /// Supporting row text.
  final String? body;

  /// End-aligned row action or input suffix.
  @override
  final Widget? actions;

  // Explicit-save actions belong to the revealed area, never the native suffix.

  @override
  final Record _config;
  final CatchFieldEmphasis emphasis;
  @override
  final CatchFieldTone tone;
  @override
  final CatchFieldVariant variant;
  @override
  final IconData? icon;
  final Color? iconColor;

  /// Caller-owned leading content used instead of [icon].
  @override
  final Widget? leading;

  /// Horizontal extent of caller-owned [leading] content. Sections use this
  /// to align dividers to the actual text lane instead of assuming icon size.
  @override
  final double? leadingExtent;

  /// Caller-owned disabled and focus presentation; native focus stays local.
  @override
  final Set<WidgetState> states;
  final CatchFieldStatus status;

  final Widget? child;
  final Widget? meta;
  @override
  final Widget? trailing;

  // All modes retain one identity when a keyed field changes generic input type.
  @override
  Type get runtimeType => CatchField;

  @override
  State<CatchField> createState() => _CatchFieldState();
}
