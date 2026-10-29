import 'package:catch_dating_app/contexts/account/account.dart';
import 'package:catch_dating_app/contexts/messaging/domain/event_chat.dart';
import 'package:catch_dating_app/contexts/messaging/domain/event_chat_directory.dart';
import 'package:catch_dating_app/contexts/messaging/domain/event_chat_participant.dart';
import 'package:catch_dating_app/contexts/messaging/domain/event_chat_profile.dart';
import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/core/data/read_limit_policy.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callable_request_dtos.g.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_chat_repository.g.dart';

class EventChatRepository {
  const EventChatRepository(this._functions);
  final FirebaseFunctions _functions;

  Future<EventChatParticipantPage> participants(
    String uid,
    String eventId, {
    Map<String, Object?>? cursor,
  }) async => EventChatParticipantPage.fromMap(
    await _call(
      'listEventChatParticipants',
      ListEventChatParticipantsCallableRequest(
        expectedUid: uid,
        eventId: eventId,
        cursor: cursor,
        limit: ReadLimitPolicy.eventChatDirectoryPage,
      ).toJson(),
    ),
  );

  Future<EventProfileSettings> profileSettings(
    String uid,
    String eventId,
  ) async => EventProfileSettings.fromMap(
    await _call(
      'getEventChatProfileSharing',
      GetEventChatProfileSharingCallableRequest(
        eventId: eventId,
        expectedUid: uid,
      ).toJson(),
    ),
  );

  /// Read-only owner preview from the same projection served to room members.
  Future<EventProfileSettings> previewProfile(
    String uid,
    EventProfileSettings reviewed,
    EventProfileSelection selection,
  ) async => EventProfileSettings.fromMap(
    await _call(
      'getEventChatProfileSharing',
      GetEventChatProfileSharingCallableRequest(
        eventId: reviewed.eventId,
        expectedUid: uid,
      ).toJson()..['previewSelection'] = selection.toJson(),
    ),
  );

  Future<EventParticipantProfile> participantProfile(
    String uid,
    String eventId,
    String participantUid,
  ) async => EventParticipantProfile.fromMap(
    await _call(
      'getEventChatProfile',
      GetEventChatProfileCallableRequest(
        eventId: eventId,
        expectedUid: uid,
        participantUid: participantUid,
      ).toJson(),
    ),
  );

  Future<void> shareProfile(
    String uid,
    EventProfileSettings reviewed,
    EventProfileSelection? selection,
    String requestId,
  ) async {
    await _call(
      'updateEventChatProfileSharing',
      UpdateEventChatProfileSharingCallableRequest(
        eventId: reviewed.eventId,
        expectedUid: uid,
        expectedRevision: reviewed.revision,
        requestId: requestId,
        selection: selection?.toJson(),
      ).toJson(),
    );
  }

  Future<EventChatDirectoryPage> directory({
    Map<String, Object?>? cursor,
  }) async => EventChatDirectoryPage.fromMap(
    await _call(
      'listEventChats',
      ListEventChatsCallableRequest(
        cursor: cursor,
        limit: ReadLimitPolicy.eventChatDirectoryPage,
      ).toJson(),
    ),
  );

  Future<EventChatAccess> access(String eventId) async =>
      EventChatAccess.fromMap(
        await _call(
          'getEventChatAccess',
          GetEventChatAccessCallableRequest(eventId: eventId).toJson(),
        ),
      );

  Future<EventChatPage> messages(String eventId, {int? beforeSequence}) async =>
      EventChatPage.fromMap(
        await _call(
          'listEventChatMessages',
          ListEventChatMessagesCallableRequest(
            eventId: eventId,
            beforeSequence: beforeSequence,
            limit: ReadLimitPolicy.eventChatPage,
          ).toJson(),
        ),
      );

  Future<void> updateAccess(
    String uid,
    EventChatAccess reviewed,
    EventChatAction action,
    String requestId, {
    DateTime? opensAt,
    DateTime? closesAt,
  }) async {
    await _call(
      'updateEventChatAccess',
      UpdateEventChatAccessCallableRequest(
        expectedUid: uid,
        eventId: reviewed.eventId,
        action: action.name,
        expectedRevision: reviewed.revisionFor(action),
        requestId: requestId,
        termsVersion: action == EventChatAction.join
            ? reviewed.termsVersion
            : null,
        opensAtMillis: opensAt?.millisecondsSinceEpoch,
        closesAtMillis: closesAt?.millisecondsSinceEpoch,
      ).toJson(),
    );
  }

  Future<void> send(
    String uid,
    String eventId,
    String text,
    String? replyToMessageId,
    String requestId,
  ) async {
    await _call(
      'sendEventChatMessage',
      SendEventChatMessageCallableRequest(
        expectedUid: uid,
        eventId: eventId,
        text: text,
        replyToMessageId: replyToMessageId,
        requestId: requestId,
      ).toJson(),
    );
  }

  Future<void> sendAnnouncement(
    String uid,
    String eventId,
    String text,
    String? replyToMessageId,
    String requestId,
  ) async {
    await _call(
      'sendEventChatMessage',
      SendEventChatMessageCallableRequest(
        expectedUid: uid,
        eventId: eventId,
        text: text,
        replyToMessageId: replyToMessageId,
        requestId: requestId,
        kind: 'announcement',
      ).toJson(),
    );
  }

  Future<void> manageMember(
    String uid,
    EventChatAccess reviewed,
    String targetUid,
    String action,
    int expectedRevision,
    String requestId,
  ) async {
    await _call('manageEventChatMember', {
      'expectedUid': uid,
      'eventId': reviewed.eventId,
      'targetUid': targetUid,
      'action': action,
      'expectedRevision': expectedRevision,
      'requestId': requestId,
    });
  }

  Future<void> react(
    String uid,
    String eventId,
    EventChatMessage message,
    EventChatReaction? reaction,
    String requestId,
  ) async {
    await _call(
      'setEventChatReaction',
      SetEventChatReactionCallableRequest(
        expectedUid: uid,
        eventId: eventId,
        messageId: message.messageId,
        reaction: reaction?.name,
        expectedRevision: message.myReactionRevision,
        requestId: requestId,
      ).toJson(),
    );
  }

  Future<void> actOnMessage(
    String uid,
    String eventId,
    String messageId,
    EventChatSafetyAction action,
    EventChatReportReason? reason,
    String requestId,
  ) async {
    await _call(
      'actOnEventChatMessage',
      ActOnEventChatMessageCallableRequest(
        expectedUid: uid,
        eventId: eventId,
        messageId: messageId,
        action: action.name,
        reasonCode: reason?.name,
        requestId: requestId,
      ).toJson(),
    );
  }

  Future<int> typing(
    String uid,
    String eventId,
    bool isTyping,
    int expectedRevision,
  ) async {
    final result = await _call(
      'setEventChatTyping',
      SetEventChatTypingCallableRequest(
        expectedUid: uid,
        eventId: eventId,
        isTyping: isTyping,
        expectedRevision: expectedRevision,
      ).toJson(),
    );
    return (result['revision']! as num).toInt();
  }

  Future<Map<Object?, Object?>> _call(
    String operation,
    Map<String, Object?> data,
  ) => withBackendErrorContext(
    () async {
      final result = await _functions
          .httpsCallable(operation)
          .call<Object?>(data);
      if (result.data case final Map value) return value;
      throw const FormatException('Invalid event conversation response');
    },
    context: BackendErrorContext(
      service: BackendService.functions,
      action: operation,
      resource: 'eventChatRooms',
    ),
  );
}

@riverpod
EventChatRepository eventChatRepository(Ref ref) =>
    EventChatRepository(ref.watch(firebaseFunctionsProvider));

@riverpod
Future<EventChatAccess> eventChatAccess(Ref ref, String eventId) async {
  final uid = await ref.watch(uidProvider.future);
  if (uid == null) throw const SignInRequiredException('open event chat');
  return ref.watch(eventChatRepositoryProvider).access(eventId);
}
