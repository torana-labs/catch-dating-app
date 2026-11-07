import 'package:flutter/foundation.dart';

/// The Messages chips that a read can answer: every conversation, the ones
/// waiting on the host, and the ones about tonight.
enum HostMessagesFilter { all, unread, tonight }

/// Where Messages is: still reading, showing conversations, or unable to
/// read them.
enum HostMessagesStatus { loading, ready, error }

/// One person's conversations with the organizer, Catch and WhatsApp
/// together, as Messages lists them.
@immutable
class HostMessageThread {
  const HostMessageThread({
    required this.personId,
    required this.name,
    required this.preview,
    required this.at,
    this.photoUrl,
    this.unread = false,
    this.tonight = false,
    this.eventId,
  });

  /// `uid:` for a Catch account, `contact:` for a WhatsApp-only contact;
  /// the inbox opens the conversation by it.
  final String personId;
  final String name;
  final String preview;
  final DateTime at;
  final String? photoUrl;

  /// The last message is theirs and waits on the host.
  final bool unread;

  /// The conversation is about an event happening today.
  final bool tonight;

  /// The latest event the conversation is about; null for a general one.
  final String? eventId;
}

/// Everything Messages shows, as plain values.
@immutable
class HostMessagesState {
  const HostMessagesState({
    required this.status,
    this.filter = HostMessagesFilter.all,
    this.threads = const <HostMessageThread>[],
    this.unreadCount = 0,
    this.automationsOn,
    this.automationsSent,
    this.error,
  });

  const HostMessagesState.loading({
    HostMessagesFilter filter = HostMessagesFilter.all,
  }) : this(status: HostMessagesStatus.loading, filter: filter);

  final HostMessagesStatus status;
  final HostMessagesFilter filter;

  /// The conversations the chip holds, newest first.
  final List<HostMessageThread> threads;

  /// Conversations waiting on the host, whatever the chip.
  final int unreadCount;

  /// Automatic messages turned on; null until the rules are read.
  final int? automationsOn;

  /// Automatic messages that ran this month; null until read.
  final int? automationsSent;
  final Object? error;
}
