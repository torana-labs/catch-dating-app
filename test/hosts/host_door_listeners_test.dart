import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/host_provider_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_event_roster_insights.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/hosts/presentation/host_roster_insight_filter.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_operational_roster_section.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../test_pump_helpers.dart';

const _organizerId = 'org-1';
const _eventId = 'event-1';

Widget _app(Widget child) => MaterialApp(
  theme: AppTheme.light,
  localizationsDelegates: AppLocalizations.localizationsDelegates,
  supportedLocales: AppLocalizations.supportedLocales,
  home: Scaffold(body: SingleChildScrollView(child: child)),
);

HostProviderSetup _setup({
  HostProviderSetupCoverage coverage = HostProviderSetupCoverage.complete,
}) => HostProviderSetup(
  organizerId: _organizerId,
  eventId: _eventId,
  providers: hostProviderCatalog,
  sourceCoverage: coverage,
  connections: [
    HostProviderConnection.fromMap({
      'connectionId': 'opc_1',
      'status': 'active',
      'externalAccountId': 'calendar-1',
      'externalAccountName': 'Sunday Club',
      'capabilities': const {
        'eventList': true,
        'rosterIdentity': true,
        'registrationStatus': true,
        'providerCheckIn': true,
        'orderAmount': false,
        'refundStatus': false,
        'referralCode': false,
        'webhooks': false,
        'writeBookings': false,
      },
      'revision': 1,
      'lastHealthSyncAtMillis': null,
      'lastSuccessfulSyncAtMillis': null,
    }),
  ],
  mapping: HostProviderEventMapping.fromMap({
    'mappingId': externalEventMappingId(_eventId),
    'connectionId': 'opc_1',
    'externalEventId': 'evt-1',
    'status': 'active',
    'revision': 1,
    'lastSyncAtMillis': null,
    'lastSuccessfulSyncAtMillis': null,
    'lastSyncStatus': 'never',
    'lastSyncRunId': null,
  }),
);

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  testWidgets('the door listens to provider setup once intake opens', (
    tester,
  ) async {
    final setups = StreamController<HostProviderSetup>.broadcast();
    addTearDown(setups.close);
    var listens = 0;
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          uidProvider.overrideWith((ref) => Stream.value('host-1')),
          hostProviderSetupProvider(_organizerId, _eventId).overrideWith((ref) {
            listens++;
            return setups.stream;
          }),
        ],
        child: _app(
          const HostGuestIntakeField(
            eventId: _eventId,
            organizerId: _organizerId,
            bookingProvider: ExternalBookingProvider.luma,
          ),
        ),
      ),
    );
    await pumpFeatureUi(tester);
    expect(listens, 0);

    await tester.tap(
      find.byKey(const ValueKey<String>('host_event_guest_intake_field')),
    );
    // The setup is loading: its indicator animates until the first delivery.
    await tester.pump();
    expect(listens, 1);

    setups.add(_setup());
    await pumpFeatureUi(tester);
    expect(find.text('Sunday Club'), findsOneWidget);

    // A later delivery updates the open door without another read.
    setups.add(_setup(coverage: HostProviderSetupCoverage.missing));
    await pumpFeatureUi(tester);
    expect(find.text('Sunday Club'), findsNothing);
    expect(listens, 1);
  });

  testWidgets('roster labels the server has not prepared show unavailable', (
    tester,
  ) async {
    for (final coverage in [
      HostRosterInsightCoverage.missing,
      HostRosterInsightCoverage.invalidSource,
    ]) {
      await tester.pumpWidget(
        ProviderScope(
          child: _app(
            HostRosterInsightRail(
              insightsAsync: AsyncData(
                coverage == HostRosterInsightCoverage.missing
                    ? const HostEventRosterInsights.missing(_eventId)
                    : HostEventRosterInsights(
                        eventId: _eventId,
                        organizerId: _organizerId,
                        cutoffAt: DateTime(2026, 9),
                        sourceCoverage: coverage,
                        spendCoverage:
                            HostRosterSpendCoverage.catchPaymentsOnly,
                        rows: const [],
                        computedAt: DateTime(2026, 9),
                      ),
              ),
              attendeeCount: 3,
              selected: HostRosterInsightFilter.all,
              onSelected: (_) {},
              onRetry: () {},
            ),
          ),
        ),
      );
      await pumpFeatureUi(tester);
      expect(
        find.text('Customer labels are unavailable. Check-in still works.'),
        findsOneWidget,
      );
    }
  });
}
