import 'dart:async';

import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_runtime.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_platform/routing/route_contract.dart';
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
  final _openEventIdsByUid = <String, Set<String>>{};
  final _launchedKeys = <String>{};

  /// The events whose booking left the guest's open bookings (signed up or
  /// waitlisted) since the last call: each may now be attended, so the
  /// caller reads that one booking to decide. The first call for a guest
  /// only records the set.
  List<String> departedEventIdsForUser({
    required String uid,
    required List<EventParticipation> openBookings,
  }) {
    final next = {for (final booking in openBookings) booking.eventId};
    final previous = _openEventIdsByUid[uid];
    _openEventIdsByUid[uid] = next;
    if (previous == null) return const [];
    return List.unmodifiable(previous.difference(next).toList()..sort());
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
    _openEventIdsByUid.clear();
    _launchedKeys.clear();
  }
}

/// Reads the guest's booking for [eventId] once and launches the companion
/// when it is attended.
Future<EventSuccessCompanionLaunchResult>
launchEventSuccessCompanionIfAttended({
  required BuildContext context,
  required WidgetRef ref,
  required String uid,
  required String eventId,
}) async {
  try {
    final participation = await ref
        .read(eventParticipationRepositoryProvider)
        .fetchParticipation(eventId: eventId, uid: uid);
    if (participation?.status != EventParticipationStatus.attended ||
        !context.mounted) {
      return EventSuccessCompanionLaunchResult.unavailable;
    }
    return await launchEventSuccessCompanionForParticipation(
      context: context,
      ref: ref,
      uid: uid,
      participation: participation!,
    );
  } catch (error, stackTrace) {
    FlutterError.reportError(
      FlutterErrorDetails(
        exception: error,
        stack: stackTrace,
        library: 'event_success',
        context: ErrorDescription(
          'while reading a booking that left the open bookings',
        ),
      ),
    );
    return EventSuccessCompanionLaunchResult.unavailable;
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
    final organizer = await organizersRepository.fetchOrganizer(
      event.organizerId,
    );
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
        pathParameters: {'organizerId': event.organizerId, 'eventId': event.id},
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
