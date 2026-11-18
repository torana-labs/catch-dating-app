// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_event_offer_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(hostEventOfferDependencies)
final hostEventOfferDependenciesProvider =
    HostEventOfferDependenciesProvider._();

final class HostEventOfferDependenciesProvider
    extends
        $FunctionalProvider<
          HostEventOfferDependencies,
          HostEventOfferDependencies,
          HostEventOfferDependencies
        >
    with $Provider<HostEventOfferDependencies> {
  HostEventOfferDependenciesProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostEventOfferDependenciesProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostEventOfferDependenciesHash();

  @$internal
  @override
  $ProviderElement<HostEventOfferDependencies> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostEventOfferDependencies create(Ref ref) {
    return hostEventOfferDependencies(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostEventOfferDependencies value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostEventOfferDependencies>(value),
    );
  }
}

String _$hostEventOfferDependenciesHash() =>
    r'198b5f658d5d13f269972cd70b70a6933738e239';

@ProviderFor(HostEventOfferController)
final hostEventOfferControllerProvider = HostEventOfferControllerFamily._();

final class HostEventOfferControllerProvider
    extends $NotifierProvider<HostEventOfferController, HostOfferFlowView> {
  HostEventOfferControllerProvider._({
    required HostEventOfferControllerFamily super.from,
    required HostEventOfferScope super.argument,
  }) : super(
         retry: null,
         name: r'hostEventOfferControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostEventOfferControllerHash();

  @override
  String toString() {
    return r'hostEventOfferControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  HostEventOfferController create() => HostEventOfferController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostOfferFlowView value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostOfferFlowView>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostEventOfferControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostEventOfferControllerHash() =>
    r'52f9ee8e75f7ff19b48f5cb08881b4da9d64de70';

final class HostEventOfferControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          HostEventOfferController,
          HostOfferFlowView,
          HostOfferFlowView,
          HostOfferFlowView,
          HostEventOfferScope
        > {
  HostEventOfferControllerFamily._()
    : super(
        retry: null,
        name: r'hostEventOfferControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  HostEventOfferControllerProvider call(HostEventOfferScope scope) =>
      HostEventOfferControllerProvider._(argument: scope, from: this);

  @override
  String toString() => r'hostEventOfferControllerProvider';
}

abstract class _$HostEventOfferController extends $Notifier<HostOfferFlowView> {
  late final _$args = ref.$arg as HostEventOfferScope;
  HostEventOfferScope get scope => _$args;

  HostOfferFlowView build(HostEventOfferScope scope);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<HostOfferFlowView, HostOfferFlowView>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<HostOfferFlowView, HostOfferFlowView>,
              HostOfferFlowView,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}
