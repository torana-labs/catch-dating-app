// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_whatsapp_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(hostWhatsappRepository)
final hostWhatsappRepositoryProvider = HostWhatsappRepositoryProvider._();

final class HostWhatsappRepositoryProvider
    extends
        $FunctionalProvider<
          HostWhatsappRepository,
          HostWhatsappRepository,
          HostWhatsappRepository
        >
    with $Provider<HostWhatsappRepository> {
  HostWhatsappRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostWhatsappRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostWhatsappRepositoryHash();

  @$internal
  @override
  $ProviderElement<HostWhatsappRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostWhatsappRepository create(Ref ref) {
    return hostWhatsappRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostWhatsappRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostWhatsappRepository>(value),
    );
  }
}

String _$hostWhatsappRepositoryHash() =>
    r'9ea3c38b84e714c632c270c890b65ae458f07384';

@ProviderFor(hostMessagingSetup)
final hostMessagingSetupProvider = HostMessagingSetupFamily._();

final class HostMessagingSetupProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostMessagingSetup>,
          HostMessagingSetup,
          FutureOr<HostMessagingSetup>
        >
    with
        $FutureModifier<HostMessagingSetup>,
        $FutureProvider<HostMessagingSetup> {
  HostMessagingSetupProvider._({
    required HostMessagingSetupFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostMessagingSetupProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostMessagingSetupHash();

  @override
  String toString() {
    return r'hostMessagingSetupProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<HostMessagingSetup> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<HostMessagingSetup> create(Ref ref) {
    final argument = this.argument as String;
    return hostMessagingSetup(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is HostMessagingSetupProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostMessagingSetupHash() =>
    r'98530441e62eb826bd10af616505b06ecf9f7fae';

final class HostMessagingSetupFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<HostMessagingSetup>, String> {
  HostMessagingSetupFamily._()
    : super(
        retry: null,
        name: r'hostMessagingSetupProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  HostMessagingSetupProvider call(String organizerId) =>
      HostMessagingSetupProvider._(argument: organizerId, from: this);

  @override
  String toString() => r'hostMessagingSetupProvider';
}

@ProviderFor(hostWhatsappThreads)
final hostWhatsappThreadsProvider = HostWhatsappThreadsFamily._();

final class HostWhatsappThreadsProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostWhatsappThreadPage>,
          HostWhatsappThreadPage,
          FutureOr<HostWhatsappThreadPage>
        >
    with
        $FutureModifier<HostWhatsappThreadPage>,
        $FutureProvider<HostWhatsappThreadPage> {
  HostWhatsappThreadsProvider._({
    required HostWhatsappThreadsFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostWhatsappThreadsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostWhatsappThreadsHash();

  @override
  String toString() {
    return r'hostWhatsappThreadsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<HostWhatsappThreadPage> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<HostWhatsappThreadPage> create(Ref ref) {
    final argument = this.argument as String;
    return hostWhatsappThreads(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is HostWhatsappThreadsProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostWhatsappThreadsHash() =>
    r'bbb81206c650f6d837fbde095c2ff687ddd5c9c3';

final class HostWhatsappThreadsFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<HostWhatsappThreadPage>, String> {
  HostWhatsappThreadsFamily._()
    : super(
        retry: null,
        name: r'hostWhatsappThreadsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  HostWhatsappThreadsProvider call(String organizerId) =>
      HostWhatsappThreadsProvider._(argument: organizerId, from: this);

  @override
  String toString() => r'hostWhatsappThreadsProvider';
}
