// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'live_room_map_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The seat map for [event], or null when the night has no saved layout or
/// it is still read. It reads the plan, the selected layout, the group and
/// rotation assignments and the seated guests' names through the listeners
/// and profile read the old console used.

@ProviderFor(hostLiveRoomMap)
final hostLiveRoomMapProvider = HostLiveRoomMapFamily._();

/// The seat map for [event], or null when the night has no saved layout or
/// it is still read. It reads the plan, the selected layout, the group and
/// rotation assignments and the seated guests' names through the listeners
/// and profile read the old console used.

final class HostLiveRoomMapProvider
    extends
        $FunctionalProvider<
          HostLiveRoomMap?,
          HostLiveRoomMap?,
          HostLiveRoomMap?
        >
    with $Provider<HostLiveRoomMap?> {
  /// The seat map for [event], or null when the night has no saved layout or
  /// it is still read. It reads the plan, the selected layout, the group and
  /// rotation assignments and the seated guests' names through the listeners
  /// and profile read the old console used.
  HostLiveRoomMapProvider._({
    required HostLiveRoomMapFamily super.from,
    required Event super.argument,
  }) : super(
         retry: null,
         name: r'hostLiveRoomMapProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostLiveRoomMapHash();

  @override
  String toString() {
    return r'hostLiveRoomMapProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<HostLiveRoomMap?> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  HostLiveRoomMap? create(Ref ref) {
    final argument = this.argument as Event;
    return hostLiveRoomMap(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostLiveRoomMap? value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostLiveRoomMap?>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostLiveRoomMapProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostLiveRoomMapHash() => r'22bae245f234f1f1a4e2b9905f8ceb1f3d4de1a8';

/// The seat map for [event], or null when the night has no saved layout or
/// it is still read. It reads the plan, the selected layout, the group and
/// rotation assignments and the seated guests' names through the listeners
/// and profile read the old console used.

final class HostLiveRoomMapFamily extends $Family
    with $FunctionalFamilyOverride<HostLiveRoomMap?, Event> {
  HostLiveRoomMapFamily._()
    : super(
        retry: null,
        name: r'hostLiveRoomMapProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The seat map for [event], or null when the night has no saved layout or
  /// it is still read. It reads the plan, the selected layout, the group and
  /// rotation assignments and the seated guests' names through the listeners
  /// and profile read the old console used.

  HostLiveRoomMapProvider call(Event event) =>
      HostLiveRoomMapProvider._(argument: event, from: this);

  @override
  String toString() => r'hostLiveRoomMapProvider';
}
