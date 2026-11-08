// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_publication_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The EventPublicationRepository over the app's callable functions.

@ProviderFor(eventPublicationRepository)
final eventPublicationRepositoryProvider =
    EventPublicationRepositoryProvider._();

/// The EventPublicationRepository over the app's callable functions.

final class EventPublicationRepositoryProvider
    extends
        $FunctionalProvider<
          EventPublicationRepository,
          EventPublicationRepository,
          EventPublicationRepository
        >
    with $Provider<EventPublicationRepository> {
  /// The EventPublicationRepository over the app's callable functions.
  EventPublicationRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventPublicationRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$eventPublicationRepositoryHash();

  @$internal
  @override
  $ProviderElement<EventPublicationRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  EventPublicationRepository create(Ref ref) {
    return eventPublicationRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EventPublicationRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EventPublicationRepository>(value),
    );
  }
}

String _$eventPublicationRepositoryHash() =>
    r'754c88597f68fbf41816dbcf03dee29d161811fc';
