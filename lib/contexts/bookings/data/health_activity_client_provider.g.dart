// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'health_activity_client_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Installable app packages override this when they own a native health SDK.
///
/// The Host package deliberately retains the unsupported default so HealthKit
/// and Health Connect are absent from its native dependency graph.
// keepalive: this capability binding is immutable for an installable app root.

@ProviderFor(healthActivityClient)
final healthActivityClientProvider = HealthActivityClientProvider._();

/// Installable app packages override this when they own a native health SDK.
///
/// The Host package deliberately retains the unsupported default so HealthKit
/// and Health Connect are absent from its native dependency graph.
// keepalive: this capability binding is immutable for an installable app root.

final class HealthActivityClientProvider
    extends
        $FunctionalProvider<
          HealthActivityClient,
          HealthActivityClient,
          HealthActivityClient
        >
    with $Provider<HealthActivityClient> {
  /// Installable app packages override this when they own a native health SDK.
  ///
  /// The Host package deliberately retains the unsupported default so HealthKit
  /// and Health Connect are absent from its native dependency graph.
  // keepalive: this capability binding is immutable for an installable app root.
  HealthActivityClientProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'healthActivityClientProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$healthActivityClientHash();

  @$internal
  @override
  $ProviderElement<HealthActivityClient> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HealthActivityClient create(Ref ref) {
    return healthActivityClient(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HealthActivityClient value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HealthActivityClient>(value),
    );
  }
}

String _$healthActivityClientHash() =>
    r'37cc5214d163914e0d89e33d8e2c7f2ca77435f1';
