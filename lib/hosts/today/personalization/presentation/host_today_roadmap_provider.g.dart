// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_today_roadmap_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(hostTodayRoadmap)
final hostTodayRoadmapProvider = HostTodayRoadmapFamily._();

final class HostTodayRoadmapProvider
    extends
        $FunctionalProvider<
          HostTodayRoadmapEvidence,
          HostTodayRoadmapEvidence,
          HostTodayRoadmapEvidence
        >
    with $Provider<HostTodayRoadmapEvidence> {
  HostTodayRoadmapProvider._({
    required HostTodayRoadmapFamily super.from,
    required HostTodayPreferenceScope super.argument,
  }) : super(
         retry: null,
         name: r'hostTodayRoadmapProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostTodayRoadmapHash();

  @override
  String toString() {
    return r'hostTodayRoadmapProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<HostTodayRoadmapEvidence> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostTodayRoadmapEvidence create(Ref ref) {
    final argument = this.argument as HostTodayPreferenceScope;
    return hostTodayRoadmap(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostTodayRoadmapEvidence value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostTodayRoadmapEvidence>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostTodayRoadmapProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostTodayRoadmapHash() => r'73d5ad4f7ddfa9198b9f0ec248cba13018f40e8b';

final class HostTodayRoadmapFamily extends $Family
    with
        $FunctionalFamilyOverride<
          HostTodayRoadmapEvidence,
          HostTodayPreferenceScope
        > {
  HostTodayRoadmapFamily._()
    : super(
        retry: null,
        name: r'hostTodayRoadmapProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  HostTodayRoadmapProvider call(HostTodayPreferenceScope scope) =>
      HostTodayRoadmapProvider._(argument: scope, from: this);

  @override
  String toString() => r'hostTodayRoadmapProvider';
}

/// A failed or unavailable summary stays unknown in the roadmap. Completion is
/// read from rehearsal's durable milestone, never inferred from opening a route.

@ProviderFor(hostTodayRehearsalCompletion)
final hostTodayRehearsalCompletionProvider =
    HostTodayRehearsalCompletionFamily._();

/// A failed or unavailable summary stays unknown in the roadmap. Completion is
/// read from rehearsal's durable milestone, never inferred from opening a route.

final class HostTodayRehearsalCompletionProvider
    extends $FunctionalProvider<AsyncValue<bool>, bool, FutureOr<bool>>
    with $FutureModifier<bool>, $FutureProvider<bool> {
  /// A failed or unavailable summary stays unknown in the roadmap. Completion is
  /// read from rehearsal's durable milestone, never inferred from opening a route.
  HostTodayRehearsalCompletionProvider._({
    required HostTodayRehearsalCompletionFamily super.from,
    required HostTodayPreferenceScope super.argument,
  }) : super(
         retry: null,
         name: r'hostTodayRehearsalCompletionProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostTodayRehearsalCompletionHash();

  @override
  String toString() {
    return r'hostTodayRehearsalCompletionProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<bool> $createElement($ProviderPointer pointer) =>
      $FutureProviderElement(pointer);

  @override
  FutureOr<bool> create(Ref ref) {
    final argument = this.argument as HostTodayPreferenceScope;
    return hostTodayRehearsalCompletion(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is HostTodayRehearsalCompletionProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostTodayRehearsalCompletionHash() =>
    r'2bc86494fe769de0728cba7ad7872bb9c4400669';

/// A failed or unavailable summary stays unknown in the roadmap. Completion is
/// read from rehearsal's durable milestone, never inferred from opening a route.

final class HostTodayRehearsalCompletionFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<bool>, HostTodayPreferenceScope> {
  HostTodayRehearsalCompletionFamily._()
    : super(
        retry: null,
        name: r'hostTodayRehearsalCompletionProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// A failed or unavailable summary stays unknown in the roadmap. Completion is
  /// read from rehearsal's durable milestone, never inferred from opening a route.

  HostTodayRehearsalCompletionProvider call(HostTodayPreferenceScope scope) =>
      HostTodayRehearsalCompletionProvider._(argument: scope, from: this);

  @override
  String toString() => r'hostTodayRehearsalCompletionProvider';
}
