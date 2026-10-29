// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'connectivity_service.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(appConnectivity)
final appConnectivityProvider = AppConnectivityProvider._();

final class AppConnectivityProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<ConnectivityResult>>,
          List<ConnectivityResult>,
          Stream<List<ConnectivityResult>>
        >
    with
        $FutureModifier<List<ConnectivityResult>>,
        $StreamProvider<List<ConnectivityResult>> {
  AppConnectivityProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'appConnectivityProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$appConnectivityHash();

  @$internal
  @override
  $StreamProviderElement<List<ConnectivityResult>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<ConnectivityResult>> create(Ref ref) {
    return appConnectivity(ref);
  }
}

String _$appConnectivityHash() => r'7452d8c035c7360cda43e930a83a1e0cc2d3155c';

@ProviderFor(isObviouslyOffline)
final isObviouslyOfflineProvider = IsObviouslyOfflineProvider._();

final class IsObviouslyOfflineProvider
    extends $FunctionalProvider<bool, bool, bool>
    with $Provider<bool> {
  IsObviouslyOfflineProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'isObviouslyOfflineProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$isObviouslyOfflineHash();

  @$internal
  @override
  $ProviderElement<bool> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  bool create(Ref ref) {
    return isObviouslyOffline(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(bool value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<bool>(value),
    );
  }
}

String _$isObviouslyOfflineHash() =>
    r'509ce52dc5f7fe885705206d91cc012dedf04faf';
