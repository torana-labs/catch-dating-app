// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_rehearsal_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(eventRehearsalRepository)
final eventRehearsalRepositoryProvider = EventRehearsalRepositoryProvider._();

final class EventRehearsalRepositoryProvider
    extends
        $FunctionalProvider<
          EventRehearsalRepository,
          EventRehearsalRepository,
          EventRehearsalRepository
        >
    with $Provider<EventRehearsalRepository> {
  EventRehearsalRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventRehearsalRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$eventRehearsalRepositoryHash();

  @$internal
  @override
  $ProviderElement<EventRehearsalRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  EventRehearsalRepository create(Ref ref) {
    return eventRehearsalRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EventRehearsalRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EventRehearsalRepository>(value),
    );
  }
}

String _$eventRehearsalRepositoryHash() =>
    r'a608e90cbb94f9a54644dfde311244510359a7e7';

@ProviderFor(eventRehearsalAssistanceCommands)
final eventRehearsalAssistanceCommandsProvider =
    EventRehearsalAssistanceCommandsProvider._();

final class EventRehearsalAssistanceCommandsProvider
    extends
        $FunctionalProvider<
          EventRehearsalAssistanceCommands,
          EventRehearsalAssistanceCommands,
          EventRehearsalAssistanceCommands
        >
    with $Provider<EventRehearsalAssistanceCommands> {
  EventRehearsalAssistanceCommandsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventRehearsalAssistanceCommandsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$eventRehearsalAssistanceCommandsHash();

  @$internal
  @override
  $ProviderElement<EventRehearsalAssistanceCommands> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  EventRehearsalAssistanceCommands create(Ref ref) {
    return eventRehearsalAssistanceCommands(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EventRehearsalAssistanceCommands value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EventRehearsalAssistanceCommands>(
        value,
      ),
    );
  }
}

String _$eventRehearsalAssistanceCommandsHash() =>
    r'c33cac2bcfa1ab3d38f0fb32719295c4fb68a3c8';

@ProviderFor(eventRehearsal)
final eventRehearsalProvider = EventRehearsalFamily._();

final class EventRehearsalProvider
    extends
        $FunctionalProvider<
          AsyncValue<EventRehearsalBootstrap>,
          EventRehearsalBootstrap,
          Stream<EventRehearsalBootstrap>
        >
    with
        $FutureModifier<EventRehearsalBootstrap>,
        $StreamProvider<EventRehearsalBootstrap> {
  EventRehearsalProvider._({
    required EventRehearsalFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'eventRehearsalProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$eventRehearsalHash();

  @override
  String toString() {
    return r'eventRehearsalProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<EventRehearsalBootstrap> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<EventRehearsalBootstrap> create(Ref ref) {
    final argument = this.argument as String;
    return eventRehearsal(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is EventRehearsalProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventRehearsalHash() => r'63027a279ca91ac0475901b7cfc74cee3e5ad64f';

final class EventRehearsalFamily extends $Family
    with $FunctionalFamilyOverride<Stream<EventRehearsalBootstrap>, String> {
  EventRehearsalFamily._()
    : super(
        retry: null,
        name: r'eventRehearsalProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  EventRehearsalProvider call(String sessionId) =>
      EventRehearsalProvider._(argument: sessionId, from: this);

  @override
  String toString() => r'eventRehearsalProvider';
}
