// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_event_offer_workspace_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(HostEventOfferWorkspaceController)
final hostEventOfferWorkspaceControllerProvider =
    HostEventOfferWorkspaceControllerFamily._();

final class HostEventOfferWorkspaceControllerProvider
    extends
        $NotifierProvider<
          HostEventOfferWorkspaceController,
          HostEventOfferWorkspaceState
        > {
  HostEventOfferWorkspaceControllerProvider._({
    required HostEventOfferWorkspaceControllerFamily super.from,
    required HostEventOfferWorkspaceScope super.argument,
  }) : super(
         retry: null,
         name: r'hostEventOfferWorkspaceControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  static final $allTransitiveDependencies0 =
      hostEventOfferWorkspaceDependenciesProvider;

  @override
  String debugGetCreateSourceHash() =>
      _$hostEventOfferWorkspaceControllerHash();

  @override
  String toString() {
    return r'hostEventOfferWorkspaceControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  HostEventOfferWorkspaceController create() =>
      HostEventOfferWorkspaceController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostEventOfferWorkspaceState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostEventOfferWorkspaceState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostEventOfferWorkspaceControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostEventOfferWorkspaceControllerHash() =>
    r'275905ea191e7e12e039027a6d46211d2f4cb11d';

final class HostEventOfferWorkspaceControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          HostEventOfferWorkspaceController,
          HostEventOfferWorkspaceState,
          HostEventOfferWorkspaceState,
          HostEventOfferWorkspaceState,
          HostEventOfferWorkspaceScope
        > {
  HostEventOfferWorkspaceControllerFamily._()
    : super(
        retry: null,
        name: r'hostEventOfferWorkspaceControllerProvider',
        dependencies: <ProviderOrFamily>[
          hostEventOfferWorkspaceDependenciesProvider,
        ],
        $allTransitiveDependencies: <ProviderOrFamily>[
          HostEventOfferWorkspaceControllerProvider.$allTransitiveDependencies0,
        ],
        isAutoDispose: true,
      );

  HostEventOfferWorkspaceControllerProvider call(
    HostEventOfferWorkspaceScope scope,
  ) => HostEventOfferWorkspaceControllerProvider._(argument: scope, from: this);

  @override
  String toString() => r'hostEventOfferWorkspaceControllerProvider';
}

abstract class _$HostEventOfferWorkspaceController
    extends $Notifier<HostEventOfferWorkspaceState> {
  late final _$args = ref.$arg as HostEventOfferWorkspaceScope;
  HostEventOfferWorkspaceScope get scope => _$args;

  HostEventOfferWorkspaceState build(HostEventOfferWorkspaceScope scope);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<HostEventOfferWorkspaceState, HostEventOfferWorkspaceState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                HostEventOfferWorkspaceState,
                HostEventOfferWorkspaceState
              >,
              HostEventOfferWorkspaceState,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}

@ProviderFor(hostEventOfferWorkspaceDependencies)
final hostEventOfferWorkspaceDependenciesProvider =
    HostEventOfferWorkspaceDependenciesFamily._();

final class HostEventOfferWorkspaceDependenciesProvider
    extends
        $FunctionalProvider<
          HostEventOfferWorkspaceDependencies,
          HostEventOfferWorkspaceDependencies,
          HostEventOfferWorkspaceDependencies
        >
    with $Provider<HostEventOfferWorkspaceDependencies> {
  HostEventOfferWorkspaceDependenciesProvider._({
    required HostEventOfferWorkspaceDependenciesFamily super.from,
    required HostEventOfferWorkspaceScope super.argument,
  }) : super(
         retry: null,
         name: r'hostEventOfferWorkspaceDependenciesProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$hostEventOfferWorkspaceDependenciesHash();

  @override
  String toString() {
    return r'hostEventOfferWorkspaceDependenciesProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<HostEventOfferWorkspaceDependencies> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostEventOfferWorkspaceDependencies create(Ref ref) {
    final argument = this.argument as HostEventOfferWorkspaceScope;
    return hostEventOfferWorkspaceDependencies(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostEventOfferWorkspaceDependencies value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostEventOfferWorkspaceDependencies>(
        value,
      ),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostEventOfferWorkspaceDependenciesProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostEventOfferWorkspaceDependenciesHash() =>
    r'854d741a1babd2e7a5e676518ac78b0600ca7b67';

final class HostEventOfferWorkspaceDependenciesFamily extends $Family
    with
        $FunctionalFamilyOverride<
          HostEventOfferWorkspaceDependencies,
          HostEventOfferWorkspaceScope
        > {
  HostEventOfferWorkspaceDependenciesFamily._()
    : super(
        retry: null,
        name: r'hostEventOfferWorkspaceDependenciesProvider',
        dependencies: <ProviderOrFamily>[],
        $allTransitiveDependencies: <ProviderOrFamily>[],
        isAutoDispose: true,
      );

  HostEventOfferWorkspaceDependenciesProvider call(
    HostEventOfferWorkspaceScope scope,
  ) => HostEventOfferWorkspaceDependenciesProvider._(
    argument: scope,
    from: this,
  );

  @override
  String toString() => r'hostEventOfferWorkspaceDependenciesProvider';
}
