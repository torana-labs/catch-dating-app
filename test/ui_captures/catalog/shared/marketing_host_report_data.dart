// Capture fixtures shared by more than one catalog entry. Only the entries
// that import this file depend on it.

import 'package:catch_dating_app/contexts/audience/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_event_roster_insights.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import '../../fixtures/sales_demo_synthetic_fixtures.dart';
import 'capture_fixtures.dart';
import 'marketing_host_report_event.dart';

/// The guests who came, by name, in the order they checked in.
final _cameNames = [
  for (final guest in hostMarketingIndiaScenario.guestsAt('live'))
    if (guest.checkedInAt != null)
      captureFixtures.publicProfile(guest.personaId).name,
];

/// What guests said the morning after the trivia social: the report shows
/// the newest two and the average of all three.
final marketingHostReportReviews = <Review>[
  for (final (index, (rating, comment)) in const [
    (
      5,
      'Our table had never met before 7:30 and we came second. Back next Saturday.',
    ),
    (
      5,
      'The prompts between rounds got everyone talking. Easiest night out in ages.',
    ),
    (4, 'Great hosts and a good crowd. The music round was brutal.'),
  ].indexed)
    Review(
      id: 'host-marketing-india-review-$index',
      organizerId: marketingHostReportEvent.organizerId,
      eventId: marketingHostReportEvent.id,
      reviewerName: _cameNames[index],
      rating: rating,
      comment: comment,
      createdAt: hostMarketingIndiaScenario
          .clock('followUp')
          .subtract(Duration(minutes: 20 + index * 35)),
    ),
];

/// Next Saturday's social, so the report can offer to bring this crowd back.
final marketingHostNextEvent = marketingHostReportEvent.copyWith(
  id: 'host-marketing-india-next-social',
  startTime: marketingHostReportEvent.startTime.add(const Duration(days: 7)),
  endTime: marketingHostReportEvent.endTime.add(const Duration(days: 7)),
);

/// Who was new: most of the room had never been to one of this host's nights.
HostEventRosterInsights marketingHostReportInsights(Event event) =>
    HostEventRosterInsights(
      eventId: event.id,
      organizerId: event.organizerId,
      cutoffAt: event.startTime,
      sourceCoverage: HostRosterInsightCoverage.exact,
      spendCoverage: HostRosterSpendCoverage.catchPaymentsOnly,
      rows: [
        for (final (index, _) in _cameNames.indexed)
          HostEventRosterInsight(
            attendeeId: 'marketing-india-attendee-$index',
            contactId: null,
            availability: HostRosterInsightAvailability.ready,
            signals: {
              index % 3 == 2
                  ? HostRosterInsightSignal.returning
                  : HostRosterInsightSignal.firstTime,
            },
            priorAttendedEventCount: index % 3 == 2 ? 2 : 0,
            priorExpectedEventCount: index % 3 == 2 ? 2 : 0,
            priorNoShowCount: 0,
            lastAttendedAt: null,
            attendanceRate: null,
            catchSpend: const [],
          ),
      ],
      computedAt: hostMarketingIndiaScenario.clock('followUp'),
    );

/// The report's reads beyond the manage overrides: who was new and what's next.
List<Object> marketingHostReportOverrides(Event event) => [
  hostEventRosterInsightsProvider(
    event.id,
  ).overrideWith((ref) => Stream.value(marketingHostReportInsights(event))),
  watchActiveEventsForOrganizerProvider.overrideWith(
    (ref, query) => Stream.value([marketingHostNextEvent]),
  ),
];
