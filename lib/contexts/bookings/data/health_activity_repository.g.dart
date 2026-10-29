// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'health_activity_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(healthActivityRepository)
final healthActivityRepositoryProvider = HealthActivityRepositoryProvider._();

final class HealthActivityRepositoryProvider
    extends
        $FunctionalProvider<
          HealthActivityRepository,
          HealthActivityRepository,
          HealthActivityRepository
        >
    with $Provider<HealthActivityRepository> {
  HealthActivityRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'healthActivityRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$healthActivityRepositoryHash();

  @$internal
  @override
  $ProviderElement<HealthActivityRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HealthActivityRepository create(Ref ref) {
    return healthActivityRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HealthActivityRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HealthActivityRepository>(value),
    );
  }
}

String _$healthActivityRepositoryHash() =>
    r'3ec65634923853e87d4bbf5b44ea13db380bbb53';

@ProviderFor(weeklyActivity)
@Deprecated(
  'Home no longer renders weekly activity; retained for insights/compatibility.',
)
final weeklyActivityProvider = WeeklyActivityProvider._();

@Deprecated(
  'Home no longer renders weekly activity; retained for insights/compatibility.',
)
final class WeeklyActivityProvider
    extends
        $FunctionalProvider<
          AsyncValue<WeeklyActivitySnapshot>,
          WeeklyActivitySnapshot,
          FutureOr<WeeklyActivitySnapshot>
        >
    with
        $FutureModifier<WeeklyActivitySnapshot>,
        $FutureProvider<WeeklyActivitySnapshot> {
  WeeklyActivityProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'weeklyActivityProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$weeklyActivityHash();

  @$internal
  @override
  $FutureProviderElement<WeeklyActivitySnapshot> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<WeeklyActivitySnapshot> create(Ref ref) {
    return weeklyActivity(ref);
  }
}

String _$weeklyActivityHash() => r'40bf156a6c00c99302ce6e2c85ea8417632e3396';
