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
    r'81477dee56d282fc5a61a0662fabe078d82c17ec';

/// The owner's bills listener. It is a Firestore listener: it declares no
/// cache lifetime, and bill changes arrive on their own.

@ProviderFor(hostOrganizerBills)
final hostOrganizerBillsProvider = HostOrganizerBillsFamily._();

/// The owner's bills listener. It is a Firestore listener: it declares no
/// cache lifetime, and bill changes arrive on their own.

final class HostOrganizerBillsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<HostOrganizerBill>>,
          List<HostOrganizerBill>,
          Stream<List<HostOrganizerBill>>
        >
    with
        $FutureModifier<List<HostOrganizerBill>>,
        $StreamProvider<List<HostOrganizerBill>> {
  /// The owner's bills listener. It is a Firestore listener: it declares no
  /// cache lifetime, and bill changes arrive on their own.
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
  $StreamProviderElement<List<HostOrganizerBill>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<HostOrganizerBill>> create(Ref ref) {
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
    r'3b26eacb670b3ac5108eb8581a125979a6274ec8';

/// The owner's bills listener. It is a Firestore listener: it declares no
/// cache lifetime, and bill changes arrive on their own.

final class HostOrganizerBillsFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<HostOrganizerBill>>, String> {
  HostOrganizerBillsFamily._()
    : super(
        retry: null,
        name: r'hostOrganizerBillsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The owner's bills listener. It is a Firestore listener: it declares no
  /// cache lifetime, and bill changes arrive on their own.

  HostOrganizerBillsProvider call(String organizerId) =>
      HostOrganizerBillsProvider._(argument: organizerId, from: this);

  @override
  String toString() => r'hostOrganizerBillsProvider';
}

/// The owner's billing status listener.

@ProviderFor(hostOrganizerBillingStatusStream)
final hostOrganizerBillingStatusStreamProvider =
    HostOrganizerBillingStatusStreamFamily._();

/// The owner's billing status listener.

final class HostOrganizerBillingStatusStreamProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostOrganizerBillingStatus>,
          HostOrganizerBillingStatus,
          Stream<HostOrganizerBillingStatus>
        >
    with
        $FutureModifier<HostOrganizerBillingStatus>,
        $StreamProvider<HostOrganizerBillingStatus> {
  /// The owner's billing status listener.
  HostOrganizerBillingStatusStreamProvider._({
    required HostOrganizerBillingStatusStreamFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostOrganizerBillingStatusStreamProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostOrganizerBillingStatusStreamHash();

  @override
  String toString() {
    return r'hostOrganizerBillingStatusStreamProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<HostOrganizerBillingStatus> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<HostOrganizerBillingStatus> create(Ref ref) {
    final argument = this.argument as String;
    return hostOrganizerBillingStatusStream(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is HostOrganizerBillingStatusStreamProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostOrganizerBillingStatusStreamHash() =>
    r'1b500d27816c3e7f33966c7b81eb5bb2280e14db';

/// The owner's billing status listener.

final class HostOrganizerBillingStatusStreamFamily extends $Family
    with $FunctionalFamilyOverride<Stream<HostOrganizerBillingStatus>, String> {
  HostOrganizerBillingStatusStreamFamily._()
    : super(
        retry: null,
        name: r'hostOrganizerBillingStatusStreamProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The owner's billing status listener.

  HostOrganizerBillingStatusStreamProvider call(String organizerId) =>
      HostOrganizerBillingStatusStreamProvider._(
        argument: organizerId,
        from: this,
      );

  @override
  String toString() => r'hostOrganizerBillingStatusStreamProvider';
}

/// The owner's billing status, following its listener.

@ProviderFor(hostOrganizerBillingStatus)
final hostOrganizerBillingStatusProvider = HostOrganizerBillingStatusFamily._();

/// The owner's billing status, following its listener.

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
  /// The owner's billing status, following its listener.
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
    r'f537b6baa9ad1ac2a7a5207eb0c78cefb75ec87d';

/// The owner's billing status, following its listener.

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

  /// The owner's billing status, following its listener.

  HostOrganizerBillingStatusProvider call(String organizerId) =>
      HostOrganizerBillingStatusProvider._(argument: organizerId, from: this);

  @override
  String toString() => r'hostOrganizerBillingStatusProvider';
}
