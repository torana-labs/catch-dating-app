// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'organizers_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(organizersRepository)
final organizersRepositoryProvider = OrganizersRepositoryProvider._();

final class OrganizersRepositoryProvider
    extends
        $FunctionalProvider<OrganizersRepository, OrganizersRepository, OrganizersRepository>
    with $Provider<OrganizersRepository> {
  OrganizersRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'clubsRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$organizersRepositoryHash();

  @$internal
  @override
  $ProviderElement<OrganizersRepository> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  OrganizersRepository create(Ref ref) {
    return organizersRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(OrganizersRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<OrganizersRepository>(value),
    );
  }
}

String _$organizersRepositoryHash() => r'd5c0011e3ab9214aec9e91f81c5ff073ce0f3cca';

@ProviderFor(watchOrganizer)
final watchOrganizerProvider = WatchOrganizerFamily._();

final class WatchOrganizerProvider
    extends $FunctionalProvider<AsyncValue<Organizer?>, Organizer?, Stream<Organizer?>>
    with $FutureModifier<Organizer?>, $StreamProvider<Organizer?> {
  WatchOrganizerProvider._({
    required WatchOrganizerFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchClubProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchOrganizerHash();

  @override
  String toString() {
    return r'watchClubProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<Organizer?> $createElement($ProviderPointer pointer) =>
      $StreamProviderElement(pointer);

  @override
  Stream<Organizer?> create(Ref ref) {
    final argument = this.argument as String;
    return watchOrganizer(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchOrganizerProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchOrganizerHash() => r'595f1b7e4ea99cb75600b39d84baa61f5d680b0e';

final class WatchOrganizerFamily extends $Family
    with $FunctionalFamilyOverride<Stream<Organizer?>, String> {
  WatchOrganizerFamily._()
    : super(
        retry: null,
        name: r'watchClubProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchOrganizerProvider call(String id) =>
      WatchOrganizerProvider._(argument: id, from: this);

  @override
  String toString() => r'watchClubProvider';
}

@ProviderFor(watchOrganizersByLocation)
final watchOrganizersByLocationProvider = WatchOrganizersByLocationFamily._();

final class WatchOrganizersByLocationProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<Organizer>>,
          List<Organizer>,
          Stream<List<Organizer>>
        >
    with $FutureModifier<List<Organizer>>, $StreamProvider<List<Organizer>> {
  WatchOrganizersByLocationProvider._({
    required WatchOrganizersByLocationFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchClubsByLocationProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchOrganizersByLocationHash();

  @override
  String toString() {
    return r'watchClubsByLocationProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<Organizer>> $createElement($ProviderPointer pointer) =>
      $StreamProviderElement(pointer);

  @override
  Stream<List<Organizer>> create(Ref ref) {
    final argument = this.argument as String;
    return watchOrganizersByLocation(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchOrganizersByLocationProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchOrganizersByLocationHash() =>
    r'66d4bf98e32e589a19902448a858f99b5d0cf50e';

final class WatchOrganizersByLocationFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<Organizer>>, String> {
  WatchOrganizersByLocationFamily._()
    : super(
        retry: null,
        name: r'watchClubsByLocationProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchOrganizersByLocationProvider call(String location) =>
      WatchOrganizersByLocationProvider._(argument: location, from: this);

  @override
  String toString() => r'watchClubsByLocationProvider';
}

@ProviderFor(watchOrganizersByLocationSortedByRating)
final watchOrganizersByLocationSortedByRatingProvider =
    WatchOrganizersByLocationSortedByRatingFamily._();

final class WatchOrganizersByLocationSortedByRatingProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<Organizer>>,
          List<Organizer>,
          Stream<List<Organizer>>
        >
    with $FutureModifier<List<Organizer>>, $StreamProvider<List<Organizer>> {
  WatchOrganizersByLocationSortedByRatingProvider._({
    required WatchOrganizersByLocationSortedByRatingFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchClubsByLocationSortedByRatingProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$watchOrganizersByLocationSortedByRatingHash();

  @override
  String toString() {
    return r'watchClubsByLocationSortedByRatingProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<Organizer>> $createElement($ProviderPointer pointer) =>
      $StreamProviderElement(pointer);

  @override
  Stream<List<Organizer>> create(Ref ref) {
    final argument = this.argument as String;
    return watchOrganizersByLocationSortedByRating(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchOrganizersByLocationSortedByRatingProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchOrganizersByLocationSortedByRatingHash() =>
    r'be5812eb9d8ab67139d5f0bef9b61069d2ef9077';

final class WatchOrganizersByLocationSortedByRatingFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<Organizer>>, String> {
  WatchOrganizersByLocationSortedByRatingFamily._()
    : super(
        retry: null,
        name: r'watchClubsByLocationSortedByRatingProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchOrganizersByLocationSortedByRatingProvider call(String location) =>
      WatchOrganizersByLocationSortedByRatingProvider._(
        argument: location,
        from: this,
      );

  @override
  String toString() => r'watchClubsByLocationSortedByRatingProvider';
}

@ProviderFor(watchOrganizersHostedBy)
final watchOrganizersHostedByProvider = WatchOrganizersHostedByFamily._();

final class WatchOrganizersHostedByProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<Organizer>>,
          List<Organizer>,
          Stream<List<Organizer>>
        >
    with $FutureModifier<List<Organizer>>, $StreamProvider<List<Organizer>> {
  WatchOrganizersHostedByProvider._({
    required WatchOrganizersHostedByFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchClubsHostedByProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchOrganizersHostedByHash();

  @override
  String toString() {
    return r'watchClubsHostedByProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<Organizer>> $createElement($ProviderPointer pointer) =>
      $StreamProviderElement(pointer);

  @override
  Stream<List<Organizer>> create(Ref ref) {
    final argument = this.argument as String;
    return watchOrganizersHostedBy(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchOrganizersHostedByProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchOrganizersHostedByHash() =>
    r'a99997587b97bc0cbba213b5c4ff883a097becab';

final class WatchOrganizersHostedByFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<Organizer>>, String> {
  WatchOrganizersHostedByFamily._()
    : super(
        retry: null,
        name: r'watchClubsHostedByProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchOrganizersHostedByProvider call(String uid) =>
      WatchOrganizersHostedByProvider._(argument: uid, from: this);

  @override
  String toString() => r'watchClubsHostedByProvider';
}

@ProviderFor(watchOrganizersOwnedBy)
final watchOrganizersOwnedByProvider = WatchOrganizersOwnedByFamily._();

final class WatchOrganizersOwnedByProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<Organizer>>,
          List<Organizer>,
          Stream<List<Organizer>>
        >
    with $FutureModifier<List<Organizer>>, $StreamProvider<List<Organizer>> {
  WatchOrganizersOwnedByProvider._({
    required WatchOrganizersOwnedByFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchClubsOwnedByProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchOrganizersOwnedByHash();

  @override
  String toString() {
    return r'watchClubsOwnedByProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<Organizer>> $createElement($ProviderPointer pointer) =>
      $StreamProviderElement(pointer);

  @override
  Stream<List<Organizer>> create(Ref ref) {
    final argument = this.argument as String;
    return watchOrganizersOwnedBy(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchOrganizersOwnedByProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchOrganizersOwnedByHash() => r'239582f94aa5105ac9006f727e57a99c109670e2';

final class WatchOrganizersOwnedByFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<Organizer>>, String> {
  WatchOrganizersOwnedByFamily._()
    : super(
        retry: null,
        name: r'watchClubsOwnedByProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchOrganizersOwnedByProvider call(String uid) =>
      WatchOrganizersOwnedByProvider._(argument: uid, from: this);

  @override
  String toString() => r'watchClubsOwnedByProvider';
}

@ProviderFor(fetchOrganizer)
final fetchOrganizerProvider = FetchOrganizerFamily._();

final class FetchOrganizerProvider
    extends $FunctionalProvider<AsyncValue<Organizer?>, Organizer?, FutureOr<Organizer?>>
    with $FutureModifier<Organizer?>, $FutureProvider<Organizer?> {
  FetchOrganizerProvider._({
    required FetchOrganizerFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'fetchClubProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$fetchOrganizerHash();

  @override
  String toString() {
    return r'fetchClubProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<Organizer?> $createElement($ProviderPointer pointer) =>
      $FutureProviderElement(pointer);

  @override
  FutureOr<Organizer?> create(Ref ref) {
    final argument = this.argument as String;
    return fetchOrganizer(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is FetchOrganizerProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$fetchOrganizerHash() => r'9df4647c451439dc88aa30593726b22930f65664';

final class FetchOrganizerFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<Organizer?>, String> {
  FetchOrganizerFamily._()
    : super(
        retry: null,
        name: r'fetchClubProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  FetchOrganizerProvider call(String id) =>
      FetchOrganizerProvider._(argument: id, from: this);

  @override
  String toString() => r'fetchClubProvider';
}

@ProviderFor(watchOrganizersByIds)
final watchOrganizersByIdsProvider = WatchOrganizersByIdsFamily._();

final class WatchOrganizersByIdsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<Organizer>>,
          List<Organizer>,
          Stream<List<Organizer>>
        >
    with $FutureModifier<List<Organizer>>, $StreamProvider<List<Organizer>> {
  WatchOrganizersByIdsProvider._({
    required WatchOrganizersByIdsFamily super.from,
    required OrganizersByIdQuery super.argument,
  }) : super(
         retry: null,
         name: r'watchClubsByIdsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchOrganizersByIdsHash();

  @override
  String toString() {
    return r'watchClubsByIdsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<Organizer>> $createElement($ProviderPointer pointer) =>
      $StreamProviderElement(pointer);

  @override
  Stream<List<Organizer>> create(Ref ref) {
    final argument = this.argument as OrganizersByIdQuery;
    return watchOrganizersByIds(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchOrganizersByIdsProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchOrganizersByIdsHash() => r'2799c81fb6924bd06b106e5651b670001d6609e7';

final class WatchOrganizersByIdsFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<Organizer>>, OrganizersByIdQuery> {
  WatchOrganizersByIdsFamily._()
    : super(
        retry: null,
        name: r'watchClubsByIdsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchOrganizersByIdsProvider call(OrganizersByIdQuery query) =>
      WatchOrganizersByIdsProvider._(argument: query, from: this);

  @override
  String toString() => r'watchClubsByIdsProvider';
}

@ProviderFor(watchOrganizersForMessagingByIds)
final watchOrganizersForMessagingByIdsProvider =
    WatchOrganizersForMessagingByIdsFamily._();

final class WatchOrganizersForMessagingByIdsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<Organizer>>,
          List<Organizer>,
          Stream<List<Organizer>>
        >
    with $FutureModifier<List<Organizer>>, $StreamProvider<List<Organizer>> {
  WatchOrganizersForMessagingByIdsProvider._({
    required WatchOrganizersForMessagingByIdsFamily super.from,
    required OrganizersByIdQuery super.argument,
  }) : super(
         retry: null,
         name: r'watchClubsForMessagingByIdsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchOrganizersForMessagingByIdsHash();

  @override
  String toString() {
    return r'watchClubsForMessagingByIdsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<Organizer>> $createElement($ProviderPointer pointer) =>
      $StreamProviderElement(pointer);

  @override
  Stream<List<Organizer>> create(Ref ref) {
    final argument = this.argument as OrganizersByIdQuery;
    return watchOrganizersForMessagingByIds(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchOrganizersForMessagingByIdsProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchOrganizersForMessagingByIdsHash() =>
    r'8de1837ae2da1fb25346862394152ba39dc21f76';

final class WatchOrganizersForMessagingByIdsFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<Organizer>>, OrganizersByIdQuery> {
  WatchOrganizersForMessagingByIdsFamily._()
    : super(
        retry: null,
        name: r'watchClubsForMessagingByIdsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchOrganizersForMessagingByIdsProvider call(OrganizersByIdQuery query) =>
      WatchOrganizersForMessagingByIdsProvider._(argument: query, from: this);

  @override
  String toString() => r'watchClubsForMessagingByIdsProvider';
}

@ProviderFor(hostOperableOrganizers)
final hostOperableOrganizersProvider = HostOperableOrganizersFamily._();

final class HostOperableOrganizersProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<Organizer>>,
          AsyncValue<List<Organizer>>,
          AsyncValue<List<Organizer>>
        >
    with $Provider<AsyncValue<List<Organizer>>> {
  HostOperableOrganizersProvider._({
    required HostOperableOrganizersFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostOperableClubsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostOperableOrganizersHash();

  @override
  String toString() {
    return r'hostOperableClubsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<AsyncValue<List<Organizer>>> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  AsyncValue<List<Organizer>> create(Ref ref) {
    final argument = this.argument as String;
    return hostOperableOrganizers(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AsyncValue<List<Organizer>> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<AsyncValue<List<Organizer>>>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostOperableOrganizersProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostOperableOrganizersHash() => r'e31ea44c4f2b6fdacd1ffc54b1066de13705632e';

final class HostOperableOrganizersFamily extends $Family
    with $FunctionalFamilyOverride<AsyncValue<List<Organizer>>, String> {
  HostOperableOrganizersFamily._()
    : super(
        retry: null,
        name: r'hostOperableClubsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  HostOperableOrganizersProvider call(String uid) =>
      HostOperableOrganizersProvider._(argument: uid, from: this);

  @override
  String toString() => r'hostOperableClubsProvider';
}
