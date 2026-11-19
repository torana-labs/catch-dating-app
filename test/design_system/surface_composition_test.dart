import 'dart:async';

import 'package:catch_dating_app/contexts/formats/domain/event_success_playbooks.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/reviews/data/reviews_repository.dart';
import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_delivery_entry_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_help_entry_section.dart';
import 'package:catch_dating_app/event_success/presentation/host_report/event_success_host_report_page_body.dart';
import 'package:catch_dating_app/hosts/presentation/host_operations_screen.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart' show buildEvent;
import '../organizers/organizers_test_helpers.dart' show buildOrganizer;
import '../test_pump_helpers.dart';

void main() {
  Future<void> mount(
    WidgetTester tester,
    Widget child, {
    Stream<List<Review>> Function()? reviews,
    Finder? ready,
  }) async {
    tester.view.physicalSize = const Size(390, 1000);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(
      ProviderScope(
        retry: (retryCount, error) => null,
        overrides: [
          watchReviewsForEventProvider(
            'event',
          ).overrideWith((ref) => reviews?.call() ?? Stream.value([])),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: Scaffold(body: SingleChildScrollView(child: child)),
        ),
      ),
    );
    if (reviews == null) {
      await pumpFeatureUi(tester);
    } else {
      // Wait for the requested branch; pending progress never becomes idle.
      await pumpUntilFound(tester, ready ?? find.byType(CatchLoadingIndicator));
    }
  }

  testWidgets('publication keeps channel facts above explanation and action', (
    tester,
  ) async {
    await mount(
      tester,
      HostOrganizerEditBody(
        organizer: buildOrganizer(
          id: 'private',
          ownerUserId: 'owner',
          appVisibility: OrganizerAppVisibility.hidden,
        ),
        currentUid: 'owner',
        isOwner: true,
      ),
    );
    final button = find.widgetWithText(CatchButton, 'Make organizer public');
    final surface = tester.widget<CatchLegacySurface>(
      find
          .ancestor(of: button, matching: find.byType(CatchLegacySurface))
          .first,
    );
    expect(surface.tone, CatchSurfaceTone.primarySoft);
    expect(surface.emphasis, CatchSurfaceEmphasis.flat);
    expect(tester.widget<CatchButton>(button).fullWidth, isTrue);
    final facts = tester.getRect(
      find.byKey(const ValueKey('host-publication-website')),
    );
    final body = tester.getRect(find.textContaining('Only your Host team'));
    expect(body.top, greaterThan(facts.bottom));
    expect(tester.getRect(button).top, greaterThan(body.bottom));
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'report owns separation after message review in every empty branch',
    (tester) async {
      final event = buildEvent(id: 'event');
      final enabled =
          EventSuccessPlan.defaultForEvent(
            event,
            now: event.startTime,
          ).copyWith(
            selectedModuleIds: [EventSuccessModuleCatalog.hostAnalytics.id],
          );
      for (final state in ['unsaved', 'disabled', 'waiting']) {
        await mount(
          tester,
          Padding(
            padding: const EdgeInsets.all(20),
            child: EventSuccessHostReportPageBody(
              event: event,
              plan: state == 'disabled'
                  ? enabled.copyWith(selectedModuleIds: const [])
                  : enabled,
              planIsPersisted: state != 'unsaved',
              resourceFailures: const [],
              embedded: true,
              onRetryResource: null,
              helpSection: EventAssistanceHelpEntrySection(onReview: () {}),
              deliverySection: EventAssistanceDeliveryEntrySection(
                onReview: () {},
              ),
            ),
          ),
        );
        final delivery = tester.getRect(
          find.byType(EventAssistanceDeliveryEntrySection),
        );
        final empty = tester.getRect(
          find.byKey(const ValueKey('event-success-report-status')),
        );
        expect(empty.top - delivery.bottom, CatchGaps.section, reason: state);
        expect(
          find.descendant(
            of: find.byKey(const ValueKey('event-success-report-status')),
            matching: find.byType(CatchLegacySurface),
          ),
          findsOneWidget,
        );
        expect(tester.takeException(), isNull);
      }
    },
  );
}
