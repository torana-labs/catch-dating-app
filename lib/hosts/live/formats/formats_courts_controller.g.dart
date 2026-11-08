// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'formats_courts_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The court board, composed from listeners only: the plan (the round
/// playing now and its fence), the rotation assignments, the rounds made
/// but not sent yet, and the guest list for names.

@ProviderFor(hostFormatsCourtsController)
final hostFormatsCourtsControllerProvider =
    HostFormatsCourtsControllerFamily._();

/// The court board, composed from listeners only: the plan (the round
/// playing now and its fence), the rotation assignments, the rounds made
/// but not sent yet, and the guest list for names.

final class HostFormatsCourtsControllerProvider
    extends
        $FunctionalProvider<
          HostFormatsCourtsState,
          HostFormatsCourtsState,
          HostFormatsCourtsState
        >
    with $Provider<HostFormatsCourtsState> {
  /// The court board, composed from listeners only: the plan (the round
  /// playing now and its fence), the rotation assignments, the rounds made
  /// but not sent yet, and the guest list for names.
  HostFormatsCourtsControllerProvider._({
    required HostFormatsCourtsControllerFamily super.from,
    required Event super.argument,
  }) : super(
         retry: null,
         name: r'hostFormatsCourtsControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostFormatsCourtsControllerHash();

  @override
  String toString() {
    return r'hostFormatsCourtsControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<HostFormatsCourtsState> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostFormatsCourtsState create(Ref ref) {
    final argument = this.argument as Event;
    return hostFormatsCourtsController(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostFormatsCourtsState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostFormatsCourtsState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostFormatsCourtsControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostFormatsCourtsControllerHash() =>
    r'31b7d26cae08874374bce5d80415506c07babbf6';

/// The court board, composed from listeners only: the plan (the round
/// playing now and its fence), the rotation assignments, the rounds made
/// but not sent yet, and the guest list for names.

final class HostFormatsCourtsControllerFamily extends $Family
    with $FunctionalFamilyOverride<HostFormatsCourtsState, Event> {
  HostFormatsCourtsControllerFamily._()
    : super(
        retry: null,
        name: r'hostFormatsCourtsControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The court board, composed from listeners only: the plan (the round
  /// playing now and its fence), the rotation assignments, the rounds made
  /// but not sent yet, and the guest list for names.

  HostFormatsCourtsControllerProvider call(Event event) =>
      HostFormatsCourtsControllerProvider._(argument: event, from: this);

  @override
  String toString() => r'hostFormatsCourtsControllerProvider';
}

/// The court setup, composed from the plan, the rotations already made
/// (for the preview) and the roster (for how many play).

@ProviderFor(hostFormatsCourtsSetupController)
final hostFormatsCourtsSetupControllerProvider =
    HostFormatsCourtsSetupControllerFamily._();

/// The court setup, composed from the plan, the rotations already made
/// (for the preview) and the roster (for how many play).

final class HostFormatsCourtsSetupControllerProvider
    extends
        $FunctionalProvider<
          HostFormatsCourtsSetupState,
          HostFormatsCourtsSetupState,
          HostFormatsCourtsSetupState
        >
    with $Provider<HostFormatsCourtsSetupState> {
  /// The court setup, composed from the plan, the rotations already made
  /// (for the preview) and the roster (for how many play).
  HostFormatsCourtsSetupControllerProvider._({
    required HostFormatsCourtsSetupControllerFamily super.from,
    required Event super.argument,
  }) : super(
         retry: null,
         name: r'hostFormatsCourtsSetupControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostFormatsCourtsSetupControllerHash();

  @override
  String toString() {
    return r'hostFormatsCourtsSetupControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<HostFormatsCourtsSetupState> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostFormatsCourtsSetupState create(Ref ref) {
    final argument = this.argument as Event;
    return hostFormatsCourtsSetupController(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostFormatsCourtsSetupState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostFormatsCourtsSetupState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostFormatsCourtsSetupControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostFormatsCourtsSetupControllerHash() =>
    r'78784decd85dd070dc453cd3a393e10ffa48a838';

/// The court setup, composed from the plan, the rotations already made
/// (for the preview) and the roster (for how many play).

final class HostFormatsCourtsSetupControllerFamily extends $Family
    with $FunctionalFamilyOverride<HostFormatsCourtsSetupState, Event> {
  HostFormatsCourtsSetupControllerFamily._()
    : super(
        retry: null,
        name: r'hostFormatsCourtsSetupControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The court setup, composed from the plan, the rotations already made
  /// (for the preview) and the roster (for how many play).

  HostFormatsCourtsSetupControllerProvider call(Event event) =>
      HostFormatsCourtsSetupControllerProvider._(argument: event, from: this);

  @override
  String toString() => r'hostFormatsCourtsSetupControllerProvider';
}
