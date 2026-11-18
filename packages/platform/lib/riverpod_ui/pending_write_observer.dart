import 'dart:async';

import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/firebase/catch_firebase_functions.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'pending_write_observer.g.dart';

/// How many writes have run longer than [writeStillWorkingAfter]. The notice
/// overlay says "Still working" while it is above zero.
// keepalive: app-wide UI state, like the notice queue it feeds.
@Riverpod(keepAlive: true)
class StillWorkingWrites extends _$StillWorkingWrites {
  @override
  int build() => 0;

  void add() => state++;

  void remove() {
    if (state > 0) state--;
  }
}

/// Watches every mutation (the app's writes) and counts the ones still
/// pending after [writeStillWorkingAfter] in [stillWorkingWritesProvider].
///
/// It never retries or cancels a write: a write that is not safe to repeat
/// must not run twice, and one that times out has an unknown outcome the
/// screen confirms from its listener or a read-back.
final class PendingWriteObserver extends ProviderObserver {
  PendingWriteObserver();

  final _timers = <Mutation<Object?>, Timer>{};
  final _slow = <Mutation<Object?>>{};

  @override
  void mutationStart(
    ProviderObserverContext context,
    Mutation<Object?> mutation,
  ) {
    final container = context.container;
    _settle(container, mutation);
    _timers[mutation] = container.read(appClockProvider).timer(
      writeStillWorkingAfter,
      () {
        _timers.remove(mutation);
        _slow.add(mutation);
        container.read(stillWorkingWritesProvider.notifier).add();
      },
    );
  }

  @override
  void mutationSuccess(
    ProviderObserverContext context,
    Mutation<Object?> mutation,
    Object? result,
  ) => _settle(context.container, mutation);

  @override
  void mutationError(
    ProviderObserverContext context,
    Mutation<Object?> mutation,
    Object error,
    StackTrace stackTrace,
  ) => _settle(context.container, mutation);

  @override
  void mutationReset(
    ProviderObserverContext context,
    Mutation<Object?> mutation,
  ) => _settle(context.container, mutation);

  void _settle(ProviderContainer container, Mutation<Object?> mutation) {
    _timers.remove(mutation)?.cancel();
    if (!_slow.remove(mutation)) return;
    // Observers run while the mutation notifies, which can be while its
    // listeners are torn down; update the count after that.
    scheduleMicrotask(() {
      try {
        container.read(stillWorkingWritesProvider.notifier).remove();
      } on StateError {
        // The container was disposed in between: nothing is left to show.
      }
    });
  }
}
