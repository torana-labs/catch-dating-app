// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'formats_mix_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Team mixing, composed from listeners only: the plan (the step, the
/// reveal and its fence, the first-hello switch), the new tables and the
/// guest list for names.

@ProviderFor(hostFormatsMixController)
final hostFormatsMixControllerProvider = HostFormatsMixControllerFamily._();

/// Team mixing, composed from listeners only: the plan (the step, the
/// reveal and its fence, the first-hello switch), the new tables and the
/// guest list for names.

final class HostFormatsMixControllerProvider
    extends
        $FunctionalProvider<
          HostFormatsMixState,
          HostFormatsMixState,
          HostFormatsMixState
        >
    with $Provider<HostFormatsMixState> {
  /// Team mixing, composed from listeners only: the plan (the step, the
  /// reveal and its fence, the first-hello switch), the new tables and the
  /// guest list for names.
  HostFormatsMixControllerProvider._({
    required HostFormatsMixControllerFamily super.from,
    required Event super.argument,
  }) : super(
         retry: null,
         name: r'hostFormatsMixControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostFormatsMixControllerHash();

  @override
  String toString() {
    return r'hostFormatsMixControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<HostFormatsMixState> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostFormatsMixState create(Ref ref) {
    final argument = this.argument as Event;
    return hostFormatsMixController(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostFormatsMixState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostFormatsMixState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostFormatsMixControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostFormatsMixControllerHash() =>
    r'86660e0c665520d6f17450930b6bdc39707b9c01';

/// Team mixing, composed from listeners only: the plan (the step, the
/// reveal and its fence, the first-hello switch), the new tables and the
/// guest list for names.

final class HostFormatsMixControllerFamily extends $Family
    with $FunctionalFamilyOverride<HostFormatsMixState, Event> {
  HostFormatsMixControllerFamily._()
    : super(
        retry: null,
        name: r'hostFormatsMixControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Team mixing, composed from listeners only: the plan (the step, the
  /// reveal and its fence, the first-hello switch), the new tables and the
  /// guest list for names.

  HostFormatsMixControllerProvider call(Event event) =>
      HostFormatsMixControllerProvider._(argument: event, from: this);

  @override
  String toString() => r'hostFormatsMixControllerProvider';
}
