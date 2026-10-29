import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/widgetbook_harness.dart';

@widgetbook.UseCase(
  name: 'Heading count and trailing states',
  type: CatchSectionHeader,
  path: '[Core primitives]/Sections',
)
Widget sectionKickerStates(BuildContext context) {
  final tokens = CatchTokens.of(context);
  return WidgetbookCatalogFrame(
    title: 'Section heading anatomy',
    catalogId: 'catch.section.header.kicker',
    children: [
      CatchSectionHeader.kicker(title: 'Your details', color: tokens.ink),
      CatchSectionHeader.kicker(title: 'Guests', count: 24, color: tokens.ink),
      CatchSectionHeader.kicker(
        title: 'Upcoming events',
        color: tokens.ink,
        trailing: CatchButton.text(label: 'View all', onPressed: () {}),
      ),
      CatchSectionHeader.kicker(
        title: 'Team members',
        count: 12,
        color: tokens.ink,
        trailing: CatchButton.text(label: 'Manage', onPressed: () {}),
      ),
      CatchSectionHeader.kicker(title: null, count: 8, color: tokens.ink),
      CatchSectionHeader.kicker(
        title: null,
        color: tokens.ink,
        trailing: CatchButton.text(label: 'Edit', onPressed: () {}),
      ),
      CatchSectionHeader.kicker(
        title: 'Notification preferences',
        count: 4,
        color: tokens.ink2,
        textVariant: CatchKickerTextVariant.fieldSection,
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Content and field separator modes',
  type: CatchSectionBody,
  path: '[Core primitives]/Sections',
)
Widget sectionRowListStates(BuildContext context) => WidgetbookCatalogFrame(
  title: 'Section child layouts',
  catalogId: 'catch.section.body',
  children: [
    for (final mode in CatchSectionBodyMode.values) ...[
      Text(mode.name, style: CatchTextStyles.bodyM(context)),
      CatchSectionBody(
        mode: mode,
        dividerVariant: mode == CatchSectionBodyMode.content
            ? CatchDividerVariant.fieldRow
            : CatchDividerVariant.fieldSection,
        children: [
          CatchField.read(
            copy: catchFieldCopy(context.l10n),
            title: 'Location',
            body: 'City centre',
            icon: CatchIcons.location,
          ),
          CatchField.read(
            copy: catchFieldCopy(context.l10n),
            title: 'Capacity',
            body: '24 guests',
          ),
        ],
      ),
    ],
    CatchSectionBody(
      mode: CatchSectionBodyMode.dividedFields,
      children: [
        for (final label in ['Adapter row', 'Fallback text lane'])
          Padding(
            padding: const EdgeInsets.all(CatchSpacing.s3),
            child: Text(label, style: CatchTextStyles.bodyM(context)),
          ),
      ],
    ),
    CatchSectionBody(
      showInternalDividers: false,
      children: [
        for (final label in ['Unseparated content', 'Second item'])
          Text(label, style: CatchTextStyles.bodyM(context)),
      ],
    ),
    CatchSectionBody(
      child: Text(
        'Caller-owned direct child',
        style: CatchTextStyles.bodyM(context),
      ),
    ),
    const CatchSectionBody(),
  ],
);

@widgetbook.UseCase(
  name: 'Direct-row divider geometry',
  type: CatchFieldDividerGeometry,
  path: '[Core primitives]/Fields',
)
Widget fieldDividerGeometryStates(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'Field divider geometry',
      catalogId: 'catch.field.divider_geometry',
      children: [
        for (final geometry in ['Plain', 'Icon', 'Custom leading', 'Add']) ...[
          Text(geometry, style: CatchTextStyles.bodyM(context)),
          CatchSection.fieldRows(
            first: true,
            children: [
              if (geometry == 'Add')
                CatchField.add(
                  copy: catchFieldCopy(context.l10n),
                  title: 'Add a detail',
                  icon: CatchIcons.add,
                  onTap: () {},
                )
              else
                CatchField.read(
                  copy: catchFieldCopy(context.l10n),
                  title: 'Detail',
                  body: 'Leading text lane',
                  icon: geometry == 'Icon' ? CatchIcons.location : null,
                  leading: geometry == 'Custom leading'
                      ? Icon(CatchIcons.check)
                      : null,
                  leadingExtent: geometry == 'Custom leading'
                      ? CatchSpacing.s8
                      : null,
                ),
              CatchField.read(
                copy: catchFieldCopy(context.l10n),
                title: 'Value',
                body: 'Aligned separator',
              ),
            ],
          ),
        ],
      ],
    );
