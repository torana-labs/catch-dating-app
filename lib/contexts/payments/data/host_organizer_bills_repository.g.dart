// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_organizer_bills_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(hostOrganizerBillsRepository)
final hostOrganizerBillsRepositoryProvider =
    HostOrganizerBillsRepositoryProvider._();

final class HostOrganizerBillsRepositoryProvider
    extends
        $FunctionalProvider<
          HostOrganizerBillsRepository,
          HostOrganizerBillsRepository,
          HostOrganizerBillsRepository
        >
    with $Provider<HostOrganizerBillsRepository> {
  HostOrganizerBillsRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostOrganizerBillsRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostOrganizerBillsRepositoryHash();

  @$internal
  @override
  $ProviderElement<HostOrganizerBillsRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostOrganizerBillsRepository create(Ref ref) {
    return hostOrganizerBillsRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostOrganizerBillsRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostOrganizerBillsRepository>(value),
    );
  }
}

String _$hostOrganizerBillsRepositoryHash() =>
    r'63d1f688aeab4969420b9b98d6ee6d2f87b1fcc2';

@ProviderFor(hostOrganizerBills)
final hostOrganizerBillsProvider = HostOrganizerBillsFamily._();

final class HostOrganizerBillsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<HostOrganizerBill>>,
          List<HostOrganizerBill>,
          FutureOr<List<HostOrganizerBill>>
        >
    with
        $FutureModifier<List<HostOrganizerBill>>,
        $FutureProvider<List<HostOrganizerBill>> {
  HostOrganizerBillsProvider._({
    required HostOrganizerBillsFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostOrganizerBillsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostOrganizerBillsHash();

  @override
  String toString() {
    return r'hostOrganizerBillsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<List<HostOrganizerBill>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<HostOrganizerBill>> create(Ref ref) {
    final argument = this.argument as String;
    return hostOrganizerBills(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is HostOrganizerBillsProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostOrganizerBillsHash() =>
    r'3d84ebb995af504c96a20e560a44ccc42bd8ae8b';

final class HostOrganizerBillsFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<List<HostOrganizerBill>>, String> {
  HostOrganizerBillsFamily._()
    : super(
        retry: null,
        name: r'hostOrganizerBillsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  HostOrganizerBillsProvider call(String organizerId) =>
      HostOrganizerBillsProvider._(argument: organizerId, from: this);

  @override
  String toString() => r'hostOrganizerBillsProvider';
}

@ProviderFor(hostOrganizerBillingStatus)
final hostOrganizerBillingStatusProvider = HostOrganizerBillingStatusFamily._();

final class HostOrganizerBillingStatusProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostOrganizerBillingStatus>,
          HostOrganizerBillingStatus,
          FutureOr<HostOrganizerBillingStatus>
        >
    with
        $FutureModifier<HostOrganizerBillingStatus>,
        $FutureProvider<HostOrganizerBillingStatus> {
  HostOrganizerBillingStatusProvider._({
    required HostOrganizerBillingStatusFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostOrganizerBillingStatusProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostOrganizerBillingStatusHash();

  @override
  String toString() {
    return r'hostOrganizerBillingStatusProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<HostOrganizerBillingStatus> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<HostOrganizerBillingStatus> create(Ref ref) {
    final argument = this.argument as String;
    return hostOrganizerBillingStatus(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is HostOrganizerBillingStatusProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostOrganizerBillingStatusHash() =>
    r'abee1c6ce076dfcc9021c269ad2116338a7542e6';

final class HostOrganizerBillingStatusFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<HostOrganizerBillingStatus>,
          String
        > {
  HostOrganizerBillingStatusFamily._()
    : super(
        retry: null,
        name: r'hostOrganizerBillingStatusProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  HostOrganizerBillingStatusProvider call(String organizerId) =>
      HostOrganizerBillingStatusProvider._(argument: organizerId, from: this);

  @override
  String toString() => r'hostOrganizerBillingStatusProvider';
}
