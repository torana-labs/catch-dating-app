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

/// Host analytics, kept for the host reports window after the screen closes
/// and refetched in the background once older than its staleness. A write
/// that changes what the report counts declares [InsightsTags].

@ProviderFor(HostAnalytics)
final hostAnalyticsProvider = HostAnalyticsFamily._();

/// Host analytics, kept for the host reports window after the screen closes
/// and refetched in the background once older than its staleness. A write
/// that changes what the report counts declares [InsightsTags].
final class HostAnalyticsProvider
    extends
        $AsyncNotifierProvider<HostAnalytics, CachedRead<HostAnalyticsReport>> {
  /// Host analytics, kept for the host reports window after the screen closes
  /// and refetched in the background once older than its staleness. A write
  /// that changes what the report counts declares [InsightsTags].
  HostAnalyticsProvider._({
    required HostAnalyticsFamily super.from,
    required HostAnalyticsRead super.argument,
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
  HostAnalytics create() => HostAnalytics();

  @override
  bool operator ==(Object other) {
    return other is HostAnalyticsProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostAnalyticsHash() => r'b080b929f8c7aaaa5aff91f8c3d05d21147efe0d';

/// Host analytics, kept for the host reports window after the screen closes
/// and refetched in the background once older than its staleness. A write
/// that changes what the report counts declares [InsightsTags].

final class HostAnalyticsFamily extends $Family
    with
        $ClassFamilyOverride<
          HostAnalytics,
          AsyncValue<CachedRead<HostAnalyticsReport>>,
          CachedRead<HostAnalyticsReport>,
          FutureOr<CachedRead<HostAnalyticsReport>>,
          HostAnalyticsRead
        > {
  HostAnalyticsFamily._()
    : super(
        retry: null,
        name: r'hostAnalyticsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Host analytics, kept for the host reports window after the screen closes
  /// and refetched in the background once older than its staleness. A write
  /// that changes what the report counts declares [InsightsTags].

  HostAnalyticsProvider call(HostAnalyticsRead read) =>
      HostAnalyticsProvider._(argument: read, from: this);

  @override
  String toString() => r'hostAnalyticsProvider';
}

/// Host analytics, kept for the host reports window after the screen closes
/// and refetched in the background once older than its staleness. A write
/// that changes what the report counts declares [InsightsTags].

abstract class _$HostAnalytics
    extends $AsyncNotifier<CachedRead<HostAnalyticsReport>> {
  late final _$args = ref.$arg as HostAnalyticsRead;
  HostAnalyticsRead get read => _$args;

  FutureOr<CachedRead<HostAnalyticsReport>> build(HostAnalyticsRead read);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<
              AsyncValue<CachedRead<HostAnalyticsReport>>,
              CachedRead<HostAnalyticsReport>
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<CachedRead<HostAnalyticsReport>>,
                CachedRead<HostAnalyticsReport>
              >,
              AsyncValue<CachedRead<HostAnalyticsReport>>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}
