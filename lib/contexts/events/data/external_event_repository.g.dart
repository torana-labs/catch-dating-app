// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'external_event_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(externalEventRepository)
final externalEventRepositoryProvider = ExternalEventRepositoryProvider._();

final class ExternalEventRepositoryProvider
    extends
        $FunctionalProvider<
          ExternalEventRepository,
          ExternalEventRepository,
          ExternalEventRepository
        >
    with $Provider<ExternalEventRepository> {
  ExternalEventRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'externalEventRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$externalEventRepositoryHash();

  @$internal
  @override
  $ProviderElement<ExternalEventRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  ExternalEventRepository create(Ref ref) {
    return externalEventRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ExternalEventRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ExternalEventRepository>(value),
    );
  }
}

String _$externalEventRepositoryHash() =>
    r'37fa445effc507bf312f11bf824dfb85ab23ca36';

@ProviderFor(discoverableExternalEvents)
final discoverableExternalEventsProvider = DiscoverableExternalEventsFamily._();

final class DiscoverableExternalEventsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<ExternalEvent>>,
          List<ExternalEvent>,
          FutureOr<List<ExternalEvent>>
        >
    with
        $FutureModifier<List<ExternalEvent>>,
        $FutureProvider<List<ExternalEvent>> {
  DiscoverableExternalEventsProvider._({
    required DiscoverableExternalEventsFamily super.from,
    required ExternalEventDiscoveryQuery super.argument,
  }) : super(
         retry: null,
         name: r'discoverableExternalEventsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$discoverableExternalEventsHash();

  @override
  String toString() {
    return r'discoverableExternalEventsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<List<ExternalEvent>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<ExternalEvent>> create(Ref ref) {
    final argument = this.argument as ExternalEventDiscoveryQuery;
    return discoverableExternalEvents(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is DiscoverableExternalEventsProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$discoverableExternalEventsHash() =>
    r'660ff0d4ae5de1ed4dd4b733a03e5f7435df0293';

final class DiscoverableExternalEventsFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<List<ExternalEvent>>,
          ExternalEventDiscoveryQuery
        > {
  DiscoverableExternalEventsFamily._()
    : super(
        retry: null,
        name: r'discoverableExternalEventsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  DiscoverableExternalEventsProvider call(ExternalEventDiscoveryQuery query) =>
      DiscoverableExternalEventsProvider._(argument: query, from: this);

  @override
  String toString() => r'discoverableExternalEventsProvider';
}
