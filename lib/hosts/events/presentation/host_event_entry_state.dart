import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_draft.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:flutter/foundation.dart';

enum HostEventEntryIntent {
  resumeDraft,
  repeatLastEvent,
  createEvent,
  createProgram,
  resumePrivateEvent,
}

/// A starting path, including the exact draft selected in the combined sheet.
@immutable
class HostEventEntrySelection {
  const HostEventEntrySelection.start(this.intent)
    : assert(
        intent != HostEventEntryIntent.resumeDraft &&
            intent != HostEventEntryIntent.resumePrivateEvent,
      ),
      draft = null,
      savedEventId = null;
  const HostEventEntrySelection.resume(EventDraft this.draft)
    : intent = HostEventEntryIntent.resumeDraft,
      savedEventId = null;
  const HostEventEntrySelection.saved(this.savedEventId)
    : intent = HostEventEntryIntent.resumePrivateEvent,
      draft = null;

  final HostEventEntryIntent intent;
  final EventDraft? draft;
  final String? savedEventId;
}

typedef HostEventEntryCallback =
    void Function(
      Organizer organizer,
      HostEventEntryState state,
      HostEventEntrySelection selection,
    );

/// Resolves the event-creation choices available for one organizer.
///
/// Dress rehearsal is intentionally not a creation mode. Today owns its
/// dedicated operational entry point into the isolated rehearsal feature.
@immutable
class HostEventEntryState {
  const HostEventEntryState._({
    required this.organizerId,
    required this.drafts,
    required this.repeatSource,
    required this.continueIntents,
    required this.startIntents,
  });

  factory HostEventEntryState.resolve({
    required String? organizerId,
    Iterable<EventDraft> drafts = const <EventDraft>[],
    Event? repeatSource,
  }) {
    final normalizedOrganizerId = organizerId?.trim();
    if (normalizedOrganizerId == null || normalizedOrganizerId.isEmpty) {
      return const HostEventEntryState._(
        organizerId: null,
        drafts: <EventDraft>[],
        repeatSource: null,
        continueIntents: <HostEventEntryIntent>[],
        startIntents: <HostEventEntryIntent>[],
      );
    }

    final matchingDrafts =
        drafts
            .where((draft) => draft.organizerId == normalizedOrganizerId)
            .toList()
          ..sort((a, b) => b.savedAt.compareTo(a.savedAt));
    final matchingRepeatSource =
        repeatSource?.organizerId == normalizedOrganizerId
        ? repeatSource
        : null;

    return HostEventEntryState._(
      organizerId: normalizedOrganizerId,
      drafts: List<EventDraft>.unmodifiable(matchingDrafts),
      repeatSource: matchingRepeatSource,
      continueIntents: List<HostEventEntryIntent>.unmodifiable([
        if (matchingDrafts.isNotEmpty) HostEventEntryIntent.resumeDraft,
        if (matchingRepeatSource != null) HostEventEntryIntent.repeatLastEvent,
      ]),
      startIntents: const <HostEventEntryIntent>[
        HostEventEntryIntent.createEvent,
        HostEventEntryIntent.createProgram,
      ],
    );
  }

  final String? organizerId;
  final List<EventDraft> drafts;
  final Event? repeatSource;
  final List<HostEventEntryIntent> continueIntents;
  final List<HostEventEntryIntent> startIntents;

  bool get hasOrganizer => organizerId != null;
  bool get hasDrafts => drafts.isNotEmpty;
  bool get hasMultipleDrafts => drafts.length > 1;
  EventDraft? get mostRecentDraft => drafts.isEmpty ? null : drafts.first;

  List<HostEventEntryIntent> get intents =>
      List.unmodifiable([...continueIntents, ...startIntents]);
}
