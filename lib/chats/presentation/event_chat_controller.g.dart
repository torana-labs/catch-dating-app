// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_chat_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(eventChatNow)
@Deprecated('Read appClockProvider; 1.3b moves the callers and deletes this.')
final eventChatNowProvider = EventChatNowProvider._();

@Deprecated('Read appClockProvider; 1.3b moves the callers and deletes this.')
final class EventChatNowProvider
    extends
        $FunctionalProvider<
          DateTime Function(),
          DateTime Function(),
          DateTime Function()
        >
    with $Provider<DateTime Function()> {
  EventChatNowProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventChatNowProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$eventChatNowHash();

  @$internal
  @override
  $ProviderElement<DateTime Function()> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  DateTime Function() create(Ref ref) {
    return eventChatNow(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(DateTime Function() value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<DateTime Function()>(value),
    );
  }
}

String _$eventChatNowHash() => r'2462d8010f10887254b164e1e3e90365c4b91565';

/// All visible history is revalidated, including reply quotes. Failed reads,
/// backgrounding and identity changes never retain an old readable snapshot.

@ProviderFor(EventChatController)
final eventChatControllerProvider = EventChatControllerFamily._();

/// All visible history is revalidated, including reply quotes. Failed reads,
/// backgrounding and identity changes never retain an old readable snapshot.
final class EventChatControllerProvider
    extends $AsyncNotifierProvider<EventChatController, EventChatState> {
  /// All visible history is revalidated, including reply quotes. Failed reads,
  /// backgrounding and identity changes never retain an old readable snapshot.
  EventChatControllerProvider._({
    required EventChatControllerFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'eventChatControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$eventChatControllerHash();

  @override
  String toString() {
    return r'eventChatControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  EventChatController create() => EventChatController();

  @override
  bool operator ==(Object other) {
    return other is EventChatControllerProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventChatControllerHash() =>
    r'4df8b8466d81343cd03990dafbdd56a9019533bb';

/// All visible history is revalidated, including reply quotes. Failed reads,
/// backgrounding and identity changes never retain an old readable snapshot.

final class EventChatControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          EventChatController,
          AsyncValue<EventChatState>,
          EventChatState,
          FutureOr<EventChatState>,
          String
        > {
  EventChatControllerFamily._()
    : super(
        retry: null,
        name: r'eventChatControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// All visible history is revalidated, including reply quotes. Failed reads,
  /// backgrounding and identity changes never retain an old readable snapshot.

  EventChatControllerProvider call(String eventId) =>
      EventChatControllerProvider._(argument: eventId, from: this);

  @override
  String toString() => r'eventChatControllerProvider';
}

/// All visible history is revalidated, including reply quotes. Failed reads,
/// backgrounding and identity changes never retain an old readable snapshot.

abstract class _$EventChatController extends $AsyncNotifier<EventChatState> {
  late final _$args = ref.$arg as String;
  String get eventId => _$args;

  FutureOr<EventChatState> build(String eventId);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<AsyncValue<EventChatState>, EventChatState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<EventChatState>, EventChatState>,
              AsyncValue<EventChatState>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}
