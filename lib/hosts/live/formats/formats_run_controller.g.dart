// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'formats_run_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The run console, composed from listeners only: the plan (the step on
/// now), the sweep (who is checked in and who is back) and, for each runner
/// checked in, the membership view that says which pace pod they are in.

@ProviderFor(hostFormatsRunController)
final hostFormatsRunControllerProvider = HostFormatsRunControllerFamily._();

/// The run console, composed from listeners only: the plan (the step on
/// now), the sweep (who is checked in and who is back) and, for each runner
/// checked in, the membership view that says which pace pod they are in.

final class HostFormatsRunControllerProvider
    extends
        $FunctionalProvider<
          HostFormatsRunState,
          HostFormatsRunState,
          HostFormatsRunState
        >
    with $Provider<HostFormatsRunState> {
  /// The run console, composed from listeners only: the plan (the step on
  /// now), the sweep (who is checked in and who is back) and, for each runner
  /// checked in, the membership view that says which pace pod they are in.
  HostFormatsRunControllerProvider._({
    required HostFormatsRunControllerFamily super.from,
    required Event super.argument,
  }) : super(
         retry: null,
         name: r'hostFormatsRunControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostFormatsRunControllerHash();

  @override
  String toString() {
    return r'hostFormatsRunControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<HostFormatsRunState> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostFormatsRunState create(Ref ref) {
    final argument = this.argument as Event;
    return hostFormatsRunController(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostFormatsRunState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostFormatsRunState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostFormatsRunControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostFormatsRunControllerHash() =>
    r'3755c9fe51ea292c19eaa9e969d1e9c40d047f33';

/// The run console, composed from listeners only: the plan (the step on
/// now), the sweep (who is checked in and who is back) and, for each runner
/// checked in, the membership view that says which pace pod they are in.

final class HostFormatsRunControllerFamily extends $Family
    with $FunctionalFamilyOverride<HostFormatsRunState, Event> {
  HostFormatsRunControllerFamily._()
    : super(
        retry: null,
        name: r'hostFormatsRunControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The run console, composed from listeners only: the plan (the step on
  /// now), the sweep (who is checked in and who is back) and, for each runner
  /// checked in, the membership view that says which pace pod they are in.

  HostFormatsRunControllerProvider call(Event event) =>
      HostFormatsRunControllerProvider._(argument: event, from: this);

  @override
  String toString() => r'hostFormatsRunControllerProvider';
}
