// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_tracking_settings_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(hostTrackingSettingsRepository)
final hostTrackingSettingsRepositoryProvider =
    HostTrackingSettingsRepositoryProvider._();

final class HostTrackingSettingsRepositoryProvider
    extends
        $FunctionalProvider<
          HostTrackingSettingsRepository,
          HostTrackingSettingsRepository,
          HostTrackingSettingsRepository
        >
    with $Provider<HostTrackingSettingsRepository> {
  HostTrackingSettingsRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostTrackingSettingsRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostTrackingSettingsRepositoryHash();

  @$internal
  @override
  $ProviderElement<HostTrackingSettingsRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostTrackingSettingsRepository create(Ref ref) {
    return hostTrackingSettingsRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostTrackingSettingsRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostTrackingSettingsRepository>(
        value,
      ),
    );
  }
}

String _$hostTrackingSettingsRepositoryHash() =>
    r'50e24414314f14549a54e0e7c5fd73d7aa6e952b';

@ProviderFor(hostTrackingSettings)
final hostTrackingSettingsProvider = HostTrackingSettingsFamily._();

final class HostTrackingSettingsProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostTrackingSettings>,
          HostTrackingSettings,
          FutureOr<HostTrackingSettings>
        >
    with
        $FutureModifier<HostTrackingSettings>,
        $FutureProvider<HostTrackingSettings> {
  HostTrackingSettingsProvider._({
    required HostTrackingSettingsFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostTrackingSettingsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostTrackingSettingsHash();

  @override
  String toString() {
    return r'hostTrackingSettingsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<HostTrackingSettings> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<HostTrackingSettings> create(Ref ref) {
    final argument = this.argument as String;
    return hostTrackingSettings(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is HostTrackingSettingsProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostTrackingSettingsHash() =>
    r'5732a90fb8522964a2fa739ad0d5240dd383374b';

final class HostTrackingSettingsFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<HostTrackingSettings>, String> {
  HostTrackingSettingsFamily._()
    : super(
        retry: null,
        name: r'hostTrackingSettingsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  HostTrackingSettingsProvider call(String organizerId) =>
      HostTrackingSettingsProvider._(argument: organizerId, from: this);

  @override
  String toString() => r'hostTrackingSettingsProvider';
}
