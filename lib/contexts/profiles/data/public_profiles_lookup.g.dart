// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'public_profiles_lookup.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Batched public-profile lookup keyed by uid set — one fetch for a whole
/// roster (block list, recap grid, etc.) instead of a realtime stream per tile.
///
/// Uses the repository's per-document reads (public-profile rules evaluate
/// block/deletion per doc id), fetched in parallel. autoDispose so a roster's
/// result is reclaimed when no screen is watching it.

@ProviderFor(publicProfilesByIds)
final publicProfilesByIdsProvider = PublicProfilesByIdsFamily._();

/// Batched public-profile lookup keyed by uid set — one fetch for a whole
/// roster (block list, recap grid, etc.) instead of a realtime stream per tile.
///
/// Uses the repository's per-document reads (public-profile rules evaluate
/// block/deletion per doc id), fetched in parallel. autoDispose so a roster's
/// result is reclaimed when no screen is watching it.

final class PublicProfilesByIdsProvider
    extends
        $FunctionalProvider<
          AsyncValue<Map<String, PublicProfile>>,
          Map<String, PublicProfile>,
          FutureOr<Map<String, PublicProfile>>
        >
    with
        $FutureModifier<Map<String, PublicProfile>>,
        $FutureProvider<Map<String, PublicProfile>> {
  /// Batched public-profile lookup keyed by uid set — one fetch for a whole
  /// roster (block list, recap grid, etc.) instead of a realtime stream per tile.
  ///
  /// Uses the repository's per-document reads (public-profile rules evaluate
  /// block/deletion per doc id), fetched in parallel. autoDispose so a roster's
  /// result is reclaimed when no screen is watching it.
  PublicProfilesByIdsProvider._({
    required PublicProfilesByIdsFamily super.from,
    required PublicProfilesQuery super.argument,
  }) : super(
         retry: null,
         name: r'publicProfilesByIdsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$publicProfilesByIdsHash();

  @override
  String toString() {
    return r'publicProfilesByIdsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<Map<String, PublicProfile>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<Map<String, PublicProfile>> create(Ref ref) {
    final argument = this.argument as PublicProfilesQuery;
    return publicProfilesByIds(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is PublicProfilesByIdsProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$publicProfilesByIdsHash() =>
    r'63766698fe4460dde4ef2eaff93787a8b12ca593';

/// Batched public-profile lookup keyed by uid set — one fetch for a whole
/// roster (block list, recap grid, etc.) instead of a realtime stream per tile.
///
/// Uses the repository's per-document reads (public-profile rules evaluate
/// block/deletion per doc id), fetched in parallel. autoDispose so a roster's
/// result is reclaimed when no screen is watching it.

final class PublicProfilesByIdsFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<Map<String, PublicProfile>>,
          PublicProfilesQuery
        > {
  PublicProfilesByIdsFamily._()
    : super(
        retry: null,
        name: r'publicProfilesByIdsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Batched public-profile lookup keyed by uid set — one fetch for a whole
  /// roster (block list, recap grid, etc.) instead of a realtime stream per tile.
  ///
  /// Uses the repository's per-document reads (public-profile rules evaluate
  /// block/deletion per doc id), fetched in parallel. autoDispose so a roster's
  /// result is reclaimed when no screen is watching it.

  PublicProfilesByIdsProvider call(PublicProfilesQuery query) =>
      PublicProfilesByIdsProvider._(argument: query, from: this);

  @override
  String toString() => r'publicProfilesByIdsProvider';
}
