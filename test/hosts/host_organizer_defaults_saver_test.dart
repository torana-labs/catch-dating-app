import 'dart:async';

import 'package:catch_dating_app/contexts/organizers/domain/organizer_host_defaults.dart';
import 'package:catch_dating_app/hosts/presentation/organizer_management/host_organizer_defaults_saver.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';

void main() {
  test('coalesces rapid updates behind one in-flight write', () async {
    final firstWrite = Completer<void>();
    final writes = <OrganizerHostDefaults>[];
    final saver = HostOrganizerDefaultsSaver(
      initial: const OrganizerHostDefaults(),
      writer: (defaults) async {
        writes.add(defaults);
        if (writes.length == 1) await firstWrite.future;
      },
      errorMessageFor: (_) => 'save failed',
    );
    addTearDown(saver.dispose);

    saver.apply(
      (current) =>
          current.copyWith(primaryActivityKind: ActivityKind.pickleball),
    );
    await _drainQueue();
    expect(writes, hasLength(1));

    saver.apply(
      (current) => current.copyWith(
        eventPolicy: current.eventPolicy.copyWith(minAge: 25),
      ),
    );
    saver.apply(
      (current) => current.copyWith(
        eventPolicy: current.eventPolicy.copyWith(maxAge: 40),
      ),
    );
    expect(writes, hasLength(1));
    expect(saver.optimistic.eventPolicy.minAge, 25);
    expect(saver.optimistic.eventPolicy.maxAge, 40);

    firstWrite.complete();
    await _drainQueue();

    expect(writes, hasLength(2));
    expect(writes.last.primaryActivityKind, ActivityKind.pickleball);
    expect(writes.last.eventPolicy.minAge, 25);
    expect(writes.last.eventPolicy.maxAge, 40);
    expect(saver.isSaving, isFalse);
    expect(saver.errorMessage, isNull);
  });

  test(
    'reverts to the last confirmed defaults after a terminal failure',
    () async {
      const initial = OrganizerHostDefaults();
      final saver = HostOrganizerDefaultsSaver(
        initial: initial,
        writer: (_) => Future<void>.error(StateError('offline')),
        errorMessageFor: (_) => 'save failed',
      );
      addTearDown(saver.dispose);

      saver.apply(
        (current) =>
            current.copyWith(primaryActivityKind: ActivityKind.pickleball),
      );
      expect(saver.optimistic.primaryActivityKind, ActivityKind.pickleball);

      await _drainQueue();

      expect(saver.optimistic, initial);
      expect(saver.errorMessage, 'save failed');
      expect(saver.isSaving, isFalse);
    },
  );
}

Future<void> _drainQueue() async {
  await flushTestEventQueue(times: 4);
}
