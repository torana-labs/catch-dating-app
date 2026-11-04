// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_assistance_accountability_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// One guest owns one pending visit result across groups, checkpoints and sheet closure.

@ProviderFor(EventAssistanceAccountabilityController)
final eventAssistanceAccountabilityControllerProvider =
    EventAssistanceAccountabilityControllerFamily._();

/// One guest owns one pending visit result across groups, checkpoints and sheet closure.
final class EventAssistanceAccountabilityControllerProvider
    extends
        $NotifierProvider<
          EventAssistanceAccountabilityController,
          AccountabilityEditorState
        > {
  /// One guest owns one pending visit result across groups, checkpoints and sheet closure.
  EventAssistanceAccountabilityControllerProvider._({
    required EventAssistanceAccountabilityControllerFamily super.from,
    required EventAssistanceGuestScope super.argument,
  }) : super(
         retry: null,
         name: r'eventAssistanceAccountabilityControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$eventAssistanceAccountabilityControllerHash();

  @override
  String toString() {
    return r'eventAssistanceAccountabilityControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  EventAssistanceAccountabilityController create() =>
      EventAssistanceAccountabilityController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AccountabilityEditorState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<AccountabilityEditorState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventAssistanceAccountabilityControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventAssistanceAccountabilityControllerHash() =>
    r'7e2004e6aae46fe178779ce09678f27e94dac208';

/// One guest owns one pending visit result across groups, checkpoints and sheet closure.

final class EventAssistanceAccountabilityControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          EventAssistanceAccountabilityController,
          AccountabilityEditorState,
          AccountabilityEditorState,
          AccountabilityEditorState,
          EventAssistanceGuestScope
        > {
  EventAssistanceAccountabilityControllerFamily._()
    : super(
        retry: null,
        name: r'eventAssistanceAccountabilityControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// One guest owns one pending visit result across groups, checkpoints and sheet closure.

  EventAssistanceAccountabilityControllerProvider call(
    EventAssistanceGuestScope guest,
  ) => EventAssistanceAccountabilityControllerProvider._(
    argument: guest,
    from: this,
  );

  @override
  String toString() => r'eventAssistanceAccountabilityControllerProvider';
}

/// One guest owns one pending visit result across groups, checkpoints and sheet closure.

abstract class _$EventAssistanceAccountabilityController
    extends $Notifier<AccountabilityEditorState> {
  late final _$args = ref.$arg as EventAssistanceGuestScope;
  EventAssistanceGuestScope get guest => _$args;

  AccountabilityEditorState build(EventAssistanceGuestScope guest);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref as $Ref<AccountabilityEditorState, AccountabilityEditorState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AccountabilityEditorState, AccountabilityEditorState>,
              AccountabilityEditorState,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}
