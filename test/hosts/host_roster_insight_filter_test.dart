import 'package:catch_dating_app/contexts/audience/domain/crm/host_event_roster_insights.dart';
import 'package:catch_dating_app/hosts/presentation/host_roster_insight_filter.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  HostEventRosterInsight insight({
    HostRosterInsightAvailability availability =
        HostRosterInsightAvailability.ready,
    Set<HostRosterInsightSignal> signals = const {},
  }) => HostEventRosterInsight(
    attendeeId: 'attendee-1',
    contactId: 'contact-1',
    availability: availability,
    signals: signals,
    priorAttendedEventCount: 0,
    priorExpectedEventCount: 0,
    priorNoShowCount: 0,
    lastAttendedAt: null,
    attendanceRate: null,
    catchSpend: const [],
  );

  test(
    'all includes rows while CRM filters fail closed for unavailable rows',
    () {
      final pending = insight(
        availability: HostRosterInsightAvailability.projectionPending,
      );

      expect(
        hostRosterInsightMatches(HostRosterInsightFilter.all, pending),
        isTrue,
      );
      expect(
        hostRosterInsightMatches(HostRosterInsightFilter.firstTime, pending),
        isFalse,
      );
    },
  );

  test('advocate filter includes ordinary and high-impact advocates', () {
    expect(
      hostRosterInsightMatches(
        HostRosterInsightFilter.advocate,
        insight(signals: {HostRosterInsightSignal.advocate}),
      ),
      isTrue,
    );
    expect(
      hostRosterInsightMatches(
        HostRosterInsightFilter.advocate,
        insight(signals: {HostRosterInsightSignal.highImpactAdvocate}),
      ),
      isTrue,
    );
  });

  test('top Catch spender never matches a merely known spender', () {
    expect(
      hostRosterInsightMatches(
        HostRosterInsightFilter.topCatchSpender,
        insight(signals: {HostRosterInsightSignal.knownCatchSpender}),
      ),
      isFalse,
    );
  });
}
