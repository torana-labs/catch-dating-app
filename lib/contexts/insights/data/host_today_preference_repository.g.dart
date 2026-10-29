// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_today_preference_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(hostTodayPreferenceRepository)
final hostTodayPreferenceRepositoryProvider =
    HostTodayPreferenceRepositoryProvider._();

final class HostTodayPreferenceRepositoryProvider
    extends
        $FunctionalProvider<
          HostTodayPreferenceRepository,
          HostTodayPreferenceRepository,
          HostTodayPreferenceRepository
        >
    with $Provider<HostTodayPreferenceRepository> {
  HostTodayPreferenceRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostTodayPreferenceRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostTodayPreferenceRepositoryHash();

  @$internal
  @override
  $ProviderElement<HostTodayPreferenceRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostTodayPreferenceRepository create(Ref ref) {
    return hostTodayPreferenceRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostTodayPreferenceRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostTodayPreferenceRepository>(
        value,
      ),
    );
  }
}

String _$hostTodayPreferenceRepositoryHash() =>
    r'ec073288365d199adc7ba05021a488ee699b4310';
