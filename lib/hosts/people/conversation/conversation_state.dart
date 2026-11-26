import 'package:catch_dating_app/contexts/audience/domain/crm/host_whatsapp_thread.dart';
import 'package:catch_dating_app/contexts/messaging/domain/chat_message.dart';
import 'package:catch_dating_app/hosts/people/conversation/conversation_people.dart';
import 'package:flutter/foundation.dart';

/// Where a conversation is: still reading, showing the person, the person
/// is not in this organizer's conversations, a programme conversation whose
/// purpose no source can prove, or the read failed.
enum HostConversationStatus { loading, ready, unavailable, programme, error }

/// The two places a host and a guest talk: a Catch conversation or a
/// WhatsApp thread.
enum HostConversationChannel { catchApp, whatsapp }

/// One message in the person's transcript, from either channel.
@immutable
class HostConversationMessage {
  const HostConversationMessage({
    required this.id,
    required this.text,
    required this.mine,
    required this.channel,
    this.sentAt,
    this.imageUrl,
  });

  /// The route and the source message id, so two sources never collide.
  final String id;
  final String text;
  final String? imageUrl;

  /// Null while a sent message waits for the server time.
  final DateTime? sentAt;

  /// The host sent it.
  final bool mine;
  final HostConversationChannel channel;
}

/// One way to reply: a Catch conversation or a WhatsApp thread.
@immutable
class HostConversationRoute {
  const HostConversationRoute({
    required this.key,
    required this.channel,
    required this.sourceId,
    required this.available,
    this.date,
  });

  /// `catch:<conversationId>` or `whatsapp:<threadId>`; drafts are kept by it.
  final String key;
  final HostConversationChannel channel;

  /// The Catch conversation id or the WhatsApp thread id.
  final String sourceId;

  /// The source can take a reply now: the Catch conversation is open, or
  /// the WhatsApp 24-hour window is.
  final bool available;

  /// When the person has more than one source on this channel, the date
  /// that tells them apart.
  final DateTime? date;
}

/// A Catch conversation with older messages to read before its live window.
@immutable
class HostConversationOlder {
  const HostConversationOlder({
    required this.conversationId,
    this.loading = false,
    this.failed = false,
  });

  final String conversationId;
  final bool loading;
  final bool failed;
}

/// Everything a conversation shows, as plain values.
@immutable
class HostConversationState {
  const HostConversationState({
    required this.status,
    this.person,
    this.scope,
    this.eventTitle,
    this.programmeTitle,
    this.messages = const <HostConversationMessage>[],
    this.routes = const <HostConversationRoute>[],
    this.older = const <HostConversationOlder>[],
    this.partial = false,
    this.sharedScope = false,
    this.actionConversationId,
    this.actionMessages = const <ChatMessage>[],
    this.latestByConversation = const <String, String>{},
    this.whatsappThreads = const <String, HostWhatsappThreadDetail>{},
    this.nextWindowClose,
    this.error,
  });

  const HostConversationState.loading()
    : this(status: HostConversationStatus.loading);

  final HostConversationStatus status;

  /// The person, once resolved; their sources stay separate.
  final HostInboxPerson? person;

  /// The scope the conversation is read in.
  final HostInboxScope? scope;

  /// The event the conversation is about; null for a general inquiry.
  final String? eventTitle;

  /// A programme scope's verified title.
  final String? programmeTitle;

  /// The transcript, oldest first.
  final List<HostConversationMessage> messages;
  final List<HostConversationRoute> routes;
  final List<HostConversationOlder> older;

  /// A source could not be read or verified, so the transcript may be
  /// missing messages.
  final bool partial;

  /// A source is shared by more than one event, so its history covers them.
  final bool sharedScope;

  /// The Catch conversation the Share, Report and Block actions act on.
  final String? actionConversationId;
  final List<ChatMessage> actionMessages;

  /// The newest message id of each Catch conversation, for read markers.
  final Map<String, String> latestByConversation;

  /// The verified WhatsApp thread behind each `whatsapp:` route key.
  final Map<String, HostWhatsappThreadDetail> whatsappThreads;

  /// When the soonest open WhatsApp window closes.
  final DateTime? nextWindowClose;
  final Object? error;

  HostConversationRoute? route(String? key) {
    for (final route in routes) {
      if (route.key == key) return route;
    }
    return null;
  }
}
