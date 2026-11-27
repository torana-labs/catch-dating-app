// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_form_payment_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(HostFormPaymentController)
final hostFormPaymentControllerProvider = HostFormPaymentControllerFamily._();

final class HostFormPaymentControllerProvider
    extends
        $AsyncNotifierProvider<
          HostFormPaymentController,
          HostFormPaymentSetupState
        > {
  HostFormPaymentControllerProvider._({
    required HostFormPaymentControllerFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostFormPaymentControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostFormPaymentControllerHash();

  @override
  String toString() {
    return r'hostFormPaymentControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  HostFormPaymentController create() => HostFormPaymentController();

  @override
  bool operator ==(Object other) {
    return other is HostFormPaymentControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostFormPaymentControllerHash() =>
    r'3fabde7e2e26276d03a4d5df82942c2bc97b9194';

final class HostFormPaymentControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          HostFormPaymentController,
          AsyncValue<HostFormPaymentSetupState>,
          HostFormPaymentSetupState,
          FutureOr<HostFormPaymentSetupState>,
          String
        > {
  HostFormPaymentControllerFamily._()
    : super(
        retry: null,
        name: r'hostFormPaymentControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  HostFormPaymentControllerProvider call(String organizerId) =>
      HostFormPaymentControllerProvider._(argument: organizerId, from: this);

  @override
  String toString() => r'hostFormPaymentControllerProvider';
}

abstract class _$HostFormPaymentController
    extends $AsyncNotifier<HostFormPaymentSetupState> {
  late final _$args = ref.$arg as String;
  String get organizerId => _$args;

  FutureOr<HostFormPaymentSetupState> build(String organizerId);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<
              AsyncValue<HostFormPaymentSetupState>,
              HostFormPaymentSetupState
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<HostFormPaymentSetupState>,
                HostFormPaymentSetupState
              >,
              AsyncValue<HostFormPaymentSetupState>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}
