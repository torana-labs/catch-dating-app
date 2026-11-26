// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'edit_event_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Editing a saved event with the create editor. The event fills the draft;
/// what bookings lock is worked out once, when editing starts; Save checks
/// the draft and hands back the update the backend checks again.
///
/// It reads the event's private access for an invite-only event's code;
/// it writes nothing itself.

@ProviderFor(EditEventController)
final editEventControllerProvider = EditEventControllerFamily._();

/// Editing a saved event with the create editor. The event fills the draft;
/// what bookings lock is worked out once, when editing starts; Save checks
/// the draft and hands back the update the backend checks again.
///
/// It reads the event's private access for an invite-only event's code;
/// it writes nothing itself.
final class EditEventControllerProvider
    extends $NotifierProvider<EditEventController, CreateFlowState> {
  /// Editing a saved event with the create editor. The event fills the draft;
  /// what bookings lock is worked out once, when editing starts; Save checks
  /// the draft and hands back the update the backend checks again.
  ///
  /// It reads the event's private access for an invite-only event's code;
  /// it writes nothing itself.
  EditEventControllerProvider._({
    required EditEventControllerFamily super.from,
    required EditEventArgs super.argument,
  }) : super(
         retry: null,
         name: r'editEventControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$editEventControllerHash();

  @override
  String toString() {
    return r'editEventControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  EditEventController create() => EditEventController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(CreateFlowState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<CreateFlowState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EditEventControllerProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$editEventControllerHash() =>
    r'e9acc63162ec72cb7e826a457bfa5a1f6399eff0';

/// Editing a saved event with the create editor. The event fills the draft;
/// what bookings lock is worked out once, when editing starts; Save checks
/// the draft and hands back the update the backend checks again.
///
/// It reads the event's private access for an invite-only event's code;
/// it writes nothing itself.

final class EditEventControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          EditEventController,
          CreateFlowState,
          CreateFlowState,
          CreateFlowState,
          EditEventArgs
        > {
  EditEventControllerFamily._()
    : super(
        retry: null,
        name: r'editEventControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Editing a saved event with the create editor. The event fills the draft;
  /// what bookings lock is worked out once, when editing starts; Save checks
  /// the draft and hands back the update the backend checks again.
  ///
  /// It reads the event's private access for an invite-only event's code;
  /// it writes nothing itself.

  EditEventControllerProvider call(EditEventArgs args) =>
      EditEventControllerProvider._(argument: args, from: this);

  @override
  String toString() => r'editEventControllerProvider';
}

/// Editing a saved event with the create editor. The event fills the draft;
/// what bookings lock is worked out once, when editing starts; Save checks
/// the draft and hands back the update the backend checks again.
///
/// It reads the event's private access for an invite-only event's code;
/// it writes nothing itself.

abstract class _$EditEventController extends $Notifier<CreateFlowState> {
  late final _$args = ref.$arg as EditEventArgs;
  EditEventArgs get args => _$args;

  CreateFlowState build(EditEventArgs args);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<CreateFlowState, CreateFlowState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<CreateFlowState, CreateFlowState>,
              CreateFlowState,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}
