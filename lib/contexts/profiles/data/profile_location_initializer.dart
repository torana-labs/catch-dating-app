import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/platform/cities/city_repository.dart';
import 'package:catch_dating_app/platform/device/device_location.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'profile_location_initializer.g.dart';

// keepalive: profile location initialization should run once per app session,
// not once per route rebuild.
@Riverpod(keepAlive: true)
class ProfileLocationInitializer extends _$ProfileLocationInitializer {
  bool _collected = false;

  @override
  Future<void> build() async {
    // Watch so initialization resumes when the profile or passive device
    // location stream produces its first usable value.
    final userProfile = ref.watch(watchUserProfileProvider).asData?.value;
    final deviceLocation = ref.watch(deviceLocationProvider).asData?.value;
    if (userProfile == null || _collected) return;

    if (userProfile.latitude != null && userProfile.longitude != null) {
      _collected = true;
      return;
    }
    if (deviceLocation == null) return;
    _collected = true;

    final nearest = await ref
        .read(cityRepositoryProvider)
        .nearestCity(deviceLocation.latitude, deviceLocation.longitude);
    await ref
        .read(userProfileRepositoryProvider)
        .updateDetectedLocation(
          uid: userProfile.uid,
          latitude: deviceLocation.latitude,
          longitude: deviceLocation.longitude,
          city: userProfile.city == null ? nearest?.name : null,
        );
  }
}
