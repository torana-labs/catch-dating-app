import 'dart:async';

import 'package:catch_dating_app/contexts/insights/data/user_analytics_repository.dart';
import 'package:catch_dating_app/design_fixtures/profile_surface_fixtures.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_dating_app/user_analytics/shared/user_analytics_section.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets(
    'UserAnalyticsSection renders a report-shaped skeleton while loading',
    (tester) async {
      final repository = _LoadingUserAnalyticsRepository();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            userAnalyticsRepositoryProvider.overrideWithValue(repository),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            home: const Scaffold(
              body: SingleChildScrollView(child: UserAnalyticsSection()),
            ),
          ),
        ),
      );
      await tester.pump();

      expect(find.byType(CatchSkeleton), findsWidgets);
      expect(find.text('PROFILE INSIGHTS'), findsOneWidget);
    },
  );

  testWidgets(
    'loaded Profile Insights routes sections and content rows through canonical primitives',
    (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: SingleChildScrollView(
              child: UserAnalyticsReportBody(
                report: ProfileSurfaceFixtures.analyticsReport,
              ),
            ),
          ),
        ),
      );

      expect(find.byType(CatchSectionList), findsOneWidget);
      expect(find.byType(CatchSection), findsNWidgets(4));
      expect(
        find.ancestor(
          of: find.text('SUGGESTIONS'),
          matching: find.byType(CatchSection),
        ),
        findsOneWidget,
      );
      expect(
        find.ancestor(
          of: find.text('DATA COVERAGE'),
          matching: find.byType(CatchSection),
        ),
        findsOneWidget,
      );
      expect(find.byType(CatchField), findsNWidgets(3));
    },
  );

  testWidgets('data coverage maps known ids and future ids to stable labels', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: const Scaffold(
          body: UserAnalyticsDataCoverageSection(
            rows: [
              UserAnalyticsDataQuality(
                id: 'participant-signals',
                state: UserAnalyticsDataQualityState.ok,
                detail: 'Participant facts are available.',
              ),
              UserAnalyticsDataQuality(
                id: 'future-source',
                state: UserAnalyticsDataQualityState.partial,
                detail: 'This source is partially connected.',
              ),
            ],
          ),
        ),
      ),
    );

    expect(find.text('Participant signals'), findsOneWidget);
    expect(find.text('Partial'), findsOneWidget);
    expect(find.text('Participant facts are available.'), findsOneWidget);
    expect(find.text('This source is partially connected.'), findsOneWidget);
    expect(find.byType(CatchField), findsNWidgets(2));
  });

  testWidgets('Profile Insights loading reserves the same section structure', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: const Scaffold(
          body: SingleChildScrollView(child: UserAnalyticsReportSkeleton()),
        ),
      ),
    );

    expect(find.byType(CatchSectionList), findsOneWidget);
    expect(find.byType(CatchSection), findsNWidgets(4));
    expect(find.text('TREND'), findsOneWidget);
    expect(find.text('SUGGESTIONS'), findsOneWidget);
    expect(find.text('DATA COVERAGE'), findsOneWidget);
  });
}

class _LoadingUserAnalyticsRepository extends Fake
    implements UserAnalyticsRepository {
  @override
  Future<UserAnalyticsReport> getUserAnalytics(UserAnalyticsQuery query) {
    return Completer<UserAnalyticsReport>().future;
  }
}
