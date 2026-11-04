// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_assistance_delivery_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// One message owns one pending request across page refreshes and sheet closure.

@ProviderFor(EventAssistanceDeliveryController)
final eventAssistanceDeliveryControllerProvider =
    EventAssistanceDeliveryControllerFamily._();

/// One message owns one pending request across page refreshes and sheet closure.
final class EventAssistanceDeliveryControllerProvider
    extends
        $NotifierProvider<
          EventAssistanceDeliveryController,
          AssistanceDeliveryEditorState
        > {
  /// One message owns one pending request across page refreshes and sheet closure.
  EventAssistanceDeliveryControllerProvider._({
    required EventAssistanceDeliveryControllerFamily super.from,
    required EventAssistanceDeliveryScope super.argument,
  }) : super(
         retry: null,
         name: r'eventAssistanceDeliveryControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$eventAssistanceDeliveryControllerHash();

  @override
  String toString() {
    return r'eventAssistanceDeliveryControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  EventAssistanceDeliveryController create() =>
      EventAssistanceDeliveryController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AssistanceDeliveryEditorState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<AssistanceDeliveryEditorState>(
        value,
      ),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventAssistanceDeliveryControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventAssistanceDeliveryControllerHash() =>
    r'0264b32ae3d49837c923b81023e0c649247f3afb';

/// One message owns one pending request across page refreshes and sheet closure.

final class EventAssistanceDeliveryControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          EventAssistanceDeliveryController,
          AssistanceDeliveryEditorState,
          AssistanceDeliveryEditorState,
          AssistanceDeliveryEditorState,
          EventAssistanceDeliveryScope
        > {
  EventAssistanceDeliveryControllerFamily._()
    : super(
        retry: null,
        name: r'eventAssistanceDeliveryControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// One message owns one pending request across page refreshes and sheet closure.

  EventAssistanceDeliveryControllerProvider call(
    EventAssistanceDeliveryScope scope,
  ) => EventAssistanceDeliveryControllerProvider._(argument: scope, from: this);

  @override
  String toString() => r'eventAssistanceDeliveryControllerProvider';
}

/// One message owns one pending request across page refreshes and sheet closure.

abstract class _$EventAssistanceDeliveryController
    extends $Notifier<AssistanceDeliveryEditorState> {
  late final _$args = ref.$arg as EventAssistanceDeliveryScope;
  EventAssistanceDeliveryScope get scope => _$args;

  AssistanceDeliveryEditorState build(EventAssistanceDeliveryScope scope);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<
              AssistanceDeliveryEditorState,
              AssistanceDeliveryEditorState
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AssistanceDeliveryEditorState,
                AssistanceDeliveryEditorState
              >,
              AssistanceDeliveryEditorState,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}
