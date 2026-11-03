import 'package:catch_dating_app/chats/presentation/event_chat_controller.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_projection_lifetime.dart';
import 'package:catch_dating_app/dashboard/presentation/dashboard_full_view_model.dart';
import 'package:catch_dating_app/explore/presentation/explore_feed_providers.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:fake_async/fake_async.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('fake_async drives the clock and its timers together', () {
    fakeAsync((async) {
      final start = DateTime(2026, 11, 3, 9, 30, 15);
      final clock = AppClock.custom(() => start.add(async.elapsed));
      final fired = <DateTime>[];
      clock.timer(const Duration(minutes: 5), () => fired.add(clock.now()));
      final ticks = clock.periodic(
        const Duration(minutes: 2),
        (_) => fired.add(clock.now()),
      );

      async.elapse(const Duration(minutes: 6));
      ticks.cancel();

      expect(clock.now(), start.add(const Duration(minutes: 6)));
      expect(fired, [
        start.add(const Duration(minutes: 2)),
        start.add(const Duration(minutes: 4)),
        start.add(const Duration(minutes: 5)),
        start.add(const Duration(minutes: 6)),
      ]);
    });
  });

  test('the device clock reads the wall time', () {
    final before = DateTime.now();
    final now = const AppClock().now();
    expect(now.isBefore(before), isFalse);
  });

  test('the four feature clocks are aliases of the app clock', () {
    final now = DateTime(2026, 11, 3, 21, 47, 33);
    final container = ProviderContainer.test(
      overrides: [
        appClockProvider.overrideWithValue(AppClock.custom(() => now)),
      ],
    );
    expect(container.read(dashboardNowProvider), now);
    expect(container.read(eventChatNowProvider)(), now);
    expect(container.read(programProjectionClockProvider)(), now);
    expect(
      container.read(exploreDiscoveryReferenceNowProvider),
      DateTime(2026, 11, 3, 21, 47),
    );
  });
}
