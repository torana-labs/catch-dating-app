import 'dart:async';

import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation_roster.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_view_model.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class HostEventAnnouncementTarget {
  const HostEventAnnouncementTarget({
    required this.event,
    required this.bookedCount,
    required this.prospectiveCount,
  });

  final Event event;
  final int bookedCount;
  final int prospectiveCount;
}

class HostEventAnnouncementField extends ConsumerWidget {
  const HostEventAnnouncementField({
    super.key,
    required this.organizerId,
    required this.preferredEventId,
    required this.initialSegment,
    required this.sendingEnabled,
    required this.now,
    required this.onStart,
  });

  final String organizerId;
  final String? preferredEventId;
  final HostInboxAudienceSegment initialSegment;
  final bool sendingEnabled;
  final DateTime now;
  final Future<void> Function(HostEventAnnouncementTarget target) onStart;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final events = ref.watch(watchEventsForClubProvider(organizerId));
    return events.when(
      loading: () => CatchFieldLanes.single(
        child: CatchField.read(
          copy: catchFieldCopy(context.l10n),
          key: const ValueKey('host-send-intent-event-announcement'),
          title: context.l10n.hostSendsEventAnnouncementIntent,
          body: context.l10n.hostSendsEventAnnouncementChecking,
        ),
      ),
      error: (_, _) => CatchFieldLanes.single(
        child: CatchField.read(
          copy: catchFieldCopy(context.l10n),
          key: const ValueKey('host-send-intent-event-announcement'),
          title: context.l10n.hostSendsEventAnnouncementIntent,
          body: context.l10n.hostSendsEventAnnouncementUnavailable,
        ),
      ),
      data: (events) {
        final event = _eventForAnnouncement(
          events,
          preferredEventId: preferredEventId,
          now: now,
        );
        if (event == null) {
          return CatchFieldLanes.single(
            child: CatchField.read(
              copy: catchFieldCopy(context.l10n),
              key: const ValueKey('host-send-intent-event-announcement'),
              title: context.l10n.hostSendsEventAnnouncementIntent,
              body: context.l10n.hostSendsEventAnnouncementEmpty,
            ),
          );
        }
        final participations = ref.watch(
          watchEventParticipationsForEventProvider(event.id),
        );
        return participations.when(
          loading: () => CatchFieldLanes.single(
            child: CatchField.read(
              copy: catchFieldCopy(context.l10n),
              key: const ValueKey('host-send-intent-event-announcement'),
              title: context.l10n.hostSendsEventAnnouncementIntent,
              body: context.l10n.hostSendsEventAnnouncementCheckingAudience,
            ),
          ),
          error: (_, _) => CatchFieldLanes.single(
            child: CatchField.read(
              copy: catchFieldCopy(context.l10n),
              key: const ValueKey('host-send-intent-event-announcement'),
              title: context.l10n.hostSendsEventAnnouncementIntent,
              body: context.l10n.hostSendsEventAnnouncementUnavailable,
            ),
          ),
          data: (participations) {
            final roster = EventParticipationRoster.fromParticipations(
              participations
                  .where((participation) => participation.eventId == event.id)
                  .toList(growable: false),
            );
            final target = HostEventAnnouncementTarget(
              event: event,
              bookedCount: roster.bookedCount,
              prospectiveCount: roster.waitlistedCount,
            );
            final selectedCount =
                initialSegment == HostInboxAudienceSegment.booked
                ? target.bookedCount
                : target.prospectiveCount;
            final hasAudience =
                target.bookedCount + target.prospectiveCount > 0;
            final canStart =
                sendingEnabled &&
                !event.isCancelled &&
                event.endTime.isAfter(now) &&
                hasAudience;
            final body = context.l10n.hostSendsEventAnnouncementIntentBody(
              eventTitle: event.title,
              bookedCount: target.bookedCount,
              prospectiveCount: target.prospectiveCount,
            );
            return CatchFieldLanes.single(
              child: canStart
                  ? CatchField.nav(
                      copy: catchFieldCopy(context.l10n),
                      key: const ValueKey(
                        'host-send-intent-event-announcement',
                      ),
                      title: context.l10n.hostSendsEventAnnouncementIntent,
                      body: body,
                      valueText: context.l10n.hostSendsEventAudienceSelected(
                        count: selectedCount,
                      ),
                      onTap: () => unawaited(onStart(target)),
                    )
                  : CatchField.read(
                      copy: catchFieldCopy(context.l10n),
                      key: const ValueKey(
                        'host-send-intent-event-announcement',
                      ),
                      title: context.l10n.hostSendsEventAnnouncementIntent,
                      body: body,
                      valueText: hasAudience
                          ? context
                                .l10n
                                .hostSendsEventAnnouncementUnavailableShort
                          : context.l10n.hostSendsEventAnnouncementNoAudience,
                    ),
            );
          },
        );
      },
    );
  }
}

Event? _eventForAnnouncement(
  List<Event> events, {
  required String? preferredEventId,
  required DateTime now,
}) {
  final eligible = orderHostInboxEvents(
    events,
    now: now,
  ).where((event) => !event.isCancelled && event.endTime.isAfter(now)).toList();
  if (preferredEventId != null) {
    for (final event in eligible) {
      if (event.id == preferredEventId) return event;
    }
  }
  return eligible.firstOrNull;
}
