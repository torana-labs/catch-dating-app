// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'pending_write_observer.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// How many writes have run longer than [writeStillWorkingAfter]. The notice
/// overlay says "Still working" while it is above zero.
// keepalive: app-wide UI state, like the notice queue it feeds.

@ProviderFor(StillWorkingWrites)
final stillWorkingWritesProvider = StillWorkingWritesProvider._();

/// How many writes have run longer than [writeStillWorkingAfter]. The notice
/// overlay says "Still working" while it is above zero.
// keepalive: app-wide UI state, like the notice queue it feeds.
final class StillWorkingWritesProvider
    extends $NotifierProvider<StillWorkingWrites, int> {
  /// How many writes have run longer than [writeStillWorkingAfter]. The notice
  /// overlay says "Still working" while it is above zero.
  // keepalive: app-wide UI state, like the notice queue it feeds.
  StillWorkingWritesProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'stillWorkingWritesProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$stillWorkingWritesHash();

  @$internal
  @override
  StillWorkingWrites create() => StillWorkingWrites();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(int value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<int>(value),
    );
  }
}

String _$stillWorkingWritesHash() =>
    r'1ae49fe2ab8bdb534e31682785751d911e52b1d3';

/// How many writes have run longer than [writeStillWorkingAfter]. The notice
/// overlay says "Still working" while it is above zero.
// keepalive: app-wide UI state, like the notice queue it feeds.

abstract class _$StillWorkingWrites extends $Notifier<int> {
  int build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<int, int>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<int, int>,
              int,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}
