import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_activity_profile.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_configuration.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_operations.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations.dart';

EventRehearsalSetup eventRehearsalConfigurationSetup(
  AppLocalizations l10n,
  EventRehearsalConfiguration configuration,
) {
  final goal =
      (configuration.hostGoal ?? configuration.successDefaults.hostGoal).trim();
  final prompt = eventRehearsalConfigurationPrompt(l10n, configuration).trim();
  return EventRehearsalSetup(
    title: eventRehearsalConfigurationTitle(l10n, configuration).trim(),
    locationName: eventRehearsalConfigurationVenue(l10n, configuration).trim(),
    durationMinutes: configuration.effectiveDurationMinutes,
    hostGoal: goal,
    attendeePrompt: prompt,
    modules: configuration.selectedModules.toList(),
    unitOutcome: RehearsalOutcomeKind.values.byName(
      EventSuccessActivityProfile.forFormat(
        configuration.format,
      ).unitOutcome.name,
    ),
    eventFormat: configuration.format,
    successDefaults: configuration.configuredSuccessDefaults.copyWith(
      hostGoal: goal,
      attendeePrompt: prompt,
    ),
  );
}

String eventRehearsalConfigurationTitle(
  AppLocalizations l10n,
  EventRehearsalConfiguration configuration,
) =>
    configuration.title ??
    configuration.sourceEvent?.title ??
    l10n.hostRehearsalSampleTitle(
      activity: configuration.format.activityKind.label,
    );

String eventRehearsalConfigurationVenue(
  AppLocalizations l10n,
  EventRehearsalConfiguration configuration,
) =>
    configuration.locationName ??
    configuration.sourceEvent?.locationName ??
    l10n.hostRehearsalSampleVenue;

String eventRehearsalConfigurationPrompt(
  AppLocalizations l10n,
  EventRehearsalConfiguration configuration,
) =>
    configuration.attendeePrompt ??
    configuration.successDefaults.attendeePrompt ??
    l10n.hostRehearsalSamplePrompt;

String eventRehearsalConfigurationModuleLabel(
  AppLocalizations l10n,
  EventRehearsalModule module,
) => switch (module) {
  EventRehearsalModule.arrival => l10n.hostRehearsalModuleArrival,
  EventRehearsalModule.firstHello => l10n.hostRehearsalModuleFirstHello,
  EventRehearsalModule.pods => l10n.hostRehearsalModulePods,
  EventRehearsalModule.rotations => l10n.hostRehearsalModuleRotations,
  EventRehearsalModule.conversationCues => l10n.hostRehearsalModuleCues,
  EventRehearsalModule.reveal => l10n.hostRehearsalModuleReveal,
  EventRehearsalModule.afterglow => l10n.hostRehearsalModuleAfterglow,
  EventRehearsalModule.accountability => l10n.hostRehearsalModuleAccountability,
};

String eventRehearsalScenarioTitle(
  AppLocalizations l10n,
  EventRehearsalScenario scenario,
) => switch (scenario) {
  EventRehearsalScenario.smoothRun => l10n.hostEventRehearsalScenarioSmoothRun,
  EventRehearsalScenario.lateAndNoShow =>
    l10n.hostEventRehearsalScenarioLateAndNoShow,
  EventRehearsalScenario.earlyExitAndReturn =>
    l10n.hostEventRehearsalScenarioEarlyExitAndReturn,
  EventRehearsalScenario.rosterAndCapacity =>
    l10n.hostEventRehearsalScenarioRosterAndCapacity,
  EventRehearsalScenario.walkInAndAmbiguousClaim =>
    l10n.hostEventRehearsalScenarioWalkInAndAmbiguousClaim,
  EventRehearsalScenario.privacyAndKeepApart =>
    l10n.hostEventRehearsalScenarioPrivacyAndKeepApart,
  EventRehearsalScenario.lowConnectivity =>
    l10n.hostEventRehearsalScenarioLowConnectivity,
  EventRehearsalScenario.concurrentHosts =>
    l10n.hostEventRehearsalScenarioConcurrentHosts,
  EventRehearsalScenario.revealInterrupted =>
    l10n.hostEventRehearsalScenarioRevealInterrupted,
  EventRehearsalScenario.externalProfiles =>
    l10n.hostEventRehearsalScenarioExternalProfiles,
  EventRehearsalScenario.accountabilitySweep =>
    l10n.hostEventRehearsalScenarioAccountabilitySweep,
};

String eventRehearsalScenarioBody(
  AppLocalizations l10n,
  EventRehearsalScenario scenario,
) => switch (scenario) {
  EventRehearsalScenario.smoothRun =>
    l10n.hostEventRehearsalScenarioSmoothRunBody,
  EventRehearsalScenario.lateAndNoShow =>
    l10n.hostEventRehearsalScenarioLateAndNoShowBody,
  EventRehearsalScenario.earlyExitAndReturn =>
    l10n.hostEventRehearsalScenarioEarlyExitAndReturnBody,
  EventRehearsalScenario.rosterAndCapacity =>
    l10n.hostEventRehearsalScenarioRosterAndCapacityBody,
  EventRehearsalScenario.walkInAndAmbiguousClaim =>
    l10n.hostEventRehearsalScenarioWalkInAndAmbiguousClaimBody,
  EventRehearsalScenario.privacyAndKeepApart =>
    l10n.hostEventRehearsalScenarioPrivacyAndKeepApartBody,
  EventRehearsalScenario.lowConnectivity =>
    l10n.hostEventRehearsalScenarioLowConnectivityBody,
  EventRehearsalScenario.concurrentHosts =>
    l10n.hostEventRehearsalScenarioConcurrentHostsBody,
  EventRehearsalScenario.revealInterrupted =>
    l10n.hostEventRehearsalScenarioRevealInterruptedBody,
  EventRehearsalScenario.externalProfiles =>
    l10n.hostEventRehearsalScenarioExternalProfilesBody,
  EventRehearsalScenario.accountabilitySweep =>
    l10n.hostEventRehearsalScenarioAccountabilitySweepBody,
};

String eventRehearsalBehaviorLabel(
  AppLocalizations l10n,
  EventRehearsalBehavior behavior,
) => switch (behavior) {
  EventRehearsalBehavior.arrive => l10n.hostEventRehearsalBehaviorArrive,
  EventRehearsalBehavior.arriveLate =>
    l10n.hostEventRehearsalBehaviorArriveLate,
  EventRehearsalBehavior.markNoShow => l10n.hostEventRehearsalBehaviorNoShow,
  EventRehearsalBehavior.leaveEarly => l10n.hostEventRehearsalBehaviorLeaves,
  EventRehearsalBehavior.returnActor => l10n.hostEventRehearsalBehaviorReturns,
  EventRehearsalBehavior.walkIn => l10n.hostEventRehearsalBehaviorWalkIn,
  EventRehearsalBehavior.ambiguousClaim =>
    l10n.hostEventRehearsalBehaviorAmbiguous,
  EventRehearsalBehavior.resolveClaim => l10n.hostEventRehearsalBehaviorResolve,
  EventRehearsalBehavior.optOut => l10n.hostEventRehearsalBehaviorOptOut,
  EventRehearsalBehavior.optIn => l10n.hostEventRehearsalBehaviorOptIn,
  EventRehearsalBehavior.keepApart => l10n.hostEventRehearsalBehaviorKeepApart,
  EventRehearsalBehavior.disconnect =>
    l10n.hostEventRehearsalBehaviorDisconnect,
  EventRehearsalBehavior.reconnect => l10n.hostEventRehearsalBehaviorReconnect,
};

String eventRehearsalFaultLabel(
  AppLocalizations l10n,
  EventRehearsalFault fault,
) => switch (fault) {
  EventRehearsalFault.none => l10n.hostEventRehearsalFaultNone,
  EventRehearsalFault.latency => l10n.hostEventRehearsalFaultLatency,
  EventRehearsalFault.oneShotFailure => l10n.hostEventRehearsalFaultOneShot,
  EventRehearsalFault.listenerDisconnect =>
    l10n.hostEventRehearsalFaultDisconnect,
  EventRehearsalFault.staleRevision =>
    l10n.hostEventRehearsalFaultStaleRevision,
  EventRehearsalFault.duplicateDelivery =>
    l10n.hostEventRehearsalFaultDuplicate,
  EventRehearsalFault.legacyFixture => l10n.hostEventRehearsalFaultLegacy,
  EventRehearsalFault.reducedMotion =>
    l10n.hostEventRehearsalFaultReducedMotion,
  EventRehearsalFault.lowBandwidth => l10n.hostEventRehearsalFaultLowBandwidth,
};

String eventRehearsalActorStatusLabel(
  AppLocalizations l10n,
  EventRehearsalActorStatus status,
) => switch (status) {
  EventRehearsalActorStatus.expected => l10n.hostEventRehearsalStatusExpected,
  EventRehearsalActorStatus.present => l10n.hostEventRehearsalStatusPresent,
  EventRehearsalActorStatus.late => l10n.hostEventRehearsalStatusLate,
  EventRehearsalActorStatus.noShow => l10n.hostEventRehearsalStatusNoShow,
  EventRehearsalActorStatus.departed => l10n.hostEventRehearsalStatusDeparted,
  EventRehearsalActorStatus.returned => l10n.hostEventRehearsalStatusReturned,
  EventRehearsalActorStatus.disconnected =>
    l10n.hostEventRehearsalStatusDisconnected,
  EventRehearsalActorStatus.walkIn => l10n.hostEventRehearsalStatusWalkIn,
  EventRehearsalActorStatus.ambiguousClaim =>
    l10n.hostEventRehearsalStatusAmbiguous,
};

String eventRehearsalModuleLabel(
  AppLocalizations l10n,
  EventRehearsalModule module,
) => switch (module) {
  EventRehearsalModule.arrival => l10n.hostEventRehearsalModuleArrival,
  EventRehearsalModule.firstHello => l10n.hostEventRehearsalModuleFirstHello,
  EventRehearsalModule.pods => l10n.hostEventRehearsalModulePods,
  EventRehearsalModule.rotations => l10n.hostEventRehearsalModuleRotations,
  EventRehearsalModule.conversationCues => l10n.hostEventRehearsalModuleCues,
  EventRehearsalModule.reveal => l10n.hostEventRehearsalModuleReveal,
  EventRehearsalModule.afterglow => l10n.hostEventRehearsalModuleAfterglow,
  EventRehearsalModule.accountability =>
    l10n.hostEventRehearsalModuleAccountability,
};

String eventRehearsalActionNameLabel(AppLocalizations l10n, String name) {
  if (name.startsWith('fault:')) {
    final faultName = name.substring('fault:'.length);
    final fault = EventRehearsalFault.values
        .where((value) => value.name == faultName)
        .firstOrNull;
    return fault == null
        ? l10n.hostEventRehearsalActionUnknown
        : eventRehearsalFaultLabel(l10n, fault);
  }
  final behavior = EventRehearsalBehavior.values
      .where((value) => value.wireValue == name)
      .firstOrNull;
  if (behavior != null) return eventRehearsalBehaviorLabel(l10n, behavior);
  return switch (name) {
    'markReady' => l10n.hostEventRehearsalActionMarkReady,
    'start' => l10n.hostEventRehearsalStart,
    'pause' => l10n.hostEventRehearsalPause,
    'resume' => l10n.hostEventRehearsalResume,
    'advance' => l10n.hostEventRehearsalActionAdvance,
    'previous' => l10n.hostEventRehearsalActionPrevious,
    'advanceClock' => l10n.hostEventRehearsalActionAdvanceClock,
    'complete' => l10n.hostEventRehearsalComplete,
    'checkIn' => l10n.hostEventRehearsalActionCheckIn,
    'confirmArrival' => l10n.hostEventRehearsalActionConfirmArrival,
    'askForHelp' => l10n.hostEventRehearsalActionAskForHelp,
    'completePrompt' => l10n.hostEventRehearsalActionCompletePrompt,
    _ => l10n.hostEventRehearsalActionUnknown,
  };
}

String eventRehearsalActionKindLabel(AppLocalizations l10n, String kind) =>
    switch (kind) {
      'control' => l10n.hostEventRehearsalActionKindControl,
      'behavior' => l10n.hostEventRehearsalActionKindBehavior,
      'guest' => l10n.hostEventRehearsalActionKindGuest,
      'setup' => l10n.hostEventRehearsalActionKindSetup,
      'system' => l10n.hostEventRehearsalActionKindSystem,
      _ => l10n.hostEventRehearsalActionUnknown,
    };
