// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_assistance_departure_history_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(eventAssistanceDepartureHistoryRepository)
final eventAssistanceDepartureHistoryRepositoryProvider =
    EventAssistanceDepartureHistoryRepositoryProvider._();

final class EventAssistanceDepartureHistoryRepositoryProvider
    extends
        $FunctionalProvider<
          EventAssistanceDepartureHistoryRepository,
          EventAssistanceDepartureHistoryRepository,
          EventAssistanceDepartureHistoryRepository
        >
    with $Provider<EventAssistanceDepartureHistoryRepository> {
  EventAssistanceDepartureHistoryRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventAssistanceDepartureHistoryRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() =>
      _$eventAssistanceDepartureHistoryRepositoryHash();

  @$internal
  @override
  $ProviderElement<EventAssistanceDepartureHistoryRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  EventAssistanceDepartureHistoryRepository create(Ref ref) {
    return eventAssistanceDepartureHistoryRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EventAssistanceDepartureHistoryRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride:
          $SyncValueProvider<EventAssistanceDepartureHistoryRepository>(value),
    );
  }
}

String _$eventAssistanceDepartureHistoryRepositoryHash() =>
    r'9a11e300531b882e8e8aa5ba01621080c5d46bc7';
