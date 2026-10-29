import 'package:catch_dating_app/contexts/events/parts/event_activity_visuals.dart';
import 'package:catch_dating_app/contexts/events/parts/event_backdrop_image.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_detail_fact_list.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_detail_hero_top_bar.dart';
import 'package:catch_dating_app/events/shared/event_detail_route_transition.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/catalog_preview.dart';
import 'package:widgetbook_workspace/support/contract_preview.dart';

import '../../preview_layout_contracts.dart';
import '../../support/widgetbook_harness.dart';
import 'event_fixtures.dart';

@widgetbook.UseCase(
  name: 'Catalog states',
  type: CatchTicketDivider,
  path: '[Core catalog]/Event cards',
)
Widget eventTicketSurfaceCatalogStates(BuildContext context) {
  final t = CatchTokens.of(context);
  return WidgetbookCatalogFrame(
    title: 'Event ticket surface atoms',
    catalogId: 'events.widgets.event_ticket_surface',
    children: [
      WidgetbookCatalogStateCard(
        label: 'perforated divider / clipped shape',
        child: Column(
          children: [
            const CatchTicketDivider(),
            gapH16,
            PhysicalShape(
              clipper: const CatchTicketShapeClipper(
                cornerRadius: CatchRadius.lg,
                notchRadius: CatchLayout.ticketNotchRadius,
                notchDepth: CatchLayout.ticketNotchDepth,
                notchCenterY: 86,
              ),
              color: t.surface,
              elevation: CatchElevation.physicalTicket,
              child: SizedBox(
                height: WidgetbookPreviewLayout.catalogFeaturePanelHeight,
                child: Column(
                  children: [
                    Expanded(
                      child: EventBackdropImage(
                        visual: eventActivityVisual(
                          ActivityKind.socialRun,
                          context: context,
                        ),
                        dense: true,
                      ),
                    ),
                    const CatchTicketDivider(),
                    const Padding(
                      padding: EdgeInsets.all(CatchSpacing.s4),
                      child: Text('Ticket body surface'),
                    ),
                  ],
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
  type: EventDetailHeroTopBar,
  path: '[Core catalog]/Event detail',
)
Widget eventDetailHeroCatalogStates(BuildContext context) {
  final event = widgetbookCatalogEvent();
  return WidgetbookCatalogFrame(
    title: 'EventDetailHeroTopBar',
    catalogId: 'events.widgets.event_detail_hero_app_bar',
    children: [
      WidgetbookCatalogStateCard(
        label: 'standard / saved / calendar action',
        child: WidgetbookCatalogPhoneFrame(
          height: WidgetbookPreviewLayout.tallRouteViewportHeight,
          child: CustomScrollView(
            slivers: [
              EventDetailHeroTopBar(
                event: event,
                isSaved: true,
                savePending: false,
                showAddToCalendar: true,
                onBack: widgetbookNoop,
                onShare: (_) {},
                onToggleSaved: widgetbookNoop,
                onAddToCalendar: (_) {},
              ),
              const SliverToBoxAdapter(
                child: SizedBox(
                  height: WidgetbookPreviewLayout.catalogSliverSpacerHeight,
                ),
              ),
            ],
          ),
        ),
      ),
      WidgetbookCatalogStateCard(
        label: 'ticket and spotlight modes',
        child: WidgetbookContractWrap(
          crossAxisAlignment: WrapCrossAlignment.start,
          children: [
            WidgetbookCatalogPhoneFrame(
              height: WidgetbookPreviewLayout.startupViewportHeight,
              child: CustomScrollView(
                slivers: [
                  EventDetailHeroTopBar(
                    event: event,
                    isSaved: false,
                    savePending: true,
                    showAddToCalendar: false,
                    presentationMode: EventDetailPresentationMode.ticket,
                    onBack: widgetbookNoop,
                    onShare: (_) {},
                    onToggleSaved: widgetbookNoop,
                    onAddToCalendar: (_) {},
                  ),
                  const SliverToBoxAdapter(
                    child: SizedBox(
                      height: WidgetbookPreviewLayout.loadingSlotHeight,
                    ),
                  ),
                ],
              ),
            ),
            WidgetbookCatalogPhoneFrame(
              height: WidgetbookPreviewLayout.startupViewportHeight,
              child: CustomScrollView(
                slivers: [
                  EventDetailHeroTopBar(
                    event: event,
                    isSaved: false,
                    savePending: false,
                    showAddToCalendar: true,
                    presentationMode: EventDetailPresentationMode.spotlightDark,
                    onBack: widgetbookNoop,
                    onShare: (_) {},
                    onToggleSaved: widgetbookNoop,
                    onAddToCalendar: (_) {},
                  ),
                  const SliverToBoxAdapter(
                    child: SizedBox(
                      height: WidgetbookPreviewLayout.loadingSlotHeight,
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
  type: EventDetailTicketStubRow,
  path: '[Core catalog]/Event detail',
)
Widget eventDetailTicketStubCatalogStates(BuildContext context) {
  final t = CatchTokens.of(context);
  return WidgetbookCatalogFrame(
    title: 'EventDetailTicketStubRow',
    catalogId: 'events.widgets.event_detail_ticket_stub',
    children: [
      WidgetbookCatalogStateCard(
        label: 'band / three cells / dark notch',
        child: Column(
          children: [
            EventDetailTicketStubRow(
              event: widgetbookCatalogEvent(),
              notchBackgroundColor: t.bg,
            ),
            gapH16,
            ColoredBox(
              color: t.ink,
              child: EventDetailTicketStubRow(
                event: widgetbookCatalogEvent(
                  activityKind: ActivityKind.dinner,
                  title: 'Dinner for six',
                  priceInPaise: 140000,
                ),
                notchBackgroundColor: t.ink,
              ),
            ),
          ],
        ),
      ),
    ],
  );
}
