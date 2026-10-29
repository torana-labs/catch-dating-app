import 'package:catch_dating_app/platform/errors/app_error_context.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:geolocator/geolocator.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part '../../events/data/event_check_in_location_service.g.dart';

// keepalive: check-in location service is a shared platform facade for event
// arrival actions.
@Riverpod(keepAlive: true)
EventCheckInLocationService eventCheckInLocationService(Ref ref) =>
    const GeolocatorEventCheckInLocationService();

class EventCheckInLocation {
  const EventCheckInLocation({required this.latitude, required this.longitude});

  final double latitude;
  final double longitude;
}

abstract interface class EventCheckInLocationService {
  Future<EventCheckInLocation> getCurrentLocation();
}

class GeolocatorEventCheckInLocationService
    implements EventCheckInLocationService {
  const GeolocatorEventCheckInLocationService();

  @override
  Future<EventCheckInLocation> getCurrentLocation() {
    // Plugin op-context so raw geolocator/platform failures (timeout, location
    // unavailable, plugin errors) normalize into typed app exceptions instead
    // of leaking raw platform errors. The permission/service guards below throw
    // typed PermissionExceptions directly so their user-facing copy survives
    // and they are reported as warnings, not crashes.
    return withAppErrorContext(
      _readCurrentLocation,
      context: const AppErrorContext(
        operation: AppOperation.plugin,
        action: 'read your location to check in',
        resource: 'geolocator',
      ),
    );
  }

  Future<EventCheckInLocation> _readCurrentLocation() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      throw const PermissionException(
        'Turn on location services to check in at the event. '
        'You can still ask the host to mark attendance.',
      );
    }

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied) {
      throw const PermissionException(
        'Allow location access to check in. '
        'You can still ask the host to mark attendance.',
      );
    }
    if (permission == LocationPermission.deniedForever) {
      throw const PermissionException(
        'Location access is blocked. Enable it in Settings or ask the host '
        'to mark attendance.',
      );
    }

    final position = await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        timeLimit: Duration(seconds: 15),
      ),
    );

    return EventCheckInLocation(
      latitude: position.latitude,
      longitude: position.longitude,
    );
  }
}
