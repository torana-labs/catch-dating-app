import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation_roster.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/route_event_plan.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/events/presentation/event_detail_display_state.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_detail_body.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_detail_route_section.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_detail_social_section.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_detail_surface_style.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_hype_avatar_row.dart';
import 'package:catch_dating_app/events/presentation/widgets/who_is_going_section.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/contract_preview.dart';
import '../../support/page_preview.dart';
import 'event_scope.dart';
import 'fixtures.dart';
import 'preview.dart';

final _emptyEvent = widgetbookEventDetailFixture(
  id: 'widgetbook-event-detail-empty',
  bookedCount: 0,
  waitlistedCount: 0,
);

final _attended = EventParticipation(
  id: '${widgetbookEventsPastEvent.id}_$widgetbookEventsViewerUid',
  eventId: widgetbookEventsPastEvent.id,
  organizerId: widgetbookEventsOrganizerId,
  uid: widgetbookEventsViewerUid,
  status: EventParticipationStatus.attended,
  createdAt: widgetbookEventsNow.subtract(const Duration(days: 4)),
  updatedAt: widgetbookEventsNow.subtract(const Duration(hours: 12)),
  signedUpAt: widgetbookEventsNow.subtract(const Duration(days: 4)),
  attendedAt: widgetbookEventsNow.subtract(const Duration(hours: 12)),
  genderAtSignup: Gender.woman,
);

@widgetbook.UseCase(
  name: 'Social states',
  type: EventDetailSocialSection,
  path: '[Event Detail]/Sections',
)
Widget eventDetailSocialSectionStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'EventDetailSocialSection',
    catalogId: 'section.event.who_is_going',
    children: [
      WidgetbookPageStateCard(
        label: 'guest locked',
        child: WidgetbookEventScope(
          event: widgetbookEvent,
          roster: widgetbookEventsRoster(),
          child: EventDetailSocialSection(
            event: widgetbookEvent,
            organizerId: widgetbookEventsOrganizerId,
            reviews: const [],
            userProfile: null,
            state: eventDetailSocialStateFrom(
              event: widgetbookEvent,
              hasReviews: false,
              userProfile: null,
              isAuthenticated: false,
              renderAsHost: false,
              participation: null,
              now: widgetbookEventsNow,
            ),
            now: widgetbookEventsNow,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'member visible',
        child: WidgetbookEventScope(
          event: widgetbookEvent,
          roster: widgetbookEventsRoster(),
          child: EventDetailSocialSection(
            event: widgetbookEvent,
            organizerId: widgetbookEventsOrganizerId,
            reviews: const [],
            userProfile: widgetbookEventsViewer,
            state: eventDetailSocialStateFrom(
              event: widgetbookEvent,
              hasReviews: false,
              userProfile: widgetbookEventsViewer,
              isAuthenticated: true,
              renderAsHost: false,
              participation: widgetbookEventsSignedUp,
              now: widgetbookEventsNow,
            ),
            now: widgetbookEventsNow,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'empty roster',
        child: WidgetbookEventScope(
          event: _emptyEvent,
          roster: EventParticipationRoster.empty(),
          child: EventDetailSocialSection(
            event: _emptyEvent,
            organizerId: widgetbookEventsOrganizerId,
            reviews: const [],
            userProfile: widgetbookEventsViewer,
            state: eventDetailSocialStateFrom(
              event: _emptyEvent,
              hasReviews: false,
              userProfile: widgetbookEventsViewer,
              isAuthenticated: true,
              renderAsHost: false,
              participation: null,
              now: widgetbookEventsNow,
            ),
            now: widgetbookEventsNow,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'long avatar feed',
        child: WidgetbookEventScope(
          event: widgetbookEventsPastEvent,
          roster: widgetbookEventsRoster(
            event: widgetbookEventsPastEvent,
            count: 9,
          ),
          avatarItems: widgetbookEventsAvatarItems,
          child: EventDetailSocialSection(
            event: widgetbookEventsPastEvent,
            organizerId: widgetbookEventsOrganizerId,
            reviews: widgetbookEventsReviews,
            userProfile: widgetbookEventsViewer,
            state: eventDetailSocialStateFrom(
              event: widgetbookEventsPastEvent,
              hasReviews: widgetbookEventsReviews.isNotEmpty,
              userProfile: widgetbookEventsViewer,
              isAuthenticated: true,
              renderAsHost: false,
              participation: _attended,
              now: widgetbookEventsNow,
            ),
            now: widgetbookEventsNow,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Host section states',
  type: EventDetailHostsSection,
  path: '[Event Detail]/Sections',
)
Widget eventDetailHostSectionStates(BuildContext context) {
  final style = EventDetailSurfaceStyle.light(CatchTokens.of(context));
  return WidgetbookScrollCatalogFrame(
    title: 'EventDetailHostsSection',
    catalogId: 'section.event.hosts',
    children: [
      WidgetbookPageStateCard(
        label: 'hidden',
        child: WidgetbookEventDeviceFrame(
          child: EventDetailHostsSection(
            event: widgetbookEvent,
            state: const EventDetailHostState.hidden(),
            onViewOrganizer: widgetbookIgnoreString,
            onMessageHost: widgetbookEventsNoopMessageHost,
            onRetry: widgetbookNoop,
            surfaceStyle: style,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'loading',
        child: WidgetbookEventDeviceFrame(
          child: EventDetailHostsSection(
            event: widgetbookEvent,
            state: const EventDetailHostState.loading(),
            onViewOrganizer: widgetbookIgnoreString,
            onMessageHost: widgetbookEventsNoopMessageHost,
            onRetry: widgetbookNoop,
            surfaceStyle: style,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'content',
        child: WidgetbookEventDeviceFrame(
          child: EventDetailHostsSection(
            event: widgetbookEvent,
            state: const EventDetailHostState.content(
              organizerId: widgetbookEventsOrganizerId,
              hostUid: 'host-mira',
              hostName: 'Mira Shah',
              photoUrl:
                  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&q=80',
              meta: 'HOSTING SINCE JAN 2025 · BANDRA',
              verified: true,
              canMessage: true,
            ),
            onViewOrganizer: widgetbookIgnoreString,
            onMessageHost: widgetbookEventsNoopMessageHost,
            onRetry: widgetbookNoop,
            surfaceStyle: style,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'error',
        child: WidgetbookEventDeviceFrame(
          child: EventDetailHostsSection(
            event: widgetbookEvent,
            state: EventDetailHostState.error(
              StateError('Could not load host details.'),
            ),
            onViewOrganizer: widgetbookIgnoreString,
            onMessageHost: widgetbookEventsNoopMessageHost,
            onRetry: widgetbookNoop,
            surfaceStyle: style,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Guest who is going',
  type: GuestWhoIsGoingCard,
  path: '[Event Detail]/Sections',
)
Widget eventDetailGuestWhoIsGoingState(BuildContext context) {
  return const Padding(
    padding: CatchInsets.contentDense,
    child: GuestWhoIsGoingCard(),
  );
}

@widgetbook.UseCase(
  name: 'Hype avatars',
  type: EventHypeAvatarRow,
  path: '[Event Detail]/Sections',
)
Widget eventHypeAvatarStackState(BuildContext context) {
  return EventHypeAvatarRow(
    eventId: widgetbookEvent.id,
    totalCount: 12,
    avatarItems: widgetbookEventsAvatarItems,
    obscured: false,
    showOverflowCount: true,
    activityKind: widgetbookEvent.activityKind,
  );
}

@widgetbook.UseCase(
  name: "Who's going states",
  type: WhoIsGoingSection,
  path: '[Event Detail]/Sections',
)
Widget whoIsGoingStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'WhoIsGoingSection',
    catalogId: 'section.event.who_is_going.roster',
    children: [
      WidgetbookPageStateCard(
        label: 'visible roster',
        child: WidgetbookEventScope(
          event: widgetbookEvent,
          roster: widgetbookEventsRoster(),
          avatarItems: widgetbookEventsAvatarItems,
          child: WhoIsGoingSection(event: widgetbookEvent),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'empty roster',
        child: WidgetbookEventScope(
          event: _emptyEvent,
          roster: EventParticipationRoster.empty(),
          child: WhoIsGoingSection(event: _emptyEvent),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: "Who's going content",
  type: WhoIsGoingBody,
  path: '[Event Detail]/Sections',
)
Widget whoIsGoingContentStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'WhoIsGoingBody',
    catalogId: 'section.event.who_is_going.content',
    children: [
      WidgetbookPageStateCard(
        label: 'upcoming roster',
        child: WhoIsGoingBody(
          event: widgetbookEvent,
          totalCount: widgetbookEvent.signedUpCount,
          avatarItems: widgetbookEventsAvatarItems,
        ),
      ),
      WidgetbookPageStateCard(
        label: 'empty roster',
        child: WhoIsGoingBody(event: _emptyEvent, totalCount: 0),
      ),
      WidgetbookPageStateCard(
        label: 'post-event closed window',
        child: WhoIsGoingBody(
          event: widgetbookEventsPastEvent,
          totalCount: 5,
          avatarItems: widgetbookEventsAvatarItems
              .take(5)
              .toList(growable: false),
          showHeader: false,
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Empty roster message',
  type: WhoIsGoingEmptyState,
  path: '[Event Detail]/Sections',
)
Widget emptyRosterMessageStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'WhoIsGoingEmptyState',
    catalogId: 'section.event.who_is_going.empty_roster_message',
    children: [
      WidgetbookPageStateCard(
        label: 'upcoming',
        child: const WhoIsGoingEmptyState(
          title: 'No attendees yet',
          message: 'Be the first to book this event.',
        ),
      ),
      WidgetbookPageStateCard(
        label: 'surface-styled',
        child: Builder(
          builder: (context) {
            final style = EventDetailSurfaceStyle.dark(CatchTokens.of(context));
            return WhoIsGoingEmptyState(
              title: 'No attendees booked',
              message: 'This event did not have any booked attendees.',
              surfaceStyle: style,
            );
          },
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Swipe window banner',
  type: SwipeWindowBanner,
  path: '[Event Detail]/Sections',
)
Widget swipeWindowBannerStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'SwipeWindowBanner',
    catalogId: 'section.event.who_is_going.swipe_window_banner',
    children: [
      WidgetbookPageStateCard(
        label: 'locked',
        child: SwipeWindowBanner(
          icon: CatchIcons.locked,
          message: 'Catches unlock for 24 hours after the event finishes.',
        ),
      ),
      WidgetbookPageStateCard(
        label: 'open',
        child: SwipeWindowBanner(
          icon: CatchIcons.like,
          message:
              'The catch window is open for 24 hours after the event finishes.',
        ),
      ),
      WidgetbookPageStateCard(
        label: 'surface-styled',
        child: Builder(
          builder: (context) {
            final style = EventDetailSurfaceStyle.dark(CatchTokens.of(context));
            return SwipeWindowBanner(
              icon: CatchIcons.time,
              message: 'The catch window for this event has closed.',
              surfaceStyle: style,
            );
          },
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Walking and running route expectations',
  type: EventDetailRouteSection,
  path: '[Event Detail]/Sections',
)
Widget eventDetailRouteSectionStates(BuildContext context) =>
    WidgetbookEventDeviceFrame(
      child: const SingleChildScrollView(
        child: Column(
          children: [
            EventDetailRouteSection(plan: RouteEventPlan.hostedWalk),
            EventDetailRouteSection(plan: RouteEventPlan.socialRun),
          ],
        ),
      ),
    );
