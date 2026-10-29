// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_assistance_host_guests_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(eventAssistanceHostGuestsRepository)
final eventAssistanceHostGuestsRepositoryProvider =
    EventAssistanceHostGuestsRepositoryProvider._();

final class EventAssistanceHostGuestsRepositoryProvider
    extends
        $FunctionalProvider<
          EventAssistanceHostGuestsRepository,
          EventAssistanceHostGuestsRepository,
          EventAssistanceHostGuestsRepository
        >
    with $Provider<EventAssistanceHostGuestsRepository> {
  EventAssistanceHostGuestsRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventAssistanceHostGuestsRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() =>
      _$eventAssistanceHostGuestsRepositoryHash();

  @$internal
  @override
  $ProviderElement<EventAssistanceHostGuestsRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  EventAssistanceHostGuestsRepository create(Ref ref) {
    return eventAssistanceHostGuestsRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EventAssistanceHostGuestsRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EventAssistanceHostGuestsRepository>(
        value,
      ),
    );
  }
}

String _$eventAssistanceHostGuestsRepositoryHash() =>
    r'9713ed3b2000c50fb077e50cc43545ad3b208f32';
