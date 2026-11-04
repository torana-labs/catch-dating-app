// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_assistance_late_join_setting_editor.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// One event or group owns one pending late arrival preference across page refresh and sheet closure.

@ProviderFor(EventAssistanceLateJoinSettingEditor)
final eventAssistanceLateJoinSettingEditorProvider =
    EventAssistanceLateJoinSettingEditorFamily._();

/// One event or group owns one pending late arrival preference across page refresh and sheet closure.
final class EventAssistanceLateJoinSettingEditorProvider
    extends
        $NotifierProvider<
          EventAssistanceLateJoinSettingEditor,
          LateJoinSettingEditorState
        > {
  /// One event or group owns one pending late arrival preference across page refresh and sheet closure.
  EventAssistanceLateJoinSettingEditorProvider._({
    required EventAssistanceLateJoinSettingEditorFamily super.from,
    required EventAssistanceGroupScope super.argument,
  }) : super(
         retry: null,
         name: r'eventAssistanceLateJoinSettingEditorProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$eventAssistanceLateJoinSettingEditorHash();

  @override
  String toString() {
    return r'eventAssistanceLateJoinSettingEditorProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  EventAssistanceLateJoinSettingEditor create() =>
      EventAssistanceLateJoinSettingEditor();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(LateJoinSettingEditorState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<LateJoinSettingEditorState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventAssistanceLateJoinSettingEditorProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventAssistanceLateJoinSettingEditorHash() =>
    r'78ad75a2cb1be0c44f6f8c86b4d34f4337a71317';

/// One event or group owns one pending late arrival preference across page refresh and sheet closure.

final class EventAssistanceLateJoinSettingEditorFamily extends $Family
    with
        $ClassFamilyOverride<
          EventAssistanceLateJoinSettingEditor,
          LateJoinSettingEditorState,
          LateJoinSettingEditorState,
          LateJoinSettingEditorState,
          EventAssistanceGroupScope
        > {
  EventAssistanceLateJoinSettingEditorFamily._()
    : super(
        retry: null,
        name: r'eventAssistanceLateJoinSettingEditorProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// One event or group owns one pending late arrival preference across page refresh and sheet closure.

  EventAssistanceLateJoinSettingEditorProvider call(
    EventAssistanceGroupScope scope,
  ) => EventAssistanceLateJoinSettingEditorProvider._(
    argument: scope,
    from: this,
  );

  @override
  String toString() => r'eventAssistanceLateJoinSettingEditorProvider';
}

/// One event or group owns one pending late arrival preference across page refresh and sheet closure.

abstract class _$EventAssistanceLateJoinSettingEditor
    extends $Notifier<LateJoinSettingEditorState> {
  late final _$args = ref.$arg as EventAssistanceGroupScope;
  EventAssistanceGroupScope get scope => _$args;

  LateJoinSettingEditorState build(EventAssistanceGroupScope scope);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<LateJoinSettingEditorState, LateJoinSettingEditorState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                LateJoinSettingEditorState,
                LateJoinSettingEditorState
              >,
              LateJoinSettingEditorState,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}
