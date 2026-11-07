import 'package:catch_platform/cache/app_clock.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_success_companion_clock.g.dart';

const eventSuccessCompanionClockInterval = Duration(seconds: 30);

@riverpod
Stream<DateTime> eventSuccessCompanionClock(Ref ref) async* {
  final clock = ref.watch(appClockProvider);
  yield clock.now();
  yield* Stream<DateTime>.periodic(
    eventSuccessCompanionClockInterval,
    (_) => clock.now(),
  );
}
