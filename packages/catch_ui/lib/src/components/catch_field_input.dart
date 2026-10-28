part of 'catch_field.dart';

/// Placement of a field's native input inside its existing row or underline.
enum CatchFieldInputMode { standalone, row, explicitSave }

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

/// Native input, validation, and text-entry chrome owned by a CatchField.
///
/// The owner supplies immutable configuration and keeps controller, focus,
/// dismissal and save orchestration. Product callers use CatchField's named
/// constructors; this member moves with that facade into the shared package.
class CatchFieldInput extends StatelessWidget {
  const CatchFieldInput({
    super.key,
    required this.configuration,
    required this.formFieldKey,
    required this.controller,
    required this.focusNode,
    required this.tapRegionGroupId,
    required this.onValidationErrorChanged,
    required this.onSubmitted,
    required this.mode,
    required this.states,
    required this.emptyValueText,
    required this.inputHintText,
    required this.addTextSpan,
    required this.headerTrailingReserve,
    this.expanded = false,
    this.inlineAddAtRest = false,
  });

  final CatchFieldInputConfiguration configuration;
  final GlobalKey<FormFieldState<String>> formFieldKey;
  final TextEditingController controller;
  final FocusNode focusNode;
  final Object tapRegionGroupId;
  final ValueChanged<bool> onValidationErrorChanged;
  final ValueChanged<String> onSubmitted;
  final CatchFieldInputMode mode;
  final Set<WidgetState> states;
  final String? emptyValueText;
  final String? inputHintText;
  final TextSpan addTextSpan;
  final double headerTrailingReserve;
  final bool expanded;
  final bool inlineAddAtRest;

  bool get _explicitSave => mode == CatchFieldInputMode.explicitSave;
  bool get _hasRowActions => !_explicitSave && configuration.actions != null;
  bool get _obscured =>
      configuration.inputVariant == CatchTextInputVariant.obscured;
  bool get _enabled => !configuration.states.contains(WidgetState.disabled);

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final rowBody = mode == CatchFieldInputMode.row;
    final explicitSave = mode == CatchFieldInputMode.explicitSave;
    final valueEmphasis = mode != CatchFieldInputMode.standalone;
    final effectiveVariant = valueEmphasis
        ? CatchFieldVariant.bare
        : configuration.variant;
    final effectiveShowLabel = valueEmphasis
        ? false
        : configuration.labelMode.showsLabel;
    final includeSupport = !explicitSave;
    final inputHintOverride = explicitSave && !inlineAddAtRest
        ? expanded
              ? inputHintText
              : emptyValueText
        : null;
    final inputHintWidgetOverride = explicitSave && inlineAddAtRest
        ? Text.rich(
            addTextSpan,
            style: CatchTextStyles.fieldRowValue(
              context,
              color: t.ink3,
              fontWeight: FontWeight.w500,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          )
        : null;
    final addSemanticLabel = emptyValueText == null
        ? null
        : configuration.labelMode.isOptional
        ? configuration.copy.label.optionalSemantics(emptyValueText!)
        : emptyValueText;
    final semanticLabelOverride = explicitSave && inlineAddAtRest
        ? addSemanticLabel ?? configuration.title
        : configuration.title;

    return FormField<String>(
      key: formFieldKey,
      initialValue: controller.text,
      validator: (value) => CatchContractFieldPolicy.validateText(
        copy: configuration.copy.validation,
        label: configuration.title ?? '',
        value: value ?? '',
        contract: configuration.contract,
        explicitValidator: configuration.onValidate,
      ),
      enabled: _enabled,
      builder: (state) {
        final t = CatchTokens.of(context);
        final rawError =
            configuration.errorText ?? configuration.error ?? state.errorText;
        final error = rawError?.trim().isNotEmpty == true
            ? rawError!.trim()
            : null;
        final hasError = error != null;
        onValidationErrorChanged(state.hasError);
        final supportText = includeSupport
            ? error ?? configuration.helperText
            : null;

        final inlineAddAtRest =
            rowBody && _inlineTextAddAtRestWith(hasError: hasError);
        final addText = rowBody ? emptyValueText : null;
        final effectiveInputHint = !rowBody
            ? inputHintOverride
            : inlineAddAtRest
            ? null
            : _textEntryExpandedWith(hasError: hasError)
            ? inputHintOverride
            : emptyValueText;
        final effectiveHintWidget = !rowBody
            ? inputHintWidgetOverride
            : inlineAddAtRest
            ? Text.rich(
                addTextSpan,
                style: CatchTextStyles.fieldRowValue(
                  context,
                  color: t.ink3,
                  fontWeight: FontWeight.w500,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              )
            : null;
        final semanticLabel = !rowBody
            ? semanticLabelOverride
            : inlineAddAtRest && addText != null
            ? addSemanticLabel!
            : _title;
        final effectiveSemanticLabel =
            configuration.labelMode == CatchFieldLabelTextMode.hiddenOptional &&
                semanticLabel != null
            ? configuration.copy.label.optionalSemantics(semanticLabel)
            : semanticLabel;

        final effectiveFocused =
            focusNode.hasFocus ||
            configuration.states.contains(WidgetState.focused);
        final inlineAddHint = effectiveHintWidget != null;
        final multiline =
            !inlineAddHint &&
            !_obscured &&
            (configuration.maxLines != 1 || (configuration.minLines ?? 1) > 1);
        final multilineValueStyle = CatchTextStyles.fieldRowValue(
          context,
          color: _enabled ? t.ink : t.ink3,
        ).copyWith(height: CatchFieldTokens.multilineValueLineHeight);
        final inputStyle = valueEmphasis
            ? multiline
                  ? multilineValueStyle
                  : CatchTextStyles.fieldRowValue(
                      context,
                      color: _enabled ? t.ink : t.ink3,
                    )
            : _textStyle(context, color: _enabled ? t.ink : t.ink3);
        // Hints inherit every typography attribute from the value. Only their
        // semantic color differs, including floating and phone configurations.
        final hintStyle = inputStyle.copyWith(color: t.ink2);
        final resolvedHintText = effectiveHintWidget == null
            ? effectiveInputHint ?? inputHintText
            : null;
        final visualOnlyHint = !effectiveShowLabel && resolvedHintText != null;
        final textField = CatchTextInput(
          inputKey: const ValueKey<String>('catch-field-text-entry'),
          groupId: tapRegionGroupId,
          controller: controller,
          focusNode: focusNode,
          status: _enabled
              ? CatchTextInputStatus.enabled
              : CatchTextInputStatus.disabled,
          mode: explicitSave
              ? expanded && _enabled
                    ? CatchTextInputMode.editable
                    : CatchTextInputMode.inactiveWithoutSelection
              : configuration.inputMode,
          autofocus: configuration.autofocus,
          keyboardType: configuration.keyboardType,
          textInputAction:
              configuration.textInputAction ?? TextInputAction.done,
          textCapitalization: configuration.textCapitalization,
          inputFormatters: CatchContractFieldPolicy.effectiveInputFormatters(
            configuration.contract,
            configuration.inputFormatters,
            explicitMaxLength: configuration.maxLength,
          ),
          autofillHints: configuration.autofillHints,
          variant: configuration.inputVariant,
          maxLines: _obscured || inlineAddHint ? 1 : configuration.maxLines,
          minLines: inlineAddHint ? null : configuration.minLines,
          maxLength: configuration.maxLength,
          textAlign: configuration.textAlign,
          textAlignVertical: inlineAddHint
              ? TextAlignVertical.center
              : _textAlignVertical,
          onTap: configuration.onTap,
          onTapOutside: _explicitSave ? null : (_) => focusNode.unfocus(),
          onChanged: (value) {
            state.didChange(value);
            configuration.onChanged?.call(value);
          },
          onEditingComplete: configuration.onEditingComplete,
          onSubmitted: onSubmitted,
          style: inputStyle,
          cursorColor: t.primary,
          decoration: InputDecoration(
            counterText: '',
            isDense: true,
            isCollapsed: effectiveVariant == CatchFieldVariant.bare,
            filled: false,
            border: InputBorder.none,
            enabledBorder: InputBorder.none,
            focusedBorder: InputBorder.none,
            disabledBorder: InputBorder.none,
            errorBorder: InputBorder.none,
            focusedErrorBorder: InputBorder.none,
            contentPadding: _contentPadding(effectiveVariant),
            labelText: _useFloatingLabel(effectiveVariant, effectiveShowLabel)
                ? _title
                : null,
            labelStyle: _useFloatingLabel(effectiveVariant, effectiveShowLabel)
                ? CatchTextStyles.bodyL(
                    context,
                    color: _fieldLabelColor(t, hasError: hasError),
                  )
                : null,
            floatingLabelStyle:
                _useFloatingLabel(effectiveVariant, effectiveShowLabel)
                ? CatchFieldContentRow.captionStyle(
                    context,
                    color: _fieldLabelColor(t, hasError: hasError),
                  )
                : null,
            floatingLabelBehavior:
                _useFloatingLabel(effectiveVariant, effectiveShowLabel)
                ? FloatingLabelBehavior.auto
                : FloatingLabelBehavior.never,
            hint: effectiveHintWidget != null
                ? ExcludeSemantics(child: effectiveHintWidget)
                : visualOnlyHint
                ? ExcludeSemantics(child: Text(resolvedHintText))
                : null,
            hintText: effectiveHintWidget != null || visualOnlyHint
                ? null
                : resolvedHintText,
            hintStyle: hintStyle,
            prefixText: configuration.prefixText,
            prefixStyle: _textStyle(context, color: t.ink2),
            suffixText: configuration.suffixText,
            suffixStyle: CatchTextStyles.bodyLead(context, color: t.ink2),
            prefixIconConstraints: _iconConstraints,
            prefixIcon: _usesRowPrefixIcon || configuration.leading == null
                ? null
                : IconTheme(
                    data: IconThemeData(color: t.ink3, size: CatchIconSize.md),
                    child: configuration.leading!,
                  ),
            suffixIconConstraints: _suffixIconConstraints,
            suffixIcon:
                _usesRowTextEntryTrailing ||
                    (!configuration.showClearButton &&
                        !_hasRowActions &&
                        configuration.trailing == null)
                ? null
                : CatchFieldTrailingRow.inputSuffix(
                    controller: controller,
                    clearTooltip: configuration.copy.clearTooltip(_title),
                    actions: configuration.actions,
                    trailing: configuration.trailing,
                    showClearButton: configuration.showClearButton,
                    onChanged: configuration.onChanged,
                  ),
          ),
        );
        final Widget inputShell;
        if (effectiveVariant == CatchFieldVariant.bare ||
            effectiveVariant == CatchFieldVariant.row) {
          inputShell = textField;
        } else {
          final active = effectiveFocused || hasError;
          final baselineColor = hasError
              ? t.danger
              : _enabled
              ? t.line2
              : t.line;
          final sweepColor = hasError ? t.danger : t.ink;
          inputShell = ConstrainedBox(
            constraints: BoxConstraints(
              minHeight: CatchControlMetrics.minHeight(_controlSize),
            ),
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                DecoratedBox(
                  key: const ValueKey('catch-field-underline-baseline'),
                  decoration: BoxDecoration(
                    border: Border(bottom: BorderSide(color: baselineColor)),
                  ),
                  child: textField,
                ),
                PositionedDirectional(
                  start: 0,
                  end: 0,
                  bottom: -CatchFieldTokens.underlineSweepBottomOffset,
                  height: CatchStroke.underline,
                  child: LayoutBuilder(
                    builder: (context, constraints) =>
                        TweenAnimationBuilder<double>(
                          key: const ValueKey('catch-field-underline-sweep'),
                          duration: catchFieldMotionDuration(
                            context,
                            CatchFieldTokens.reveal,
                          ),
                          curve: CatchFieldTokens.curve,
                          tween: Tween<double>(end: active ? 1 : 0),
                          builder: (context, progress, _) => Align(
                            alignment: AlignmentDirectional.centerStart,
                            child: SizedBox(
                              key: const ValueKey(
                                'catch-field-underline-sweep-bar',
                              ),
                              width: constraints.maxWidth * progress,
                              height: CatchStroke.underline,
                              child: ColoredBox(color: sweepColor),
                            ),
                          ),
                        ),
                  ),
                ),
              ],
            ),
          );
        }
        final singleLineControlHeight = _singleLineControlHeight(
          effectiveVariant,
        );
        final sizedInputShell = singleLineControlHeight == null
            ? inputShell
            : SizedBox(height: singleLineControlHeight, child: inputShell);

        final input = effectiveShowLabel
            ? sizedInputShell
            : Semantics(
                // Keep the label separate from neighboring row captions while
                // letting the native input manage its descendant semantics.
                container: true,
                label: effectiveSemanticLabel ?? _title,
                child: sizedInputShell,
              );

        if (rowBody) {
          final body = CatchFieldContentRow.value(
            labelCopy: configuration.copy.label,
            titleMaxLines: configuration.titleMaxLines,
            isOptional:
                configuration.labelMode.isOptional &&
                configuration.labelMode.showsLabel,
            badgeLabel: configuration.badgeLabel,
            badgeTone: configuration.badgeTone,
            tone: configuration.tone,
            helperTone: configuration.helperTone,
            headerTrailingReserve: headerTrailingReserve,
            label: configuration.labelMode.showsLabel && !inlineAddAtRest
                ? _title
                : null,
            supportText: supportText,
            counterText:
                configuration.maxLength != null &&
                    (_focused ||
                        configuration.states.contains(WidgetState.focused) ||
                        hasError)
                ? '${controller.text.characters.length} / ${configuration.maxLength}'
                : null,
            status: hasError
                ? CatchFieldContentRowStatus.error
                : _active
                ? CatchFieldContentRowStatus.active
                : CatchFieldContentRowStatus.idle,
            labelStyle: CatchFieldContentRow.captionStyle(
              context,
              color: hasError
                  ? t.danger
                  : _active
                  ? t.ink
                  : t.ink2,
            ),
            body: Row(
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                if (!inlineAddAtRest && configuration.leadingUnit != null) ...[
                  Text(
                    configuration.leadingUnit!,
                    style: CatchTextStyles.fieldRowValue(
                      context,
                      color: t.ink2,
                    ),
                  ),
                  const SizedBox(width: CatchSpacing.s1),
                ],
                Expanded(
                  key: const ValueKey<String>('catch-field-text-input'),
                  child: input,
                ),
              ],
            ),
          );

          if (MediaQuery.maybeOf(context)?.disableAnimations == true) {
            return body;
          }
          return AnimatedSize(
            duration: catchFieldMotionDuration(context, CatchMotion.base),
            curve: CatchMotion.standardCurve,
            alignment: Alignment.topCenter,
            child: body,
          );
        }

        final counterText =
            effectiveVariant == CatchFieldVariant.underline &&
                configuration.maxLength != null &&
                (_focused || configuration.states.contains(WidgetState.focused))
            ? '${controller.text.characters.length} / ${configuration.maxLength}'
            : null;
        final hasMeta = supportText != null || counterText != null;

        if (!effectiveShowLabel && !hasMeta) {
          return input;
        }

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            if (effectiveShowLabel &&
                !_useFloatingLabel(effectiveVariant, effectiveShowLabel)) ...[
              CatchFieldLabelText.inline(
                copy: configuration.copy.label,
                label: _title ?? '',
                style: CatchFieldContentRow.captionStyle(
                  context,
                  color: _fieldLabelColor(t, hasError: hasError),
                ),
                mode:
                    configuration.labelMode.isOptional &&
                        configuration.labelMode.showsLabel
                    ? CatchFieldLabelTextMode.optional
                    : CatchFieldLabelTextMode.visible,
              ),
              const SizedBox(height: CatchSpacing.s2),
            ],
            input,
            if (hasMeta) ...[
              const SizedBox(height: CatchFieldTokens.supportingTopGap),
              CatchFieldSupportRow(
                text: supportText,
                counter: counterText,
                color: hasError
                    ? t.danger
                    : CatchFieldSupportRow.resolveColor(
                        context,
                        configuration.helperTone,
                      ),
                showErrorIcon:
                    hasError && effectiveVariant != CatchFieldVariant.underline,
              ),
            ],
          ],
        );
      },
    );
  }

  bool get _active => states.contains(WidgetState.selected);
  bool get _focused => states.contains(WidgetState.focused);
  String? get _title => configuration.title;
  bool get _hasInputValue => controller.text.isNotEmpty;
  bool get _textEntryCanCollapse =>
      configuration.labelMode.showsLabel && (_title?.isNotEmpty ?? false);
  bool _textEntryExpandedWith({required bool hasError}) =>
      !_textEntryCanCollapse ||
      _hasInputValue ||
      _active ||
      hasError ||
      configuration.autofocus;
  bool _inlineTextAddAtRestWith({required bool hasError}) =>
      !configuration.inputMode.readOnlyText &&
      _textEntryCanCollapse &&
      !_hasInputValue &&
      !_active &&
      !hasError &&
      !configuration.autofocus &&
      emptyValueText != null;
  bool get _compactTextEntry =>
      configuration.size == CatchFieldSize.floating &&
      !configuration.labelMode.showsLabel;
  bool get _usesRowPrefixIcon =>
      configuration.variant != CatchFieldVariant.underline &&
      !_compactTextEntry &&
      configuration.labelMode.showsLabel &&
      configuration.leading != null;
  bool get _usesRowTextEntryTrailing =>
      configuration.variant != CatchFieldVariant.underline &&
      !_compactTextEntry &&
      (configuration.showClearButton ||
          configuration.trailing != null ||
          _hasRowActions);
  Color _fieldLabelColor(CatchTokens t, {required bool hasError}) => hasError
      ? t.danger
      : _active
      ? t.ink
      : t.ink2;

  bool _useFloatingLabel(CatchFieldVariant variant, bool showLabel) {
    return !_explicitSave &&
        showLabel &&
        !configuration.labelMode.isOptional &&
        variant == CatchFieldVariant.underline;
  }

  EdgeInsets _contentPadding(CatchFieldVariant variant) {
    if (variant == CatchFieldVariant.bare || variant == CatchFieldVariant.row) {
      return EdgeInsets.zero;
    }
    if (variant == CatchFieldVariant.underline) {
      return const EdgeInsets.fromLTRB(
        0,
        CatchSpacing.micro2,
        0,
        CatchSpacing.s2,
      );
    }
    return CatchControlMetrics.textFieldContentPadding(_controlSize);
  }

  TextStyle _textStyle(BuildContext context, {required Color color}) {
    final style = configuration.size == CatchFieldSize.floating
        ? CatchTextStyles.bodyLead(context, color: color)
        : CatchTextStyles.bodyL(context, color: color);

    if (configuration.fontFeatures == null) return style;

    return style.copyWith(
      fontFeatures: [...?style.fontFeatures, ...configuration.fontFeatures!],
    );
  }

  BoxConstraints? get _iconConstraints {
    if (configuration.maxLines != 1 || configuration.minLines != null) {
      return null;
    }

    final extent = CatchControlMetrics.iconExtent(_controlSize);
    return CatchControlMetrics.squareConstraints(extent);
  }

  BoxConstraints? get _suffixIconConstraints {
    if (!_hasRowActions) return _iconConstraints;
    return const BoxConstraints();
  }

  CatchControlSurfaceSize get _controlSize {
    return switch (configuration.size) {
      CatchFieldSize.floating => CatchControlSurfaceSize.floating,
      CatchFieldSize.compact => CatchControlSurfaceSize.compact,
      CatchFieldSize.md => CatchControlSurfaceSize.md,
    };
  }

  TextAlignVertical? get _textAlignVertical {
    if (configuration.maxLines != 1 || configuration.minLines != null) {
      return null;
    }
    return TextAlignVertical.center;
  }

  double? _singleLineControlHeight(CatchFieldVariant variant) {
    if (variant == CatchFieldVariant.bare || variant == CatchFieldVariant.row) {
      return null;
    }
    if (configuration.maxLines != 1 || configuration.minLines != null) {
      return null;
    }
    return CatchControlMetrics.minHeight(_controlSize);
  }
}
