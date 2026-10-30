// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'organizer_membership_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(organizerMembershipRepository)
final organizerMembershipRepositoryProvider = OrganizerMembershipRepositoryProvider._();

final class OrganizerMembershipRepositoryProvider
    extends
        $FunctionalProvider<
          OrganizerMembershipRepository,
          OrganizerMembershipRepository,
          OrganizerMembershipRepository
        >
    with $Provider<OrganizerMembershipRepository> {
  OrganizerMembershipRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'clubMembershipRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$organizerMembershipRepositoryHash();

  @$internal
  @override
  $ProviderElement<OrganizerMembershipRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  OrganizerMembershipRepository create(Ref ref) {
    return organizerMembershipRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(OrganizerMembershipRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<OrganizerMembershipRepository>(value),
    );
  }
}

String _$organizerMembershipRepositoryHash() =>
    r'0bdb64b7254031efa7d7aa84b0eabb87f9d5a2a8';

@ProviderFor(watchActiveOrganizerMembershipsForUser)
final watchActiveOrganizerMembershipsForUserProvider =
    WatchActiveOrganizerMembershipsForUserFamily._();

final class WatchActiveOrganizerMembershipsForUserProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<OrganizerMembership>>,
          List<OrganizerMembership>,
          Stream<List<OrganizerMembership>>
        >
    with
        $FutureModifier<List<OrganizerMembership>>,
        $StreamProvider<List<OrganizerMembership>> {
  WatchActiveOrganizerMembershipsForUserProvider._({
    required WatchActiveOrganizerMembershipsForUserFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchActiveClubMembershipsForUserProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$watchActiveOrganizerMembershipsForUserHash();

  @override
  String toString() {
    return r'watchActiveClubMembershipsForUserProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<OrganizerMembership>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<OrganizerMembership>> create(Ref ref) {
    final argument = this.argument as String;
    return watchActiveOrganizerMembershipsForUser(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchActiveOrganizerMembershipsForUserProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchActiveOrganizerMembershipsForUserHash() =>
    r'265f813ea75b6fe6bf29edb857ccf3eedabc4621';

final class WatchActiveOrganizerMembershipsForUserFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<OrganizerMembership>>, String> {
  WatchActiveOrganizerMembershipsForUserFamily._()
    : super(
        retry: null,
        name: r'watchActiveClubMembershipsForUserProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchActiveOrganizerMembershipsForUserProvider call(String uid) =>
      WatchActiveOrganizerMembershipsForUserProvider._(argument: uid, from: this);

  @override
  String toString() => r'watchActiveClubMembershipsForUserProvider';
}

@ProviderFor(watchActiveOrganizerMembershipsForOrganizer)
final watchActiveOrganizerMembershipsForOrganizerProvider =
    WatchActiveOrganizerMembershipsForOrganizerFamily._();

final class WatchActiveOrganizerMembershipsForOrganizerProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<OrganizerMembership>>,
          List<OrganizerMembership>,
          Stream<List<OrganizerMembership>>
        >
    with
        $FutureModifier<List<OrganizerMembership>>,
        $StreamProvider<List<OrganizerMembership>> {
  WatchActiveOrganizerMembershipsForOrganizerProvider._({
    required WatchActiveOrganizerMembershipsForOrganizerFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchActiveClubMembershipsForClubProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$watchActiveOrganizerMembershipsForOrganizerHash();

  @override
  String toString() {
    return r'watchActiveClubMembershipsForClubProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<OrganizerMembership>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<OrganizerMembership>> create(Ref ref) {
    final argument = this.argument as String;
    return watchActiveOrganizerMembershipsForOrganizer(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchActiveOrganizerMembershipsForOrganizerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchActiveOrganizerMembershipsForOrganizerHash() =>
    r'8534f19fddfc838af6c8a7ebc872129abbc5c83a';

final class WatchActiveOrganizerMembershipsForOrganizerFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<OrganizerMembership>>, String> {
  WatchActiveOrganizerMembershipsForOrganizerFamily._()
    : super(
        retry: null,
        name: r'watchActiveClubMembershipsForClubProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchActiveOrganizerMembershipsForOrganizerProvider call(String clubId) =>
      WatchActiveOrganizerMembershipsForOrganizerProvider._(argument: clubId, from: this);

  @override
  String toString() => r'watchActiveClubMembershipsForClubProvider';
}

@ProviderFor(watchOrganizerMembership)
final watchOrganizerMembershipProvider = WatchOrganizerMembershipFamily._();

final class WatchOrganizerMembershipProvider
    extends
        $FunctionalProvider<
          AsyncValue<OrganizerMembership?>,
          OrganizerMembership?,
          Stream<OrganizerMembership?>
        >
    with $FutureModifier<OrganizerMembership?>, $StreamProvider<OrganizerMembership?> {
  WatchOrganizerMembershipProvider._({
    required WatchOrganizerMembershipFamily super.from,
    required (String, String) super.argument,
  }) : super(
         retry: null,
         name: r'watchClubMembershipProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchOrganizerMembershipHash();

  @override
  String toString() {
    return r'watchClubMembershipProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $StreamProviderElement<OrganizerMembership?> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<OrganizerMembership?> create(Ref ref) {
    final argument = this.argument as (String, String);
    return watchOrganizerMembership(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchOrganizerMembershipProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchOrganizerMembershipHash() =>
    r'4d727a070d21269f45abdb811b9365f3ad832637';

final class WatchOrganizerMembershipFamily extends $Family
    with $FunctionalFamilyOverride<Stream<OrganizerMembership?>, (String, String)> {
  WatchOrganizerMembershipFamily._()
    : super(
        retry: null,
        name: r'watchClubMembershipProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchOrganizerMembershipProvider call(String clubId, String uid) =>
      WatchOrganizerMembershipProvider._(argument: (clubId, uid), from: this);

  @override
  String toString() => r'watchClubMembershipProvider';
}

@ProviderFor(currentUserFollowedOrganizerIds)
final currentUserFollowedOrganizerIdsProvider =
    CurrentUserFollowedOrganizerIdsProvider._();

final class CurrentUserFollowedOrganizerIdsProvider
    extends
        $FunctionalProvider<
          AsyncValue<Set<String>>,
          AsyncValue<Set<String>>,
          AsyncValue<Set<String>>
        >
    with $Provider<AsyncValue<Set<String>>> {
  CurrentUserFollowedOrganizerIdsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'currentUserFollowedClubIdsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$currentUserFollowedOrganizerIdsHash();

  @$internal
  @override
  $ProviderElement<AsyncValue<Set<String>>> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  AsyncValue<Set<String>> create(Ref ref) {
    return currentUserFollowedOrganizerIds(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AsyncValue<Set<String>> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<AsyncValue<Set<String>>>(value),
    );
  }
}

String _$currentUserFollowedOrganizerIdsHash() =>
    r'e5e4c6a9273db441397b74a35876969498099962';
