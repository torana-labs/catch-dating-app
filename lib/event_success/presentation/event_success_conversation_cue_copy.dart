import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_activity_profile.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_models.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_conversation_cue.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/event_success_moment_presentations.g.dart';

extension EventSuccessConversationCueMomentCopy
    on EventSuccessConversationCueMoment {
  String label(AppLocalizations l10n) => switch (this) {
    EventSuccessConversationCueMoment.live =>
      l10n.eventSuccessEventSuccessConversationCueCopyLabelLivePrompt,
    EventSuccessConversationCueMoment.postEvent =>
      l10n.eventSuccessEventSuccessConversationCueCopyLabelPostMatchOpener,
  };
}

abstract final class EventSuccessConversationCueLibrary {
  static List<EventSuccessConversationCue> liveCuesFor({
    required Event event,
    required EventSuccessPlan plan,
    required AppLocalizations l10n,
    EventRunOfShowStep? activeStep,
  }) {
    final profile = EventSuccessActivityProfile.forFormat(event.eventFormat);
    final prompt = eventSuccessSocialMissionPromptFor(
      interactionModel: profile.interactionModel.name,
      activeStepIndex: plan.activeStepIndex,
    );
    final disclosureLevel = _disclosureLevel(prompt.disclosureLevel);
    return _dedupe([
      if (activeStep != null)
        EventSuccessConversationCue(
          title: activeStep.title,
          body: activeStep.attendeeExperience,
          contextLabel: activeStep.stage.label,
          moment: EventSuccessConversationCueMoment.live,
          disclosureLevel: disclosureLevel,
        ),
      _socialMissionCue(prompt, l10n),
    ]);
  }

  static List<EventSuccessConversationCue> postEventOpenersFor(
    Event event, {
    required AppLocalizations l10n,
  }) {
    final profile = EventSuccessActivityProfile.forFormat(event.eventFormat);
    return _dedupe([
      _interactionOpener(profile.interactionModel, l10n),
      EventSuccessConversationCue(
        title: l10n.eventSuccessEventSuccessConversationCueCopyTitleSharedRoom,
        body: l10n.eventSuccessEventSuccessConversationCueCopyBodyIAmGladWe(
          label: event.eventFormat.label,
        ),
        contextLabel: event.eventFormat.label,
        moment: EventSuccessConversationCueMoment.postEvent,
      ),
      EventSuccessConversationCue(
        title:
            l10n.eventSuccessEventSuccessConversationCueCopyTitleEasyFollowUp,
        body: l10n
            .eventSuccessEventSuccessConversationCueCopyBodyWhatWasYourFavorite,
        contextLabel: l10n
            .eventSuccessEventSuccessConversationCueCopyVisiblecopyLowPressure,
        moment: EventSuccessConversationCueMoment.postEvent,
      ),
    ]);
  }

  static List<EventSuccessConversationCue> _dedupe(
    List<EventSuccessConversationCue> cues,
  ) {
    final seen = <String>{};
    final values = <EventSuccessConversationCue>[];
    for (final cue in cues) {
      final key = '${cue.title}|${cue.body}';
      if (seen.add(key)) values.add(cue);
    }
    return List.unmodifiable(values);
  }

  static EventSuccessConversationCue _socialMissionCue(
    EventSuccessSocialMissionPromptContract prompt,
    AppLocalizations l10n,
  ) {
    final level = _disclosureLevel(prompt.disclosureLevel);
    final title = switch (level) {
      EventSuccessDisclosureLevel.light =>
        l10n.eventSuccessSocialMissionTitleLight,
      EventSuccessDisclosureLevel.personal =>
        l10n.eventSuccessSocialMissionTitlePersonal,
      EventSuccessDisclosureLevel.reflective =>
        l10n.eventSuccessSocialMissionTitleReflective,
    };
    final contextLabel = switch (level) {
      EventSuccessDisclosureLevel.light =>
        l10n.eventSuccessSocialMissionLevelLight,
      EventSuccessDisclosureLevel.personal =>
        l10n.eventSuccessSocialMissionLevelPersonal,
      EventSuccessDisclosureLevel.reflective =>
        l10n.eventSuccessSocialMissionLevelReflective,
    };
    final body = switch (prompt.promptId) {
      'pacePods.light' =>
        l10n.eventSuccessEventSuccessConversationCueCopyBodyAskSomeoneWhatRoute,
      'pairedRotations.light' =>
        l10n.eventSuccessEventSuccessConversationCueCopyBodyAskYourNextPartner,
      'teamRotations.light' =>
        l10n.eventSuccessEventSuccessConversationCueCopyBodyAskWhichRoundThey,
      'seatedTable.light' =>
        l10n.eventSuccessEventSuccessConversationCueCopyBodyAskWhatDishThey,
      'freeFormMixer.light' =>
        l10n.eventSuccessEventSuccessConversationCueCopyBodyAskWhatAnswerFrom,
      'hostLedProgram.light' || 'openFormat.light' =>
        l10n.eventSuccessEventSuccessConversationCueCopyBodyAskWhatMadeThem,
      'shared.personal' => l10n.eventSuccessSocialMissionBodyPersonal,
      'shared.reflective' => l10n.eventSuccessSocialMissionBodyReflective,
      _ => throw StateError('Unsupported social mission: ${prompt.promptId}'),
    };
    return EventSuccessConversationCue(
      title: title,
      body: body,
      contextLabel: contextLabel,
      moment: EventSuccessConversationCueMoment.live,
      disclosureLevel: level,
    );
  }

  static EventSuccessConversationCue _interactionOpener(
    EventInteractionModel interactionModel,
    AppLocalizations l10n,
  ) {
    final body = switch (interactionModel) {
      EventInteractionModel.pacePods =>
        l10n.eventSuccessEventSuccessConversationCueCopyBodyILikedTalkingOn,
      EventInteractionModel.pairedRotations =>
        l10n.eventSuccessEventSuccessConversationCueCopyBodyGoodGameTodayI,
      EventInteractionModel.teamRotations =>
        l10n.eventSuccessEventSuccessConversationCueCopyBodyILikedBeingOn,
      EventInteractionModel.seatedTable =>
        l10n.eventSuccessEventSuccessConversationCueCopyBodyILikedMeetingYou,
      EventInteractionModel.freeFormMixer =>
        l10n.eventSuccessEventSuccessConversationCueCopyBodyILikedOurConversation,
      EventInteractionModel.hostLedProgram ||
      EventInteractionModel.openFormat =>
        l10n.eventSuccessEventSuccessConversationCueCopyBodyILikedMeetingYou957a50,
    };
    return EventSuccessConversationCue(
      title: l10n
          .eventSuccessEventSuccessConversationCueCopyTitleUseTheSharedMoment,
      body: body,
      contextLabel: interactionModel.label,
      moment: EventSuccessConversationCueMoment.postEvent,
    );
  }

  static EventSuccessDisclosureLevel _disclosureLevel(String value) =>
      switch (value) {
        'light' => EventSuccessDisclosureLevel.light,
        'personal' => EventSuccessDisclosureLevel.personal,
        'reflective' => EventSuccessDisclosureLevel.reflective,
        _ => throw StateError('Unsupported disclosure level: $value'),
      };
}
