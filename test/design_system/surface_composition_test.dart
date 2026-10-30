import 'dart:async';

import 'package:catch_dating_app/contexts/formats/domain/event_success_playbooks.dart';
import 'package:catch_dating_app/contexts/insights/domain/host_today_preference.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/reviews/data/reviews_repository.dart';
import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_delivery_entry_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_help_entry_section.dart';
import 'package:catch_dating_app/event_success/presentation/host_report/event_success_host_report_page_body.dart';
import 'package:catch_dating_app/hosts/presentation/host_operations_screen.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_event_reviews_panel.dart';
import 'package:catch_dating_app/hosts/today/personalization/presentation/host_today_personalization_section.dart';
import 'package:catch_dating_app/hosts/today/personalization/presentation/host_today_personalization_state.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
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

  testWidgets(
    'Today recommendation uses the action module and preserves intent',
    (tester) async {
      final actions = <HostTodaySuggestedAction>[];
      await mount(
        tester,
        HostTodayPersonalizationSection(
          state: HostTodayPersonalizationState(
            showOrientation: false,
            focus: HostTodayFocus.rehearsal,
            primaryAction: HostTodaySuggestedAction.startDressRehearsal,
            roadmap: const [],
          ),
          onChangeFocus: () {},
          onAction: actions.add,
        ),
      );
      final button = find.byKey(const ValueKey('host-today-suggested-action'));
      expect(tester.widget<CatchButton>(button).fullWidth, isTrue);
      final surface = tester.widget<CatchSurface>(
        find.ancestor(of: button, matching: find.byType(CatchSurface)).first,
      );
      expect(surface.emphasis, CatchSurfaceEmphasis.flat);
      expect(surface.tone, CatchSurfaceTone.primarySoft);
      await tester.tap(button);
      expect(actions, [HostTodaySuggestedAction.startDressRehearsal]);
      expect(tester.takeException(), isNull);
    },
  );

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
    final surface = tester.widget<CatchSurface>(
      find.ancestor(of: button, matching: find.byType(CatchSurface)).first,
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
    'public reviews uses the shared module and empty copy has no icon gutter',
    (tester) async {
      await mount(
        tester,
        const Padding(
          padding: EdgeInsets.all(20),
          child: HostEventReviewsPanel(eventId: 'event'),
        ),
      );
      final empty = find.byType(CatchEmptyState);
      expect(empty, findsOneWidget);
      expect(
        find.descendant(
          of: find.byType(HostEventReviewsPanel),
          matching: find.byType(CatchSurface),
        ),
        findsOneWidget,
      );
      expect(
        find.descendant(of: empty, matching: find.byType(Icon)),
        findsNothing,
      );
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'review failure stays in the module and retry recovers to empty',
    (tester) async {
      var loads = 0;
      await mount(
        tester,
        const HostEventReviewsPanel(eventId: 'event'),
        ready: find.widgetWithText(CatchButton, 'Try again'),
        reviews: () {
          loads++;
          return loads == 1
              ? Stream.error(Exception('review unavailable'))
              : Stream.value([]);
        },
      );
      expect(find.byType(CatchSurface), findsOneWidget);
      expect(find.byType(CatchEmptyState), findsNothing);
      final retry = find.widgetWithText(CatchButton, 'Try again');
      expect(retry, findsOneWidget);
      await tester.tap(retry);
      await pumpFeatureUi(tester);
      expect(loads, 2);
      expect(find.byType(CatchEmptyState), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'pending reviews keep the module and do not show successful-empty copy',
    (tester) async {
      final controller = StreamController<List<Review>>();
      await mount(
        tester,
        const HostEventReviewsPanel(eventId: 'event'),
        reviews: () => controller.stream,
      );
      expect(find.byType(CatchSurface), findsOneWidget);
      expect(find.byType(CatchLoadingIndicator), findsOneWidget);
      expect(find.byType(CatchEmptyState), findsNothing);
      await tester.pumpWidget(const SizedBox.shrink());
      unawaited(controller.close());
      expect(tester.takeException(), isNull);
    },
  );

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
            matching: find.byType(CatchSurface),
          ),
          findsOneWidget,
        );
        expect(tester.takeException(), isNull);
      }
    },
  );
}
