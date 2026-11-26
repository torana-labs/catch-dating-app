// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_manual_payment_review_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Owns recovery and command completion for one account and selected offer.
/// The offer controller retains durable command identity and server authority.

@ProviderFor(HostManualPaymentReviewController)
final hostManualPaymentReviewControllerProvider =
    HostManualPaymentReviewControllerFamily._();

/// Owns recovery and command completion for one account and selected offer.
/// The offer controller retains durable command identity and server authority.
final class HostManualPaymentReviewControllerProvider
    extends
        $NotifierProvider<
          HostManualPaymentReviewController,
          HostManualPaymentReviewState
        > {
  /// Owns recovery and command completion for one account and selected offer.
  /// The offer controller retains durable command identity and server authority.
  HostManualPaymentReviewControllerProvider._({
    required HostManualPaymentReviewControllerFamily super.from,
    required HostManualPaymentReviewScope super.argument,
  }) : super(
         retry: null,
         name: r'hostManualPaymentReviewControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$hostManualPaymentReviewControllerHash();

  @override
  String toString() {
    return r'hostManualPaymentReviewControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  HostManualPaymentReviewController create() =>
      HostManualPaymentReviewController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostManualPaymentReviewState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostManualPaymentReviewState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostManualPaymentReviewControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostManualPaymentReviewControllerHash() =>
    r'343a6e3a3edf1671c9752776892cc96593b00386';

/// Owns recovery and command completion for one account and selected offer.
/// The offer controller retains durable command identity and server authority.

final class HostManualPaymentReviewControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          HostManualPaymentReviewController,
          HostManualPaymentReviewState,
          HostManualPaymentReviewState,
          HostManualPaymentReviewState,
          HostManualPaymentReviewScope
        > {
  HostManualPaymentReviewControllerFamily._()
    : super(
        retry: null,
        name: r'hostManualPaymentReviewControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Owns recovery and command completion for one account and selected offer.
  /// The offer controller retains durable command identity and server authority.

  HostManualPaymentReviewControllerProvider call(
    HostManualPaymentReviewScope scope,
  ) => HostManualPaymentReviewControllerProvider._(argument: scope, from: this);

  @override
  String toString() => r'hostManualPaymentReviewControllerProvider';
}

/// Owns recovery and command completion for one account and selected offer.
/// The offer controller retains durable command identity and server authority.

abstract class _$HostManualPaymentReviewController
    extends $Notifier<HostManualPaymentReviewState> {
  late final _$args = ref.$arg as HostManualPaymentReviewScope;
  HostManualPaymentReviewScope get scope => _$args;

  HostManualPaymentReviewState build(HostManualPaymentReviewScope scope);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<HostManualPaymentReviewState, HostManualPaymentReviewState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                HostManualPaymentReviewState,
                HostManualPaymentReviewState
              >,
              HostManualPaymentReviewState,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}
