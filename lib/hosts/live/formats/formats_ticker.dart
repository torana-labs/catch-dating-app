import 'dart:async';

import 'package:catch_platform/cache/app_clock.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// A one-second clock for a live formats screen, read from the app clock
/// so tests and captures can hold it still. A fixed [fixedNow] stops it.
mixin HostFormatsTicker<T extends ConsumerStatefulWidget> on ConsumerState<T> {
  DateTime? _clockNow;
  Timer? _tick;

  /// A fixed clock for previews and tests; null follows the app clock.
  DateTime? get fixedNow;

  DateTime get now => fixedNow ?? _clockNow ?? DateTime.now();

  @override
  void initState() {
    super.initState();
    _scheduleTick();
  }

  @override
  void dispose() {
    _tick?.cancel();
    super.dispose();
  }

  void _scheduleTick() {
    _tick?.cancel();
    if (fixedNow != null) return;
    final clock = ref.read(appClockProvider);
    final current = clock.now();
    _clockNow = current;
    final nextSecond = DateTime(
      current.year,
      current.month,
      current.day,
      current.hour,
      current.minute,
      current.second + 1,
    );
    _tick = clock.timer(nextSecond.difference(current), () {
      if (!mounted) return;
      setState(_scheduleTick);
    });
  }
}
