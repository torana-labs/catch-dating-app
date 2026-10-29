import 'package:catch_dating_app/contexts/live/domain/event_assistance_action_plan.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/event_assistance_kinds.g.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('composes moving and resource workflows from capability facts', () {
    final runClub = eventAssistanceActionPlan(
      surface: EventAssistanceHostSurface.liveNow,
      mode: EventAssistanceExecutionMode.live,
      capabilities: const EventAssistanceOperatingCapabilities(
        moving: true,
        movingSubgroups: true,
        groups: true,
        independentUnits: true,
        outcomes: true,
        accountability: true,
        roles: true,
        tracking: true,
      ),
    );
    final runKinds = runClub.map((action) => action.workflow.kind).toSet();
    expect(runKinds, contains(EventAssistanceWorkflowKind.departure));
    expect(runKinds, contains(EventAssistanceWorkflowKind.checkpoint));
    expect(runKinds, contains(EventAssistanceWorkflowKind.routeRecovery));
    expect(runKinds, contains(EventAssistanceWorkflowKind.locationFreshness));
    expect(
      runKinds,
      isNot(contains(EventAssistanceWorkflowKind.resourceRecovery)),
    );

    final courtSocial = eventAssistanceActionPlan(
      surface: EventAssistanceHostSurface.liveRoom,
      mode: EventAssistanceExecutionMode.live,
      capabilities: const EventAssistanceOperatingCapabilities(
        groups: true,
        resources: true,
        rounds: true,
        independentUnits: true,
        outcomes: true,
        requiredData: true,
      ),
    );
    final courtKinds = courtSocial
        .map((action) => action.workflow.kind)
        .toSet();
    expect(courtKinds, contains(EventAssistanceWorkflowKind.allocationRepair));
    expect(
      courtKinds,
      contains(EventAssistanceWorkflowKind.placementConfirmation),
    );
    expect(courtKinds, contains(EventAssistanceWorkflowKind.resourceRecovery));
    expect(courtKinds, contains(EventAssistanceWorkflowKind.unitProgress));
    expect(
      courtKinds,
      isNot(contains(EventAssistanceWorkflowKind.routeRecovery)),
    );
  });

  test('keeps implementation gaps visible on Today', () {
    final today = eventAssistanceActionPlan(
      surface: EventAssistanceHostSurface.today,
      mode: EventAssistanceExecutionMode.live,
      capabilities: const EventAssistanceOperatingCapabilities(
        moving: true,
        paid: true,
        requiredData: true,
        admission: true,
      ),
    );
    final byKind = {for (final action in today) action.workflow.kind: action};

    expect(
      byKind[EventAssistanceWorkflowKind.venueReadiness]?.implementationStatus,
      EventAssistanceWorkflowImplementationStatus.external,
    );
    expect(
      byKind[EventAssistanceWorkflowKind.rosterReadiness]?.implementationStatus,
      EventAssistanceWorkflowImplementationStatus.complete,
    );
    expect(
      byKind[EventAssistanceWorkflowKind.requiredGuestData]
          ?.implementationStatus,
      EventAssistanceWorkflowImplementationStatus.partial,
    );
    final override = byKind[EventAssistanceWorkflowKind.requiredGuestData]
        ?.commands
        .singleWhere(
          (command) => command.kind == EventAssistanceCommandKind.applyOverride,
        );
    expect(
      override?.binding.missingCapability,
      EventAssistanceMissingCapability.liveScopedRuleOverride,
    );
    expect(
      byKind[EventAssistanceWorkflowKind.financialReconciliation]
          ?.implementationStatus,
      EventAssistanceWorkflowImplementationStatus.unavailable,
    );

    final requiredData = byKind[EventAssistanceWorkflowKind.requiredGuestData]
        ?.commands
        .singleWhere(
          (command) =>
              command.kind == EventAssistanceCommandKind.requestRequiredData,
        );
    expect(requiredData?.actor, EventAssistanceCommandActor.automatic);
    expect(
      requiredData?.binding.coverage,
      EventAssistanceCommandCoverage.complete,
    );
    expect(requiredData?.binding.missingCapability, isNull);
  });

  test('projects complete plan-change coverage in both modes', () {
    EventAssistanceWorkflowAction planChange(
      EventAssistanceExecutionMode mode,
    ) =>
        eventAssistanceActionPlan(
          surface: EventAssistanceHostSurface.liveNow,
          mode: mode,
          capabilities: const EventAssistanceOperatingCapabilities(),
        ).singleWhere(
          (action) =>
              action.workflow.kind ==
              EventAssistanceWorkflowKind.planChangeCommunication,
        );

    expect(
      planChange(EventAssistanceExecutionMode.live).implementationStatus,
      EventAssistanceWorkflowImplementationStatus.complete,
    );
    expect(
      planChange(EventAssistanceExecutionMode.rehearsal).implementationStatus,
      EventAssistanceWorkflowImplementationStatus.complete,
    );
  });

  test('returns immutable action and command lists', () {
    final plan = eventAssistanceActionPlan(
      surface: EventAssistanceHostSurface.today,
      mode: EventAssistanceExecutionMode.live,
      capabilities: const EventAssistanceOperatingCapabilities(),
    );
    expect(() => plan.clear(), throwsUnsupportedError);
    final roster = plan.singleWhere(
      (action) =>
          action.workflow.kind == EventAssistanceWorkflowKind.rosterReadiness,
    );
    expect(() => roster.commands.clear(), throwsUnsupportedError);
  });
}
