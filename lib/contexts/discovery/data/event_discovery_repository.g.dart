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

/// The live events behind one Explore search. Explore keeps the live
/// "N going" label, so search rows read the events, not a guest's cards.

@ProviderFor(watchExploreSearchEvents)
final watchExploreSearchEventsProvider = WatchExploreSearchEventsFamily._();

/// The live events behind one Explore search. Explore keeps the live
/// "N going" label, so search rows read the events, not a guest's cards.

final class WatchExploreSearchEventsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<Event>>,
          List<Event>,
          Stream<List<Event>>
        >
    with $FutureModifier<List<Event>>, $StreamProvider<List<Event>> {
  /// The live events behind one Explore search. Explore keeps the live
  /// "N going" label, so search rows read the events, not a guest's cards.
  WatchExploreSearchEventsProvider._({
    required WatchExploreSearchEventsFamily super.from,
    required ExploreSearchEventsQuery super.argument,
  }) : super(
         retry: null,
         name: r'watchExploreSearchEventsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchExploreSearchEventsHash();

  @override
  String toString() {
    return r'watchExploreSearchEventsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<Event>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<Event>> create(Ref ref) {
    final argument = this.argument as ExploreSearchEventsQuery;
    return watchExploreSearchEvents(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchExploreSearchEventsProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchExploreSearchEventsHash() =>
    r'6e6a978a17e8a7ad29ab03ced4a5d1b85d0d75da';

/// The live events behind one Explore search. Explore keeps the live
/// "N going" label, so search rows read the events, not a guest's cards.

final class WatchExploreSearchEventsFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<List<Event>>,
          ExploreSearchEventsQuery
        > {
  WatchExploreSearchEventsFamily._()
    : super(
        retry: null,
        name: r'watchExploreSearchEventsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The live events behind one Explore search. Explore keeps the live
  /// "N going" label, so search rows read the events, not a guest's cards.

  WatchExploreSearchEventsProvider call(ExploreSearchEventsQuery query) =>
      WatchExploreSearchEventsProvider._(argument: query, from: this);

  @override
  String toString() => r'watchExploreSearchEventsProvider';
}

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
