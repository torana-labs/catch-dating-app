import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:flutter/widgets.dart';

/// Text roles shared with the web `CatchText`: the six display steps and the
/// function family.
///
/// Each value names the [CatchTextStyles] role it renders, so Flutter and
/// React offer the same role vocabulary.
enum CatchTextVariant {
  displayXs,
  displayS,
  displayM,
  displayL,
  displayXl,
  displayXxl,
  headline,
  titleL,
  sectionTitle,
  titleS,
  bodyLead,
  bodyL,
  bodyM,
  bodyS,
  supporting,
  supportingStrong,
  fieldLabel,
  statusLabel,
  metric;

  /// The [CatchTextStyles] role for this variant, optionally recolored.
  TextStyle style(BuildContext context, {Color? color}) => switch (this) {
    CatchTextVariant.displayXs => CatchTextStyles.displayXs(
      context,
      color: color,
    ),
    CatchTextVariant.displayS => CatchTextStyles.displayS(
      context,
      color: color,
    ),
    CatchTextVariant.displayM => CatchTextStyles.displayM(
      context,
      color: color,
    ),
    CatchTextVariant.displayL => CatchTextStyles.displayL(
      context,
      color: color,
    ),
    CatchTextVariant.displayXl => CatchTextStyles.displayXl(
      context,
      color: color,
    ),
    CatchTextVariant.displayXxl => CatchTextStyles.displayXxl(
      context,
      color: color,
    ),
    CatchTextVariant.headline => CatchTextStyles.headline(
      context,
      color: color,
    ),
    CatchTextVariant.titleL => CatchTextStyles.titleL(context, color: color),
    CatchTextVariant.sectionTitle => CatchTextStyles.sectionTitle(
      context,
      color: color,
    ),
    CatchTextVariant.titleS => CatchTextStyles.titleS(context, color: color),
    CatchTextVariant.bodyLead => CatchTextStyles.bodyLead(
      context,
      color: color,
    ),
    CatchTextVariant.bodyL => CatchTextStyles.bodyL(context, color: color),
    CatchTextVariant.bodyM => CatchTextStyles.bodyM(context, color: color),
    CatchTextVariant.bodyS => CatchTextStyles.bodyS(context, color: color),
    CatchTextVariant.supporting => CatchTextStyles.supporting(
      context,
      color: color,
    ),
    CatchTextVariant.supportingStrong => CatchTextStyles.supportingStrong(
      context,
      color: color,
    ),
    CatchTextVariant.fieldLabel => CatchTextStyles.fieldLabel(
      context,
      color: color,
    ),
    CatchTextVariant.statusLabel => CatchTextStyles.statusLabel(
      context,
      color: color,
    ),
    CatchTextVariant.metric => CatchTextStyles.metric(context, color: color),
  };
}
