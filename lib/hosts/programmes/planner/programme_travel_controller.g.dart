// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'programme_travel_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Travel across every pickup point: the programme, the arrivals roster,
/// the transport plan and the trips, all callables.

@ProviderFor(hostProgrammeTravelController)
final hostProgrammeTravelControllerProvider =
    HostProgrammeTravelControllerFamily._();

/// Travel across every pickup point: the programme, the arrivals roster,
/// the transport plan and the trips, all callables.

final class HostProgrammeTravelControllerProvider
    extends
        $FunctionalProvider<
          HostProgrammeTravelState,
          HostProgrammeTravelState,
          HostProgrammeTravelState
        >
    with $Provider<HostProgrammeTravelState> {
  /// Travel across every pickup point: the programme, the arrivals roster,
  /// the transport plan and the trips, all callables.
  HostProgrammeTravelControllerProvider._({
    required HostProgrammeTravelControllerFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostProgrammeTravelControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostProgrammeTravelControllerHash();

  @override
  String toString() {
    return r'hostProgrammeTravelControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<HostProgrammeTravelState> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostProgrammeTravelState create(Ref ref) {
    final argument = this.argument as String;
    return hostProgrammeTravelController(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostProgrammeTravelState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostProgrammeTravelState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostProgrammeTravelControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostProgrammeTravelControllerHash() =>
    r'93e493afcad1f76e0fb09a109715caef172bbf00';

/// Travel across every pickup point: the programme, the arrivals roster,
/// the transport plan and the trips, all callables.

final class HostProgrammeTravelControllerFamily extends $Family
    with $FunctionalFamilyOverride<HostProgrammeTravelState, String> {
  HostProgrammeTravelControllerFamily._()
    : super(
        retry: null,
        name: r'hostProgrammeTravelControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Travel across every pickup point: the programme, the arrivals roster,
  /// the transport plan and the trips, all callables.

  HostProgrammeTravelControllerProvider call(String programId) =>
      HostProgrammeTravelControllerProvider._(argument: programId, from: this);

  @override
  String toString() => r'hostProgrammeTravelControllerProvider';
}
