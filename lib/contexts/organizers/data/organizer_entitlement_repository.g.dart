// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'organizer_entitlement_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(organizerEntitlementRepository)
final organizerEntitlementRepositoryProvider =
    OrganizerEntitlementRepositoryProvider._();

final class OrganizerEntitlementRepositoryProvider
    extends
        $FunctionalProvider<
          OrganizerEntitlementRepository,
          OrganizerEntitlementRepository,
          OrganizerEntitlementRepository
        >
    with $Provider<OrganizerEntitlementRepository> {
  OrganizerEntitlementRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'organizerEntitlementRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$organizerEntitlementRepositoryHash();

  @$internal
  @override
  $ProviderElement<OrganizerEntitlementRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  OrganizerEntitlementRepository create(Ref ref) {
    return organizerEntitlementRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(OrganizerEntitlementRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<OrganizerEntitlementRepository>(
        value,
      ),
    );
  }
}

String _$organizerEntitlementRepositoryHash() =>
    r'f8bdd7c8ca942961ac1670b221ecbc168f09e050';

/// The signed-in manager's view of one organiser's plan grants.

@ProviderFor(organizerEntitlement)
final organizerEntitlementProvider = OrganizerEntitlementFamily._();

/// The signed-in manager's view of one organiser's plan grants.

final class OrganizerEntitlementProvider
    extends
        $FunctionalProvider<
          AsyncValue<OrganizerEntitlement>,
          OrganizerEntitlement,
          FutureOr<OrganizerEntitlement>
        >
    with
        $FutureModifier<OrganizerEntitlement>,
        $FutureProvider<OrganizerEntitlement> {
  /// The signed-in manager's view of one organiser's plan grants.
  OrganizerEntitlementProvider._({
    required OrganizerEntitlementFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'organizerEntitlementProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$organizerEntitlementHash();

  @override
  String toString() {
    return r'organizerEntitlementProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<OrganizerEntitlement> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<OrganizerEntitlement> create(Ref ref) {
    final argument = this.argument as String;
    return organizerEntitlement(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is OrganizerEntitlementProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$organizerEntitlementHash() =>
    r'1dec2fb806a4f8c0751a2b73d5fc145f7cd5a2a5';

/// The signed-in manager's view of one organiser's plan grants.

final class OrganizerEntitlementFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<OrganizerEntitlement>, String> {
  OrganizerEntitlementFamily._()
    : super(
        retry: null,
        name: r'organizerEntitlementProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The signed-in manager's view of one organiser's plan grants.

  OrganizerEntitlementProvider call(String organizerId) =>
      OrganizerEntitlementProvider._(argument: organizerId, from: this);

  @override
  String toString() => r'organizerEntitlementProvider';
}
