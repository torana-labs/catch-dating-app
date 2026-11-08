import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('the derived offer parses its status, event and time', () {
    final offer = HostFormEntryOffer.fromMap(const {
      'status': 'offered',
      'eventId': 'supper',
      'offeredAtMillis': 5000,
    });
    expect(offer.status, HostFormEntryOfferStatus.offered);
    expect(offer.eventId, 'supper');
    expect(offer.offeredAt, DateTime.fromMillisecondsSinceEpoch(5000));
    expect(
      HostFormEntryOffer.fromMap(const {
        'status': 'expired',
        'eventId': 'supper',
        'offeredAtMillis': null,
      }).offeredAt,
      isNull,
    );
    expect(
      () => HostFormEntryOffer.fromMap(const {
        'status': 'draft',
        'eventId': 'supper',
        'offeredAtMillis': null,
      }),
      throwsFormatException,
    );
  });

  test('offered-only requests are distinct provider keys', () {
    const all = HostFormResponseListRequest(
      organizerId: 'org',
      includeApplications: true,
    );
    const offered = HostFormResponseListRequest(
      organizerId: 'org',
      includeApplications: true,
      offeredOnly: true,
    );
    expect(all == offered, isFalse);
    expect(offered.copyWith(cursor: 'next').offeredOnly, isTrue);
  });
}
