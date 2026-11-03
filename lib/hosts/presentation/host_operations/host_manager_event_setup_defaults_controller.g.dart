// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_manager_event_setup_defaults_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(hostManagerEventSetupDefaultsDependencies)
final hostManagerEventSetupDefaultsDependenciesProvider =
    HostManagerEventSetupDefaultsDependenciesProvider._();

final class HostManagerEventSetupDefaultsDependenciesProvider
    extends
        $FunctionalProvider<
          HostManagerEventSetupDefaultsDependencies,
          HostManagerEventSetupDefaultsDependencies,
          HostManagerEventSetupDefaultsDependencies
        >
    with $Provider<HostManagerEventSetupDefaultsDependencies> {
  HostManagerEventSetupDefaultsDependenciesProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostManagerEventSetupDefaultsDependenciesProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() =>
      _$hostManagerEventSetupDefaultsDependenciesHash();

  @$internal
  @override
  $ProviderElement<HostManagerEventSetupDefaultsDependencies> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostManagerEventSetupDefaultsDependencies create(Ref ref) {
    return hostManagerEventSetupDefaultsDependencies(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostManagerEventSetupDefaultsDependencies value) {
    return $ProviderOverride(
      origin: this,
      providerOverride:
          $SyncValueProvider<HostManagerEventSetupDefaultsDependencies>(value),
    );
  }
}

String _$hostManagerEventSetupDefaultsDependenciesHash() =>
    r'6aa526f724a5782dd451a10dc14301986c24d5c4';

@ProviderFor(HostManagerEventSetupDefaultsController)
final hostManagerEventSetupDefaultsControllerProvider =
    HostManagerEventSetupDefaultsControllerFamily._();

final class HostManagerEventSetupDefaultsControllerProvider
    extends
        $NotifierProvider<
          HostManagerEventSetupDefaultsController,
          HostManagerEventSetupDefaultsState
        > {
  HostManagerEventSetupDefaultsControllerProvider._({
    required HostManagerEventSetupDefaultsControllerFamily super.from,
    required ({String organizerId, String userId}) super.argument,
  }) : super(
         retry: null,
         name: r'hostManagerEventSetupDefaultsControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$hostManagerEventSetupDefaultsControllerHash();

  @override
  String toString() {
    return r'hostManagerEventSetupDefaultsControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  HostManagerEventSetupDefaultsController create() =>
      HostManagerEventSetupDefaultsController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostManagerEventSetupDefaultsState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostManagerEventSetupDefaultsState>(
        value,
      ),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostManagerEventSetupDefaultsControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostManagerEventSetupDefaultsControllerHash() =>
    r'f4c0e3f7ffe8c731170fea33bdade9510700fbd7';

final class HostManagerEventSetupDefaultsControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          HostManagerEventSetupDefaultsController,
          HostManagerEventSetupDefaultsState,
          HostManagerEventSetupDefaultsState,
          HostManagerEventSetupDefaultsState,
          ({String organizerId, String userId})
        > {
  HostManagerEventSetupDefaultsControllerFamily._()
    : super(
        retry: null,
        name: r'hostManagerEventSetupDefaultsControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  HostManagerEventSetupDefaultsControllerProvider call(
    ({String organizerId, String userId}) scope,
  ) => HostManagerEventSetupDefaultsControllerProvider._(
    argument: scope,
    from: this,
  );

  @override
  String toString() => r'hostManagerEventSetupDefaultsControllerProvider';
}

abstract class _$HostManagerEventSetupDefaultsController
    extends $Notifier<HostManagerEventSetupDefaultsState> {
  late final _$args = ref.$arg as ({String organizerId, String userId});
  ({String organizerId, String userId}) get scope => _$args;

  HostManagerEventSetupDefaultsState build(
    ({String organizerId, String userId}) scope,
  );
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<
              HostManagerEventSetupDefaultsState,
              HostManagerEventSetupDefaultsState
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                HostManagerEventSetupDefaultsState,
                HostManagerEventSetupDefaultsState
              >,
              HostManagerEventSetupDefaultsState,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}
