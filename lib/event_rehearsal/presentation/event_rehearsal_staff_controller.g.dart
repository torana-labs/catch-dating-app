// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_rehearsal_staff_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// One rehearsal owns one unresolved staff edit, including new synthetic staff.
/// Refresh, dismissal and a different selection cannot replace its frozen request.

@ProviderFor(EventRehearsalStaffController)
final eventRehearsalStaffControllerProvider =
    EventRehearsalStaffControllerFamily._();

/// One rehearsal owns one unresolved staff edit, including new synthetic staff.
/// Refresh, dismissal and a different selection cannot replace its frozen request.
final class EventRehearsalStaffControllerProvider
    extends
        $NotifierProvider<
          EventRehearsalStaffController,
          RehearsalStaffEditorState
        > {
  /// One rehearsal owns one unresolved staff edit, including new synthetic staff.
  /// Refresh, dismissal and a different selection cannot replace its frozen request.
  EventRehearsalStaffControllerProvider._({
    required EventRehearsalStaffControllerFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'eventRehearsalStaffControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$eventRehearsalStaffControllerHash();

  @override
  String toString() {
    return r'eventRehearsalStaffControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  EventRehearsalStaffController create() => EventRehearsalStaffController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(RehearsalStaffEditorState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<RehearsalStaffEditorState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventRehearsalStaffControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventRehearsalStaffControllerHash() =>
    r'05a59b285383ab705a4e2a2a40c450a0917dda56';

/// One rehearsal owns one unresolved staff edit, including new synthetic staff.
/// Refresh, dismissal and a different selection cannot replace its frozen request.

final class EventRehearsalStaffControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          EventRehearsalStaffController,
          RehearsalStaffEditorState,
          RehearsalStaffEditorState,
          RehearsalStaffEditorState,
          String
        > {
  EventRehearsalStaffControllerFamily._()
    : super(
        retry: null,
        name: r'eventRehearsalStaffControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// One rehearsal owns one unresolved staff edit, including new synthetic staff.
  /// Refresh, dismissal and a different selection cannot replace its frozen request.

  EventRehearsalStaffControllerProvider call(String sessionId) =>
      EventRehearsalStaffControllerProvider._(argument: sessionId, from: this);

  @override
  String toString() => r'eventRehearsalStaffControllerProvider';
}

/// One rehearsal owns one unresolved staff edit, including new synthetic staff.
/// Refresh, dismissal and a different selection cannot replace its frozen request.

abstract class _$EventRehearsalStaffController
    extends $Notifier<RehearsalStaffEditorState> {
  late final _$args = ref.$arg as String;
  String get sessionId => _$args;

  RehearsalStaffEditorState build(String sessionId);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref as $Ref<RehearsalStaffEditorState, RehearsalStaffEditorState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<RehearsalStaffEditorState, RehearsalStaffEditorState>,
              RehearsalStaffEditorState,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}
