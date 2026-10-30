import 'dart:math' as math;

import 'package:catch_dating_app/contexts/events/events.dart';
import 'package:catch_dating_app/contexts/formats/formats.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/contexts/organizers/organizers.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';

/// Editable practice configuration. Source objects are immutable; changing this
/// value never edits the organizer, event, plan, or production roster.
final class EventRehearsalConfiguration {
  const EventRehearsalConfiguration({
    required this.organizerDefaults,
    required this.format,
    required this.successDefaults,
    required this.actorCount,
    this.sourceEvent,
    this.sourcePlan,
    this.sourceGuestCount,
    this.sampleActivityKind,
    this.scenario = EventRehearsalScenario.smoothRun,
    this.useSimulatedGuests = true,
    this.customActorCount = false,
    this.savedSimulatedCount,
    this.title,
    this.locationName,
    this.durationMinutes,
    this.hostGoal,
    this.attendeePrompt,
    this.moduleOverrides = const {},
  });

  factory EventRehearsalConfiguration.defaults({
    required OrganizerHostDefaults organizerDefaults,
    Event? event,
    EventSuccessPlan? plan,
    int? sourceGuestCount,
    ActivityKind? activityKind,
    EventRehearsalScenario scenario = EventRehearsalScenario.smoothRun,
  }) {
    final format =
        event?.eventFormat ??
        EventFormatSnapshot.fromActivityKind(
          activityKind ?? organizerDefaults.primaryActivityKind,
        );
    final count =
        sourceGuestCount ??
        event?.signedUpCount ??
        recommendedGuestCount(format, scenario);
    final defaults = plan == null
        ? organizerDefaults.eventSuccessForFormat(
            format,
            targetAttendeeCount: count,
          )
        : EventSuccessDefaults.fromDraft(
            plan.hostDraft,
            attendeePrompt: plan.attendeePrompt,
          );
    return EventRehearsalConfiguration(
      organizerDefaults: organizerDefaults,
      sourceEvent: event,
      sourcePlan: plan,
      sourceGuestCount: event == null ? null : count,
      sampleActivityKind: event == null ? format.activityKind : null,
      format: format,
      successDefaults: defaults,
      actorCount: count,
      scenario: scenario,
      useSimulatedGuests: event == null,
    );
  }

  final OrganizerHostDefaults organizerDefaults;
  final Event? sourceEvent;
  final EventSuccessPlan? sourcePlan;
  final int? sourceGuestCount;
  final ActivityKind? sampleActivityKind;
  final EventFormatSnapshot format;
  final EventSuccessDefaults successDefaults;
  final EventRehearsalScenario scenario;
  final int actorCount;
  final bool useSimulatedGuests;
  final bool customActorCount;
  final int? savedSimulatedCount;
  final String? title;
  final String? locationName;
  final int? durationMinutes;
  final String? hostGoal;
  final String? attendeePrompt;
  final Map<EventRehearsalModule, bool> moduleOverrides;

  static int recommendedGuestCount(
    EventFormatSnapshot format,
    EventRehearsalScenario scenario,
  ) => math.max(
    scenario.defaultActorCount,
    EventSuccessPlaybookLibrary.recommendedFor(
      activityType: format.activityKind,
    ).capacity.min,
  );

  EventRehearsalConfiguration reset() => EventRehearsalConfiguration.defaults(
    organizerDefaults: organizerDefaults,
    event: sourceEvent,
    plan: sourcePlan,
    sourceGuestCount: sourceGuestCount,
    activityKind: sampleActivityKind,
    scenario: scenario,
  );

  int get effectiveDurationMinutes =>
      durationMinutes ??
      sourceEvent?.endTime.difference(sourceEvent!.startTime).inMinutes ??
      90;

  bool get hasValidDuration =>
      effectiveDurationMinutes >= 30 && effectiveDurationMinutes <= 360;

  bool get isCustom =>
      format !=
          (sourceEvent?.eventFormat ??
              EventFormatSnapshot.fromActivityKind(
                sampleActivityKind ?? organizerDefaults.primaryActivityKind,
              )) ||
      (sourceEvent != null && useSimulatedGuests) ||
      customActorCount ||
      title != null ||
      locationName != null ||
      durationMinutes != null ||
      hostGoal != null ||
      attendeePrompt != null ||
      moduleOverrides.isNotEmpty;

  EventRehearsalConfiguration changeScenario(EventRehearsalScenario value) =>
      copyWith(
        scenario: value,
        actorCount: useSimulatedGuests && !customActorCount
            ? recommendedGuestCount(format, value)
            : actorCount,
      );

  EventRehearsalConfiguration changeActivity(ActivityKind kind) {
    final nextFormat = EventFormatSnapshot.fromActivityKind(kind);
    final count = useSimulatedGuests && !customActorCount
        ? recommendedGuestCount(nextFormat, scenario)
        : actorCount;
    return copyWith(
      format: nextFormat,
      actorCount: count,
      successDefaults: organizerDefaults.eventSuccessForFormat(
        nextFormat,
        targetAttendeeCount: count,
      ),
    );
  }

  EventRehearsalConfiguration changeGuestSource(bool simulated) => copyWith(
    useSimulatedGuests: simulated,
    savedSimulatedCount: simulated ? savedSimulatedCount : actorCount,
    actorCount: simulated
        ? (savedSimulatedCount ??
              (customActorCount
                  ? actorCount
                  : math
                        .max(
                          2,
                          sourceGuestCount ??
                              sourceEvent?.signedUpCount ??
                              actorCount,
                        )
                        .clamp(2, 50)))
        : sourceGuestCount ?? sourceEvent!.signedUpCount,
  );

  Set<EventRehearsalModule> get selectedModules {
    final draft = successDefaults.toDraft(targetAttendeeCount: actorCount);
    final selected = draft.playbook.effectiveModuleSelection(
      {
        ...draft.selectedModuleIds,
        for (final entry in moduleOverrides.entries)
          if (entry.value && canConfigureModule(entry.key))
            eventRehearsalSuccessModuleId(entry.key),
      }.difference({
        for (final entry in moduleOverrides.entries)
          if (!entry.value && canConfigureModule(entry.key))
            eventRehearsalSuccessModuleId(entry.key),
      }),
    );
    return {
      for (final module in EventRehearsalModule.values)
        if (selected.contains(eventRehearsalSuccessModuleId(module))) module,
    };
  }

  Iterable<EventRehearsalModule> get availableModules =>
      EventRehearsalModule.values.where(
        (module) => successDefaults
            .toDraft(targetAttendeeCount: actorCount)
            .playbook
            .moduleIds
            .contains(eventRehearsalSuccessModuleId(module)),
      );

  bool canConfigureModule(EventRehearsalModule module) {
    final playbook = successDefaults
        .toDraft(targetAttendeeCount: actorCount)
        .playbook;
    final id = eventRehearsalSuccessModuleId(module);
    return playbook.moduleIds.contains(id) &&
        !playbook.nonConfigurableModuleIds.contains(id) &&
        EventSuccessActivityProfile.forFormat(
          format,
          targetAttendeeCount: actorCount,
        ).isSelectable(id);
  }

  EventSuccessDefaults get configuredSuccessDefaults {
    final mapped = EventRehearsalModule.values
        .map(eventRehearsalSuccessModuleId)
        .toSet();
    return successDefaults.copyWith(
      layoutId: null,
      moduleSelectionConfigured: true,
      selectedModuleIds: {
        ...successDefaults
            .toDraft(targetAttendeeCount: actorCount)
            .selectedModuleIds
            .difference(mapped),
        ...selectedModules.map(eventRehearsalSuccessModuleId),
      }.toList()..sort(),
    );
  }

  EventRehearsalConfiguration copyWith({
    EventFormatSnapshot? format,
    EventSuccessDefaults? successDefaults,
    EventRehearsalScenario? scenario,
    int? actorCount,
    bool? useSimulatedGuests,
    bool? customActorCount,
    int? savedSimulatedCount,
    String? title,
    String? locationName,
    int? durationMinutes,
    String? hostGoal,
    String? attendeePrompt,
    Map<EventRehearsalModule, bool>? moduleOverrides,
  }) => EventRehearsalConfiguration(
    organizerDefaults: organizerDefaults,
    sourceEvent: sourceEvent,
    sourcePlan: sourcePlan,
    sourceGuestCount: sourceGuestCount,
    sampleActivityKind: sampleActivityKind,
    format: format ?? this.format,
    successDefaults: successDefaults ?? this.successDefaults,
    scenario: scenario ?? this.scenario,
    actorCount: actorCount ?? this.actorCount,
    useSimulatedGuests: useSimulatedGuests ?? this.useSimulatedGuests,
    customActorCount: customActorCount ?? this.customActorCount,
    savedSimulatedCount: savedSimulatedCount ?? this.savedSimulatedCount,
    title: title ?? this.title,
    locationName: locationName ?? this.locationName,
    durationMinutes: durationMinutes ?? this.durationMinutes,
    hostGoal: hostGoal ?? this.hostGoal,
    attendeePrompt: attendeePrompt ?? this.attendeePrompt,
    moduleOverrides: Map.unmodifiable(moduleOverrides ?? this.moduleOverrides),
  );
}

String eventRehearsalSuccessModuleId(EventRehearsalModule module) =>
    switch (module) {
      EventRehearsalModule.arrival => EventSuccessModuleCatalog.checkIn.id,
      EventRehearsalModule.firstHello =>
        EventSuccessModuleCatalog.firstHelloCheckIn.id,
      EventRehearsalModule.pods => EventSuccessModuleCatalog.microPods.id,
      EventRehearsalModule.rotations =>
        EventSuccessModuleCatalog.guidedRotations.id,
      EventRehearsalModule.conversationCues =>
        EventSuccessModuleCatalog.socialMissions.id,
      EventRehearsalModule.reveal => EventSuccessModuleCatalog.liveReveal.id,
      EventRehearsalModule.afterglow =>
        EventSuccessModuleCatalog.hostAnalytics.id,
      EventRehearsalModule.accountability =>
        EventSuccessModuleCatalog.safetyControls.id,
    };
