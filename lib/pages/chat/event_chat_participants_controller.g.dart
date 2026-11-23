// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_chat_participants_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// No offline roster: refresh every loaded page, discard on authority failure,
/// and hide names on backgrounding or account changes. The roster reads
/// again when the chat's change signal says the room or a membership moved;
/// nothing polls.

@ProviderFor(EventChatParticipantsController)
final eventChatParticipantsControllerProvider =
    EventChatParticipantsControllerFamily._();

/// No offline roster: refresh every loaded page, discard on authority failure,
/// and hide names on backgrounding or account changes. The roster reads
/// again when the chat's change signal says the room or a membership moved;
/// nothing polls.
final class EventChatParticipantsControllerProvider
    extends
        $AsyncNotifierProvider<
          EventChatParticipantsController,
          EventChatParticipantsState
        > {
  /// No offline roster: refresh every loaded page, discard on authority failure,
  /// and hide names on backgrounding or account changes. The roster reads
  /// again when the chat's change signal says the room or a membership moved;
  /// nothing polls.
  EventChatParticipantsControllerProvider._({
    required EventChatParticipantsControllerFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'eventChatParticipantsControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$eventChatParticipantsControllerHash();

  @override
  String toString() {
    return r'eventChatParticipantsControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  EventChatParticipantsController create() => EventChatParticipantsController();

  @override
  bool operator ==(Object other) {
    return other is EventChatParticipantsControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventChatParticipantsControllerHash() =>
    r'9df2b7b6e5f7a902807d16fc991b041bbac75a7a';

/// No offline roster: refresh every loaded page, discard on authority failure,
/// and hide names on backgrounding or account changes. The roster reads
/// again when the chat's change signal says the room or a membership moved;
/// nothing polls.

final class EventChatParticipantsControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          EventChatParticipantsController,
          AsyncValue<EventChatParticipantsState>,
          EventChatParticipantsState,
          FutureOr<EventChatParticipantsState>,
          String
        > {
  EventChatParticipantsControllerFamily._()
    : super(
        retry: null,
        name: r'eventChatParticipantsControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// No offline roster: refresh every loaded page, discard on authority failure,
  /// and hide names on backgrounding or account changes. The roster reads
  /// again when the chat's change signal says the room or a membership moved;
  /// nothing polls.

  EventChatParticipantsControllerProvider call(String eventId) =>
      EventChatParticipantsControllerProvider._(argument: eventId, from: this);

  @override
  String toString() => r'eventChatParticipantsControllerProvider';
}

/// No offline roster: refresh every loaded page, discard on authority failure,
/// and hide names on backgrounding or account changes. The roster reads
/// again when the chat's change signal says the room or a membership moved;
/// nothing polls.

abstract class _$EventChatParticipantsController
    extends $AsyncNotifier<EventChatParticipantsState> {
  late final _$args = ref.$arg as String;
  String get eventId => _$args;

  FutureOr<EventChatParticipantsState> build(String eventId);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<
              AsyncValue<EventChatParticipantsState>,
              EventChatParticipantsState
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<EventChatParticipantsState>,
                EventChatParticipantsState
              >,
              AsyncValue<EventChatParticipantsState>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}
