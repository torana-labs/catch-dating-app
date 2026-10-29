// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_assistance_deliveries_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(eventAssistanceDeliveriesRepository)
final eventAssistanceDeliveriesRepositoryProvider =
    EventAssistanceDeliveriesRepositoryProvider._();

final class EventAssistanceDeliveriesRepositoryProvider
    extends
        $FunctionalProvider<
          EventAssistanceDeliveriesRepository,
          EventAssistanceDeliveriesRepository,
          EventAssistanceDeliveriesRepository
        >
    with $Provider<EventAssistanceDeliveriesRepository> {
  EventAssistanceDeliveriesRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventAssistanceDeliveriesRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() =>
      _$eventAssistanceDeliveriesRepositoryHash();

  @$internal
  @override
  $ProviderElement<EventAssistanceDeliveriesRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  EventAssistanceDeliveriesRepository create(Ref ref) {
    return eventAssistanceDeliveriesRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EventAssistanceDeliveriesRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EventAssistanceDeliveriesRepository>(
        value,
      ),
    );
  }
}

String _$eventAssistanceDeliveriesRepositoryHash() =>
    r'9768ff4f5b4fa8090d18d55f7885d958c3f97e83';
