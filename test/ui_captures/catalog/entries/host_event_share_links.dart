// Marketing capture `host_event_share_links`. One file per marketing capture keeps each
// capture's inputs to its own imports; see docs/marketing_app_media_pipeline.md.

import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_invite_link.dart';
import 'package:catch_dating_app/contexts/events/domain/event_private_access.dart';
import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/hosts/events/access/event_share_screen.dart';
import 'package:catch_dating_app/hosts/events/event_workspace_controller.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart' show AsyncData;
import '../../support/capture_device.dart';
import '../screen_capture_entry.dart';

// An invite-only event's share screen in Catch Host: the private link, and
// named links with how many people each one brought.
final hostEventShareLinksCapture = ScreenCaptureEntry(
  id: 'host_event_share_links',
  routeIds: const <String>['hostAppEventManageScreen'],
  device: CaptureDevice.genericPhone,
  marketingFixtureKeys: const <String>['hostOperations.event.shareLinks'],
  disableAnimations: true,
  providerOverrides: <Object>[
    watchEventProvider(_event.id).overrideWithValue(AsyncData<Event?>(_event)),
    watchEventPrivateAccessProvider(_event.id).overrideWithValue(
      AsyncData<EventPrivateAccess?>(HostOperationsFixtures.privateAccess),
    ),
    watchEventInviteLinksProvider(
      _event.id,
    ).overrideWithValue(AsyncData<List<EventInviteLink>>(_links)),
  ],
  builder: (context) => HostEventShareScreen(
    request: HostEventRequest(
      organizerId: _event.organizerId,
      eventId: _event.id,
    ),
  ),
);

final _event = HostOperationsFixtures.privateEvent.copyWith(
  id: 'thursday-evening-run',
  organizerId: 'sea-face-social',
);

/// A link for each place the host shared the run, all still open.
final _links = [
  for (final (label, source, opened, booked) in const [
    ('Instagram bio', 'instagram', 142, 11),
    ('Alumni WhatsApp', 'whatsapp', 64, 7),
    ('Cafe counter QR', 'qr', 38, 4),
  ])
    HostOperationsFixtures.inviteLinks.first.copyWith(
      id: 'link-$source',
      eventId: _event.id,
      organizerId: _event.organizerId,
      label: label,
      source: source,
      openCount: opened,
      confirmedCount: booked,
      requestCount: booked,
      disabledAt: null,
    ),
];
