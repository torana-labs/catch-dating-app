// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_analytics_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(hostAnalyticsDeviceTimezone)
final hostAnalyticsDeviceTimezoneProvider =
    HostAnalyticsDeviceTimezoneProvider._();

final class HostAnalyticsDeviceTimezoneProvider
    extends $FunctionalProvider<AsyncValue<String?>, String?, FutureOr<String?>>
    with $FutureModifier<String?>, $FutureProvider<String?> {
  HostAnalyticsDeviceTimezoneProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostAnalyticsDeviceTimezoneProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostAnalyticsDeviceTimezoneHash();

  @$internal
  @override
  $FutureProviderElement<String?> $createElement($ProviderPointer pointer) =>
      $FutureProviderElement(pointer);

  @override
  FutureOr<String?> create(Ref ref) {
    return hostAnalyticsDeviceTimezone(ref);
  }
}

String _$hostAnalyticsDeviceTimezoneHash() =>
    r'de7eb756fa43a203715cfffbf4fb5a4658ec0162';

@ProviderFor(hostAnalyticsRepository)
final hostAnalyticsRepositoryProvider = HostAnalyticsRepositoryProvider._();

final class HostAnalyticsRepositoryProvider
    extends
        $FunctionalProvider<
          HostAnalyticsRepository,
          HostAnalyticsRepository,
          HostAnalyticsRepository
        >
    with $Provider<HostAnalyticsRepository> {
  HostAnalyticsRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostAnalyticsRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostAnalyticsRepositoryHash();

  @$internal
  @override
  $ProviderElement<HostAnalyticsRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostAnalyticsRepository create(Ref ref) {
    return hostAnalyticsRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostAnalyticsRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostAnalyticsRepository>(value),
    );
  }
}

String _$hostAnalyticsRepositoryHash() =>
    r'092a85790b82098407a06f197b994131d9b31705';

@ProviderFor(hostAnalytics)
final hostAnalyticsProvider = HostAnalyticsFamily._();

final class HostAnalyticsProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostAnalyticsReport>,
          HostAnalyticsReport,
          FutureOr<HostAnalyticsReport>
        >
    with
        $FutureModifier<HostAnalyticsReport>,
        $FutureProvider<HostAnalyticsReport> {
  HostAnalyticsProvider._({
    required HostAnalyticsFamily super.from,
    required HostAnalyticsQuery super.argument,
  }) : super(
         retry: null,
         name: r'hostAnalyticsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostAnalyticsHash();

  @override
  String toString() {
    return r'hostAnalyticsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<HostAnalyticsReport> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<HostAnalyticsReport> create(Ref ref) {
    final argument = this.argument as HostAnalyticsQuery;
    return hostAnalytics(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is HostAnalyticsProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostAnalyticsHash() => r'7f6803c7bfd7b5d644b66da639cb97d272bfbb4d';

final class HostAnalyticsFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<HostAnalyticsReport>,
          HostAnalyticsQuery
        > {
  HostAnalyticsFamily._()
    : super(
        retry: null,
        name: r'hostAnalyticsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  HostAnalyticsProvider call(HostAnalyticsQuery query) =>
      HostAnalyticsProvider._(argument: query, from: this);

  @override
  String toString() => r'hostAnalyticsProvider';
}
