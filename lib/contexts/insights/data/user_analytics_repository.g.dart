// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'user_analytics_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(userAnalyticsRepository)
final userAnalyticsRepositoryProvider = UserAnalyticsRepositoryProvider._();

final class UserAnalyticsRepositoryProvider
    extends
        $FunctionalProvider<
          UserAnalyticsRepository,
          UserAnalyticsRepository,
          UserAnalyticsRepository
        >
    with $Provider<UserAnalyticsRepository> {
  UserAnalyticsRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'userAnalyticsRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$userAnalyticsRepositoryHash();

  @$internal
  @override
  $ProviderElement<UserAnalyticsRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  UserAnalyticsRepository create(Ref ref) {
    return userAnalyticsRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(UserAnalyticsRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<UserAnalyticsRepository>(value),
    );
  }
}

String _$userAnalyticsRepositoryHash() =>
    r'7d880e5ac8b65757d2c85fec0053bb33dcbbfd82';

@ProviderFor(userAnalytics)
final userAnalyticsProvider = UserAnalyticsFamily._();

final class UserAnalyticsProvider
    extends
        $FunctionalProvider<
          AsyncValue<UserAnalyticsReport>,
          UserAnalyticsReport,
          FutureOr<UserAnalyticsReport>
        >
    with
        $FutureModifier<UserAnalyticsReport>,
        $FutureProvider<UserAnalyticsReport> {
  UserAnalyticsProvider._({
    required UserAnalyticsFamily super.from,
    required UserAnalyticsQuery super.argument,
  }) : super(
         retry: null,
         name: r'userAnalyticsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$userAnalyticsHash();

  @override
  String toString() {
    return r'userAnalyticsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<UserAnalyticsReport> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<UserAnalyticsReport> create(Ref ref) {
    final argument = this.argument as UserAnalyticsQuery;
    return userAnalytics(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is UserAnalyticsProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$userAnalyticsHash() => r'39305ddec3deb21832e5b28715fbaa4e82fbe1f6';

final class UserAnalyticsFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<UserAnalyticsReport>,
          UserAnalyticsQuery
        > {
  UserAnalyticsFamily._()
    : super(
        retry: null,
        name: r'userAnalyticsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  UserAnalyticsProvider call(UserAnalyticsQuery query) =>
      UserAnalyticsProvider._(argument: query, from: this);

  @override
  String toString() => r'userAnalyticsProvider';
}
