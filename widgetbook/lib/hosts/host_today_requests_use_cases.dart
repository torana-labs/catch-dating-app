import 'package:catch_dating_app/contexts/bookings/data/host_requests_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/host_request.dart';
import 'package:catch_dating_app/hosts/today/host_today_requests_sheet.dart';
import 'package:catch_dating_app/hosts/today/host_today_state.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../preview_layout_contracts.dart';

const _path = '[P1 product surfaces]/Host/Today/Requests';

final _now = DateTime(2026, 11, 3, 9);

HostRequest _row(
  String uid,
  HostRequestKind kind,
  String? name, {
  String eventId = 'trivia',
  String eventName = 'Tuesday Trivia Night',
  int? attended,
  int? position,
  DateTime? offerExpiresAt,
}) => HostRequest(
  uid: uid,
  kind: kind,
  eventId: eventId,
  eventName: eventName,
  eventStart: DateTime(2026, 11, 3, 19),
  placesLeft: 2,
  capacityLimit: 32,
  name: name,
  askedAt: DateTime(2026, 11, 2, 19, 28),
  waitlistPosition: position,
  attendedEventCount: attended,
  offerExpiresAt: offerExpiresAt,
);

final _waiting = HostRequests(
  complete: true,
  rows: [
    _row('zoya', HostRequestKind.request, 'Zoya Merchant', attended: 3),
    _row('ishaan', HostRequestKind.request, 'Ishaan Bose'),
    _row('nikhil', HostRequestKind.waitlist, 'Nikhil Rao', position: 1),
    _row(
      'meher',
      HostRequestKind.request,
      null,
      eventId: 'supper',
      eventName: 'Long Table Supper',
    ),
  ],
);

Widget _phone(Widget child) => SizedBox(
  width: WidgetbookPreviewLayout.phoneChromeWidth,
  height: WidgetbookPreviewLayout.hostEditorViewportHeight,
  child: CatchRoot(child: child),
);

@widgetbook.UseCase(
  name: 'Everyone waiting',
  type: HostTodayRequestsBody,
  path: _path,
)
Widget hostTodayRequestsWaiting(BuildContext context) => _phone(
  HostTodayRequestsBody(
    requests: _waiting,
    now: _now,
    onLetIn: (_) {},
    onDecline: (_) {},
    onOffer: (_) {},
  ),
);

@widgetbook.UseCase(
  name: 'Cut off and no one waiting',
  type: HostTodayRequestsBody,
  path: _path,
)
Widget hostTodayRequestsEdges(BuildContext context) => Wrap(
  spacing: CatchSpacing.s6,
  runSpacing: CatchSpacing.s6,
  children: [
    _phone(
      HostTodayRequestsBody(
        requests: HostRequests(rows: _waiting.rows, complete: false),
        now: _now,
        onLetIn: (_) {},
        onDecline: (_) {},
        onOffer: (_) {},
      ),
    ),
    _phone(
      HostTodayRequestsBody(
        requests: const HostRequests(rows: [], complete: true),
        now: _now,
        onLetIn: (_) {},
        onDecline: (_) {},
        onOffer: (_) {},
      ),
    ),
  ],
);

@widgetbook.UseCase(
  name: 'A request, then the next person',
  type: HostTodayRequestDetailBody,
  path: _path,
)
Widget hostTodayRequestPersonAsked(BuildContext context) => _phone(
  HostTodayRequestDetailBody(
    row: _waiting.rows.first,
    now: _now,
    nextName: 'Ishaan Bose',
    deciding: false,
    onBack: () {},
    onLetIn: () {},
    onDecline: () {},
    onOffer: () {},
  ),
);

@widgetbook.UseCase(
  name: 'A live waitlist offer',
  type: HostTodayRequestDetailBody,
  path: _path,
)
Widget hostTodayRequestPersonOffered(BuildContext context) => _phone(
  HostTodayRequestDetailBody(
    row: _row(
      'nikhil',
      HostRequestKind.waitlist,
      'Nikhil Rao',
      position: 1,
      offerExpiresAt: DateTime(2026, 11, 3, 12),
    ),
    now: _now,
    nextName: null,
    deciding: false,
    onBack: () {},
    onLetIn: () {},
    onDecline: () {},
    onOffer: () {},
  ),
);

@widgetbook.UseCase(
  name: 'Opened from a join request row',
  type: HostTodayRequestsSheet,
  path: _path,
)
Widget hostTodayRequestsSheet(BuildContext context) => ProviderScope(
  overrides: [
    hostOrganizerRequestsProvider(
      'lantern',
    ).overrideWith((ref) => Stream.value(_waiting)),
  ],
  child: _phone(
    const HostTodayRequestsSheet(
      organizerId: 'lantern',
      focus: HostTodayRequestFocus(
        eventId: 'supper',
        kind: HostRequestKind.request,
      ),
    ),
  ),
);
