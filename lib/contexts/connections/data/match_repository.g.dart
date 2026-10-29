// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'match_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(matchRepository)
final matchRepositoryProvider = MatchRepositoryProvider._();

final class MatchRepositoryProvider
    extends
        $FunctionalProvider<MatchRepository, MatchRepository, MatchRepository>
    with $Provider<MatchRepository> {
  MatchRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'matchRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$matchRepositoryHash();

  @$internal
  @override
  $ProviderElement<MatchRepository> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  MatchRepository create(Ref ref) {
    return matchRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(MatchRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<MatchRepository>(value),
    );
  }
}

String _$matchRepositoryHash() => r'13f7432d5244d50c8fe9c712bd636394ac5d2c17';

@ProviderFor(watchMatchesForUser)
final watchMatchesForUserProvider = WatchMatchesForUserFamily._();

final class WatchMatchesForUserProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<Match>>,
          List<Match>,
          Stream<List<Match>>
        >
    with $FutureModifier<List<Match>>, $StreamProvider<List<Match>> {
  WatchMatchesForUserProvider._({
    required WatchMatchesForUserFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchMatchesForUserProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchMatchesForUserHash();

  @override
  String toString() {
    return r'watchMatchesForUserProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<Match>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<Match>> create(Ref ref) {
    final argument = this.argument as String;
    return watchMatchesForUser(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchMatchesForUserProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchMatchesForUserHash() =>
    r'7affe5ae3ac818af86e664d11b5e16fe4f8cdecd';

final class WatchMatchesForUserFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<Match>>, String> {
  WatchMatchesForUserFamily._()
    : super(
        retry: null,
        name: r'watchMatchesForUserProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchMatchesForUserProvider call(String uid) =>
      WatchMatchesForUserProvider._(argument: uid, from: this);

  @override
  String toString() => r'watchMatchesForUserProvider';
}

@ProviderFor(matchStream)
final matchStreamProvider = MatchStreamFamily._();

final class MatchStreamProvider
    extends $FunctionalProvider<AsyncValue<Match?>, Match?, Stream<Match?>>
    with $FutureModifier<Match?>, $StreamProvider<Match?> {
  MatchStreamProvider._({
    required MatchStreamFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'matchStreamProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$matchStreamHash();

  @override
  String toString() {
    return r'matchStreamProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<Match?> $createElement($ProviderPointer pointer) =>
      $StreamProviderElement(pointer);

  @override
  Stream<Match?> create(Ref ref) {
    final argument = this.argument as String;
    return matchStream(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is MatchStreamProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$matchStreamHash() => r'c1381a4992dd0906bce681d27350c448201c3b59';

final class MatchStreamFamily extends $Family
    with $FunctionalFamilyOverride<Stream<Match?>, String> {
  MatchStreamFamily._()
    : super(
        retry: null,
        name: r'matchStreamProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  MatchStreamProvider call(String matchId) =>
      MatchStreamProvider._(argument: matchId, from: this);

  @override
  String toString() => r'matchStreamProvider';
}

@ProviderFor(totalUnreadCount)
final totalUnreadCountProvider = TotalUnreadCountFamily._();

final class TotalUnreadCountProvider extends $FunctionalProvider<int, int, int>
    with $Provider<int> {
  TotalUnreadCountProvider._({
    required TotalUnreadCountFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'totalUnreadCountProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$totalUnreadCountHash();

  @override
  String toString() {
    return r'totalUnreadCountProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<int> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  int create(Ref ref) {
    final argument = this.argument as String;
    return totalUnreadCount(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(int value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<int>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is TotalUnreadCountProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$totalUnreadCountHash() => r'3d6b4fa665267dac5e268e3a2bb49369f7a8594b';

final class TotalUnreadCountFamily extends $Family
    with $FunctionalFamilyOverride<int, String> {
  TotalUnreadCountFamily._()
    : super(
        retry: null,
        name: r'totalUnreadCountProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  TotalUnreadCountProvider call(String uid) =>
      TotalUnreadCountProvider._(argument: uid, from: this);

  @override
  String toString() => r'totalUnreadCountProvider';
}
