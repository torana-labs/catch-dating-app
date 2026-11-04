// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_provider_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(hostProviderRepository)
final hostProviderRepositoryProvider = HostProviderRepositoryProvider._();

final class HostProviderRepositoryProvider
    extends
        $FunctionalProvider<
          HostProviderRepository,
          HostProviderRepository,
          HostProviderRepository
        >
    with $Provider<HostProviderRepository> {
  HostProviderRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostProviderRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostProviderRepositoryHash();

  @$internal
  @override
  $ProviderElement<HostProviderRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostProviderRepository create(Ref ref) {
    return hostProviderRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostProviderRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostProviderRepository>(value),
    );
  }
}

String _$hostProviderRepositoryHash() =>
    r'da00852295fa01e2f1c9f98f3bee40651add919e';
