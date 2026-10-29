import 'package:catch_dating_app/core/schema_contracts/generated/event_assistance_kinds.g.dart';

enum EventAssistanceExecutionMode { live, rehearsal }

enum EventAssistanceCommandActor { automatic, host, guest }

enum EventAssistanceWorkflowImplementationStatus {
  external,
  complete,
  partial,
  unavailable,
}

final class EventAssistanceOperatingCapabilities {
  const EventAssistanceOperatingCapabilities({
    this.moving = false,
    this.movingSubgroups = false,
    this.groups = false,
    this.resources = false,
    this.rounds = false,
    this.independentUnits = false,
    this.outcomes = false,
    this.accountability = false,
    this.paid = false,
    this.requiredData = false,
    this.roles = false,
    this.admission = false,
    this.tracking = false,
  });

  final bool moving;
  final bool movingSubgroups;
  final bool groups;
  final bool resources;
  final bool rounds;
  final bool independentUnits;
  final bool outcomes;
  final bool accountability;
  final bool paid;
  final bool requiredData;
  final bool roles;
  final bool admission;
  final bool tracking;

  bool supports(EventAssistanceApplicability applicability) =>
      switch (applicability) {
        EventAssistanceApplicability.all => true,
        EventAssistanceApplicability.moving => moving,
        EventAssistanceApplicability.movingSubgroups =>
          moving && movingSubgroups,
        EventAssistanceApplicability.groupsOrResources => groups || resources,
        EventAssistanceApplicability.resources => resources,
        EventAssistanceApplicability.rounds => rounds,
        EventAssistanceApplicability.independentUnits => independentUnits,
        EventAssistanceApplicability.outcomes => outcomes,
        EventAssistanceApplicability.accountability => accountability,
        EventAssistanceApplicability.paid => paid,
        EventAssistanceApplicability.requiredData => requiredData,
        EventAssistanceApplicability.roles => roles,
        EventAssistanceApplicability.admission => admission,
        EventAssistanceApplicability.tracking => moving && tracking,
      };
}

final class EventAssistancePlannedCommand {
  const EventAssistancePlannedCommand({
    required this.kind,
    required this.actor,
    required this.binding,
  });

  final EventAssistanceCommandKind kind;
  final EventAssistanceCommandActor actor;
  final EventAssistanceModeBinding binding;
}

final class EventAssistanceWorkflowAction {
  const EventAssistanceWorkflowAction({
    required this.workflow,
    required this.implementationStatus,
    required this.commands,
  });

  final EventAssistanceWorkflowDescriptor workflow;
  final EventAssistanceWorkflowImplementationStatus implementationStatus;
  final List<EventAssistancePlannedCommand> commands;
}

/// Projects the closed workflow catalog for one Host surface and event mode.
List<EventAssistanceWorkflowAction> eventAssistanceActionPlan({
  required EventAssistanceHostSurface surface,
  required EventAssistanceExecutionMode mode,
  required EventAssistanceOperatingCapabilities capabilities,
}) => List<EventAssistanceWorkflowAction>.unmodifiable(
  eventAssistanceWorkflowCatalog
      .where(
        (workflow) =>
            workflow.hostProjection.surfaces.contains(surface) &&
            capabilities.supports(workflow.applicability),
      )
      .map((workflow) {
        final commands = <EventAssistancePlannedCommand>[
          for (final kind in workflow.automaticCommands)
            EventAssistancePlannedCommand(
              kind: kind,
              actor: EventAssistanceCommandActor.automatic,
              binding: _bindingFor(kind, mode),
            ),
          for (final kind in workflow.hostCommands)
            EventAssistancePlannedCommand(
              kind: kind,
              actor: EventAssistanceCommandActor.host,
              binding: _bindingFor(kind, mode),
            ),
          for (final kind in workflow.guestCommands)
            EventAssistancePlannedCommand(
              kind: kind,
              actor: EventAssistanceCommandActor.guest,
              binding: _bindingFor(kind, mode),
            ),
        ];
        return EventAssistanceWorkflowAction(
          workflow: workflow,
          implementationStatus: _implementationStatus(workflow, commands),
          commands: List<EventAssistancePlannedCommand>.unmodifiable(commands),
        );
      }),
);

EventAssistanceModeBinding _bindingFor(
  EventAssistanceCommandKind kind,
  EventAssistanceExecutionMode mode,
) => switch (mode) {
  EventAssistanceExecutionMode.live => kind.binding.live,
  EventAssistanceExecutionMode.rehearsal => kind.binding.rehearsal,
};

EventAssistanceWorkflowImplementationStatus _implementationStatus(
  EventAssistanceWorkflowDescriptor workflow,
  List<EventAssistancePlannedCommand> commands,
) {
  if (workflow.resolutionBoundary !=
      EventAssistanceResolutionBoundary.eventAssistanceCommand) {
    return EventAssistanceWorkflowImplementationStatus.external;
  }
  if (commands.every(
    (command) =>
        command.binding.coverage == EventAssistanceCommandCoverage.complete,
  )) {
    return EventAssistanceWorkflowImplementationStatus.complete;
  }
  if (commands.every(
    (command) =>
        command.binding.coverage == EventAssistanceCommandCoverage.none,
  )) {
    return EventAssistanceWorkflowImplementationStatus.unavailable;
  }
  return EventAssistanceWorkflowImplementationStatus.partial;
}
