import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_dating_app/cross_paths/presentation/cross_paths_event_consent_section.dart';
import 'package:catch_dating_app/cross_paths/presentation/cross_paths_event_consent_state.dart';
import 'package:catch_dating_app/events/presentation/event_detail_display_state.dart';
import 'package:catch_dating_app/events/presentation/event_detail_information_state.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_detail_body.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_detail_loading_skeleton.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_detail_overview_section.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_detail_surface_style.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_photo_header.dart';
import 'package:catch_dating_app/events/shared/event_detail_route_transition.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import '../../support/contract_preview.dart';
import '../../support/page_preview.dart';
import 'event_scope.dart';
import 'fixtures.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Overview states',
  type: EventDetailOverviewSection,
  path: '[Event Detail]/Sections',
)
Widget eventDetailOverviewSectionStates(BuildContext context) {
  final fallbackEvent = widgetbookEvent.copyWith(
    description: '',
    eventPhotos: const [],
  );
  final approvalEvent = widgetbookEventDetailFixture(
    id: 'widgetbook-event-detail-approval',
    activityKind: ActivityKind.dinner,
    priceInPaise: 140000,
    bookedCount: 10,
    eventPolicy: EventPolicyBundle.requestToJoinEvent(
      capacityLimit: 12,
      basePriceInPaise: 140000,
    ),
  );

  return WidgetbookScrollCatalogFrame(
    title: 'EventDetailOverviewSection',
    catalogId: 'section.event.plan',
    children: [
      WidgetbookPageStateCard(
        label: 'standard run plan',
        child: EventDetailOverviewSection(
          event: widgetbookEvent,
          informationState: eventDetailInformationStateFrom(
            event: widgetbookEvent,
            l10n: context.l10n,
          ),
          onLocationTap: widgetbookNoop,
          enableMapNetworkTiles: false,
        ),
      ),
      WidgetbookPageStateCard(
        label: 'fallback plan / no photos',
        child: EventDetailOverviewSection(
          event: fallbackEvent,
          informationState: eventDetailInformationStateFrom(
            event: fallbackEvent,
            l10n: context.l10n,
          ),
          enableMapNetworkTiles: false,
        ),
      ),
      WidgetbookPageStateCard(
        label: 'approval and paid policy',
        child: EventDetailOverviewSection(
          event: approvalEvent,
          informationState: eventDetailInformationStateFrom(
            event: approvalEvent,
            l10n: context.l10n,
          ),
          onLocationTap: widgetbookNoop,
          enableMapNetworkTiles: false,
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Event description',
  type: EventDescriptionSection,
  path: '[Event Detail]/Sections',
)
Widget eventDescriptionState(BuildContext context) {
  return const Padding(
    padding: CatchInsets.contentDense,
    child: EventDescriptionSection(
      description:
          'A low-pressure morning plan with a clear route, relaxed pace, and coffee after.',
    ),
  );
}

@widgetbook.UseCase(
  name: 'Cross Paths consent states',
  type: CrossPathsEventConsentSection,
  path: '[Event Detail]/Sections',
)
Widget crossPathsEventConsentStates(BuildContext context) {
  Widget state({bool enabled = false, bool loaded = true}) => IgnorePointer(
    child: CrossPathsEventConsentSection(
      state: CrossPathsEventConsentSectionState(
        visible: true,
        enabled: enabled,
        loaded: loaded,
        pending: false,
        unavailable: false,
      ),
      onChanged: _noopBool,
    ),
  );

  return WidgetbookScrollCatalogFrame(
    title: 'CrossPathsEventConsentSection',
    catalogId: 'section.event.cross_paths_consent',
    children: [
      WidgetbookPageStateCard(label: 'available and off', child: state()),
      WidgetbookPageStateCard(label: 'enabled', child: state(enabled: true)),
      WidgetbookPageStateCard(label: 'loading', child: state(loaded: false)),
      WidgetbookPageStateCard(
        label: 'text scale 2',
        child: MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: const TextScaler.linear(2)),
          child: state(),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Initial event loading body states',
  type: EventDetailBody,
  path: '[Event Detail]/Sections',
)
Widget eventDetailInitialEventLoadingBodyStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'EventDetailBody initial loading',
    catalogId: 'section.event.initial_loading_body',
    children: [
      WidgetbookPageStateCard(
        label: 'standard fallback body',
        child: WidgetbookEventDeviceFrame(
          child: WidgetbookEventScope(
            event: widgetbookEvent,
            child: EventDetailBody(
              event: widgetbookEvent,
              userProfile: null,
              clubId: widgetbookEventsClubId,
              reviews: const [],
              isAuthenticated: false,
              sectionVisibility: eventDetailSectionVisibilityStateFrom(
                event: widgetbookEvent,
                participation: null,
                isHostApp: false,
                isHost: false,
                now: widgetbookEventsNow,
              ),
              isSaved: false,
              participation: null,
              savePending: false,
              onBack: widgetbookNoop,
              onShare: widgetbookEventsNoopContext,
              showShareAction: false,
              showAddToCalendar: false,
              onAddToCalendar: widgetbookEventsNoopContext,
              onToggleSaved: widgetbookNoop,
              companionState: const EventDetailCompanionState.hidden(),
              hostState: const EventDetailHostState.loading(),
              socialState: const EventDetailSocialState.loading(),
              informationState: eventDetailInformationStateFrom(
                event: widgetbookEvent,
                l10n: context.l10n,
              ),
              onLocationTap: widgetbookNoop,
              onOpenCompanion: widgetbookNoop,
              onRetryCompanion: widgetbookNoop,
              onViewClub: widgetbookIgnoreString,
              onMessageHost: widgetbookEventsNoopMessageHost,
              onRetryHosts: widgetbookNoop,
              now: widgetbookEventsNow,
              enableMapNetworkTiles: false,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'spotlight fallback body',
        child: WidgetbookEventDeviceFrame(
          child: Builder(
            builder: (context) {
              final style = EventDetailSurfaceStyle.dark(
                CatchTokens.of(context),
              );
              return ColoredBox(
                color: style.pageBackground,
                child: WidgetbookEventScope(
                  event: widgetbookEvent,
                  child: EventDetailBody(
                    event: widgetbookEvent,
                    userProfile: null,
                    clubId: widgetbookEventsClubId,
                    reviews: const [],
                    isAuthenticated: false,
                    sectionVisibility: eventDetailSectionVisibilityStateFrom(
                      event: widgetbookEvent,
                      participation: null,
                      isHostApp: false,
                      isHost: false,
                      now: widgetbookEventsNow,
                    ),
                    isSaved: false,
                    participation: null,
                    savePending: false,
                    surfaceStyle: style,
                    onBack: widgetbookNoop,
                    onShare: widgetbookEventsNoopContext,
                    showShareAction: false,
                    showAddToCalendar: false,
                    onAddToCalendar: widgetbookEventsNoopContext,
                    onToggleSaved: widgetbookNoop,
                    companionState: const EventDetailCompanionState.hidden(),
                    hostState: const EventDetailHostState.loading(),
                    socialState: const EventDetailSocialState.loading(),
                    informationState: eventDetailInformationStateFrom(
                      event: widgetbookEvent,
                      l10n: context.l10n,
                    ),
                    onLocationTap: widgetbookNoop,
                    onOpenCompanion: widgetbookNoop,
                    onRetryCompanion: widgetbookNoop,
                    onViewClub: widgetbookIgnoreString,
                    onMessageHost: widgetbookEventsNoopMessageHost,
                    onRetryHosts: widgetbookNoop,
                    now: widgetbookEventsNow,
                    presentationMode: EventDetailPresentationMode.spotlightDark,
                    enableMapNetworkTiles: false,
                  ),
                ),
              );
            },
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Event detail hosts skeleton',
  type: EventDetailHostsSkeleton,
  path: '[Event Detail]/Sections',
)
Widget eventDetailHostsSkeletonState(BuildContext context) {
  return const Padding(
    padding: CatchInsets.contentDense,
    child: EventDetailHostsSkeleton(),
  );
}

@widgetbook.UseCase(
  name: 'Event detail companion skeleton',
  type: EventDetailCompanionSkeleton,
  path: '[Event Detail]/Sections',
)
Widget eventDetailCompanionSkeletonState(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'EventDetailCompanionSkeleton',
    catalogId: 'section.event.companion_skeleton',
    children: [
      WidgetbookPageStateCard(
        label: 'light surface',
        child: WidgetbookEventDeviceFrame(
          child: Padding(
            padding: CatchInsets.content,
            child: EventDetailCompanionSkeleton(
              surfaceStyle: EventDetailSurfaceStyle.light(
                CatchTokens.of(context),
              ),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'ticket surface',
        child: WidgetbookEventDeviceFrame(
          child: Padding(
            padding: CatchInsets.content,
            child: EventDetailCompanionSkeleton(
              surfaceStyle: EventDetailSurfaceStyle.dark(
                CatchTokens.of(context),
              ),
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Event detail social skeleton',
  type: EventDetailSocialSkeleton,
  path: '[Event Detail]/Sections',
)
Widget eventDetailSocialSkeletonState(BuildContext context) {
  return const Padding(
    padding: CatchInsets.contentDense,
    child: EventDetailSocialSkeleton(),
  );
}

@widgetbook.UseCase(
  name: 'Event photo header',
  type: EventPhotoHeader,
  path: '[Event Detail]/Sections',
)
Widget eventPhotoHeaderState(BuildContext context) {
  return SizedBox(
    height: WidgetbookPreviewLayout.tallNarrowPanelHeight,
    child: EventPhotoHeader(event: widgetbookEvent),
  );
}

void _noopBool(bool value) {}

@widgetbook.UseCase(
  name: 'Ticket stub tile skeleton',
  type: TicketStubTileSkeleton,
  path: '[Event Detail]/Sections',
)
Widget ticketStubTileSkeletonState(BuildContext context) {
  return const WidgetbookScrollCatalogFrame(
    title: 'TicketStubTileSkeleton',
    catalogId: 'section.event.ticket_stub_tile_skeleton',
    children: [
      WidgetbookPageStateCard(
        label: 'loading cell',
        child: SizedBox(width: 160, child: TicketStubTileSkeleton()),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Itinerary list skeleton',
  type: EventDetailItineraryListSkeleton,
  path: '[Event Detail]/Sections',
)
Widget eventDetailItineraryListSkeletonState(BuildContext context) {
  return const WidgetbookScrollCatalogFrame(
    title: 'EventDetailItineraryListSkeleton',
    catalogId: 'section.event.itinerary_skeleton',
    children: [
      WidgetbookPageStateCard(
        label: 'loading itinerary',
        child: EventDetailItineraryListSkeleton(),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Loading dock',
  type: EventDetailLoadingDock,
  path: '[Event Detail]/Sections',
)
Widget eventDetailLoadingDockState(BuildContext context) {
  return const WidgetbookScrollCatalogFrame(
    title: 'EventDetailLoadingDock',
    catalogId: 'section.event.loading_dock',
    children: [
      WidgetbookPageStateCard(
        label: 'booking action loading',
        child: EventDetailLoadingDock(),
      ),
    ],
  );
}
