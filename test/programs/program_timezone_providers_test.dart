import 'dart:convert';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_repository.dart';
import 'package:catch_dating_app/contexts/events/data/manager_event_setup_preferences.dart';
import 'package:catch_dating_app/contexts/insights/data/host_analytics_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_create_journal.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_inventory_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_setup_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_timezone.dart';
import 'package:catch_dating_app/programs/presentation/program_events_controller.dart';
import 'package:catch_dating_app/programs/presentation/program_timezone_providers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../organizers/organizers_test_helpers.dart';

const scope = (accountId: 'account', organizerId: 'organizer');

ManagerEventSetupDefaults defaults({String? timezone}) =>
    ManagerEventSetupDefaults(
      organizerId: scope.organizerId,
      cityId: 'in-dl-delhi',
      marketId: 'in-dl-delhi',
      timezone: timezone,
      organizerDefaultsRevision: 1,
      basicsReviewedHash: '',
      preferencesRevision: 1,
      preferences: ManagerEventSetupPreferences(timezone: timezone),
      preferencesHash: '',
      reviewedDefaultsHash: '',
    );

class _Inventory extends Fake implements ProgramInventoryRepository {}

class _Setup extends Fake implements ProgramSetupRepository {}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  Future<ProgramTimezoneSuggestion> load({
    String city = 'delhi',
    String? timezone,
    Object? failure,
    String? device = 'America/New_York',
  }) async {
    final container = ProviderContainer(
      overrides: [
        hostOperableOrganizersProvider('account').overrideWithValue(
          AsyncData<List<Organizer>>([
            buildOrganizer(id: 'organizer').copyWith(
              location: city,
              locationCityId: '',
              locationMarketId: '',
            ),
          ]),
        ),
        programTimezoneDefaultsProvider(scope.organizerId).overrideWith((
          ref,
        ) async {
          if (failure != null) throw failure;
          return defaults(timezone: timezone);
        }),
        hostAnalyticsDeviceTimezoneProvider.overrideWith((ref) async => device),
      ],
    );
    addTearDown(container.dispose);
    return container.read(programTimezoneSuggestionProvider(scope).future);
  }

  test(
    'private organizer setting takes precedence over city and device',
    () async {
      final result = await load(timezone: 'Europe/London');
      expect(result.value.identifier, 'Europe/London');
      expect(result.value.source, ProgramTimezoneSource.organizer);
      expect(result.defaultsError, isNull);
    },
  );

  test(
    'city fallback remains explicit when private settings cannot be read',
    () async {
      final failure = StateError('Synthetic defaults read failure');
      final result = await load(failure: failure);
      expect(result.value.identifier, 'Asia/Kolkata');
      expect(result.value.source, ProgramTimezoneSource.city);
      expect(result.defaultsError, same(failure));
    },
  );

  test(
    'unknown city falls back to the device, not an invented organizer zone',
    () async {
      final result = await load(
        city: 'unknown-city',
        failure: StateError('Unavailable'),
      );
      expect(result.value.identifier, 'America/New_York');
      expect(result.value.source, ProgramTimezoneSource.device);
    },
  );

  test('unavailable device leaves an explicit manual selection', () async {
    final result = await load(
      city: 'unknown-city',
      failure: StateError('Unavailable'),
      device: null,
    );
    expect(result.value.identifier, isEmpty);
    expect(result.value.source, ProgramTimezoneSource.manual);
  });
  for (final restored in [false, true]) {
    for (final pending in [false, true]) {
      if (!restored && pending) continue;
      test(
        'fresh default or exact recovered timezone restored=$restored pending=$pending',
        () async {
          const recoveredValues = ProgramCreateJournalValues(
            title: 'Saved draft',
            kind: 'wedding',
            timezone: 'Europe/London',
            startsAtMillis: 1791158400000,
            endsAtMillis: 1791417600000,
          );
          SharedPreferences.setMockInitialValues({
            if (restored)
              'program_create_account_organizer': jsonEncode(
                ProgramCreateJournalEntry(
                  accountId: scope.accountId,
                  organizerId: scope.organizerId,
                  requestId: 'restored-timezone-key',
                  values: recoveredValues,
                  submittedValues: pending ? recoveredValues : null,
                ).toJson(),
              ),
          });
          var suggestionReads = 0;
          var suggested = 'Asia/Kolkata';
          final container = ProviderContainer(
            overrides: [
              uidProvider.overrideWithValue(const AsyncData('account')),
              programInventoryRepositoryProvider.overrideWithValue(
                _Inventory(),
              ),
              programSetupRepositoryProvider.overrideWithValue(_Setup()),
              programTimezoneSuggestionProvider(scope).overrideWith((
                ref,
              ) async {
                suggestionReads++;
                return ProgramTimezoneSuggestion(
                  ProgramTimezoneDefault(
                    suggested,
                    ProgramTimezoneSource.organizer,
                  ),
                );
              }),
            ],
          );
          addTearDown(container.dispose);
          final provider = programCreateControllerProvider(scope);
          container.listen(provider, (_, _) {});
          final controller = await container.read(provider.future);
          expect(
            controller.values.timezone,
            restored ? 'Europe/London' : 'Asia/Kolkata',
          );
          expect(suggestionReads, restored ? 0 : 1);
          expect(controller.fieldsLocked, pending);
          if (restored) expect(controller.requestId, 'restored-timezone-key');
          if (!restored) {
            controller.edit(
              controller.values.copyWith(title: 'In-progress draft'),
            );
            suggested = 'America/New_York';
            container.invalidate(programTimezoneSuggestionProvider(scope));
            await container.read(
              programTimezoneSuggestionProvider(scope).future,
            );
            expect(await container.read(provider.future), same(controller));
            expect(controller.values.title, 'In-progress draft');
            expect(controller.values.timezone, 'Asia/Kolkata');
          }
        },
      );
    }
  }
}
