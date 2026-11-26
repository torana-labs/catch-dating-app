import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_whatsapp_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_whatsapp_thread.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation_roster.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/forms/data/read_models/host_form_automation_reads.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_setup_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/people/automations_controller.dart';
import 'package:catch_dating_app/hosts/people/automations_state.dart';
import 'package:catch_dating_app/hosts/people/conversation/conversation_pages_controller.dart';
import 'package:catch_dating_app/hosts/people/conversation/conversation_people.dart';
import 'package:catch_dating_app/hosts/people/conversation/conversation_programme_controller.dart';
import 'package:catch_dating_app/hosts/people/messages_state.dart';
import 'package:catch_dating_app/pages/inbox/chats_list_view_model.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'messages_controller.g.dart';

/// Which conversations Messages shows: the chip, the scope and segment,
/// the name search, and the day Tonight means.
@immutable
class HostMessagesRequest {
  const HostMessagesRequest({
    required this.organizerId,
    required this.day,
    this.filter = HostMessagesFilter.all,
    this.scope,
    this.segment = HostInboxAudienceSegment.booked,
    this.query = '',
  });

  final String organizerId;

  /// Today, at midnight.
  final DateTime day;
  final HostMessagesFilter filter;

  /// Null lists every conversation.
  final HostInboxScope? scope;
  final HostInboxAudienceSegment segment;
  final String query;

  @override
  bool operator ==(Object other) =>
      other is HostMessagesRequest &&
      other.organizerId == organizerId &&
      other.day == day &&
      other.filter == filter &&
      other.scope == scope &&
      other.segment == segment &&
      other.query == query;

  @override
  int get hashCode =>
      Object.hash(organizerId, day, filter, scope, segment, query);
}

/// Messages, composed from the Catch conversations listener and its older
/// pages, the WhatsApp threads listener and its pages, the organizer's
/// events (for Tonight and the scope menu), their programmes, the chosen
/// event's bookings (for Booked and Prospective) and Automatic messages
/// (for its row). A programme scope reads only that programme's verified
/// identity: no source carries per-message programme provenance.
@riverpod
HostMessagesState hostMessagesController(Ref ref, HostMessagesRequest request) {
  final organizerId = request.organizerId;
  final scope = request.scope;
  final uid = catchAsyncStateFromAsyncValue(ref.watch(uidProvider)).value;
  final live = catchAsyncStateFromAsyncValue(
    ref.watch(chatsListViewModelProvider),
  );
  final catchRead = catchAsyncStateFromAsyncValue(
    ref.watch(hostInboxCatchViewModelProvider),
  );
  final whatsappRead = catchAsyncStateFromAsyncValue(
    ref.watch(hostWhatsappThreadPagesProvider(organizerId)),
  );
  final events = catchAsyncStateFromAsyncValue(
    ref.watch(watchEventsForOrganizerProvider(organizerId)),
  ).value;
  final programmes =
      catchAsyncStateFromAsyncValue(
        ref.watch(organizerProgramListProvider(organizerId)),
      ).value ??
      const <OrganizerProgramSummary>[];
  final automations = ref.watch(
    hostAutomationsControllerProvider(
      organizerId,
      DateTime(request.day.year, request.day.month),
    ),
  );
  final automationsReady = automations.status == HostAutomationsStatus.ready;
  final automationsOn = automationsReady ? automations.onCount : null;
  final automationsSent = automationsReady ? automations.sentThisMonth : null;
  final scopes = HostMessagesScopes(
    events: orderHostInboxEvents(
      events ?? const <Event>[],
      now: ref.read(appClockProvider).now(),
    ),
    programmes: programmes,
  );

  if (scope?.programId case final programId?) {
    final programme = catchAsyncStateFromAsyncValue(
      ref.watch(hostInboxProgramAudiencePagesProvider(organizerId, programId)),
    );
    final page = programme.value;
    return HostMessagesState(
      status: HostMessagesStatus.ready,
      filter: request.filter,
      scope: scope,
      query: request.query,
      scopes: HostMessagesScopes(
        events: scopes.events,
        programmes: [
          ...programmes,
          if (page != null &&
              !programmes.any((p) => p.programId == page.program.programId))
            page.program,
        ],
      ),
      automationsOn: automationsOn,
      automationsSent: automationsSent,
      programme: HostMessagesProgramme(
        title: page?.program.title,
        loading: page == null && !programme.hasError,
        error: programme.hasError || programme.hasStaleError
            ? programme.error
            : null,
      ),
    );
  }

  final catchView = catchRead.value;
  final whatsappPages = whatsappRead.value;
  if (catchView == null || whatsappPages == null) {
    final error = catchRead.hasError ? catchRead.error : whatsappRead.error;
    final failed =
        (catchRead.hasError && catchView == null) ||
        (whatsappRead.hasError && whatsappPages == null);
    return HostMessagesState(
      status: failed ? HostMessagesStatus.error : HostMessagesStatus.loading,
      filter: request.filter,
      scope: scope,
      segment: request.segment,
      query: request.query,
      scopes: scopes,
      automationsOn: automationsOn,
      automationsSent: automationsSent,
      error: failed ? error : null,
    );
  }
  final eventId = scope?.eventId;
  final participations = eventId == null
      ? null
      : catchAsyncStateFromAsyncValue(
          ref.watch(watchEventParticipationsForEventProvider(eventId)),
        ).value;
  final booked = participations == null
      ? null
      : EventParticipationRoster.fromParticipations(
          participations.where((p) => p.eventId == eventId).toList(),
        ).bookedIds.toSet();
  final tonight = <String>{
    for (final event in events ?? const <Event>[])
      if (!event.isCancelled && _sameDay(event.startTime, request.day))
        event.id,
  };
  final inScope = composeHostMessageThreads(
    organizerId: organizerId,
    catchThreads: [...catchView.newMatches, ...catchView.conversations],
    whatsappThreads: whatsappPages.items,
    tonightEventIds: tonight,
    includeSource: switch (scope?.kind) {
      null => null,
      HostInboxScopeKind.general => (eventIds) => eventIds.isEmpty,
      _ => (eventIds) => eventIds.contains(eventId),
    },
    bookedUids: eventId == null ? null : booked,
  );
  final catchPages = uid == null
      ? null
      : ref.watch(hostInboxCatchPagesProvider(uid));
  final catchHasMore =
      catchPages?.canLoadMore(live.value?.sourceWindowMayHaveMore ?? true) ??
      false;
  final partialFailed =
      live.hasError || catchRead.hasError || whatsappRead.hasError;
  final partial =
      partialFailed ||
      catchHasMore ||
      catchPages?.error != null ||
      live.isLoading ||
      catchRead.isLoading ||
      whatsappRead.isLoading ||
      whatsappPages.hasMore;
  final query = request.query.trim().toLowerCase();
  final visible = [
    for (final thread in inScope)
      if (switch (request.filter) {
            HostMessagesFilter.all => true,
            HostMessagesFilter.unread => thread.unread,
            HostMessagesFilter.tonight => thread.tonight,
          } &&
          (eventId == null ||
              thread.booked == null ||
              thread.booked ==
                  (request.segment == HostInboxAudienceSegment.booked)) &&
          (query.isEmpty || thread.name.toLowerCase().contains(query)))
        thread,
  ];
  final complete = !partial && (eventId == null || participations != null);
  return HostMessagesState(
    status: HostMessagesStatus.ready,
    filter: request.filter,
    scope: scope,
    segment: request.segment,
    query: request.query,
    scopes: scopes,
    threads: List.unmodifiable(visible),
    unreadCount: inScope.where((thread) => thread.unread).length,
    automationsOn: automationsOn,
    automationsSent: automationsSent,
    bookedCount: complete && eventId != null
        ? inScope.where((thread) => thread.booked == true).length
        : null,
    prospectiveCount: complete && eventId != null
        ? inScope.where((thread) => thread.booked == false).length
        : null,
    unclassifiedCount: eventId == null
        ? 0
        : inScope.where((thread) => thread.booked == null).length,
    partial: partial,
    partialFailed: partialFailed,
    moreCatch: !catchHasMore
        ? HostMessagesMore.none
        : catchPages!.loadingMore
        ? HostMessagesMore.loading
        : catchPages.error != null
        ? HostMessagesMore.failed
        : HostMessagesMore.more,
    moreWhatsapp: !whatsappPages.hasMore
        ? HostMessagesMore.none
        : whatsappPages.loadingMore
        ? HostMessagesMore.loading
        : whatsappPages.nextPageError != null
        ? HostMessagesMore.failed
        : HostMessagesMore.more,
  );
}

/// One row per person: their Catch conversations with this organizer and
/// their WhatsApp threads, keyed the way the inbox opens them. The newest
/// message wins the preview; a person waits on the host when a Catch
/// conversation has unread messages or their newest WhatsApp message is
/// theirs.
List<HostMessageThread> composeHostMessageThreads({
  required String organizerId,
  required List<ChatThreadPreview> catchThreads,
  required List<HostWhatsappThreadSummary> whatsappThreads,
  required Set<String> tonightEventIds,
  bool Function(List<String> eventIds)? includeSource,
  Set<String>? bookedUids,
}) {
  final byPerson = <String, _HostThreadBuilder>{};
  for (final thread in catchThreads) {
    final match = thread.match;
    if (match.organizerId != organizerId ||
        !match.isOrganizerHostInquiry ||
        match.isBlocked ||
        match.isClosed ||
        !(includeSource?.call(thread.eventIds) ?? true)) {
      continue;
    }
    byPerson
        .putIfAbsent('uid:${thread.otherUid}', _HostThreadBuilder.new)
        .add(
          name: thread.displayName,
          photoUrl: thread.photoUrl,
          preview: thread.previewText,
          at: thread.timestamp,
          waiting: thread.unreadCount > 0,
          eventIds: thread.eventIds,
        );
  }
  for (final thread in whatsappThreads) {
    if (!(includeSource?.call(thread.eventIds) ?? true)) continue;
    final personId = thread.linkedUid == null
        ? 'contact:${thread.contactId}'
        : 'uid:${thread.linkedUid}';
    byPerson
        .putIfAbsent(personId, _HostThreadBuilder.new)
        .add(
          name: thread.displayName,
          preview: thread.lastMessageBody,
          at: thread.lastMessageAt,
          waiting:
              thread.lastMessageDirection ==
              HostWhatsappMessageDirection.inbound,
          eventIds: thread.eventIds,
        );
  }
  final threads = [
    for (final entry in byPerson.entries)
      entry.value.build(entry.key, tonightEventIds, bookedUids),
  ]..sort((a, b) => b.at.compareTo(a.at));
  return List.unmodifiable(threads);
}

class _HostThreadBuilder {
  String name = '';
  String? photoUrl;
  String preview = '';
  DateTime? at;
  bool waiting = false;
  final List<String> eventIds = <String>[];

  void add({
    required String name,
    required String preview,
    required DateTime at,
    required bool waiting,
    required List<String> eventIds,
    String? photoUrl,
  }) {
    this.photoUrl ??= photoUrl;
    if (this.at == null || at.isAfter(this.at!)) {
      this.name = name;
      this.preview = preview;
      this.at = at;
    }
    this.waiting = this.waiting || waiting;
    for (final id in eventIds) {
      if (!this.eventIds.contains(id)) this.eventIds.add(id);
    }
  }

  HostMessageThread build(
    String personId,
    Set<String> tonight,
    Set<String>? bookedUids,
  ) => HostMessageThread(
    personId: personId,
    name: name,
    photoUrl: photoUrl,
    preview: preview,
    at: at!,
    unread: waiting,
    tonight: eventIds.any(tonight.contains),
    eventId: eventIds.isEmpty ? null : eventIds.last,
    eventIds: List.unmodifiable(eventIds),
    booked: bookedUids == null || !personId.startsWith('uid:')
        ? null
        : bookedUids.contains(personId.substring(4)),
  );
}

bool _sameDay(DateTime a, DateTime b) =>
    a.year == b.year && a.month == b.month && a.day == b.day;

/// Reads Messages again after a failure.
void retryHostMessagesReads(WidgetRef ref, String organizerId) => ref
  ..invalidate(uidProvider)
  ..invalidate(chatsListViewModelProvider)
  ..invalidate(hostInboxCatchViewModelProvider)
  ..invalidate(organizerProgramListProvider(organizerId))
  ..invalidate(hostWhatsappThreadPagesProvider(organizerId))
  ..invalidate(watchEventsForOrganizerProvider(organizerId))
  ..invalidate(hostFormAutomationRulesProvider(organizerId, null))
  ..invalidate(hostFormAutomationRunPagesProvider(organizerId, null));
