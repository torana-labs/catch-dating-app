// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'organizer_membership_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(organizerMembershipRepository)
final organizerMembershipRepositoryProvider =
    OrganizerMembershipRepositoryProvider._();

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
        name: r'organizerMembershipRepositoryProvider',
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
      providerOverride: $SyncValueProvider<OrganizerMembershipRepository>(
        value,
      ),
    );
  }
}

String _$organizerMembershipRepositoryHash() =>
    r'0b6ae7a2d52cf8233d049f7a0661c57b263f890e';

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
         name: r'watchActiveOrganizerMembershipsForUserProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$watchActiveOrganizerMembershipsForUserHash();

  @override
  String toString() {
    return r'watchActiveOrganizerMembershipsForUserProvider'
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
    r'f77e9db353acfa45ec33b66fcfb2755918d5d39e';

final class WatchActiveOrganizerMembershipsForUserFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<OrganizerMembership>>, String> {
  WatchActiveOrganizerMembershipsForUserFamily._()
    : super(
        retry: null,
        name: r'watchActiveOrganizerMembershipsForUserProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchActiveOrganizerMembershipsForUserProvider call(String uid) =>
      WatchActiveOrganizerMembershipsForUserProvider._(
        argument: uid,
        from: this,
      );

  @override
  String toString() => r'watchActiveOrganizerMembershipsForUserProvider';
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
         name: r'watchActiveOrganizerMembershipsForOrganizerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$watchActiveOrganizerMembershipsForOrganizerHash();

  @override
  String toString() {
    return r'watchActiveOrganizerMembershipsForOrganizerProvider'
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
    r'0ab873da7306759a6823856f208716d41adb98f3';

final class WatchActiveOrganizerMembershipsForOrganizerFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<OrganizerMembership>>, String> {
  WatchActiveOrganizerMembershipsForOrganizerFamily._()
    : super(
        retry: null,
        name: r'watchActiveOrganizerMembershipsForOrganizerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchActiveOrganizerMembershipsForOrganizerProvider call(String organizerId) =>
      WatchActiveOrganizerMembershipsForOrganizerProvider._(
        argument: organizerId,
        from: this,
      );

  @override
  String toString() => r'watchActiveOrganizerMembershipsForOrganizerProvider';
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
    with
        $FutureModifier<OrganizerMembership?>,
        $StreamProvider<OrganizerMembership?> {
  WatchOrganizerMembershipProvider._({
    required WatchOrganizerMembershipFamily super.from,
    required (String, String) super.argument,
  }) : super(
         retry: null,
         name: r'watchOrganizerMembershipProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchOrganizerMembershipHash();

  @override
  String toString() {
    return r'watchOrganizerMembershipProvider'
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
    return other is WatchOrganizerMembershipProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchOrganizerMembershipHash() =>
    r'664be72036b17291c999ebeb845ae3ea22d77221';

final class WatchOrganizerMembershipFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<OrganizerMembership?>,
          (String, String)
        > {
  WatchOrganizerMembershipFamily._()
    : super(
        retry: null,
        name: r'watchOrganizerMembershipProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchOrganizerMembershipProvider call(String organizerId, String uid) =>
      WatchOrganizerMembershipProvider._(argument: (organizerId, uid), from: this);

  @override
  String toString() => r'watchOrganizerMembershipProvider';
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
        name: r'currentUserFollowedOrganizerIdsProvider',
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
    r'9e53aeba3219bd304341a078fd8147670db0f6d8';
