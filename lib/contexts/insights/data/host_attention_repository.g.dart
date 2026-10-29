// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_attention_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(hostAttentionRepository)
final hostAttentionRepositoryProvider = HostAttentionRepositoryProvider._();

final class HostAttentionRepositoryProvider
    extends
        $FunctionalProvider<
          HostAttentionRepository,
          HostAttentionRepository,
          HostAttentionRepository
        >
    with $Provider<HostAttentionRepository> {
  HostAttentionRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostAttentionRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostAttentionRepositoryHash();

  @$internal
  @override
  $ProviderElement<HostAttentionRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostAttentionRepository create(Ref ref) {
    return hostAttentionRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostAttentionRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostAttentionRepository>(value),
    );
  }
}

String _$hostAttentionRepositoryHash() =>
    r'574e5df0d6d60ced9320c37455ea860add27d7c3';
