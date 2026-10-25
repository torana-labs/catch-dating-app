import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_contract_field_constraints.dart';
import 'package:catch_ui/src/components/catch_field_copy.dart';
import 'package:catch_ui/src/components/catch_field_motion.dart';
import 'package:catch_ui/src/components/catch_field_status.dart';
import 'package:catch_ui/src/components/catch_field_status_indicator.dart';
import 'package:catch_ui/src/components/catch_toggle_input.dart';
import 'package:catch_ui/src/foundations/catch_icons.dart';
import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:catch_ui/src/primitives/catch_control_surface.dart';
import 'package:flutter/material.dart';

class CatchFieldTrailingRow extends StatelessWidget {
  /// Shared clear-action allocation for the native target and its row slot.
  static BoxConstraints get clearTargetConstraints =>
      CatchControlMetrics.squareConstraints(CatchSpacing.s6);

  factory CatchFieldTrailingRow.custom({
    Key? key,
    required Widget child,
    Color? color,
    double topPadding = CatchSpacing.micro2,
  }) {
    return CatchFieldTrailingRow._(
      key: key,
      topPadding: topPadding,
      builder: (context) {
        final t = CatchTokens.of(context);
        final resolvedColor = color ?? t.ink3;
        return IconTheme(
          data: IconThemeData(color: resolvedColor, size: CatchIconSize.md),
          child: DefaultTextStyle.merge(
            style: CatchTextStyles.bodyLead(context, color: resolvedColor),
            child: child,
          ),
        );
      },
    );
  }

  /// Native text-entry suffix with the field's existing clear/fallback behavior.
  ///
  /// The field keeps InputDecoration.suffixIcon null when neither clear nor
  /// custom content is requested, so an absent suffix reserves no native slot.
  factory CatchFieldTrailingRow.inputSuffix({
    Key? key,
    required TextEditingController controller,
    required String clearTooltip,
    Widget? actions,
    Widget? trailing,
    bool showClearButton = false,
    ValueChanged<String>? onChanged,
  }) => CatchFieldTrailingRow._(
    key: key,
    topPadding: 0,
    builder: (context) {
      final t = CatchTokens.of(context);
      final child = actions ?? trailing;
      Widget? fallback;
      if (child != null) {
        fallback = IconTheme(
          data: IconThemeData(color: t.ink3, size: CatchIconSize.md),
          child: DefaultTextStyle.merge(
            style: CatchTextStyles.bodyLead(context, color: t.ink3),
            child: child,
          ),
        );
        if (actions != null) {
          fallback = Padding(
            padding: const EdgeInsets.only(left: CatchSpacing.s2),
            child: fallback,
          );
        }
      }
      if (!showClearButton) return fallback ?? const SizedBox.shrink();
      return ValueListenableBuilder<TextEditingValue>(
        valueListenable: controller,
        builder: (_, value, _) {
          if (value.text.isEmpty) return fallback ?? const SizedBox.shrink();
          return IconButton(
            tooltip: clearTooltip,
            icon: Icon(CatchIcons.closeRounded, size: CatchIconSize.xs),
            onPressed: () {
              controller.clear();
              onChanged?.call('');
            },
          );
        },
      );
    },
  );

  factory CatchFieldTrailingRow.valueText({
    Key? key,
    required String text,
    int maxLines = 1,
    double topPadding = CatchSpacing.micro2,
  }) {
    return CatchFieldTrailingRow._(
      key: key,
      topPadding: topPadding,
      builder: (context) {
        final t = CatchTokens.of(context);
        return ConstrainedBox(
          constraints: const BoxConstraints(
            maxWidth: CatchLayout.fieldTrailingValueMaxWidth,
          ),
          child: Text(
            text,
            textAlign: TextAlign.right,
            maxLines: maxLines,
            overflow: TextOverflow.ellipsis,
            style: CatchTextStyles.fieldRowValue(
              context,
              color: t.ink2,
              fontWeight: FontWeight.w400,
            ),
          ),
        );
      },
    );
  }

  factory CatchFieldTrailingRow.fixedChevron({
    Key? key,
    Color? color,
    double topPadding = CatchSpacing.micro2,
  }) => CatchFieldTrailingRow._(
    key: key,
    topPadding: topPadding,
    builder: (context) => Icon(
      CatchIcons.chevronRightRounded,
      size: CatchFieldTokens.disclosureGlyphExtent,
      color: color ?? CatchTokens.of(context).ink3,
    ),
  );

  factory CatchFieldTrailingRow.rotatingChevron({
    Key? key,
    required bool open,
    Color? color,
    double topPadding = CatchSpacing.micro2,
  }) => CatchFieldTrailingRow._(
    key: key,
    topPadding: topPadding,
    builder: (context) => AnimatedRotation(
      turns: open ? 0.5 : 0,
      duration: catchFieldMotionDuration(context, CatchMotion.base),
      curve: CatchMotion.standardCurve,
      child: Icon(
        CatchIcons.expandMoreRounded,
        size: CatchFieldTokens.disclosureGlyphExtent,
        color: color ?? CatchTokens.of(context).ink3,
      ),
    ),
  );

  factory CatchFieldTrailingRow.toggle({
    required CatchFieldCopy copy,
    Key? key,
    required bool value,
    required ValueChanged<bool>? onChanged,
    CatchContractFieldConstraints? contract,
    String? contractExemption,
    String? semanticLabel,
    CatchFieldStatus status = CatchFieldStatus.idle,
    double topPadding = CatchSpacing.micro2,
  }) => CatchFieldTrailingRow._(
    key: key,
    topPadding: topPadding,
    builder: (context) => Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        CatchFieldStatusIndicator(
          savingSemanticLabel: copy.savingSemanticLabel,
          savedSemanticLabel: copy.savedSemanticLabel,
          status: status,
          includeTrailingGap: true,
        ),
        CatchToggleInput.field(
          value: value,
          contract: contract,
          contractExemption: contractExemption,
          semanticLabel: semanticLabel,
          onChanged: onChanged,
        ),
      ],
    ),
  );

  factory CatchFieldTrailingRow.status({
    required CatchFieldCopy copy,
    Key? key,
    required CatchFieldStatus status,
    double topPadding = 0,
  }) => CatchFieldTrailingRow._(
    key: key,
    topPadding: topPadding,
    builder: (context) => CatchFieldStatusIndicator(
      savingSemanticLabel: copy.savingSemanticLabel,
      savedSemanticLabel: copy.savedSemanticLabel,
      status: status,
    ),
  );

  factory CatchFieldTrailingRow.clear({
    Key? key,
    required String tooltip,
    required VoidCallback onPressed,
    double topPadding = CatchSpacing.micro2,
  }) => CatchFieldTrailingRow._(
    key: key,
    topPadding: topPadding,
    builder: (context) => IconButton(
      tooltip: tooltip,
      visualDensity: VisualDensity.standard,
      padding: EdgeInsets.zero,
      constraints: clearTargetConstraints,
      style: IconButton.styleFrom(
        minimumSize: clearTargetConstraints.smallest,
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      ),
      icon: Icon(
        CatchIcons.clearCircle,
        size: CatchFieldTokens.largeGlyphExtent,
        color: CatchTokens.of(context).ink3,
      ),
      onPressed: onPressed,
    ),
  );

  factory CatchFieldTrailingRow.valid({
    Key? key,
    double topPadding = CatchSpacing.micro2,
  }) => CatchFieldTrailingRow._(
    key: key,
    topPadding: topPadding,
    builder: (context) => Icon(
      CatchIcons.checkCircle,
      size: CatchIconSize.md,
      color: CatchTokens.of(context).success,
    ),
  );

  const CatchFieldTrailingRow._({
    super.key,
    required this.builder,
    this.topPadding = CatchSpacing.micro2,
  });

  final WidgetBuilder builder;
  final double topPadding;

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.only(top: topPadding),
    child: builder(context),
  );
}
