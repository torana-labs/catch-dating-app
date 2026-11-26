import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_whatsapp_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_whatsapp_thread.dart';
import 'package:catch_dating_app/contexts/connections/data/match_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/messaging/data/conversation_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/chat_message.dart';
import 'package:catch_dating_app/hosts/people/conversation/conversation_drafts.dart';
import 'package:catch_dating_app/hosts/people/conversation/conversation_history_controller.dart';
import 'package:catch_dating_app/hosts/people/conversation/conversation_pages_controller.dart';
import 'package:catch_dating_app/hosts/people/conversation/conversation_people.dart';
import 'package:catch_dating_app/hosts/people/conversation/conversation_programme_controller.dart';
import 'package:catch_dating_app/hosts/people/conversation/conversation_state.dart';
import 'package:catch_dating_app/pages/inbox/chats_list_view_model.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'conversation_controller.g.dart';

/// Which conversation to open: the organizer, the person or one of their
/// sources (`uid:`, `contact:`, a Catch conversation id or a WhatsApp
/// thread id), and the scope the link named, if any.
@immutable
class HostConversationRequest {
  const HostConversationRequest({
    required this.organizerId,
    required this.selection,
    this.scope,
  });

  final String organizerId;
  final String selection;

  /// Null reads the scope from the selected source itself.
  final HostInboxScope? scope;

  @override
  bool operator ==(Object other) =>
      other is HostConversationRequest &&
      other.organizerId == organizerId &&
      other.selection == selection &&
      other.scope == scope;

  @override
  int get hashCode => Object.hash(organizerId, selection, scope);
}

/// The reply drafts for the signed-in account: kept while the Host app
/// runs so a draft survives moving between conversations, and dropped with
/// the account.
// keepalive: account-scoped: rebuilt (and the old drafts disposed) whenever
// the signed-in uid changes, so no draft outlives its account.
@Riverpod(keepAlive: true)
HostReplyDrafts hostConversationDrafts(Ref ref) {
  ref.watch(uidProvider.select((uid) => uid.value));
  final drafts = HostReplyDrafts();
  ref.onDispose(drafts.dispose);
  return drafts;
}

/// One WhatsApp conversation while it is open, live: a new customer message
/// or a reply shows without a reload. Null until the thread has a view.
@riverpod
Stream<HostWhatsappThreadDetail?> hostPersonWhatsappDetail(
  Ref ref,
  String organizerId,
  String threadId,
) => ref
    .watch(hostWhatsappRepositoryProvider)
    .watchWhatsappThread(organizerId: organizerId, threadId: threadId);

/// One person's conversation with the organizer, composed from the
/// account, the organizer's events, the Catch conversations listener and
/// its older pages, the WhatsApp threads listener and, per source, the
/// conversation document, its messages and older history, or the live
/// WhatsApp thread. A programme scope reads only that programme's verified
/// identity: no source carries per-message programme provenance, so no
/// person is resolved there.
@riverpod
HostConversationState hostConversationController(
  Ref ref,
  HostConversationRequest request,
) {
  final organizerId = request.organizerId;
  final requestedProgramId = request.scope?.programId;
  if (requestedProgramId != null) {
    final programme = catchAsyncStateFromAsyncValue(
      ref.watch(
        hostInboxProgramAudiencePagesProvider(organizerId, requestedProgramId),
      ),
    );
    if (programme.hasError || programme.hasStaleError) {
      return HostConversationState(
        status: HostConversationStatus.error,
        scope: request.scope,
        error: programme.error,
      );
    }
    final page = programme.value;
    return page == null
        ? HostConversationState(
            status: HostConversationStatus.loading,
            scope: request.scope,
          )
        : HostConversationState(
            status: HostConversationStatus.programme,
            scope: request.scope,
            programmeTitle: page.program.title,
          );
  }
  final now = ref.watch(appClockProvider).now();
  final uid = catchAsyncStateFromAsyncValue(ref.watch(uidProvider)).value;
  final events = catchAsyncStateFromAsyncValue(
    ref.watch(watchEventsForOrganizerProvider(organizerId)),
  );
  final inbox = catchAsyncStateFromAsyncValue(
    ref.watch(hostInboxCatchViewModelProvider),
  );
  final whatsapp = catchAsyncStateFromAsyncValue(
    ref.watch(hostWhatsappThreadPagesProvider(organizerId)),
  );
  final catchThreads = [
    ...?inbox.value?.newMatches,
    ...?inbox.value?.conversations,
  ];
  final whatsappThreads = whatsapp.value?.items ?? const [];
  final scope = hostConversationScopeFor(
    request: request,
    events: events.value,
    catchThreads: catchThreads,
    whatsappThreads: whatsappThreads,
    now: now,
  );
  final person = scope == null
      ? null
      : composeHostInboxPeople(
              organizerId: organizerId,
              scope: scope,
              // A conversation opens whichever segment the person is in.
              segment: HostInboxAudienceSegment.booked,
              catchThreads: catchThreads,
              whatsappThreads: whatsappThreads,
              participations: null,
            ).people
            .where((person) => person.containsEndpoint(request.selection))
            .firstOrNull;
  if (person == null || scope == null) {
    if (scope == null && events.hasError) {
      return HostConversationState(
        status: HostConversationStatus.error,
        error: events.error,
      );
    }
    final waiting =
        scope == null || inbox.isLoading || whatsapp.isLoading || uid == null;
    return HostConversationState(
      status: waiting
          ? HostConversationStatus.loading
          : HostConversationStatus.unavailable,
      scope: scope,
    );
  }
  return _composeConversation(
    ref,
    person: person,
    scope: scope,
    uid: uid,
    events: events.value,
    now: now,
  );
}

/// The scope a conversation opens in: the one the link named, else the
/// selected source's own latest event, else General. Null while the
/// sources that answer it are still loading.
HostInboxScope? hostConversationScopeFor({
  required HostConversationRequest request,
  required List<Event>? events,
  required List<ChatThreadPreview> catchThreads,
  required List<HostWhatsappThreadSummary> whatsappThreads,
  required DateTime now,
}) {
  final requested = request.scope;
  if (requested != null) {
    if (requested.eventId == null || events == null) return requested;
    return resolveHostInboxScope(
      events: events,
      now: now,
      requestedScope: requested,
    );
  }
  final selection = request.selection;
  final uid = selection.startsWith('uid:') ? selection.substring(4) : null;
  final contactId = selection.startsWith('contact:')
      ? selection.substring(8)
      : null;
  List<String>? eventIds;
  for (final thread in catchThreads) {
    if (thread.matchId == selection || thread.otherUid == uid) {
      eventIds = thread.eventIds;
      break;
    }
  }
  for (final thread in whatsappThreads) {
    if (eventIds != null) break;
    if (thread.threadId == selection ||
        thread.contactId == contactId ||
        (uid != null && thread.linkedUid == uid)) {
      eventIds = thread.eventIds;
    }
  }
  if (eventIds == null) return null;
  return eventIds.isEmpty
      ? const HostInboxScope.general()
      : HostInboxScope.event(eventIds.last);
}

HostConversationState _composeConversation(
  Ref ref, {
  required HostInboxPerson person,
  required HostInboxScope scope,
  required String? uid,
  required List<Event>? events,
  required DateTime now,
}) {
  final messages = <HostConversationMessage>[];
  final routes = <HostConversationRoute>[];
  final older = <HostConversationOlder>[];
  final catchMessages = <String, List<ChatMessage>>{};
  final latest = <String, String>{};
  final whatsappDetails = <String, HostWhatsappThreadDetail>{};
  var partial = false;
  var sharedScope = false;
  DateTime? nextWindowClose;
  for (final source in person.catchThreads) {
    final match = catchAsyncStateFromAsyncValue(
      ref.watch(matchStreamProvider(source.matchId)),
    ).value;
    final valid =
        uid != null &&
        match != null &&
        match.organizerId == person.organizerId &&
        (match.user1Id == uid || match.user2Id == uid) &&
        match.isOrganizerHostInquiry &&
        match.otherId(uid) == person.linkedUid;
    if (!valid) {
      partial = true;
      continue;
    }
    routes.add(
      HostConversationRoute(
        key: 'catch:${source.matchId}',
        channel: HostConversationChannel.catchApp,
        sourceId: source.matchId,
        available: !match.isBlocked && !match.isClosed,
        date: person.catchThreads.length == 1 ? null : source.timestamp,
      ),
    );
    sharedScope |= source.eventIds.length > 1;
    final live = catchAsyncStateFromAsyncValue(
      ref.watch(watchConversationMessagesProvider(source.matchId)),
    );
    if (live.isLoading || live.hasError || live.hasStaleError) partial = true;
    final history = ref.watch(hostConversationHistoryProvider(source.matchId));
    if (history.canLoadMore(live.value?.length ?? 0)) {
      older.add(
        HostConversationOlder(
          conversationId: source.matchId,
          loading: history.loading,
          failed: history.error != null,
        ),
      );
    }
    final values =
        {
          for (final message in history.messages) message.id: message,
          for (final message in live.value ?? const <ChatMessage>[])
            message.id: message,
        }.values.toList()..sort(
          (a, b) => (a.sentAt ?? _unsent).compareTo(b.sentAt ?? _unsent),
        );
    catchMessages[source.matchId] = values;
    if (values.lastOrNull?.id case final id?) latest[source.matchId] = id;
    for (final message in values) {
      messages.add(
        HostConversationMessage(
          id: 'catch:${source.matchId}/${message.id}',
          text: message.text,
          imageUrl: message.imageUrl,
          sentAt: message.sentAt,
          mine: message.senderId == uid,
          channel: HostConversationChannel.catchApp,
        ),
      );
    }
  }
  for (final source in person.whatsappThreads) {
    final detail = catchAsyncStateFromAsyncValue(
      ref.watch(
        hostPersonWhatsappDetailProvider(person.organizerId, source.threadId),
      ),
    ).value;
    if (detail == null ||
        detail.organizerId != person.organizerId ||
        detail.contactId != source.contactId ||
        detail.linkedUid != person.linkedUid) {
      partial = true;
      continue;
    }
    final key = 'whatsapp:${source.threadId}';
    whatsappDetails[key] = detail;
    final open =
        detail.serviceWindowOpen && detail.serviceWindowExpiresAt.isAfter(now);
    routes.add(
      HostConversationRoute(
        key: key,
        channel: HostConversationChannel.whatsapp,
        sourceId: source.threadId,
        available: open,
        date: person.whatsappThreads.length == 1 ? null : source.lastMessageAt,
      ),
    );
    if (open &&
        (nextWindowClose == null ||
            detail.serviceWindowExpiresAt.isBefore(nextWindowClose))) {
      nextWindowClose = detail.serviceWindowExpiresAt;
    }
    sharedScope |= source.eventIds.length > 1;
    for (final message in detail.messages) {
      messages.add(
        HostConversationMessage(
          id: '$key/${message.messageId}',
          text: message.body,
          sentAt: message.occurredAt,
          mine: message.direction == HostWhatsappMessageDirection.outbound,
          channel: HostConversationChannel.whatsapp,
        ),
      );
    }
  }
  messages.sort((a, b) {
    final byTime = (a.sentAt ?? _unsent).compareTo(b.sentAt ?? _unsent);
    return byTime == 0 ? a.id.compareTo(b.id) : byTime;
  });
  final actionConversationId = catchMessages.keys.firstOrNull;
  return HostConversationState(
    status: HostConversationStatus.ready,
    person: person,
    scope: scope,
    eventTitle: events
        ?.where((event) => event.id == scope.eventId)
        .firstOrNull
        ?.title,
    messages: List.unmodifiable(messages),
    routes: List.unmodifiable(routes),
    older: List.unmodifiable(older),
    partial: partial,
    sharedScope: sharedScope,
    actionConversationId: person.linkedUid == null
        ? null
        : actionConversationId,
    actionMessages: actionConversationId == null
        ? const <ChatMessage>[]
        : catchMessages[actionConversationId]!,
    latestByConversation: Map.unmodifiable(latest),
    whatsappThreads: Map.unmodifiable(whatsappDetails),
    nextWindowClose: nextWindowClose,
  );
}

/// A message still waiting for its server time sorts last.
final _unsent = DateTime(9999);

/// Reads a conversation again after a failure: the programme, or the
/// conversation lists, or each source document, its messages and each
/// WhatsApp thread.
void retryHostConversationReads(
  WidgetRef ref,
  HostConversationRequest request,
  HostConversationState state,
) {
  final organizerId = request.organizerId;
  if (request.scope?.programId case final programId?) {
    ref.invalidate(
      hostInboxProgramAudiencePagesProvider(organizerId, programId),
    );
    return;
  }
  final person = state.person;
  if (person == null) {
    ref
      ..invalidate(watchEventsForOrganizerProvider(organizerId))
      ..invalidate(chatsListViewModelProvider)
      ..invalidate(hostWhatsappThreadPagesProvider(organizerId));
    return;
  }
  for (final source in person.catchThreads) {
    ref
      ..invalidate(matchStreamProvider(source.matchId))
      ..invalidate(watchConversationMessagesProvider(source.matchId));
  }
  for (final source in person.whatsappThreads) {
    ref.invalidate(
      hostPersonWhatsappDetailProvider(organizerId, source.threadId),
    );
  }
}

/// The conversation commands: mark a Catch conversation read and reply on
/// a WhatsApp thread. Catch replies and photos go through the shared chat
/// controller.
@riverpod
HostConversationCommands hostConversationCommands(Ref ref) =>
    HostConversationCommands(ref);

class HostConversationCommands {
  const HostConversationCommands(this._ref);

  final Ref _ref;

  Future<void> markRead(String conversationId, String uid) => _ref
      .read(conversationRepositoryProvider)
      .markRead(conversationId: conversationId, uid: uid);

  /// The conversation and inbox listeners deliver the saved reply.
  Future<void> reply({
    required String organizerId,
    required HostWhatsappThreadDetail thread,
    required String body,
    required String idempotencyKey,
  }) => _ref
      .read(hostWhatsappRepositoryProvider)
      .sendWhatsappReply(
        organizerId: organizerId,
        thread: thread,
        body: body,
        idempotencyKey: idempotencyKey,
      );
}
