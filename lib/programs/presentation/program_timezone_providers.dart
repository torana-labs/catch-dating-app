import 'dart:async';

import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_repository.dart';
import 'package:catch_dating_app/contexts/insights/data/host_analytics_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/clubs_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_timezone.dart';
import 'package:catch_dating_app/core/city_catalog.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'program_timezone_providers.g.dart';

typedef ProgramTimezoneScope = ({String accountId, String organizerId});

class ProgramTimezoneSuggestion {
  const ProgramTimezoneSuggestion(this.value, {this.defaultsError});

  final ProgramTimezoneDefault value;
  final Object? defaultsError;
}

@riverpod
Future<ManagerEventSetupDefaults> programTimezoneDefaults(
  Ref ref,
  String organizerId,
) => ManagerEventSetupDefaultsRepository(
  ref.watch(firebaseFunctionsProvider),
).get(organizerId);

/// Resolves suggestions once per account/organizer scope. A failed private
/// defaults read remains explicit even when a city/device suggestion is usable.
@riverpod
Future<ProgramTimezoneSuggestion> programTimezoneSuggestion(
  Ref ref,
  ProgramTimezoneScope scope,
) async {
  final loadedClubs = Completer<List<Club>>();
  ref.listen(hostOperableClubsProvider(scope.accountId), (_, next) {
    if (loadedClubs.isCompleted) return;
    next.when(
      data: loadedClubs.complete,
      error: loadedClubs.completeError,
      loading: () {},
    );
  }, fireImmediately: true);
  ref.onDispose(() {
    if (!loadedClubs.isCompleted) {
      loadedClubs.completeError(StateError('Timezone scope disposed'));
    }
  });
  final clubs = await loadedClubs.future;
  final organizer = clubs
      .where((club) => club.id == scope.organizerId)
      .firstOrNull;
  if (organizer == null) {
    throw const FormatException('Program organizer unavailable');
  }
  ManagerEventSetupDefaults? defaults;
  Object? defaultsError;
  try {
    defaults = await ref.watch(
      programTimezoneDefaultsProvider(scope.organizerId).future,
    );
  } catch (error) {
    defaultsError = error;
  }
  if (!ref.mounted) {
    throw const FormatException('Program timezone scope disposed');
  }
  final city =
      cityOptionByName(defaults?.cityId) ??
      cityOptionByName(organizer.locationCityId) ??
      cityOptionByName(organizer.locationMarketId) ??
      cityOptionByName(organizer.location);
  var value = resolveProgramTimezoneDefault(
    organizerTimezone: defaults?.timezone,
    cityTimezone: city?.timeZone,
  );
  if (value.source == ProgramTimezoneSource.manual) {
    value = resolveProgramTimezoneDefault(
      deviceTimezone: await ref.watch(
        hostAnalyticsDeviceTimezoneProvider.future,
      ),
    );
  }
  return ProgramTimezoneSuggestion(value, defaultsError: defaultsError);
}
