// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_discovery_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(eventDiscoveryRepository)
final eventDiscoveryRepositoryProvider = EventDiscoveryRepositoryProvider._();

final class EventDiscoveryRepositoryProvider
    extends
        $FunctionalProvider<
          EventDiscoveryRepository,
          EventDiscoveryRepository,
          EventDiscoveryRepository
        >
    with $Provider<EventDiscoveryRepository> {
  EventDiscoveryRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventDiscoveryRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$eventDiscoveryRepositoryHash();

  @$internal
  @override
  $ProviderElement<EventDiscoveryRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  EventDiscoveryRepository create(Ref ref) {
    return eventDiscoveryRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EventDiscoveryRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EventDiscoveryRepository>(value),
    );
  }
}

String _$eventDiscoveryRepositoryHash() =>
    r'12aa02b44a468517da897b707390d588312a0848';

@ProviderFor(discoverableEvents)
final discoverableEventsProvider = DiscoverableEventsFamily._();

final class DiscoverableEventsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<Event>>,
          List<Event>,
          FutureOr<List<Event>>
        >
    with $FutureModifier<List<Event>>, $FutureProvider<List<Event>> {
  DiscoverableEventsProvider._({
    required DiscoverableEventsFamily super.from,
    required EventDiscoveryQuery super.argument,
  }) : super(
         retry: null,
         name: r'discoverableEventsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$discoverableEventsHash();

  @override
  String toString() {
    return r'discoverableEventsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<List<Event>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<Event>> create(Ref ref) {
    final argument = this.argument as EventDiscoveryQuery;
    return discoverableEvents(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is DiscoverableEventsProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$discoverableEventsHash() =>
    r'ad0fd12d3427c40f480a66c69d9ca641ecf900be';

final class DiscoverableEventsFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<List<Event>>, EventDiscoveryQuery> {
  DiscoverableEventsFamily._()
    : super(
        retry: null,
        name: r'discoverableEventsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  DiscoverableEventsProvider call(EventDiscoveryQuery query) =>
      DiscoverableEventsProvider._(argument: query, from: this);

  @override
  String toString() => r'discoverableEventsProvider';
}
