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

/// A failed or unavailable read stays unknown in the roadmap. Completion is
/// rehearsal's durable milestone document, never inferred from opening a
/// route. It is a Firestore listener read owner: no cache tags or lifetime,
/// and the write that completes a rehearsal reaches it without invalidation.

@ProviderFor(hostTodayRehearsalCompletion)
final hostTodayRehearsalCompletionProvider =
    HostTodayRehearsalCompletionFamily._();

/// A failed or unavailable read stays unknown in the roadmap. Completion is
/// rehearsal's durable milestone document, never inferred from opening a
/// route. It is a Firestore listener read owner: no cache tags or lifetime,
/// and the write that completes a rehearsal reaches it without invalidation.

final class HostTodayRehearsalCompletionProvider
    extends $FunctionalProvider<AsyncValue<bool>, bool, Stream<bool>>
    with $FutureModifier<bool>, $StreamProvider<bool> {
  /// A failed or unavailable read stays unknown in the roadmap. Completion is
  /// rehearsal's durable milestone document, never inferred from opening a
  /// route. It is a Firestore listener read owner: no cache tags or lifetime,
  /// and the write that completes a rehearsal reaches it without invalidation.
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
  $StreamProviderElement<bool> $createElement($ProviderPointer pointer) =>
      $StreamProviderElement(pointer);

  @override
  Stream<bool> create(Ref ref) {
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
    r'2384f074e0f8406ee446c9e6c6f796bc5f946bad';

/// A failed or unavailable read stays unknown in the roadmap. Completion is
/// rehearsal's durable milestone document, never inferred from opening a
/// route. It is a Firestore listener read owner: no cache tags or lifetime,
/// and the write that completes a rehearsal reaches it without invalidation.

final class HostTodayRehearsalCompletionFamily extends $Family
    with $FunctionalFamilyOverride<Stream<bool>, HostTodayPreferenceScope> {
  HostTodayRehearsalCompletionFamily._()
    : super(
        retry: null,
        name: r'hostTodayRehearsalCompletionProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// A failed or unavailable read stays unknown in the roadmap. Completion is
  /// rehearsal's durable milestone document, never inferred from opening a
  /// route. It is a Firestore listener read owner: no cache tags or lifetime,
  /// and the write that completes a rehearsal reaches it without invalidation.

  HostTodayRehearsalCompletionProvider call(HostTodayPreferenceScope scope) =>
      HostTodayRehearsalCompletionProvider._(argument: scope, from: this);

  @override
  String toString() => r'hostTodayRehearsalCompletionProvider';
}
