// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_assistance_departure_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(eventAssistanceDepartureRepository)
final eventAssistanceDepartureRepositoryProvider =
    EventAssistanceDepartureRepositoryProvider._();

final class EventAssistanceDepartureRepositoryProvider
    extends
        $FunctionalProvider<
          EventAssistanceDepartureRepository,
          EventAssistanceDepartureRepository,
          EventAssistanceDepartureRepository
        >
    with $Provider<EventAssistanceDepartureRepository> {
  EventAssistanceDepartureRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventAssistanceDepartureRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() =>
      _$eventAssistanceDepartureRepositoryHash();

  @$internal
  @override
  $ProviderElement<EventAssistanceDepartureRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  EventAssistanceDepartureRepository create(Ref ref) {
    return eventAssistanceDepartureRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EventAssistanceDepartureRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EventAssistanceDepartureRepository>(
        value,
      ),
    );
  }
}

String _$eventAssistanceDepartureRepositoryHash() =>
    r'adbe97230e97c965d8ff98dc9edef941285583d1';
