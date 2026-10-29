import 'dart:async';

import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/explore/presentation/explore_view_model.dart';
import 'package:catch_dating_app/kernel/city_catalog.dart';
import 'package:catch_dating_app/platform/cities/city_repository.dart';
import 'package:catch_dating_app/platform/device/device_location.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'explore_city_controller.g.dart';

/// Owns Explore city auto-selection policy.
///
/// Profile city is authoritative. Device location is only a fallback when the
/// profile city is absent or unsupported, and neither path overrides a manual
/// city pick because [SelectedExploreCity.autoSelectCity] preserves that guard.
@riverpod
class ExploreCityController extends _$ExploreCityController {
  @override
  void build() {
    ref.listen(deviceLocationProvider, (_, next) {
      next.whenData((_) => _scheduleAutoSelectCity());
    });
    ref.listen(watchUserProfileProvider, (_, next) {
      next.whenData((_) => _scheduleAutoSelectCity());
    });
    _scheduleAutoSelectCity();
  }

  void _scheduleAutoSelectCity() {
    unawaited(
      Future<void>.microtask(() async {
        if (!ref.mounted) return;
        await autoSelectCity();
      }),
    );
  }

  Future<void> autoSelectCity() async {
    final profileCityName = ref
        .read(watchUserProfileProvider)
        .asData
        ?.value
        ?.city;
    final profileCity = cityOptionByName(profileCityName)?.toCityData();
    if (profileCity != null) {
      ref
          .read(selectedExploreCityProvider.notifier)
          .autoSelectCity(profileCity);
      return;
    }

    final location = ref.read(deviceLocationProvider).asData?.value;
    if (location == null) return;

    final nearest = await ref
        .read(cityRepositoryProvider)
        .nearestCity(location.latitude, location.longitude);
    if (nearest == null) return;
    ref.read(selectedExploreCityProvider.notifier).autoSelectCity(nearest);
  }
}
