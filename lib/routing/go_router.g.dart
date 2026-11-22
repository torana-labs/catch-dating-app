// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'go_router.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Compatibility provider for test harnesses that intentionally exercise both
/// role graphs in one Dart process. Installable app roots use one of the two
/// compile-time role providers above.
// keepalive: account-free: compatibility tests need one stable role-selected
// router graph.

@ProviderFor(goRouter)
final goRouterProvider = GoRouterProvider._();

/// Compatibility provider for test harnesses that intentionally exercise both
/// role graphs in one Dart process. Installable app roots use one of the two
/// compile-time role providers above.
// keepalive: account-free: compatibility tests need one stable role-selected
// router graph.

final class GoRouterProvider
    extends $FunctionalProvider<GoRouter, GoRouter, GoRouter>
    with $Provider<GoRouter> {
  /// Compatibility provider for test harnesses that intentionally exercise both
  /// role graphs in one Dart process. Installable app roots use one of the two
  /// compile-time role providers above.
  // keepalive: account-free: compatibility tests need one stable role-selected
  // router graph.
  GoRouterProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'goRouterProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$goRouterHash();

  @$internal
  @override
  $ProviderElement<GoRouter> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  GoRouter create(Ref ref) {
    return goRouter(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(GoRouter value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<GoRouter>(value),
    );
  }
}

String _$goRouterHash() => r'6463e41ed4e5631b878e46a583239b4358b7dc16';

@ProviderFor(consumerGoRouter)
final consumerGoRouterProvider = ConsumerGoRouterProvider._();

final class ConsumerGoRouterProvider
    extends $FunctionalProvider<GoRouter, GoRouter, GoRouter>
    with $Provider<GoRouter> {
  ConsumerGoRouterProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'consumerGoRouterProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$consumerGoRouterHash();

  @$internal
  @override
  $ProviderElement<GoRouter> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  GoRouter create(Ref ref) {
    return consumerGoRouter(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(GoRouter value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<GoRouter>(value),
    );
  }
}

String _$consumerGoRouterHash() => r'a1936e03912e2b3de34998d51915a23ab504e676';

@ProviderFor(hostGoRouter)
final hostGoRouterProvider = HostGoRouterProvider._();

final class HostGoRouterProvider
    extends $FunctionalProvider<GoRouter, GoRouter, GoRouter>
    with $Provider<GoRouter> {
  HostGoRouterProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostGoRouterProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostGoRouterHash();

  @$internal
  @override
  $ProviderElement<GoRouter> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  GoRouter create(Ref ref) {
    return hostGoRouter(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(GoRouter value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<GoRouter>(value),
    );
  }
}

String _$hostGoRouterHash() => r'9517323b42f7512d85c4f551be0c9b61860923c4';

@ProviderFor(initialAppLocation)
@visibleForTesting
final initialAppLocationProvider = InitialAppLocationProvider._();

@visibleForTesting
final class InitialAppLocationProvider
    extends $FunctionalProvider<String, String, String>
    with $Provider<String> {
  InitialAppLocationProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'initialAppLocationProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$initialAppLocationHash();

  @$internal
  @override
  $ProviderElement<String> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  String create(Ref ref) {
    return initialAppLocation(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(String value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<String>(value),
    );
  }
}

String _$initialAppLocationHash() =>
    r'8b2cdb2ef491a07c51dc7e03ee7ac9cb3d14c3da';
