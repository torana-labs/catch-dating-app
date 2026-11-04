import 'dart:async';

import 'package:catch_platform/streams/combine_latest.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../test_pump_helpers.dart';

void main() {
  test('emits once both listeners delivered, then on every delivery', () async {
    final first = StreamController<int>();
    final second = StreamController<String>();
    final values = <String>[];
    final subscription = combineLatest(
      first.stream,
      second.stream,
      (int a, String b) => '$a$b',
    ).listen(values.add);
    first.add(1);
    await flushTestEventQueue();
    expect(values, isEmpty);
    second.add('a');
    await flushTestEventQueue();
    first.add(2);
    await flushTestEventQueue();
    second.add('b');
    await flushTestEventQueue();
    expect(values, ['1a', '2a', '2b']);
    await subscription.cancel();
    await first.close();
    await second.close();
  });

  test('an error passes through and cancels neither listener', () async {
    final first = StreamController<int>();
    final second = StreamController<int>();
    final values = <int>[];
    final errors = <Object>[];
    final subscription = combineLatest(
      first.stream,
      second.stream,
      (int a, int b) => a + b,
    ).listen(values.add, onError: errors.add);
    first.add(1);
    await flushTestEventQueue();
    second.addError(StateError('second failed'));
    await flushTestEventQueue();
    second.add(10);
    await flushTestEventQueue();
    first.add(2);
    await flushTestEventQueue();
    expect(errors.single, isA<StateError>());
    expect(values, [11, 12]);
    expect(first.hasListener, isTrue);
    expect(second.hasListener, isTrue);
    await subscription.cancel();
    await first.close();
    await second.close();
  });

  test('a throwing combine is an error, not the end of the stream', () async {
    final first = StreamController<int>();
    final second = StreamController<int>();
    final values = <int>[];
    final errors = <Object>[];
    final subscription = combineLatest(first.stream, second.stream, (
      int a,
      int b,
    ) {
      if (b == 0) throw const FormatException('zero');
      return a ~/ b;
    }).listen(values.add, onError: errors.add);
    first.add(10);
    await flushTestEventQueue();
    second.add(0);
    await flushTestEventQueue();
    second.add(5);
    await flushTestEventQueue();
    expect(errors.single, isA<FormatException>());
    expect(values, [2]);
    await subscription.cancel();
    await first.close();
    await second.close();
  });

  test('pause, resume and cancel reach both listeners', () async {
    var firstPaused = false;
    var secondPaused = false;
    var cancelled = 0;
    final first = StreamController<int>(
      onPause: () => firstPaused = true,
      onResume: () => firstPaused = false,
      onCancel: () => cancelled++,
    );
    final second = StreamController<int>(
      onPause: () => secondPaused = true,
      onResume: () => secondPaused = false,
      onCancel: () => cancelled++,
    );
    final subscription = combineLatest(
      first.stream,
      second.stream,
      (int a, int b) => a + b,
    ).listen((_) {});
    subscription.pause();
    expect((firstPaused, secondPaused), (true, true));
    subscription.resume();
    expect((firstPaused, secondPaused), (false, false));
    await subscription.cancel();
    expect(cancelled, 2);
    await first.close();
    await second.close();
  });

  test('closes once both listeners have closed', () async {
    final first = StreamController<int>();
    final second = StreamController<int>();
    var done = false;
    combineLatest(
      first.stream,
      second.stream,
      (int a, int b) => a + b,
    ).listen((_) {}, onDone: () => done = true);
    await first.close();
    await flushTestEventQueue();
    expect(done, isFalse);
    await second.close();
    await flushTestEventQueue();
    expect(done, isTrue);
  });
}
