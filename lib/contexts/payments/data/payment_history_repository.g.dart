// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'payment_history_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(paymentHistoryRepository)
final paymentHistoryRepositoryProvider = PaymentHistoryRepositoryProvider._();

final class PaymentHistoryRepositoryProvider
    extends
        $FunctionalProvider<
          PaymentHistoryRepository,
          PaymentHistoryRepository,
          PaymentHistoryRepository
        >
    with $Provider<PaymentHistoryRepository> {
  PaymentHistoryRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'paymentHistoryRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$paymentHistoryRepositoryHash();

  @$internal
  @override
  $ProviderElement<PaymentHistoryRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  PaymentHistoryRepository create(Ref ref) {
    return paymentHistoryRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(PaymentHistoryRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<PaymentHistoryRepository>(value),
    );
  }
}

String _$paymentHistoryRepositoryHash() =>
    r'ef7852ab07a7d3f9357f0594a54845a4e3e3f85f';

@ProviderFor(watchPaymentsForUser)
final watchPaymentsForUserProvider = WatchPaymentsForUserFamily._();

final class WatchPaymentsForUserProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<Payment>>,
          List<Payment>,
          Stream<List<Payment>>
        >
    with $FutureModifier<List<Payment>>, $StreamProvider<List<Payment>> {
  WatchPaymentsForUserProvider._({
    required WatchPaymentsForUserFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchPaymentsForUserProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchPaymentsForUserHash();

  @override
  String toString() {
    return r'watchPaymentsForUserProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<Payment>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<Payment>> create(Ref ref) {
    final argument = this.argument as String;
    return watchPaymentsForUser(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchPaymentsForUserProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchPaymentsForUserHash() =>
    r'c8f75c6b9c0225e39b1bbc1a84a3d35c98f41c52';

final class WatchPaymentsForUserFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<Payment>>, String> {
  WatchPaymentsForUserFamily._()
    : super(
        retry: null,
        name: r'watchPaymentsForUserProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchPaymentsForUserProvider call(String userId) =>
      WatchPaymentsForUserProvider._(argument: userId, from: this);

  @override
  String toString() => r'watchPaymentsForUserProvider';
}

@ProviderFor(watchPayment)
final watchPaymentProvider = WatchPaymentFamily._();

final class WatchPaymentProvider
    extends
        $FunctionalProvider<AsyncValue<Payment?>, Payment?, Stream<Payment?>>
    with $FutureModifier<Payment?>, $StreamProvider<Payment?> {
  WatchPaymentProvider._({
    required WatchPaymentFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchPaymentProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchPaymentHash();

  @override
  String toString() {
    return r'watchPaymentProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<Payment?> $createElement($ProviderPointer pointer) =>
      $StreamProviderElement(pointer);

  @override
  Stream<Payment?> create(Ref ref) {
    final argument = this.argument as String;
    return watchPayment(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchPaymentProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchPaymentHash() => r'a1add75d02a9d3fb0ce41f6f327b658c52f4da84';

final class WatchPaymentFamily extends $Family
    with $FunctionalFamilyOverride<Stream<Payment?>, String> {
  WatchPaymentFamily._()
    : super(
        retry: null,
        name: r'watchPaymentProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchPaymentProvider call(String paymentId) =>
      WatchPaymentProvider._(argument: paymentId, from: this);

  @override
  String toString() => r'watchPaymentProvider';
}
