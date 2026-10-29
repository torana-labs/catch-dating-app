import 'dart:convert';

import 'package:catch_dating_app/contexts/forms/data/forms/host_event_offer_gateway.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_event_offer.dart';
import 'package:catch_dating_app/core/persistence/memory_command_journal_storage.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_event_offer_review_section.dart';
import 'package:crypto/crypto.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../test_pump_helpers.dart';
import 'event_offer_controller_test_support.dart';

void main() {
  testWidgets('Host must preview event-specific offer before commit', (
    tester,
  ) async {
    final gateway = _OfferGateway();
    final storage = MemoryCommandJournalStorage();
    final outbox = JournalHostOfferCommitOutbox(
      storage: () async => storage,
      currentAccountId: () => 'host-one',
      gateway: gateway,
    );
    final controller = TestHostEventOfferController(
      gateway,
      outbox: outbox,
      accountId: 'host-one',
    );
    addTearDown(controller.dispose);
    final draft = HostOfferBatchDraft(
      organizerId: 'organizer',
      eventId: 'event-one',
      rows: [
        HostOfferRow(
          organizerId: 'organizer',
          eventId: 'event-one',
          contactId: 'contact-one',
          sourceKind: HostOfferSourceKind.formResponse,
          sourceId: 'response-one',
          expiresAt: DateTime.utc(2026, 9, 28),
        ),
      ],
    );

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: TestHostEventOfferReviewSection(
            controller: controller,
            draft: draft,
            eventTitle: 'Sunday run',
            contactLabel: (_) => 'Maya',
            eventStartsAt: DateTime.utc(2026, 10),
            now: () => DateTime.utc(2026, 9, 24),
            commitRequestId: 'request_001',
            copy: _copy,
          ),
        ),
      ),
    );
    await pumpFeatureUi(tester);
    expect(find.text('Commit offers'), findsNothing);
    expect(gateway.commitCalls, 0);

    await tester.tap(find.text('Preview offers'));
    await pumpFeatureUi(tester);
    expect(find.text('Commit offers'), findsOneWidget);
    expect(find.text('Preview offers'), findsNothing);
    expect(find.text('Sunday run'), findsOneWidget);
    expect(find.textContaining('Maya'), findsOneWidget);
    expect(find.text('No seat or admission is created.'), findsOneWidget);
    expect(gateway.commitCalls, 0);

    await tester.tap(find.text('Commit offers'));
    await pumpFeatureUi(tester);
    expect(gateway.commitCalls, 1);
    expect(find.text('Offer committed'), findsOneWidget);
    expect(
      await outbox.pending(
        accountId: 'host-one',
        organizerId: draft.organizerId,
        eventId: draft.eventId,
      ),
      isNull,
    );
  });
}

const _copy = HostEventOfferReviewCopy(
  title: 'Event offer',
  preview: 'Preview offers',
  previewing: 'Previewing',
  review: 'Review one offer',
  expires: _expires,
  commit: 'Commit offers',
  committing: 'Committing',
  committed: 'Offer committed',
  failed: 'Offer failed',
  noReservation: 'No seat or admission is created.',
  paymentReference: 'Reference',
  recordReference: 'Record reference',
  evidenceSubmitted: 'Evidence submitted',
  bankReceiptChecked: 'I checked the bank',
  reviewNote: 'Review note',
  attestReceived: 'Attest received',
  rejectReference: 'Reject',
  hostAttested: 'Host attested',
  rejected: 'Rejected',
);

String _expires(String value) => 'Expires $value';

class _OfferGateway implements HostEventOfferGateway {
  int commitCalls = 0;

  @override
  Future<HostOfferPreview> preview(HostOfferBatchDraft draft) async =>
      const HostOfferPreview(
        planDigest: 'digest',
        rows: [
          HostOfferPreviewRow(
            offerId: 'offer-one',
            revision: 0,
            generation: 0,
            status: 'new',
          ),
        ],
      );

  @override
  Future<HostOfferCommitReceipt> commit({
    required HostOfferBatchDraft draft,
    required HostOfferPreview preview,
    required String requestId,
  }) async {
    commitCalls++;
    return HostOfferCommitReceipt(
      organizerId: draft.organizerId,
      eventId: draft.eventId,
      requestId: requestId,
      requestHash: sha256
          .convert(
            utf8.encode(
              jsonEncode([
                [
                  draft.organizerId,
                  draft.eventId,
                  draft.mode,
                  [
                    for (final row in draft.rows)
                      [
                        row.sourceKind.name,
                        row.sourceId,
                        row.contactId,
                        row.expiresAt.millisecondsSinceEpoch,
                        row.organizerPaymentLink?.toString(),
                      ],
                  ],
                ],
                preview.planDigest,
              ]),
            ),
          )
          .toString(),
      results: const [
        HostOfferPreviewRow(
          offerId: 'offer-one',
          revision: 2,
          generation: 1,
          status: 'committed',
        ),
      ],
    );
  }

  @override
  Future<HostEventOffer> recordReference({
    required HostEventOffer offer,
    required String reference,
    required String requestId,
  }) => throw UnimplementedError();

  @override
  Future<HostEventOffer> reviewReference({
    required HostEventOffer offer,
    required HostManualPaymentStatus decision,
    required String note,
    required bool bankReceiptChecked,
    required String requestId,
  }) => throw UnimplementedError();
}
