import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callable_request_dtos.g.dart'
    show PublishEventLivePositionCallableRequest;
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:geolocator/geolocator.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_live_position_service.g.dart';

class EventLivePositionSample {
  const EventLivePositionSample({
    required this.latitude,
    required this.longitude,
    this.accuracyMeters,
    this.headingDegrees,
  });

  factory EventLivePositionSample.fromPosition(Position position) =>
      EventLivePositionSample(
        latitude: position.latitude,
        longitude: position.longitude,
        accuracyMeters: position.accuracy.isFinite && position.accuracy >= 0
            ? position.accuracy
            : null,
        headingDegrees:
            position.heading.isFinite &&
                position.heading >= 0 &&
                position.heading < 360
            ? position.heading
            : null,
      );

  final double latitude;
  final double longitude;
  final double? accuracyMeters;
  final double? headingDegrees;
}

abstract interface class EventLivePositionPublisher {
  Future<void> publish({
    required String eventId,
    required EventLivePositionSample position,
  });

  Future<void> stop({required String eventId});
}

class FirebaseEventLivePositionPublisher implements EventLivePositionPublisher {
  const FirebaseEventLivePositionPublisher(this._functions);

  final FirebaseFunctions _functions;

  @override
  Future<void> publish({
    required String eventId,
    required EventLivePositionSample position,
  }) => _call(
    PublishEventLivePositionCallableRequest(
      eventId: eventId,
      sharing: true,
      latitude: position.latitude,
      longitude: position.longitude,
      accuracyMeters: position.accuracyMeters,
      headingDegrees: position.headingDegrees,
    ),
  );

  @override
  Future<void> stop({required String eventId}) => _call(
    PublishEventLivePositionCallableRequest(
      eventId: eventId,
      sharing: false,
      latitude: null,
      longitude: null,
      accuracyMeters: null,
      headingDegrees: null,
    ),
  );

  Future<void> _call(PublishEventLivePositionCallableRequest request) =>
      withBackendErrorContext(
        () => _functions
            .httpsCallable('publishEventLivePosition')
            .call<Object?>(request.toJson()),
        context: const BackendErrorContext(
          service: BackendService.functions,
          action: 'publish event live position',
          resource: 'eventLivePositions',
        ),
      );
}

abstract interface class EventLivePositionStreamGateway {
  Stream<EventLivePositionSample> watch();
}

class GeolocatorEventLivePositionStreamGateway
    implements EventLivePositionStreamGateway {
  const GeolocatorEventLivePositionStreamGateway();

  @override
  Stream<EventLivePositionSample> watch() => Geolocator.getPositionStream(
    locationSettings: const LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 10,
    ),
  ).map(EventLivePositionSample.fromPosition);
}

// keepalive: this platform facade coordinates explicit foreground location
// sharing across Event Success and Host event management routes.
@Riverpod(keepAlive: true)
EventLivePositionPublisher eventLivePositionPublisher(Ref ref) =>
    FirebaseEventLivePositionPublisher(ref.watch(firebaseFunctionsProvider));

// keepalive: the location stream is owned by an explicit sharing controller,
// which starts and stops collection as the user changes sharing state.
@Riverpod(keepAlive: true)
EventLivePositionStreamGateway eventLivePositionStreamGateway(Ref ref) =>
    const GeolocatorEventLivePositionStreamGateway();
