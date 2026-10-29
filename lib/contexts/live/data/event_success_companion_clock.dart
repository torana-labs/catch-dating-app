import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_success_companion_clock.g.dart';

const eventSuccessCompanionClockInterval = Duration(seconds: 30);

@riverpod
Stream<DateTime> eventSuccessCompanionClock(Ref ref) async* {
  yield DateTime.now();
  yield* Stream<DateTime>.periodic(
    eventSuccessCompanionClockInterval,
    (_) => DateTime.now(),
  );
}
