// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'app.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(forceUpdateRefresh)
@visibleForTesting
final forceUpdateRefreshProvider = ForceUpdateRefreshProvider._();

@visibleForTesting
final class ForceUpdateRefreshProvider
    extends
        $FunctionalProvider<
          ForceUpdateRefresh,
          ForceUpdateRefresh,
          ForceUpdateRefresh
        >
    with $Provider<ForceUpdateRefresh> {
  ForceUpdateRefreshProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'forceUpdateRefreshProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$forceUpdateRefreshHash();

  @$internal
  @override
  $ProviderElement<ForceUpdateRefresh> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  ForceUpdateRefresh create(Ref ref) {
    return forceUpdateRefresh(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ForceUpdateRefresh value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ForceUpdateRefresh>(value),
    );
  }
}

String _$forceUpdateRefreshHash() =>
    r'79ed03d96a57af124fa0a62dd02580f759dd238f';
