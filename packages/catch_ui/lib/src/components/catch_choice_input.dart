import 'dart:async';

import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_chip.dart';
import 'package:catch_ui/src/components/catch_chip_mode.dart';
import 'package:catch_ui/src/components/catch_choice_button.dart';
import 'package:catch_ui/src/components/catch_choice_input_variant.dart';
import 'package:catch_ui/src/components/catch_choice_tile.dart';
import 'package:catch_ui/src/components/catch_contract_field_constraints.dart';
import 'package:catch_ui/src/components/catch_contract_field_policy.dart';
import 'package:catch_ui/src/components/catch_field_choice_picked_notification.dart';
import 'package:catch_ui/src/components/catch_field_label_text.dart';
import 'package:catch_ui/src/components/catch_field_label_text_mode.dart';
import 'package:catch_ui/src/components/catch_option.dart';
import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:catch_ui/src/primitives/catch_gap.dart';
import 'package:flutter/material.dart';

/// Checked choices with caller-owned values and shared selection policy.
///
/// The default recipe wraps compact chips; [CatchChoiceInput.described]
/// stacks full-width choices whose supporting copy belongs in the target.
/// [CatchChoiceInput.segmented] measures inline options and scrolls overflowing
/// labels; its selected-state semantics and optional pager underline are retained.
/// [CatchChoiceInput.form] adds Flutter Form validation and optional label copy
/// around the same input. A null [onChanged] disables every choice.
class CatchChoiceInput<T> extends StatefulWidget {
  const CatchChoiceInput({
    super.key,
    required List<T> this._values,
    required String Function(T value) this._itemLabelBuilder,
    required Set<T> this._selected,
    required this.mode,
    required this._onChanged,
    this.allowEmptySelection = false,
    this.autoClose = false,
    this.itemAccentBuilder,
    this.itemKeyBuilder,
  }) : _segmented = null,
       _form = null,
       _itemSubtitleBuilder = null,
       _constraints = null;

  const CatchChoiceInput.described({
    super.key,
    required List<T> this._values,
    required String Function(T value) this._itemLabelBuilder,
    required String Function(T value) this._itemSubtitleBuilder,
    required Set<T> this._selected,
    required this._onChanged,
    this.autoClose = false,
    this.itemKeyBuilder,
    CatchContractFieldConstraints? contract,
    String Function(T value)? contractValueBuilder,
  }) : _segmented = null,
       mode = CatchChipMode.single,
       allowEmptySelection = false,
       itemAccentBuilder = null,
       _form = null,
       _constraints = (contract: contract, valueBuilder: contractValueBuilder);

  const CatchChoiceInput.form({
    super.key,
    required String? label,
    required CatchFieldLabelTextCopy copy,
    required List<T> this._values,
    required String Function(T value) this._itemLabelBuilder,
    required Set<T> this._selected,
    required this.mode,
    required this._onChanged,
    this.allowEmptySelection = false,
    bool isOptional = false,
    CatchContractFieldConstraints? contract,
    String Function(T value)? contractValueBuilder,
    FormFieldValidator<Set<T>>? onValidate,
    this.itemAccentBuilder,
    this.itemKeyBuilder,
  }) : _segmented = null,
       autoClose = false,
       _itemSubtitleBuilder = null,
       _constraints = null,
       _form = (
         label: label,
         copy: copy,
         isOptional: isOptional,
         contract: contract,
         contractValueBuilder: contractValueBuilder,
         onValidate: onValidate,
       );

  final String Function(T value)? _itemSubtitleBuilder;
  final ({
    CatchContractFieldConstraints? contract,
    String Function(T value)? valueBuilder,
  })?
  _constraints;

  final List<T>? _values;
  final String Function(T value)? _itemLabelBuilder;
  final Set<T>? _selected;
  final CatchChipMode mode;
  final ValueChanged<Set<T>>? _onChanged;
  final bool allowEmptySelection;

  /// Requests the nearest field's existing close protocol after a single
  /// choice callback completes. Multiple selection never requests closure.
  final bool autoClose;
  final Color? Function(T value)? itemAccentBuilder;
  final Key? Function(T value)? itemKeyBuilder;
  final ({
    String? label,
    CatchFieldLabelTextCopy copy,
    bool isOptional,
    CatchContractFieldConstraints? contract,
    String Function(T value)? contractValueBuilder,
    FormFieldValidator<Set<T>>? onValidate,
  })?
  _form;

  /// Inline single selection. The underline can track a caller-owned pager;
  /// summary choices wrap while the other variants reveal overflow horizontally.
  const CatchChoiceInput.segmented({
    super.key,
    required List<CatchOption<T>> options,
    required T? selected,
    CatchContractFieldConstraints? contract,
    String Function(T value)? contractValueBuilder,
    String? contractExemption,
    ValueChanged<T>? onChanged,
    CatchChoiceInputVariant variant = CatchChoiceInputVariant.label,
    Color? accent,
    Widget? trailing,
    EdgeInsetsGeometry contentPadding = EdgeInsets.zero,
    bool scrollable = false,
    bool showDivider = true,
    double? selectionPosition,
  }) : _segmented = (
         options: options,
         selected: selected,
         contract: contract,
         contractValueBuilder: contractValueBuilder,
         contractExemption: contractExemption,
         onChanged: onChanged,
         variant: variant,
         accent: accent,
         trailing: trailing,
         contentPadding: contentPadding,
         scrollable: scrollable,
         showDivider: showDivider,
         selectionPosition: selectionPosition,
       ),
       _values = null,
       _itemLabelBuilder = null,
       _selected = null,
       _onChanged = null,
       _form = null,
       _itemSubtitleBuilder = null,
       _constraints = null,
       mode = CatchChipMode.single,
       allowEmptySelection = false,
       autoClose = false,
       itemAccentBuilder = null,
       itemKeyBuilder = null;

  final _SegmentedChoice<T>? _segmented;

  List<T> get values =>
      _values ??
      _segmented!.options.map((option) => option.value).toList(growable: false);
  String Function(T value) get itemLabelBuilder =>
      _itemLabelBuilder ??
      (value) => _segmented!.options
          .firstWhere((option) => option.value == value)
          .label;
  Set<T> get selected =>
      _selected ??
      (_segmented!.options.any((option) => option.value == _segmented!.selected)
          ? {_segmented!.selected as T}
          : <T>{});
  ValueChanged<Set<T>>? get onChanged {
    final segmented = _segmented;
    if (segmented == null) return _onChanged;
    final onChanged = segmented.onChanged;
    return onChanged == null ? null : (values) => onChanged(values.single);
  }

  /// The inline presentation axis; checked/form recipes have no such variant.
  CatchChoiceInputVariant? get variant => _segmented?.variant;

  @override
  State<CatchChoiceInput<T>> createState() => _CatchChoiceInputState<T>();
}

typedef _SegmentedChoice<T> = ({
  List<CatchOption<T>> options,
  T? selected,
  CatchContractFieldConstraints? contract,
  String Function(T value)? contractValueBuilder,
  String? contractExemption,
  ValueChanged<T>? onChanged,
  CatchChoiceInputVariant variant,
  Color? accent,
  Widget? trailing,
  EdgeInsetsGeometry contentPadding,
  bool scrollable,
  bool showDivider,
  double? selectionPosition,
});

class _CatchChoiceInputState<T> extends State<CatchChoiceInput<T>> {
  _SegmentedChoice<T> get _segmented => widget._segmented!;
  final GlobalKey _groupKey = GlobalKey();
  var _labelKeys = <GlobalKey>[];
  var _labelRects = <Rect?>[];
  bool _revealSelected = true;
  final _railScrollController = ScrollController();

  @override
  void dispose() {
    _railScrollController.dispose();
    super.dispose();
  }

  List<CatchOption<T>> get _options {
    final values = CatchContractFieldPolicy.supportedChoiceValues(
      _segmented.contract,
      _segmented.options.map((option) => option.value).toList(growable: false),
      _segmented.contractValueBuilder,
      multi: false,
    ).toSet();
    return _segmented.options
        .where((option) => values.contains(option.value))
        .toList(growable: false);
  }

  @override
  void initState() {
    super.initState();
    if (widget._segmented == null) return;
    _syncLabelKeys();
    WidgetsBinding.instance.addPostFrameCallback((_) => _updateLabelRects());
  }

  @override
  void didUpdateWidget(covariant CatchChoiceInput<T> oldWidget) {
    super.didUpdateWidget(oldWidget);
    final old = oldWidget._segmented;
    final next = widget._segmented;
    if (next == null) return;
    if (old == null ||
        _labelKeys.length != _options.length ||
        old.contract != next.contract ||
        old.contractValueBuilder != next.contractValueBuilder) {
      _syncLabelKeys();
    }
    if (old == null ||
        old.selected != next.selected ||
        old.variant != next.variant) {
      _revealSelected = true;
    }
    WidgetsBinding.instance.addPostFrameCallback((_) => _updateLabelRects());
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (widget._segmented == null) return;
    // Text scaling and viewport changes can hide a previously visible tab.
    _revealSelected = true;
    WidgetsBinding.instance.addPostFrameCallback((_) => _updateLabelRects());
  }

  void _syncLabelKeys() {
    _labelKeys = [
      for (var index = 0; index < _options.length; index += 1) GlobalKey(),
    ];
    _labelRects = List<Rect?>.filled(_options.length, null);
  }

  void _updateLabelRects() {
    if (!mounted || widget._segmented == null) return;
    final groupContext = _groupKey.currentContext;
    if (groupContext == null) return;
    final groupBox = groupContext.findRenderObject() as RenderBox?;
    if (groupBox == null || !groupBox.hasSize) return;

    final nextRects = <Rect?>[];
    for (final key in _labelKeys) {
      final labelContext = key.currentContext;
      final labelBox = labelContext?.findRenderObject() as RenderBox?;
      if (labelBox == null || !labelBox.hasSize) {
        nextRects.add(null);
        continue;
      }
      final offset = labelBox.localToGlobal(Offset.zero, ancestor: groupBox);
      nextRects.add(offset & labelBox.size);
    }

    var changed = nextRects.length != _labelRects.length;
    if (!changed) {
      for (var index = 0; index < nextRects.length; index += 1) {
        if (nextRects[index] != _labelRects[index]) {
          changed = true;
          break;
        }
      }
    }
    if (changed) setState(() => _labelRects = nextRects);
    if (_revealSelected) {
      _revealSelected = false;
      final index = _options.indexWhere(
        (option) => option.value == _segmented.selected,
      );
      if (index < 0 || index >= _labelKeys.length) return;
      final labelContext = _labelKeys[index].currentContext;
      if (labelContext == null) return;

      final labelBox = labelContext.findRenderObject();
      if (_railScrollController.hasClients && labelBox != null) {
        // Reveal only this rail. Scrolling an ancestor page would move content
        // unexpectedly when a user switches tabs or restores a deep link.
        unawaited(
          _railScrollController.position.ensureVisible(
            labelBox,
            alignment: 0.5,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget._segmented != null) {
      final t = CatchTokens.of(context);
      final options = _options;
      assert(
        _segmented.selected == null ||
            options.any((option) => option.value == _segmented.selected),
        'CatchChoiceInput segmented value must be allowed by its contract.',
      );
      if (_segmented.variant == CatchChoiceInputVariant.summary) {
        final choices = <Widget>[
          for (final option in options)
            CatchChoiceButton<T>(
              option: option,
              selected: option.value == _segmented.selected,
              variant: _segmented.variant,
              onTap: _segmented.onChanged == null || !option.enabled
                  ? null
                  : () => _pickValue(context, option.value, widget.selected),
            ),
          ?_segmented.trailing,
        ];
        return Padding(
          padding: _segmented.contentPadding,
          child: _segmented.scrollable
              ? SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(spacing: CatchSpacing.s2, children: choices),
                )
              : Wrap(
                  spacing: CatchSpacing.s2,
                  runSpacing: CatchSpacing.s2,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: choices,
                ),
        );
      }
      final selectedRule = _segmented.accent ?? t.ink;
      final gap = switch (_segmented.variant) {
        CatchChoiceInputVariant.summary => CatchSpacing.s2,
        CatchChoiceInputVariant.mono => CatchSpacing.s4,
        CatchChoiceInputVariant.operational => CatchSpacing.s1,
        CatchChoiceInputVariant.label => CatchSpacing.micro18,
      };
      final selectedIndex = options.indexWhere(
        (option) => option.value == _segmented.selected,
      );
      final indicatorRect = _indicatorRect(selectedIndex);
      final indicatorDuration =
          !MediaQuery.disableAnimationsOf(context) &&
              _segmented.selectionPosition == null
          ? CatchMotion.fast
          : Duration.zero;

      // Select scrolling from content, not a caller's guess. Compressing a row
      // of choices must never shrink its hitboxes or ellipsize the only labels.
      final optionWidths = <double>[];
      final neededWidth =
          options.fold<double>(0, (width, option) {
            final style = switch (_segmented.variant) {
              CatchChoiceInputVariant.mono => CatchTextStyles.monoLabel(
                context,
              ),
              CatchChoiceInputVariant.operational => CatchTextStyles.titleS(
                context,
                color: CatchTokens.of(context).ink,
              ),
              _ => CatchTextStyles.tabLabel(context, selected: true),
            };
            final painter = TextPainter(
              text: TextSpan(
                text: _segmented.variant == CatchChoiceInputVariant.mono
                    ? option.label.toUpperCase()
                    : option.label,
                style: style,
              ),
              textDirection: Directionality.of(context),
              textScaler: MediaQuery.textScalerOf(context),
            )..layout();
            final horizontalPadding =
                _segmented.variant == CatchChoiceInputVariant.operational &&
                    MediaQuery.textScalerOf(context).scale(1) < 1.4
                ? CatchSpacing.s4
                : CatchSpacing.s2;
            final iconWidth =
                option.icon != null &&
                    MediaQuery.textScalerOf(context).scale(1) < 1.4
                ? CatchLayout.optionGroupIconSlotExtent
                : 0;
            final contentWidth = painter.width + horizontalPadding + iconWidth;
            painter.dispose();
            final targetWidth =
                contentWidth < CatchPlatformTokens.minimumInteractiveExtent
                ? CatchPlatformTokens.minimumInteractiveExtent
                : contentWidth.ceilToDouble();
            optionWidths.add(targetWidth);
            return width + targetWidth;
          }) +
          gap * (options.length - 1).clamp(0, options.length);

      return Stack(
        key: _groupKey,
        clipBehavior: Clip.none,
        children: [
          if (_segmented.showDivider)
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: DecoratedBox(
                decoration: BoxDecoration(color: t.line),
                child: const SizedBox(height: CatchStroke.hairline),
              ),
            ),
          Padding(
            padding: _segmented.contentPadding,
            child: Row(
              children: [
                Expanded(
                  child: LayoutBuilder(
                    builder: (context, available) {
                      final operationalWidth = optionWidths.isEmpty
                          ? 0.0
                          : optionWidths.reduce((a, b) => a > b ? a : b) *
                                    options.length +
                                gap * (options.length - 1);
                      final requiredWidth =
                          _segmented.variant ==
                              CatchChoiceInputVariant.operational
                          ? operationalWidth
                          : neededWidth;
                      final scrollable =
                          _segmented.scrollable ||
                          requiredWidth > available.maxWidth;
                      final optionsRow = Row(
                        mainAxisSize: scrollable
                            ? MainAxisSize.min
                            : MainAxisSize.max,
                        children: [
                          for (
                            var index = 0;
                            index < options.length;
                            index += 1
                          ) ...[
                            if (index != 0) SizedBox(width: gap),
                            if (scrollable)
                              CatchChoiceButton<T>(
                                option: options[index],
                                selected: index == selectedIndex,
                                selectedRule: selectedRule,
                                variant: _segmented.variant,
                                showIndicator: false,
                                labelKey: _labelKeys[index],
                                onTap:
                                    _segmented.onChanged == null ||
                                        !options[index].enabled
                                    ? null
                                    : () => _pickValue(
                                        context,
                                        options[index].value,
                                        widget.selected,
                                      ),
                              )
                            else
                              Flexible(
                                flex:
                                    _segmented.variant ==
                                        CatchChoiceInputVariant.operational
                                    ? 1
                                    : optionWidths[index].ceil(),
                                child: CatchChoiceButton<T>(
                                  option: options[index],
                                  selected: index == selectedIndex,
                                  selectedRule: selectedRule,
                                  variant: _segmented.variant,
                                  showIndicator: false,
                                  labelKey: _labelKeys[index],
                                  onTap:
                                      _segmented.onChanged == null ||
                                          !options[index].enabled
                                      ? null
                                      : () => _pickValue(
                                          context,
                                          options[index].value,
                                          widget.selected,
                                        ),
                                ),
                              ),
                          ],
                        ],
                      );

                      return scrollable
                          ? NotificationListener<ScrollNotification>(
                              onNotification: (_) {
                                WidgetsBinding.instance.addPostFrameCallback(
                                  (_) => _updateLabelRects(),
                                );
                                return false;
                              },
                              child: SingleChildScrollView(
                                controller: _railScrollController,
                                scrollDirection: Axis.horizontal,
                                child: optionsRow,
                              ),
                            )
                          : optionsRow;
                    },
                  ),
                ),
                if (_segmented.trailing != null) ...[
                  const SizedBox(width: CatchSpacing.s3),
                  _segmented.trailing!,
                ],
              ],
            ),
          ),
          if (indicatorRect != null &&
              _segmented.variant != CatchChoiceInputVariant.operational)
            AnimatedPositioned(
              duration: indicatorDuration,
              curve: CatchMotion.standardCurve,
              left: indicatorRect.left,
              bottom: 0,
              width: indicatorRect.width,
              child: DecoratedBox(
                decoration: BoxDecoration(color: selectedRule),
                child: const SizedBox(height: CatchSpacing.micro2),
              ),
            ),
        ],
      );
    }
    if (widget._form case final form?) {
      final supportedValues = CatchContractFieldPolicy.supportedChoiceValues(
        form.contract,
        widget.values,
        form.contractValueBuilder,
        multi: widget.mode == CatchChipMode.multiple,
      );
      final supportedSelection = widget.selected.intersection(
        supportedValues.toSet(),
      );
      assert(
        supportedSelection.length == widget.selected.length,
        'CatchChoiceInput selected values must be allowed by the schema contract.',
      );
      return FormField<Set<T>>(
        initialValue: supportedSelection,
        validator: form.onValidate,
        builder: (field) => Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (form.label case final label?) ...[
              CatchFieldLabelText(
                copy: form.copy,
                label: label,
                mode: form.isOptional
                    ? CatchFieldLabelTextMode.optional
                    : CatchFieldLabelTextMode.visible,
                hasError: field.hasError,
              ),
              gapH8,
            ],
            CatchChoiceInput<T>(
              values: supportedValues,
              itemLabelBuilder: widget.itemLabelBuilder,
              selected: supportedSelection,
              mode: widget.mode,
              allowEmptySelection: widget.allowEmptySelection,
              itemKeyBuilder: widget.itemKeyBuilder,
              itemAccentBuilder: widget.itemAccentBuilder,
              onChanged: widget.onChanged == null
                  ? null
                  : (next) {
                      widget.onChanged!(next);
                      field.didChange(next);
                    },
            ),
            if (field.hasError) ...[
              gapH8,
              Text(
                field.errorText!,
                style: CatchTextStyles.supporting(
                  context,
                  color: CatchTokens.of(context).danger,
                ),
              ),
            ],
          ],
        ),
      );
    }

    final supportedValues = CatchContractFieldPolicy.supportedChoiceValues(
      widget._constraints?.contract,
      widget.values,
      widget._constraints?.valueBuilder,
      multi: widget.mode == CatchChipMode.multiple,
    );
    final supportedSelection = widget.selected.intersection(
      supportedValues.toSet(),
    );
    assert(
      supportedSelection.length == widget.selected.length,
      'CatchChoiceInput selected values must be allowed by the schema contract.',
    );
    assert(
      widget._itemSubtitleBuilder == null || widget.selected.length <= 1,
      'Described choices accept at most one selected value.',
    );
    final items = <Widget>[];
    for (final value in supportedValues) {
      final label = widget.itemLabelBuilder(value);
      final key =
          widget.itemKeyBuilder?.call(value) ??
          ValueKey(
            widget._itemSubtitleBuilder == null
                ? 'catch-field-choice-$label'
                : 'catch-field-option-card-$label',
          );
      final VoidCallback? action = widget.onChanged == null
          ? null
          : () => _pickValue(context, value, supportedSelection);
      items.add(
        KeyedSubtree(
          key: _CatchChoiceValueKey<T>(value),
          child: widget._itemSubtitleBuilder == null
              ? CatchChip.choice(
                  key: key,
                  label: label,
                  selected: supportedSelection.contains(value),
                  mode: widget.mode,
                  accent: widget.itemAccentBuilder?.call(value),
                  onPressed: action,
                )
              : CatchChoiceTile(
                  key: key,
                  title: label,
                  subtitle: widget._itemSubtitleBuilder!(value),
                  selected: supportedSelection.contains(value),
                  onTap: action,
                ),
        ),
      );
    }
    if (widget._itemSubtitleBuilder != null) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (var index = 0; index < items.length; index++) ...[
            if (index > 0) const SizedBox(height: CatchSpacing.s2),
            items[index],
          ],
        ],
      );
    }
    return SizedBox(
      width: double.infinity,
      child: Wrap(
        spacing: CatchFieldTokens.chipHorizontalGap,
        runSpacing: CatchFieldTokens.chipRunSpacing,
        children: items,
      ),
    );
  }

  void _pickValue(BuildContext context, T value, Set<T> supportedSelection) {
    final next = Set<T>.from(supportedSelection);
    if (widget.mode == CatchChipMode.multiple) {
      if (next.contains(value)) {
        if (!widget.allowEmptySelection && next.length == 1) return;
        next.remove(value);
      } else {
        next.add(value);
      }
    } else {
      final wasSelected = next.contains(value);
      next.clear();
      if (!wasSelected || !widget.allowEmptySelection) next.add(value);
    }
    widget.onChanged!(next);
    if (widget.mode == CatchChipMode.single && widget.autoClose) {
      const CatchFieldChoicePickedNotification(
        autoClose: true,
      ).dispatch(context);
    }
  }

  Rect? _indicatorRect(int selectedIndex) {
    if (selectedIndex < 0 || _labelRects.isEmpty || _options.isEmpty) {
      return null;
    }
    final position = (_segmented.selectionPosition ?? selectedIndex.toDouble())
        .clamp(0, _options.length - 1)
        .toDouble();
    final lowerIndex = position.floor();
    final upperIndex = position.ceil();
    if (lowerIndex < 0 ||
        lowerIndex >= _labelRects.length ||
        upperIndex < 0 ||
        upperIndex >= _labelRects.length) {
      return null;
    }
    final lowerRect = _labelRects[lowerIndex];
    final upperRect = _labelRects[upperIndex];
    if (lowerRect == null || upperRect == null) return null;
    return Rect.lerp(lowerRect, upperRect, position - lowerIndex);
  }
}

// Keep caller-provided chip keys separate from the group's value identity.
class _CatchChoiceValueKey<T> extends ValueKey<T> {
  const _CatchChoiceValueKey(super.value);
}
