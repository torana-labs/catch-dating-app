// architecture: provider-free
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation_roster.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/people/conversation/conversation_people.dart';
import 'package:catch_dating_app/pages/inbox/chats_list_view_model.dart';
import 'package:flutter/foundation.dart';

// The router and Sends still read the scope types from here until Sends
// moves.
export 'package:catch_dating_app/hosts/people/conversation/conversation_people.dart';

@immutable
class HostInboxThreadRowData {
  const HostInboxThreadRowData({
    required this.preview,
    required this.statusLabel,
  });

  final ChatThreadPreview preview;
  final String statusLabel;

  String get supportingText => '$statusLabel · ${preview.previewText}';
}

@immutable
class HostInboxViewModel {
  const HostInboxViewModel({
    required this.events,
    required this.programs,
    required this.scopeOptions,
    required this.selectedScope,
    required this.selectedEvent,
    required this.selectedProgram,
    required this.selectedSegment,
    required this.threads,
    required this.bookedThreadCount,
    required this.prospectiveThreadCount,
    required this.bookedAudienceCount,
    required this.prospectiveAudienceCount,
    required this.unfilteredSelectedThreadCount,
    required this.query,
    required this.broadcastLifecycleAvailable,
  });

  factory HostInboxViewModel.compose({
    required List<Event> events,
    required ChatsListViewModel inbox,
    required List<EventParticipation> participations,
    required String selectedOrganizerId,
    required HostInboxScope selectedScope,
    required HostInboxAudienceSegment selectedSegment,
    required String query,
    required DateTime now,
    List<OrganizerProgramSummary> programs = const [],
    HostInboxProgramAudience? programAudience,
  }) {
    final orderedEvents = orderHostInboxEvents(events, now: now);
    final eventsById = {for (final event in orderedEvents) event.id: event};
    final programsById = {
      for (final program in programs) program.programId: program,
    };
    final selectedEvent = selectedScope.eventId == null
        ? null
        : eventsById[selectedScope.eventId];
    final selectedProgram = selectedScope.programId == null
        ? null
        : programsById[selectedScope.programId];
    final effectiveScope = switch (selectedScope.kind) {
      HostInboxScopeKind.event when selectedEvent != null => selectedScope,
      // Program authority is checked by the exact-detail provider. A
      // truncated or loading menu must never turn a requested program into
      // General and expose an unrelated composer or conversation.
      HostInboxScopeKind.program => selectedScope,
      HostInboxScopeKind.general => selectedScope,
      _ => const HostInboxScope.general(),
    };
    final scopeOptions = <HostInboxScope>[
      for (final event in orderedEvents) HostInboxScope.event(event.id),
      for (final program in programs) HostInboxScope.program(program.programId),
      const HostInboxScope.general(),
    ];
    final allThreads = [...inbox.newMatches, ...inbox.conversations]
        .where((preview) => preview.match.organizerId == selectedOrganizerId)
        .toList(growable: false);

    if (effectiveScope.isProgram) {
      // Guest membership and contact event unions do not establish the purpose
      // of historical messages. Keep the requested scope without disclosing them.
      return HostInboxViewModel(
        events: orderedEvents,
        programs: List.unmodifiable(programs),
        scopeOptions: List.unmodifiable(scopeOptions),
        selectedScope: effectiveScope,
        selectedEvent: null,
        selectedProgram: selectedProgram,
        selectedSegment: selectedSegment,
        threads: const [],
        bookedThreadCount: 0,
        prospectiveThreadCount: 0,
        bookedAudienceCount: 0,
        prospectiveAudienceCount: 0,
        unfilteredSelectedThreadCount: 0,
        query: query.trim(),
        broadcastLifecycleAvailable: false,
      );
    }

    if (selectedEvent == null) {
      final generalThreads = allThreads
          .where((preview) => preview.eventIds.isEmpty)
          .map(
            (preview) => HostInboxThreadRowData(
              preview: preview,
              statusLabel: 'General inquiry',
            ),
          )
          .toList(growable: false);
      final filtered = _filterRows(generalThreads, query);
      return HostInboxViewModel(
        events: orderedEvents,
        programs: List.unmodifiable(programs),
        scopeOptions: List.unmodifiable(scopeOptions),
        selectedScope: effectiveScope,
        selectedEvent: null,
        selectedProgram: null,
        selectedSegment: selectedSegment,
        threads: List.unmodifiable(filtered),
        bookedThreadCount: 0,
        prospectiveThreadCount: 0,
        bookedAudienceCount: 0,
        prospectiveAudienceCount: 0,
        unfilteredSelectedThreadCount: generalThreads.length,
        query: query.trim(),
        broadcastLifecycleAvailable: false,
      );
    }

    final eventParticipations = participations
        .where((participation) => participation.eventId == selectedEvent.id)
        .toList(growable: false);
    final participationByUid = <String, EventParticipation>{
      for (final participation in eventParticipations)
        participation.uid: participation,
    };
    final roster = EventParticipationRoster.fromParticipations(
      eventParticipations,
    );
    final bookedIds = roster.bookedIds.toSet();
    final eventThreads = allThreads
        .where((preview) => preview.eventIds.contains(selectedEvent.id))
        .toList(growable: false);
    final bookedThreads = eventThreads
        .where((preview) => bookedIds.contains(preview.otherUid))
        .toList(growable: false);
    final prospectiveThreads = eventThreads
        .where((preview) => !bookedIds.contains(preview.otherUid))
        .toList(growable: false);
    final selectedThreads = selectedSegment == HostInboxAudienceSegment.booked
        ? bookedThreads
        : prospectiveThreads;
    final rows = selectedThreads
        .map(
          (preview) => HostInboxThreadRowData(
            preview: preview,
            statusLabel: _statusLabelFor(
              participationByUid[preview.otherUid],
              selectedSegment,
            ),
          ),
        )
        .toList(growable: false);

    return HostInboxViewModel(
      events: orderedEvents,
      programs: List.unmodifiable(programs),
      scopeOptions: List.unmodifiable(scopeOptions),
      selectedScope: effectiveScope,
      selectedEvent: selectedEvent,
      selectedProgram: null,
      selectedSegment: selectedSegment,
      threads: List.unmodifiable(_filterRows(rows, query)),
      bookedThreadCount: bookedThreads.length,
      prospectiveThreadCount: prospectiveThreads.length,
      bookedAudienceCount: roster.bookedCount,
      prospectiveAudienceCount: roster.waitlistedCount,
      unfilteredSelectedThreadCount: rows.length,
      query: query.trim(),
      broadcastLifecycleAvailable:
          !selectedEvent.isCancelled && selectedEvent.endTime.isAfter(now),
    );
  }

  final List<Event> events;
  final List<OrganizerProgramSummary> programs;
  final List<HostInboxScope> scopeOptions;
  final HostInboxScope selectedScope;
  final Event? selectedEvent;
  final OrganizerProgramSummary? selectedProgram;
  final HostInboxAudienceSegment selectedSegment;
  final List<HostInboxThreadRowData> threads;
  final int bookedThreadCount;
  final int prospectiveThreadCount;
  final int bookedAudienceCount;
  final int prospectiveAudienceCount;
  final int unfilteredSelectedThreadCount;
  final String query;
  final bool broadcastLifecycleAvailable;

  bool get isGeneral => selectedScope.isGeneral;
  bool get isProgram => selectedScope.isProgram;
  bool get hasUnresolvedPurpose => isProgram;
  bool get hasSearchResults => threads.isNotEmpty;
  bool get hasUnfilteredThreads => unfilteredSelectedThreadCount > 0;
  int get selectedAudienceCount =>
      selectedSegment == HostInboxAudienceSegment.booked
      ? bookedAudienceCount
      : prospectiveAudienceCount;
  int get everyoneAudienceCount =>
      bookedAudienceCount + prospectiveAudienceCount;
}

List<HostInboxThreadRowData> _filterRows(
  List<HostInboxThreadRowData> rows,
  String query,
) {
  final normalized = query.trim().toLowerCase();
  if (normalized.isEmpty) return rows;
  return rows
      .where(
        (row) => row.preview.displayName.toLowerCase().contains(normalized),
      )
      .toList(growable: false);
}

String _statusLabelFor(
  EventParticipation? participation,
  HostInboxAudienceSegment segment,
) {
  if (participation == null) return 'Inquiry';
  if (segment == HostInboxAudienceSegment.booked) {
    return participation.status == EventParticipationStatus.attended
        ? 'Checked in'
        : 'Booked';
  }
  if (participation.hostApprovalStatus == EventJoinRequestStatus.pending) {
    return 'Requested';
  }
  return switch (participation.waitlistOfferStatus) {
    EventWaitlistOfferStatus.active => 'Offered',
    EventWaitlistOfferStatus.accepted => 'Accepted',
    _ => 'Waitlist',
  };
}
