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
        $FunctionalProvider<
          OrganizersRepository,
          OrganizersRepository,
          OrganizersRepository
        >
    with $Provider<OrganizersRepository> {
  OrganizersRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'organizersRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$organizersRepositoryHash();

  @$internal
  @override
  $ProviderElement<OrganizersRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

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

String _$organizersRepositoryHash() =>
    r'f96d707452768d47fae01c830157891919951428';

@ProviderFor(watchOrganizer)
final watchOrganizerProvider = WatchOrganizerFamily._();

final class WatchOrganizerProvider
    extends
        $FunctionalProvider<
          AsyncValue<Organizer?>,
          Organizer?,
          Stream<Organizer?>
        >
    with $FutureModifier<Organizer?>, $StreamProvider<Organizer?> {
  WatchOrganizerProvider._({
    required WatchOrganizerFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchOrganizerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchOrganizerHash();

  @override
  String toString() {
    return r'watchOrganizerProvider'
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

String _$watchOrganizerHash() => r'd607850a1753cbb1698a7ba33c48b83289346b40';

final class WatchOrganizerFamily extends $Family
    with $FunctionalFamilyOverride<Stream<Organizer?>, String> {
  WatchOrganizerFamily._()
    : super(
        retry: null,
        name: r'watchOrganizerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchOrganizerProvider call(String id) =>
      WatchOrganizerProvider._(argument: id, from: this);

  @override
  String toString() => r'watchOrganizerProvider';
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
         name: r'watchOrganizersByLocationProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchOrganizersByLocationHash();

  @override
  String toString() {
    return r'watchOrganizersByLocationProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<Organizer>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<Organizer>> create(Ref ref) {
    final argument = this.argument as String;
    return watchOrganizersByLocation(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchOrganizersByLocationProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchOrganizersByLocationHash() =>
    r'4cdb685c980c4591adf02081be6da52118f21017';

final class WatchOrganizersByLocationFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<Organizer>>, String> {
  WatchOrganizersByLocationFamily._()
    : super(
        retry: null,
        name: r'watchOrganizersByLocationProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchOrganizersByLocationProvider call(String location) =>
      WatchOrganizersByLocationProvider._(argument: location, from: this);

  @override
  String toString() => r'watchOrganizersByLocationProvider';
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
         name: r'watchOrganizersByLocationSortedByRatingProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$watchOrganizersByLocationSortedByRatingHash();

  @override
  String toString() {
    return r'watchOrganizersByLocationSortedByRatingProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<Organizer>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

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
    r'2e0ab2ea935e6bfa9e07ec4e238f2721a41d744f';

final class WatchOrganizersByLocationSortedByRatingFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<Organizer>>, String> {
  WatchOrganizersByLocationSortedByRatingFamily._()
    : super(
        retry: null,
        name: r'watchOrganizersByLocationSortedByRatingProvider',
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
  String toString() => r'watchOrganizersByLocationSortedByRatingProvider';
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
         name: r'watchOrganizersHostedByProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchOrganizersHostedByHash();

  @override
  String toString() {
    return r'watchOrganizersHostedByProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<Organizer>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<Organizer>> create(Ref ref) {
    final argument = this.argument as String;
    return watchOrganizersHostedBy(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchOrganizersHostedByProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchOrganizersHostedByHash() =>
    r'722f37c6a4ff6663b6eb3ac96fc5069ff05d822e';

final class WatchOrganizersHostedByFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<Organizer>>, String> {
  WatchOrganizersHostedByFamily._()
    : super(
        retry: null,
        name: r'watchOrganizersHostedByProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchOrganizersHostedByProvider call(String uid) =>
      WatchOrganizersHostedByProvider._(argument: uid, from: this);

  @override
  String toString() => r'watchOrganizersHostedByProvider';
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
         name: r'watchOrganizersOwnedByProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchOrganizersOwnedByHash();

  @override
  String toString() {
    return r'watchOrganizersOwnedByProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<Organizer>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<Organizer>> create(Ref ref) {
    final argument = this.argument as String;
    return watchOrganizersOwnedBy(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchOrganizersOwnedByProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchOrganizersOwnedByHash() =>
    r'b8ba11d51246047cd07d0294cf8dfc299312bc12';

final class WatchOrganizersOwnedByFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<Organizer>>, String> {
  WatchOrganizersOwnedByFamily._()
    : super(
        retry: null,
        name: r'watchOrganizersOwnedByProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchOrganizersOwnedByProvider call(String uid) =>
      WatchOrganizersOwnedByProvider._(argument: uid, from: this);

  @override
  String toString() => r'watchOrganizersOwnedByProvider';
}

@ProviderFor(fetchOrganizer)
final fetchOrganizerProvider = FetchOrganizerFamily._();

final class FetchOrganizerProvider
    extends
        $FunctionalProvider<
          AsyncValue<Organizer?>,
          Organizer?,
          FutureOr<Organizer?>
        >
    with $FutureModifier<Organizer?>, $FutureProvider<Organizer?> {
  FetchOrganizerProvider._({
    required FetchOrganizerFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'fetchOrganizerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$fetchOrganizerHash();

  @override
  String toString() {
    return r'fetchOrganizerProvider'
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

String _$fetchOrganizerHash() => r'09ac0b1cc51ad718dca8c9fd250477938f2015c9';

final class FetchOrganizerFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<Organizer?>, String> {
  FetchOrganizerFamily._()
    : super(
        retry: null,
        name: r'fetchOrganizerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  FetchOrganizerProvider call(String id) =>
      FetchOrganizerProvider._(argument: id, from: this);

  @override
  String toString() => r'fetchOrganizerProvider';
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
         name: r'watchOrganizersByIdsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchOrganizersByIdsHash();

  @override
  String toString() {
    return r'watchOrganizersByIdsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<Organizer>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

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

String _$watchOrganizersByIdsHash() =>
    r'6c6d4ee98f29ee769aee8f0df917dcded7ee1036';

final class WatchOrganizersByIdsFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<List<Organizer>>,
          OrganizersByIdQuery
        > {
  WatchOrganizersByIdsFamily._()
    : super(
        retry: null,
        name: r'watchOrganizersByIdsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchOrganizersByIdsProvider call(OrganizersByIdQuery query) =>
      WatchOrganizersByIdsProvider._(argument: query, from: this);

  @override
  String toString() => r'watchOrganizersByIdsProvider';
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
         name: r'watchOrganizersForMessagingByIdsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchOrganizersForMessagingByIdsHash();

  @override
  String toString() {
    return r'watchOrganizersForMessagingByIdsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<Organizer>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

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
    r'b2d780472fe74a7ae0dc797acaad3771c364d6ad';

final class WatchOrganizersForMessagingByIdsFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<List<Organizer>>,
          OrganizersByIdQuery
        > {
  WatchOrganizersForMessagingByIdsFamily._()
    : super(
        retry: null,
        name: r'watchOrganizersForMessagingByIdsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchOrganizersForMessagingByIdsProvider call(OrganizersByIdQuery query) =>
      WatchOrganizersForMessagingByIdsProvider._(argument: query, from: this);

  @override
  String toString() => r'watchOrganizersForMessagingByIdsProvider';
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
         name: r'hostOperableOrganizersProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostOperableOrganizersHash();

  @override
  String toString() {
    return r'hostOperableOrganizersProvider'
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
    return other is HostOperableOrganizersProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostOperableOrganizersHash() =>
    r'a619204f5c273dd1d7d520d813d505bb2d0462e7';

final class HostOperableOrganizersFamily extends $Family
    with $FunctionalFamilyOverride<AsyncValue<List<Organizer>>, String> {
  HostOperableOrganizersFamily._()
    : super(
        retry: null,
        name: r'hostOperableOrganizersProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  HostOperableOrganizersProvider call(String uid) =>
      HostOperableOrganizersProvider._(argument: uid, from: this);

  @override
  String toString() => r'hostOperableOrganizersProvider';
}
