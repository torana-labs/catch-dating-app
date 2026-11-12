// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'organizer_follow_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(organizerFollowRepository)
final organizerFollowRepositoryProvider = OrganizerFollowRepositoryProvider._();

final class OrganizerFollowRepositoryProvider
    extends
        $FunctionalProvider<
          OrganizerFollowRepository,
          OrganizerFollowRepository,
          OrganizerFollowRepository
        >
    with $Provider<OrganizerFollowRepository> {
  OrganizerFollowRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'organizerFollowRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$organizerFollowRepositoryHash();

  @$internal
  @override
  $ProviderElement<OrganizerFollowRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  OrganizerFollowRepository create(Ref ref) {
    return organizerFollowRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(OrganizerFollowRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<OrganizerFollowRepository>(value),
    );
  }
}

String _$organizerFollowRepositoryHash() =>
    r'7556db3789a0d457fc0537be9a0da8bc52562a8f';

@ProviderFor(watchActiveOrganizerFollowsForUser)
final watchActiveOrganizerFollowsForUserProvider =
    WatchActiveOrganizerFollowsForUserFamily._();

final class WatchActiveOrganizerFollowsForUserProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<OrganizerFollow>>,
          List<OrganizerFollow>,
          Stream<List<OrganizerFollow>>
        >
    with
        $FutureModifier<List<OrganizerFollow>>,
        $StreamProvider<List<OrganizerFollow>> {
  WatchActiveOrganizerFollowsForUserProvider._({
    required WatchActiveOrganizerFollowsForUserFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchActiveOrganizerFollowsForUserProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$watchActiveOrganizerFollowsForUserHash();

  @override
  String toString() {
    return r'watchActiveOrganizerFollowsForUserProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<OrganizerFollow>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<OrganizerFollow>> create(Ref ref) {
    final argument = this.argument as String;
    return watchActiveOrganizerFollowsForUser(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchActiveOrganizerFollowsForUserProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchActiveOrganizerFollowsForUserHash() =>
    r'83e5374edf0c14a13befdcd01318983e90657006';

final class WatchActiveOrganizerFollowsForUserFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<OrganizerFollow>>, String> {
  WatchActiveOrganizerFollowsForUserFamily._()
    : super(
        retry: null,
        name: r'watchActiveOrganizerFollowsForUserProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchActiveOrganizerFollowsForUserProvider call(String uid) =>
      WatchActiveOrganizerFollowsForUserProvider._(argument: uid, from: this);

  @override
  String toString() => r'watchActiveOrganizerFollowsForUserProvider';
}

@ProviderFor(watchActiveOrganizerFollowsForOrganizer)
final watchActiveOrganizerFollowsForOrganizerProvider =
    WatchActiveOrganizerFollowsForOrganizerFamily._();

final class WatchActiveOrganizerFollowsForOrganizerProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<OrganizerFollow>>,
          List<OrganizerFollow>,
          Stream<List<OrganizerFollow>>
        >
    with
        $FutureModifier<List<OrganizerFollow>>,
        $StreamProvider<List<OrganizerFollow>> {
  WatchActiveOrganizerFollowsForOrganizerProvider._({
    required WatchActiveOrganizerFollowsForOrganizerFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchActiveOrganizerFollowsForOrganizerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$watchActiveOrganizerFollowsForOrganizerHash();

  @override
  String toString() {
    return r'watchActiveOrganizerFollowsForOrganizerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<OrganizerFollow>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<OrganizerFollow>> create(Ref ref) {
    final argument = this.argument as String;
    return watchActiveOrganizerFollowsForOrganizer(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchActiveOrganizerFollowsForOrganizerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchActiveOrganizerFollowsForOrganizerHash() =>
    r'0fdd32524f79e49c893be6f11cbfdf1671c931b3';

final class WatchActiveOrganizerFollowsForOrganizerFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<OrganizerFollow>>, String> {
  WatchActiveOrganizerFollowsForOrganizerFamily._()
    : super(
        retry: null,
        name: r'watchActiveOrganizerFollowsForOrganizerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchActiveOrganizerFollowsForOrganizerProvider call(String organizerId) =>
      WatchActiveOrganizerFollowsForOrganizerProvider._(
        argument: organizerId,
        from: this,
      );

  @override
  String toString() => r'watchActiveOrganizerFollowsForOrganizerProvider';
}

@ProviderFor(watchOrganizerFollow)
final watchOrganizerFollowProvider = WatchOrganizerFollowFamily._();

final class WatchOrganizerFollowProvider
    extends
        $FunctionalProvider<
          AsyncValue<OrganizerFollow?>,
          OrganizerFollow?,
          Stream<OrganizerFollow?>
        >
    with $FutureModifier<OrganizerFollow?>, $StreamProvider<OrganizerFollow?> {
  WatchOrganizerFollowProvider._({
    required WatchOrganizerFollowFamily super.from,
    required (String, String) super.argument,
  }) : super(
         retry: null,
         name: r'watchOrganizerFollowProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchOrganizerFollowHash();

  @override
  String toString() {
    return r'watchOrganizerFollowProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $StreamProviderElement<OrganizerFollow?> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<OrganizerFollow?> create(Ref ref) {
    final argument = this.argument as (String, String);
    return watchOrganizerFollow(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchOrganizerFollowProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchOrganizerFollowHash() =>
    r'0100b51cb1339ec4fbeb9d14ffda2750d72649fe';

final class WatchOrganizerFollowFamily extends $Family
    with $FunctionalFamilyOverride<Stream<OrganizerFollow?>, (String, String)> {
  WatchOrganizerFollowFamily._()
    : super(
        retry: null,
        name: r'watchOrganizerFollowProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchOrganizerFollowProvider call(String organizerId, String uid) =>
      WatchOrganizerFollowProvider._(argument: (organizerId, uid), from: this);

  @override
  String toString() => r'watchOrganizerFollowProvider';
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
    r'168a8d1c805405fa318f5cc301bbe056ba3bbd93';
