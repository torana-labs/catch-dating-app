// architecture: provider-free
import 'package:catch_dating_app/contexts/audience/domain/crm/host_whatsapp_thread.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation_roster.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/pages/inbox/chats_list_view_model.dart';
import 'package:flutter/foundation.dart';

enum HostInboxAudienceSegment { booked, prospective }

enum HostInboxScopeKind { event, general, program }

@immutable
class HostInboxScope {
  const HostInboxScope.general()
    : kind = HostInboxScopeKind.general,
      eventId = null,
      programId = null;

  const HostInboxScope.event(String this.eventId)
    : kind = HostInboxScopeKind.event,
      programId = null;

  const HostInboxScope.program(String this.programId)
    : kind = HostInboxScopeKind.program,
      eventId = null;

  final HostInboxScopeKind kind;
  final String? eventId;
  final String? programId;

  bool get isGeneral => kind == HostInboxScopeKind.general;
  bool get isProgram => kind == HostInboxScopeKind.program;

  @override
  bool operator ==(Object other) =>
      other is HostInboxScope &&
      other.kind == kind &&
      other.eventId == eventId &&
      other.programId == programId;

  @override
  int get hashCode => Object.hash(kind, eventId, programId);
}

/// The audience a program scope can prove belongs to it: guest contactIds
/// from the programme guest directory plus the app uids those contacts are
/// linked to on WhatsApp thread summaries. Nothing is inferred from phone
/// numbers.
@immutable
class HostInboxProgramAudience {
  const HostInboxProgramAudience({
    required this.contactIds,
    required this.linkedUids,
  });

  final Set<String> contactIds;
  final Set<String> linkedUids;
}

HostInboxProgramAudience hostInboxProgramAudience({
  required Iterable<String?> guestContactIds,
  required List<HostWhatsappThreadSummary> whatsappThreads,
}) {
  final contactIds = guestContactIds.nonNulls.toSet();
  return HostInboxProgramAudience(
    contactIds: contactIds,
    linkedUids: {
      for (final thread in whatsappThreads)
        if (thread.linkedUid != null && contactIds.contains(thread.contactId))
          thread.linkedUid!,
    },
  );
}

HostInboxScope resolveHostInboxScope({
  required List<Event> events,
  required DateTime now,
  HostInboxScope? requestedScope,
  String? initialEventId,
  bool preferGeneral = false,
  List<OrganizerProgramSummary> programs = const [],
}) {
  final requestedProgramId = requestedScope?.programId;
  if (requestedProgramId != null) {
    return HostInboxScope.program(requestedProgramId);
  }
  final byId = {for (final event in events) event.id: event};
  final requestedEventId = requestedScope?.eventId ?? initialEventId;
  if (requestedEventId != null && byId.containsKey(requestedEventId)) {
    return HostInboxScope.event(requestedEventId);
  }
  if (requestedScope?.isGeneral == true || preferGeneral) {
    return const HostInboxScope.general();
  }
  final defaultEvent = orderHostInboxEvents(events, now: now)
      .where((event) => !event.isCancelled && event.endTime.isAfter(now))
      .firstOrNull;
  return defaultEvent == null
      ? const HostInboxScope.general()
      : HostInboxScope.event(defaultEvent.id);
}

List<Event> orderHostInboxEvents(List<Event> events, {required DateTime now}) {
  final ordered = events.where((event) => !event.isCancelled).toList();
  ordered.sort((a, b) {
    final aRank = _eventRank(a, now);
    final bRank = _eventRank(b, now);
    if (aRank != bRank) return aRank.compareTo(bRank);
    if (aRank == 2) return b.startTime.compareTo(a.startTime);
    return a.startTime.compareTo(b.startTime);
  });
  return List.unmodifiable(ordered);
}

int _eventRank(Event event, DateTime now) {
  if (!event.startTime.isAfter(now) && event.endTime.isAfter(now)) return 0;
  if (event.startTime.isAfter(now)) return 1;
  return 2;
}

/// Source endpoints remain separate even when CRM proves that they are one person.
@immutable
class HostInboxPerson {
  const HostInboxPerson({
    required this.organizerId,
    required this.personId,
    required this.catchThreads,
    required this.whatsappThreads,
    required this.booked,
    required this.scope,
  });
  final String organizerId;
  final HostInboxScope scope;
  final String personId;
  final List<ChatThreadPreview> catchThreads;
  final List<HostWhatsappThreadSummary> whatsappThreads;

  /// Null means classification is unknown, rather than prospective.
  final bool? booked;
  String get key => '$organizerId/$personId';
  String? get linkedUid =>
      personId.startsWith('uid:') ? personId.substring(4) : null;
  String? get contactId => whatsappThreads.firstOrNull?.contactId;
  String get displayName =>
      whatsappThreads.firstOrNull?.displayName ??
      catchThreads.first.displayName;
  String? get photoUrl => catchThreads.firstOrNull?.photoUrl;
  DateTime get timestamp {
    final catchTime = catchThreads.firstOrNull?.timestamp;
    final whatsappTime = whatsappThreads.firstOrNull?.lastMessageAt;
    return catchTime == null
        ? whatsappTime!
        : whatsappTime == null || catchTime.isAfter(whatsappTime)
        ? catchTime
        : whatsappTime;
  }

  String get previewText {
    final whatsapp = whatsappThreads.firstOrNull;
    return whatsapp != null && whatsapp.lastMessageAt == timestamp
        ? whatsapp.lastMessageBody
        : catchThreads.first.previewText;
  }

  int get knownUnreadCount =>
      catchThreads.fold(0, (sum, thread) => sum + thread.unreadCount);
  bool get unreadCountIsComplete => whatsappThreads.isEmpty;
  bool containsEndpoint(String id) =>
      personId == id ||
      catchThreads.any((t) => t.matchId == id) ||
      whatsappThreads.any((t) => t.threadId == id);
}

@immutable
class HostInboxPeople {
  const HostInboxPeople({
    required this.people,
    required this.bookedCount,
    required this.prospectiveCount,
    required this.unclassifiedCount,
  });
  final List<HostInboxPerson> people;
  final int bookedCount;
  final int prospectiveCount;
  final int unclassifiedCount;
}

HostInboxPeople composeHostInboxPeople({
  required String organizerId,
  required HostInboxScope scope,
  required HostInboxAudienceSegment segment,
  required List<ChatThreadPreview> catchThreads,
  required List<HostWhatsappThreadSummary> whatsappThreads,
  required List<EventParticipation>? participations,
  String query = '',
  HostInboxProgramAudience? programAudience,
}) {
  // Identity links prove who a guest is, not which program a message belongs to.
  // No current source carries per-message program provenance.
  if (scope.isProgram) {
    return const HostInboxPeople(
      people: [],
      bookedCount: 0,
      prospectiveCount: 0,
      unclassifiedCount: 0,
    );
  }

  bool catchEligible(ChatThreadPreview thread) {
    return scope.isGeneral
        ? thread.eventIds.isEmpty
        : thread.eventIds.contains(scope.eventId);
  }

  bool whatsappEligible(HostWhatsappThreadSummary thread) {
    return scope.isGeneral
        ? thread.eventIds.isEmpty
        : thread.eventIds.contains(scope.eventId);
  }

  final catches = <String, Map<String, ChatThreadPreview>>{};
  final whatsapp = <String, Map<String, HostWhatsappThreadSummary>>{};
  for (final thread in catchThreads) {
    if (thread.match.organizerId != organizerId ||
        !thread.match.isOrganizerHostInquiry ||
        thread.match.isBlocked ||
        thread.match.isClosed ||
        !catchEligible(thread)) {
      continue;
    }
    (catches['uid:${thread.otherUid}'] ??= {})[thread.matchId] = thread;
  }
  for (final thread in whatsappThreads) {
    if (!whatsappEligible(thread)) continue;
    // An absent link from an older server is deliberately not inferred.
    final personId = thread.linkedUid == null
        ? 'contact:${thread.contactId}'
        : 'uid:${thread.linkedUid}';
    (whatsapp[personId] ??= {})[thread.threadId] = thread;
  }
  final booked = participations == null
      ? null
      : EventParticipationRoster.fromParticipations(
          participations.where((p) => p.eventId == scope.eventId).toList(),
        ).bookedIds.toSet();
  final people = <HostInboxPerson>[];
  for (final id in {...catches.keys, ...whatsapp.keys}) {
    final catchSources = (catches[id]?.values.toList() ?? <ChatThreadPreview>[])
      ..sort((a, b) => b.timestamp.compareTo(a.timestamp));
    final whatsappSources =
        (whatsapp[id]?.values.toList() ?? <HostWhatsappThreadSummary>[])
          ..sort((a, b) => b.lastMessageAt.compareTo(a.lastMessageAt));
    people.add(
      HostInboxPerson(
        organizerId: organizerId,
        personId: id,
        scope: scope,
        catchThreads: List.unmodifiable(catchSources),
        whatsappThreads: List.unmodifiable(whatsappSources),
        booked:
            scope.isGeneral ||
                scope.isProgram ||
                booked == null ||
                !id.startsWith('uid:')
            ? null
            : booked.contains(id.substring(4)),
      ),
    );
  }
  final normalized = query.trim().toLowerCase();
  final visible =
      people
          .where(
            (person) =>
                (scope.isGeneral ||
                    scope.isProgram ||
                    person.booked == null ||
                    person.booked ==
                        (segment == HostInboxAudienceSegment.booked)) &&
                (normalized.isEmpty ||
                    person.displayName.toLowerCase().contains(normalized)),
          )
          .toList()
        ..sort((a, b) {
          final byTime = b.timestamp.compareTo(a.timestamp);
          return byTime == 0 ? a.key.compareTo(b.key) : byTime;
        });
  return HostInboxPeople(
    people: List.unmodifiable(visible),
    bookedCount: people.where((p) => p.booked == true).length,
    prospectiveCount: people.where((p) => p.booked == false).length,
    unclassifiedCount: scope.isGeneral || scope.isProgram
        ? 0
        : people.where((p) => p.booked == null).length,
  );
}
