import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:flutter/widgets.dart';

/// The pre-redesign text roles: the six display steps and the function family.
///
/// Each value names the [CatchTextStyles] role it renders. The web
/// `CatchLegacyText` offers the same vocabulary.
enum CatchLegacyTextVariant {
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
    CatchLegacyTextVariant.displayXs => CatchTextStyles.displayXs(
      context,
      color: color,
    ),
    CatchLegacyTextVariant.displayS => CatchTextStyles.displayS(
      context,
      color: color,
    ),
    CatchLegacyTextVariant.displayM => CatchTextStyles.displayM(
      context,
      color: color,
    ),
    CatchLegacyTextVariant.displayL => CatchTextStyles.displayL(
      context,
      color: color,
    ),
    CatchLegacyTextVariant.displayXl => CatchTextStyles.displayXl(
      context,
      color: color,
    ),
    CatchLegacyTextVariant.displayXxl => CatchTextStyles.displayXxl(
      context,
      color: color,
    ),
    CatchLegacyTextVariant.headline => CatchTextStyles.headline(
      context,
      color: color,
    ),
    CatchLegacyTextVariant.titleL => CatchTextStyles.titleL(
      context,
      color: color,
    ),
    CatchLegacyTextVariant.sectionTitle => CatchTextStyles.sectionTitle(
      context,
      color: color,
    ),
    CatchLegacyTextVariant.titleS => CatchTextStyles.titleS(
      context,
      color: color,
    ),
    CatchLegacyTextVariant.bodyLead => CatchTextStyles.bodyLead(
      context,
      color: color,
    ),
    CatchLegacyTextVariant.bodyL => CatchTextStyles.bodyL(
      context,
      color: color,
    ),
    CatchLegacyTextVariant.bodyM => CatchTextStyles.bodyM(
      context,
      color: color,
    ),
    CatchLegacyTextVariant.bodyS => CatchTextStyles.bodyS(
      context,
      color: color,
    ),
    CatchLegacyTextVariant.supporting => CatchTextStyles.supporting(
      context,
      color: color,
    ),
    CatchLegacyTextVariant.supportingStrong => CatchTextStyles.supportingStrong(
      context,
      color: color,
    ),
    CatchLegacyTextVariant.fieldLabel => CatchTextStyles.fieldLabel(
      context,
      color: color,
    ),
    CatchLegacyTextVariant.statusLabel => CatchTextStyles.statusLabel(
      context,
      color: color,
    ),
    CatchLegacyTextVariant.metric => CatchTextStyles.metric(
      context,
      color: color,
    ),
  };
}
