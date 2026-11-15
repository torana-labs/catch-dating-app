// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_rehearsal_settings_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// One rehearsal owns one unresolved event rule or simulated runtime decision.
/// Refresh, dismissal and a different selection cannot replace its frozen request.

@ProviderFor(EventRehearsalSettingsController)
final eventRehearsalSettingsControllerProvider =
    EventRehearsalSettingsControllerFamily._();

/// One rehearsal owns one unresolved event rule or simulated runtime decision.
/// Refresh, dismissal and a different selection cannot replace its frozen request.
final class EventRehearsalSettingsControllerProvider
    extends
        $NotifierProvider<
          EventRehearsalSettingsController,
          RehearsalSettingsEditorState
        > {
  /// One rehearsal owns one unresolved event rule or simulated runtime decision.
  /// Refresh, dismissal and a different selection cannot replace its frozen request.
  EventRehearsalSettingsControllerProvider._({
    required EventRehearsalSettingsControllerFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'eventRehearsalSettingsControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$eventRehearsalSettingsControllerHash();

  @override
  String toString() {
    return r'eventRehearsalSettingsControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  EventRehearsalSettingsController create() =>
      EventRehearsalSettingsController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(RehearsalSettingsEditorState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<RehearsalSettingsEditorState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventRehearsalSettingsControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventRehearsalSettingsControllerHash() =>
    r'c5e694d014715baab7e421e92d80fd77ad558c2f';

/// One rehearsal owns one unresolved event rule or simulated runtime decision.
/// Refresh, dismissal and a different selection cannot replace its frozen request.

final class EventRehearsalSettingsControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          EventRehearsalSettingsController,
          RehearsalSettingsEditorState,
          RehearsalSettingsEditorState,
          RehearsalSettingsEditorState,
          String
        > {
  EventRehearsalSettingsControllerFamily._()
    : super(
        retry: null,
        name: r'eventRehearsalSettingsControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// One rehearsal owns one unresolved event rule or simulated runtime decision.
  /// Refresh, dismissal and a different selection cannot replace its frozen request.

  EventRehearsalSettingsControllerProvider call(String sessionId) =>
      EventRehearsalSettingsControllerProvider._(
        argument: sessionId,
        from: this,
      );

  @override
  String toString() => r'eventRehearsalSettingsControllerProvider';
}

/// One rehearsal owns one unresolved event rule or simulated runtime decision.
/// Refresh, dismissal and a different selection cannot replace its frozen request.

abstract class _$EventRehearsalSettingsController
    extends $Notifier<RehearsalSettingsEditorState> {
  late final _$args = ref.$arg as String;
  String get sessionId => _$args;

  RehearsalSettingsEditorState build(String sessionId);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<RehearsalSettingsEditorState, RehearsalSettingsEditorState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                RehearsalSettingsEditorState,
                RehearsalSettingsEditorState
              >,
              RehearsalSettingsEditorState,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}
