import 'dart:io';

import 'package:catch_dating_app/contexts/audience/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_crm_summary.dart';
import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/hosts/presentation/host_operations_screen.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';
import 'catalog/screen_capture_catalog.dart';
import 'support/capture_device.dart';
import 'support/capture_pump.dart';

void main() {
  testWidgets(
    'captures organizer metrics and audience',
    (tester) async {
      final organizerId = HostOperationsFixtures.primaryClub.id;
      for (final view in [
        'performance',
        'reviews',
        'all_time',
        'audience',
        'preview',
      ]) {
        const requested = String.fromEnvironment('CAPTURE_VIEW');
        if (requested.isNotEmpty && requested != view) continue;
        final entry = findScreenCapture(
          view == 'preview'
              ? 'host_clubs_preview_tab'
              : 'host_clubs_insights_report',
        );
        final artifacts = await captureCatchWidget(
          tester,
          id: view,
          builder: (context) =>
              KeyedSubtree(key: ValueKey(view), child: entry.builder(context)),
          providerOverrides: [
            ...entry.providerOverrides,
            hostCrmSummaryProvider(organizerId).overrideWithValue(
              AsyncData(
                HostCrmSummary(
                  organizerId: organizerId,
                  contactCount: 214,
                  pastAttendeeCount: 148,
                  repeatAttendeeCount: 37,
                  linkedAccountCount: 92,
                  importedContactCount: 61,
                  whatsappOptInCount: 74,
                  smsOptInCount: 29,
                  truncated: false,
                  inAppReadiness: HostCrmChannelReadiness.currentEventOnly,
                  whatsappReadiness:
                      HostCrmChannelReadiness.providerSetupRequired,
                  smsReadiness:
                      HostCrmChannelReadiness.providerAndDltSetupRequired,
                ),
              ),
            ),
          ],
          device: CaptureDevice.iphone17Pro,
          pixelRatio: 2,
          textScale: double.parse(
            const String.fromEnvironment(
              'CAPTURE_TEXT_SCALE',
              defaultValue: '1',
            ),
          ),
          outputDirectory: Directory(
            const String.fromEnvironment(
              'CAPTURE_OUTPUT_DIR',
              defaultValue: 'artifacts/organizer-insights-preview',
            ),
          ),
          drive: (tester) async {
            await pumpFeatureUi(tester);
            final target = switch (view) {
              'reviews' => find.byType(HostAnalyticsReviewsSection),
              'all_time' => find.byType(HostOrganizerMetricGrid),
              'audience' => find.textContaining(
                RegExp(r'^(AUDIENCE|Past attendee CRM)$'),
              ),
              'performance' => find.byKey(
                const ValueKey('host-analytics-primary-grid'),
              ),
              _ => find.byType(CatchMetricSection),
            };
            await pumpUntilFound(tester, target);
            await Scrollable.ensureVisible(
              tester.element(target),
              alignment: 0.05,
            );
            final position = Scrollable.of(tester.element(target)).position;
            position.jumpTo(
              (position.pixels - (view == 'audience' ? 0 : 110)).clamp(
                position.minScrollExtent,
                position.maxScrollExtent,
              ),
            );
            await pumpFeatureUi(tester);
          },
        );
        expect(artifacts, hasLength(2));
      }
    },
    variant: TargetPlatformVariant.only(TargetPlatform.iOS),
  );
}
