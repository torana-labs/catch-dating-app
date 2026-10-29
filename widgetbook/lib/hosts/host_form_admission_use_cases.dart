import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/forms/data/forms/host_form_admission_gateway.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_admission.dart';
import 'package:catch_dating_app/core/persistence/memory_command_journal_storage.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_admission_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_admission_section.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/page_preview.dart';

enum _AdmissionState { ready, retained, blocked }

@widgetbook.UseCase(
  name: 'Admission readiness and confirmation',
  type: HostFormAdmissionSection,
  path: '[P1 product surfaces]/Host operations/RSVP review',
)
Widget hostFormAdmissionPreview(BuildContext context) =>
    const WidgetbookScrollCatalogFrame(
      title: 'Confirm event admission',
      catalogId: 'host.form_admission',
      children: [
        WidgetbookPageStateCard(
          label: 'New seat — confirm to see the completed state',
          child: _AdmissionFixture(state: _AdmissionState.ready),
        ),
        WidgetbookPageStateCard(
          label: 'Existing seat — retain the current roster identity',
          child: _AdmissionFixture(state: _AdmissionState.retained),
        ),
        WidgetbookPageStateCard(
          label: 'Capacity unavailable — fresh review required',
          child: _AdmissionFixture(state: _AdmissionState.blocked),
        ),
      ],
    );

class _AdmissionFixture extends StatefulWidget {
  const _AdmissionFixture({required this.state});
  final _AdmissionState state;

  @override
  State<_AdmissionFixture> createState() => _AdmissionFixtureState();
}

class _AdmissionFixtureState extends State<_AdmissionFixture> {
  final _storage = MemoryCommandJournalStorage();

  @override
  void dispose() {
    unawaited(_storage.close());
    super.dispose();
  }

  late final _gateway = _AdmissionGateway(widget.state);
  late final _dependencies = HostFormAdmissionDependencies(
    gateway: _gateway,
    currentAccountId: () => 'manager_demo',
    outbox: JournalHostFormAdmissionOutbox(
      gateway: _gateway,
      storage: () async => _storage,
      currentAccountId: () => 'manager_demo',
    ),
  );
  @override
  Widget build(BuildContext context) => ProviderScope(
    overrides: [
      uidProvider.overrideWith((ref) => Stream.value('manager_demo')),
      hostFormAdmissionDependenciesProvider.overrideWithValue(_dependencies),
    ],
    child: HostFormAdmissionSection(
      session: hostFormAdmissionSession('manager_demo', _scope),
      onAdmitted: () async {},
    ),
  );
}

const _scope = HostFormAdmissionScope(
  organizerId: 'organizer_demo',
  eventId: 'event_demo',
  responseId: 'response_demo',
  contactId: 'contact_demo',
  offerId: 'offer_demo',
);

class _AdmissionGateway implements HostFormAdmissionGateway {
  const _AdmissionGateway(this.state);
  final _AdmissionState state;

  @override
  Future<HostFormAdmissionPreview> preview(HostFormAdmissionScope scope) async {
    if (state == _AdmissionState.blocked) {
      return HostFormAdmissionPreview.fromData({
        ...scope.toJson(),
        'canCommit': false,
        'blocker': {
          'code': 'unavailable',
          'message':
              'The remaining seats are reserved by current waitlist '
              'offers. Check availability again after those offers expire.',
        },
      }, scope);
    }
    return HostFormAdmissionPreview.fromData({
      ...scope.toJson(),
      'canCommit': true,
      'expectedOfferRevision': 2,
      'expectedOfferGeneration': 1,
      'expectedLedgerRevision': 3,
      'paymentAuthority': 'explicitFree',
      'seatAlreadyOccupied': state == _AdmissionState.retained,
      'blocker': null,
    }, scope);
  }

  @override
  Future<HostFormAdmissionReceipt> commit(
    HostFormAdmissionCommand command,
  ) async => HostFormAdmissionReceipt.fromData({
    ...command.scope.toJson(),
    'receiptId': 'receipt_demo',
    'attendeeId': 'attendee_demo',
    'canonicalSeatKey': 'seat_demo',
    'requestId': command.requestId,
    'requestHash': command.requestHash,
    'resultingLedgerRevision': 4,
    'admittedAtMillis': 1800000000000,
    'replayed': false,
    'seatAlreadyOccupied': state == _AdmissionState.retained,
  }, command);
}
