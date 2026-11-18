import 'dart:async';

import 'package:catch_platform/cache/app_clock.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show ProviderListenable;

/// Completes when [provider]'s value satisfies [isSettled], or when [deadline]
/// runs out on the app clock, whichever comes first.
///
/// For a provider that is a synchronous composition of other reads and so has
/// no `.future` to await, such as a feed view model a pull-to-refresh waits
/// on. It listens (`listenManual`) instead of polling, and never throws: the
/// deadline ends the wait and the screen shows whatever state the provider is
/// in.
Future<void> untilSettled<T>(
  WidgetRef ref,
  ProviderListenable<T> provider, {
  required bool Function(T value) isSettled,
  required Duration deadline,
}) {
  final settled = Completer<void>();
  void settle() {
    if (!settled.isCompleted) settled.complete();
  }

  final subscription = ref.listenManual<T>(provider, (_, next) {
    if (isSettled(next)) settle();
  }, fireImmediately: true);
  final timer = ref.read(appClockProvider).timer(deadline, settle);
  return settled.future.whenComplete(() {
    timer.cancel();
    subscription.close();
  });
}
