// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_live_position_service.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(eventLivePositionPublisher)
final eventLivePositionPublisherProvider =
    EventLivePositionPublisherProvider._();

final class EventLivePositionPublisherProvider
    extends
        $FunctionalProvider<
          EventLivePositionPublisher,
          EventLivePositionPublisher,
          EventLivePositionPublisher
        >
    with $Provider<EventLivePositionPublisher> {
  EventLivePositionPublisherProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventLivePositionPublisherProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$eventLivePositionPublisherHash();

  @$internal
  @override
  $ProviderElement<EventLivePositionPublisher> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  EventLivePositionPublisher create(Ref ref) {
    return eventLivePositionPublisher(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EventLivePositionPublisher value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EventLivePositionPublisher>(value),
    );
  }
}

String _$eventLivePositionPublisherHash() =>
    r'aff081c7cd66a684039a844efa75258cf341bba7';

@ProviderFor(eventLivePositionStreamGateway)
final eventLivePositionStreamGatewayProvider =
    EventLivePositionStreamGatewayProvider._();

final class EventLivePositionStreamGatewayProvider
    extends
        $FunctionalProvider<
          EventLivePositionStreamGateway,
          EventLivePositionStreamGateway,
          EventLivePositionStreamGateway
        >
    with $Provider<EventLivePositionStreamGateway> {
  EventLivePositionStreamGatewayProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventLivePositionStreamGatewayProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$eventLivePositionStreamGatewayHash();

  @$internal
  @override
  $ProviderElement<EventLivePositionStreamGateway> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  EventLivePositionStreamGateway create(Ref ref) {
    return eventLivePositionStreamGateway(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EventLivePositionStreamGateway value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EventLivePositionStreamGateway>(
        value,
      ),
    );
  }
}

String _$eventLivePositionStreamGatewayHash() =>
    r'1b5493fb257094b08a7554aaa1f3ac2b7844e7c6';
