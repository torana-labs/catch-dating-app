// Public constructor names deliberately differ from private storage.
// ignore_for_file: prefer_initializing_formals

import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_button.dart';
import 'package:catch_ui/src/components/catch_content_section.dart';
import 'package:catch_ui/src/components/catch_dependent_row_section.dart';
import 'package:catch_ui/src/components/catch_divided_field_interaction_scope.dart';
import 'package:catch_ui/src/components/catch_divided_field_interaction_scope_mode.dart';
import 'package:catch_ui/src/components/catch_empty_state.dart';
import 'package:catch_ui/src/components/catch_empty_state_variant.dart';
import 'package:catch_ui/src/components/catch_field.dart';
import 'package:catch_ui/src/components/catch_field_geometry_scope.dart';
import 'package:catch_ui/src/components/catch_field_geometry_scope_mode.dart';
import 'package:catch_ui/src/components/catch_field_geometry_scope_variant.dart';
import 'package:catch_ui/src/components/catch_horizontal_scroll_view.dart';
import 'package:catch_ui/src/components/catch_row_section.dart';
import 'package:catch_ui/src/components/catch_section_body.dart';
import 'package:catch_ui/src/components/catch_section_body_mode.dart';
import 'package:catch_ui/src/components/catch_section_field_group.dart';
import 'package:catch_ui/src/components/catch_section_header.dart';
import 'package:catch_ui/src/components/catch_section_header_placement.dart';
import 'package:catch_ui/src/components/catch_section_surface.dart';
import 'package:catch_ui/src/foundations/catch_icons.dart';
import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:catch_ui/src/primitives/catch_divider.dart';
import 'package:catch_ui/src/primitives/catch_kicker_text.dart';
import 'package:catch_ui/src/primitives/catch_surface.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

part 'catch_section_render.dart';
part 'catch_section_configs.dart';
part 'catch_action_module.dart';
part 'catch_collection_section.dart';

enum _CatchSectionVariant { divided, contained, plain }

/// The supported action hierarchies inside a contained task.
enum CatchSectionEmphasis { primary, secondary, destructive }

/// Design-system `Section`: the canonical primitive for grouping information.
///
/// Compose these inside `CatchSectionList` with no ad-hoc gaps. Optional
/// title colors are caller-resolved. Contained recipes pass explicit focus/error
/// states to `CatchSectionSurface`, which owns their precedence and rendering.
class CatchSection extends StatelessWidget {
  const CatchSection.divided({
    super.key,
    String? title,
    Object? count,
    this.trailing,
    bool first = false,
    Color? dividerColor,
    double dividerIndent = 0,
    CatchDividerVariant dividerVariant = CatchDividerVariant.section,
    CatchDividerVariant internalDividerVariant = CatchDividerVariant.fieldRow,
    Color? titleColor,
    double bodyGap = CatchSpacing.s3,
    bool showInternalDividers = true,
    this.children,
    this.child,
  }) : _rowSection = null,
       footer = null,
       assert(child != null || children != null),
       assert(child == null || children == null),
       _dividedConfig = (
         common: (
           title: title,
           subtitle: null,
           count: count,
           titleColor: titleColor,
           bodyGap: bodyGap,
         ),
         first: first,
         dividerColor: dividerColor,
         dividerIndent: dividerIndent,
         dividerVariant: dividerVariant,
         internalDividerVariant: internalDividerVariant,
         showInternalDividers: showInternalDividers,
       ),
       _fieldRowsConfig = null,
       _containedFieldRowsConfig = null,
       _containedConfig = null,
       _plainConfig = null,
       _horizontalConfig = null;

  const CatchSection.fieldRows({
    super.key,
    String? title,
    Object? count,
    this.trailing,
    Color? titleColor,
    bool first = false,
    this.footer,
    CatchDividedFieldInteractionScopeMode? interaction,
    this.children,
    this.child,
  }) : _rowSection = null,
       assert(child != null || children != null),
       assert(child == null || children == null),
       _dividedConfig = null,
       _fieldRowsConfig = (
         common: (
           title: title,
           subtitle: null,
           count: count,
           titleColor: titleColor,
           bodyGap: CatchFieldTokens.sectionRuleGap,
         ),
         first: first,
         interaction: interaction,
       ),
       _containedFieldRowsConfig = null,
       _containedConfig = null,
       _plainConfig = null,
       _horizontalConfig = null;

  /// An always-visible group of wrapping choices within an inset content lane.
  /// Owns the muted heading, rule, and clearance above the chip surfaces.
  /// Unlike field rows, bare choice inputs do not provide vertical row padding.
  factory CatchSection.choiceGroup({
    Key? key,
    required String title,
    bool first = false,
    required Widget child,
  }) => CatchSection.fieldRows(
    key: key,
    title: title,
    first: first,
    child: Padding(
      padding: const EdgeInsets.only(top: CatchFieldTokens.rowVerticalPadding),
      child: child,
    ),
  );

  /// Contained FieldSection variant from the form-field handoff. Unlike the
  /// generic card constructor, this surface clips field rows, owns a 1px
  /// line/ink focus border, and never adds generic card shadows. Its optional
  /// title, count, and trailing action form an outside group header by
  /// default, so the outline begins with the first row. Set [headerPlacement]
  /// to [CatchSectionHeaderPlacement.inside] when the label belongs to
  /// the bounded field group itself; that mode places the header inside the
  /// outline and gives it the same padded section rule as [fieldRows].
  const CatchSection.containedFieldRows({
    super.key,
    String? title,
    Object? count,
    this.trailing,
    this.footer,
    Set<WidgetState> states = const {},
    CatchSectionHeaderPlacement headerPlacement =
        CatchSectionHeaderPlacement.outside,
    this.children,
    this.child,
  }) : _rowSection = null,
       assert(child != null || children != null),
       assert(child == null || children == null),
       _dividedConfig = null,
       _fieldRowsConfig = null,
       _containedFieldRowsConfig = (
         common: (
           title: title,
           subtitle: null,
           count: count,
           titleColor: null,
           bodyGap: CatchSpacing.s2,
         ),
         groups: null,

         states: states,
         headerPlacement: headerPlacement,
       ),
       _containedConfig = null,
       _plainConfig = null,
       _horizontalConfig = null;

  /// One outlined collection containing one or more labelled field groups.
  ///
  /// This is the grouped sibling of [containedFieldRows]. It preserves one
  /// section-owned perimeter while giving each internal group its own kicker
  /// and inset boundary. It is intended for one collection of mutually related
  /// actions or choices, not for nesting independent cards inside a card.
  const CatchSection.containedFieldGroups({
    super.key,
    required List<CatchSectionFieldGroup> groups,
    this.footer,
    Set<WidgetState> states = const {},
  }) : _rowSection = null,
       trailing = null,
       children = null,
       child = null,
       _dividedConfig = null,
       _fieldRowsConfig = null,
       _containedFieldRowsConfig = (
         common: (
           title: null,
           subtitle: null,
           count: null,
           titleColor: null,
           bodyGap: CatchSpacing.s2,
         ),
         groups: groups,

         states: states,
         headerPlacement: CatchSectionHeaderPlacement.inside,
       ),
       _containedConfig = null,
       _plainConfig = null,
       _horizontalConfig = null;

  /// One quiet frame around a related interactive collection.
  /// Typography, padding, boundary and elevation are owned here.
  const CatchSection.contained({
    super.key,
    String? title,
    String? subtitle,
    this.trailing,
    Object? count,
    bool showInternalDividers = true,
    Set<WidgetState> states = const {},
    this.children,
    this.child,
  }) : _rowSection = null,
       footer = null,
       assert(child != null || children != null),
       assert(child == null || children == null),
       _dividedConfig = null,
       _fieldRowsConfig = null,
       _containedFieldRowsConfig = null,
       _containedConfig = (
         common: (
           title: title,
           subtitle: subtitle,
           count: count,
           titleColor: null,
           bodyGap: CatchSpacing.s3,
         ),
         showInternalDividers: showInternalDividers,
         states: states,
       ),
       _plainConfig = null,
       _horizontalConfig = null;

  const CatchSection.plain({
    super.key,
    String? title,
    String? subtitle,
    this.trailing,
    Object? count,
    Color? titleColor,
    double bodyGap = CatchSpacing.s3,
    EdgeInsetsGeometry? padding,
    bool showInternalDividers = true,
    this.children,
    this.child,
  }) : _rowSection = null,
       footer = null,
       assert(child != null || children != null),
       assert(child == null || children == null),
       _dividedConfig = null,
       _fieldRowsConfig = null,
       _containedFieldRowsConfig = null,
       _containedConfig = null,
       _plainConfig = (
         common: (
           title: title,
           subtitle: subtitle,
           count: count,
           titleColor: titleColor,
           bodyGap: bodyGap,
         ),
         padding: padding,
         showInternalDividers: showInternalDividers,
       ),
       _horizontalConfig = null;

  /// A titled horizontal collection, embedded or with page-owned gutters.
  /// [footer] is the final scrollable item, such as a "More" action.
  const CatchSection.horizontal({
    super.key,
    required String title,
    required int itemCount,
    required IndexedWidgetBuilder itemBuilder,
    this.footer,
    bool fullBleed = false,
    bool? showDivider,
    double? height = CatchLayout.horizontalRailHeight,
    double spacing = CatchSpacing.s3,
    CatchRailItemWidth? itemWidth,
    EdgeInsets? headerPadding,
    EdgeInsetsGeometry? listPadding,
  }) : _rowSection = null,
       trailing = null,
       children = null,
       child = null,
       _dividedConfig = null,
       _fieldRowsConfig = null,
       _containedFieldRowsConfig = null,
       _containedConfig = null,
       _plainConfig = null,
       _horizontalConfig = (
         common: (
           title: title,
           subtitle: null,
           count: null,
           titleColor: null,
           bodyGap: 0,
         ),
         itemCount: itemCount,
         itemBuilder: itemBuilder,
         height: height,
         spacing: spacing,
         itemWidth: itemWidth,
         showDivider: showDivider ?? fullBleed,
         headerPadding:
             headerPadding ??
             (fullBleed ? CatchInsets.sectionHeader : EdgeInsets.zero),
         listPadding:
             listPadding ??
             (fullBleed ? CatchInsets.pageHorizontal : EdgeInsets.zero),
       );

  /// Full-plane ordinary rows. Child layouts supply no gestures or geometry.
  factory CatchSection.rows({
    Key? key,
    String? title,
    Object? count,
    Widget? trailing,
    required List<CatchField> children,
  }) => CatchSection._rows(
    key: key,
    title: title,
    rowSection: CatchRowSection(
      title: title,
      count: count,
      trailing: trailing,
      children: children,
    ),
  );

  /// Box placeholders with the same Field and Section geometry as [rows].
  factory CatchSection.loadingRows({
    Key? key,
    String? title,
    Object? count,
    Widget? trailing,
    required List<CatchFieldLayout> layouts,
    bool navigable = true,
  }) => CatchSection._rows(
    key: key,
    title: title,
    rowSection: CatchRowSection(
      title: title,
      count: count,
      trailing: trailing,
      loading: true,
      children: [
        for (final layout in layouts)
          CatchField.loading(content: layout, navigable: navigable),
      ],
    ),
  );

  /// A collection toolbar: ordering first, filters last, with owned boundaries.
  /// No widget slots: callers cannot reverse the roles or insert unrelated actions.
  factory CatchSection.controls({
    Key? key,
    required String sortLabel,
    VoidCallback? onSort,
    required String filtersLabel,
    required VoidCallback? onFilters,
    Key? sortKey,
    Key? filtersKey,
    String? activeFilters,
    String? clearLabel,
    VoidCallback? onClear,
  }) {
    assert((activeFilters == null) == (clearLabel == null));
    assert((activeFilters == null) == (onClear == null));
    return CatchSection._rows(
      key: key,
      rowSection: CatchContentSection(
        child: Builder(
          builder: (context) => Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const CatchDivider.section(),
              Padding(
                padding: const EdgeInsets.symmetric(vertical: CatchSpacing.s3),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Wrap(
                      alignment: WrapAlignment.spaceBetween,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: CatchSpacing.s4,
                      runSpacing: CatchSpacing.s2,
                      children: [
                        if (onSort == null)
                          Text(
                            sortLabel,
                            key: sortKey,
                            style: CatchTextStyles.supporting(context),
                          )
                        else
                          CatchButton.command(
                            key: sortKey,
                            label: sortLabel,
                            trailing: Icon(CatchIcons.expand),
                            onPressed: onSort,
                          ),
                        CatchButton.command(
                          key: filtersKey,
                          label: filtersLabel,
                          leading: Icon(CatchIcons.filters),
                          onPressed: onFilters,
                        ),
                      ],
                    ),
                    if (activeFilters case final summary?)
                      Padding(
                        padding: const EdgeInsets.only(top: CatchSpacing.s2),
                        child: Wrap(
                          alignment: WrapAlignment.spaceBetween,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          spacing: CatchSpacing.s4,
                          runSpacing: CatchSpacing.s2,
                          children: [
                            Text(
                              summary,
                              style: CatchTextStyles.supporting(context),
                            ),
                            CatchButton.command(
                              label: clearLabel!,
                              onPressed: onClear,
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
              const CatchDivider.section(),
            ],
          ),
        ),
      ),
    );
  }

  /// One rounded exterior containing full-width internal row bands.
  factory CatchSection.containedRows({
    Key? key,
    String? title,
    Object? count,
    Widget? trailing,
    required List<CatchField> children,
  }) => CatchSection._rows(
    key: key,
    title: title,
    rowSection: CatchRowSection(
      title: title,
      count: count,
      trailing: trailing,
      contained: true,
      children: children,
    ),
  );

  /// Rounded collection placeholders with the same Section and Field
  /// geometry as [containedRows]. The value layout is the only variable.
  factory CatchSection.containedLoadingRows({
    Key? key,
    String? title,
    Object? count,
    Widget? trailing,
    required List<CatchFieldLayout> layouts,
    bool navigable = true,
  }) => CatchSection._rows(
    key: key,
    title: title,
    rowSection: CatchRowSection(
      title: title,
      count: count,
      trailing: trailing,
      contained: true,
      loading: true,
      children: [
        for (final layout in layouts)
          CatchField.loading(content: layout, navigable: navigable),
      ],
    ),
  );

  /// A decision and its applicable configuration inside one rounded perimeter.
  ///
  /// The section occupies its form lane. The dependent area attaches with a
  /// subtle tint, without sibling dividers, indentation, or another outline.
  /// Callers provide only applicable fields; draft values and persistence stay
  /// feature-owned. Unlike a disclosure, collapsing the control's editor does
  /// not hide an applicable dependent branch.
  factory CatchSection.dependentFieldRows({
    Key? key,
    required CatchField leading,
    List<CatchField> children = const [],
    Widget? footer,
    Set<WidgetState> states = const {},
  }) => CatchSection._rows(
    key: key,
    rowSection: CatchDependentRowSection(
      leading: leading,
      footer: footer,
      states: states,
      children: children,
    ),
  );

  /// Package-owned form adapter; external features use CatchFormList.
  @internal
  factory CatchSection.formRows({
    String? title,
    Object? count,
    Widget? trailing,
    required List<Widget> children,
  }) => CatchSection._rows(
    title: title,
    rowSection: CatchRowSection.form(
      title: title,
      count: count,
      trailing: trailing,
      leadingInset: CatchFieldTokens.textLaneInset,
      children: children,
    ),
  );

  /// One self-contained task: heading, optional facts, explanation, action.
  /// [meta] supplies facts above the explanation; [footer] supplies support
  /// below the action. The recipe owns their spacing and containment.
  /// A destructive action does not tint the whole module. Feedback belongs in
  /// `CatchBanner`, and ordinary information belongs in [CatchSection.content].
  factory CatchSection.action({
    Key? key,
    required String title,
    required String message,
    required String actionLabel,
    required VoidCallback? onAction,
    Key? actionKey,
    Widget? meta,
    IconData? icon,
    CatchSectionEmphasis actionEmphasis = CatchSectionEmphasis.primary,
    CatchButtonStatus actionStatus = CatchButtonStatus.idle,
    Widget? footer,
  }) => CatchSection._rows(
    key: key,
    title: title,
    rowSection: Builder(
      builder: (context) => _buildActionModule(
        context,
        title: title,
        message: message,
        actionLabel: actionLabel,
        onAction: onAction,
        actionKey: actionKey,
        details: meta,
        icon: icon,
        actionEmphasis: actionEmphasis,
        actionStatus: actionStatus,
        feedback: footer,
      ),
    ),
  );

  /// A content-sized collection. Section owns successful-empty presentation,
  /// description, record separators and the optional full-width command.
  factory CatchSection.collection({
    Key? key,
    required String title,
    String? message,
    String? emptyTitle,
    required String emptyMessage,
    IconData? emptyIcon,
    required List<Widget> children,
    Widget? leading,
    String? actionLabel,
    VoidCallback? onAction,
    CatchButtonStatus actionStatus = CatchButtonStatus.idle,
    Widget? footer,
  }) => CatchSection._rows(
    key: key,
    title: title,
    rowSection: Builder(
      builder: (context) => _buildCollectionModule(
        context,
        title: title,
        message: message,
        emptyTitle: emptyTitle,
        emptyMessage: emptyMessage,
        emptyIcon: emptyIcon,
        children: children,
        leading: leading,
        actionLabel: actionLabel,
        onAction: onAction,
        actionStatus: actionStatus,
        footer: footer,
      ),
    ),
  );

  /// A quiet section-level status; it shares the action/collection anatomy.
  factory CatchSection.status({
    Key? key,
    required String title,
    required String message,
    IconData? icon,
    Widget? meta,
  }) => CatchSection._rows(
    key: key,
    title: title,
    rowSection: Builder(
      builder: (context) => _buildSectionModule(
        context,
        title: title,
        message: message,
        icon: icon,
        details: meta,
      ),
    ),
  );

  /// Media, metrics or explanatory content with a canonical header boundary.
  /// Ordinary Fields belong in [CatchSection.rows] instead.
  factory CatchSection.content({
    Key? key,
    String? title,
    Object? count,
    Widget? trailing,
    required Widget child,
  }) => CatchSection._rows(
    key: key,
    title: title,
    rowSection: CatchContentSection(
      title: title,
      count: count,
      trailing: trailing,
      child: child,
    ),
  );

  /// A lazy ordinary-row section for a full-width page or pane viewport.
  factory CatchSection.sliverRows({
    Key? key,
    String? title,
    Object? count,
    Widget? trailing,
    required int itemCount,
    required CatchField Function(BuildContext, int) itemBuilder,
    int? Function(Key)? indexForKeyBuilder,
  }) => CatchSection._rows(
    key: key,
    title: title,
    rowSection: CatchRowSection.sliver(
      title: title,
      count: count,
      trailing: trailing,
      itemCount: itemCount,
      itemBuilder: itemBuilder,
      indexForKeyBuilder: indexForKeyBuilder,
    ),
  );

  /// Lazy placeholders rendered through the same Field and Section geometry
  /// as [sliverRows]. Only the passive value layout is caller-configurable.
  factory CatchSection.sliverLoadingRows({
    Key? key,
    String? title,
    Object? count,
    Widget? trailing,
    int itemCount = 3,
    required CatchFieldLayout Function(BuildContext, int) layoutBuilder,
    bool navigable = true,
  }) => CatchSection._rows(
    key: key,
    title: title,
    rowSection: CatchRowSection.sliver(
      title: title,
      count: count,
      trailing: trailing,
      itemCount: itemCount,
      loading: true,
      itemBuilder: (context, index) => CatchField.loading(
        content: layoutBuilder(context, index),
        navigable: navigable,
      ),
    ),
  );

  const CatchSection._rows({
    super.key,
    String? title,
    required Widget rowSection,
  }) : _rowSection = rowSection,
       trailing = null,
       children = null,
       child = null,
       footer = null,
       _dividedConfig = null,
       _fieldRowsConfig = null,
       _containedFieldRowsConfig = null,
       _containedConfig = null,
       _horizontalConfig = null,
       _plainConfig = (
         common: (
           title: title,
           subtitle: null,
           count: null,
           titleColor: null,
           bodyGap: 0,
         ),
         padding: null,
         showInternalDividers: false,
       );

  final Widget? _rowSection;

  final _DividedSectionConfig? _dividedConfig;
  final _DividedFieldRowsSectionConfig? _fieldRowsConfig;
  final _ContainedFieldRowsSectionConfig? _containedFieldRowsConfig;
  final _ContainedSectionConfig? _containedConfig;
  final _PlainSectionConfig? _plainConfig;
  final _HorizontalSectionConfig? _horizontalConfig;

  _SectionCommonConfig get _common =>
      _horizontalConfig?.common ??
      _dividedConfig?.common ??
      _fieldRowsConfig?.common ??
      _containedFieldRowsConfig?.common ??
      _containedConfig?.common ??
      _plainConfig!.common;

  String? get title => _common.title;
  String? get subtitle => _common.subtitle;
  final Widget? trailing;
  Object? get count => _common.count;
  Color? get titleColor => _common.titleColor;
  double get bodyGap => _common.bodyGap;
  final List<Widget>? children;
  final Widget? child;

  bool get first => _dividedConfig?.first ?? _fieldRowsConfig?.first ?? false;
  _CatchSectionVariant get _variant =>
      _containedConfig != null || _containedFieldRowsConfig != null
      ? _CatchSectionVariant.contained
      : _plainConfig != null
      ? _CatchSectionVariant.plain
      : _CatchSectionVariant.divided;
  Color? get dividerColor => _dividedConfig?.dividerColor;
  double? get dividerIndent =>
      _dividedConfig?.dividerIndent ??
      (_fieldRowsConfig != null || _containedFieldRowsConfig != null
          ? null
          : 0);
  CatchDividerVariant get dividerVariant =>
      _dividedConfig?.dividerVariant ?? CatchDividerVariant.section;
  CatchDividerVariant get internalDividerVariant =>
      _dividedConfig?.internalDividerVariant ??
      (_fieldRowsConfig != null || _containedFieldRowsConfig != null
          ? CatchDividerVariant.fieldSection
          : CatchDividerVariant.fieldRow);
  EdgeInsetsGeometry? get padding => _containedFieldRowsConfig != null
      ? EdgeInsets.zero
      : _plainConfig?.padding;
  bool get showInternalDividers =>
      _dividedConfig?.showInternalDividers ??
      _containedConfig?.showInternalDividers ??
      _plainConfig?.showInternalDividers ??
      true;
  final Widget? footer;

  /// Explicit section interaction/error states; error wins over focus.
  Set<WidgetState> get states =>
      _containedFieldRowsConfig?.states ?? _containedConfig?.states ?? const {};
  bool get _fieldRows =>
      _fieldRowsConfig != null || _containedFieldRowsConfig != null;
  CatchSectionHeaderPlacement get fieldHeaderPlacement =>
      _containedFieldRowsConfig?.headerPlacement ??
      CatchSectionHeaderPlacement.outside;
  List<CatchSectionFieldGroup>? get fieldGroups =>
      _containedFieldRowsConfig?.groups;
  CatchDividedFieldInteractionScopeMode? get dividedFieldInteraction =>
      _fieldRowsConfig?.interaction;

  @override
  Widget build(BuildContext context) => _renderSection(context);
}
