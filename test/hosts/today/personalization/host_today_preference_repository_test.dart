import 'package:catch_dating_app/contexts/insights/data/host_today_preference_repository.dart';
import 'package:catch_dating_app/contexts/insights/domain/host_today_preference.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  final scope = HostTodayPreferenceScope(
    accountId: 'account-1',
    organizerId: 'organizer-1',
  );

  late _MemoryPreferences preferences;
  LocalHostTodayPreferenceRepository createRepository() =>
      LocalHostTodayPreferenceRepository(preferences: () => preferences);

  setUp(() => preferences = _MemoryPreferences());

  test(
    'unconfigured, skipped and all three focus choices survive reload',
    () async {
      final repository = createRepository();
      expect(
        await repository.load(scope),
        const HostTodayPreference.unanswered(),
      );

      for (final preference in [
        const HostTodayPreference.skipped(),
        for (final focus in HostTodayFocus.values)
          HostTodayPreference.selected(focus),
        const HostTodayPreference.unanswered(),
      ]) {
        await repository.save(scope, preference);
        expect(await createRepository().load(scope), preference);
      }
    },
  );

  test(
    'changing focus replaces the choice for only that account and organizer',
    () async {
      final repository = createRepository();
      final otherAccount = HostTodayPreferenceScope(
        accountId: 'account-2',
        organizerId: scope.organizerId,
      );
      final otherOrganizer = HostTodayPreferenceScope(
        accountId: scope.accountId,
        organizerId: 'organizer-2',
      );
      await repository.save(
        scope,
        const HostTodayPreference.selected(HostTodayFocus.audience),
      );
      await repository.save(otherAccount, const HostTodayPreference.skipped());
      await repository.save(
        scope,
        const HostTodayPreference.selected(HostTodayFocus.organizerPresence),
      );

      expect(
        await repository.load(scope),
        const HostTodayPreference.selected(HostTodayFocus.organizerPresence),
      );
      expect(
        await repository.load(otherAccount),
        const HostTodayPreference.skipped(),
      );
      expect(
        await repository.load(otherOrganizer),
        const HostTodayPreference.unanswered(),
      );
    },
  );

  test('scope keys cannot collide through delimiters in identifiers', () async {
    final repository = createRepository();
    final left = HostTodayPreferenceScope(accountId: 'a_b', organizerId: 'c');
    final right = HostTodayPreferenceScope(accountId: 'a', organizerId: 'b_c');
    await repository.save(left, const HostTodayPreference.skipped());
    expect(
      await repository.load(right),
      const HostTodayPreference.unanswered(),
    );
  });

  test('scope equality supports stable provider-family identity', () {
    final same = HostTodayPreferenceScope(
      accountId: scope.accountId,
      organizerId: scope.organizerId,
    );
    expect(same, scope);
    expect(same.hashCode, scope.hashCode);
    expect(
      () => HostTodayPreferenceScope(accountId: ' ', organizerId: 'org'),
      throwsArgumentError,
    );
    expect(
      () => HostTodayPreferenceScope(accountId: 'account', organizerId: ''),
      throwsArgumentError,
    );
  });

  test(
    'unknown stored values surface a typed error without deleting them',
    () async {
      final repository = createRepository();
      await repository.save(scope, const HostTodayPreference.skipped());
      final key = preferences.values.keys.single;
      await preferences.setString(key, 'future_focus');

      await expectLater(repository.load(scope), throwsA(isA<AppException>()));
      expect(await preferences.getString(key), 'future_focus');
    },
  );

  test('local preference failures are normalized for the caller', () async {
    final repository = LocalHostTodayPreferenceRepository(
      preferences: () => throw StateError('Storage unavailable'),
    );
    await expectLater(repository.load(scope), throwsA(isA<AppException>()));
    await expectLater(
      repository.save(scope, const HostTodayPreference.skipped()),
      throwsA(isA<AppException>()),
    );
  });

  test('a rejected platform write is not reported as a saved choice', () async {
    final repository = createRepository();
    await repository.save(scope, const HostTodayPreference.skipped());
    preferences = _MemoryPreferences(
      values: preferences.values,
      failWrites: true,
    );
    await expectLater(
      repository.save(
        scope,
        const HostTodayPreference.selected(HostTodayFocus.audience),
      ),
      throwsA(isA<AppException>()),
    );
    expect(await repository.load(scope), const HostTodayPreference.skipped());
  });
}

class _MemoryPreferences implements SharedPreferencesAsync {
  _MemoryPreferences({Map<String, String>? values, this.failWrites = false})
    : values = values ?? {};

  final Map<String, String> values;
  final bool failWrites;

  @override
  Future<String?> getString(String key) async => values[key];

  @override
  Future<void> setString(String key, String value) async {
    if (failWrites) throw StateError('Platform write rejected');
    values[key] = value;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}
