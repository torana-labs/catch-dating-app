// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_check_in_location_service.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(eventCheckInLocationService)
final eventCheckInLocationServiceProvider =
    EventCheckInLocationServiceProvider._();

final class EventCheckInLocationServiceProvider
    extends
        $FunctionalProvider<
          EventCheckInLocationService,
          EventCheckInLocationService,
          EventCheckInLocationService
        >
    with $Provider<EventCheckInLocationService> {
  EventCheckInLocationServiceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventCheckInLocationServiceProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$eventCheckInLocationServiceHash();

  @$internal
  @override
  $ProviderElement<EventCheckInLocationService> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  EventCheckInLocationService create(Ref ref) {
    return eventCheckInLocationService(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EventCheckInLocationService value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EventCheckInLocationService>(value),
    );
  }
}

String _$eventCheckInLocationServiceHash() =>
    r'dbfdae600ace4de3ffe8d65fe2946b715e4de8e8';
