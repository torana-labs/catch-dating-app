import 'package:catch_dating_app/contexts/bookings/data/host_requests_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/host_request.dart';
import 'package:catch_dating_app/hosts/presentation/requests/host_requests_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/preview_layout_contracts.dart';
import 'package:widgetbook_workspace/support/page_preview.dart';

HostRequest _row(
  String uid,
  HostRequestKind kind,
  String name, {
  int? attended,
  int? position,
  DateTime? offerExpiresAt,
}) => HostRequest(
  uid: uid,
  kind: kind,
  eventId: 'trivia',
  eventName: 'Tuesday Trivia',
  eventStart: DateTime(2026, 11, 3, 19),
  placesLeft: 2,
  capacityLimit: 32,
  name: name,
  askedAt: DateTime(2026, 11, 2, 19, 28),
  waitlistPosition: position,
  attendedEventCount: attended,
  offerExpiresAt: offerExpiresAt,
);

final _requests = HostRequests(
  complete: true,
  rows: [
    _row('zoya', HostRequestKind.request, 'Zoya Merchant', attended: 3),
    _row('ishaan', HostRequestKind.request, 'Ishaan Bose'),
    _row('nikhil', HostRequestKind.waitlist, 'Nikhil Rao', position: 1),
  ],
);

@widgetbook.UseCase(
  name: 'Requests, waitlist and no one waiting',
  type: HostRequestsWorkspace,
  path: '[P1 product surfaces]/Host operations/Sections',
)
Widget hostRequestsWorkspacePreview(BuildContext context) =>
    WidgetbookScrollCatalogFrame(
      title: 'Audience: requests',
      catalogId: 'host.requests_queue',
      children: [
        for (final (label, requests) in [
          ('Waiting', _requests),
          ('No one waiting', const HostRequests(rows: [], complete: true)),
        ])
          WidgetbookPageStateCard(
            label: label,
            child: WidgetbookContentFrame(
              child: SizedBox(
                height: WidgetbookPreviewLayout.defaultPhonePreviewHeight,
                child: HostRequestsWorkspace(
                  requests: requests,
                  deciding: false,
                  onLetIn: (_) {},
                  onDecline: (_) {},
                  onOffer: (_) {},
                ),
              ),
            ),
          ),
      ],
    );

@widgetbook.UseCase(
  name: 'A request and a live waitlist offer',
  type: HostRequestBody,
  path: '[P1 product surfaces]/Host operations/Sections',
)
Widget hostRequestBodyPreview(BuildContext context) =>
    WidgetbookScrollCatalogFrame(
      title: 'Audience: one person waiting',
      catalogId: 'host.request_detail',
      children: [
        for (final (label, row) in [
          (
            'Request',
            _row('zoya', HostRequestKind.request, 'Zoya Merchant', attended: 3),
          ),
          (
            'Live offer',
            _row(
              'nikhil',
              HostRequestKind.waitlist,
              'Nikhil Rao',
              position: 1,
              offerExpiresAt: DateTime(2026, 11, 3, 12),
            ),
          ),
        ])
          WidgetbookPageStateCard(
            label: label,
            child: WidgetbookContentFrame(
              child: SizedBox(
                height: WidgetbookPreviewLayout.defaultPhonePreviewHeight,
                child: HostRequestBody(
                  row: row,
                  nextName: 'Ishaan Bose',
                  deciding: false,
                  onBack: null,
                  onLetIn: () {},
                  onDecline: () {},
                  onOffer: () {},
                ),
              ),
            ),
          ),
      ],
    );

@widgetbook.UseCase(
  name: 'Reads who is waiting',
  type: HostRequestsScreen,
  path: '[P1 product surfaces]/Host operations/Sections',
)
Widget hostRequestsScreenPreview(BuildContext context) => ProviderScope(
  overrides: [
    hostOrganizerRequestsProvider(
      'lantern',
    ).overrideWith((ref) async => _requests),
  ],
  child: const HostRequestsScreen(initialOrganizerId: 'lantern'),
);
