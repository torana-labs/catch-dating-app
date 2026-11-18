// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'formats_sweep_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The sweep, composed from listeners only: the guest list (who is checked
/// in and who is accounted for), the plan (its revision and whether it is
/// complete) and close-out (its switches).

@ProviderFor(hostFormatsSweepController)
final hostFormatsSweepControllerProvider = HostFormatsSweepControllerFamily._();

/// The sweep, composed from listeners only: the guest list (who is checked
/// in and who is accounted for), the plan (its revision and whether it is
/// complete) and close-out (its switches).

final class HostFormatsSweepControllerProvider
    extends
        $FunctionalProvider<
          HostFormatsSweepState,
          HostFormatsSweepState,
          HostFormatsSweepState
        >
    with $Provider<HostFormatsSweepState> {
  /// The sweep, composed from listeners only: the guest list (who is checked
  /// in and who is accounted for), the plan (its revision and whether it is
  /// complete) and close-out (its switches).
  HostFormatsSweepControllerProvider._({
    required HostFormatsSweepControllerFamily super.from,
    required Event super.argument,
  }) : super(
         retry: null,
         name: r'hostFormatsSweepControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostFormatsSweepControllerHash();

  @override
  String toString() {
    return r'hostFormatsSweepControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<HostFormatsSweepState> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostFormatsSweepState create(Ref ref) {
    final argument = this.argument as Event;
    return hostFormatsSweepController(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostFormatsSweepState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostFormatsSweepState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostFormatsSweepControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostFormatsSweepControllerHash() =>
    r'066bc1d6f3e18c91bbffd7e29278ab646f819592';

/// The sweep, composed from listeners only: the guest list (who is checked
/// in and who is accounted for), the plan (its revision and whether it is
/// complete) and close-out (its switches).

final class HostFormatsSweepControllerFamily extends $Family
    with $FunctionalFamilyOverride<HostFormatsSweepState, Event> {
  HostFormatsSweepControllerFamily._()
    : super(
        retry: null,
        name: r'hostFormatsSweepControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The sweep, composed from listeners only: the guest list (who is checked
  /// in and who is accounted for), the plan (its revision and whether it is
  /// complete) and close-out (its switches).

  HostFormatsSweepControllerProvider call(Event event) =>
      HostFormatsSweepControllerProvider._(argument: event, from: this);

  @override
  String toString() => r'hostFormatsSweepControllerProvider';
}
