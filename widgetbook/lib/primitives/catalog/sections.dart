import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/catalog_preview.dart';
import 'package:widgetbook_workspace/support/contract_preview.dart';

import '../../preview_layout_contracts.dart';
import '../../support/widgetbook_harness.dart';

@widgetbook.UseCase(
  name: 'Horizontal collection',
  type: CatchSection,
  path: '[Core catalog]/Sections',
)
Widget catchSectionHorizontalCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'CatchSection.horizontal',
    catalogId: 'catch.section',
    children: [
      WidgetbookCatalogStateCard(
        label: 'embedded rail',
        child: CatchSection.horizontal(
          title: 'Recommended',
          itemCount: 4,
          height: WidgetbookPreviewLayout.catalogRailHeight,
          itemBuilder: (context, index) => CatchSurface.card(
            width: WidgetbookPreviewLayout.catalogCardWidth,
            child: Text(
              'Card ${index + 1}',
              style: CatchTextStyles.statusLabel(context),
            ),
          ),
          footer: CatchButton(label: 'More', onPressed: widgetbookNoop),
        ),
      ),
      WidgetbookCatalogStateCard(
        label: 'full-bleed rail',
        child: CatchSection.horizontal(
          title: 'Recommended',
          itemCount: 4,
          fullBleed: true,
          height: WidgetbookPreviewLayout.catalogRailHeight,
          itemBuilder: (context, index) => CatchSurface.card(
            width: WidgetbookPreviewLayout.catalogCardWidth,
            child: Text(
              'Card ${index + 1}',
              style: CatchTextStyles.statusLabel(context),
            ),
          ),
          footer: CatchButton(label: 'More', onPressed: widgetbookNoop),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: CatchSectionHeader,
  path: '[Core catalog]/Sections',
)
Widget catchSectionHeaderCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'CatchSectionHeader',
    catalogId: 'core.widgets.catch_section_header',
    children: [
      WidgetbookCatalogStateCard(
        label: 'plain / uppercase / trailing',
        child: Column(
          children: [
            CatchSectionHeader(
              title: 'Upcoming events',
              trailing: CatchButton.text(
                label: 'See all',
                onPressed: widgetbookNoop,
              ),
            ),
            const CatchSectionHeader(
              title: 'Host checklist',
              subtitle:
                  'Keep setup copy visible without creating a local header.',
            ),
            const CatchSectionHeader(
              title: 'metadata group',
              uppercase: true,
              heavy: true,
            ),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: CatchDaySectionHeader,
  path: '[Core catalog]/Sections',
)
Widget catchDaySectionHeaderCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'CatchDaySectionHeader',
    catalogId: 'core.widgets.catch_day_section_header',
    children: [
      WidgetbookCatalogStateCard(
        label: 'regular / sticky delegate',
        child: Column(
          children: [
            const CatchDaySectionHeader(label: 'Today - Wed 27 May', count: 3),
            SizedBox(
              height: WidgetbookPreviewLayout.mediaPanelHeight,
              child: CustomScrollView(
                slivers: [
                  const SliverPersistentHeader(
                    pinned: true,
                    delegate: CatchDaySectionHeaderDelegate(
                      label: 'Tomorrow - Thu 28 May',
                      count: 5,
                    ),
                  ),
                  SliverList.builder(
                    itemCount: 4,
                    itemBuilder: (context, index) => Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: CatchSpacing.screenPx,
                        vertical: CatchSpacing.s1,
                      ),
                      child: CatchSurface.card(
                        child: Text('Chronological item ${index + 1}'),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: CatchCountText,
  path: '[Core catalog]/Sections',
)
Widget catchDaySectionHeaderCountCatalogStates(BuildContext context) {
  final t = CatchTokens.of(context);

  return WidgetbookCatalogFrame(
    title: 'CatchCountText',
    catalogId: 'core.widgets.catch_day_section_header.count',
    children: [
      WidgetbookCatalogStateCard(
        label: 'default / color override',
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CatchCountText(count: 3),
            const SizedBox(width: CatchSpacing.s6),
            CatchCountText(count: 12, color: t.primary),
          ],
        ),
      ),
    ],
  );
}
