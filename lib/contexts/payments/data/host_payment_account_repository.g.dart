// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_payment_account_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(hostPaymentAccountRepository)
final hostPaymentAccountRepositoryProvider =
    HostPaymentAccountRepositoryProvider._();

final class HostPaymentAccountRepositoryProvider
    extends
        $FunctionalProvider<
          HostPaymentAccountRepository,
          HostPaymentAccountRepository,
          HostPaymentAccountRepository
        >
    with $Provider<HostPaymentAccountRepository> {
  HostPaymentAccountRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostPaymentAccountRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostPaymentAccountRepositoryHash();

  @$internal
  @override
  $ProviderElement<HostPaymentAccountRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostPaymentAccountRepository create(Ref ref) {
    return hostPaymentAccountRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostPaymentAccountRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostPaymentAccountRepository>(value),
    );
  }
}

String _$hostPaymentAccountRepositoryHash() =>
    r'c3f84498968d318c993f04ff28098ba27bd60d06';

@ProviderFor(watchHostPaymentAccounts)
final watchHostPaymentAccountsProvider = WatchHostPaymentAccountsFamily._();

final class WatchHostPaymentAccountsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<HostPaymentAccount>>,
          List<HostPaymentAccount>,
          Stream<List<HostPaymentAccount>>
        >
    with
        $FutureModifier<List<HostPaymentAccount>>,
        $StreamProvider<List<HostPaymentAccount>> {
  WatchHostPaymentAccountsProvider._({
    required WatchHostPaymentAccountsFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchHostPaymentAccountsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchHostPaymentAccountsHash();

  @override
  String toString() {
    return r'watchHostPaymentAccountsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<HostPaymentAccount>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<HostPaymentAccount>> create(Ref ref) {
    final argument = this.argument as String;
    return watchHostPaymentAccounts(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchHostPaymentAccountsProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchHostPaymentAccountsHash() =>
    r'98076c1378c9606dc3ea3c267d18432ae9f84726';

final class WatchHostPaymentAccountsFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<HostPaymentAccount>>, String> {
  WatchHostPaymentAccountsFamily._()
    : super(
        retry: null,
        name: r'watchHostPaymentAccountsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchHostPaymentAccountsProvider call(String uid) =>
      WatchHostPaymentAccountsProvider._(argument: uid, from: this);

  @override
  String toString() => r'watchHostPaymentAccountsProvider';
}
