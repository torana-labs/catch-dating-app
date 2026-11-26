import 'package:catch_dating_app/contexts/insights/data/host_analytics_repository.dart';
import 'package:catch_dating_app/contexts/insights/data/host_event_coach.dart';
import 'package:flutter_test/flutter_test.dart';

Map<String, Object?> _response(Object? eventCoach) => {
  'generatedAt': '2026-11-21T00:00:00.000Z',
  'timezone': 'Asia/Kolkata',
  'summaryCards': <Object?>[],
  'trend': <Object?>[],
  'topEvents': <Object?>[],
  'reviewSummary': <String, Object?>{},
  'discoverySummary': <String, Object?>{},
  'dataQuality': <Object?>[],
  'eventCoach': eventCoach,
};

void main() {
  test('a ready coach block parses into a scorecard', () {
    final report = HostAnalyticsReport.fromCallableData(
      _response({
        'status': 'ready',
        'groupSizeFloor': 10,
        'caption': null,
        'scorecard': {
          'bookedCount': 20,
          'checkedInCount': 16,
          'feedbackCount': 8,
          'mutualMatchCount': 4,
          'chatStartedCount': 2,
          'catchRate': 0.5,
          'averageWelcomeRating': 4.5,
          'averageStructureRating': 9,
          'conversationGraph': {'conversationCount': 30},
          'funnel': {'repeatAttendeeCount': 5},
        },
      }),
    );
    final coach = report.eventCoach!;
    expect(coach.status, HostEventCoachStatus.ready);
    expect(coach.scorecard!.checkedInCount, 16);
    expect(coach.scorecard!.feedbackResponseCount, 8);
    expect(coach.scorecard!.conversationCount, 30);
    expect(coach.scorecard!.funnel.repeatAttendeeCount, 5);
    expect(coach.scorecard!.averageStructureRating, 5);
    expect(coach.scorecard!.chatStartRate, 0.5);
  });

  test('a withheld block carries only its caption', () {
    final coach = HostAnalyticsReport.fromCallableData(
      _response({
        'status': 'withheld',
        'groupSizeFloor': 10,
        'caption': 'The coach report shows once at least 10 guests checked in.',
        'scorecard': null,
      }),
    ).eventCoach!;
    expect(coach.status, HostEventCoachStatus.withheld);
    expect(coach.scorecard, isNull);
    expect(coach.caption, contains('10 guests'));
  });

  test('a report with no coach block has none', () {
    expect(
      HostAnalyticsReport.fromCallableData(_response(null)).eventCoach,
      isNull,
    );
  });
}
