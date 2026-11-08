// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'organizer_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The Organiser tab composed from its read owners: the organizer listener
/// the screen already holds, the cached thirty-day host report Today also
/// reads, the newest Catch bill for owners and the signed-in profile.

@ProviderFor(organizerTabController)
final organizerTabControllerProvider = OrganizerTabControllerFamily._();

/// The Organiser tab composed from its read owners: the organizer listener
/// the screen already holds, the cached thirty-day host report Today also
/// reads, the newest Catch bill for owners and the signed-in profile.

final class OrganizerTabControllerProvider
    extends $FunctionalProvider<OrganizerState, OrganizerState, OrganizerState>
    with $Provider<OrganizerState> {
  /// The Organiser tab composed from its read owners: the organizer listener
  /// the screen already holds, the cached thirty-day host report Today also
  /// reads, the newest Catch bill for owners and the signed-in profile.
  OrganizerTabControllerProvider._({
    required OrganizerTabControllerFamily super.from,
    required OrganizerTabRequest super.argument,
  }) : super(
         retry: null,
         name: r'organizerTabControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$organizerTabControllerHash();

  @override
  String toString() {
    return r'organizerTabControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<OrganizerState> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  OrganizerState create(Ref ref) {
    final argument = this.argument as OrganizerTabRequest;
    return organizerTabController(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(OrganizerState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<OrganizerState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is OrganizerTabControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$organizerTabControllerHash() =>
    r'9bf1ecc337fab0b906c6a71ed6611d2d669cb615';

/// The Organiser tab composed from its read owners: the organizer listener
/// the screen already holds, the cached thirty-day host report Today also
/// reads, the newest Catch bill for owners and the signed-in profile.

final class OrganizerTabControllerFamily extends $Family
    with $FunctionalFamilyOverride<OrganizerState, OrganizerTabRequest> {
  OrganizerTabControllerFamily._()
    : super(
        retry: null,
        name: r'organizerTabControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The Organiser tab composed from its read owners: the organizer listener
  /// the screen already holds, the cached thirty-day host report Today also
  /// reads, the newest Catch bill for owners and the signed-in profile.

  OrganizerTabControllerProvider call(OrganizerTabRequest request) =>
      OrganizerTabControllerProvider._(argument: request, from: this);

  @override
  String toString() => r'organizerTabControllerProvider';
}
