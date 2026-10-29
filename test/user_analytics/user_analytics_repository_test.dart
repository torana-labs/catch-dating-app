import 'package:catch_dating_app/contexts/insights/data/user_analytics_repository.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('UserAnalyticsReport parses callable payload', () {
    final report = UserAnalyticsReport.fromCallableData({
      'generatedAt': '2026-06-18T12:00:00.000Z',
      'summaryCards': [
        {
          'id': 'profileViews',
          'label': 'Profile views',
          'value': 7,
          'unit': 'count',
          'status': 'partial',
          'caption': 'Post-event profile attention.',
        },
        {
          'id': 'followThroughRate',
          'label': 'Follow-through',
          'value': 50,
          'unit': 'percent',
          'status': 'ready',
        },
      ],
      'trend': [
        {
          'periodStart': '2026-06-01T00:00:00.000Z',
          'periodEnd': '2026-06-08T00:00:00.000Z',
          'metrics': {'profileViews': 7, 'caughtYou': 3},
        },
      ],
      'connectionSummary': {
        'outgoingLikes': 4,
        'incomingLikes': 3,
        'privateInterestReceived': 1,
        'mutualCatches': 2,
        'chatsStarted': 1,
        'chatMessagesSent': 5,
        'followThroughRate': 50,
        'eventsAttended': 1,
      },
      'profileSummary': {
        'profileViews': 7,
        'uniqueViewers': 6,
        'profileDwellSeconds': 90,
        'photoImpressions': 11,
        'topPhotoId': 'photo-1',
        'activeMinutes': 20,
      },
      'coachingTipRefs': [
        {
          'id': 'keepShowingUp',
          'copyKey': 'keepShowingUp',
          'priority': 3,
          'metricIds': ['eventsAttended', 'mutualCatches'],
        },
      ],
      'dataQuality': [
        {
          'id': 'profile-exposure',
          'state': 'partial',
          'detail': 'Profile exposure is being collected.',
        },
      ],
    });

    expect(report.summaryCards.first.id, 'profileViews');
    expect(report.summaryCards.first.status, UserAnalyticsMetricStatus.partial);
    expect(report.summaryCards.last.unit, UserAnalyticsMetricUnit.percent);
    expect(report.trend.single.metrics['caughtYou'], 3);
    expect(report.connectionSummary.mutualCatches, 2);
    expect(report.profileSummary.topPhotoId, 'photo-1');
    expect(report.coachingTipRefs.single.copyKey, 'keepShowingUp');
    expect(
      report.dataQuality.single.state,
      UserAnalyticsDataQualityState.partial,
    );
  });
}
