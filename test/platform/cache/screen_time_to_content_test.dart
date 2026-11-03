import 'dart:async';

import 'package:catch_platform/analytics/app_analytics.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/cache/screen_time_to_content.dart';
import 'package:catch_platform/riverpod_ui/catch_async_boundary.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/analytics_test_helpers.dart';
import '../../test_pump_helpers.dart';

void main() {
  testWidgets('a screen visit logs its time to content once', (tester) async {
    final reporter = RecordingAnalyticsReporter();
    var now = DateTime(2026, 11, 3, 9);
    final first = ValueNotifier<AsyncValue<String>>(const AsyncLoading());
    final second = ValueNotifier<AsyncValue<String>>(const AsyncLoading());
    addTearDown(first.dispose);
    addTearDown(second.dispose);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          appClockProvider.overrideWithValue(AppClock.custom(() => now)),
          appAnalyticsProvider.overrideWithValue(
            AppAnalytics(
              reporter: reporter,
              shouldCollect: true,
              hostRole: false,
            ),
          ),
        ],
        child: MaterialApp(
          initialRoute: 'eventDetail',
          onGenerateRoute: (settings) => MaterialPageRoute<void>(
            settings: settings,
            builder: (_) =>
                Column(children: [_Boundary(first), _Boundary(second)]),
          ),
        ),
      ),
    );

    now = now.add(const Duration(milliseconds: 1500));
    second.value = const AsyncData('section');
    await tester.pump();
    first.value = const AsyncData('header');
    await tester.pump();

    expect(reporter.events, [
      const AnalyticsEventCall(screenTimeToContentEvent, {
        ScreenTimeToContentParameters.surface: 'eventDetail',
        ScreenTimeToContentParameters.durationMs: 1500,
        ScreenTimeToContentParameters.contentSource: 'load',
      }),
    ]);
  });

  testWidgets('a screen that opens with its data logs it as memory', (
    tester,
  ) async {
    final reporter = RecordingAnalyticsReporter();
    final navigator = GlobalKey<NavigatorState>();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          appClockProvider.overrideWithValue(
            AppClock.custom(() => DateTime(2026, 11, 3, 9)),
          ),
          appAnalyticsProvider.overrideWithValue(
            AppAnalytics(
              reporter: reporter,
              shouldCollect: true,
              hostRole: false,
            ),
          ),
        ],
        child: MaterialApp(
          navigatorKey: navigator,
          initialRoute: 'home',
          onGenerateRoute: (settings) => MaterialPageRoute<void>(
            settings: settings,
            builder: (_) => _Boundary(
              ValueNotifier<AsyncValue<String>>(const AsyncData('kept')),
            ),
          ),
        ),
      ),
    );
    unawaited(navigator.currentState!.pushNamed<void>('organizerDetail'));
    await pumpFeatureUi(tester);
    unawaited(
      navigator.currentState!.push<void>(
        MaterialPageRoute<void>(
          builder: (_) => _Boundary(
            ValueNotifier<AsyncValue<String>>(const AsyncData('unnamed')),
          ),
        ),
      ),
    );
    await pumpFeatureUi(tester);

    expect(
      reporter.events.map(
        (event) => event.parameters![ScreenTimeToContentParameters.surface],
      ),
      ['home', 'organizerDetail'],
    );
    expect(
      reporter.events.map(
        (event) =>
            event.parameters![ScreenTimeToContentParameters.contentSource],
      ),
      ['memory', 'memory'],
    );
  });

  testWidgets('a boundary outside a ProviderScope logs nothing', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: CatchAsyncBoundary<String>(
          value: const AsyncData('data'),
          builder: (_, value) => Text(value),
        ),
      ),
    );
    expect(find.text('data'), findsOneWidget);
  });
}

class _Boundary extends StatelessWidget {
  const _Boundary(this.value);

  final ValueNotifier<AsyncValue<String>> value;

  @override
  Widget build(BuildContext context) => ValueListenableBuilder(
    valueListenable: value,
    builder: (_, current, _) => CatchAsyncBoundary<String>(
      value: current,
      initialLoadTimeout: null,
      loadingBuilder: (_) => const Text('loading'),
      builder: (_, data) => Text(data),
    ),
  );
}
