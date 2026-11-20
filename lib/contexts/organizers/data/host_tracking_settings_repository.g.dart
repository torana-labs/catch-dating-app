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
    r'e4f3830915eb93376850becebaf26895892c1544';

/// The organizer's tracking settings listener. It is a Firestore listener:
/// saves never invalidate it, the new revision arrives on its own. Whether
/// they may be edited follows the organizer listener the Host shell holds.

@ProviderFor(hostTrackingSettings)
final hostTrackingSettingsProvider = HostTrackingSettingsFamily._();

/// The organizer's tracking settings listener. It is a Firestore listener:
/// saves never invalidate it, the new revision arrives on its own. Whether
/// they may be edited follows the organizer listener the Host shell holds.

final class HostTrackingSettingsProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostTrackingSettings>,
          HostTrackingSettings,
          Stream<HostTrackingSettings>
        >
    with
        $FutureModifier<HostTrackingSettings>,
        $StreamProvider<HostTrackingSettings> {
  /// The organizer's tracking settings listener. It is a Firestore listener:
  /// saves never invalidate it, the new revision arrives on its own. Whether
  /// they may be edited follows the organizer listener the Host shell holds.
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
  $StreamProviderElement<HostTrackingSettings> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<HostTrackingSettings> create(Ref ref) {
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
    r'52ca878883d5206f64177630839aeda55f618dc9';

/// The organizer's tracking settings listener. It is a Firestore listener:
/// saves never invalidate it, the new revision arrives on its own. Whether
/// they may be edited follows the organizer listener the Host shell holds.

final class HostTrackingSettingsFamily extends $Family
    with $FunctionalFamilyOverride<Stream<HostTrackingSettings>, String> {
  HostTrackingSettingsFamily._()
    : super(
        retry: null,
        name: r'hostTrackingSettingsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The organizer's tracking settings listener. It is a Firestore listener:
  /// saves never invalidate it, the new revision arrives on its own. Whether
  /// they may be edited follows the organizer listener the Host shell holds.

  HostTrackingSettingsProvider call(String organizerId) =>
      HostTrackingSettingsProvider._(argument: organizerId, from: this);

  @override
  String toString() => r'hostTrackingSettingsProvider';
}
