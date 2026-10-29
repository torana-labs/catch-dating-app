// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_runtime_claim_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(eventRuntimeClaimRepository)
final eventRuntimeClaimRepositoryProvider =
    EventRuntimeClaimRepositoryProvider._();

final class EventRuntimeClaimRepositoryProvider
    extends
        $FunctionalProvider<
          EventRuntimeClaimRepository,
          EventRuntimeClaimRepository,
          EventRuntimeClaimRepository
        >
    with $Provider<EventRuntimeClaimRepository> {
  EventRuntimeClaimRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventRuntimeClaimRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$eventRuntimeClaimRepositoryHash();

  @$internal
  @override
  $ProviderElement<EventRuntimeClaimRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  EventRuntimeClaimRepository create(Ref ref) {
    return eventRuntimeClaimRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EventRuntimeClaimRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EventRuntimeClaimRepository>(value),
    );
  }
}

String _$eventRuntimeClaimRepositoryHash() =>
    r'6ccff65eb375ffe34ed4aa3b8a8d295986ab4684';

@ProviderFor(watchPendingEventRuntimeClaims)
final watchPendingEventRuntimeClaimsProvider =
    WatchPendingEventRuntimeClaimsFamily._();

final class WatchPendingEventRuntimeClaimsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<EventRuntimeClaimRequest>>,
          List<EventRuntimeClaimRequest>,
          Stream<List<EventRuntimeClaimRequest>>
        >
    with
        $FutureModifier<List<EventRuntimeClaimRequest>>,
        $StreamProvider<List<EventRuntimeClaimRequest>> {
  WatchPendingEventRuntimeClaimsProvider._({
    required WatchPendingEventRuntimeClaimsFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchPendingEventRuntimeClaimsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchPendingEventRuntimeClaimsHash();

  @override
  String toString() {
    return r'watchPendingEventRuntimeClaimsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<EventRuntimeClaimRequest>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<EventRuntimeClaimRequest>> create(Ref ref) {
    final argument = this.argument as String;
    return watchPendingEventRuntimeClaims(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchPendingEventRuntimeClaimsProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchPendingEventRuntimeClaimsHash() =>
    r'3ebc156d166d053e13d2c08ac02b07cc0d366ccc';

final class WatchPendingEventRuntimeClaimsFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<List<EventRuntimeClaimRequest>>,
          String
        > {
  WatchPendingEventRuntimeClaimsFamily._()
    : super(
        retry: null,
        name: r'watchPendingEventRuntimeClaimsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchPendingEventRuntimeClaimsProvider call(String eventId) =>
      WatchPendingEventRuntimeClaimsProvider._(argument: eventId, from: this);

  @override
  String toString() => r'watchPendingEventRuntimeClaimsProvider';
}
