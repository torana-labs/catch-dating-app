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
    r'ebc5e6c76a66c5ee7433994d8491b70d9528df60';

@ProviderFor(hostProviderSetup)
final hostProviderSetupProvider = HostProviderSetupFamily._();

final class HostProviderSetupProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostProviderSetup>,
          HostProviderSetup,
          FutureOr<HostProviderSetup>
        >
    with
        $FutureModifier<HostProviderSetup>,
        $FutureProvider<HostProviderSetup> {
  HostProviderSetupProvider._({
    required HostProviderSetupFamily super.from,
    required (String, String) super.argument,
  }) : super(
         retry: null,
         name: r'hostProviderSetupProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostProviderSetupHash();

  @override
  String toString() {
    return r'hostProviderSetupProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<HostProviderSetup> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<HostProviderSetup> create(Ref ref) {
    final argument = this.argument as (String, String);
    return hostProviderSetup(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is HostProviderSetupProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostProviderSetupHash() => r'ab7bb88724e474a5a37658b6492ada4754ad54d8';

final class HostProviderSetupFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<HostProviderSetup>,
          (String, String)
        > {
  HostProviderSetupFamily._()
    : super(
        retry: null,
        name: r'hostProviderSetupProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  HostProviderSetupProvider call(String organizerId, String eventId) =>
      HostProviderSetupProvider._(argument: (organizerId, eventId), from: this);

  @override
  String toString() => r'hostProviderSetupProvider';
}
