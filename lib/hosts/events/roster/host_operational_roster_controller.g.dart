// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_operational_roster_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(hostOperationalRosterController)
final hostOperationalRosterControllerProvider =
    HostOperationalRosterControllerProvider._();

final class HostOperationalRosterControllerProvider
    extends
        $FunctionalProvider<
          HostOperationalRosterController,
          HostOperationalRosterController,
          HostOperationalRosterController
        >
    with $Provider<HostOperationalRosterController> {
  HostOperationalRosterControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostOperationalRosterControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostOperationalRosterControllerHash();

  @$internal
  @override
  $ProviderElement<HostOperationalRosterController> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostOperationalRosterController create(Ref ref) {
    return hostOperationalRosterController(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostOperationalRosterController value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostOperationalRosterController>(
        value,
      ),
    );
  }
}

String _$hostOperationalRosterControllerHash() =>
    r'bc3be9c30371c01965b1834aaa09193aaaee8365';
