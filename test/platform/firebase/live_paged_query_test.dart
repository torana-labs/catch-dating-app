import 'dart:async';

import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/firebase/live_paged_query.dart';
import 'package:catch_platform/firebase/live_pages.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../test_pump_helpers.dart';

const _context = BackendErrorContext(
  service: BackendService.firestore,
  action: 'watch test rows',
  resource: 'rows',
);

/// Rows `r10`, `r20`, ... ordered by `n`, so tests can slot rows between.
Future<FakeFirebaseFirestore> _rows(int count) async {
  final db = FakeFirebaseFirestore();
  for (var index = 1; index <= count; index++) {
    await db.collection('rows').doc('r${index * 10}').set({'n': index * 10});
  }
  return db;
}

LivePagedQuery<Map<String, dynamic>, String> _pager(
  FakeFirebaseFirestore db, {
  int pageSize = 2,
  int maxRows = 100,
}) => LivePagedQuery(
  query: db.collection('rows').orderBy('n'),
  pageSize: pageSize,
  maxRows: maxRows,
  convert: (doc) => doc.data()['bad'] == true
      ? throw const FormatException('Unsupported row.')
      : doc.id,
  errorContext: _context,
);

class _Watch {
  _Watch(LivePager<String> pager) {
    subscription = pager.pages.listen(
      (pages) => latest = pages,
      onError: (Object error) => failure = error,
    );
  }

  late final StreamSubscription<LivePages<String>> subscription;

  Future<void> cancel() => subscription.cancel();
  LivePages<String>? latest;
  Object? failure;
}

void main() {
  group('LivePagedQuery', () {
    test('opens one page, then appends the next on demand', () async {
      final db = await _rows(5);
      final pager = _pager(db);
      final watch = _Watch(pager);
      await flushTestEventQueue();

      expect(watch.latest!.items, ['r10', 'r20']);
      expect(watch.latest!.hasMore, isTrue);
      expect(pager.openPageCount, 1);

      pager.loadMore();
      await flushTestEventQueue();
      expect(watch.latest!.items, ['r10', 'r20', 'r30', 'r40']);
      expect(watch.latest!.hasMore, isTrue);
      expect(pager.openPageCount, 2);

      pager.loadMore();
      await flushTestEventQueue();
      expect(watch.latest!.items, ['r10', 'r20', 'r30', 'r40', 'r50']);
      expect(watch.latest!.hasMore, isFalse);
      expect(watch.latest!.loadingMore, isFalse);

      // Nothing follows: asking again opens no listener.
      pager.loadMore();
      await flushTestEventQueue();
      expect(pager.openPageCount, 3);
      await watch.cancel();
    });

    test('a list that fits one page has no more', () async {
      final db = await _rows(2);
      final watch = _Watch(_pager(db));
      await flushTestEventQueue();
      expect(watch.latest!.items, ['r10', 'r20']);
      expect(watch.latest!.hasMore, isFalse);
      await watch.cancel();
    });

    test('an exact page boundary leaves no empty page behind', () async {
      final db = await _rows(4);
      final pager = _pager(db);
      final watch = _Watch(pager);
      await flushTestEventQueue();
      pager.loadMore();
      await flushTestEventQueue();
      expect(watch.latest!.items, ['r10', 'r20', 'r30', 'r40']);
      expect(watch.latest!.hasMore, isFalse);
      await watch.cancel();
    });

    test('every page stays live: changes and removals show at once', () async {
      final db = await _rows(4);
      final pager = _pager(db);
      final watch = _Watch(pager);
      await flushTestEventQueue();
      pager.loadMore();
      await flushTestEventQueue();

      await db.collection('rows').doc('r30').delete();
      await flushTestEventQueue();
      expect(watch.latest!.items, ['r10', 'r20', 'r40']);

      await db.collection('rows').doc('r45').set({'n': 45});
      await flushTestEventQueue();
      expect(watch.latest!.items, ['r10', 'r20', 'r40', 'r45']);
      await watch.cancel();
    });

    test(
      'rows moving into an earlier page leave no gap or duplicate',
      () async {
        final db = await _rows(6);
        final pager = _pager(db);
        final watch = _Watch(pager);
        await flushTestEventQueue();
        pager.loadMore();
        await flushTestEventQueue();
        expect(watch.latest!.items, ['r10', 'r20', 'r30', 'r40']);

        // One row in: the first page still reaches its anchor.
        await db.collection('rows').doc('r5').set({'n': 5});
        await flushTestEventQueue();
        expect(watch.latest!.items, ['r5', 'r10', 'r20', 'r30', 'r40']);

        // A second pushes the anchor past the first page's limit; that page
        // listens to its exact range instead.
        await db.collection('rows').doc('r1').set({'n': 1});
        await flushTestEventQueue();
        expect(watch.latest!.items, ['r1', 'r5', 'r10', 'r20', 'r30', 'r40']);

        // A row moving from the second page into the first shows once.
        // The last page still shows a full page.
        await db.collection('rows').doc('r40').update({'n': 15});
        await flushTestEventQueue();
        expect(watch.latest!.items, [
          'r1',
          'r5',
          'r10',
          'r40',
          'r20',
          'r30',
          'r50',
        ]);
        expect(watch.latest!.hasMore, isTrue);

        pager.loadMore();
        await flushTestEventQueue();
        expect(watch.latest!.items, [
          'r1',
          'r5',
          'r10',
          'r40',
          'r20',
          'r30',
          'r50',
          'r60',
        ]);
        expect(watch.latest!.hasMore, isFalse);
        await watch.cancel();
      },
    );

    test('a failed later page keeps the rows above it and retries', () async {
      final db = await _rows(5);
      await db.collection('rows').doc('r30').update({'bad': true});
      final pager = _pager(db);
      final watch = _Watch(pager);
      await flushTestEventQueue();
      pager.loadMore();
      await flushTestEventQueue();

      expect(watch.failure, isNull);
      expect(watch.latest!.items, ['r10', 'r20']);
      expect(watch.latest!.nextPageError, isFormatException);
      expect(watch.latest!.hasMore, isTrue);
      expect(watch.latest!.loadingMore, isFalse);

      // Asking again retries the failed page, not the next one.
      pager.loadMore();
      await flushTestEventQueue();
      expect(pager.openPageCount, 2);
      expect(watch.latest!.items, ['r10', 'r20']);
      expect(watch.latest!.nextPageError, isFormatException);

      // The page's listener recovers as soon as the row reads again.
      await db.collection('rows').doc('r30').update({'bad': false});
      await flushTestEventQueue();
      expect(watch.latest!.items, ['r10', 'r20', 'r30', 'r40']);
      expect(watch.latest!.nextPageError, isNull);
      expect(watch.latest!.hasMore, isTrue);
      await watch.cancel();
    });

    test('a failed first page fails the list', () async {
      final db = await _rows(3);
      await db.collection('rows').doc('r10').update({'bad': true});
      final watch = _Watch(_pager(db));
      await flushTestEventQueue();
      expect(watch.latest, isNull);
      expect(watch.failure, isFormatException);
      await watch.cancel();
    });

    test('the row cap ends the list', () async {
      final db = await _rows(6);
      final pager = _pager(db, maxRows: 4);
      final watch = _Watch(pager);
      await flushTestEventQueue();
      pager.loadMore();
      await flushTestEventQueue();
      expect(watch.latest!.items, hasLength(4));
      expect(watch.latest!.hasMore, isFalse);
      pager.loadMore();
      await flushTestEventQueue();
      expect(pager.openPageCount, 2);
      await watch.cancel();
    });

    test('opens after its precondition, and fails with it', () async {
      final db = await _rows(1);
      final failing = LivePagedQuery<Map<String, dynamic>, String>(
        query: db.collection('rows').orderBy('n'),
        pageSize: 2,
        maxRows: 10,
        convert: (doc) => doc.id,
        errorContext: _context,
        beforeOpen: () async => throw StateError('Not ready.'),
      );
      final watch = _Watch(failing);
      await flushTestEventQueue();
      expect(watch.failure, isStateError);
      expect(failing.openPageCount, 1);
      await watch.cancel();
      expect(failing.openPageCount, 0);
    });
  });

  test('a mapped pager converts rows and forwards loadMore', () async {
    final db = await _rows(3);
    final pager = _pager(db);
    final mapped = pager.map((id) => id.toUpperCase());
    final pages = <LivePages<String>>[];
    final subscription = mapped.pages.listen(pages.add);
    await flushTestEventQueue();
    mapped.loadMore();
    await flushTestEventQueue();
    expect(pages.last.items, ['R10', 'R20', 'R30']);
    await subscription.cancel();
  });
}
