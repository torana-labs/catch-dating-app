import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_playbooks.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_runtime.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_companion_screen.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_companion_screen_state.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart'
    show buildEvent, buildEventParticipation, buildPublicProfile, buildUser;

final _l10n = AppLocalizationsEn();

void main() {
  group('EventSuccessCompanionScreenState', () {
    test('derives pre-arrival moment and paper shell state', () {
      final start = DateTime(2026, 5, 18, 19);
      final event = buildEvent(
        startTime: start,
        endTime: start.add(const Duration(hours: 2)),
      );
      final plan = EventSuccessPlan.defaultForEvent(
        event,
        now: event.startTime,
      );

      final state = EventSuccessCompanionScreenState.from(
        l10n: _l10n,
        event: event,
        plan: plan,
        userProfile: buildUser(),
        participation: buildEventParticipation(event: event, uid: 'runner-1'),
        wingmanRequestCandidates: const [],
        compatibilityResponse: null,
        arrivalMission: null,
        arrivalMissionStartAvailable: false,
        now: start.subtract(const Duration(hours: 1)),
      );

      expect(
        state.attendeeMoment.kind,
        EventSuccessAttendeeMomentKind.preArrival,
      );
      expect(state.attendeeMoment.showPreCheckInPlanning, true);
      expect(state.usePaperShell, true);
      expect(state.eventEnded, false);
      expect(state.presentation.choreography.momentKind, 'preArrival');
      expect(
        state.presentation.choreography.paletteTokenId,
        'activity.running',
      );
      expect(state.effectKey, contains('preArrival'));
      expect(state.transitionKey('stage'), contains('preArrival:stage'));
    });

    test('derives First Hello moment when mission start is available', () {
      final start = DateTime(2026, 5, 18, 19);
      final event = buildEvent(
        startTime: start,
        endTime: start.add(const Duration(hours: 2)),
      );
      final plan = EventSuccessPlan.defaultForEvent(event, now: event.startTime)
          .copyWith(
            selectedModuleIds: [
              EventSuccessModuleCatalog.checkIn.id,
              EventSuccessModuleCatalog.firstHelloCheckIn.id,
            ],
          );

      final state = EventSuccessCompanionScreenState.from(
        l10n: _l10n,
        event: event,
        plan: plan,
        userProfile: buildUser(),
        participation: buildEventParticipation(event: event, uid: 'runner-1'),
        wingmanRequestCandidates: const [],
        compatibilityResponse: null,
        arrivalMission: null,
        arrivalMissionStartAvailable: true,
        now: start.subtract(const Duration(minutes: 5)),
      );

      expect(
        state.attendeeMoment.kind,
        EventSuccessAttendeeMomentKind.firstHelloCheckIn,
      );
      expect(state.attendeeMoment.showFirstHelloCheckIn, true);
      expect(state.usePaperShell, false);
      expect(state.presentation.choreography.motifId, 'signal');
      expect(state.effectKey, contains('firstHelloCheckIn'));
    });

    test('filters wingman candidates to viewer interested-in genders', () {
      final start = DateTime(2026, 5, 18, 7);
      final event = buildEvent(
        startTime: start,
        endTime: start.add(const Duration(hours: 2)),
      );
      final viewer = buildUser(
        gender: Gender.woman,
        interestedInGenders: const [Gender.man],
      );

      final state = EventSuccessCompanionScreenState.from(
        l10n: _l10n,
        event: event,
        plan: EventSuccessPlan.defaultForEvent(event, now: event.startTime),
        userProfile: viewer,
        participation: buildEventParticipation(
          event: event,
          uid: viewer.uid,
          status: EventParticipationStatus.attended,
        ),
        wingmanRequestCandidates: [
          buildPublicProfile(uid: 'runner-2', name: 'Arjun'),
          buildPublicProfile(
            uid: 'runner-3',
            name: 'Rhea',
            gender: Gender.woman,
          ),
        ],
        compatibilityResponse: null,
        arrivalMission: null,
        arrivalMissionStartAvailable: false,
        now: start.add(const Duration(hours: 1)),
      );

      expect(state.wingmanCandidates.map((candidate) => candidate.uid), [
        'runner-2',
      ]);
    });
  });

  group('AssignmentOptOutActionState', () {
    test('derives included from opt-out preference', () {
      expect(const AssignmentOptOutActionState(optedOut: false).included, true);
      expect(const AssignmentOptOutActionState(optedOut: true).included, false);
    });

    test('keeps pending state separate from preference state', () {
      const state = AssignmentOptOutActionState(
        optedOut: false,
        isSaving: true,
      );

      expect(state.included, true);
      expect(state.isSaving, true);
    });
  });

  group('SelfCheckInActionState', () {
    test('defaults to idle and can represent check-in pending', () {
      expect(const SelfCheckInActionState().isCheckingIn, false);
      expect(
        const SelfCheckInActionState(isCheckingIn: true).isCheckingIn,
        true,
      );
    });
  });

  group('WingmanRequestActionState', () {
    test('defaults to idle and can represent saving', () {
      expect(const WingmanRequestActionState().isSaving, false);
      expect(const WingmanRequestActionState(isSaving: true).isSaving, true);
    });
  });

  group('EventSuccessFeedbackActionState', () {
    test('defaults to idle and can represent saving', () {
      expect(const EventSuccessFeedbackActionState().isSaving, false);
      expect(
        const EventSuccessFeedbackActionState(isSaving: true).isSaving,
        true,
      );
    });
  });
}
