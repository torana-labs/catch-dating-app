// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'programme_rooms_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Rooms at [hotelId] (or the programme's first hotel): the programme and
/// the hotel's room board, both callables.

@ProviderFor(hostProgrammeRoomsController)
final hostProgrammeRoomsControllerProvider =
    HostProgrammeRoomsControllerFamily._();

/// Rooms at [hotelId] (or the programme's first hotel): the programme and
/// the hotel's room board, both callables.

final class HostProgrammeRoomsControllerProvider
    extends
        $FunctionalProvider<
          HostProgrammeRoomsState,
          HostProgrammeRoomsState,
          HostProgrammeRoomsState
        >
    with $Provider<HostProgrammeRoomsState> {
  /// Rooms at [hotelId] (or the programme's first hotel): the programme and
  /// the hotel's room board, both callables.
  HostProgrammeRoomsControllerProvider._({
    required HostProgrammeRoomsControllerFamily super.from,
    required (String, String?) super.argument,
  }) : super(
         retry: null,
         name: r'hostProgrammeRoomsControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostProgrammeRoomsControllerHash();

  @override
  String toString() {
    return r'hostProgrammeRoomsControllerProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $ProviderElement<HostProgrammeRoomsState> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostProgrammeRoomsState create(Ref ref) {
    final argument = this.argument as (String, String?);
    return hostProgrammeRoomsController(ref, argument.$1, argument.$2);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostProgrammeRoomsState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostProgrammeRoomsState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostProgrammeRoomsControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostProgrammeRoomsControllerHash() =>
    r'8ec8676fd8372e95388270b695b537fc6dfd68b6';

/// Rooms at [hotelId] (or the programme's first hotel): the programme and
/// the hotel's room board, both callables.

final class HostProgrammeRoomsControllerFamily extends $Family
    with $FunctionalFamilyOverride<HostProgrammeRoomsState, (String, String?)> {
  HostProgrammeRoomsControllerFamily._()
    : super(
        retry: null,
        name: r'hostProgrammeRoomsControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Rooms at [hotelId] (or the programme's first hotel): the programme and
  /// the hotel's room board, both callables.

  HostProgrammeRoomsControllerProvider call(
    String programId,
    String? hotelId,
  ) => HostProgrammeRoomsControllerProvider._(
    argument: (programId, hotelId),
    from: this,
  );

  @override
  String toString() => r'hostProgrammeRoomsControllerProvider';
}
