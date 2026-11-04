import 'dart:async';

import 'package:catch_platform/streams/dependent_listeners.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../test_pump_helpers.dart';

/// A primary listener whose values carry the secondary's key.
typedef _Primary = ({String? key, int value});

void main() {
  late StreamController<_Primary> primary;
  late Map<String, StreamController<String>> secondaries;
  late List<String> listened;
  late List<String> cancelled;

  setUp(() {
    primary = StreamController<_Primary>();
    addTearDown(() => primary.close());
    secondaries = {};
    listened = [];
    cancelled = [];
  });

  Stream<String> secondaryFor(String key) {
    final controller = StreamController<String>(
      onListen: () => listened.add(key),
      onCancel: () => cancelled.add(key),
    );
    addTearDown(controller.close);
    secondaries[key] = controller;
    return controller.stream;
  }

  Stream<String> follow() => dependentListeners<_Primary, String, String>(
    primary.stream,
    keyOf: (value) => value.key,
    secondaryFor: secondaryFor,
    combine: (value, secondary) => '${value.value}:${secondary ?? '-'}',
  );

  test('reads the secondary only after the primary names its key', () async {
    final values = <String>[];
    final subscription = follow().listen(values.add);
    await flushTestEventQueue();
    expect(listened, isEmpty);

    primary.add((key: 'a', value: 1));
    await flushTestEventQueue();
    expect(listened, ['a']);
    expect(values, isEmpty, reason: 'nothing before the secondary delivers');

    secondaries['a']!.add('x');
    await flushTestEventQueue();
    primary.add((key: 'a', value: 2));
    await flushTestEventQueue();
    secondaries['a']!.add('y');
    await flushTestEventQueue();
    expect(values, ['1:x', '2:x', '2:y']);
    expect(listened, ['a'], reason: 'the same key keeps its secondary');
    await subscription.cancel();
  });

  test('a key change restarts the secondary and waits for it', () async {
    final values = <String>[];
    final subscription = follow().listen(values.add);
    primary.add((key: 'a', value: 1));
    await flushTestEventQueue();
    secondaries['a']!.add('x');
    await flushTestEventQueue();

    primary.add((key: 'b', value: 2));
    await flushTestEventQueue();
    expect(cancelled, ['a']);
    expect(listened, ['a', 'b']);
    expect(values, ['1:x'], reason: 'withheld until the new secondary');

    secondaries['b']!.add('z');
    await flushTestEventQueue();
    expect(values, ['1:x', '2:z']);
    await subscription.cancel();
  });

  test('a null key emits with no secondary and stops the old one', () async {
    final values = <String>[];
    final subscription = follow().listen(values.add);
    primary.add((key: null, value: 1));
    await flushTestEventQueue();
    expect(values, ['1:-']);
    expect(listened, isEmpty);

    primary.add((key: 'a', value: 2));
    await flushTestEventQueue();
    secondaries['a']!.add('x');
    await flushTestEventQueue();
    primary.add((key: null, value: 3));
    await flushTestEventQueue();
    expect(values, ['1:-', '2:x', '3:-']);
    expect(cancelled, ['a']);
    await subscription.cancel();
  });

  test('errors from either listener pass through and stop neither', () async {
    final values = <String>[];
    final errors = <Object>[];
    final subscription = follow().listen(values.add, onError: errors.add);
    primary.add((key: 'a', value: 1));
    await flushTestEventQueue();
    secondaries['a']!.addError(StateError('secondary'));
    await flushTestEventQueue();
    primary.addError(StateError('primary'));
    await flushTestEventQueue();
    expect(errors.map((error) => (error as StateError).message), [
      'secondary',
      'primary',
    ]);

    secondaries['a']!.add('x');
    await flushTestEventQueue();
    expect(values, ['1:x']);
    await subscription.cancel();
  });

  test('cancelling the result cancels both listeners', () async {
    var primaryCancelled = false;
    primary = StreamController<_Primary>(
      onCancel: () => primaryCancelled = true,
    );
    addTearDown(primary.close);
    final subscription = follow().listen((_) {});
    primary.add((key: 'a', value: 1));
    await flushTestEventQueue();
    expect(listened, ['a']);

    await subscription.cancel();
    expect(primaryCancelled, isTrue);
    expect(cancelled, ['a']);
  });
}
