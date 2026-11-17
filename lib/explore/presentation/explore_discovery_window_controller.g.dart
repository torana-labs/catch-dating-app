// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'explore_discovery_window_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Cursor-accumulated internal + external discovery window for Explore.
///
/// The provider family key is the normalized query pair. Changing city,
/// filter, time scope, cohort, or distance therefore creates a fresh first
/// page; loading more mutates only that exact query window.

@ProviderFor(ExploreDiscoveryWindow)
final exploreDiscoveryWindowProvider = ExploreDiscoveryWindowFamily._();

/// Cursor-accumulated internal + external discovery window for Explore.
///
/// The provider family key is the normalized query pair. Changing city,
/// filter, time scope, cohort, or distance therefore creates a fresh first
/// page; loading more mutates only that exact query window.
final class ExploreDiscoveryWindowProvider
    extends
        $AsyncNotifierProvider<
          ExploreDiscoveryWindow,
          ExploreDiscoveryWindowState
        > {
  /// Cursor-accumulated internal + external discovery window for Explore.
  ///
  /// The provider family key is the normalized query pair. Changing city,
  /// filter, time scope, cohort, or distance therefore creates a fresh first
  /// page; loading more mutates only that exact query window.
  ExploreDiscoveryWindowProvider._({
    required ExploreDiscoveryWindowFamily super.from,
    required ExploreDiscoveryWindowRequest super.argument,
  }) : super(
         retry: null,
         name: r'exploreDiscoveryWindowProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$exploreDiscoveryWindowHash();

  @override
  String toString() {
    return r'exploreDiscoveryWindowProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  ExploreDiscoveryWindow create() => ExploreDiscoveryWindow();

  @override
  bool operator ==(Object other) {
    return other is ExploreDiscoveryWindowProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$exploreDiscoveryWindowHash() =>
    r'e5404f1d81b2f6da05941d974ed49bb38449dfd3';

/// Cursor-accumulated internal + external discovery window for Explore.
///
/// The provider family key is the normalized query pair. Changing city,
/// filter, time scope, cohort, or distance therefore creates a fresh first
/// page; loading more mutates only that exact query window.

final class ExploreDiscoveryWindowFamily extends $Family
    with
        $ClassFamilyOverride<
          ExploreDiscoveryWindow,
          AsyncValue<ExploreDiscoveryWindowState>,
          ExploreDiscoveryWindowState,
          FutureOr<ExploreDiscoveryWindowState>,
          ExploreDiscoveryWindowRequest
        > {
  ExploreDiscoveryWindowFamily._()
    : super(
        retry: null,
        name: r'exploreDiscoveryWindowProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Cursor-accumulated internal + external discovery window for Explore.
  ///
  /// The provider family key is the normalized query pair. Changing city,
  /// filter, time scope, cohort, or distance therefore creates a fresh first
  /// page; loading more mutates only that exact query window.

  ExploreDiscoveryWindowProvider call(ExploreDiscoveryWindowRequest request) =>
      ExploreDiscoveryWindowProvider._(argument: request, from: this);

  @override
  String toString() => r'exploreDiscoveryWindowProvider';
}

/// Cursor-accumulated internal + external discovery window for Explore.
///
/// The provider family key is the normalized query pair. Changing city,
/// filter, time scope, cohort, or distance therefore creates a fresh first
/// page; loading more mutates only that exact query window.

abstract class _$ExploreDiscoveryWindow
    extends $AsyncNotifier<ExploreDiscoveryWindowState> {
  late final _$args = ref.$arg as ExploreDiscoveryWindowRequest;
  ExploreDiscoveryWindowRequest get request => _$args;

  FutureOr<ExploreDiscoveryWindowState> build(
    ExploreDiscoveryWindowRequest request,
  );
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<
              AsyncValue<ExploreDiscoveryWindowState>,
              ExploreDiscoveryWindowState
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<ExploreDiscoveryWindowState>,
                ExploreDiscoveryWindowState
              >,
              AsyncValue<ExploreDiscoveryWindowState>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}
