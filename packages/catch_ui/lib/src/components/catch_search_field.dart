import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_contract_field_constraints.dart';
import 'package:catch_ui/src/components/catch_contract_field_policy.dart';
import 'package:catch_ui/src/components/catch_icon_action.dart';
import 'package:catch_ui/src/components/catch_search_field_copy.dart';
import 'package:catch_ui/src/components/catch_search_field_mode.dart';
import 'package:catch_ui/src/components/catch_search_field_status.dart';
import 'package:catch_ui/src/components/catch_toolbar_metrics.dart';
import 'package:catch_ui/src/foundations/catch_icons.dart';
import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:catch_ui/src/primitives/catch_control_surface.dart';
import 'package:catch_ui/src/primitives/catch_surface.dart';
import 'package:catch_ui/src/primitives/catch_text_input.dart';
import 'package:flutter/material.dart';

/// Handoff `SearchField`: raised pill input with search glyph and quiet clear
/// target.
class CatchSearchField extends StatefulWidget {
  /// Full interactive line box shared with the top-bar slot owner.
  static double heightFor(
    BuildContext context, {
    double visualExtent = CatchIconAction.navSize,
  }) {
    final minimum = CatchIconAction.targetExtentFor(visualExtent);
    final style = CatchTextStyles.bodyM(context);
    final lineBox =
        MediaQuery.textScalerOf(context).scale(style.fontSize!) *
            (style.height ?? 1) +
        CatchSpacing.s4;
    return lineBox > minimum ? lineBox : minimum;
  }

  const CatchSearchField({
    super.key,
    required this.copy,
    this.value = '',
    this.contract,
    this.contractExemption,
    this.placeholder,
    this.onChanged,
    this.autofocus = false,
    this.enabled = true,
    this.textInputAction = TextInputAction.done,
    this.onSubmitted,
    this.onFocusChanged,
    this.semanticLabel,
    this.backgroundColor,
    this.borderColor,
    this.foregroundColor,
    this.mutedForegroundColor,
  }) : mode = CatchSearchFieldMode.field,
       status = CatchSearchFieldStatus.expanded,
       progress = null,
       maxWidth = null,
       onOpenSearch = null,
       onCloseSearch = null,
       tooltip = null,
       collapsedExtent = CatchIconAction.navSize;

  /// A permanently visible browse search.
  ///
  /// This mode deliberately has no empty trailing action: an empty field has
  /// nothing to clear and cannot be closed because it is not transient chrome.
  const CatchSearchField.expanded({
    super.key,
    required this.copy,
    this.value = '',
    this.contract,
    this.contractExemption,
    this.placeholder,
    this.onChanged,
    this.autofocus = false,
    this.enabled = true,
    this.textInputAction = TextInputAction.done,
    this.onSubmitted,
    this.onFocusChanged,
    this.semanticLabel,
    this.backgroundColor,
    this.borderColor,
    this.foregroundColor,
    this.mutedForegroundColor,
  }) : mode = CatchSearchFieldMode.expanded,
       status = CatchSearchFieldStatus.expanded,
       progress = null,
       maxWidth = null,
       onOpenSearch = null,
       onCloseSearch = null,
       tooltip = null,
       collapsedExtent = CatchIconAction.navSize;

  /// Search chrome that morphs between a compact trigger and a full field.
  ///
  /// [onCloseSearch] belongs only to this transient mode, so fixed browse
  /// fields cannot accidentally render a close icon while empty.
  const CatchSearchField.expanding({
    super.key,
    required this.copy,
    this.value = '',
    this.contract,
    this.contractExemption,
    this.placeholder,
    this.onChanged,
    this.autofocus = false,
    this.enabled = true,
    this.textInputAction = TextInputAction.done,
    this.onSubmitted,
    this.onFocusChanged,
    this.semanticLabel,
    this.status = CatchSearchFieldStatus.expanded,
    this.progress,
    this.maxWidth,
    this.onOpenSearch,
    this.onCloseSearch,
    this.tooltip,
    this.collapsedExtent = CatchToolbarMetrics.visualExtent,
    this.backgroundColor,
    this.borderColor,
    this.foregroundColor,
    this.mutedForegroundColor,
  }) : mode = CatchSearchFieldMode.expanding;

  final CatchSearchFieldCopy copy;
  final String value;
  final CatchContractFieldConstraints? contract;
  final String? contractExemption;
  final String? placeholder;
  final ValueChanged<String>? onChanged;
  final bool autofocus;
  final bool enabled;
  final TextInputAction textInputAction;
  final ValueChanged<String>? onSubmitted;
  final ValueChanged<bool>? onFocusChanged;
  final String? semanticLabel;
  final CatchSearchFieldMode mode;
  final CatchSearchFieldStatus status;
  final double? progress;
  final double? maxWidth;
  final VoidCallback? onOpenSearch;
  final VoidCallback? onCloseSearch;
  final String? tooltip;

  /// Visual trigger request, clamped to the platform target when allocated.
  final double collapsedExtent;
  final Color? backgroundColor;
  final Color? borderColor;
  final Color? foregroundColor;
  final Color? mutedForegroundColor;

  @override
  State<CatchSearchField> createState() => _CatchSearchFieldState();
}

class _CatchSearchFieldState extends State<CatchSearchField> {
  late final TextEditingController _controller;
  late final FocusNode _focusNode;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.value);
    _focusNode = FocusNode()..addListener(_handleFocusChanged);
  }

  @override
  void didUpdateWidget(covariant CatchSearchField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.value != _controller.text) {
      _controller.value = TextEditingValue(
        text: widget.value,
        selection: TextSelection.collapsed(offset: widget.value.length),
      );
    }
  }

  @override
  void dispose() {
    _focusNode
      ..removeListener(_handleFocusChanged)
      ..dispose();
    _controller.dispose();
    super.dispose();
  }

  void _handleFocusChanged() {
    widget.onFocusChanged?.call(_focusNode.hasFocus);
    setState(() {});
  }

  void _handleSubmitted(String value) {
    widget.onSubmitted?.call(value);
    _focusNode.unfocus();
  }

  void _clear() {
    _controller.clear();
    widget.onChanged?.call('');
    _focusNode.requestFocus();
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final placeholder = widget.placeholder ?? widget.copy.searchLabel;
    final foreground = widget.foregroundColor ?? t.ink;
    final mutedForeground = widget.mutedForegroundColor ?? t.ink3;
    final textInput = CatchTextInput(
      controller: _controller,
      focusNode: _focusNode,
      autofocus: widget.autofocus,
      status: widget.enabled
          ? CatchTextInputStatus.enabled
          : CatchTextInputStatus.disabled,
      textInputAction: widget.textInputAction,
      inputFormatters: CatchContractFieldPolicy.effectiveInputFormatters(
        widget.contract,
        null,
      ),
      onChanged: widget.onChanged,
      onSubmitted: _handleSubmitted,
      onTapOutside: (_) => _focusNode.unfocus(),
      style: CatchTextStyles.bodyM(
        context,
        color: widget.enabled ? foreground : mutedForeground,
      ),
      cursorColor: t.primary,
      decoration: InputDecoration(
        isDense: true,
        filled: false,
        fillColor: Colors.transparent,
        border: InputBorder.none,
        enabledBorder: InputBorder.none,
        focusedBorder: InputBorder.none,
        disabledBorder: InputBorder.none,
        contentPadding: EdgeInsets.zero,
        hintText: placeholder,
        hintStyle: CatchTextStyles.bodyM(context, color: mutedForeground),
      ),
    );

    if (widget.mode != CatchSearchFieldMode.field) {
      final targetProgress = widget.mode == CatchSearchFieldMode.expanded
          ? 1.0
          : (widget.progress ??
                (widget.status == CatchSearchFieldStatus.expanded ? 1.0 : 0.0));
      return TweenAnimationBuilder<double>(
        tween: Tween<double>(end: targetProgress),
        duration: MediaQuery.disableAnimationsOf(context)
            ? Duration.zero
            : CatchMotion.base,
        curve: CatchMotion.standardCurve,
        builder: (context, progress, _) => LayoutBuilder(
          builder: (context, constraints) {
            final maxWidth =
                widget.maxWidth ??
                (constraints.hasBoundedWidth
                    ? constraints.maxWidth
                    : CatchIconAction.targetExtentFor(widget.collapsedExtent));
            final tooltip = widget.tooltip ?? widget.copy.searchLabel;
            final clampedProgress = progress.clamp(0.0, 1.0);
            final collapsedExtent = CatchIconAction.targetExtentFor(
              widget.collapsedExtent,
            );
            final expandedHeight = CatchSearchField.heightFor(
              context,
              visualExtent: widget.collapsedExtent,
            );
            final width =
                widget.collapsedExtent +
                ((maxWidth - widget.collapsedExtent) * clampedProgress);
            final fieldHeight =
                widget.collapsedExtent +
                (expandedHeight - widget.collapsedExtent) * clampedProgress;
            final targetWidth =
                collapsedExtent +
                ((maxWidth - collapsedExtent) * clampedProgress);
            final targetHeight = fieldHeight < collapsedExtent
                ? collapsedExtent
                : fieldHeight;
            final fieldOpacity = ((clampedProgress - 0.12) / 0.88).clamp(
              0.0,
              1.0,
            );
            final iconOpacity = (1 - (clampedProgress / 0.42)).clamp(0.0, 1.0);
            final fieldInteractive = clampedProgress > 0.72;
            final collapsedInteractive = clampedProgress < 0.08;
            final radius = BorderRadius.circular(CatchRadius.pill);
            if (fieldInteractive &&
                widget.autofocus &&
                widget.enabled &&
                !_focusNode.hasFocus) {
              WidgetsBinding.instance.addPostFrameCallback((_) {
                if (!mounted || !widget.enabled || _focusNode.hasFocus) return;
                _focusNode.requestFocus();
              });
            }

            return Align(
              alignment: Alignment.centerRight,
              widthFactor: 1,
              heightFactor: 1,
              child: Semantics(
                button: collapsedInteractive,
                label: collapsedInteractive
                    ? (widget.semanticLabel ?? tooltip)
                    : null,
                enabled: collapsedInteractive ? widget.enabled : null,
                excludeSemantics: collapsedInteractive,
                onTap: collapsedInteractive && widget.enabled
                    ? widget.onOpenSearch
                    : null,
                child: InkWell(
                  onTap: collapsedInteractive && widget.enabled
                      ? widget.onOpenSearch
                      : null,
                  excludeFromSemantics: true,
                  borderRadius: radius,
                  child: SizedBox(
                    width: targetWidth,
                    height: targetHeight,
                    child: Center(
                      child: CatchSurface(
                        width: width,
                        height: fieldHeight,
                        borderRadius: radius,
                        borderSpec: _focusNode.hasFocus
                            ? CatchBorder.resolve(t, CatchBorderRole.focus)
                            : CatchBorder.interactive(
                                t,
                                widget.enabled
                                    ? CatchInteractiveBorderState.resting
                                    : CatchInteractiveBorderState.disabled,
                              ).copyWith(color: widget.borderColor),
                        backgroundColor: widget.backgroundColor ?? t.surface,
                        padding: EdgeInsets.zero,
                        clipBehavior: Clip.antiAlias,
                        duration: Duration.zero,
                        child: Material(
                          color: Colors.transparent,
                          child: Stack(
                            fit: StackFit.expand,
                            children: [
                              if (clampedProgress > 0)
                                IgnorePointer(
                                  ignoring: !fieldInteractive,
                                  child: ExcludeSemantics(
                                    excluding: !fieldInteractive,
                                    child: Opacity(
                                      opacity: fieldOpacity,
                                      child: OverflowBox(
                                        alignment: Alignment.centerLeft,
                                        minWidth: maxWidth,
                                        maxWidth: maxWidth,
                                        child: Padding(
                                          padding: const EdgeInsets.only(
                                            left: CatchSpacing.s3,
                                            right: CatchSpacing.s1,
                                          ),
                                          child: Row(
                                            children: [
                                              Icon(
                                                CatchIcons.search,
                                                size: CatchLayout
                                                    .searchFieldIconSize,
                                                color: mutedForeground,
                                              ),
                                              const SizedBox(
                                                width: CatchLayout
                                                    .searchFieldIconGap,
                                              ),
                                              Expanded(child: textInput),
                                              ValueListenableBuilder<
                                                TextEditingValue
                                              >(
                                                valueListenable: _controller,
                                                builder: (context, value, _) {
                                                  final isEmpty =
                                                      value.text.isEmpty;
                                                  final icon = isEmpty
                                                      ? CatchIcons.close
                                                      : CatchIcons.clear;
                                                  final tooltip = isEmpty
                                                      ? widget
                                                            .copy
                                                            .closeSearchLabel
                                                      : widget.copy
                                                            .clearTooltip(
                                                              placeholder,
                                                            );
                                                  final onPressed = isEmpty
                                                      ? widget.onCloseSearch
                                                      : _clear;
                                                  if (isEmpty &&
                                                      onPressed == null) {
                                                    return SizedBox(
                                                      width: CatchIconAction.targetExtentFor(
                                                        CatchLayout
                                                            .searchFieldClearSize,
                                                      ),
                                                    );
                                                  }

                                                  return CatchIconAction(
                                                    size: CatchLayout
                                                        .searchFieldClearSize,
                                                    variant:
                                                        CatchIconActionVariant
                                                            .plain,
                                                    tooltip: tooltip,
                                                    onPressed: widget.enabled
                                                        ? onPressed
                                                        : null,
                                                    child: Icon(
                                                      icon,
                                                      size: CatchLayout
                                                          .searchFieldClearIconSize,
                                                      color: mutedForeground,
                                                    ),
                                                  );
                                                },
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              IgnorePointer(
                                ignoring: !collapsedInteractive,
                                child: ExcludeSemantics(
                                  excluding: !collapsedInteractive,
                                  child: Opacity(
                                    opacity: iconOpacity,
                                    child: InkWell(
                                      onTap: widget.enabled
                                          ? widget.onOpenSearch
                                          : null,
                                      child: Tooltip(
                                        message: tooltip,
                                        excludeFromSemantics: true,
                                        child: Semantics(
                                          button: true,
                                          enabled: widget.enabled,
                                          label:
                                              widget.semanticLabel ?? tooltip,
                                          child: Center(
                                            child: Icon(
                                              CatchIcons.search,
                                              size: CatchIconSize.md,
                                              color: foreground,
                                            ),
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            );
          },
        ),
      );
    }

    return Semantics(
      label: widget.semanticLabel ?? placeholder,
      textField: true,
      child: CatchControlSurface(
        status: _focusNode.hasFocus
            ? CatchControlSurfaceStatus.focused
            : CatchControlSurfaceStatus.resting,

        size: CatchControlSurfaceSize.compact,
        variant: CatchControlSurfaceVariant.pill,
        tone: CatchControlSurfaceTone.raised,
        enabled: widget.enabled,

        padding: const EdgeInsets.only(
          left: CatchSpacing.s4,
          right: CatchSpacing.s2,
        ),
        child: Row(
          children: [
            Icon(
              CatchIcons.search,
              size: CatchLayout.searchFieldIconSize,
              color: mutedForeground,
            ),
            const SizedBox(width: CatchLayout.searchFieldIconGap),
            Expanded(child: textInput),
            ValueListenableBuilder<TextEditingValue>(
              valueListenable: _controller,
              builder: (context, value, _) {
                if (value.text.isEmpty) {
                  return SizedBox(
                    width: CatchIconAction.targetExtentFor(
                      CatchLayout.searchFieldClearSize,
                    ),
                  );
                }

                return CatchIconAction(
                  size: CatchLayout.searchFieldClearSize,
                  variant: CatchIconActionVariant.plain,
                  tooltip: widget.copy.clearTooltip(placeholder),
                  onPressed: widget.enabled ? _clear : null,
                  child: Icon(
                    CatchIcons.clear,
                    size: CatchLayout.searchFieldClearIconSize,
                    color: mutedForeground,
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
