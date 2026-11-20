// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'rehearsal_practice_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The practice console, composed from the rehearsal session read alone.
/// Nothing here reads or writes a real event: the rehearsal's projection
/// (its made-up guests, plan and virtual clock) feeds the same state
/// builders the live listeners use.

@ProviderFor(hostRehearsalPracticeController)
final hostRehearsalPracticeControllerProvider =
    HostRehearsalPracticeControllerFamily._();

/// The practice console, composed from the rehearsal session read alone.
/// Nothing here reads or writes a real event: the rehearsal's projection
/// (its made-up guests, plan and virtual clock) feeds the same state
/// builders the live listeners use.

final class HostRehearsalPracticeControllerProvider
    extends
        $FunctionalProvider<
          HostRehearsalPracticeState,
          HostRehearsalPracticeState,
          HostRehearsalPracticeState
        >
    with $Provider<HostRehearsalPracticeState> {
  /// The practice console, composed from the rehearsal session read alone.
  /// Nothing here reads or writes a real event: the rehearsal's projection
  /// (its made-up guests, plan and virtual clock) feeds the same state
  /// builders the live listeners use.
  HostRehearsalPracticeControllerProvider._({
    required HostRehearsalPracticeControllerFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostRehearsalPracticeControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostRehearsalPracticeControllerHash();

  @override
  String toString() {
    return r'hostRehearsalPracticeControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<HostRehearsalPracticeState> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostRehearsalPracticeState create(Ref ref) {
    final argument = this.argument as String;
    return hostRehearsalPracticeController(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostRehearsalPracticeState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostRehearsalPracticeState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostRehearsalPracticeControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostRehearsalPracticeControllerHash() =>
    r'ebac060ea90c825a3846b7557a625b521d603f22';

/// The practice console, composed from the rehearsal session read alone.
/// Nothing here reads or writes a real event: the rehearsal's projection
/// (its made-up guests, plan and virtual clock) feeds the same state
/// builders the live listeners use.

final class HostRehearsalPracticeControllerFamily extends $Family
    with $FunctionalFamilyOverride<HostRehearsalPracticeState, String> {
  HostRehearsalPracticeControllerFamily._()
    : super(
        retry: null,
        name: r'hostRehearsalPracticeControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The practice console, composed from the rehearsal session read alone.
  /// Nothing here reads or writes a real event: the rehearsal's projection
  /// (its made-up guests, plan and virtual clock) feeds the same state
  /// builders the live listeners use.

  HostRehearsalPracticeControllerProvider call(String sessionId) =>
      HostRehearsalPracticeControllerProvider._(
        argument: sessionId,
        from: this,
      );

  @override
  String toString() => r'hostRehearsalPracticeControllerProvider';
}
