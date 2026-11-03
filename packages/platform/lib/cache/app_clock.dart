import 'dart:async';

import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'app_clock.g.dart';

/// The one wall clock and timer source for screen data.
///
/// Cache lifetimes, staleness checks, `fetchedAt` stamps and screen clocks
/// read the time here, so a test can drive all of them from one fake. Timers
/// are created in the current zone: inside `fakeAsync`, they fire when the
/// fake time is elapsed, and a clock built with [AppClock.custom] over the
/// same `FakeAsync` keeps [now] in step with them.
class AppClock {
  /// The device clock.
  const AppClock() : _now = null;

  /// A clock whose time comes from [now]. Its timers still use the current
  /// zone, so a fake zone drives both.
  const AppClock.custom(DateTime Function() now) : _now = now;

  final DateTime Function()? _now;

  /// The current wall-clock time.
  DateTime now() => _now?.call() ?? DateTime.now();

  /// A one-shot timer that fires after [duration].
  Timer timer(Duration duration, void Function() callback) =>
      Timer(duration, callback);

  /// A repeating timer that fires every [period].
  Timer periodic(Duration period, void Function(Timer timer) callback) =>
      Timer.periodic(period, callback);
}

// keepalive: the clock is account-free infrastructure every screen shares.
@Riverpod(keepAlive: true)
AppClock appClock(Ref ref) => const AppClock();
