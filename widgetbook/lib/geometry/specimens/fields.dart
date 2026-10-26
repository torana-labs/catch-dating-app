import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/contract_preview.dart';
import '../../support/geometry_preview.dart';

/// Cross-family comparison pages for reasoning about Catch component geometry.
///
/// The exhaustive state inventory remains on each component's "Contract
/// states" page. These pages deliberately compare only the states that reveal
/// shared silhouette, edge, spacing, alignment, plane, and viewport rules.

@widgetbook.UseCase(
  name: 'Geometry matrix',
  type: CatchSection,
  path: '[Geometry system]',
)
Widget fieldAndSectionGeometryMatrix(BuildContext context) {
  return widgetbookGeometryPage(
    context,
    title: 'Fields and sections',
    contractIds: const ['catch.field', 'catch.section'],
    principles: const [
      'The outermost containing primitive owns the perimeter.',
      'Sibling rows share internal hairlines instead of stacked borders.',
      'Internal field-group headers own a padded section rule inside the perimeter.',
      'Sections choose interaction policy: full bleed for compact divided groups, rounded tiles when explicitly requested, and rectangular bands inside a section-owned clip.',
    ],
    children: [
      widgetbookGeometrySpecimen(
        context,
        label: 'Standalone fields',
        description:
            'Standalone rows keep their own field geometry when no section supplies a perimeter.',
        child: SizedBox(
          width: widgetbookGeometryComponentWidth,
          child: Column(
            children: [
              CatchField.read(
                copy: catchFieldCopy(context.l10n),
                title: 'Host',
                body: 'Catch Hosts',
                icon: CatchIcons.host,
              ),
              CatchField.input(
                copy: catchFieldCopy(context.l10n),
                title: 'Public name',
                initialValue: 'Bandra Social Run',
                icon: CatchIcons.person,
              ),
            ],
          ),
        ),
      ),
      widgetbookGeometrySpecimen(
        context,
        label: 'Contained field rows · internal header',
        description:
            'The header belongs to the bounded group and owns the same padded section rule as an uncontained field section.',
        child: SizedBox(
          width: widgetbookGeometryComponentWidth,
          child: CatchSection.containedFieldRows(
            title: 'Event settings',
            headerPlacement: CatchSectionHeaderPlacement.inside,
            children: [
              CatchField.read(
                copy: catchFieldCopy(context.l10n),
                title: 'Host',
                body: 'Catch Hosts',
                icon: CatchIcons.host,
              ),
              CatchField.nav(
                copy: catchFieldCopy(context.l10n),
                title: 'Location',
                body: 'Carter Road promenade',
                icon: CatchIcons.location,
                onTap: widgetbookNoop,
              ),
              CatchField.toggle(
                copy: catchFieldCopy(context.l10n),
                title: 'Allow reminders',
                body: 'Push and email',
                icon: CatchIcons.notifications,
                value: true,
                onChanged: widgetbookGeometryIgnoreBool,
              ),
            ],
          ),
        ),
      ),
      widgetbookGeometrySpecimen(
        context,
        label: 'Interaction geometry · production contract',
        description:
            'Press and hold either Host row to inspect pointer-down chrome, then release to watch the real field transition into its open state. Both specimens use production CatchField and CatchSection code.',
        child: const _CanonicalFieldInteractionPair(),
      ),
      widgetbookGeometrySpecimen(
        context,
        label: 'Section variants · semantic ownership',
        description:
            'The content is identical, but the semantic owner differs. Page-subject groups stay divided; one bounded object uses a contained perimeter; plain remains reserved for a plane already owned by its parent.',
        child: LayoutBuilder(
          builder: (context, constraints) {
            final comparisonWidth = constraints.maxWidth >= 720
                ? (constraints.maxWidth - CatchSpacing.s4) / 2
                : constraints.maxWidth
                      .clamp(0, widgetbookGeometryComponentWidth)
                      .toDouble();
            return Wrap(
              spacing: CatchSpacing.s4,
              runSpacing: CatchSpacing.s5,
              children: [
                widgetbookGeometrySectionHeaderComparison(
                  context,
                  width: comparisonWidth,
                  label: 'Divided · page group',
                  description:
                      'Recommended default: type and hairlines provide hierarchy without adding another object.',
                  child: CatchSection.fieldRows(
                    title: 'Event settings',
                    children: _eventSettingRows(context),
                  ),
                ),
                widgetbookGeometrySectionHeaderComparison(
                  context,
                  width: comparisonWidth,
                  label: 'Contained · bounded object',
                  description:
                      'Use when the fields are perceived and acted on as one discrete object.',
                  child: CatchSection.containedFieldRows(
                    title: 'Event settings',
                    children: _eventSettingRows(context),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    ],
  );
}

class _CanonicalFieldInteractionPair extends StatefulWidget {
  const _CanonicalFieldInteractionPair();

  @override
  State<_CanonicalFieldInteractionPair> createState() =>
      _CanonicalFieldInteractionPairState();
}

class _CanonicalFieldInteractionPairState
    extends State<_CanonicalFieldInteractionPair> {
  bool _containedOpen = false;
  bool _dividedOpen = false;
  Set<String> _containedSelection = const {'Catch Hosts'};
  Set<String> _dividedSelection = const {'Catch Hosts'};

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final comparisonWidth = constraints.maxWidth >= 720
            ? (constraints.maxWidth - CatchSpacing.s4) / 2
            : constraints.maxWidth
                  .clamp(0, widgetbookGeometryComponentWidth)
                  .toDouble();
        return Wrap(
          spacing: CatchSpacing.s4,
          runSpacing: CatchSpacing.s5,
          children: [
            widgetbookGeometrySectionHeaderComparison(
              context,
              width: comparisonWidth,
              label: 'Contained',
              description:
                  'The section owns one rounded perimeter; field interaction remains rectangular inside its clip.',
              child: _canonicalInteractionSection(
                context,
                contained: true,
                open: _containedOpen,
                selected: _containedSelection,
                onOpenChanged: (open) => setState(() => _containedOpen = open),
                onSelectionChanged: (selection) => setState(
                  () => _containedSelection = Set.unmodifiable(selection),
                ),
              ),
            ),
            widgetbookGeometrySectionHeaderComparison(
              context,
              width: comparisonWidth,
              label: 'Divided',
              description:
                  'The field owns a complete rounded tint and outline that consumes adjacent divider edges.',
              child: _canonicalInteractionSection(
                context,
                contained: false,
                open: _dividedOpen,
                selected: _dividedSelection,
                onOpenChanged: (open) => setState(() => _dividedOpen = open),
                onSelectionChanged: (selection) => setState(
                  () => _dividedSelection = Set.unmodifiable(selection),
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

Widget _canonicalInteractionSection(
  BuildContext context, {
  required bool contained,
  required bool open,
  required Set<String> selected,
  required ValueChanged<bool> onOpenChanged,
  required ValueChanged<Set<String>> onSelectionChanged,
}) {
  final fields = [
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
  ];
  if (contained) {
    return CatchSection.containedFieldRows(
      title: 'Event settings',
      headerPlacement: CatchSectionHeaderPlacement.inside,
      children: fields,
    );
  }
  return CatchSection.fieldRows(
    title: 'Event settings',
    first: true,
    children: fields,
  );
}

List<Widget> _eventSettingRows(BuildContext context) => [
  CatchField.action(
    copy: catchFieldCopy(context.l10n),
    title: 'Host',
    body: 'Catch Hosts',
    icon: CatchIcons.host,
    onTap: widgetbookNoop,
  ),
  CatchField.nav(
    copy: catchFieldCopy(context.l10n),
    title: 'Location',
    body: 'Carter Road promenade',
    icon: CatchIcons.location,
    onTap: widgetbookNoop,
  ),
  CatchField.toggle(
    copy: catchFieldCopy(context.l10n),
    title: 'Allow reminders',
    body: 'Push and email',
    icon: CatchIcons.notifications,
    value: true,
    onChanged: widgetbookGeometryIgnoreBool,
  ),
];
