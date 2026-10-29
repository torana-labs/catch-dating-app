import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/insights/domain/host_report_export.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart';

void main() {
  test('revenue export lists customers, amounts, statuses, and totals', () {
    final event = buildEvent(
      id: 'event-paid',
      startTime: DateTime.utc(2026, 5, 25, 18),
      priceInPaise: 40000,
    );
    final export = buildHostRevenueReportExport(
      event: event,
      exportedAt: DateTime.utc(2026, 5, 26, 9),
      namesByUid: const {
        'runner-1': 'Asha',
        'runner-2': 'Kabir',
        'runner-3': 'Meera',
      },
      participations: [
        buildEventParticipation(
          event: event,
          uid: 'runner-1',
          status: EventParticipationStatus.attended,
          paymentId: 'pay_1',
        ),
        buildEventParticipation(
          event: event,
          uid: 'runner-2',
          paymentId: 'pay_2',
        ),
        buildEventParticipation(
          event: event,
          uid: 'runner-3',
          status: EventParticipationStatus.cancelled,
          paymentId: 'pay_3',
        ),
      ],
    );

    expect(export.fileName, 'monday-evening-run-2026-05-25-revenue.csv');
    expect(export.csv, contains('exported_at'));
    expect(export.csv, contains('2026-05-26T09:00:00.000Z'));
    expect(export.csv, contains('Monday Evening Run'));
    expect(export.csv, contains('Asha,runner-1,attended,checked_in,booked'));
    expect(export.csv, contains('Kabir,runner-2,signedUp,not_checked_in'));
    expect(
      export.csv,
      contains('Meera,runner-3,cancelled,cancelled,cancelled'),
    );
    expect(export.csv, contains('event_price_estimate_payment_id_present'));
    expect(export.csv, contains('TOTAL_ESTIMATED_ACTIVE_REVENUE'));
    expect(export.csv, contains('80000,800.00,INR'));
    expect(export.csv, contains('NO_SHOW_COUNT'));
    expect(export.csv, contains('CANCELLED_COUNT'));
  });

  test('ops export includes arrival order and operational context', () {
    final event = buildEvent(
      id: 'event-ops',
      startTime: DateTime.utc(2026, 5, 25, 14),
    );
    final export = buildHostOpsReportExport(
      event: event,
      exportedAt: DateTime.utc(2026, 5, 26, 9),
      namesByUid: const {'runner-1': 'Asha', 'runner-2': 'Kabir'},
      participations: [
        buildEventParticipation(
          event: event,
          uid: 'runner-2',
          status: EventParticipationStatus.attended,
          createdAt: DateTime.utc(2026, 5, 25, 13, 50),
        ),
        buildEventParticipation(
          event: event,
          uid: 'runner-1',
          status: EventParticipationStatus.attended,
          createdAt: DateTime.utc(2026, 5, 25, 13, 45),
          inviteLinkId: 'link-run-club',
          inviteSource: 'instagram-bio',
          inviteCapturedAt: DateTime.utc(2026, 5, 24, 12),
        ),
      ],
    );

    expect(export.fileName, 'monday-afternoon-run-2026-05-25-ops.csv');
    expect(
      export.csv,
      contains('invite_link_id,invite_source,invite_captured_at,arrival_order'),
    );
    expect(
      export.csv,
      contains('link-run-club,instagram-bio,2026-05-24T12:00:00.000Z,1'),
    );
    expect(export.csv, contains('Kabir,runner-2,attended,checked_in,'));
    expect(export.csv, contains(',2,2026-05-25T13:50:00.000Z'));
  });
}
