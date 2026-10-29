import 'package:catch_dating_app/contexts/events/data/event_draft_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_draft.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_event_entry_state.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_prefill.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/host_create_event_screen.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

Future<void> runHostEventEntryFlow({
  required BuildContext context,
  required WidgetRef ref,
  required Club club,
  required HostEventEntryState state,
  required HostEventEntrySelection selection,
  required DateTime createdAt,
  bool Function()? isCurrent,
}) async {
  switch (selection.intent) {
    case HostEventEntryIntent.resumeDraft:
      final draft = selection.draft;
      if (draft == null || draft.clubId != club.id || !context.mounted) return;
      await _openCreateEvent(
        context: context,
        ref: ref,
        club: club,
        initialDraft: draft,
        isCurrent: isCurrent,
      );
    case HostEventEntryIntent.repeatLastEvent:
      final source = state.repeatSource;
      if (source == null) return;
      await _openRepeatEvent(
        context: context,
        ref: ref,
        club: club,
        event: source,
        createdAt: createdAt,
        isCurrent: isCurrent,
      );
    case HostEventEntryIntent.createEvent:
      await _openCreateEvent(
        context: context,
        ref: ref,
        club: club,
        isCurrent: isCurrent,
      );
    case HostEventEntryIntent.createProgram:
      if (state.organizerId != club.id || !context.mounted) return;
      await context.pushNamed(
        Routes.hostCreateProgramScreen.name,
        pathParameters: {'clubId': club.id},
      );
    case HostEventEntryIntent.resumePrivateEvent:
      final eventId = selection.savedEventId;
      if (eventId == null || eventId.isEmpty) return;
      await _openCreateEvent(
        context: context,
        ref: ref,
        club: club,
        initialSavedEventId: eventId,
        isCurrent: isCurrent,
      );
  }
}

Future<void> _openCreateEvent({
  required BuildContext context,
  required WidgetRef ref,
  required Club club,
  EventDraft? initialDraft,
  String? initialSavedEventId,
  bool Function()? isCurrent,
}) async {
  await context.pushNamed(
    Routes.hostCreateEventScreen.name,
    pathParameters: {'clubId': club.id},
    extra: HostCreateEventRouteArguments(
      initialClub: club,
      initialDraft: initialDraft,
      initialSavedEventId: initialSavedEventId,
      externalBookingMode: initialDraft?.externalBookingMode ?? false,
      promptForDrafts: false,
    ),
  );
  if (!context.mounted || isCurrent?.call() == false) return;
  ref.invalidate(clubEventDraftsProvider(clubId: club.id));
}

Future<void> _openRepeatEvent({
  required BuildContext context,
  required WidgetRef ref,
  required Club club,
  required Event event,
  required DateTime createdAt,
  bool Function()? isCurrent,
}) async {
  final prefill = CreateEventPrefill.repeat(event: event, createdAt: createdAt);
  await context.pushNamed(
    Routes.hostCreateEventScreen.name,
    pathParameters: {'clubId': club.id},
    extra: HostCreateEventRouteArguments(
      initialClub: club,
      initialPrefill: prefill,
      promptForDrafts: false,
    ),
  );
  if (!context.mounted || isCurrent?.call() == false) return;
  ref.invalidate(clubEventDraftsProvider(clubId: club.id));
}
