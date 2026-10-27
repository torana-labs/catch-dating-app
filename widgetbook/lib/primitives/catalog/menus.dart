import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/catalog_preview.dart';
import 'package:widgetbook_workspace/support/contract_preview.dart';

import '../../preview_layout_contracts.dart';
import '../../support/widgetbook_harness.dart';

@widgetbook.UseCase(
  name: 'Catalog states',
  type: CatchActionMenu,
  path: '[Core catalog]/Menus',
)
Widget catchActionMenuCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'CatchActionMenu',
    catalogId: 'core.widgets.catch_action_menu',
    children: [
      WidgetbookCatalogStateCard(
        label: 'interactive trigger',
        description: 'Tap the trigger to inspect command hierarchy and states.',
        child: CatchActionMenu<String>(
          tooltip: 'Event actions',
          onSelected: widgetbookIgnoreString,
          items: [
            CatchActionMenuItem(
              value: 'share',
              label: 'Share event',
              icon: CatchIcons.share,
            ),
            CatchActionMenuItem(
              value: 'saved',
              label: 'Save to dashboard',
              icon: CatchIcons.bookmark,
            ),
            CatchActionMenuItem(
              value: 'disabled',
              label: 'Invite guests',
              sublabel: 'Host has not opened invites',
              icon: CatchIcons.people,
              enabled: false,
            ),
            CatchActionMenuItem(
              value: 'cancel',
              label: 'Cancel booking',
              icon: CatchIcons.delete,
              isDestructive: true,
            ),
          ],
        ),
      ),
      WidgetbookCatalogStateCard(
        label: 'disabled trigger',
        child: CatchActionMenu<String>(
          tooltip: 'No actions',
          enabled: false,
          items: const [],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: CatchSelectionMenu,
  path: '[Core catalog]/Menus',
)
Widget catchSelectionMenuCatalogStates(BuildContext context) {
  var selected = 'last-seen';
  final items = [
    const CatchSelectionMenuItem(value: 'last-seen', label: 'Last seen'),
    const CatchSelectionMenuItem(
      value: 'most-attended',
      label: 'Most attended',
    ),
    const CatchSelectionMenuItem(value: 'name', label: 'Name'),
  ];
  return WidgetbookCatalogFrame(
    title: 'CatchSelectionMenu',
    catalogId: 'core.widgets.catch_selection_menu',
    children: [
      StatefulBuilder(
        builder: (context, setState) => WidgetbookCatalogStateCard(
          label: 'adaptive single selection',
          description:
              'Uses an anchored picker on wider layouts and a sheet on phones.',
          child: CatchSelectionMenu<String>.control(
            title: 'Sort customers',
            subtitle: 'Choose how customers are ordered.',
            tooltip: 'Sort customers',
            items: items,
            value: selected,
            labelBuilder: (item) => 'Sort: ${item.label}',
            onSelected: (value) => setState(() => selected = value),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: CatchMenu,
  path: '[Core catalog]/Menus',
)
Widget catchMenuCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'CatchMenu',
    catalogId: 'core.widgets.catch_menu',
    children: [
      WidgetbookCatalogStateCard(
        label: 'rows',
        child: CatchMenu<String>(
          width: WidgetbookPreviewLayout.mediumComponentWidth,
          onSelected: (value, _) => widgetbookIgnoreString(value),
          items: [
            CatchMenuItem(
              value: 'going',
              label: 'Going',
              sublabel: 'Confirmed attendee view',
              icon: CatchIcons.success,
              selected: true,
              variant: CatchMenuItemVariant.choice,
            ),
            CatchMenuItem(
              value: 'waitlist',
              label: 'Waitlist',
              sublabel: 'Show demand and limits',
              icon: CatchIcons.time,
            ),
            CatchMenuItem(
              value: 'disabled',
              label: 'Host controls',
              sublabel: 'Unavailable for guests',
              icon: CatchIcons.locked,
              enabled: false,
            ),
            CatchMenuItem(
              value: 'danger',
              label: 'Remove from event',
              icon: CatchIcons.delete,
              danger: true,
            ),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: CatchMenuRow,
  path: '[Core catalog]/Menus',
)
Widget catchMenuRowCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'CatchMenuRow',
    catalogId: 'core.widgets.catch_menu_row',
    children: [
      WidgetbookCatalogStateCard(
        label: 'selected',
        child: CatchMenuRow<String>(
          item: CatchMenuItem(
            value: 'going',
            label: 'Going',
            sublabel: 'Confirmed attendee view',
            icon: CatchIcons.success,
            selected: true,
            variant: CatchMenuItemVariant.choice,
          ),
          onSelected: (value, _) => widgetbookIgnoreString(value),
        ),
      ),
      WidgetbookCatalogStateCard(
        label: 'disabled',
        child: CatchMenuRow<String>(
          item: CatchMenuItem(
            value: 'disabled',
            label: 'Host controls',
            sublabel: 'Unavailable for guests',
            icon: CatchIcons.locked,
            enabled: false,
          ),
          onSelected: (value, _) => widgetbookIgnoreString(value),
        ),
      ),
      WidgetbookCatalogStateCard(
        label: 'danger',
        child: CatchMenuRow<String>(
          item: CatchMenuItem(
            value: 'remove',
            label: 'Remove from event',
            icon: CatchIcons.delete,
            danger: true,
          ),
          onSelected: (value, _) => widgetbookIgnoreString(value),
        ),
      ),
    ],
  );
}
