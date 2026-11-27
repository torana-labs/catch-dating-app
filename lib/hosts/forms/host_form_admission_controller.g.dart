// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_form_admission_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(hostFormAdmissionDependencies)
final hostFormAdmissionDependenciesProvider =
    HostFormAdmissionDependenciesProvider._();

final class HostFormAdmissionDependenciesProvider
    extends
        $FunctionalProvider<
          HostFormAdmissionDependencies,
          HostFormAdmissionDependencies,
          HostFormAdmissionDependencies
        >
    with $Provider<HostFormAdmissionDependencies> {
  HostFormAdmissionDependenciesProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostFormAdmissionDependenciesProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostFormAdmissionDependenciesHash();

  @$internal
  @override
  $ProviderElement<HostFormAdmissionDependencies> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostFormAdmissionDependencies create(Ref ref) {
    return hostFormAdmissionDependencies(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostFormAdmissionDependencies value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostFormAdmissionDependencies>(
        value,
      ),
    );
  }
}

String _$hostFormAdmissionDependenciesHash() =>
    r'527704251097c64c294d84953abd6544c4249714';

@ProviderFor(HostFormAdmissionController)
final hostFormAdmissionControllerProvider =
    HostFormAdmissionControllerFamily._();

final class HostFormAdmissionControllerProvider
    extends
        $NotifierProvider<HostFormAdmissionController, HostFormAdmissionState> {
  HostFormAdmissionControllerProvider._({
    required HostFormAdmissionControllerFamily super.from,
    required HostFormAdmissionSession super.argument,
  }) : super(
         retry: null,
         name: r'hostFormAdmissionControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostFormAdmissionControllerHash();

  @override
  String toString() {
    return r'hostFormAdmissionControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  HostFormAdmissionController create() => HostFormAdmissionController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostFormAdmissionState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostFormAdmissionState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostFormAdmissionControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostFormAdmissionControllerHash() =>
    r'2b8d900a7c1f15b4eb92cdd1ba5e76db42ae4d35';

final class HostFormAdmissionControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          HostFormAdmissionController,
          HostFormAdmissionState,
          HostFormAdmissionState,
          HostFormAdmissionState,
          HostFormAdmissionSession
        > {
  HostFormAdmissionControllerFamily._()
    : super(
        retry: null,
        name: r'hostFormAdmissionControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  HostFormAdmissionControllerProvider call(HostFormAdmissionSession session) =>
      HostFormAdmissionControllerProvider._(argument: session, from: this);

  @override
  String toString() => r'hostFormAdmissionControllerProvider';
}

abstract class _$HostFormAdmissionController
    extends $Notifier<HostFormAdmissionState> {
  late final _$args = ref.$arg as HostFormAdmissionSession;
  HostFormAdmissionSession get session => _$args;

  HostFormAdmissionState build(HostFormAdmissionSession session);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref as $Ref<HostFormAdmissionState, HostFormAdmissionState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<HostFormAdmissionState, HostFormAdmissionState>,
              HostFormAdmissionState,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}
