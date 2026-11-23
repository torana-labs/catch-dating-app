import 'package:catch_dating_app/event_success/presentation/reveal/event_success_reveal_clock_mixin.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('reveal clock starts, pauses, resumes, and cancels on disposal', (
    tester,
  ) async {
    var builds = 0;
    Future<void> mount(bool enabled) => tester.pumpWidget(
      _ClockHarness(enabled: enabled, onBuild: (_) => builds++),
    );

    await mount(false);
    expect(builds, 1);
    await pumpFeatureUiFor(tester, CatchMotion.liveRevealClockTick * 2);
    expect(builds, 1);

    await mount(true);
    final started = builds;
    await pumpFeatureUiFor(tester, CatchMotion.liveRevealClockTick);
    expect(builds, started + 1);

    await mount(false);
    final paused = builds;
    await pumpFeatureUiFor(tester, CatchMotion.liveRevealClockTick * 2);
    expect(builds, paused);

    await mount(true);
    final resumed = builds;
    await pumpFeatureUiFor(tester, CatchMotion.liveRevealClockTick);
    expect(builds, resumed + 1);

    await tester.pumpWidget(const SizedBox.shrink());
    final disposed = builds;
    await pumpFeatureUiFor(tester, CatchMotion.liveRevealClockTick * 2);
    expect(builds, disposed);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'a parent refresh with the same clock state retains its cadence',
    (tester) async {
      var builds = 0;
      Future<void> mount() => tester.pumpWidget(
        _ClockHarness(enabled: true, onBuild: (_) => builds++),
      );
      final halfTick = CatchMotion.liveRevealClockTick ~/ 2;
      await mount();
      await pumpFeatureUiFor(tester, halfTick);
      expect(builds, 1);
      await mount();
      expect(builds, 2);
      await pumpFeatureUiFor(
        tester,
        CatchMotion.liveRevealClockTick - halfTick,
      );
      expect(builds, 3);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
}

class _ClockHarness extends StatefulWidget {
  const _ClockHarness({required this.enabled, required this.onBuild});

  final bool enabled;
  final ValueChanged<DateTime> onBuild;

  @override
  State<_ClockHarness> createState() => _ClockHarnessState();
}

class _ClockHarnessState extends State<_ClockHarness>
    with EventSuccessRevealClockMixin<_ClockHarness> {
  @override
  bool get revealClockEnabled => widget.enabled;

  @override
  Widget build(BuildContext context) {
    widget.onBuild(revealClockNow);
    return const SizedBox.shrink();
  }
}
