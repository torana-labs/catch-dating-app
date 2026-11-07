part of 'catch_section.dart';

enum _CatchSectionVariant { divided, contained, plain }

/// The supported action hierarchies inside a contained task.
enum CatchSectionEmphasis { primary, secondary, destructive }

/// The renderer's reading of whichever private record a constructor filled.
extension _CatchSectionResolution on CatchSection {
  _SectionCommonConfig get _common =>
      _horizontalConfig?.common ??
      _dividedConfig?.common ??
      _fieldRowsConfig?.common ??
      _containedFieldRowsConfig?.common ??
      _containedConfig?.common ??
      _plainConfig!.common;

  _CatchSectionVariant get _variant =>
      _containedConfig != null || _containedFieldRowsConfig != null
      ? _CatchSectionVariant.contained
      : _plainConfig != null
      ? _CatchSectionVariant.plain
      : _CatchSectionVariant.divided;

  bool get _fieldRows =>
      _fieldRowsConfig != null || _containedFieldRowsConfig != null;
}

/// Closed, renderer-facing records for [CatchSection].
///
/// Dart record literals can be composed from parameters in a const constructor;
/// nested config objects cannot. Keeping one nullable slot per private variant
/// therefore preserves const construction and stable `CatchSection` identity
/// while ensuring public constructors can only populate supported properties.
typedef _SectionCommonConfig = ({
  String? title,
  String? subtitle,
  Object? count,
  Color? titleColor,
  double bodyGap,
});

typedef _DividedSectionConfig = ({
  _SectionCommonConfig common,
  bool first,
  Color? dividerColor,
  double dividerIndent,
  CatchDividerVariant dividerVariant,
  CatchDividerVariant internalDividerVariant,
  bool showInternalDividers,
});

typedef _DividedFieldRowsSectionConfig = ({
  _SectionCommonConfig common,
  bool first,
  CatchDividedFieldInteractionScopeMode? interaction,
});

typedef _ContainedFieldRowsSectionConfig = ({
  _SectionCommonConfig common,
  List<CatchSectionFieldGroup>? groups,
  Set<WidgetState> states,
  CatchSectionHeaderPlacement headerPlacement,
});

typedef _ContainedSectionConfig = ({
  _SectionCommonConfig common,
  bool showInternalDividers,
  Set<WidgetState> states,
});

typedef _PlainSectionConfig = ({
  _SectionCommonConfig common,
  EdgeInsetsGeometry? padding,
  bool showInternalDividers,
});

typedef _HorizontalSectionConfig = ({
  _SectionCommonConfig common,
  int itemCount,
  IndexedWidgetBuilder itemBuilder,
  double? height,
  double spacing,
  CatchRailItemWidth? itemWidth,
  bool showDivider,
  EdgeInsets headerPadding,
  EdgeInsetsGeometry listPadding,
});
