// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'create_event_photo_recovery_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// One organizer's creation/reentry flow, reset on every authentication session
/// change. The shared journal owns durable recovery and execution leases.

@ProviderFor(CreateEventPhotoRecoveryController)
final createEventPhotoRecoveryControllerProvider =
    CreateEventPhotoRecoveryControllerFamily._();

/// One organizer's creation/reentry flow, reset on every authentication session
/// change. The shared journal owns durable recovery and execution leases.
final class CreateEventPhotoRecoveryControllerProvider
    extends
        $NotifierProvider<
          CreateEventPhotoRecoveryController,
          CreateEventRecoveryState
        > {
  /// One organizer's creation/reentry flow, reset on every authentication session
  /// change. The shared journal owns durable recovery and execution leases.
  CreateEventPhotoRecoveryControllerProvider._({
    required CreateEventPhotoRecoveryControllerFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'createEventPhotoRecoveryControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$createEventPhotoRecoveryControllerHash();

  @override
  String toString() {
    return r'createEventPhotoRecoveryControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  CreateEventPhotoRecoveryController create() =>
      CreateEventPhotoRecoveryController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(CreateEventRecoveryState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<CreateEventRecoveryState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is CreateEventPhotoRecoveryControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$createEventPhotoRecoveryControllerHash() =>
    r'13e2a31760470d27757c60bdac3d0cd9ca3f74ec';

/// One organizer's creation/reentry flow, reset on every authentication session
/// change. The shared journal owns durable recovery and execution leases.

final class CreateEventPhotoRecoveryControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          CreateEventPhotoRecoveryController,
          CreateEventRecoveryState,
          CreateEventRecoveryState,
          CreateEventRecoveryState,
          String
        > {
  CreateEventPhotoRecoveryControllerFamily._()
    : super(
        retry: null,
        name: r'createEventPhotoRecoveryControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// One organizer's creation/reentry flow, reset on every authentication session
  /// change. The shared journal owns durable recovery and execution leases.

  CreateEventPhotoRecoveryControllerProvider call(String organizerId) =>
      CreateEventPhotoRecoveryControllerProvider._(
        argument: organizerId,
        from: this,
      );

  @override
  String toString() => r'createEventPhotoRecoveryControllerProvider';
}

/// One organizer's creation/reentry flow, reset on every authentication session
/// change. The shared journal owns durable recovery and execution leases.

abstract class _$CreateEventPhotoRecoveryController
    extends $Notifier<CreateEventRecoveryState> {
  late final _$args = ref.$arg as String;
  String get organizerId => _$args;

  CreateEventRecoveryState build(String organizerId);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref as $Ref<CreateEventRecoveryState, CreateEventRecoveryState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<CreateEventRecoveryState, CreateEventRecoveryState>,
              CreateEventRecoveryState,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}
