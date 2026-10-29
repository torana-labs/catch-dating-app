import 'package:catch_dating_app/contexts/programmes/data/program_read_snapshots.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  SharedPreferencesProgramReadSnapshotStore store() =>
      SharedPreferencesProgramReadSnapshotStore();

  group('SharedPreferencesProgramReadSnapshotStore', () {
    test('saves and loads a snapshot with its timestamp', () async {
      SharedPreferences.setMockInitialValues({});
      final before = DateTime.now();
      final cache = store();

      await cache.save('acct_1', 'arrivals:p1:t3', {
        'rows': [
          {'legId': 'leg_1'},
        ],
      });

      final snapshot = await cache.load('acct_1', 'arrivals:p1:t3');
      expect(snapshot, isNotNull);
      expect(snapshot!.data, {
        'rows': [
          {'legId': 'leg_1'},
        ],
      });
      expect(
        snapshot.savedAt.isBefore(before.subtract(const Duration(seconds: 1))),
        isFalse,
      );
    });

    test('isolates snapshots by account', () async {
      SharedPreferences.setMockInitialValues({});
      final cache = store();

      await cache.save('acct_1', 'arrivals:p1:t3', {'rows': []});

      expect(await cache.load('acct_2', 'arrivals:p1:t3'), isNull);
      expect(await cache.load('acct_1', 'arrivals:p1:t3'), isNotNull);
    });

    test('isolates snapshots by scope within an account', () async {
      SharedPreferences.setMockInitialValues({});
      final cache = store();

      await cache.save('acct_1', 'arrivals:p1:t3', {'rows': 'terminal3'});
      await cache.save('acct_1', 'arrivals:p1:t4', {'rows': 'terminal4'});

      expect(
        (await cache.load('acct_1', 'arrivals:p1:t3'))!.data,
        {'rows': 'terminal3'},
      );
      expect(
        (await cache.load('acct_1', 'arrivals:p1:t4'))!.data,
        {'rows': 'terminal4'},
      );
      expect(await cache.load('acct_1', 'arrivals:p2:t3'), isNull);
    });

    test('returns null for corrupted stored json', () async {
      SharedPreferences.setMockInitialValues({
        'program_read_snapshots_v2_acct_1': 'not-json{{{',
      });
      expect(await store().load('acct_1', 'arrivals:p1:t3'), isNull);
    });

    test('returns null for malformed entries', () async {
      SharedPreferences.setMockInitialValues({
        'program_read_snapshots_v2_acct_1':
            '{"arrivals:p1:t3":{"data":{"rows":[]}}}',
      });
      final cache = store();
      expect(await cache.load('acct_1', 'arrivals:p1:t3'), isNull);
    });

    test('latest save replaces the prior snapshot', () async {
      SharedPreferences.setMockInitialValues({});
      final cache = store();

      await cache.save('acct_1', 'plan:p1', {'version': 1});
      await cache.save('acct_1', 'plan:p1', {'version': 2});

      expect(
        (await cache.load('acct_1', 'plan:p1'))!.data,
        {'version': 2},
      );
    });

    test('null payload is never persisted', () async {
      SharedPreferences.setMockInitialValues({});
      final cache = store();

      await cache.save('acct_1', 'plan:p1', null);

      expect(await cache.load('acct_1', 'plan:p1'), isNull);
    });
  });

  group('programSnapshotScope', () {
    test('builds station-scoped and program-scoped keys', () {
      expect(
        programSnapshotScope('arrivals', 'p1', 't3'),
        'arrivals:p1:t3',
      );
      expect(programSnapshotScope('plan', 'p1'), 'plan:p1');
      expect(
        programSnapshotScope('arrivals', 'p1', 't3') ==
            programSnapshotScope('plan', 'p1', 't3'),
        isFalse,
      );
    });
  });
}
