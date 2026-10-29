import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_companion_clock.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/design_fixtures/event_success_companion_fixtures.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_companion_screen.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_live_effects_controller.dart';
import 'package:catch_dating_app/platform/device/connectivity_service.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import '../../support/widgetbook_harness.dart';
import 'fixtures.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Route states',
  type: EventSuccessCompanionRouteScreen,
  path: '[P1 product surfaces]/Event Success companion',
)
Widget eventSuccessCompanionRouteStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'EventSuccessCompanionRouteScreen',
    contractId: 'screen.event_success.companion',
    children: [
      WidgetbookPageStateCard(
        label: 'route loading',
        child: WidgetbookCompanionDeviceFrame(
          child: _CompanionRouteScope(eventStream: _loadingStream<Event?>()),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'event load error',
        child: WidgetbookCompanionDeviceFrame(
          child: _CompanionRouteScope(
            eventStream: _errorStream<Event?>('Event failed'),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'event not found',
        child: WidgetbookCompanionDeviceFrame(
          child: _CompanionRouteScope(eventStream: Stream<Event?>.value(null)),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'sign in required',
        child: const WidgetbookCompanionDeviceFrame(
          child: _CompanionRouteScope(uid: null),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'profile loading',
        child: WidgetbookCompanionDeviceFrame(
          child: _CompanionRouteScope(
            profileStream: _loadingStream<UserProfile?>(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'profile error',
        child: WidgetbookCompanionDeviceFrame(
          child: _CompanionRouteScope(
            profileStream: _errorStream<UserProfile?>('Profile failed'),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'participation error',
        child: WidgetbookCompanionDeviceFrame(
          child: _CompanionRouteScope(
            participationStream: _errorStream<EventParticipation?>(
              'Participation failed',
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'no booking',
        child: WidgetbookCompanionDeviceFrame(
          child: _CompanionRouteScope(
            participationStream: Stream<EventParticipation?>.value(null),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'plan loading',
        child: WidgetbookCompanionDeviceFrame(
          child: _CompanionRouteScope(
            planStream: _loadingStream<EventSuccessPlan?>(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'plan error',
        child: WidgetbookCompanionDeviceFrame(
          child: _CompanionRouteScope(
            planStream: _errorStream<EventSuccessPlan?>('Plan failed'),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'offline plan error',
        child: WidgetbookCompanionDeviceFrame(
          child: _CompanionRouteScope(
            planStream: Stream<EventSuccessPlan?>.error(
              _companionOfflineException(action: 'load event guide'),
              StackTrace.empty,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'plan missing',
        child: const WidgetbookCompanionDeviceFrame(
          child: _CompanionRouteScope(planValue: null),
        ),
      ),
    ],
  );
}

class _CompanionRouteScope extends StatelessWidget {
  const _CompanionRouteScope({
    this.uid = EventSuccessCompanionFixtures.viewerUid,
    this.eventStream,
    this.profileStream,
    this.participationStream,
    this.planValue,
    this.planStream,
  });

  final String? uid;
  final Stream<Event?>? eventStream;
  final Stream<UserProfile?>? profileStream;
  final Stream<EventParticipation?>? participationStream;
  final EventSuccessPlan? planValue;
  final Stream<EventSuccessPlan?>? planStream;

  @override
  Widget build(BuildContext context) {
    final event = EventSuccessCompanionFixtures.socialEvent;
    final profile = EventSuccessCompanionFixtures.viewer;
    final plan = planValue ?? EventSuccessCompanionFixtures.basePlan;
    final participation = EventSuccessCompanionFixtures.signedUpParticipation(
      event: event,
    );
    return WidgetbookFixtureScope(
      overrides: [
        uidProvider.overrideWithValue(AsyncData<String?>(uid)),
        watchEventProvider(
          event.id,
        ).overrideWith((ref) => eventStream ?? Stream<Event?>.value(event)),
        watchUserProfileProvider.overrideWith(
          (ref) => profileStream ?? Stream<UserProfile?>.value(profile),
        ),
        watchEventParticipationProvider(event.id, uid ?? '').overrideWith(
          (ref) =>
              participationStream ??
              Stream<EventParticipation?>.value(participation),
        ),
        watchEventSuccessPlanProvider(event.id).overrideWith(
          (ref) => planStream ?? Stream<EventSuccessPlan?>.value(plan),
        ),
        eventSuccessCompanionClockProvider.overrideWith(
          (ref) => Stream<DateTime>.value(EventSuccessCompanionFixtures.now),
        ),
        eventSuccessLiveEffectsControllerProvider.overrideWith(
          (ref) => WidgetbookCompanionNoopEventSuccessLiveEffectsController(),
        ),
      ],
      child: EventSuccessCompanionRouteScreen(
        clubId: event.clubId,
        eventId: event.id,
      ),
    );
  }
}

Stream<T> _loadingStream<T>() => Stream<T>.empty();

Stream<T> _errorStream<T>(String message) =>
    Stream<T>.error(StateError(message), StackTrace.empty);

NetworkException _companionOfflineException({required String action}) {
  return obviousOfflineException(
    context: BackendErrorContext(
      service: BackendService.firestore,
      action: action,
      resource: 'eventSuccessCompanion',
    ),
  );
}
