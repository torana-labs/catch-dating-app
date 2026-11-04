// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_assistance_accountability_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(eventAssistanceAccountabilityRepository)
final eventAssistanceAccountabilityRepositoryProvider =
    EventAssistanceAccountabilityRepositoryProvider._();

final class EventAssistanceAccountabilityRepositoryProvider
    extends
        $FunctionalProvider<
          EventAssistanceAccountabilityRepository,
          EventAssistanceAccountabilityRepository,
          EventAssistanceAccountabilityRepository
        >
    with $Provider<EventAssistanceAccountabilityRepository> {
  EventAssistanceAccountabilityRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventAssistanceAccountabilityRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() =>
      _$eventAssistanceAccountabilityRepositoryHash();

  @$internal
  @override
  $ProviderElement<EventAssistanceAccountabilityRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  EventAssistanceAccountabilityRepository create(Ref ref) {
    return eventAssistanceAccountabilityRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EventAssistanceAccountabilityRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride:
          $SyncValueProvider<EventAssistanceAccountabilityRepository>(value),
    );
  }
}

String _$eventAssistanceAccountabilityRepositoryHash() =>
    r'e11b6d227eaf6f198b5b98134b2b35e07608ffb3';
