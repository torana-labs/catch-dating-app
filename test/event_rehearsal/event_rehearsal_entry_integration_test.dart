import 'dart:async';

import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_configuration.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_host_defaults.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_controller.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_entry_view_model.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/host_event_rehearsal_start_screen.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_notice_controller.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_notice_overlay.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_dating_app/routing/route_contract.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../test_pump_helpers.dart';
import 'event_rehearsal_configuration_test.dart' show rehearsalSourceEvent;

void main() {
  testWidgets(
    'Start submits the source configuration once and opens its runtime',
    (tester) async {
      final controller = _Controller();
      final completion = Completer<EventRehearsalCreated>();
      controller._completion = completion;
      final router = _router();
      addTearDown(router.dispose);
      await tester.pumpWidget(_app(router, controller));
      await pumpFeatureUi(tester);
      expect(find.textContaining('18 attendees'), findsOneWidget);
      expect(find.byType(TextField), findsNothing);
      await tester.tap(find.text('Start rehearsal'));
      await tester.pump();
      expect(controller._calls, 1);
      expect(controller._guestSource, 'event');
      expect(controller._sourceEventId, 'event-1');
      expect(controller._actorCount, 18);
      expect(controller._startImmediately, isTrue);
      expect(controller._setup?.title, 'Saturday singles mixer');
      expect(controller._setup?.successDefaults, isNotNull);
      final button = tester.widget<CatchButton>(
        find.byWidgetPredicate(
          (widget) =>
              widget is CatchButton && widget.label == 'Start rehearsal',
        ),
      );
      expect(button.onPressed, isNull);
      completion.complete(_created);
      await pumpFeatureUi(tester);
      expect(find.text('runtime: session-new'), findsOneWidget);
    },
  );

  testWidgets(
    'custom guest count and event details reach creation and survive a failure',
    (tester) async {
      final controller = _Controller().._failFirst = true;
      final router = _router();
      addTearDown(router.dispose);
      await tester.pumpWidget(_app(router, controller));
      await pumpFeatureUi(tester);
      await tester.ensureVisible(find.text('Customise rehearsal'));
      await tester.tap(find.text('Customise rehearsal'));
      await pumpFeatureUi(tester);
      await tester.tap(find.text('Use simulated guests'));
      await pumpFeatureUi(tester);
      final count = find.descendant(
        of: find.widgetWithText(CatchField, 'Number of simulated guests'),
        matching: find.byType(TextField),
      );
      await tester.ensureVisible(count);
      await tester.enterText(count, '31');
      await tester.ensureVisible(find.text('Event details'));
      await tester.tap(find.text('Event details'));
      await pumpFeatureUi(tester);
      final title = find.descendant(
        of: find.widgetWithText(CatchField, 'Event title'),
        matching: find.byType(TextField),
      );
      await tester.ensureVisible(title);
      await tester.enterText(title, 'Only this practice copy');
      await tester.ensureVisible(find.text('Done'));
      await tester.tap(find.text('Done'));
      await pumpFeatureUi(tester);
      await tester.tap(find.text('Start rehearsal'));
      await pumpFeatureUi(tester);
      expect(controller._guestSource, 'simulated');
      expect(controller._actorCount, 31);
      expect(controller._setup?.title, 'Only this practice copy');
      expect(find.text('Custom settings · Edit or reset'), findsOneWidget);
      ProviderScope.containerOf(
        tester.element(find.byType(HostEventRehearsalStartScreen)),
        listen: false,
      ).read(catchNoticeControllerProvider.notifier).clear();
      await pumpFeatureUi(tester);
      expect(
        tester
            .widget<CatchButton>(
              find.byWidgetPredicate(
                (widget) =>
                    widget is CatchButton && widget.label == 'Start rehearsal',
              ),
            )
            .onPressed,
        isNotNull,
      );
      await tester.tap(find.text('Start rehearsal'));
      await pumpFeatureUi(tester);
      expect(controller._calls, 2);
      expect(controller._setup?.title, 'Only this practice copy');
      expect(find.text('runtime: session-new'), findsOneWidget);
    },
  );

  testWidgets('custom entry starts from organizer defaults', (tester) async {
    final controller = _Controller();
    final router = _router(custom: true);
    addTearDown(router.dispose);
    await tester.pumpWidget(_app(router, controller));
    await pumpFeatureUi(tester);

    expect(find.text('Practise hosting'), findsOneWidget);
    expect(find.text('ORGANISER DEFAULT'), findsOneWidget);
    expect(find.text('Sample Social run'), findsOneWidget);
    expect(find.text('Saturday singles mixer'), findsNothing);
    expect(find.textContaining('18 attendees'), findsNothing);
  });
}

GoRouter _router({bool custom = false}) => GoRouter(
  initialLocation: '/start',
  routes: [
    GoRoute(
      path: '/start',
      builder: (_, state) => HostEventRehearsalStartScreen(
        clubId: 'club-1',
        startFromOrganizerDefaults: custom,
      ),
    ),
    GoRoute(
      path: '/runtime/:clubId/:sessionId',
      name: Routes.hostEventRehearsalScreen.name,
      builder: (_, state) =>
          Scaffold(body: Text('runtime: ${state.pathParameters['sessionId']}')),
    ),
  ],
);

Widget _app(GoRouter router, _Controller controller) => ProviderScope(
  overrides: [
    // Root test fixtures replace dependencies without creating app scopes.
    // ignore: riverpod_lint/scoped_providers_should_specify_dependencies
    eventRehearsalControllerProvider.overrideWith(() => controller),
    // ignore: riverpod_lint/scoped_providers_should_specify_dependencies
    eventRehearsalEntryProvider('club-1', null).overrideWith(
      (ref) async => EventRehearsalEntryData(
        organizerDefaults: const OrganizerHostDefaults(),
        events: [rehearsalSourceEvent()],
        initialConfiguration: EventRehearsalConfiguration.defaults(
          organizerDefaults: const OrganizerHostDefaults(),
          event: rehearsalSourceEvent(),
          sourceGuestCount: 18,
        ),
      ),
    ),
  ],
  child: MaterialApp.router(
    theme: AppTheme.light,
    routerConfig: router,
    builder: (context, child) =>
        CatchNoticeOverlay(child: child ?? const SizedBox.shrink()),
    localizationsDelegates: AppLocalizations.localizationsDelegates,
    supportedLocales: AppLocalizations.supportedLocales,
  ),
);

const _created = EventRehearsalCreated(
  sessionId: 'session-new',
  guestUrl: 'https://example.test/practice',
  setupRevision: 0,
  runtimeRevision: 0,
);

class _Controller extends EventRehearsalController {
  @override
  void build() {
    ref.keepAlive();
  }

  int _calls = 0;
  bool _failFirst = false;
  Completer<EventRehearsalCreated>? _completion;
  EventRehearsalSetup? _setup;
  String? _guestSource;
  String? _sourceEventId;
  int? _actorCount;
  bool? _startImmediately;
  @override
  Future<EventRehearsalCreated> create({
    required String organizerId,
    required String? sourceEventId,
    required EventRehearsalScenario scenario,
    required int actorCount,
    EventRehearsalSetup? setup,
    String guestSource = 'simulated',
    bool startImmediately = false,
  }) async {
    _calls++;
    _setup = setup;
    _guestSource = guestSource;
    _sourceEventId = sourceEventId;
    _actorCount = actorCount;
    _startImmediately = startImmediately;
    if (_failFirst && _calls == 1) throw StateError('Try again');
    return _completion?.future ?? Future.value(_created);
  }
}
