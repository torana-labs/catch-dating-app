import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/explore/presentation/explore_city_controller.dart';
import 'package:catch_dating_app/explore/presentation/explore_view_model.dart';
import 'package:catch_dating_app/kernel/city_data.dart';
import 'package:catch_dating_app/kernel/location_coordinate.dart';
import 'package:catch_dating_app/platform/cities/city_repository.dart';
import 'package:catch_dating_app/platform/device/device_location.dart';
import 'package:catch_dating_app/platform/errors/error_logger.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart' as event_test;

const _mumbai = CityData(
  name: 'mumbai',
  marketId: 'in-mh-mumbai',
  cityId: 'in-mh-mumbai',
  slug: 'mumbai',
  label: 'Mumbai',
  latitude: 19.0760,
  longitude: 72.8777,
  profileSelectable: true,
  exploreVisible: true,
);

const _delhi = CityData(
  name: 'delhi',
  marketId: 'in-dl-delhi',
  cityId: 'in-dl-delhi',
  slug: 'delhi',
  label: 'Delhi',
  latitude: 28.7041,
  longitude: 77.1025,
  profileSelectable: true,
  exploreVisible: true,
);

void main() {
  test('autoSelectCity uses profile city before device location', () async {
    final container = await _container(
      profileCity: 'Delhi',
      location: const LocationCoordinate(19.08, 72.88),
    );
    addTearDown(container.dispose);

    await container
        .read(exploreCityControllerProvider.notifier)
        .autoSelectCity();

    expect(
      container.read(selectedExploreCityProvider).label,
      contains('Delhi'),
    );
  });

  test('autoSelectCity falls back to nearest device city', () async {
    final container = await _container(
      location: const LocationCoordinate(28.70, 77.10),
    );
    addTearDown(container.dispose);

    await container
        .read(exploreCityControllerProvider.notifier)
        .autoSelectCity();

    expect(container.read(selectedExploreCityProvider).label, _delhi.label);
  });

  test(
    'autoSelectCity leaves default city when no location is available',
    () async {
      final container = await _container();
      addTearDown(container.dispose);

      await container
          .read(exploreCityControllerProvider.notifier)
          .autoSelectCity();

      expect(container.read(selectedExploreCityProvider).label, _mumbai.label);
    },
  );

  test(
    'watching the controller auto-selects when profile data arrives',
    () async {
      final profileStream = StreamController<UserProfile?>();
      final firestore = FakeFirebaseFirestore();
      await firestore.doc('config/cities').set({
        'cities': [_mumbai.toJson(), _delhi.toJson()],
      });
      final container = ProviderContainer(
        overrides: [
          uidProvider.overrideWith((ref) => Stream.value('runner-1')),
          watchUserProfileProvider.overrideWith((ref) => profileStream.stream),
          cityRepositoryProvider.overrideWithValue(
            CityRepository(firestore, ErrorLogger(shouldReportErrors: false)),
          ),
          deviceLocationProvider.overrideWith(() => _FakeDeviceLocation(null)),
        ],
      );
      addTearDown(() async {
        container.dispose();
        await profileStream.close();
      });

      container.listen(exploreCityControllerProvider, (_, _) {});
      profileStream.add(event_test.buildUser().copyWith(city: 'Delhi'));
      await container.pump();
      await container.pump();

      expect(
        container.read(selectedExploreCityProvider).label,
        contains('Delhi'),
      );
    },
  );
}

Future<ProviderContainer> _container({
  String? profileCity,
  LocationCoordinate? location,
}) async {
  final firestore = FakeFirebaseFirestore();
  await firestore.doc('config/cities').set({
    'cities': [_mumbai.toJson(), _delhi.toJson()],
  });
  final user = event_test.buildUser().copyWith(city: profileCity);
  final container = ProviderContainer(
    overrides: [
      uidProvider.overrideWith((ref) => Stream.value('runner-1')),
      watchUserProfileProvider.overrideWith(
        (ref) => Stream.value(profileCity == null ? null : user),
      ),
      cityRepositoryProvider.overrideWithValue(
        CityRepository(firestore, ErrorLogger(shouldReportErrors: false)),
      ),
      deviceLocationProvider.overrideWith(() => _FakeDeviceLocation(location)),
    ],
  );
  container.listen(watchUserProfileProvider, (_, _) {}, fireImmediately: true);
  container.listen(deviceLocationProvider, (_, _) {}, fireImmediately: true);
  await container.pump();
  await container.pump();
  return container;
}

class _FakeDeviceLocation extends DeviceLocation {
  _FakeDeviceLocation(this.location);

  final LocationCoordinate? location;

  @override
  Future<LocationCoordinate?> build() async => location;
}
