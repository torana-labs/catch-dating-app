import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/connections/data/cross_paths_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_viewer_state.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/messaging/data/event_chat_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/event_chat.dart';
import 'package:catch_dating_app/contexts/organizers/data/clubs_repository.dart';
import 'package:catch_dating_app/contexts/payments/data/payment_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/events/presentation/event_booking_controller.dart';
import 'package:catch_dating_app/events/presentation/event_detail_screen.dart';
import 'package:catch_dating_app/events/presentation/event_detail_view_model.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_hype_avatar_row.dart';
import 'package:catch_dating_app/events/shared/event_detail_route_transition.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import '../../support/widgetbook_harness.dart';
import 'event_scope.dart';
import 'fixtures.dart';
import 'preview.dart';

final _hostViewer = widgetbookEventsViewer.copyWith(
  uid: 'host-mira',
  name: 'Mira Shah',
  displayName: 'Mira Shah',
  firstName: 'Mira',
  lastName: 'Shah',
);

@widgetbook.UseCase(
  name: 'Screen states',
  type: EventDetailScreen,
  path: '[Event Detail]/Screen states',
)
Widget eventDetailScreenStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'EventDetailScreen',
    catalogId: 'screen.event.detail',
    children: [
      WidgetbookPageStateCard(
        label: 'loading',
        child: _RouteFrame(
          value: const AsyncLoading<EventDetailViewModel?>(),
          child: EventDetailScreen(
            clubId: widgetbookEventsClubId,
            eventId: widgetbookEvent.id,
            enableMapNetworkTiles: false,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'not found',
        child: _RouteFrame(
          value: const AsyncData<EventDetailViewModel?>(null),
          child: EventDetailScreen(
            clubId: widgetbookEventsClubId,
            eventId: widgetbookEvent.id,
            enableMapNetworkTiles: false,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'fatal error',
        child: _RouteFrame(
          value: AsyncError<EventDetailViewModel?>(
            StateError('Widgetbook event detail load failed'),
            StackTrace.empty,
          ),
          child: EventDetailScreen(
            clubId: widgetbookEventsClubId,
            eventId: widgetbookEvent.id,
            enableMapNetworkTiles: false,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'member default',
        child: _RouteFrame(
          value: AsyncData(
            _eventVm(widgetbookEvent, participation: widgetbookEventsSignedUp),
          ),
          child: EventDetailScreen(
            clubId: widgetbookEventsClubId,
            eventId: widgetbookEvent.id,
            enableMapNetworkTiles: false,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'guest',
        child: _RouteFrame(
          value: AsyncData(
            _eventVm(widgetbookEvent, isAuthenticated: false, isSaved: false),
          ),
          child: EventDetailScreen(
            clubId: widgetbookEventsClubId,
            eventId: widgetbookEvent.id,
            enableMapNetworkTiles: false,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'host app',
        child: _RouteFrame(
          value: AsyncData(
            _eventVm(widgetbookEvent, userProfile: _hostViewer, isHost: true),
          ),
          child: EventDetailScreen(
            clubId: widgetbookEventsClubId,
            eventId: widgetbookEvent.id,
            enableMapNetworkTiles: false,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'offline error',
        child: _RouteFrame(
          value: AsyncError<EventDetailViewModel?>(
            StateError('No network connection for Event Detail'),
            StackTrace.empty,
          ),
          child: EventDetailScreen(
            clubId: widgetbookEventsClubId,
            eventId: widgetbookEvent.id,
            enableMapNetworkTiles: false,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'ticket presentation',
        child: _RouteFrame(
          value: AsyncData(
            _eventVm(widgetbookEvent, participation: widgetbookEventsSignedUp),
          ),
          child: EventDetailScreen(
            clubId: widgetbookEventsClubId,
            eventId: widgetbookEvent.id,
            enableMapNetworkTiles: false,
            presentationMode: EventDetailPresentationMode.ticket,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'spotlight dark presentation',
        child: _RouteFrame(
          value: AsyncData(
            _eventVm(widgetbookEvent, participation: widgetbookEventsSignedUp),
          ),
          child: EventDetailScreen(
            clubId: widgetbookEventsClubId,
            eventId: widgetbookEvent.id,
            enableMapNetworkTiles: false,
            presentationMode: EventDetailPresentationMode.spotlightDark,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'text scale 2',
        child: MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: TextScaler.linear(2)),
          child: _RouteFrame(
            value: AsyncData(
              _eventVm(
                widgetbookEvent,
                participation: widgetbookEventsSignedUp,
              ),
            ),
            child: EventDetailScreen(
              clubId: widgetbookEventsClubId,
              eventId: widgetbookEvent.id,
              enableMapNetworkTiles: false,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'reduced motion',
        child: TickerMode(
          enabled: false,
          child: _RouteFrame(
            value: AsyncData(
              _eventVm(
                widgetbookEvent,
                participation: widgetbookEventsSignedUp,
              ),
            ),
            child: EventDetailScreen(
              clubId: widgetbookEventsClubId,
              eventId: widgetbookEvent.id,
              enableMapNetworkTiles: false,
            ),
          ),
        ),
      ),
    ],
  );
}

class _RouteFrame extends StatelessWidget {
  const _RouteFrame({required this.value, required this.child});

  final AsyncValue<EventDetailViewModel?> value;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final model = value.asData?.value;
    final uid = model?.isAuthenticated == true ? model?.userProfile?.uid : null;
    final avatarQuery = EventHypeAvatarQuery(
      eventId: widgetbookEvent.id,
      limit: 7,
    );

    return WidgetbookEventDeviceFrame(
      child: WidgetbookFixtureScope(
        overrides: [
          uidProvider.overrideWithValue(AsyncData(uid)),
          // Override the consumed reads directly: unscoped provider dependencies
          // otherwise resolve above this synthetic actor's fixture scope.
          eventPaidBookingSupportProvider(
            widgetbookEvent.currency,
          ).overrideWithValue(true),
          if (uid != null)
            watchCrossPathsEventConsentProvider(
              widgetbookEvent.id,
              uid,
            ).overrideWith((ref) => Stream.value(null)),
          eventChatAccessProvider(widgetbookEvent.id).overrideWithValue(
            AsyncData(
              EventChatAccess(
                eventId: widgetbookEvent.id,
                title: 'Widgetbook event chat',
                organizerId: widgetbookEvent.organizerId,
                roomStatus: 'closed',
                roomRevision: 0,
                membershipStatus: 'none',
                membershipRevision: 0,
                canManage: false,
                canJoin: false,
                canReadMessages: false,
                profileClaimRequired: false,
                termsVersion: 'widgetbook',
              ),
            ),
          ),
          if (uid != null && model != null && !model.isHost)
            eventViewerStateProvider(model.event.id, uid).overrideWithValue(
              AsyncData(
                widgetbookEventViewerSnapshot(
                  model.event,
                  admission: model.participation == null
                      ? EventViewerAdmission.none
                      : EventViewerAdmission.nativeParticipation,
                ),
              ),
            ),
          eventDetailViewModelProvider(
            widgetbookEvent.id,
          ).overrideWithValue(value),
          fetchClubProvider(
            widgetbookEventsClubId,
          ).overrideWith((ref) => widgetbookEventsClub),
          watchEventParticipationRosterProvider(
            widgetbookEvent.id,
          ).overrideWith((ref) => Stream.value(widgetbookEventsRoster())),
          eventHypeAvatarsProvider(
            avatarQuery,
          ).overrideWith((ref) async => widgetbookEventsAvatarItems),
          watchEventSuccessPlanProvider(
            widgetbookEvent.id,
          ).overrideWith((ref) => Stream.value(null)),
          paymentRepositoryProvider.overrideWithValue(
            const WidgetbookEventFakePaymentRepository(),
          ),
        ],
        child: child,
      ),
    );
  }
}

EventDetailViewModel _eventVm(
  Event event, {
  UserProfile? userProfile,
  bool isAuthenticated = true,
  bool isHost = false,
  bool isSaved = true,
  EventParticipation? participation,
}) {
  return EventDetailViewModel(
    event: event,
    userProfile:
        userProfile ?? (isAuthenticated ? widgetbookEventsViewer : null),
    reviews: widgetbookEventsReviews,
    isAuthenticated: isAuthenticated,
    isHost: isHost,
    isSaved: isSaved,
    participation: participation,
  );
}
