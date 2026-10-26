import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/contract_preview.dart';
import '../../support/geometry_preview.dart';

@widgetbook.UseCase(
  name: 'Geometry matrix',
  type: CatchMenu,
  path: '[Geometry system]',
)
Widget menuGeometryMatrix(BuildContext context) {
  return widgetbookGeometryPage(
    context,
    title: 'Menus',
    contractIds: const ['catch.menu'],
    principles: const [
      'The menu is a plane change; rows inside return to flat geometry.',
      'Commands and mutually exclusive choices share row metrics but not semantics.',
      'Anchoring and viewport clearance belong to the shared menu boundary.',
    ],
    children: [
      widgetbookGeometrySpecimen(
        context,
        label: 'Panel anatomy',
        child: CatchMenu<String>(
          width: CatchLayout.actionMenuWidth,
          onSelected: (value, _) => widgetbookIgnoreString(value),
          items: [
            CatchMenuItem(
              value: 'share',
              label: 'Share event',
              sublabel: 'Send the event link',
              icon: CatchIcons.share,
            ),
            CatchMenuItem(
              value: 'going',
              label: 'Going',
              selected: true,
              variant: CatchMenuItemVariant.choice,
              icon: CatchIcons.success,
              startsSection: true,
            ),
            CatchMenuItem(
              value: 'host',
              label: 'Host controls',
              sublabel: 'Unavailable for guests',
              enabled: false,
              icon: CatchIcons.locked,
            ),
            CatchMenuItem(
              value: 'remove',
              label: 'Remove from event',
              danger: true,
              icon: CatchIcons.delete,
            ),
          ],
        ),
      ),
      widgetbookGeometrySpecimen(
        context,
        label: 'Anchored command menu',
        description:
            'Open the trigger to inspect anchor alignment, flipping, and viewport clearance.',
        child: CatchActionMenu<String>(
          tooltip: 'Event actions',
          onSelected: widgetbookIgnoreString,
          items: [
            CatchActionMenuItem(value: 'share', label: 'Share event'),
            CatchActionMenuItem(value: 'duplicate', label: 'Duplicate event'),
            CatchActionMenuItem(
              value: 'cancel',
              label: 'Cancel event',
              isDestructive: true,
            ),
          ],
        ),
      ),
      widgetbookGeometrySpecimen(
        context,
        label: 'Adaptive selection',
        description:
            'The same choice model opens as a compact sheet or an anchored wider-layout menu.',
        child: CatchSelectionMenu<String>.control(
          title: 'Sort customers',
          subtitle: 'Choose how customers are ordered.',
          tooltip: 'Sort customers',
          value: 'last-seen',
          items: const [
            CatchSelectionMenuItem(value: 'last-seen', label: 'Last seen'),
            CatchSelectionMenuItem(
              value: 'most-attended',
              label: 'Most attended',
            ),
            CatchSelectionMenuItem(value: 'name', label: 'Name'),
          ],
          labelBuilder: (item) => 'Sort: ${item.label}',
          onSelected: widgetbookIgnoreString,
        ),
      ),
    ],
  );
}
