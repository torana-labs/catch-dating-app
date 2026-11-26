// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_response_query_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The manager response-query callable, as the gateway the query
/// workspace reads through.

@ProviderFor(hostResponseQueryGateway)
final hostResponseQueryGatewayProvider = HostResponseQueryGatewayProvider._();

/// The manager response-query callable, as the gateway the query
/// workspace reads through.

final class HostResponseQueryGatewayProvider
    extends
        $FunctionalProvider<
          HostResponseQueryGateway,
          HostResponseQueryGateway,
          HostResponseQueryGateway
        >
    with $Provider<HostResponseQueryGateway> {
  /// The manager response-query callable, as the gateway the query
  /// workspace reads through.
  HostResponseQueryGatewayProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostResponseQueryGatewayProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostResponseQueryGatewayHash();

  @$internal
  @override
  $ProviderElement<HostResponseQueryGateway> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostResponseQueryGateway create(Ref ref) {
    return hostResponseQueryGateway(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostResponseQueryGateway value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostResponseQueryGateway>(value),
    );
  }
}

String _$hostResponseQueryGatewayHash() =>
    r'3186ef8b742c87fcb9bbcd73f80f963d98848229';
