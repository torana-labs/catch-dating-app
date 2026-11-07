// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_defaults_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Event defaults, read through the organizer's defaults view listener.

@ProviderFor(hostEventDefaultsController)
final hostEventDefaultsControllerProvider =
    HostEventDefaultsControllerFamily._();

/// Event defaults, read through the organizer's defaults view listener.

final class HostEventDefaultsControllerProvider
    extends
        $FunctionalProvider<
          HostEventDefaultsState,
          HostEventDefaultsState,
          HostEventDefaultsState
        >
    with $Provider<HostEventDefaultsState> {
  /// Event defaults, read through the organizer's defaults view listener.
  HostEventDefaultsControllerProvider._({
    required HostEventDefaultsControllerFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostEventDefaultsControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostEventDefaultsControllerHash();

  @override
  String toString() {
    return r'hostEventDefaultsControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<HostEventDefaultsState> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostEventDefaultsState create(Ref ref) {
    final argument = this.argument as String;
    return hostEventDefaultsController(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostEventDefaultsState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostEventDefaultsState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostEventDefaultsControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostEventDefaultsControllerHash() =>
    r'2f4e70720434df80a2e9846b13ce2944b4350f5e';

/// Event defaults, read through the organizer's defaults view listener.

final class HostEventDefaultsControllerFamily extends $Family
    with $FunctionalFamilyOverride<HostEventDefaultsState, String> {
  HostEventDefaultsControllerFamily._()
    : super(
        retry: null,
        name: r'hostEventDefaultsControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Event defaults, read through the organizer's defaults view listener.

  HostEventDefaultsControllerProvider call(String organizerId) =>
      HostEventDefaultsControllerProvider._(argument: organizerId, from: this);

  @override
  String toString() => r'hostEventDefaultsControllerProvider';
}
