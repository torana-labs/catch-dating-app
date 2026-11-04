// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_publication_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(eventPublicationDependencies)
final eventPublicationDependenciesProvider =
    EventPublicationDependenciesProvider._();

final class EventPublicationDependenciesProvider
    extends
        $FunctionalProvider<
          EventPublicationDependencies,
          EventPublicationDependencies,
          EventPublicationDependencies
        >
    with $Provider<EventPublicationDependencies> {
  EventPublicationDependenciesProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventPublicationDependenciesProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$eventPublicationDependenciesHash();

  @$internal
  @override
  $ProviderElement<EventPublicationDependencies> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  EventPublicationDependencies create(Ref ref) {
    return eventPublicationDependencies(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EventPublicationDependencies value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EventPublicationDependencies>(value),
    );
  }
}

String _$eventPublicationDependenciesHash() =>
    r'8fdf38bde83520eabf62509f3ae4ff4ac28444b8';

@ProviderFor(EventPublicationController)
final eventPublicationControllerProvider = EventPublicationControllerFamily._();

final class EventPublicationControllerProvider
    extends
        $NotifierProvider<EventPublicationController, EventPublicationState> {
  EventPublicationControllerProvider._({
    required EventPublicationControllerFamily super.from,
    required EventEditorScope super.argument,
  }) : super(
         retry: null,
         name: r'eventPublicationControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$eventPublicationControllerHash();

  @override
  String toString() {
    return r'eventPublicationControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  EventPublicationController create() => EventPublicationController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EventPublicationState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EventPublicationState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventPublicationControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventPublicationControllerHash() =>
    r'f1adc7795acb9ea18cc033b83a2195e22679f17b';

final class EventPublicationControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          EventPublicationController,
          EventPublicationState,
          EventPublicationState,
          EventPublicationState,
          EventEditorScope
        > {
  EventPublicationControllerFamily._()
    : super(
        retry: null,
        name: r'eventPublicationControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  EventPublicationControllerProvider call(EventEditorScope scope) =>
      EventPublicationControllerProvider._(argument: scope, from: this);

  @override
  String toString() => r'eventPublicationControllerProvider';
}

abstract class _$EventPublicationController
    extends $Notifier<EventPublicationState> {
  late final _$args = ref.$arg as EventEditorScope;
  EventEditorScope get scope => _$args;

  EventPublicationState build(EventEditorScope scope);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<EventPublicationState, EventPublicationState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<EventPublicationState, EventPublicationState>,
              EventPublicationState,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}
