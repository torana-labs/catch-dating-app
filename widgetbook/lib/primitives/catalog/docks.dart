import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/catalog_preview.dart';
import 'package:widgetbook_workspace/support/contract_preview.dart';

import '../../preview_layout_contracts.dart';
import '../../support/widgetbook_harness.dart';

@widgetbook.UseCase(
  name: 'Utility states',
  type: CatchDock,
  path: '[Core catalog]/Sheets and footers',
)
Widget catchDockUtilityCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'CatchDock',
    catalogId: 'catch.bottom_action',
    children: [
      WidgetbookCatalogStateCard(
        label: 'safe-area utility dock',
        child: Column(
          children: [
            CatchDock(
              child: Row(
                children: [
                  Expanded(
                    child: CatchSearchField(
                      copy: catchSearchFieldCopy(context.l10n),
                      value: '',
                    ),
                  ),
                  gapW12,
                  CatchIconAction(
                    onPressed: widgetbookNoop,
                    child: Icon(CatchIcons.send),
                  ),
                ],
              ),
            ),
            gapH12,
            CatchDock(
              includeSafeArea: false,
              child: CatchButton(
                label: 'Apply filters',
                fullWidth: true,
                onPressed: widgetbookNoop,
              ),
            ),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Primary action states',
  type: CatchDock,
  path: '[Core catalog]/Sheets and footers',
)
Widget catchDockPrimaryCatalogStates(BuildContext context) {
  final t = CatchTokens.of(context);
  return WidgetbookCatalogFrame(
    title: 'CatchDock.primary',
    catalogId: 'catch.bottom_action',
    children: [
      WidgetbookCatalogStateCard(
        label: 'platform-adaptive CTA variants',
        child: Column(
          children: [
            CatchDock.primary(
              label: 'Join event',
              onPressed: widgetbookNoop,
              catchLine: 'Matching opens after check-in',
              catchLineAccent: t.primary,
            ),
            gapH12,
            CatchDock.primary(
              label: 'Book spot',
              onPressed: widgetbookNoop,
              leading: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('₹799', style: CatchTextStyles.titleL(context)),
                  Text(
                    'incl. coffee',
                    style: CatchTextStyles.supporting(context),
                  ),
                ],
              ),
              footnote: 'Refundable until 24 hours before start.',
            ),
            gapH12,
            CatchDock.primary(
              label: 'Joining',
              onPressed: widgetbookNoop,
              isLoading: true,
            ),
            gapH12,
            const CatchDock.primary(label: 'Sold out', onPressed: null),
          ],
        ),
      ),
      WidgetbookCatalogStateCard(
        label: 'dockless form actions over scrolling content',
        child: SizedBox(
          height: 360,
          child: CatchBottomActionOverlay(
            body: ListView(
              padding: CatchInsets.formStepBodyWithBottomActions,
              children: [
                for (var index = 0; index < 5; index++) ...[
                  Text('Scrolling form row ${index + 1}'),
                  const Divider(),
                  gapH24,
                ],
              ],
            ),
            actions: CatchButton(
              label: 'Continue',
              onPressed: widgetbookNoop,
              fullWidth: true,
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Embedded primary action states',
  type: CatchDock,
  path: '[Core catalog]/Sheets and footers',
)
Widget catchDockEmbeddedPrimaryCatalogStates(BuildContext context) {
  final t = CatchTokens.of(context);
  return WidgetbookCatalogFrame(
    title: 'CatchDock.primaryContent',
    catalogId: 'catch.bottom_action',
    children: [
      WidgetbookCatalogStateCard(
        label: 'default',
        child: CatchDock.primaryContent(
          label: 'Join event',
          onPressed: widgetbookNoop,
        ),
      ),
      WidgetbookCatalogStateCard(
        label: 'leading content / catch line / footnote',
        child: CatchDock.primaryContent(
          label: 'Book spot',
          onPressed: widgetbookNoop,
          leading: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('₹799', style: CatchTextStyles.titleL(context)),
              Text('incl. coffee', style: CatchTextStyles.supporting(context)),
            ],
          ),
          buttonAccentColor: t.primary,
          catchLine: 'Matching opens after check-in',
          catchLineAccent: t.primary,
          footnote: 'Refundable until 24 hours before start.',
        ),
      ),
      const WidgetbookCatalogStateCard(
        label: 'loading / disabled',
        child: Column(
          children: [
            CatchDock.primaryContent(
              label: 'Joining',
              onPressed: null,
              isLoading: true,
            ),
            SizedBox(height: CatchSpacing.s3),
            CatchDock.primaryContent(label: 'Sold out', onPressed: null),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: CatchSheetDragIndicator,
  path: '[Core catalog]/Sheets and footers',
)
Widget catchBottomSheetGrabberCatalogStates(BuildContext context) {
  return const WidgetbookCatalogFrame(
    title: 'CatchSheetDragIndicator',
    catalogId: 'core.widgets.catch_bottom_sheet_grabber',
    children: [
      WidgetbookCatalogStateCard(
        label: 'default / wide',
        child: Column(
          children: [
            CatchSheetDragIndicator(),
            SizedBox(height: CatchSpacing.s4),
            CatchSheetDragIndicator(
              width: WidgetbookPreviewLayout.catalogSheetGrabberWidth,
              height: WidgetbookPreviewLayout.catalogSheetGrabberHeight,
            ),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: CatchShareCardSheet,
  path: '[Core catalog]/Sheets and footers',
)
Widget catchShareCardSheetCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'CatchShareCardSheet',
    catalogId: 'core.widgets.catch_share_card_sheet',
    children: [
      WidgetbookCatalogStateCard(
        label: 'card preview / share action',
        child: CatchShareCardSheet(
          captureKey: GlobalKey(),
          onShare: (_) {},
          buttonLabel: 'Share card',
          footnote: 'Preview rendered through RepaintBoundary.',
          media: CatchSurface.card(
            width: WidgetbookPreviewLayout.compactComponentWidth,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const CatchKickerText(label: 'Tonight'),
                gapH8,
                Text('Bandra easy 5K', style: CatchTextStyles.titleL(context)),
                gapH6,
                Text(
                  'A social run with coffee after.',
                  style: CatchTextStyles.supporting(context),
                ),
              ],
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Sharing state',
  type: CatchShareCardSheet,
  path: '[Core catalog]/Sheets and footers',
)
Widget catchShareCardSheetSharingState(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'Sharing a card',
      catalogId: 'catch.sheet.share_card',
      children: [
        CatchShareCardSheet(
          captureKey: GlobalKey(),
          buttonLabel: 'Share card',
          footnote: 'Preparing the card for the system share sheet.',
          isSharing: true,
          onShare: (_) {},
          media: CatchSurface.card(
            child: Text('Card preview', style: CatchTextStyles.bodyM(context)),
          ),
        ),
      ],
    );
