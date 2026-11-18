import 'dart:async';

import 'package:catch_platform/firebase/catch_firebase_functions.dart';
import 'package:catch_platform/riverpod_ui/pending_write_observer.dart';
import 'package:fake_async/fake_async.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('a write still running after eight seconds counts as still working '
      'until it settles; a quick write never does', () {
    fakeAsync((async) {
      final container = ProviderContainer.test(
        observers: [PendingWriteObserver()],
      );
      container.listen(stillWorkingWritesProvider, (_, _) {});
      final save = Mutation<void>();
      final slow = Completer<void>();

      unawaited(save.run(container, (_) => slow.future));
      async.elapse(writeStillWorkingAfter - const Duration(milliseconds: 1));
      expect(container.read(stillWorkingWritesProvider), 0);
      async.elapse(const Duration(milliseconds: 1));
      expect(container.read(stillWorkingWritesProvider), 1);

      slow.complete();
      async.flushMicrotasks();
      expect(container.read(stillWorkingWritesProvider), 0);

      final quick = Mutation<void>();
      unawaited(quick.run(container, (_) async {}));
      async.elapse(const Duration(seconds: 30));
      expect(container.read(stillWorkingWritesProvider), 0);
    });
  });

  test('a write that fails after the notice clears it and is not retried', () {
    fakeAsync((async) {
      final container = ProviderContainer.test(
        observers: [PendingWriteObserver()],
      );
      container.listen(stillWorkingWritesProvider, (_, _) {});
      final save = Mutation<void>();
      var attempts = 0;
      final failing = Completer<void>();

      unawaited(
        save
            .run(container, (_) {
              attempts++;
              return failing.future;
            })
            .catchError((_) {}),
      );
      async.elapse(writeStillWorkingAfter);
      expect(container.read(stillWorkingWritesProvider), 1);

      failing.completeError(TimeoutException('write'));
      async
        ..flushMicrotasks()
        ..elapse(const Duration(minutes: 1));
      expect(container.read(stillWorkingWritesProvider), 0);
      expect(attempts, 1);
    });
  });
}
