import 'dart:async';

import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/programs/presentation/program_events_controller.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';

OrganizerProgramListRow row(String id) => OrganizerProgramListRow(
  programId: id,
  title: 'Same title',
  kind: 'wedding',
  status: 'draft',
  timezone: 'UTC',
  revision: 1,
  startsAt: DateTime.utc(2026),
  endsAt: DateTime.utc(2026, 1, 2),
  functionCount: 0,
);
OrganizerProgramListRow historyRow(String id) => OrganizerProgramListRow(
  programId: id,
  title: 'Past program',
  kind: 'wedding',
  status: 'completed',
  timezone: 'UTC',
  revision: 1,
  startsAt: DateTime.utc(2025),
  endsAt: DateTime.utc(2025, 1, 2),
  functionCount: 0,
);
OrganizerProgramInventoryPage page(List<String> ids, [String? cursor]) =>
    OrganizerProgramInventoryPage(
      programs: ids.map(row).toList(),
      nextCursor: cursor,
    );
ProgramEventsController controller(
  ProgramInventoryRead read, {
  String? anchorId,
  OrganizerProgramListRow? initialRow,
  bool Function()? current,
}) => ProgramEventsController(
  fetchPage: read,
  anchorId: anchorId,
  initialRow: initialRow,
  isActorCurrent: current ?? () => true,
  mutate: (_, _) async => const ProgramMutationResult(
    entityId: 'x',
    revision: 2,
    alreadyApplied: false,
  ),
  onMutation: (_) {},
);

void main() {
  test(
    'confirmed row is immediately visible and survives partial-read outage',
    () async {
      final anchor = row('saved');
      var failAnchor = true;
      final c = controller(
        ({cursor, programId}) async {
          if (programId != null) {
            if (failAnchor) throw StateError('temporarily offline');
            return page(['saved']);
          }
          return cursor == null ? page(['recent'], 'recent') : page(['older']);
        },
        anchorId: 'saved',
        initialRow: anchor,
      );
      addTearDown(c.dispose);
      expect(c.state.value!.single, same(anchor));
      await c.refresh();
      expect(c.state.value!.map((r) => r.programId), ['saved', 'recent']);
      expect(c.state.hasStaleError, isTrue);
      await c.loadMore();
      expect(c.state.value!.map((r) => r.programId), [
        'saved',
        'recent',
        'older',
      ]);
      expect(c.state.hasStaleError, isTrue);
      failAnchor = false;
      await c.refresh();
      expect(c.state.error, isNull);
      expect(c.state.value!.first.programId, 'saved');
    },
  );

  test(
    'failed same-scope refresh retains known rows and exposes retry',
    () async {
      var fail = false;
      final c = controller(({cursor, programId}) async {
        if (fail) throw StateError('offline');
        return page(['a', 'b'], 'b');
      });
      addTearDown(c.dispose);
      await c.refresh();
      fail = true;
      await c.refresh();
      expect(c.state.value!.map((r) => r.programId), ['a', 'b']);
      expect(c.state.hasStaleError, isTrue);
      expect(c.hasMore, isTrue);
    },
  );

  test(
    'missing saved ID error remains until the exact ID is recovered',
    () async {
      final c = controller(({cursor, programId}) async {
        if (programId != null) throw StateError('anchor unavailable');
        if (cursor == null) return page(['a'], 'a');
        if (cursor == 'a') return page(['b'], 'b');
        return page(['saved']);
      }, anchorId: 'saved');
      addTearDown(c.dispose);
      await c.refresh();
      await c.loadMore();
      expect(c.state.hasStaleError, isTrue);
      expect(c.state.value!.any((r) => r.programId == 'saved'), isFalse);
      await c.loadMore();
      expect(c.state.error, isNull);
      expect(c.state.value!.any((r) => r.programId == 'saved'), isTrue);
    },
  );

  test('not-found and authority rejection remove a retained anchor', () async {
    for (final code in ['not-found', 'permission-denied', 'unauthenticated']) {
      final c = controller(
        ({cursor, programId}) async {
          if (programId != null) {
            throw FirebaseFunctionsException(
              code: code,
              message: 'domain rejection',
            );
          }
          return page(['recent']);
        },
        anchorId: 'saved',
        initialRow: row('saved'),
      );
      await c.refresh();
      expect(c.state.value!.map((r) => r.programId), ['recent']);
      expect(c.state.hasStaleError, isTrue);
      c.dispose();
    }
  });

  test(
    'earlier-start exact anchor is visible after two bounded reads, with real paging',
    () async {
      final calls = <({String? cursor, String? programId})>[];
      final c = controller(({cursor, programId}) async {
        calls.add((cursor: cursor, programId: programId));
        if (programId != null) return page(['earlier']);
        if (cursor == null) return page(['recent-a', 'recent-b'], 'recent-b');
        return page(['older', 'earlier']);
      }, anchorId: 'earlier');
      addTearDown(c.dispose);
      await c.refresh();
      expect(calls, [
        (cursor: null, programId: null),
        (cursor: null, programId: 'earlier'),
      ]);
      expect(c.state.value!.map((r) => r.programId), [
        'earlier',
        'recent-a',
        'recent-b',
      ]);
      expect(c.hasMore, isTrue);
      await c.loadMore();
      expect(calls.last, (cursor: 'recent-b', programId: null));
      expect(c.state.value!.map((r) => r.programId), [
        'earlier',
        'recent-a',
        'recent-b',
        'older',
      ]);
      expect(c.state.value!.map((r) => r.title), everyElement('Same title'));
      expect(c.hasMore, isFalse);
      await c.loadMore();
      expect(calls.length, 3);
      await c.refresh();
      expect(c.state.value!.first.programId, 'earlier');
      expect(calls.length, 5);
    },
  );

  test('anchor already in first page needs no extra request', () async {
    var reads = 0;
    final c = controller(({cursor, programId}) async {
      reads++;
      return page(['recent', 'saved']);
    }, anchorId: 'saved');
    addTearDown(c.dispose);
    await c.refresh();
    expect(reads, 1);
    expect(c.state.value!.first.programId, 'saved');
  });

  test(
    'page failure retains rows and exact cursor for retry; duplicate clicks are ignored',
    () async {
      final pending = Completer<OrganizerProgramInventoryPage>();
      var reads = 0;
      final c = controller(({cursor, programId}) {
        reads++;
        return cursor == null ? Future.value(page(['a'], 'a')) : pending.future;
      });
      addTearDown(c.dispose);
      await c.refresh();
      final loading = c.loadMore();
      expect(c.loadingMore, isTrue);
      await c.loadMore();
      expect(reads, 2);
      final error = StateError('temporarily offline');
      pending.completeError(error);
      await loading;
      expect(c.state.value!.single.programId, 'a');
      expect(c.loadMoreError, same(error));
      expect(c.hasMore, isTrue);
      expect(c.loadingMore, isFalse);
    },
  );

  test('repeated cursor cannot loop or discard existing rows', () async {
    final c = controller(
      ({cursor, programId}) async =>
          cursor == null ? page(['a'], 'a') : page(['b'], 'a'),
    );
    addTearDown(c.dispose);
    await c.refresh();
    await c.loadMore();
    expect(c.loadMoreError, isA<FormatException>());
    expect(c.state.value!.single.programId, 'a');
  });

  test(
    'tab-aware continuation skips hidden pages until a matching row',
    () async {
      final calls = <String?>[];
      final c = controller(({cursor, programId}) async {
        calls.add(cursor);
        return switch (cursor) {
          null => page(['upcoming-a'], 'cursor-a'),
          'cursor-a' => page(['upcoming-b'], 'cursor-b'),
          _ => OrganizerProgramInventoryPage(programs: [historyRow('past-a')]),
        };
      });
      addTearDown(c.dispose);
      await c.refresh();
      await c.loadMoreMatching((program) => program.status == 'completed');
      expect(calls, [null, 'cursor-a', 'cursor-b']);
      expect(c.state.value!.map((program) => program.programId), [
        'upcoming-a',
        'upcoming-b',
        'past-a',
      ]);
      expect(c.hasMore, isFalse);
    },
  );

  test('tab-aware continuation remains bounded for sparse results', () async {
    var continuationReads = 0;
    final c = controller(({cursor, programId}) async {
      if (cursor == null) return page(['initial'], 'cursor-0');
      continuationReads++;
      return page(['upcoming-$continuationReads'], 'cursor-$continuationReads');
    });
    addTearDown(c.dispose);
    await c.refresh();
    await c.loadMoreMatching((program) => program.status == 'completed');
    expect(continuationReads, programEventsMatchingPageReadLimit);
    expect(c.hasMore, isTrue);
    expect(c.state.value, hasLength(programEventsMatchingPageReadLimit + 1));
  });

  test(
    'account or organizer interruption clears rows and ignores late page/anchor completion',
    () async {
      for (final stage in ['first', 'anchor', 'more']) {
        var current = true;
        final pending = Completer<OrganizerProgramInventoryPage>();
        final c = controller(
          ({cursor, programId}) {
            if (stage == 'first' || programId != null || cursor != null) {
              return pending.future;
            }
            return Future.value(page(['a'], 'a'));
          },
          anchorId: stage == 'anchor' ? 'saved' : null,
          current: () => current,
        );
        Future<void> loading;
        if (stage == 'more') {
          await c.refresh();
          loading = c.loadMore();
        } else {
          loading = c.refresh();
          await flushTestEventQueue();
        }
        current = false;
        c.invalidateActor();
        pending.complete(page(['foreign-or-old']));
        await loading;
        expect(c.state.value, isNull);
        expect(c.state.error, isA<ProgramActorChangedException>());
        expect(c.hasMore, isFalse);
        c.dispose();
      }
    },
  );

  test(
    'exact anchor must match its ID and does not turn first-page failure into success',
    () async {
      final c = controller(({cursor, programId}) async {
        if (programId == null) throw StateError('page unavailable');
        return page(['saved']);
      }, anchorId: 'saved');
      addTearDown(c.dispose);
      await c.refresh();
      expect(c.state.value!.single.programId, 'saved');
      expect(c.state.hasStaleError, isTrue);
      final wrong = controller(
        ({cursor, programId}) async =>
            programId == null ? page([]) : page(['same-name-wrong-id']),
        anchorId: 'saved',
      );
      addTearDown(wrong.dispose);
      await wrong.refresh();
      expect(wrong.state.hasError, isTrue);
      expect(wrong.state.value, isNull);
    },
  );
}
