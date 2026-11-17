// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'payment_history_view_model.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(paymentHistoryViewModel)
final paymentHistoryViewModelProvider = PaymentHistoryViewModelFamily._();

final class PaymentHistoryViewModelProvider
    extends
        $FunctionalProvider<
          AsyncValue<PaymentHistoryViewModel>,
          AsyncValue<PaymentHistoryViewModel>,
          AsyncValue<PaymentHistoryViewModel>
        >
    with $Provider<AsyncValue<PaymentHistoryViewModel>> {
  PaymentHistoryViewModelProvider._({
    required PaymentHistoryViewModelFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'paymentHistoryViewModelProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$paymentHistoryViewModelHash();

  @override
  String toString() {
    return r'paymentHistoryViewModelProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<AsyncValue<PaymentHistoryViewModel>> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  AsyncValue<PaymentHistoryViewModel> create(Ref ref) {
    final argument = this.argument as String;
    return paymentHistoryViewModel(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AsyncValue<PaymentHistoryViewModel> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<AsyncValue<PaymentHistoryViewModel>>(
        value,
      ),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is PaymentHistoryViewModelProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$paymentHistoryViewModelHash() =>
    r'a34fffefec69cca6318440dd493205186584a46d';

final class PaymentHistoryViewModelFamily extends $Family
    with
        $FunctionalFamilyOverride<AsyncValue<PaymentHistoryViewModel>, String> {
  PaymentHistoryViewModelFamily._()
    : super(
        retry: null,
        name: r'paymentHistoryViewModelProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  PaymentHistoryViewModelProvider call(String userId) =>
      PaymentHistoryViewModelProvider._(argument: userId, from: this);

  @override
  String toString() => r'paymentHistoryViewModelProvider';
}
