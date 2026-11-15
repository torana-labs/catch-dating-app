// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'guest_booking_facts_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(guestBookingFactsRepository)
final guestBookingFactsRepositoryProvider =
    GuestBookingFactsRepositoryProvider._();

final class GuestBookingFactsRepositoryProvider
    extends
        $FunctionalProvider<
          GuestBookingFactsRepository,
          GuestBookingFactsRepository,
          GuestBookingFactsRepository
        >
    with $Provider<GuestBookingFactsRepository> {
  GuestBookingFactsRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'guestBookingFactsRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$guestBookingFactsRepositoryHash();

  @$internal
  @override
  $ProviderElement<GuestBookingFactsRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  GuestBookingFactsRepository create(Ref ref) {
    return guestBookingFactsRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(GuestBookingFactsRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<GuestBookingFactsRepository>(value),
    );
  }
}

String _$guestBookingFactsRepositoryHash() =>
    r'1bd2fd1cd1b4e0d01d96787ec939d2981ea68acb';

@ProviderFor(watchGuestCommunityMemberships)
final watchGuestCommunityMembershipsProvider =
    WatchGuestCommunityMembershipsFamily._();

final class WatchGuestCommunityMembershipsProvider
    extends
        $FunctionalProvider<
          AsyncValue<Map<String, GuestCommunityMembershipState>>,
          Map<String, GuestCommunityMembershipState>,
          Stream<Map<String, GuestCommunityMembershipState>>
        >
    with
        $FutureModifier<Map<String, GuestCommunityMembershipState>>,
        $StreamProvider<Map<String, GuestCommunityMembershipState>> {
  WatchGuestCommunityMembershipsProvider._({
    required WatchGuestCommunityMembershipsFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchGuestCommunityMembershipsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchGuestCommunityMembershipsHash();

  @override
  String toString() {
    return r'watchGuestCommunityMembershipsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<Map<String, GuestCommunityMembershipState>>
  $createElement($ProviderPointer pointer) => $StreamProviderElement(pointer);

  @override
  Stream<Map<String, GuestCommunityMembershipState>> create(Ref ref) {
    final argument = this.argument as String;
    return watchGuestCommunityMemberships(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchGuestCommunityMembershipsProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchGuestCommunityMembershipsHash() =>
    r'950af1404fd1e775760273daac5547176298f1fc';

final class WatchGuestCommunityMembershipsFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<Map<String, GuestCommunityMembershipState>>,
          String
        > {
  WatchGuestCommunityMembershipsFamily._()
    : super(
        retry: null,
        name: r'watchGuestCommunityMembershipsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchGuestCommunityMembershipsProvider call(String uid) =>
      WatchGuestCommunityMembershipsProvider._(argument: uid, from: this);

  @override
  String toString() => r'watchGuestCommunityMembershipsProvider';
}
