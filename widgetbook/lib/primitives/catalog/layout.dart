import 'package:catch_dating_app/core/presentation/app_shell_active_tab.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/catalog_preview.dart';

import '../../preview_layout_contracts.dart';
import '../../support/widgetbook_harness.dart';

@widgetbook.UseCase(
  name: 'Catalog states',
  type: CatchDivider,
  path: '[Core catalog]/Layout',
)
Widget catchDividerCatalogStates(BuildContext context) {
  return const WidgetbookCatalogFrame(
    title: 'CatchDivider',
    catalogId: 'core.widgets.catch_divider',
    children: [
      WidgetbookCatalogStateCard(
        label: 'section / field section / field row',
        child: Column(
          children: [
            CatchDivider.section(),
            SizedBox(height: CatchSpacing.s4),
            CatchDivider.fieldSection(),
            SizedBox(height: CatchSpacing.s4),
            CatchDivider.fieldRow(),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: CatchFormReviewPageBody,
  path: '[Core catalog]/Layout',
)
Widget catchFormReviewBodyCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'CatchFormReviewPageBody',
    catalogId: 'core.widgets.catch_form_review_body',
    children: [
      WidgetbookCatalogStateCard(
        label: 'summary / step statuses',
        child: WidgetbookViewportFrame.device(
          size: const Size(
            WidgetbookPreviewLayout.phoneChromeWidth,
            WidgetbookPreviewLayout.paperScaffoldViewportHeight,
          ),
          child: CatchFormReviewPageBody(
            fieldCopy: catchFieldCopy(context.l10n),
            statusLabelBuilder: catchFormStepStatusLabelBuilder(context.l10n),
            message: 'Review the event before publishing.',
            onStepSelected: _ignoreInt,
            summaryItems: const [
              CatchFormReviewSummaryItem(label: 'Event', value: 'Sundowner 5K'),
            ],
            items: const [
              CatchFormStepReviewItem(
                index: 0,
                title: 'Event basics',
                status: CatchFormStepListStatus.complete,
              ),
              CatchFormStepReviewItem(
                index: 1,
                title: 'Meeting point',
                status: CatchFormStepListStatus.needsInformation,
              ),
            ],
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Page insets',
  type: CatchPageBody,
  path: '[Core catalog]/Layout',
)
Widget catchPageBodyCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'Page insets',
    catalogId: 'catch.screen_body',
    children: [
      WidgetbookCatalogStateCard(
        label: 'standard body insets',
        child: SizedBox(
          height: WidgetbookPreviewLayout.insetPreviewHeight,
          child: ColoredBox(
            color: CatchTokens.of(context).raised,
            child: CatchPageBody(
              child: widgetbookCatalogTextData('Page content'),
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Form step insets',
  type: CatchPageBody,
  path: '[Core catalog]/Layout',
)
Widget catchFormStepBodyCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'Form step insets',
    catalogId: 'catch.screen_body',
    children: [
      WidgetbookCatalogStateCard(
        label: 'form-step insets',
        child: SizedBox(
          height: WidgetbookPreviewLayout.insetPreviewHeight,
          child: ColoredBox(
            color: CatchTokens.of(context).raised,
            child: CatchPageBody.formStep(
              child: widgetbookCatalogTextData('Form step content'),
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Sliver insets',
  type: CatchPageBody,
  path: '[Core catalog]/Layout',
)
Widget catchSliverPageBodyCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'Sliver insets',
    catalogId: 'catch.screen_body',
    children: [
      WidgetbookCatalogStateCard(
        label: 'sliver-native insets',
        child: SizedBox(
          height: WidgetbookPreviewLayout.stateViewportHeight,
          child: ColoredBox(
            color: CatchTokens.of(context).raised,
            child: CustomScrollView(
              slivers: [
                CatchPageBody.sliver(
                  child: widgetbookCatalogSliverTextData('Sliver page content'),
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
  name: 'Catalog states',
  type: CatchScrollTerminalGap,
  path: '[Core catalog]/Layout',
)
Widget catchScrollTerminalGapCatalogStates(BuildContext context) {
  const safeBottom = CatchSpacing.s5;
  const previewMediaQuery = MediaQueryData(
    padding: EdgeInsets.only(bottom: safeBottom),
    viewPadding: EdgeInsets.only(bottom: safeBottom),
  );
  final t = CatchTokens.of(context);

  Widget clearanceBand(String measurement) {
    return Stack(
      children: [
        ColoredBox(
          color: t.primary.withValues(alpha: 0.12),
          child: const SizedBox(
            width: double.infinity,
            child: CatchScrollTerminalGap(),
          ),
        ),
        Positioned.fill(
          child: Center(
            child: Text(
              measurement,
              style: CatchTextStyles.supporting(context, color: t.primary),
            ),
          ),
        ),
      ],
    );
  }

  Widget sample({
    required String label,
    required String description,
    required Widget child,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(label, style: CatchTextStyles.fieldRowTitle(context)),
        gapH4,
        Text(description, style: CatchTextStyles.supporting(context)),
        gapH8,
        ClipRRect(
          borderRadius: BorderRadius.circular(CatchRadius.sm),
          child: child,
        ),
      ],
    );
  }

  return WidgetbookCatalogFrame(
    title: 'Terminal scroll space',
    catalogId: 'catch.screen_body.scroll_terminal_gap',
    children: [
      WidgetbookCatalogStateCard(
        label: 'floating / anchored / no shell',
        description:
            'The colored band is the real terminal spacer. Each state uses '
            'the same default breathing room.',
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            sample(
              label: 'iOS floating shell',
              description: 'Consumes the complete floating tab obstruction.',
              child: Theme(
                data: Theme.of(context).copyWith(platform: TargetPlatform.iOS),
                child: MediaQuery(
                  data: previewMediaQuery,
                  child: Builder(
                    builder: (context) {
                      final overlay = CatchTabBar.reservedBottomInset(context);
                      final total = overlay + CatchSpacing.screenPb;
                      return CatchTabViewportScope(
                        index: appShellHomeTabIndex,
                        bottomOverlayInset: overlay,
                        bottomBarPlacement:
                            CatchTabViewportScopePlacement.floating,
                        child: clearanceBand(
                          '${total.toStringAsFixed(0)} px · overlay + breathing',
                        ),
                      );
                    },
                  ),
                ),
              ),
            ),
            gapH16,
            sample(
              label: 'Android anchored shell',
              description:
                  'The scaffold reserves the bar; this adds breathing.',
              child: MediaQuery(
                data: previewMediaQuery,
                child: CatchTabViewportScope(
                  index: appShellHomeTabIndex,
                  bottomBarPlacement: CatchTabViewportScopePlacement.anchored,
                  child: clearanceBand(
                    '${CatchSpacing.screenPb.toStringAsFixed(0)} px · breathing',
                  ),
                ),
              ),
            ),
            gapH16,
            sample(
              label: 'No shell chrome',
              description: 'Preserves the safe area, then adds breathing.',
              child: MediaQuery(
                data: previewMediaQuery,
                child: clearanceBand(
                  '${(safeBottom + CatchSpacing.screenPb).toStringAsFixed(0)} '
                  'px · safe area + breathing',
                ),
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
  type: CatchHeroViewport,
  path: '[Core catalog]/Motion',
)
Widget catchTicketHeroCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'CatchHeroViewport.ticket',
    catalogId: 'core.motion.catch_ticket_hero',
    children: [
      WidgetbookCatalogStateCard(
        label: 'ticket hero wrapper',
        child: CatchHeroViewport.ticket(
          prefix: 'event',
          id: 'widgetbook-ticket',
          child: CatchSurface.card(
            child: Text(
              'Ticket surface keeps the shared Hero tag and flight behavior.',
              style: CatchTextStyles.bodyM(context),
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: CatchRevealViewport,
  path: '[Core catalog]/Motion',
)
Widget catchMapRevealTransitionCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'CatchRevealViewport.stationary',
    catalogId: 'core.motion.catch_map_reveal_transition',
    children: [
      for (final reducedMotion in [false, true])
        WidgetbookCatalogStateCard(
          label: reducedMotion ? 'reduced motion' : 'paper veil / mid reveal',
          child: MediaQuery(
            data: MediaQuery.of(
              context,
            ).copyWith(disableAnimations: reducedMotion),
            child: SizedBox(
              height: CatchLayout.distanceRingDefaultSize,
              child: CatchRevealViewport.stationary(
                animation: const AlwaysStoppedAnimation<double>(0.58),
                child: CatchSurface.card(
                  child: Center(
                    child: Text(
                      'Native map remains stationary below the veil.',
                      style: CatchTextStyles.bodyM(context),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: CatchViewport,
  path: '[Core catalog]/Layout',
)
Widget responsiveBuilderCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'Viewport layouts',
    catalogId: 'catch.viewport',
    children: [
      WidgetbookCatalogStateCard(
        label: 'compact / medium / expanded',
        child: SizedBox(
          height: WidgetbookPreviewLayout.catalogSliverSpacerHeight,
          child: CatchViewport(
            compactBuilder: (_) => CatchSurface.card(
              child: Text(
                'Compact layout',
                style: CatchTextStyles.bodyM(context),
              ),
            ),
            mediumBuilder: (_) => CatchSurface.card(
              child: Text(
                'Medium layout',
                style: CatchTextStyles.bodyM(context),
              ),
            ),
            expandedBuilder: (_) => CatchSurface.card(
              child: Text(
                'Expanded layout',
                style: CatchTextStyles.bodyM(context),
              ),
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Local breakpoint',
  type: CatchViewport,
  path: '[Core catalog]/Layout',
)
Widget catchViewportBreakpointCatalogStates(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'Local breakpoint',
      catalogId: 'catch.viewport',
      children: [
        for (final width in [319.0, 320.0, 321.0])
          WidgetbookCatalogStateCard(
            label: '${width.toInt()} px at a 320 px component breakpoint',
            child: Align(
              alignment: Alignment.centerLeft,
              child: SizedBox(
                width: width,
                child: CatchViewport.atWidth(
                  breakpoint: 320,
                  compactBuilder: (_) => CatchSurface.card(
                    child: Text(
                      'Compact component',
                      style: CatchTextStyles.bodyM(context),
                    ),
                  ),
                  expandedBuilder: (_) => CatchSurface.card(
                    child: Text(
                      'Expanded component',
                      style: CatchTextStyles.bodyM(context),
                    ),
                  ),
                ),
              ),
            ),
          ),
      ],
    );

@widgetbook.UseCase(
  name: 'Local sliver geometry',
  type: CatchViewport,
  path: '[Core catalog]/Layout',
)
Widget catchViewportSliverCatalogStates(
  BuildContext context,
) => WidgetbookCatalogFrame(
  title: 'Sliver geometry',
  catalogId: 'catch.viewport',
  children: [
    for (final width in [320.0, 600.0, 840.0])
      WidgetbookCatalogStateCard(
        label: '${width.toInt()} px sliver cross-axis extent',
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: SizedBox(
            width: width,
            height: 100,
            child: CustomScrollView(
              slivers: [
                CatchViewport.sliver(
                  sliverBuilder:
                      (
                        BuildContext context,
                        CatchViewportGeometry viewport,
                      ) => SliverToBoxAdapter(
                        child: CatchSurface.card(
                          child: Text(
                            '${viewport.width.toInt()} px · ${viewport.sizeClass.name}',
                            style: CatchTextStyles.bodyM(context),
                          ),
                        ),
                      ),
                ),
              ],
            ),
          ),
        ),
      ),
  ],
);

void _ignoreInt(int _) {}
