import 'dart:async';

import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/programs/presentation/program_create_controller.dart';
import 'package:catch_dating_app/programs/presentation/program_create_state.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';

final _start = DateTime.utc(2026, 10, 5);
final _end = DateTime.utc(2026, 10, 8);
final _draft = ProgramCreateValues(
  title: 'Wedding weekend',
  kind: ProgramKind.wedding,
  timezone: 'Asia/Kolkata',
  startsAt: _start,
  endsAt: _end,
);
const _receipt = ProgramMutationResult(
  entityId: 'saved-id',
  revision: 1,
  alreadyApplied: false,
);
OrganizerProgramSettings _saved({String id = 'saved-id', String org = 'org'}) =>
    OrganizerProgramSettings(
      programId: id,
      organizerId: org,
      kind: ProgramKind.wedding,
      title: _draft.title,
      timezone: _draft.timezone,
      status: ProgramStatus.draft,
      startsAt: _start,
      endsAt: _end,
      capabilities: const ['arrivalsTransport'],
      revision: 1,
    );
OrganizerProgramListRow _row({String id = 'saved-id'}) =>
    OrganizerProgramListRow(
      programId: id,
      title: _draft.title,
      kind: 'wedding',
      status: 'draft',
      timezone: _draft.timezone,
      revision: 1,
      startsAt: _start,
      endsAt: _end,
      functionCount: 0,
    );
ProgramCreateController _controller({
  ProgramCreateValues? values,
  ProgramCreateCommand? create,
  Future<OrganizerProgramSettings> Function(String)? read,
  Future<List<OrganizerProgramListRow>> Function(String)? refresh,
  bool Function()? isActorCurrent,
  ProgramCreateValues? submittedValues,
  String? programId,
  String Function()? newRequestId,
  ProgramCreateSnapshotWriter? persist,
  Future<void> Function(String)? clearPersisted,
}) => ProgramCreateController(
  organizerId: 'org',
  requestId: 'fixed-request-key',
  initialValues: values ?? _draft,
  initialSubmittedValues: submittedValues,
  initialProgramId: programId,
  newRequestId: newRequestId,
  persist: persist,
  clearPersisted: clearPersisted,
  create: create ?? (_, _) async => _receipt,
  readSaved: read ?? (_) async => _saved(),
  refreshPrograms: refresh ?? (_) async => [_row()],
  isActorCurrent: isActorCurrent ?? () => true,
);

void main() {
  test(
    'fresh persistence failure before dispatch unlocks without rotating key',
    () async {
      var calls = 0;
      final failure = StateError('local persistence unavailable');
      final controller = _controller(
        persist: (_) async => throw failure,
        create: (_, _) async {
          calls++;
          return _receipt;
        },
      );
      addTearDown(controller.dispose);
      expect(await controller.submit(), isNull);
      expect(calls, 0);
      expect(controller.error, same(failure));
      expect(controller.commandPending, isFalse);
      expect(controller.fieldsLocked, isFalse);
      expect(controller.requestId, 'fixed-request-key');
      controller.edit(_draft.copyWith(title: 'Corrected draft'));
      expect(controller.values.title, 'Corrected draft');
      await flushTestEventQueue();
    },
  );

  test(
    'recovered ambiguous command stays locked if retry persistence fails',
    () async {
      var calls = 0;
      final controller = _controller(
        submittedValues: _draft,
        persist: (_) async => throw StateError('local persistence unavailable'),
        create: (_, _) async {
          calls++;
          return _receipt;
        },
      );
      addTearDown(controller.dispose);
      expect(await controller.submit(), isNull);
      expect(calls, 0);
      expect(controller.commandPending, isTrue);
      expect(controller.fieldsLocked, isTrue);
      expect(controller.requestId, 'fixed-request-key');
    },
  );

  test('actor change during command persistence prevents dispatch', () async {
    final persisted = Completer<void>();
    var current = true;
    var calls = 0;
    final controller = _controller(
      persist: (_) => persisted.future,
      isActorCurrent: () => current,
      create: (_, _) async {
        calls++;
        return _receipt;
      },
    );
    addTearDown(controller.dispose);
    final pending = controller.submit();
    current = false;
    persisted.complete();
    expect(await pending, isNull);
    expect(calls, 0);
    expect(controller.actorChanged, isTrue);
  });

  test(
    'missing required fields show all inline errors without a request',
    () async {
      var calls = 0;
      final controller = _controller(
        values: const ProgramCreateValues(),
        create: (_, _) async {
          calls++;
          return _receipt;
        },
      );
      addTearDown(controller.dispose);
      expect(await controller.submit(), isNull);
      expect(controller.showErrors, isTrue);
      expect(
        controller.values.errors.keys.toSet(),
        ProgramCreateField.values.toSet(),
      );
      expect(calls, 0);
      expect(controller.saving, isFalse);
    },
  );

  test(
    'canonical text lengths and strict date ordering reject before create',
    () async {
      for (final draft in [
        _draft.copyWith(title: 'x' * 141),
        _draft.copyWith(timezone: 'x' * 61),
        _draft.copyWith(timezone: 'Not/A_Timezone'),
        _draft.copyWith(endsAt: _start),
        _draft.copyWith(endsAt: _start.subtract(const Duration(days: 1))),
      ]) {
        var calls = 0;
        final controller = _controller(
          values: draft,
          create: (_, _) async {
            calls++;
            return _receipt;
          },
        );
        expect(await controller.submit(), isNull);
        expect(controller.values.errors, isNotEmpty);
        expect(calls, 0);
        controller.dispose();
      }
    },
  );

  test(
    'saving is immediate, fields lock and duplicate submits cannot run',
    () async {
      final create = Completer<ProgramMutationResult>();
      var calls = 0;
      final controller = _controller(
        create: (_, _) {
          calls++;
          return create.future;
        },
      );
      addTearDown(controller.dispose);
      final pending = controller.submit();
      expect(controller.saving, isTrue);
      expect(controller.fieldsLocked, isTrue);
      controller.edit(_draft.copyWith(title: 'Changed during save'));
      expect(controller.values.title, _draft.title);
      expect(await controller.submit(), isNull);
      await flushTestEventQueue();
      expect(calls, 1);
      create.complete(_receipt);
      expect(await pending, 'saved-id');
      expect(controller.confirmed, isTrue);
      expect(controller.confirmedRow!.programId, 'saved-id');
      expect(controller.saving, isFalse);
      expect(await controller.submit(), isNull);
      expect(calls, 1);
    },
  );

  test(
    'failed create preserves draft and retries the same command and key',
    () async {
      final commands = <(ProgramCreateValues, String)>[];
      final failure = StateError('network response lost');
      final controller = _controller(
        create: (values, key) async {
          commands.add((values, key));
          if (commands.length == 1) throw failure;
          return _receipt;
        },
      );
      addTearDown(controller.dispose);
      expect(await controller.submit(), isNull);
      expect(controller.error, same(failure));
      expect(controller.values, same(_draft));
      expect(controller.commandPending, isTrue);
      controller.edit(_draft.copyWith(title: 'Cannot replace pending command'));
      expect(await controller.submit(), 'saved-id');
      expect(commands[0].$1, same(commands[1].$1));
      expect(
        commands.map((command) => command.$2),
        everyElement('fixed-request-key'),
      );
    },
  );

  test('receipt confirmation retry never creates another program', () async {
    var creates = 0;
    var reads = 0;
    final controller = _controller(
      create: (_, _) async {
        creates++;
        return _receipt;
      },
      read: (_) async {
        reads++;
        if (reads == 1) throw StateError('read unavailable');
        return _saved();
      },
    );
    addTearDown(controller.dispose);
    expect(await controller.submit(), isNull);
    expect(controller.programId, 'saved-id');
    expect(controller.confirmed, isFalse);
    expect(await controller.submit(), 'saved-id');
    expect(creates, 1);
    expect(reads, 2);
  });

  test(
    'recovered receipt confirms exact saved identity without creating again',
    () async {
      var creates = 0;
      final cleared = <String>[];
      final controller = _controller(
        submittedValues: _draft,
        programId: 'saved-id',
        create: (_, _) async {
          creates++;
          return _receipt;
        },
        clearPersisted: (requestId) async => cleared.add(requestId),
      );
      addTearDown(controller.dispose);

      expect(controller.commandPending, isTrue);
      expect(await controller.submit(), 'saved-id');
      expect(creates, 0);
      expect(cleared, ['fixed-request-key']);
    },
  );

  test(
    'definitive rejection unlocks correction and rotates the request identity',
    () async {
      final snapshots = <ProgramCreateSnapshot>[];
      final commands = <String>[];
      var keys = 0;
      final controller = _controller(
        newRequestId: () => 'replacement-request-${++keys}',
        persist: (snapshot) async => snapshots.add(snapshot),
        create: (_, requestId) async {
          commands.add(requestId);
          if (commands.length == 1) {
            throw const ValidationException(
              'Choose a valid timezone.',
              code: 'invalid-argument',
            );
          }
          return _receipt;
        },
      );
      addTearDown(controller.dispose);

      expect(await controller.submit(), isNull);
      expect(controller.commandPending, isFalse);
      expect(controller.fieldsLocked, isFalse);
      expect(controller.requestId, 'replacement-request-1');
      expect(snapshots.last.submittedValues, isNull);

      controller.edit(_draft.copyWith(title: 'Corrected wedding weekend'));
      expect(await controller.submit(), 'saved-id');
      expect(commands, ['fixed-request-key', 'replacement-request-1']);
    },
  );

  test('command and receipt are durable before their network stages', () async {
    final order = <String>[];
    final controller = _controller(
      persist: (snapshot) async {
        order.add(snapshot.programId == null ? 'command' : 'receipt');
      },
      create: (_, _) async {
        order.add('create');
        return _receipt;
      },
      read: (_) async {
        order.add('read');
        return _saved();
      },
    );
    addTearDown(controller.dispose);

    expect(await controller.submit(), 'saved-id');
    expect(order, ['command', 'create', 'receipt', 'read']);
  });

  test(
    'list must contain saved identity; a matching name cannot fake success',
    () async {
      var reads = 0;
      var creates = 0;
      final controller = _controller(
        create: (_, _) async {
          creates++;
          return _receipt;
        },
        refresh: (id) async {
          expect(id, 'saved-id');
          reads++;
          return [
            _row(id: reads == 1 ? 'different-id-same-title' : 'saved-id'),
          ];
        },
      );
      addTearDown(controller.dispose);
      expect(await controller.submit(), isNull);
      expect(controller.error, isA<ProgramNotVisibleException>());
      expect(controller.confirmed, isFalse);
      expect(await controller.submit(), 'saved-id');
      expect(creates, 1);
    },
  );

  test(
    'detail confirmation cannot cross program or organizer identity',
    () async {
      for (final saved in [_saved(id: 'other'), _saved(org: 'other')]) {
        var refreshed = false;
        final controller = _controller(
          read: (_) async => saved,
          refresh: (_) async {
            refreshed = true;
            return [_row()];
          },
        );
        expect(await controller.submit(), isNull);
        expect(controller.error, isA<FormatException>());
        expect(controller.confirmed, isFalse);
        expect(refreshed, isFalse);
        controller.dispose();
      }
    },
  );

  test(
    'account or organizer changes during create cannot publish old scope',
    () async {
      final create = Completer<ProgramMutationResult>();
      var current = true;
      var read = false;
      var refreshed = false;
      final controller = _controller(
        create: (_, _) => create.future,
        isActorCurrent: () => current,
        read: (_) async {
          read = true;
          return _saved();
        },
        refresh: (_) async {
          refreshed = true;
          return [_row()];
        },
      );
      addTearDown(controller.dispose);
      final pending = controller.submit();
      current = false;
      controller.invalidateActor();
      create.complete(_receipt);
      expect(await pending, isNull);
      expect(controller.actorChanged, isTrue);
      expect(read, isFalse);
      expect(refreshed, isFalse);
      expect(controller.confirmed, isFalse);
    },
  );

  test(
    'disposed form ignores late completion and never refreshes another route',
    () async {
      final create = Completer<ProgramMutationResult>();
      var refreshed = false;
      final controller = _controller(
        create: (_, _) => create.future,
        refresh: (_) async {
          refreshed = true;
          return [_row()];
        },
      );
      final pending = controller.submit();
      controller.dispose();
      create.complete(_receipt);
      expect(await pending, isNull);
      expect(refreshed, isFalse);
    },
  );
}
