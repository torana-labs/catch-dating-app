// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'live_night_alerts_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The night alerts for [event] as of [now], which the console passes to
/// the minute: open intro requests while the plan takes them, and guests
/// left out of every group past the threshold once the night has groups.
///
/// It reads the plan, the intro requests, the group and rotation
/// assignments and the roster through their listeners, and the names
/// through the profile read the old console used.

@ProviderFor(hostLiveNightAlerts)
final hostLiveNightAlertsProvider = HostLiveNightAlertsFamily._();

/// The night alerts for [event] as of [now], which the console passes to
/// the minute: open intro requests while the plan takes them, and guests
/// left out of every group past the threshold once the night has groups.
///
/// It reads the plan, the intro requests, the group and rotation
/// assignments and the roster through their listeners, and the names
/// through the profile read the old console used.

final class HostLiveNightAlertsProvider
    extends
        $FunctionalProvider<
          HostLiveNightAlerts,
          HostLiveNightAlerts,
          HostLiveNightAlerts
        >
    with $Provider<HostLiveNightAlerts> {
  /// The night alerts for [event] as of [now], which the console passes to
  /// the minute: open intro requests while the plan takes them, and guests
  /// left out of every group past the threshold once the night has groups.
  ///
  /// It reads the plan, the intro requests, the group and rotation
  /// assignments and the roster through their listeners, and the names
  /// through the profile read the old console used.
  HostLiveNightAlertsProvider._({
    required HostLiveNightAlertsFamily super.from,
    required (Event, DateTime) super.argument,
  }) : super(
         retry: null,
         name: r'hostLiveNightAlertsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostLiveNightAlertsHash();

  @override
  String toString() {
    return r'hostLiveNightAlertsProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $ProviderElement<HostLiveNightAlerts> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostLiveNightAlerts create(Ref ref) {
    final argument = this.argument as (Event, DateTime);
    return hostLiveNightAlerts(ref, argument.$1, argument.$2);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostLiveNightAlerts value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostLiveNightAlerts>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostLiveNightAlertsProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostLiveNightAlertsHash() =>
    r'e255e5a288e0265f53b57785cac0c10f3c6f4d07';

/// The night alerts for [event] as of [now], which the console passes to
/// the minute: open intro requests while the plan takes them, and guests
/// left out of every group past the threshold once the night has groups.
///
/// It reads the plan, the intro requests, the group and rotation
/// assignments and the roster through their listeners, and the names
/// through the profile read the old console used.

final class HostLiveNightAlertsFamily extends $Family
    with $FunctionalFamilyOverride<HostLiveNightAlerts, (Event, DateTime)> {
  HostLiveNightAlertsFamily._()
    : super(
        retry: null,
        name: r'hostLiveNightAlertsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The night alerts for [event] as of [now], which the console passes to
  /// the minute: open intro requests while the plan takes them, and guests
  /// left out of every group past the threshold once the night has groups.
  ///
  /// It reads the plan, the intro requests, the group and rotation
  /// assignments and the roster through their listeners, and the names
  /// through the profile read the old console used.

  HostLiveNightAlertsProvider call(Event event, DateTime now) =>
      HostLiveNightAlertsProvider._(argument: (event, now), from: this);

  @override
  String toString() => r'hostLiveNightAlertsProvider';
}
