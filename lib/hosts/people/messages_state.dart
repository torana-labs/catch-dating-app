import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/people/conversation/conversation_people.dart';
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
    this.eventIds = const <String>[],
    this.booked,
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

  /// Every event the conversation is about.
  final List<String> eventIds;

  /// In an event scope, whether the person is booked for it; null when
  /// that is unknown (a WhatsApp-only contact, or the bookings are still
  /// reading) or outside an event scope.
  final bool? booked;
}

/// What the scope menu offers: the organizer's events (live, then
/// upcoming, then past), their programmes and General inquiries.
@immutable
class HostMessagesScopes {
  const HostMessagesScopes({
    this.events = const <Event>[],
    this.programmes = const <OrganizerProgramSummary>[],
  });

  final List<Event> events;
  final List<OrganizerProgramSummary> programmes;
}

/// A programme scope: its verified title, or why it cannot be shown.
@immutable
class HostMessagesProgramme {
  const HostMessagesProgramme({this.title, this.loading = false, this.error});

  final String? title;
  final bool loading;
  final Object? error;
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
    this.scope,
    this.segment = HostInboxAudienceSegment.booked,
    this.query = '',
    this.scopes = const HostMessagesScopes(),
    this.bookedCount,
    this.prospectiveCount,
    this.unclassifiedCount = 0,
    this.partial = false,
    this.partialFailed = false,
    this.moreCatch = HostMessagesMore.none,
    this.moreWhatsapp = HostMessagesMore.none,
    this.programme,
  });

  const HostMessagesState.loading({
    HostMessagesFilter filter = HostMessagesFilter.all,
    HostInboxScope? scope,
  }) : this(status: HostMessagesStatus.loading, filter: filter, scope: scope);

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

  /// The event, programme or General inquiries the list is narrowed to;
  /// null lists every conversation.
  final HostInboxScope? scope;

  /// In an event scope: booked people or prospective ones.
  final HostInboxAudienceSegment segment;

  /// The name search.
  final String query;
  final HostMessagesScopes scopes;

  /// In an event scope, people known booked and known not booked; null
  /// until every source has loaded.
  final int? bookedCount;
  final int? prospectiveCount;

  /// In an event scope, people whose booking cannot be told.
  final int unclassifiedCount;

  /// A source is still loading, failed or has more pages, so the list may
  /// be missing conversations.
  final bool partial;

  /// A source failed, so Try again is offered.
  final bool partialFailed;
  final HostMessagesMore moreCatch;
  final HostMessagesMore moreWhatsapp;

  /// Set in a programme scope.
  final HostMessagesProgramme? programme;
}

/// Whether a source has older conversations to load: none, more, loading
/// them, or the last page failed.
enum HostMessagesMore { none, more, loading, failed }
