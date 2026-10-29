import 'dart:async';

import 'package:catch_dating_app/contexts/insights/data/host_analytics_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/host_tracking_settings_repository.dart';
import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/hosts/presentation/host_operations_screen.dart';
import 'package:catch_dating_app/hosts/presentation/host_tracking_settings_section.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_analytics_observed_stages_section.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_analytics_presence_section.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_tracking_settings_input_section.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import '../../support/page_preview.dart';
import 'preview.dart';
import 'shell_fixture.dart';

@widgetbook.UseCase(
  name: 'Period remains available during loading',
  type: HostAnalyticsPeriodInput,
  path: '[P1 product surfaces]/Host operations',
)
Widget hostAnalyticsPeriodStates(BuildContext context) =>
    WidgetbookHostComponentFrame(
      child: HostAnalyticsPeriodInput(
        selected: HostClubInsightsRangePreset.thirtyDays,
        onChanged: (_) {},
      ),
    );

@widgetbook.UseCase(
  name: 'Insights scorecard states',
  type: HostClubInsightsSection,
  path: '[P1 product surfaces]/Host operations',
)
Widget hostInsightsScorecardStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'HostClubInsightsSection',
    contractId: 'screen.host.clubs.insights',
    children: [
      WidgetbookPageStateCard(
        label: 'report loading',
        child: const WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            analyticsRepository: _HostLoadingAnalyticsRepository(),
            child: HostClubsScreen(initialTab: HostClubTab.insights),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'loaded narrative scorecard',
        child: WidgetbookHostDeviceFrame(
          child: const WidgetbookHostShellScope(
            child: HostClubsScreen(initialTab: HostClubTab.insights),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'empty range',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            analyticsRepository: HostFixtureAnalyticsRepository(
              report: _emptyHostAnalyticsReport(),
            ),
            child: const HostClubsScreen(initialTab: HostClubTab.insights),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'measured zero public presence',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            analyticsRepository: HostFixtureAnalyticsRepository(
              report: _emptyHostAnalyticsReport(unavailable: false),
            ),
            child: const HostClubsScreen(initialTab: HostClubTab.insights),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'permission denied',
        child: const WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            analyticsRepository: _HostDeniedAnalyticsRepository(),
            child: HostClubsScreen(initialTab: HostClubTab.insights),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'partial data',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            analyticsRepository: HostFixtureAnalyticsRepository(
              report: _partialHostAnalyticsReport(),
            ),
            child: const HostClubsScreen(initialTab: HostClubTab.insights),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'Coach recommendations',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            analyticsRepository: HostFixtureAnalyticsRepository(
              report: _coachHostAnalyticsReport(),
            ),
            child: const HostClubsScreen(initialTab: HostClubTab.insights),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'text scale 2.0',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookMediaOverride(
            textScaler: const TextScaler.linear(2),
            child: const WidgetbookHostShellScope(
              child: HostClubsScreen(initialTab: HostClubTab.insights),
            ),
          ),
        ),
      ),
    ],
  );
}

Widget _hostAnalyticsExactCatalog(BuildContext context, String focus) {
  return WidgetbookPageCatalogFrame(
    title: focus,
    contractId:
        'component.host.analytics.${widgetbookHostComponentSlug(focus)}',
    children: [
      WidgetbookPageStateCard(
        label: 'exact component',
        child: WidgetbookHostComponentFrame(
          child: _hostAnalyticsPreviewFor(focus),
        ),
      ),
    ],
  );
}

Widget _hostAnalyticsPreviewFor(String focus) {
  final report = HostOperationsFixtures.analyticsReport;
  return switch (focus) {
    'CatchBarIndicator' => const SizedBox(
      height: WidgetbookPreviewLayout.smallPreviewExtent,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(child: CatchBarIndicator(value: 18, maxValue: 42)),
          gapW8,
          Expanded(child: CatchBarIndicator(value: 32, maxValue: 42)),
          gapW8,
          Expanded(child: CatchBarIndicator(value: 42, maxValue: 42)),
        ],
      ),
    ),
    'HostAnalyticsEventList' => HostAnalyticsEventList(
      events: report.topEvents,
      onOpenEventReport: (_) {},
      onOpenAllEvents: () {},
    ),
    'HostAnalyticsReportBody' => HostAnalyticsReportBody(
      report: report,
      rangePreset: HostClubInsightsRangePreset.thirtyDays,
      currencyCode: 'INR',
      onOpenEventReport: (_) {},
      onOpenAllEvents: () {},
      onOpenEventDefaults: () {},
    ),
    'HostAnalyticsReviewsSection' => HostAnalyticsReviewsSection(
      report: report,
    ),
    'HostAnalyticsTrendSection' => HostAnalyticsTrendSection(
      points: report.trend,
      granularity: HostAnalyticsGranularity.week,
    ),
    'HostAnalyticsBarTile' => HostAnalyticsBarTile(
      point: report.trend.first,
      maxValue: 60,
      label: '2 Jun',
      selected: true,
      onTap: () {},
    ),
    _ => Text('No exact preview registered for $focus.'),
  };
}

HostAnalyticsReport _emptyHostAnalyticsReport({bool unavailable = true}) {
  final source = HostOperationsFixtures.analyticsReport;
  return HostAnalyticsReport(
    generatedAt: source.generatedAt,
    timezone: source.timezone,
    summaryCards: [
      for (final card in source.summaryCards)
        HostAnalyticsMetricCard(
          id: card.id,
          label: card.label,
          value: 0,
          unit: card.unit,
          status: HostAnalyticsMetricStatus.missing,
        ),
    ],
    trend: const [],
    topEvents: const [],
    reviewSummary: const HostAnalyticsReviewSummary(
      newReviews: 0,
      publishedReviews: 0,
      verifiedReviews: 0,
      publicReviews: 0,
      ownerResponseCount: 0,
      averageRating: 0,
    ),
    discoverySummary: const HostAnalyticsDiscoverySummary(
      listingViews: 0,
      searchAppearances: 0,
      eventViews: 0,
      organizerSaves: 0,
      eventSaves: 0,
      contactClicks: 0,
      claimClicks: 0,
      outboundClicks: 0,
    ),
    dataQuality: unavailable
        ? const [
            HostAnalyticsDataQuality(
              id: 'mart',
              state: HostAnalyticsDataQualityState.missing,
              detail: 'Fixture data is unavailable.',
            ),
          ]
        : const [],
  );
}

HostAnalyticsReport _partialHostAnalyticsReport() {
  final source = HostOperationsFixtures.analyticsReport;
  return HostAnalyticsReport(
    generatedAt: source.generatedAt,
    timezone: source.timezone,
    summaryCards: [
      for (final indexed in source.summaryCards.indexed)
        HostAnalyticsMetricCard(
          id: indexed.$2.id,
          label: indexed.$2.label,
          value: indexed.$2.value,
          previousValue: indexed.$2.previousValue,
          unit: indexed.$2.unit,
          status: indexed.$1 == 0
              ? HostAnalyticsMetricStatus.partial
              : indexed.$2.status,
        ),
    ],
    trend: source.trend,
    topEvents: source.topEvents,
    reviewSummary: source.reviewSummary,
    discoverySummary: source.discoverySummary,
    dataQuality: const [
      HostAnalyticsDataQuality(
        id: 'payments',
        state: HostAnalyticsDataQualityState.partial,
        detail: 'Payment metrics are still syncing.',
      ),
    ],
  );
}

HostAnalyticsReport _coachHostAnalyticsReport() {
  final source = HostOperationsFixtures.analyticsReport;
  return HostAnalyticsReport(
    generatedAt: source.generatedAt,
    timezone: source.timezone,
    summaryCards: [
      for (final card in source.summaryCards)
        HostAnalyticsMetricCard(
          id: card.id,
          label: card.label,
          value: card.id == HostAnalyticsMetricIds.attendanceRate
              ? 59
              : card.value,
          previousValue: card.previousValue,
          unit: card.unit,
          status: card.status,
        ),
    ],
    trend: source.trend,
    topEvents: source.topEvents,
    reviewSummary: source.reviewSummary,
    discoverySummary: source.discoverySummary,
    dataQuality: source.dataQuality,
  );
}

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: CatchBarIndicator,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictCatchBarIndicatorCatalogStates(BuildContext context) =>
    _hostAnalyticsExactCatalog(context, 'CatchBarIndicator');

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostAnalyticsEventList,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostAnalyticsEventListCatalogStates(BuildContext context) =>
    _hostAnalyticsExactCatalog(context, 'HostAnalyticsEventList');

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostAnalyticsReportBody,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostAnalyticsReportViewCatalogStates(BuildContext context) =>
    _hostAnalyticsExactCatalog(context, 'HostAnalyticsReportBody');

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostAnalyticsReviewsSection,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostAnalyticsReviewsPanelCatalogStates(BuildContext context) =>
    _hostAnalyticsExactCatalog(context, 'HostAnalyticsReviewsSection');

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostAnalyticsTrendSection,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostAnalyticsTrendPanelCatalogStates(BuildContext context) =>
    _hostAnalyticsExactCatalog(context, 'HostAnalyticsTrendSection');

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostAnalyticsBarTile,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostAnalyticsDualBarCatalogStates(BuildContext context) =>
    _hostAnalyticsExactCatalog(context, 'HostAnalyticsBarTile');

final class _HostLoadingAnalyticsRepository implements HostAnalyticsRepository {
  const _HostLoadingAnalyticsRepository();

  @override
  Future<HostAnalyticsReport> getHostAnalytics(HostAnalyticsQuery query) {
    return Completer<HostAnalyticsReport>().future;
  }
}

final class _HostDeniedAnalyticsRepository implements HostAnalyticsRepository {
  const _HostDeniedAnalyticsRepository();

  @override
  Future<HostAnalyticsReport> getHostAnalytics(HostAnalyticsQuery query) async {
    throw const PermissionException('Host analytics access denied.');
  }
}

@widgetbook.UseCase(
  name: 'Observed totals and unavailable source',
  type: HostAnalyticsPresenceSection,
  path: '[P1 product surfaces]/Host operations/Analytics',
)
Widget hostAnalyticsPresenceSectionStates(
  BuildContext context,
) => WidgetbookPageCatalogFrame(
  title: 'HostAnalyticsPresenceSection',
  contractId:
      'component.host.analytics.${widgetbookHostComponentSlug('HostAnalyticsPresenceSection')}',
  children: [
    WidgetbookPageStateCard(
      label: 'observed totals',
      child: WidgetbookHostComponentFrame(
        child: HostAnalyticsPresenceSection(
          report: HostOperationsFixtures.analyticsReport,
        ),
      ),
    ),
    WidgetbookPageStateCard(
      label: 'measured zero',
      child: WidgetbookHostComponentFrame(
        child: HostAnalyticsPresenceSection(
          report: _emptyHostAnalyticsReport(unavailable: false),
        ),
      ),
    ),
    WidgetbookPageStateCard(
      label: 'source unavailable',
      child: WidgetbookHostComponentFrame(
        child: HostAnalyticsPresenceSection(
          report: _emptyHostAnalyticsReport(),
        ),
      ),
    ),
  ],
);

@widgetbook.UseCase(
  name: 'Observed stages and missing coverage',
  type: HostAnalyticsObservedStagesSection,
  path: '[P1 product surfaces]/Host operations/Analytics',
)
Widget hostAnalyticsObservedStagesSectionStates(
  BuildContext context,
) => WidgetbookPageCatalogFrame(
  title: 'HostAnalyticsObservedStagesSection',
  contractId:
      'component.host.analytics.${widgetbookHostComponentSlug('HostAnalyticsObservedStagesSection')}',
  children: [
    WidgetbookPageStateCard(
      label: 'observed period counts with partial submissions',
      child: WidgetbookHostComponentFrame(
        child: HostAnalyticsObservedStagesSection(
          report: HostAnalyticsReport.fromCallableData({
            'generatedAt': '2026-06-18T12:00:00.000Z',
            'summaryCards': [
              for (final stage in <(String, int)>[
                ('outboundBookingClicks', 9),
                ('internalFormDrafts', 24),
                ('internalFormSubmissions', 18),
                ('internalFormCheckoutAttempts', 11),
                ('internalFormFeesCaptured', 8),
                ('internalDirectCheckoutAttempts', 7),
                ('internalDirectPaymentsCaptured', 4),
                ('internalDirectPaidAdmissions', 3),
              ])
                {
                  'id': stage.$1,
                  'label': '',
                  'value': stage.$2,
                  'unit': 'count',
                  'status': stage.$1 == 'internalFormSubmissions'
                      ? 'partial'
                      : 'ready',
                  'caption': 'Observed period counts',
                },
            ],
          }),
        ),
      ),
    ),
    WidgetbookPageStateCard(
      label: 'coverage unavailable',
      child: WidgetbookHostComponentFrame(
        child: HostAnalyticsObservedStagesSection(
          report: _emptyHostAnalyticsReport(),
        ),
      ),
    ),
  ],
);

@widgetbook.UseCase(
  name: 'Mocked private settings read and save',
  type: HostTrackingSettingsSection,
  path: '[P1 product surfaces]/Host operations/Analytics',
)
Widget hostTrackingSettingsSectionState(BuildContext context) =>
    WidgetbookHostComponentFrame(
      child: HostTrackingSettingsSection(
        organizerId: HostOperationsFixtures.primaryClub.id,
      ),
    );

@widgetbook.UseCase(
  name: 'Policy blocked and unclaimed configuration',
  type: HostTrackingSettingsInputSection,
  path: '[P1 product surfaces]/Host operations/Analytics',
)
Widget hostTrackingSettingsInputSectionStates(
  BuildContext context,
) => WidgetbookPageCatalogFrame(
  title: 'HostTrackingSettingsInputSection',
  contractId:
      'component.host.analytics.${widgetbookHostComponentSlug('HostTrackingSettingsInputSection')}',
  children: [
    for (final canEdit in [true, false])
      WidgetbookPageStateCard(
        label: canEdit
            ? 'disabled configuration; policy review required'
            : 'unclaimed read only',
        child: WidgetbookHostComponentFrame(
          child: HostTrackingSettingsInputSection(
            current: HostTrackingSettings(
              organizerId: HostOperationsFixtures.primaryClub.id,
              revision: 0,
              metaPixelId: null,
              googleMeasurementId: null,
              enabled: false,
              publicationAllowed: false,
              canEdit: canEdit,
              editBlockedReason: canEdit ? 'none' : 'unclaimed',
            ),
            pending: false,
            onReload: () {},
            onSave:
                ({
                  required metaPixelId,
                  required googleMeasurementId,
                  required enabled,
                }) async {},
          ),
        ),
      ),
  ],
);
