import 'dart:async';

import 'package:catch_dating_app/contexts/profiles/data/profile_location_initializer.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/kernel/city_data.dart';
import 'package:catch_dating_app/kernel/location_coordinate.dart';
import 'package:catch_dating_app/platform/cities/city_repository.dart';
import 'package:catch_dating_app/platform/device/device_location.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/profile_readiness_fixtures.dart';

void main() {
  test(
    'persists passive location from the user-profile feature boundary',
    () async {
      final profile = buildSocialReadyUser().copyWith(
        latitude: null,
        longitude: null,
        city: null,
      );
      final profileRepository = _LocationProfileRepository();
      final cityRepository = _NearestCityRepository();
      final container = ProviderContainer(
        overrides: [
          watchUserProfileProvider.overrideWith((ref) => Stream.value(profile)),
          deviceLocationProvider.overrideWith(_FixedDeviceLocation.new),
          cityRepositoryProvider.overrideWithValue(cityRepository),
          userProfileRepositoryProvider.overrideWithValue(profileRepository),
        ],
      );
      addTearDown(container.dispose);

      final subscription = container.listen(
        profileLocationInitializerProvider,
        (_, _) {},
        fireImmediately: true,
      );
      addTearDown(subscription.close);
      await container.read(watchUserProfileProvider.future);
      await container.read(deviceLocationProvider.future);
      await container.pump();
      await profileRepository.updated.future.timeout(
        const Duration(seconds: 1),
      );

      expect(profileRepository.uid, profile.uid);
      expect(profileRepository.latitude, 22.72);
      expect(profileRepository.longitude, 75.86);
      expect(profileRepository.city, 'indore');
      expect(cityRepository.lookupCount, 1);
    },
  );
}

class _FixedDeviceLocation extends DeviceLocation {
  @override
  Future<LocationCoordinate?> build() async =>
      const LocationCoordinate(22.72, 75.86);
}

class _NearestCityRepository extends Fake implements CityRepository {
  int lookupCount = 0;

  @override
  Future<CityData?> nearestCity(double lat, double lng) async {
    lookupCount += 1;
    return const CityData(
      name: 'indore',
      label: 'Indore',
      latitude: 22.72,
      longitude: 75.86,
    );
  }
}

class _LocationProfileRepository extends Fake implements UserProfileRepository {
  final updated = Completer<void>();
  String? uid;
  double? latitude;
  double? longitude;
  String? city;

  @override
  Future<void> updateDetectedLocation({
    required String uid,
    required double latitude,
    required double longitude,
    String? city,
  }) async {
    this.uid = uid;
    this.latitude = latitude;
    this.longitude = longitude;
    this.city = city;
    updated.complete();
  }
}
