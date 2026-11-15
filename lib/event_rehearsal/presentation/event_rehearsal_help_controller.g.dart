// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_rehearsal_help_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// One case owns one pending decision across page refresh and sheet closure.

@ProviderFor(EventRehearsalHelpController)
final eventRehearsalHelpControllerProvider =
    EventRehearsalHelpControllerFamily._();

/// One case owns one pending decision across page refresh and sheet closure.
final class EventRehearsalHelpControllerProvider
    extends
        $NotifierProvider<
          EventRehearsalHelpController,
          RehearsalHelpEditorState
        > {
  /// One case owns one pending decision across page refresh and sheet closure.
  EventRehearsalHelpControllerProvider._({
    required EventRehearsalHelpControllerFamily super.from,
    required RehearsalHelpScope super.argument,
  }) : super(
         retry: null,
         name: r'eventRehearsalHelpControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$eventRehearsalHelpControllerHash();

  @override
  String toString() {
    return r'eventRehearsalHelpControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  EventRehearsalHelpController create() => EventRehearsalHelpController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(RehearsalHelpEditorState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<RehearsalHelpEditorState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventRehearsalHelpControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventRehearsalHelpControllerHash() =>
    r'b5eb6c9715eafdf7f368ddc5e7b26b035f2a6b18';

/// One case owns one pending decision across page refresh and sheet closure.

final class EventRehearsalHelpControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          EventRehearsalHelpController,
          RehearsalHelpEditorState,
          RehearsalHelpEditorState,
          RehearsalHelpEditorState,
          RehearsalHelpScope
        > {
  EventRehearsalHelpControllerFamily._()
    : super(
        retry: null,
        name: r'eventRehearsalHelpControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// One case owns one pending decision across page refresh and sheet closure.

  EventRehearsalHelpControllerProvider call(RehearsalHelpScope scope) =>
      EventRehearsalHelpControllerProvider._(argument: scope, from: this);

  @override
  String toString() => r'eventRehearsalHelpControllerProvider';
}

/// One case owns one pending decision across page refresh and sheet closure.

abstract class _$EventRehearsalHelpController
    extends $Notifier<RehearsalHelpEditorState> {
  late final _$args = ref.$arg as RehearsalHelpScope;
  RehearsalHelpScope get scope => _$args;

  RehearsalHelpEditorState build(RehearsalHelpScope scope);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref as $Ref<RehearsalHelpEditorState, RehearsalHelpEditorState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<RehearsalHelpEditorState, RehearsalHelpEditorState>,
              RehearsalHelpEditorState,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}
