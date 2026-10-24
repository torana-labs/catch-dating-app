import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:flutter/widgets.dart';

/// Function-family text roles shared with the web `CatchText`.
///
/// Each value names the [CatchTextStyles] role it renders, so Flutter and
/// React offer the same role vocabulary.
enum CatchTextVariant {
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
