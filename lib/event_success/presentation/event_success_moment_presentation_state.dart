import 'package:catch_dating_app/core/schema_contracts/generated/event_success_moment_presentations.g.dart';
import 'package:catch_dating_app/event_success/domain/event_success_plan.dart';
import 'package:catch_dating_app/event_success/domain/event_success_playbooks.dart';
import 'package:catch_dating_app/event_success/domain/event_success_runtime.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_live_effects_controller.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

class EventSuccessMomentPresentation {
  EventSuccessMomentPresentation({
    required this.badgeLabel,
    required this.headline,
    required this.body,
    required this.privacyLine,
    required this.icon,
    required this.badgeTone,
    required this.choreography,
    this.effectKind,
    EventSuccessAmbientBed? ambientBed,
  }) : ambientBed =
           ambientBed ??
           _eventSuccessAmbientBedForId(choreography.ambientBedId);

  final String badgeLabel;
  final String headline;
  final String body;
  final String privacyLine;
  final IconData icon;
  final CatchBadgeTone badgeTone;
  final EventSuccessMomentPresentationContract choreography;
  final EventSuccessLiveEffectKind? effectKind;
  final EventSuccessAmbientBed ambientBed;

  static EventSuccessMomentPresentation forMoment({
    required AppLocalizations l10n,
    required Event event,
    required EventSuccessPlan plan,
    required EventSuccessAttendeeMoment moment,
    required bool attended,
    required bool showSelfCheckIn,
    required bool eventEnded,
  }) {
    final step = moment.activeStep;
    final choreography = eventSuccessMomentPresentationFor(moment.kind.name);
    return switch (moment.kind) {
      EventSuccessAttendeeMomentKind.preArrival => EventSuccessMomentPresentation(
        badgeLabel: l10n
            .eventSuccessEventSuccessCompanionScreenStateVisiblecopyBeforeArrival,
        headline: l10n
            .eventSuccessEventSuccessCompanionScreenStateVisiblecopyYourEventGuideIs,
        body: l10n
            .eventSuccessEventSuccessCompanionScreenStateBodyWhenCheckInOpens(
              locationName: event.locationName,
            ),
        privacyLine: l10n
            .eventSuccessEventSuccessCompanionScreenStateVisiblecopyPreEventDetailsStay,
        icon: CatchIcons.eventConfirmed,
        badgeTone: CatchBadgeTone.brand,
        choreography: choreography,
        effectKind: EventSuccessLiveEffectKind.liveEntry,
      ),
      EventSuccessAttendeeMomentKind.selfCheckIn => EventSuccessMomentPresentation(
        badgeLabel: l10n
            .eventSuccessEventSuccessCompanionScreenStateVisiblecopyArrivalCue,
        headline: l10n
            .eventSuccessEventSuccessCompanionScreenStateVisiblecopyCheckInWhenYou,
        body:
            l10n.eventSuccessEventSuccessCompanionScreenStateBodyOneTapTellsThe,
        privacyLine: l10n
            .eventSuccessEventSuccessCompanionScreenStateVisiblecopyCheckInOnlyUpdates,
        icon: CatchIcons.qrCode,
        badgeTone: CatchBadgeTone.warning,
        choreography: choreography,
        effectKind: EventSuccessLiveEffectKind.liveEntry,
      ),
      EventSuccessAttendeeMomentKind.firstHelloCheckIn =>
        EventSuccessMomentPresentation(
          badgeLabel: l10n
              .eventSuccessEventSuccessCompanionScreenStateVisiblecopyFirstHello,
          headline: l10n
              .eventSuccessEventSuccessCompanionScreenStateVisiblecopyYourFirstArrivalMission,
          body: l10n
              .eventSuccessEventSuccessCompanionScreenStateBodyFindOnePersonAsk,
          privacyLine: l10n
              .eventSuccessEventSuccessCompanionScreenStateVisiblecopyThisChecksYouIn,
          icon: CatchIcons.wave,
          badgeTone: CatchBadgeTone.brand,
          choreography: choreography,
          effectKind: EventSuccessLiveEffectKind.liveEntry,
        ),
      EventSuccessAttendeeMomentKind.compatibilityQuestionnaire =>
        EventSuccessMomentPresentation(
          badgeLabel: l10n
              .eventSuccessEventSuccessCompanionScreenStateVisiblecopyMatchClues,
          headline: l10n
              .eventSuccessEventSuccessCompanionScreenStateVisiblecopyAddAFewClues,
          body: l10n
              .eventSuccessEventSuccessCompanionScreenStateBodyQuickAnswersHelpCatch,
          privacyLine: l10n
              .eventSuccessEventSuccessCompanionScreenStateVisiblecopyHostsDoNotSee,
          icon: CatchIcons.filters,
          badgeTone: CatchBadgeTone.brand,
          choreography: choreography,
          effectKind: EventSuccessLiveEffectKind.liveEntry,
        ),
      EventSuccessAttendeeMomentKind.liveStepContext => EventSuccessMomentPresentation(
        badgeLabel:
            step?.stage.label ??
            l10n.eventSuccessEventSuccessCompanionScreenStateVisiblecopyLiveNow,
        headline:
            step?.title ??
            l10n.eventSuccessEventSuccessCompanionScreenStateVisiblecopyFollowTheHostFor,
        body:
            step?.attendeeExperience ??
            l10n.eventSuccessEventSuccessCompanionScreenStateBodyTheHostIsPacing,
        privacyLine: l10n
            .eventSuccessEventSuccessCompanionScreenStateVisiblecopyEveryoneSeesTheSame,
        icon: CatchIcons.location,
        badgeTone: CatchBadgeTone.brand,
        choreography: choreography,
        effectKind: EventSuccessLiveEffectKind.stepChange,
      ),
      EventSuccessAttendeeMomentKind.socialPrompt => EventSuccessMomentPresentation(
        badgeLabel:
            step?.stage.label ??
            l10n.eventSuccessEventSuccessCompanionScreenStateVisiblecopyLivePrompt,
        headline: l10n
            .eventSuccessEventSuccessCompanionScreenStateVisiblecopyAFreshPromptJust,
        body:
            step?.attendeeExperience ??
            l10n.eventSuccessEventSuccessCompanionScreenStateBodyUseItIfThe,
        privacyLine: l10n
            .eventSuccessEventSuccessCompanionScreenStateVisiblecopyPromptsAreSharedGuidance,
        icon: CatchIcons.chat,
        badgeTone: CatchBadgeTone.brand,
        choreography: choreography,
        effectKind: EventSuccessLiveEffectKind.stepChange,
      ),
      EventSuccessAttendeeMomentKind.conversationCues => EventSuccessMomentPresentation(
        badgeLabel:
            step?.stage.label ??
            l10n.eventSuccessEventSuccessCompanionScreenStateVisiblecopyConversationCues,
        headline: l10n
            .eventSuccessEventSuccessCompanionScreenStateVisiblecopyPickACueAnd,
        body:
            step?.attendeeExperience ??
            l10n.eventSuccessEventSuccessCompanionScreenStateBodyTheseAreLightNudges,
        privacyLine: l10n
            .eventSuccessEventSuccessCompanionScreenStateVisiblecopyConversationCuesAreSuggestions,
        icon: CatchIcons.conversations,
        badgeTone: CatchBadgeTone.brand,
        choreography: choreography,
        effectKind: EventSuccessLiveEffectKind.stepChange,
      ),
      EventSuccessAttendeeMomentKind.assignment => EventSuccessMomentPresentation(
        badgeLabel: l10n
            .eventSuccessEventSuccessCompanionScreenStateVisiblecopyYourNextGroup,
        headline: l10n
            .eventSuccessEventSuccessCompanionScreenStateVisiblecopyYourAssignmentIsReady,
        body: l10n.eventSuccessEventSuccessCompanionScreenStateBodyUseItAsA,
        privacyLine: l10n
            .eventSuccessEventSuccessCompanionScreenStateVisiblecopyOnlyYourOwnAssignment,
        icon: CatchIcons.people,
        badgeTone: CatchBadgeTone.success,
        choreography: choreography,
        effectKind: EventSuccessLiveEffectKind.stepChange,
      ),
      EventSuccessAttendeeMomentKind.liveReveal => EventSuccessMomentPresentation(
        badgeLabel: l10n
            .eventSuccessEventSuccessCompanionScreenStateVisiblecopySharedReveal,
        headline: _revealHeroHeadline(moment, plan),
        body: l10n
            .eventSuccessEventSuccessCompanionScreenStateBodyTheHostControlsThe,
        privacyLine: l10n
            .eventSuccessEventSuccessCompanionScreenStateVisiblecopyYourDetailsStayHidden,
        icon: CatchIcons.instant,
        badgeTone: CatchBadgeTone.brand,
        choreography: choreography,
        effectKind: _revealHeroEffect(plan),
        // Cinematic owns the soundscape during anticipation/climax; the bed
        // resumes from the next moment's vibe.
      ),
      EventSuccessAttendeeMomentKind.wingmanRequest => EventSuccessMomentPresentation(
        badgeLabel: l10n
            .eventSuccessEventSuccessCompanionScreenStateVisiblecopyHostHelp,
        headline: l10n
            .eventSuccessEventSuccessCompanionScreenStateVisiblecopyAskForOneSpecific,
        body: l10n
            .eventSuccessEventSuccessCompanionScreenStateBodyChooseSomeoneYouWant,
        privacyLine: l10n
            .eventSuccessEventSuccessCompanionScreenStateVisiblecopyOnlyTheHostSees,
        icon: CatchIcons.support,
        badgeTone: CatchBadgeTone.brand,
        choreography: choreography,
        effectKind: EventSuccessLiveEffectKind.stepChange,
      ),
      EventSuccessAttendeeMomentKind.postEvent => EventSuccessMomentPresentation(
        badgeLabel: l10n
            .eventSuccessEventSuccessCompanionScreenStateVisiblecopyAfterglow,
        headline: l10n
            .eventSuccessEventSuccessCompanionScreenStateVisiblecopyYourAfterglowIsReady,
        body: l10n
            .eventSuccessEventSuccessCompanionScreenStateBodyKeepTheUsefulParts,
        privacyLine: l10n
            .eventSuccessEventSuccessCompanionScreenStateVisiblecopyThisRecapIsPrivate,
        icon: CatchIcons.night,
        badgeTone: CatchBadgeTone.success,
        choreography: choreography,
        effectKind: EventSuccessLiveEffectKind.guideComplete,
      ),
      EventSuccessAttendeeMomentKind.none => EventSuccessMomentPresentation(
        badgeLabel: eventEnded
            ? l10n.eventSuccessEventSuccessCompanionScreenStateVisiblecopyWrapped
            : attended
            ? l10n.eventSuccessEventSuccessCompanionScreenStateVisiblecopyLiveNow
            : l10n.eventSuccessEventSuccessCompanionScreenStateVisiblecopyBooked,
        headline: _heroOrientationLine(
          event: event,
          attended: attended,
          showSelfCheckIn: showSelfCheckIn,
          eventEnded: eventEnded,
        ),
        body: l10n
            .eventSuccessEventSuccessCompanionScreenStateBodyTheHostIsRunning,
        privacyLine: l10n
            .eventSuccessEventSuccessCompanionScreenStateVisiblecopyCatchOnlyShowsThe,
        icon: CatchIcons.event,
        badgeTone: CatchBadgeTone.neutral,
        choreography: choreography,
        effectKind: attended ? EventSuccessLiveEffectKind.liveEntry : null,
        ambientBed: _eventSuccessAmbientBedForId(
          eventEnded
              ? choreography.ambientBedWhenEventEndedId ??
                    choreography.ambientBedId
              : choreography.ambientBedId,
        ),
      ),
    };
  }
}

EventSuccessAmbientBed _eventSuccessAmbientBedForId(String id) => switch (id) {
  'theatrical' => EventSuccessAmbientBed.theatrical,
  'pulse' => EventSuccessAmbientBed.pulse,
  'sunrise' => EventSuccessAmbientBed.sunrise,
  'silent' => EventSuccessAmbientBed.silent,
  _ => throw StateError('Unsupported Event Success ambient bed id: $id'),
};

String _revealHeroHeadline(
  EventSuccessAttendeeMoment moment,
  EventSuccessPlan plan,
) {
  if (plan.revealStatus == EventSuccessRevealStatus.revealed) {
    if (moment.assignmentModuleId ==
        EventSuccessModuleCatalog.guidedRotations.id) {
      return 'Your rotation just unlocked.';
    }
    return 'Your group just unlocked.';
  }
  if (moment.assignmentModuleId ==
      EventSuccessModuleCatalog.guidedRotations.id) {
    return 'A rotation reveal is in motion.';
  }
  return 'A group reveal is in motion.';
}

EventSuccessLiveEffectKind _revealHeroEffect(EventSuccessPlan plan) {
  if (plan.revealStatus == EventSuccessRevealStatus.revealed) {
    return EventSuccessLiveEffectKind.assignmentRevealed;
  }
  return EventSuccessLiveEffectKind.countdownStart;
}

String _heroOrientationLine({
  required Event event,
  required bool attended,
  required bool showSelfCheckIn,
  required bool eventEnded,
}) {
  if (attended && eventEnded) {
    return 'Thanks for coming. A quick feedback prompt is below.';
  }
  if (attended) {
    return 'You\'re in. Watch this screen for prompts and partner reveals.';
  }
  if (showSelfCheckIn) {
    return 'Glad you\'re coming. Check in when you arrive at ${event.locationName}.';
  }
  return 'Glad you\'re coming. We\'ll guide you here once check-in opens.';
}
