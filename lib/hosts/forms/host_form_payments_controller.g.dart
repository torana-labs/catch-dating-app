// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_form_payments_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// One form's fee payments in one filter, a page at a time and live: a
/// checkout that completes, fails or is refunded moves at once.

@ProviderFor(HostFormPaymentsController)
final hostFormPaymentsControllerProvider = HostFormPaymentsControllerFamily._();

/// One form's fee payments in one filter, a page at a time and live: a
/// checkout that completes, fails or is refunded moves at once.
final class HostFormPaymentsControllerProvider
    extends
        $StreamNotifierProvider<
          HostFormPaymentsController,
          HostFormPaymentsState
        > {
  /// One form's fee payments in one filter, a page at a time and live: a
  /// checkout that completes, fails or is refunded moves at once.
  HostFormPaymentsControllerProvider._({
    required HostFormPaymentsControllerFamily super.from,
    required (String, String, HostFormPaymentFilter) super.argument,
  }) : super(
         retry: null,
         name: r'hostFormPaymentsControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostFormPaymentsControllerHash();

  @override
  String toString() {
    return r'hostFormPaymentsControllerProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  HostFormPaymentsController create() => HostFormPaymentsController();

  @override
  bool operator ==(Object other) {
    return other is HostFormPaymentsControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostFormPaymentsControllerHash() =>
    r'67503d632ddbf7960ed15e430f0a24f74bf8799d';

/// One form's fee payments in one filter, a page at a time and live: a
/// checkout that completes, fails or is refunded moves at once.

final class HostFormPaymentsControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          HostFormPaymentsController,
          AsyncValue<HostFormPaymentsState>,
          HostFormPaymentsState,
          Stream<HostFormPaymentsState>,
          (String, String, HostFormPaymentFilter)
        > {
  HostFormPaymentsControllerFamily._()
    : super(
        retry: null,
        name: r'hostFormPaymentsControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// One form's fee payments in one filter, a page at a time and live: a
  /// checkout that completes, fails or is refunded moves at once.

  HostFormPaymentsControllerProvider call(
    String organizerId,
    String formId,
    HostFormPaymentFilter filter,
  ) => HostFormPaymentsControllerProvider._(
    argument: (organizerId, formId, filter),
    from: this,
  );

  @override
  String toString() => r'hostFormPaymentsControllerProvider';
}

/// One form's fee payments in one filter, a page at a time and live: a
/// checkout that completes, fails or is refunded moves at once.

abstract class _$HostFormPaymentsController
    extends $StreamNotifier<HostFormPaymentsState> {
  late final _$args = ref.$arg as (String, String, HostFormPaymentFilter);
  String get organizerId => _$args.$1;
  String get formId => _$args.$2;
  HostFormPaymentFilter get filter => _$args.$3;

  Stream<HostFormPaymentsState> build(
    String organizerId,
    String formId,
    HostFormPaymentFilter filter,
  );
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<AsyncValue<HostFormPaymentsState>, HostFormPaymentsState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<HostFormPaymentsState>,
                HostFormPaymentsState
              >,
              AsyncValue<HostFormPaymentsState>,
              Object?,
              Object?
            >;
    return element.handleCreate(
      ref,
      () => build(_$args.$1, _$args.$2, _$args.$3),
    );
  }
}
