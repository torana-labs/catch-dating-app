import 'dart:async';

import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_runtime.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_success_companion_launcher.g.dart';

// keepalive: companion launch de-dupe state must survive app-shell listener
// rebuilds so attendance transitions do not relaunch the same companion route.
@Riverpod(keepAlive: true)
EventSuccessCompanionLaunchRegistry eventSuccessCompanionLaunchRegistry(
  Ref ref,
) {
  return EventSuccessCompanionLaunchRegistry();
}

enum EventSuccessCompanionLaunchMoment { checkedIn }

enum EventSuccessCompanionLaunchResult { launched, alreadyHandled, unavailable }

class EventSuccessCompanionLaunchRegistry {
  final _seededUids = <String>{};
  final _statusesByUid = <String, Map<String, EventParticipationStatus>>{};
  final _launchedKeys = <String>{};

  List<EventParticipation> attendedTransitionsForUser({
    required String uid,
    required List<EventParticipation> participations,
  }) {
    final previousStatuses = _statusesByUid.putIfAbsent(uid, () => {});
    final nextStatuses = <String, EventParticipationStatus>{
      for (final participation in participations)
        participation.eventId: participation.status,
    };

    if (!_seededUids.contains(uid)) {
      _seededUids.add(uid);
      previousStatuses
        ..clear()
        ..addAll(nextStatuses);
      return const [];
    }

    final transitions = <EventParticipation>[];
    for (final participation in participations) {
      final previousStatus = previousStatuses[participation.eventId];
      if (previousStatus == null) continue;
      if (previousStatus == EventParticipationStatus.attended) continue;
      if (participation.status != EventParticipationStatus.attended) continue;
      transitions.add(participation);
    }

    previousStatuses
      ..clear()
      ..addAll(nextStatuses);
    return transitions;
  }

  bool claimLaunch({
    required String eventId,
    required EventSuccessCompanionLaunchMoment moment,
  }) => _launchedKeys.add(_launchKey(eventId: eventId, moment: moment));

  void markLaunched({
    required String eventId,
    required EventSuccessCompanionLaunchMoment moment,
  }) {
    _launchedKeys.add(_launchKey(eventId: eventId, moment: moment));
  }

  void reset() {
    _seededUids.clear();
    _statusesByUid.clear();
    _launchedKeys.clear();
  }
}

Future<EventSuccessCompanionLaunchResult>
launchEventSuccessCompanionForParticipation({
  required BuildContext context,
  required WidgetRef ref,
  required String uid,
  required EventParticipation participation,
}) async {
  try {
    final eventRepository = ref.read(eventRepositoryProvider);
    final event = await eventRepository.fetchEvent(participation.eventId);
    if (event == null || !context.mounted) {
      return EventSuccessCompanionLaunchResult.unavailable;
    }
    return await launchEventSuccessCompanionIfAvailable(
      context: context,
      ref: ref,
      uid: uid,
      event: event,
    );
  } catch (error, stackTrace) {
    FlutterError.reportError(
      FlutterErrorDetails(
        exception: error,
        stack: stackTrace,
        library: 'event_success',
        context: ErrorDescription(
          'while launching the event companion from attendance',
        ),
      ),
    );
    return EventSuccessCompanionLaunchResult.unavailable;
  }
}

Future<EventSuccessCompanionLaunchResult>
launchEventSuccessCompanionIfAvailable({
  required BuildContext context,
  required WidgetRef ref,
  required String uid,
  required Event event,
  EventSuccessCompanionLaunchMoment moment =
      EventSuccessCompanionLaunchMoment.checkedIn,
}) async {
  try {
    final organizersRepository = ref.read(organizersRepositoryProvider);
    final eventSuccessRepository = ref.read(eventSuccessRepositoryProvider);
    final registry = ref.read(eventSuccessCompanionLaunchRegistryProvider);
    final organizer = await organizersRepository.fetchOrganizer(event.clubId);
    if (organizer == null || organizer.isHostedBy(uid)) {
      return EventSuccessCompanionLaunchResult.unavailable;
    }

    final plan = await eventSuccessRepository.fetchPlan(event.id);
    if (plan == null || !context.mounted) {
      return EventSuccessCompanionLaunchResult.unavailable;
    }

    final now = DateTime.now();
    final eventEnded = !event.endTime.isAfter(now);
    final runtime = EventSuccessRuntime(plan: plan, event: event, now: now);
    if (eventEnded && !runtime.hasParticipantPostEventSurface) {
      return EventSuccessCompanionLaunchResult.unavailable;
    }

    if (_isCurrentCompanionRoute(context, event.id)) {
      registry.markLaunched(eventId: event.id, moment: moment);
      return EventSuccessCompanionLaunchResult.alreadyHandled;
    }

    if (!registry.claimLaunch(eventId: event.id, moment: moment)) {
      return EventSuccessCompanionLaunchResult.alreadyHandled;
    }

    unawaited(
      context.pushNamed(
        Routes.eventSuccessCompanionScreen.name,
        pathParameters: {'clubId': event.clubId, 'eventId': event.id},
        extra: event,
      ),
    );
    return EventSuccessCompanionLaunchResult.launched;
  } catch (error, stackTrace) {
    FlutterError.reportError(
      FlutterErrorDetails(
        exception: error,
        stack: stackTrace,
        library: 'event_success',
        context: ErrorDescription(
          'while deciding whether to launch the event companion',
        ),
      ),
    );
    return EventSuccessCompanionLaunchResult.unavailable;
  }
}

String _launchKey({
  required String eventId,
  required EventSuccessCompanionLaunchMoment moment,
}) => '$eventId:${moment.name}';

bool _isCurrentCompanionRoute(BuildContext context, String eventId) {
  try {
    return GoRouterState.of(
      context,
    ).uri.path.endsWith('/events/$eventId/companion');
  } catch (_) {
    return false;
  }
}
