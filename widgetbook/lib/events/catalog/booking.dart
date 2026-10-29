import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event_viewer_state.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/contexts/payments/data/payment_repository.dart';
import 'package:catch_dating_app/events/presentation/event_detail_display_state.dart';
import 'package:catch_dating_app/events/presentation/event_detail_information_state.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_detail_body.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_detail_dock.dart';
import 'package:catch_dating_app/events/shared/event_detail_route_transition.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/contract_preview.dart';
import '../../support/page_preview.dart';
import '../../support/widgetbook_harness.dart';
import 'event_scope.dart';
import 'fixtures.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'BookingDock states',
  type: EventBookingDock,
  path: '[Event Detail]/Sections',
)
Widget eventDetailBookingDockStates(BuildContext context) {
  final t = CatchTokens.of(context);
  return WidgetbookScrollCatalogFrame(
    title: 'EventBookingDock',
    catalogId: 'section.event.booking_dock',
    children: [
      WidgetbookPageStateCard(
        label: 'guest',
        child: const WidgetbookContentFrame(
          child: EventBookingDock(
            label: 'Sign in to book this event',
            onPressed: widgetbookNoop,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'bookable with price',
        child: WidgetbookContentFrame(
          child: EventBookingDock(
            label: 'Book event',
            onPressed: widgetbookNoop,
            leadingContent: const EventPriceText(
              price: '₹1,400',
              note: '2 spots left',
              warn: true,
            ),
            buttonAccentColor: t.primary,
            catchLine: 'Matching opens for everyone who goes',
            catchLineAccent: t.primary,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'pending',
        child: WidgetbookContentFrame(
          child: EventBookingDock(
            label: 'Join event - 3 spots left',
            onPressed: null,
            isLoading: true,
            buttonAccentColor: t.primary,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'failed mutation',
        child: WidgetbookContentFrame(
          child: EventBookingDock(
            label: 'Join event - 3 spots left',
            onPressed: widgetbookNoop,
            errorMessage: 'Unable to book this event right now.',
            buttonAccentColor: t.primary,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'booked',
        child: WidgetbookContentFrame(
          child: EventBookingDock(
            label: 'Cancel booking',
            onPressed: widgetbookNoop,
            leadingContent: EventDockStatusText(
              icon: CatchIcons.success,
              label: "You're in!",
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'waitlist',
        child: const WidgetbookContentFrame(
          child: EventBookingDock(
            label: 'Join waitlist',
            onPressed: widgetbookNoop,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'waitlist offer',
        child: WidgetbookContentFrame(
          child: EventBookingDock(
            label: 'Accept spot',
            onPressed: widgetbookNoop,
            leadingContent: WaitlistOfferNotice(
              expiresAt: widgetbookEventsNow.add(const Duration(hours: 5)),
              isDeclining: false,
              onDecline: widgetbookNoop,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'full / cancelled / past / attended',
        child: Column(
          children: [
            const WidgetbookContentFrame(
              child: EventBookingDock(
                label: 'Spots for your gender are full',
                onPressed: null,
              ),
            ),
            gapH12,
            const WidgetbookContentFrame(
              child: EventBookingDock(
                label: 'This event has ended',
                onPressed: null,
              ),
            ),
            gapH12,
            WidgetbookContentFrame(
              child: EventBookingDock(
                label: 'You attended this event',
                onPressed: null,
                leadingContent: EventDockStatusText(
                  icon: CatchIcons.activity,
                  label: 'Completed',
                ),
              ),
            ),
          ],
        ),
      ),
      WidgetbookPageStateCard(
        label: 'host hidden',
        child: const WidgetbookEventHiddenSectionState(
          message: 'No booking dock is composed in host app context.',
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Connected dock states',
  type: EventDetailDock,
  path: '[Event Detail]/Sections',
)
Widget eventDetailDockStates(BuildContext context) {
  final viewerUid = widgetbookEventsViewer.uid;
  final overrides = [
    uidProvider.overrideWithValue(AsyncData<String?>(viewerUid)),
    eventViewerStateProvider(widgetbookEvent.id, viewerUid).overrideWithValue(
      AsyncData(
        widgetbookEventViewerSnapshot(
          widgetbookEvent,
          admission: EventViewerAdmission.none,
        ),
      ),
    ),
    paymentRepositoryProvider.overrideWithValue(
      WidgetbookEventFakePaymentRepository(),
    ),
  ];
  return WidgetbookPageCatalogFrame(
    title: 'EventDetailDock',
    contractId: 'section.event.booking_dock_connected',
    children: [
      for (final (label, darkSurface) in [
        ('eligible on light surface', false),
        ('eligible on dark surface', true),
      ])
        WidgetbookPageStateCard(
          label: label,
          child: WidgetbookFixtureScope(
            overrides: overrides,
            child: EventDetailDock(
              event: widgetbookEvent,
              userProfile: widgetbookEventsViewer,
              clubId: widgetbookEventsClubId,
              participation: null,
              now: widgetbookEventsNow,
              darkSurface: darkSurface,
            ),
          ),
        ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Prompt states',
  type: EventDetailBody,
  path: '[Event Detail]/Sections',
)
Widget eventDetailPromptBodyStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'EventDetailBody prompts',
    catalogId: 'section.event.companion_invite',
    children: [
      WidgetbookPageStateCard(
        label: 'hidden',
        child: WidgetbookEventDeviceFrame(
          child: WidgetbookEventScope(
            event: widgetbookEvent,
            plan: null,
            child: EventDetailBody(
              event: widgetbookEvent,
              userProfile: widgetbookEventsViewer,
              clubId: widgetbookEventsClubId,
              reviews: const [],
              isAuthenticated: true,
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
              showAddToCalendar: false,
              onAddToCalendar: widgetbookEventsNoopContext,
              onToggleSaved: widgetbookNoop,
              companionState: const EventDetailCompanionState.hidden(),
              hostState: const EventDetailHostState.hidden(),
              socialState: eventDetailSocialStateFrom(
                event: widgetbookEvent,
                hasReviews: false,
                userProfile: widgetbookEventsViewer,
                isAuthenticated: true,
                renderAsHost: false,
                participation: null,
                now: widgetbookEventsNow,
              ),
              informationState: eventDetailInformationStateFrom(
                event: widgetbookEvent,
                l10n: context.l10n,
              ),
              onLocationTap: null,
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
        label: 'companion available',
        child: WidgetbookEventDeviceFrame(
          child: WidgetbookEventScope(
            event: widgetbookEvent,
            plan: EventSuccessPlan.defaultForEvent(
              widgetbookEvent,
              now: widgetbookEventsNow,
            ),
            child: EventDetailBody(
              event: widgetbookEvent,
              userProfile: widgetbookEventsViewer,
              clubId: widgetbookEventsClubId,
              reviews: widgetbookEventsReviews,
              isAuthenticated: true,
              sectionVisibility: eventDetailSectionVisibilityStateFrom(
                event: widgetbookEvent,
                participation: widgetbookEventsSignedUp,
                isHostApp: false,
                isHost: false,
                now: widgetbookEventsNow,
              ),
              isSaved: true,
              participation: widgetbookEventsSignedUp,
              savePending: false,
              onBack: widgetbookNoop,
              onShare: widgetbookEventsNoopContext,
              showAddToCalendar: false,
              onAddToCalendar: widgetbookEventsNoopContext,
              onToggleSaved: widgetbookNoop,
              companionState: const EventDetailCompanionState.available(),
              hostState: const EventDetailHostState.hidden(),
              socialState: eventDetailSocialStateFrom(
                event: widgetbookEvent,
                hasReviews: widgetbookEventsReviews.isNotEmpty,
                userProfile: widgetbookEventsViewer,
                isAuthenticated: true,
                renderAsHost: false,
                participation: widgetbookEventsSignedUp,
                now: widgetbookEventsNow,
              ),
              informationState: eventDetailInformationStateFrom(
                event: widgetbookEvent,
                l10n: context.l10n,
              ),
              onLocationTap: null,
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
        label: 'invite loop available',
        child: WidgetbookEventDeviceFrame(
          child: WidgetbookEventScope(
            event: widgetbookEvent,
            plan: null,
            child: EventDetailBody(
              event: widgetbookEvent,
              userProfile: widgetbookEventsViewer,
              clubId: widgetbookEventsClubId,
              reviews: widgetbookEventsReviews,
              isAuthenticated: true,
              sectionVisibility: eventDetailSectionVisibilityStateFrom(
                event: widgetbookEvent,
                participation: widgetbookEventsSignedUp,
                isHostApp: false,
                isHost: false,
                now: widgetbookEventsNow,
              ),
              isSaved: true,
              participation: widgetbookEventsSignedUp,
              savePending: false,
              onBack: widgetbookNoop,
              onShare: widgetbookEventsNoopContext,
              showAddToCalendar: false,
              onAddToCalendar: widgetbookEventsNoopContext,
              onToggleSaved: widgetbookNoop,
              companionState: const EventDetailCompanionState.hidden(),
              hostState: const EventDetailHostState.hidden(),
              socialState: eventDetailSocialStateFrom(
                event: widgetbookEvent,
                hasReviews: widgetbookEventsReviews.isNotEmpty,
                userProfile: widgetbookEventsViewer,
                isAuthenticated: true,
                renderAsHost: false,
                participation: widgetbookEventsSignedUp,
                now: widgetbookEventsNow,
              ),
              informationState: eventDetailInformationStateFrom(
                event: widgetbookEvent,
                l10n: context.l10n,
              ),
              onLocationTap: null,
              onOpenCompanion: widgetbookNoop,
              onRetryCompanion: widgetbookNoop,
              onViewClub: widgetbookIgnoreString,
              onMessageHost: widgetbookEventsNoopMessageHost,
              onRetryHosts: widgetbookNoop,
              now: widgetbookEventsNow,
              presentationMode: EventDetailPresentationMode.ticket,
              enableMapNetworkTiles: false,
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Price leading',
  type: EventPriceText,
  path: '[Event Detail]/Booking Dock',
)
Widget priceLeadingState(BuildContext context) {
  return const EventPriceText(
    price: '₹1,400',
    note: '2 spots left',
    warn: true,
  );
}

@widgetbook.UseCase(
  name: 'Waitlist offer leading',
  type: WaitlistOfferNotice,
  path: '[Event Detail]/Booking Dock',
)
Widget waitlistOfferLeadingState(BuildContext context) {
  return WaitlistOfferNotice(
    expiresAt: widgetbookEventsNow.add(const Duration(hours: 5)),
    isDeclining: false,
    onDecline: widgetbookNoop,
  );
}

@widgetbook.UseCase(
  name: 'Status leading states',
  type: EventDockStatusText,
  path: '[Event Detail]/Booking Dock',
)
Widget eventCtaStatusLeadingStates(BuildContext context) {
  return Column(
    mainAxisSize: MainAxisSize.min,
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      EventDockStatusText(icon: CatchIcons.success, label: "You're in!"),
      gapH12,
      EventDockStatusText(icon: CatchIcons.activity, label: 'Completed'),
    ],
  );
}
