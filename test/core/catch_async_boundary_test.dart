// ignore_for_file: invalid_use_of_internal_member

import 'dart:async';

import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/cache/cache_policies.dart';
import 'package:catch_platform/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';

void main() {
  for (final fillRemaining in [true, false]) {
    testWidgets('default sliver loading honors fillRemaining: $fillRemaining', (
      tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CustomScrollView(
              slivers: [
                CatchAsyncBoundary<int>.sliver(
                  value: const AsyncLoading<int>(),
                  initialLoadTimeout: null,
                  fillRemaining: fillRemaining,
                  builder: (_, value) =>
                      SliverToBoxAdapter(child: Text('$value')),
                ),
              ],
            ),
          ),
        ),
      );
      expect(
        find.byType(CatchStateViewport),
        fillRemaining ? findsOneWidget : findsNothing,
      );
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });
  }

  test('retention conditions preserve each async branch independently', () {
    final error = StateError('Failed');
    const data = AsyncData<int>(7);
    final failure = AsyncError<int>(error, StackTrace.empty);
    final refresh = const AsyncLoading<int>().copyWithPrevious(data);
    final reload = const AsyncLoading<int>().copyWithPrevious(
      data,
      isRefresh: false,
    );
    final stale = failure.copyWithPrevious(data);
    final retry = const AsyncLoading<int>().copyWithPrevious(failure);
    final automaticRetry = AsyncError<int>(
      error,
      StackTrace.empty,
      retrying: true,
    );
    final staleRetry = const AsyncLoading<int>().copyWithPrevious(stale);
    for (var mask = 0; mask < 8; mask++) {
      final modes = <CatchAsyncBoundaryMode>{
        if (mask & 1 != 0) CatchAsyncBoundaryMode.refresh,
        if (mask & 2 != 0) CatchAsyncBoundaryMode.reload,
        if (mask & 4 != 0) CatchAsyncBoundaryMode.error,
      };
      for (final value in [const AsyncLoading<int>(), retry, automaticRetry]) {
        expect(
          catchAsyncBoundaryStatus(value, retainDataOn: modes),
          CatchAsyncBoundaryStatus.loading,
        );
      }
      expect(
        catchAsyncBoundaryStatus(data, retainDataOn: modes),
        CatchAsyncBoundaryStatus.data,
      );
      expect(
        catchAsyncBoundaryStatus(failure, retainDataOn: modes),
        CatchAsyncBoundaryStatus.error,
      );
      expect(
        catchAsyncBoundaryStatus(refresh, retainDataOn: modes),
        mask & 1 != 0
            ? CatchAsyncBoundaryStatus.data
            : CatchAsyncBoundaryStatus.loading,
      );
      expect(
        catchAsyncBoundaryStatus(staleRetry, retainDataOn: modes),
        mask & 1 != 0
            ? CatchAsyncBoundaryStatus.data
            : CatchAsyncBoundaryStatus.loading,
      );
      expect(
        catchAsyncBoundaryStatus(reload, retainDataOn: modes),
        mask & 2 != 0
            ? CatchAsyncBoundaryStatus.data
            : CatchAsyncBoundaryStatus.loading,
      );
      expect(
        catchAsyncBoundaryStatus(stale, retainDataOn: modes),
        mask & 4 != 0
            ? CatchAsyncBoundaryStatus.data
            : CatchAsyncBoundaryStatus.error,
      );
    }
    expect(
      catchAsyncBoundaryStatus(const AsyncData<int?>(null)),
      CatchAsyncBoundaryStatus.data,
    );
  });

  testWidgets('a first load runs out on the app clock and offers Retry; '
      'a cached read keeps its data when a refetch fails', (tester) async {
    final clock = _RecordingClock();
    final value = ValueNotifier<AsyncValue<int>>(const AsyncLoading<int>());
    addTearDown(value.dispose);
    var retries = 0;
    await tester.pumpWidget(
      ProviderScope(
        overrides: [appClockProvider.overrideWithValue(clock)],
        child: MaterialApp(
          theme: CatchTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: Scaffold(
            body: ValueListenableBuilder<AsyncValue<int>>(
              valueListenable: value,
              builder: (context, current, _) => CatchAsyncBoundary<int>(
                value: current,
                initialLoadTimeout: CachePolicies.liveOperations.firstLoad,
                retainDataOn: catchCachedReadRetainedData,
                onRetry: () => retries++,
                builder: (_, data) => Text('Data $data'),
                loadingBuilder: (_) => const Text('Loading'),
              ),
            ),
          ),
        ),
      ),
    );
    expect(clock.timers, [const Duration(seconds: 6)]);
    await pumpFeatureUiFor(tester, const Duration(seconds: 6));
    expect(find.text('Try again'), findsOneWidget);
    await tester.tap(find.text('Try again'));
    await tester.pump();
    expect(retries, 1);

    value.value = const AsyncData<int>(1);
    await tester.pump();
    expect(find.text('Data 1'), findsOneWidget);

    // A refetch that fails, a timeout included, keeps the data: the screen
    // says it could not refresh rather than replacing the data.
    value.value = AsyncError<int>(
      TimeoutException('refresh'),
      StackTrace.empty,
    ).copyWithPrevious(const AsyncData<int>(1));
    await tester.pump();
    expect(find.text('Data 1'), findsOneWidget);
    expect(find.text('Try again'), findsNothing);
  });

  for (final sliver in [false, true]) {
    testWidgets('disabling a pending timeout cancels it (sliver: $sliver)', (
      tester,
    ) async {
      const deadline = Duration(milliseconds: 20);
      var retries = 0;
      final timeout = ValueNotifier<Duration?>(deadline);
      addTearDown(timeout.dispose);
      await tester.pumpWidget(
        MaterialApp(
          theme: CatchTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: Scaffold(
            body: ValueListenableBuilder<Duration?>(
              valueListenable: timeout,
              builder: (context, duration, _) => sliver
                  ? CustomScrollView(
                      slivers: [
                        CatchAsyncBoundary<int>.sliver(
                          value: const AsyncLoading<int>(),
                          initialLoadTimeout: duration,
                          onRetry: () => retries++,
                          builder: (_, value) =>
                              SliverToBoxAdapter(child: Text('$value')),
                          loadingBuilder: (_) =>
                              const SliverToBoxAdapter(child: Text('Loading')),
                        ),
                      ],
                    )
                  : CatchAsyncBoundary<int>(
                      value: const AsyncLoading<int>(),
                      initialLoadTimeout: duration,
                      onRetry: () => retries++,
                      builder: (_, value) => Text('$value'),
                      loadingBuilder: (_) => const Text('Loading'),
                    ),
            ),
          ),
        ),
      );
      timeout.value = null;
      await tester.pump();
      await pumpFeatureUiFor(tester, deadline * 2);
      expect(find.text('Loading'), findsOneWidget);
      expect(find.text('Try again'), findsNothing);
      timeout.value = deadline;
      await tester.pump();
      await pumpFeatureUiFor(tester, deadline * 2);
      expect(find.text('Try again'), findsOneWidget);
      await tester.tap(find.text('Try again'));
      await tester.pump();
      expect(retries, 1);
      expect(find.text('Loading'), findsOneWidget);
      await tester.pumpWidget(const SizedBox.shrink());
      await pumpFeatureUiFor(tester, deadline * 2);
      expect(tester.takeException(), isNull);
    });
  }
}

final class _RecordingClock extends AppClock {
  _RecordingClock();

  final timers = <Duration>[];

  @override
  Timer timer(Duration duration, void Function() callback) {
    timers.add(duration);
    return super.timer(duration, callback);
  }
}
