import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event_extensions.dart';
import 'package:catch_dating_app/contexts/events/domain/event_invite_link.dart';
import 'package:catch_dating_app/contexts/events/domain/event_private_access.dart';
import 'package:catch_dating_app/contexts/reviews/data/reviews_repository.dart';
import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/hosts/events/access/event_door_screen.dart';
import 'package:catch_dating_app/hosts/events/access/event_guest_sources_screen.dart';
import 'package:catch_dating_app/hosts/events/access/event_share_body.dart';
import 'package:catch_dating_app/hosts/events/access/event_share_screen.dart';
import 'package:catch_dating_app/hosts/events/event_workspace_controller.dart';
import 'package:catch_dating_app/hosts/insights/host_event_reviews_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../support/contract_preview.dart';

// The event screens the rebuilt workspace and report open: share and
// invite links, the event's door access and every review with replies.

const _eventsPath = '[P1 product surfaces]/Host/Events';

final _event = HostOperationsFixtures.privateEvent;
final _organizer = HostOperationsFixtures.primaryOrganizer;
final _made = DateTime(2030, 6, 20, 18);

final _request = HostEventRequest(
  organizerId: _organizer.id,
  eventId: _event.id,
);

final _inviteLinks = [
  EventInviteLink(
    id: 'office',
    eventId: _event.id,
    organizerId: _organizer.id,
    hostUid: HostOperationsFixtures.hostUid,
    label: 'Office group',
    openCount: 14,
    confirmedCount: 5,
    createdAt: _made,
    updatedAt: _made,
  ),
  EventInviteLink(
    id: 'climbing',
    eventId: _event.id,
    organizerId: _organizer.id,
    hostUid: HostOperationsFixtures.hostUid,
    label: 'Climbing club',
    openCount: 6,
    confirmedCount: 2,
    disabledAt: _made.add(const Duration(days: 2)),
    createdAt: _made,
    updatedAt: _made,
  ),
];

final _reviews = [
  Review(
    id: 'r1',
    organizerId: _organizer.id,
    eventId: _event.id,
    reviewerName: 'Rhea Kapoor',
    rating: 5,
    comment: 'Came alone, left with a team for next week.',
    createdAt: _made.add(const Duration(days: 8)),
    ownerResponse: ReviewOwnerResponse(
      hostUserId: HostOperationsFixtures.hostUid,
      hostName: 'Meher',
      message: 'See you next Tuesday, Rhea.',
      createdAt: _made.add(const Duration(days: 9)),
      updatedAt: _made.add(const Duration(days: 9)),
    ),
  ),
  Review(
    id: 'r2',
    organizerId: _organizer.id,
    eventId: _event.id,
    reviewerName: 'Sameer Shah',
    rating: 4,
    comment: 'Great host and a good crowd. It got loud by round two.',
    createdAt: _made.add(const Duration(days: 8, hours: 2)),
  ),
];

@widgetbook.UseCase(
  name: 'An invite-only night',
  type: HostEventShareBody,
  path: _eventsPath,
)
Widget hostEventShareBodyUseCase(BuildContext context) => HostEventShareBody(
  link: 'https://example.test/e/preview?invite=SEAFACE',
  inviteOnly: true,
  onCopy: widgetbookNoop,
  onShare: widgetbookNoop,
  inviteLinks: _inviteLinks,
  newLabel: 'Book club',
  onNewLabel: (_) {},
  onCreate: widgetbookNoop,
  onCopyInvite: (_) {},
  onTurnOff: (_) {},
);

@widgetbook.UseCase(
  name: 'Working and turned off',
  type: HostEventInviteLinkRow,
  path: _eventsPath,
)
Widget hostEventInviteLinkRowUseCase(BuildContext context) => Column(
  children: [
    for (final invite in _inviteLinks)
      HostEventInviteLinkRow(
        invite: invite,
        pending: false,
        onCopy: (_) {},
        onTurnOff: (_) {},
      ),
  ],
);

@widgetbook.UseCase(
  name: 'An invite-only night',
  type: HostEventShareScreen,
  path: _eventsPath,
)
Widget hostEventShareScreenUseCase(BuildContext context) => ProviderScope(
  overrides: [
    watchEventProvider(_event.id).overrideWithValue(AsyncData(_event)),
    watchEventPrivateAccessProvider(_event.id).overrideWithValue(
      AsyncData(
        EventPrivateAccess(
          id: _event.id,
          eventId: _event.id,
          organizerId: _organizer.id,
          inviteCode: 'SEAFACE',
          createdAt: _made,
        ),
      ),
    ),
    watchEventInviteLinksProvider(
      _event.id,
    ).overrideWithValue(AsyncData(_inviteLinks)),
  ],
  child: HostEventShareScreen(request: _request),
);

@widgetbook.UseCase(
  name: 'Before anyone has the door',
  type: HostEventDoorScreen,
  path: _eventsPath,
)
Widget hostEventDoorScreenUseCase(BuildContext context) =>
    ProviderScope(child: HostEventDoorScreen(request: _request));

@widgetbook.UseCase(
  name: 'One replied, one not',
  type: HostEventReviewsBody,
  path: _eventsPath,
)
Widget hostEventReviewsBodyUseCase(BuildContext context) =>
    HostEventReviewsBody(reviews: _reviews, onReview: (_) {});

@widgetbook.UseCase(
  name: 'One replied, one not',
  type: HostEventReviewsScreen,
  path: _eventsPath,
)
Widget hostEventReviewsScreenUseCase(BuildContext context) => ProviderScope(
  overrides: [
    watchReviewsForEventProvider(
      _event.id,
    ).overrideWithValue(AsyncData(_reviews)),
  ],
  child: HostEventReviewsScreen(eventId: _event.id, eventTitle: _event.title),
);

@widgetbook.UseCase(
  name: 'A Catch night',
  type: HostEventGuestSourcesScreen,
  path: _eventsPath,
)
Widget hostEventGuestSourcesScreenUseCase(BuildContext context) =>
    ProviderScope(
      overrides: [
        watchEventProvider(_event.id).overrideWithValue(AsyncData(_event)),
        watchOrganizerProvider(
          _organizer.id,
        ).overrideWithValue(AsyncData(_organizer)),
      ],
      child: HostEventGuestSourcesScreen(request: _request),
    );
