// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'clubs_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(clubsRepository)
final clubsRepositoryProvider = ClubsRepositoryProvider._();

final class ClubsRepositoryProvider
    extends
        $FunctionalProvider<ClubsRepository, ClubsRepository, ClubsRepository>
    with $Provider<ClubsRepository> {
  ClubsRepositoryProvider._()
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
  String debugGetCreateSourceHash() => _$clubsRepositoryHash();

  @$internal
  @override
  $ProviderElement<ClubsRepository> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  ClubsRepository create(Ref ref) {
    return clubsRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ClubsRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ClubsRepository>(value),
    );
  }
}

String _$clubsRepositoryHash() => r'd5c0011e3ab9214aec9e91f81c5ff073ce0f3cca';

@ProviderFor(watchClub)
final watchClubProvider = WatchClubFamily._();

final class WatchClubProvider
    extends $FunctionalProvider<AsyncValue<Club?>, Club?, Stream<Club?>>
    with $FutureModifier<Club?>, $StreamProvider<Club?> {
  WatchClubProvider._({
    required WatchClubFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchClubProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchClubHash();

  @override
  String toString() {
    return r'watchClubProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<Club?> $createElement($ProviderPointer pointer) =>
      $StreamProviderElement(pointer);

  @override
  Stream<Club?> create(Ref ref) {
    final argument = this.argument as String;
    return watchClub(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchClubProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchClubHash() => r'595f1b7e4ea99cb75600b39d84baa61f5d680b0e';

final class WatchClubFamily extends $Family
    with $FunctionalFamilyOverride<Stream<Club?>, String> {
  WatchClubFamily._()
    : super(
        retry: null,
        name: r'watchClubProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchClubProvider call(String id) =>
      WatchClubProvider._(argument: id, from: this);

  @override
  String toString() => r'watchClubProvider';
}

@ProviderFor(watchClubsByLocation)
final watchClubsByLocationProvider = WatchClubsByLocationFamily._();

final class WatchClubsByLocationProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<Club>>,
          List<Club>,
          Stream<List<Club>>
        >
    with $FutureModifier<List<Club>>, $StreamProvider<List<Club>> {
  WatchClubsByLocationProvider._({
    required WatchClubsByLocationFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchClubsByLocationProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchClubsByLocationHash();

  @override
  String toString() {
    return r'watchClubsByLocationProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<Club>> $createElement($ProviderPointer pointer) =>
      $StreamProviderElement(pointer);

  @override
  Stream<List<Club>> create(Ref ref) {
    final argument = this.argument as String;
    return watchClubsByLocation(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchClubsByLocationProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchClubsByLocationHash() =>
    r'66d4bf98e32e589a19902448a858f99b5d0cf50e';

final class WatchClubsByLocationFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<Club>>, String> {
  WatchClubsByLocationFamily._()
    : super(
        retry: null,
        name: r'watchClubsByLocationProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchClubsByLocationProvider call(String location) =>
      WatchClubsByLocationProvider._(argument: location, from: this);

  @override
  String toString() => r'watchClubsByLocationProvider';
}

@ProviderFor(watchClubsByLocationSortedByRating)
final watchClubsByLocationSortedByRatingProvider =
    WatchClubsByLocationSortedByRatingFamily._();

final class WatchClubsByLocationSortedByRatingProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<Club>>,
          List<Club>,
          Stream<List<Club>>
        >
    with $FutureModifier<List<Club>>, $StreamProvider<List<Club>> {
  WatchClubsByLocationSortedByRatingProvider._({
    required WatchClubsByLocationSortedByRatingFamily super.from,
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
      _$watchClubsByLocationSortedByRatingHash();

  @override
  String toString() {
    return r'watchClubsByLocationSortedByRatingProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<Club>> $createElement($ProviderPointer pointer) =>
      $StreamProviderElement(pointer);

  @override
  Stream<List<Club>> create(Ref ref) {
    final argument = this.argument as String;
    return watchClubsByLocationSortedByRating(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchClubsByLocationSortedByRatingProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchClubsByLocationSortedByRatingHash() =>
    r'be5812eb9d8ab67139d5f0bef9b61069d2ef9077';

final class WatchClubsByLocationSortedByRatingFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<Club>>, String> {
  WatchClubsByLocationSortedByRatingFamily._()
    : super(
        retry: null,
        name: r'watchClubsByLocationSortedByRatingProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchClubsByLocationSortedByRatingProvider call(String location) =>
      WatchClubsByLocationSortedByRatingProvider._(
        argument: location,
        from: this,
      );

  @override
  String toString() => r'watchClubsByLocationSortedByRatingProvider';
}

@ProviderFor(watchClubsHostedBy)
final watchClubsHostedByProvider = WatchClubsHostedByFamily._();

final class WatchClubsHostedByProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<Club>>,
          List<Club>,
          Stream<List<Club>>
        >
    with $FutureModifier<List<Club>>, $StreamProvider<List<Club>> {
  WatchClubsHostedByProvider._({
    required WatchClubsHostedByFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchClubsHostedByProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchClubsHostedByHash();

  @override
  String toString() {
    return r'watchClubsHostedByProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<Club>> $createElement($ProviderPointer pointer) =>
      $StreamProviderElement(pointer);

  @override
  Stream<List<Club>> create(Ref ref) {
    final argument = this.argument as String;
    return watchClubsHostedBy(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchClubsHostedByProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchClubsHostedByHash() =>
    r'a99997587b97bc0cbba213b5c4ff883a097becab';

final class WatchClubsHostedByFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<Club>>, String> {
  WatchClubsHostedByFamily._()
    : super(
        retry: null,
        name: r'watchClubsHostedByProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchClubsHostedByProvider call(String uid) =>
      WatchClubsHostedByProvider._(argument: uid, from: this);

  @override
  String toString() => r'watchClubsHostedByProvider';
}

@ProviderFor(watchClubsOwnedBy)
final watchClubsOwnedByProvider = WatchClubsOwnedByFamily._();

final class WatchClubsOwnedByProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<Club>>,
          List<Club>,
          Stream<List<Club>>
        >
    with $FutureModifier<List<Club>>, $StreamProvider<List<Club>> {
  WatchClubsOwnedByProvider._({
    required WatchClubsOwnedByFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchClubsOwnedByProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchClubsOwnedByHash();

  @override
  String toString() {
    return r'watchClubsOwnedByProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<Club>> $createElement($ProviderPointer pointer) =>
      $StreamProviderElement(pointer);

  @override
  Stream<List<Club>> create(Ref ref) {
    final argument = this.argument as String;
    return watchClubsOwnedBy(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchClubsOwnedByProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchClubsOwnedByHash() => r'239582f94aa5105ac9006f727e57a99c109670e2';

final class WatchClubsOwnedByFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<Club>>, String> {
  WatchClubsOwnedByFamily._()
    : super(
        retry: null,
        name: r'watchClubsOwnedByProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchClubsOwnedByProvider call(String uid) =>
      WatchClubsOwnedByProvider._(argument: uid, from: this);

  @override
  String toString() => r'watchClubsOwnedByProvider';
}

@ProviderFor(fetchClub)
final fetchClubProvider = FetchClubFamily._();

final class FetchClubProvider
    extends $FunctionalProvider<AsyncValue<Club?>, Club?, FutureOr<Club?>>
    with $FutureModifier<Club?>, $FutureProvider<Club?> {
  FetchClubProvider._({
    required FetchClubFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'fetchClubProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$fetchClubHash();

  @override
  String toString() {
    return r'fetchClubProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<Club?> $createElement($ProviderPointer pointer) =>
      $FutureProviderElement(pointer);

  @override
  FutureOr<Club?> create(Ref ref) {
    final argument = this.argument as String;
    return fetchClub(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is FetchClubProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$fetchClubHash() => r'9df4647c451439dc88aa30593726b22930f65664';

final class FetchClubFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<Club?>, String> {
  FetchClubFamily._()
    : super(
        retry: null,
        name: r'fetchClubProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  FetchClubProvider call(String id) =>
      FetchClubProvider._(argument: id, from: this);

  @override
  String toString() => r'fetchClubProvider';
}

@ProviderFor(watchClubsByIds)
final watchClubsByIdsProvider = WatchClubsByIdsFamily._();

final class WatchClubsByIdsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<Club>>,
          List<Club>,
          Stream<List<Club>>
        >
    with $FutureModifier<List<Club>>, $StreamProvider<List<Club>> {
  WatchClubsByIdsProvider._({
    required WatchClubsByIdsFamily super.from,
    required ClubsByIdQuery super.argument,
  }) : super(
         retry: null,
         name: r'watchClubsByIdsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchClubsByIdsHash();

  @override
  String toString() {
    return r'watchClubsByIdsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<Club>> $createElement($ProviderPointer pointer) =>
      $StreamProviderElement(pointer);

  @override
  Stream<List<Club>> create(Ref ref) {
    final argument = this.argument as ClubsByIdQuery;
    return watchClubsByIds(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchClubsByIdsProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchClubsByIdsHash() => r'2799c81fb6924bd06b106e5651b670001d6609e7';

final class WatchClubsByIdsFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<Club>>, ClubsByIdQuery> {
  WatchClubsByIdsFamily._()
    : super(
        retry: null,
        name: r'watchClubsByIdsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchClubsByIdsProvider call(ClubsByIdQuery query) =>
      WatchClubsByIdsProvider._(argument: query, from: this);

  @override
  String toString() => r'watchClubsByIdsProvider';
}

@ProviderFor(watchClubsForMessagingByIds)
final watchClubsForMessagingByIdsProvider =
    WatchClubsForMessagingByIdsFamily._();

final class WatchClubsForMessagingByIdsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<Club>>,
          List<Club>,
          Stream<List<Club>>
        >
    with $FutureModifier<List<Club>>, $StreamProvider<List<Club>> {
  WatchClubsForMessagingByIdsProvider._({
    required WatchClubsForMessagingByIdsFamily super.from,
    required ClubsByIdQuery super.argument,
  }) : super(
         retry: null,
         name: r'watchClubsForMessagingByIdsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchClubsForMessagingByIdsHash();

  @override
  String toString() {
    return r'watchClubsForMessagingByIdsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<Club>> $createElement($ProviderPointer pointer) =>
      $StreamProviderElement(pointer);

  @override
  Stream<List<Club>> create(Ref ref) {
    final argument = this.argument as ClubsByIdQuery;
    return watchClubsForMessagingByIds(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchClubsForMessagingByIdsProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchClubsForMessagingByIdsHash() =>
    r'8de1837ae2da1fb25346862394152ba39dc21f76';

final class WatchClubsForMessagingByIdsFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<Club>>, ClubsByIdQuery> {
  WatchClubsForMessagingByIdsFamily._()
    : super(
        retry: null,
        name: r'watchClubsForMessagingByIdsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchClubsForMessagingByIdsProvider call(ClubsByIdQuery query) =>
      WatchClubsForMessagingByIdsProvider._(argument: query, from: this);

  @override
  String toString() => r'watchClubsForMessagingByIdsProvider';
}

@ProviderFor(hostOperableClubs)
final hostOperableClubsProvider = HostOperableClubsFamily._();

final class HostOperableClubsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<Club>>,
          AsyncValue<List<Club>>,
          AsyncValue<List<Club>>
        >
    with $Provider<AsyncValue<List<Club>>> {
  HostOperableClubsProvider._({
    required HostOperableClubsFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostOperableClubsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostOperableClubsHash();

  @override
  String toString() {
    return r'hostOperableClubsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<AsyncValue<List<Club>>> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  AsyncValue<List<Club>> create(Ref ref) {
    final argument = this.argument as String;
    return hostOperableClubs(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AsyncValue<List<Club>> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<AsyncValue<List<Club>>>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostOperableClubsProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostOperableClubsHash() => r'e31ea44c4f2b6fdacd1ffc54b1066de13705632e';

final class HostOperableClubsFamily extends $Family
    with $FunctionalFamilyOverride<AsyncValue<List<Club>>, String> {
  HostOperableClubsFamily._()
    : super(
        retry: null,
        name: r'hostOperableClubsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  HostOperableClubsProvider call(String uid) =>
      HostOperableClubsProvider._(argument: uid, from: this);

  @override
  String toString() => r'hostOperableClubsProvider';
}
