import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/routing/shell/adaptive_tab_scaffold.dart';
import 'package:catch_dating_app/routing/shell/app_shell.dart'
    show AppShellSideNavigation;
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/foundation.dart' show setEquals;
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/contract_preview.dart';
import '../../support/geometry_preview.dart';

@widgetbook.UseCase(
  name: 'Responsive page contexts',
  type: CatchSection,
  path: '[Geometry system]',
)
Widget responsivePageContextMatrix(BuildContext context) {
  return widgetbookGeometryPage(
    context,
    title: 'Responsive page contexts',
    contractIds: const [
      'catch.screen_body',
      'catch.section_stack',
      'catch.section',
      'catch.top_bar',
      'catch.tab_bar',
    ],
    principles: const [
      'The shell chooses bottom, rail, or sidebar navigation from the full viewport width.',
      'The page chooses centered or multi-column composition from its remaining local width.',
      'Whole sections move between columns; field geometry remains unchanged.',
      'Split-screen widths return to one column without a tablet-only override.',
    ],
    children: [
      _mixedSectionGeometryStudy(context),
      _keyboardFocusTreatmentStudy(context),
      _responsivePageContextSpecimen(
        context,
        label: 'Compact phone · centered single column',
        description:
            '390 × 640. A floating bottom bar publishes its obstruction while the form remains one readable column.',
        viewportWidth: _compactPhoneViewportWidth,
        viewportHeight: _compactViewportHeight,
        platform: TargetPlatform.iOS,
        composition: CatchSectionListMode.centered,
      ),
      _responsivePageContextSpecimen(
        context,
        label: 'Tablet portrait · centered single column',
        description:
            '720 × 640. The shell moves navigation to a rail; the settings form stays centered and capped at the production content width.',
        viewportWidth: _tabletPortraitViewportWidth,
        viewportHeight: _compactViewportHeight,
        platform: TargetPlatform.android,
        composition: CatchSectionListMode.centered,
      ),
      _responsivePageContextSpecimen(
        context,
        label: 'Tablet workspace · explicit two-column sections',
        description:
            '820 × 660. Independent sections may form two columns, but no individual field section is split.',
        viewportWidth: _tabletWorkspaceViewportWidth,
        viewportHeight: _tabletViewportHeight,
        platform: TargetPlatform.android,
        composition: CatchSectionListMode.adaptiveTwoColumn,
      ),
      _responsivePageContextSpecimen(
        context,
        label: 'Expanded viewport · sidebar and two-column sections',
        description:
            '1180 × 700. The shell owns the wider sidebar while the page lays out two bounded section columns in the remaining space.',
        viewportWidth: _expandedViewportWidth,
        viewportHeight: _expandedViewportHeight,
        platform: TargetPlatform.android,
        composition: CatchSectionListMode.adaptiveTwoColumn,
      ),
      _responsivePageContextSpecimen(
        context,
        label: 'Narrow split screen · automatic one-column fallback',
        description:
            '540 × 640. The same two-column page intent collapses at compact local width and returns navigation to the bottom edge.',
        viewportWidth: _splitScreenViewportWidth,
        viewportHeight: _compactViewportHeight,
        platform: TargetPlatform.iOS,
        composition: CatchSectionListMode.adaptiveTwoColumn,
      ),
    ],
  );
}

Widget _mixedSectionGeometryStudy(BuildContext context) {
  return widgetbookGeometrySpecimen(
    context,
    label: 'Confirmed divided-section interaction styles',
    description:
        'Full bleed is the default for divided field sections; the rounded tile remains an explicit section-level alternative. Tap Host or Reminder timing to compare them with synchronized state and animation.',
    child: const _MixedSectionInteractionComparison(),
  );
}

Widget _keyboardFocusTreatmentStudy(BuildContext context) {
  return widgetbookGeometrySpecimen(
    context,
    label: 'Confirmed · full-bleed keyboard focus indicator',
    description:
        'Press Tab until Reminder timing is focused. The production field keeps the accepted full-bleed tint and adds a 2 px inset perimeter inside the interaction-plane edge.',
    child: LayoutBuilder(
      builder: (context, constraints) {
        final comparisonWidth = constraints.maxWidth
            .clamp(0, widgetbookGeometryComponentWidth)
            .toDouble();
        return _keyboardFocusTreatmentSample(
          context,
          width: comparisonWidth,
          label: 'Inset perimeter',
          description:
              'The full interaction plane owns one continuous focus ring; the row does not add a second local outline.',
        );
      },
    ),
  );
}

Widget _keyboardFocusTreatmentSample(
  BuildContext context, {
  required double width,
  required String label,
  required String description,
}) {
  return widgetbookGeometrySectionHeaderComparison(
    context,
    width: width,
    label: label,
    description: description,
    child: CatchSurface(
      tone: CatchSurfaceTone.raised,
      borderRole: CatchBorderRole.separator,
      radius: CatchRadius.lg,
      clipBehavior: Clip.antiAlias,
      child: CatchSectionList.inset(
        emptyStateOmitted: true,
        padding: CatchInsets.pageBody,
        children: [
          CatchSection.fieldRows(
            title: 'Notifications',
            first: true,
            interaction: CatchDividedFieldInteractionScopeMode.fullBleed,
            children: [
              CatchField.nav(
                copy: catchFieldCopy(context.l10n),
                title: 'Reminder timing',
                body: 'Two hours before',
                icon: CatchIcons.time,
                onTap: widgetbookNoop,
              ),
              CatchField.nav(
                copy: catchFieldCopy(context.l10n),
                title: 'Delivery',
                body: 'Push and email',
                icon: CatchIcons.notifications,
                onTap: widgetbookNoop,
              ),
            ],
          ),
        ],
      ),
    ),
  );
}

class _MixedSectionInteractionComparison extends StatefulWidget {
  const _MixedSectionInteractionComparison();

  @override
  State<_MixedSectionInteractionComparison> createState() =>
      _MixedSectionInteractionComparisonState();
}

class _MixedSectionInteractionComparisonState
    extends State<_MixedSectionInteractionComparison> {
  bool _containedOpen = false;
  bool _dividedOpen = false;
  Set<String> _hostSelection = const {'Catch Hosts'};
  Set<String> _timingSelection = const {'Two hours before'};

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final comparisonWidth = constraints.maxWidth >= 640
            ? (constraints.maxWidth - CatchSpacing.s4) / 2
            : constraints.maxWidth
                  .clamp(0, widgetbookGeometryComponentWidth)
                  .toDouble();
        return Wrap(
          spacing: CatchSpacing.s4,
          runSpacing: CatchSpacing.s5,
          children: [
            _mixedSectionPageSample(
              context,
              width: comparisonWidth,
              label: 'Default · viewport full-bleed band',
              description:
                  'The page paints one tint-only band from the left compact viewport edge to the right while both adjacent rules yield to it.',
              treatment: _MixedDividedTreatment.fullWidthBand,
              containedOpen: _containedOpen,
              dividedOpen: _dividedOpen,
              hostSelection: _hostSelection,
              timingSelection: _timingSelection,
              onContainedOpenChanged: _setContainedOpen,
              onDividedOpenChanged: _setDividedOpen,
              onHostSelectionChanged: _setHostSelection,
              onTimingSelectionChanged: _setTimingSelection,
            ),
            _mixedSectionPageSample(
              context,
              width: comparisonWidth,
              label: 'Alternative · rounded tile',
              description:
                  'The field paints its complete rounded tint, outline, and active shadow while reclaiming only its divider bleed.',
              treatment: _MixedDividedTreatment.roundedTile,
              containedOpen: _containedOpen,
              dividedOpen: _dividedOpen,
              hostSelection: _hostSelection,
              timingSelection: _timingSelection,
              onContainedOpenChanged: _setContainedOpen,
              onDividedOpenChanged: _setDividedOpen,
              onHostSelectionChanged: _setHostSelection,
              onTimingSelectionChanged: _setTimingSelection,
            ),
          ],
        );
      },
    );
  }

  void _setContainedOpen(bool open) {
    if (_containedOpen == open) return;
    setState(() => _containedOpen = open);
  }

  void _setDividedOpen(bool open) {
    if (_dividedOpen == open) return;
    setState(() => _dividedOpen = open);
  }

  void _setHostSelection(Set<String> selection) {
    if (setEquals(_hostSelection, selection)) return;
    setState(() => _hostSelection = Set<String>.unmodifiable(selection));
  }

  void _setTimingSelection(Set<String> selection) {
    if (setEquals(_timingSelection, selection)) return;
    setState(() => _timingSelection = Set<String>.unmodifiable(selection));
  }
}

enum _MixedDividedTreatment { fullWidthBand, roundedTile }

Widget _mixedSectionPageSample(
  BuildContext context, {
  required double width,
  required String label,
  required String description,
  required _MixedDividedTreatment treatment,
  required bool containedOpen,
  required bool dividedOpen,
  required Set<String> hostSelection,
  required Set<String> timingSelection,
  required ValueChanged<bool> onContainedOpenChanged,
  required ValueChanged<bool> onDividedOpenChanged,
  required ValueChanged<Set<String>> onHostSelectionChanged,
  required ValueChanged<Set<String>> onTimingSelectionChanged,
}) {
  return widgetbookGeometrySectionHeaderComparison(
    context,
    width: width,
    label: label,
    description: description,
    child: CatchSurface(
      tone: CatchSurfaceTone.raised,
      borderRole: CatchBorderRole.separator,
      radius: CatchRadius.lg,
      clipBehavior: Clip.antiAlias,
      child: CatchSectionList.inset(
        emptyStateOmitted: true,
        padding: CatchInsets.pageBody,
        gap: CatchGaps.section,
        children: [
          _mixedContainedSection(
            context,
            open: containedOpen,
            selected: hostSelection,
            onOpenChanged: onContainedOpenChanged,
            onSelectionChanged: onHostSelectionChanged,
          ),
          _mixedDividedSection(
            context,
            treatment: treatment,
            open: dividedOpen,
            selected: timingSelection,
            onOpenChanged: onDividedOpenChanged,
            onSelectionChanged: onTimingSelectionChanged,
          ),
        ],
      ),
    ),
  );
}

Widget _mixedContainedSection(
  BuildContext context, {
  required bool open,
  required Set<String> selected,
  required ValueChanged<bool> onOpenChanged,
  required ValueChanged<Set<String>> onSelectionChanged,
}) {
  return CatchSection.containedFieldRows(
    title: 'Event settings',
    headerPlacement: CatchSectionHeaderPlacement.inside,
    children: [
      CatchField<String>.choices(
        copy: catchFieldCopy(context.l10n),
        title: 'Host',
        icon: CatchIcons.host,
        values: const ['Catch Hosts', 'Sunday Social', 'Bandra Runs'],
        itemLabelBuilder: widgetbookGeometryIdentityString,
        selected: selected,
        onSelectionChanged: onSelectionChanged,
        disclosureMode: open
            ? CatchFieldMode.controlledExpanded
            : CatchFieldMode.controlledCollapsed,
        onOpenChanged: onOpenChanged,
      ),
      CatchField.nav(
        copy: catchFieldCopy(context.l10n),
        title: 'Location',
        body: 'Carter Road promenade',
        icon: CatchIcons.location,
        onTap: widgetbookNoop,
      ),
    ],
  );
}

Widget _mixedDividedSection(
  BuildContext context, {
  required _MixedDividedTreatment treatment,
  required bool open,
  required Set<String> selected,
  required ValueChanged<bool> onOpenChanged,
  required ValueChanged<Set<String>> onSelectionChanged,
}) {
  final fullWidthBand = treatment == _MixedDividedTreatment.fullWidthBand;
  final timingField = CatchField<String>.choices(
    copy: catchFieldCopy(context.l10n),
    title: 'Reminder timing',
    icon: CatchIcons.time,
    values: const ['Two hours before', 'One day before', 'Off'],
    itemLabelBuilder: widgetbookGeometryIdentityString,
    selected: selected,
    onSelectionChanged: onSelectionChanged,
    disclosureMode: open
        ? CatchFieldMode.controlledExpanded
        : CatchFieldMode.controlledCollapsed,
    onOpenChanged: onOpenChanged,
  );
  final deliveryField = CatchField.nav(
    copy: catchFieldCopy(context.l10n),
    title: 'Delivery',
    body: 'Push and email',
    icon: CatchIcons.notifications,
    onTap: widgetbookNoop,
  );
  return CatchSection.fieldRows(
    title: 'Notifications',
    first: true,
    interaction: fullWidthBand
        ? CatchDividedFieldInteractionScopeMode.fullBleed
        : CatchDividedFieldInteractionScopeMode.roundedTile,
    children: [timingField, deliveryField],
  );
}

Widget _responsivePageContextSpecimen(
  BuildContext context, {
  required String label,
  required String description,
  required double viewportWidth,
  required double viewportHeight,
  required TargetPlatform platform,
  required CatchSectionListMode composition,
}) {
  return widgetbookGeometrySpecimen(
    context,
    label: label,
    description: description,
    child: _scaledReviewViewport(
      context,
      viewportWidth: viewportWidth,
      viewportHeight: viewportHeight,
      child: Theme(
        data: Theme.of(context).copyWith(platform: platform),
        child: MediaQuery(
          data: MediaQuery.of(context).copyWith(
            size: Size(viewportWidth, viewportHeight),
            padding: platform == TargetPlatform.iOS
                ? const EdgeInsets.only(bottom: CatchSpacing.s5)
                : EdgeInsets.zero,
            viewPadding: platform == TargetPlatform.iOS
                ? const EdgeInsets.only(bottom: CatchSpacing.s5)
                : EdgeInsets.zero,
            viewInsets: EdgeInsets.zero,
          ),
          child: _responsiveGeometryShell(context, composition: composition),
        ),
      ),
    ),
  );
}

Widget _scaledReviewViewport(
  BuildContext context, {
  required double viewportWidth,
  required double viewportHeight,
  required Widget child,
}) {
  return LayoutBuilder(
    builder: (context, constraints) {
      final scale = constraints.maxWidth < viewportWidth
          ? constraints.maxWidth / viewportWidth
          : 1.0;
      return SizedBox(
        width: double.infinity,
        height: viewportHeight * scale,
        child: FittedBox(
          fit: BoxFit.contain,
          alignment: AlignmentDirectional.topCenter,
          child: SizedBox(
            width: viewportWidth,
            height: viewportHeight,
            child: CatchSurface(
              tone: CatchSurfaceTone.raised,
              borderRole: CatchBorderRole.separator,
              clipBehavior: Clip.antiAlias,
              child: child,
            ),
          ),
        ),
      );
    },
  );
}

Widget _responsiveGeometryShell(
  BuildContext context, {
  required CatchSectionListMode composition,
}) {
  return AdaptiveTabScaffold(
    activeIndex: 1,
    navigationBar: CatchTabBar<int>(
      items: _responsiveNavigationItems,
      active: 1,
      onChanged: _ignoreInt,
    ),
    mediumSideNavigation: AppShellSideNavigation(
      active: 1,
      items: _responsiveNavigationItems,
      onChanged: _ignoreInt,
    ),
    expandedSideNavigation: AppShellSideNavigation(
      active: 1,
      items: _responsiveNavigationItems,
      onChanged: _ignoreInt,
      expanded: true,
      title: 'Catch Hosts',
    ),
    body: CatchRouteScaffold(
      topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
        title: 'Event settings',
        navigation: const CatchTopBarNavigation(
          mode: CatchTopBarNavigationMode.none,
        ),
        emphasis: scrolledUnder
            ? CatchTopBarEmphasis.divided
            : CatchTopBarEmphasis.plain,
      ),
      body: CatchRouteBody.fullBleed(
        child: CatchSectionList.page(
          emptyStateOmitted: true,
          mode: composition,
          items: [
            CatchSectionListItem(
              child: _responsiveEventSettingsSection(context),
            ),
            CatchSectionListItem(
              lane: CatchSectionListPlacement.secondary,
              child: _responsiveNotificationSection(context),
            ),
            CatchSectionListItem(child: _responsivePrivacySection(context)),
          ],
        ),
      ),
    ),
  );
}

Widget _responsiveEventSettingsSection(BuildContext context) {
  var selected = const {'Catch Hosts'};
  return CatchSection.containedFieldRows(
    title: 'Event settings',
    headerPlacement: CatchSectionHeaderPlacement.inside,
    children: [
      StatefulBuilder(
        builder: (context, setState) => CatchField<String>.choices(
          copy: catchFieldCopy(context.l10n),
          title: 'Host',
          icon: CatchIcons.host,
          values: const ['Catch Hosts', 'Sunday Social', 'Bandra Runs'],
          itemLabelBuilder: widgetbookGeometryIdentityString,
          selected: selected,
          onSelectionChanged: (next) => setState(() => selected = next),
        ),
      ),
      CatchField.nav(
        copy: catchFieldCopy(context.l10n),
        title: 'Location',
        body: 'Carter Road promenade',
        icon: CatchIcons.location,
        onTap: widgetbookNoop,
      ),
    ],
  );
}

Widget _responsiveNotificationSection(BuildContext context) {
  return CatchSection.fieldRows(
    title: 'Notifications',
    first: true,
    children: [
      CatchField.toggle(
        copy: catchFieldCopy(context.l10n),
        title: 'Allow reminders',
        body: 'Push and email',
        icon: CatchIcons.notifications,
        value: true,
        onChanged: widgetbookGeometryIgnoreBool,
      ),
      CatchField.nav(
        copy: catchFieldCopy(context.l10n),
        title: 'Reminder timing',
        body: 'Two hours before',
        icon: CatchIcons.time,
        onTap: widgetbookNoop,
      ),
    ],
  );
}

Widget _responsivePrivacySection(BuildContext context) {
  return CatchSection.containedFieldRows(
    title: 'Guest visibility',
    children: [
      CatchField.toggle(
        copy: catchFieldCopy(context.l10n),
        title: 'Show guest list',
        body: 'Visible after joining',
        icon: CatchIcons.people,
        value: true,
        onChanged: widgetbookGeometryIgnoreBool,
      ),
      CatchField.nav(
        copy: catchFieldCopy(context.l10n),
        title: 'Contact policy',
        body: 'Hosts only',
        icon: CatchIcons.locked,
        onTap: widgetbookNoop,
      ),
    ],
  );
}

const _compactPhoneViewportWidth = 390.0;

const _splitScreenViewportWidth = 540.0;

const _tabletPortraitViewportWidth = 720.0;

const _tabletWorkspaceViewportWidth = 820.0;

const _expandedViewportWidth = 1180.0;

const _compactViewportHeight = 640.0;

const _tabletViewportHeight = 660.0;

const _expandedViewportHeight = 700.0;

final _responsiveNavigationItems = <CatchTabBarItem<int>>[
  CatchTabBarItem(
    id: 0,
    icon: CatchIcons.home,
    activeIcon: CatchIcons.home,
    label: 'Home',
  ),
  CatchTabBarItem(
    id: 1,
    icon: CatchIcons.settings,
    activeIcon: CatchIcons.settings,
    label: 'Settings',
  ),
  CatchTabBarItem(
    id: 2,
    icon: CatchIcons.chat,
    activeIcon: CatchIcons.chat,
    label: 'Chats',
    badgeCount: 3,
  ),
  CatchTabBarItem(
    id: 3,
    icon: CatchIcons.person,
    activeIcon: CatchIcons.person,
    label: 'You',
  ),
];

void _ignoreInt(int _) {}
