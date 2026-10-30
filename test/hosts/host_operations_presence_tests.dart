part of 'host_operations_screen_test.dart';

void _registerHostOperationsPresenceTests() {
  for (final canEdit in [true, false]) {
    testWidgets('Host tracking policy gate and server eligibility $canEdit', (
      tester,
    ) async {
      var saves = 0;
      String? savedMeta;
      String? savedGoogle;
      bool? savedEnabled;
      await _pumpHostScreen(
        tester,
        RepaintBoundary(
          key: const ValueKey('presence-preview-boundary'),
          child: Scaffold(
            body: SingleChildScrollView(
              child: HostTrackingSettingsInputSection(
                current: HostTrackingSettings(
                  organizerId: 'settings-owner',
                  revision: 4,
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
                    }) async {
                      saves++;
                      savedMeta = metaPixelId;
                      savedGoogle = googleMeasurementId;
                      savedEnabled = enabled;
                    },
              ),
            ),
          ),
        ),
      );
      final toggle = tester.widget<CatchField>(
        find.byKey(const ValueKey('host-tracking-enabled')),
      );
      expect(toggle.toggled, isFalse);
      expect(toggle.onToggle, isNull);
      expect(
        find.byKey(const ValueKey('host-tracking-policy-blocked')),
        findsOneWidget,
      );
      expect(
        find.byKey(const ValueKey('host-tracking-unclaimed')),
        canEdit ? findsNothing : findsOneWidget,
      );
      final save = tester.widget<CatchButton>(
        find.byKey(const ValueKey('host-tracking-save')),
      );
      expect(save.onPressed == null, !canEdit);
      if (canEdit) {
        save.onPressed!();
        await tester.pump();
        expect(saves, 1);
        expect(savedMeta, isNull);
        expect(savedGoogle, isNull);
        expect(savedEnabled, isFalse);
        final meta = find.descendant(
          of: find.byKey(const ValueKey('host-tracking-meta-id')),
          matching: find.byType(EditableText),
        );
        await tester.enterText(meta, '<script>pixel()</script>');
        save.onPressed!();
        await tester.pump();
        expect(saves, 1);
        expect(
          find.text('Enter a valid provider ID or leave this field blank.'),
          findsOneWidget,
        );
        await tester.enterText(meta, '');
        tester.state<FormState>(find.byType(Form)).validate();
        FocusManager.instance.primaryFocus?.unfocus();
        await tester.pump();
      }
      expect(tester.takeException(), isNull);
      await _captureHostPresencePreview(
        tester,
        canEdit ? 'settings-policy-blocked' : 'settings-unclaimed',
      );
    });
  }

  for (final mode in ['zero', 'missing', 'populated']) {
    final missing = mode == 'missing';
    final populated = mode == 'populated';
    testWidgets('Host presence distinguishes measured totals from missing $mode', (
      tester,
    ) async {
      final baseline = await const _EmptyHostAnalyticsRepository()
          .getHostAnalytics(const HostAnalyticsQuery());
      final report = HostAnalyticsReport(
        generatedAt: baseline.generatedAt,
        summaryCards: populated
            ? [
                for (final stage in <(String, int, HostAnalyticsMetricStatus)>[
                  ('outboundBookingClicks', 2, HostAnalyticsMetricStatus.ready),
                  ('internalFormDrafts', 17, HostAnalyticsMetricStatus.ready),
                  (
                    'internalFormSubmissions',
                    8,
                    HostAnalyticsMetricStatus.partial,
                  ),
                  (
                    'internalFormCheckoutAttempts',
                    5,
                    HostAnalyticsMetricStatus.ready,
                  ),
                  (
                    'internalFormFeesCaptured',
                    4,
                    HostAnalyticsMetricStatus.ready,
                  ),
                  (
                    'internalDirectCheckoutAttempts',
                    3,
                    HostAnalyticsMetricStatus.ready,
                  ),
                  (
                    'internalDirectPaymentsCaptured',
                    2,
                    HostAnalyticsMetricStatus.ready,
                  ),
                  (
                    'internalDirectPaidAdmissions',
                    1,
                    HostAnalyticsMetricStatus.ready,
                  ),
                  (
                    'internalFormFreeAdmissions',
                    6,
                    HostAnalyticsMetricStatus.ready,
                  ),
                  (
                    'internalFormAttestedAdmissions',
                    7,
                    HostAnalyticsMetricStatus.partial,
                  ),
                  (
                    'internalOfferCheckoutAttempts',
                    9,
                    HostAnalyticsMetricStatus.ready,
                  ),
                  (
                    'internalOfferPaymentsCaptured',
                    10,
                    HostAnalyticsMetricStatus.ready,
                  ),
                  (
                    'internalOfferPaidAdmissions',
                    11,
                    HostAnalyticsMetricStatus.missing,
                  ),
                ])
                  HostAnalyticsMetricCard(
                    id: stage.$1,
                    label: 'SERVER_LABEL',
                    value: stage.$2,
                    unit: HostAnalyticsMetricUnit.count,
                    status: stage.$3,
                    caption: 'Observed period counts',
                  ),
              ]
            : baseline.summaryCards,
        trend: baseline.trend,
        topEvents: baseline.topEvents,
        reviewSummary: baseline.reviewSummary,
        discoverySummary: populated
            ? HostAnalyticsDiscoverySummary.fromMap({
                'listingViews': 17,
                'eventViews': 8,
                'outboundClicks': 3,
                'linkClicks': 6,
              })
            : baseline.discoverySummary,
        linkSummary: populated
            ? HostAnalyticsLinkSummary.fromMap({
                'links': [
                  {
                    'organizerId': 'org',
                    'linkId': 'tickets',
                    'label': 'Diwali run tickets',
                    'clicks': 4,
                  },
                  {
                    'organizerId': 'org',
                    'linkId': 'gone',
                    'label': null,
                    'clicks': 2,
                  },
                ],
                'trafficSources': [
                  {'source': 'instagram', 'clicks': 5},
                  {'source': 'qr', 'clicks': 1},
                  {'source': 'utm_campaign', 'clicks': 9},
                ],
              })
            : const HostAnalyticsLinkSummary(),
        dataQuality: missing
            ? const [
                HostAnalyticsDataQuality(
                  id: 'client-behavior-events',
                  state: HostAnalyticsDataQualityState.missing,
                  detail: 'No source data.',
                ),
              ]
            : const [],
      );
      await _pumpHostScreen(
        tester,
        RepaintBoundary(
          key: const ValueKey('presence-preview-boundary'),
          child: Scaffold(
            body: SingleChildScrollView(
              child: HostAnalyticsReportBody(
                report: report,
                rangePreset: HostOrganizerInsightsRangePreset.thirtyDays,
                currencyCode: 'INR',
                onOpenEventReport: (_) {},
                onOpenAllEvents: () {},
                onOpenEventDefaults: () {},
              ),
            ),
          ),
        ),
      );
      final presence = find.byKey(const ValueKey('host-analytics-presence'));
      final metrics = tester.widget<CatchMetricSection>(
        find
            .descendant(of: presence, matching: find.byType(CatchMetricSection))
            .first,
      );
      expect(
        metrics.items.map((item) => item.value),
        populated ? ['17', '8', '3', '6'] : everyElement(missing ? '—' : '0'),
      );
      expect(metrics.items.map((item) => item.label), [
        'Profile views',
        'Event views',
        'Outbound source clicks',
        'Link clicks',
      ]);
      final linkClicks = find.byKey(
        const ValueKey('host-analytics-link-clicks'),
      );
      expect(linkClicks, populated ? findsOneWidget : findsNothing);
      if (populated) {
        expect(
          tester
              .widget<CatchMetricSection>(linkClicks)
              .items
              .map((item) => (item.label, item.value)),
          [('Diwali run tickets', '4'), ('Removed link', '2')],
        );
        expect(
          find.text('Link clicks came from Instagram 5, QR codes 1.'),
          findsOneWidget,
        );
      }
      expect(
        find.text(
          missing
              ? 'Presence data is unavailable for this range. Missing data is shown as —.'
              : 'No public views or outbound clicks were observed in this range.',
        ),
        populated ? findsNothing : findsOneWidget,
      );
      final stages = tester.widget<CatchMetricSection>(
        find.descendant(
          of: find.byKey(const ValueKey('host-analytics-observed-stages')),
          matching: find.byType(CatchMetricSection),
        ),
      );
      expect(
        stages.metrics.map((metric) => metric.status),
        populated
            ? [
                CatchMetricDataStatus.ready,
                CatchMetricDataStatus.ready,
                CatchMetricDataStatus.partial,
                CatchMetricDataStatus.ready,
                CatchMetricDataStatus.ready,
                CatchMetricDataStatus.ready,
                CatchMetricDataStatus.ready,
                CatchMetricDataStatus.ready,
                CatchMetricDataStatus.ready,
                CatchMetricDataStatus.partial,
                CatchMetricDataStatus.ready,
                CatchMetricDataStatus.ready,
                CatchMetricDataStatus.missing,
              ]
            : everyElement(CatchMetricDataStatus.missing),
      );
      if (populated) {
        expect(
          stages.metrics.skip(8).map((metric) => metric.label),
          everyElement('SERVER_LABEL'),
        );
        expect(stages.metrics.map((metric) => metric.value), [
          '2',
          '17',
          '8',
          '5',
          '4',
          '3',
          '2',
          '1',
          '6',
          '7',
          '9',
          '10',
          '11',
        ]);
        expect(
          stages.metrics.map((metric) => metric.caption),
          everyElement('Observed period counts'),
        );
      }
      expect(
        find.textContaining('A form fee payment does not confirm admission'),
        findsOneWidget,
      );
      expect(find.textContaining('not unique visitors'), findsOneWidget);
      expect(find.textContaining('do not confirm a booking'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await _captureHostPresencePreview(tester, mode, scrollToPresence: true);
      if (populated) {
        await _captureHostPresencePreview(
          tester,
          'stages-populated',
          scrollTarget: 'host-analytics-observed-stages',
        );
      }
    });
  }

  testWidgets(
    'Host analytics permission denied does not display presence totals',
    (tester) async {
      final organizer = buildOrganizer(
        id: 'denied-analytics',
        ownerUserId: _hostUid,
      );
      await _pumpHostScreen(
        tester,
        RepaintBoundary(
          key: const ValueKey('presence-preview-boundary'),
          child: Scaffold(
            body: SingleChildScrollView(
              child: HostOrganizerInsightsSection(organizer: organizer),
            ),
          ),
        ),
        overrides: [
          watchEventsForOrganizerProvider(
            organizer.id,
          ).overrideWithValue(const AsyncData<List<Event>>([])),
          hostCrmSummaryProvider(
            organizer.id,
          ).overrideWithValue(AsyncData(_emptyCrmSummary(organizer.id))),
          hostTrackingSettingsProvider(organizer.id).overrideWithValue(
            const AsyncError<HostTrackingSettings>(
              PermissionException('Access denied.'),
              StackTrace.empty,
            ),
          ),
          hostAnalyticsDeviceTimezoneProvider.overrideWith(
            (ref) async => 'UTC',
          ),
          hostAnalyticsProvider(
            const HostAnalyticsQuery(
              clubId: 'denied-analytics',
              granularity: HostAnalyticsGranularity.week,
              timezone: 'UTC',
            ),
          ).overrideWithValue(
            const AsyncError<HostAnalyticsReport>(
              PermissionException('Access denied.'),
              StackTrace.empty,
            ),
          ),
        ],
      );
      expect(
        find.byKey(const ValueKey('host-analytics-presence')),
        findsNothing,
      );
      expect(find.byType(CatchLocalizedErrorState), findsNWidgets(2));
      expect(tester.takeException(), isNull);
      await _captureHostPresencePreview(tester, 'denied');
    },
  );
}
