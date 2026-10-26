import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_choice_input_variant.dart';
import 'package:catch_ui/src/components/catch_option.dart';
import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:catch_ui/src/primitives/catch_row_press_surface.dart';
import 'package:catch_ui/src/primitives/catch_surface.dart';
import 'package:flutter/material.dart';

class CatchChoiceButton<T> extends StatelessWidget {
  const CatchChoiceButton({
    super.key,
    required this.option,
    required this.selected,
    this.selectedRule,
    this.variant = CatchChoiceInputVariant.label,
    this.onTap,
    this.showIndicator = true,
    this.labelKey,
  });

  final CatchOption<T> option;
  final bool selected;
  final Color? selectedRule;
  final CatchChoiceInputVariant variant;
  final VoidCallback? onTap;
  final bool showIndicator;
  final Key? labelKey;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    if (variant == CatchChoiceInputVariant.summary) {
      return Semantics(
        button: true,
        selected: selected,
        enabled: option.enabled && onTap != null,
        label: option.semanticLabel ?? option.label,
        hint: option.disabledReason,
        onTap: option.enabled ? onTap : null,
        child: ExcludeSemantics(
          child: CatchRowPressSurface(
            expandToMaxWidth: false,
            onTap: option.enabled ? onTap : null,
            child: ConstrainedBox(
              constraints: BoxConstraints(
                minHeight: CatchPlatformTokens.minimumInteractiveExtent,
                minWidth: CatchPlatformTokens.minimumInteractiveExtent,
              ),
              child: Padding(
                padding: EdgeInsets.symmetric(
                  vertical:
                      (CatchPlatformTokens.minimumInteractiveExtent -
                          (CatchPlatformTokens.typography.secondary.fontSize! *
                                  CatchPlatformTokens
                                      .typography
                                      .secondary
                                      .height! +
                              CatchRecordTokens.selectionVerticalPadding * 2)) /
                      2,
                ),
                child: CatchSurface(
                  tone: CatchSurfaceTone.transparent,
                  backgroundColor: selected ? t.primary : Colors.transparent,
                  radius: CatchRadius.sm,
                  padding: const EdgeInsets.symmetric(
                    horizontal: CatchRecordTokens.selectionHorizontalPadding,
                    vertical: CatchRecordTokens.selectionVerticalPadding,
                  ),
                  child: Text(
                    option.label,
                    key: labelKey,
                    style: CatchTextStyles.selectionLabel(
                      context,
                      selected: selected,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      );
    }
    final foreground = !option.enabled
        ? t.ink3.withValues(alpha: CatchOpacity.disabledControl)
        : selected
        ? t.ink
        : t.ink2;
    final selectedRuleColor = selectedRule ?? t.ink;
    final style = switch (variant) {
      CatchChoiceInputVariant.summary => CatchTextStyles.selectionLabel(
        context,
        selected: selected,
      ),
      CatchChoiceInputVariant.label => CatchTextStyles.tabLabel(
        context,
        selected: selected,
        color: foreground,
      ),
      CatchChoiceInputVariant.mono => CatchTextStyles.monoLabel(
        context,
        color: foreground,
      ),
      CatchChoiceInputVariant.operational => CatchTextStyles.titleS(
        context,
        color: foreground,
      ),
    };
    final label = variant == CatchChoiceInputVariant.mono
        ? option.label.toUpperCase()
        : option.label;

    final textScale = MediaQuery.textScalerOf(context).scale(1);
    final showIcon = option.icon != null && textScale < 1.4;
    final item = Semantics(
      button: true,
      enabled: option.enabled && onTap != null,
      hint: option.disabledReason,
      selected: selected,
      label: option.semanticLabel,
      excludeSemantics: option.semanticLabel != null,
      onTap: option.enabled ? onTap : null,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          excludeFromSemantics: true,
          onTap: option.enabled ? onTap : null,
          borderRadius: BorderRadius.circular(CatchRadius.sm),
          child: AnimatedContainer(
            constraints: BoxConstraints(
              minHeight: CatchPlatformTokens.minimumInteractiveExtent,
              minWidth: CatchPlatformTokens.minimumInteractiveExtent,
            ),
            duration: MediaQuery.disableAnimationsOf(context)
                ? Duration.zero
                : CatchMotion.fast,
            curve: CatchMotion.standardCurve,
            padding: EdgeInsets.symmetric(
              horizontal: variant == CatchChoiceInputVariant.operational
                  ? textScale >= 1.4
                        ? CatchSpacing.s1
                        : CatchSpacing.s2
                  : CatchSpacing.s1,
              vertical: CatchSpacing.s2,
            ),
            decoration: variant == CatchChoiceInputVariant.operational
                ? BoxDecoration(
                    color: selected ? t.surface : Colors.transparent,
                    borderRadius: BorderRadius.circular(CatchRadius.pill),
                    border: Border.all(
                      color: selected ? t.line : Colors.transparent,
                    ),
                    boxShadow: selected ? CatchElevation.card : null,
                  )
                : BoxDecoration(
                    border: Border(
                      bottom: BorderSide(
                        color: showIndicator && selected
                            ? selectedRuleColor
                            : Colors.transparent,
                        width: CatchSpacing.micro2,
                      ),
                    ),
                  ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              children: [
                if (showIcon) ...[
                  Icon(option.icon, size: CatchIconSize.sm, color: foreground),
                  const SizedBox(width: CatchSpacing.s2),
                ],
                Flexible(
                  child: Text(
                    label,
                    key: labelKey,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: style,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
    final disabledReason = option.disabledReason;
    if (option.enabled || disabledReason == null) return item;
    return Tooltip(message: disabledReason, child: item);
  }
}
