import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/event_rehearsal/domain/event_rehearsal.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_copy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventRehearsalSimulatorBody extends StatefulWidget {
  const EventRehearsalSimulatorBody({
    super.key,
    required this.rehearsal,
    required this.isLoading,
    required this.onBehavior,
    required this.onFault,
  });

  final EventRehearsalBootstrap rehearsal;
  final bool isLoading;
  final void Function(String actorId, EventRehearsalBehavior behavior)
  onBehavior;
  final ValueChanged<EventRehearsalFault> onFault;

  @override
  State<EventRehearsalSimulatorBody> createState() =>
      _EventRehearsalSimulatorBodyState();
}

class _EventRehearsalSimulatorBodyState
    extends State<EventRehearsalSimulatorBody> {
  String? _actorId;
  EventRehearsalBehavior _behavior = EventRehearsalBehavior.arriveLate;

  @override
  void didUpdateWidget(covariant EventRehearsalSimulatorBody oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!widget.rehearsal.actors.any((actor) => actor.actorId == _actorId)) {
      _actorId = null;
    }
  }

  @override
  Widget build(BuildContext context) {
    final selectedActorId =
        _actorId ?? widget.rehearsal.actors.firstOrNull?.actorId;
    final canSimulate =
        widget.rehearsal.session.status == EventRehearsalStatus.running ||
        widget.rehearsal.session.status == EventRehearsalStatus.paused;
    final canChooseFault =
        widget.rehearsal.session.status != EventRehearsalStatus.complete &&
        widget.rehearsal.session.status != EventRehearsalStatus.expired;
    final canEdit = canSimulate && !widget.isLoading;
    final faultEnabled = canChooseFault && !widget.isLoading;
    return Column(
      children: [
        CatchSection.fieldRows(
          title: context.l10n.hostEventRehearsalSimulationTitle,
          children: [
            CatchField.control(
              copy: catchFieldCopy(context.l10n),
              title: context.l10n.hostEventRehearsalSimulationTitle,
              body: canSimulate
                  ? context.l10n.hostEventRehearsalSimulationBody
                  : context.l10n.hostEventRehearsalSimulationUnavailable,
              icon: CatchIcons.scienceOutlined,
              contractExemption:
                  'Synthetic behaviors are callable-owned rehearsal commands.',
              disclosureMode: CatchFieldMode.localExpanded,
              child: CatchFieldLanes.divided(
                children: [
                  CatchMenu<String>.anchored(
                    items: [
                      for (final actor in widget.rehearsal.actors)
                        CatchMenuItem<String>(
                          value: actor.actorId,
                          label: actor.displayName,
                          sublabel: eventRehearsalActorStatusLabel(
                            context.l10n,
                            actor.status,
                          ),
                          selected: actor.actorId == selectedActorId,
                          variant: CatchMenuItemVariant.choice,
                        ),
                    ],
                    onSelected: (actorId, _) =>
                        setState(() => _actorId = actorId),
                    builder: (context, controller, _) => CatchFieldLanes.single(
                      child: CatchField.nav(
                        copy: catchFieldCopy(context.l10n),
                        title: context.l10n.hostEventRehearsalChooseGuest,
                        valueText: widget.rehearsal.actors
                            .where((actor) => actor.actorId == selectedActorId)
                            .firstOrNull
                            ?.displayName,
                        onTap: !canEdit
                            ? null
                            : controller.isOpen
                            ? controller.close
                            : controller.open,
                      ),
                    ),
                  ),
                  CatchMenu<EventRehearsalBehavior>.anchored(
                    items: [
                      for (final behavior in EventRehearsalBehavior.values)
                        CatchMenuItem<EventRehearsalBehavior>(
                          value: behavior,
                          label: eventRehearsalBehaviorLabel(
                            context.l10n,
                            behavior,
                          ),
                          selected: behavior == _behavior,
                          variant: CatchMenuItemVariant.choice,
                        ),
                    ],
                    onSelected: (behavior, _) =>
                        setState(() => _behavior = behavior),
                    builder: (context, controller, _) => CatchFieldLanes.single(
                      child: CatchField.nav(
                        copy: catchFieldCopy(context.l10n),
                        title: context.l10n.hostEventRehearsalChooseIssue,
                        valueText: eventRehearsalBehaviorLabel(
                          context.l10n,
                          _behavior,
                        ),
                        onTap: !canEdit
                            ? null
                            : controller.isOpen
                            ? controller.close
                            : controller.open,
                      ),
                    ),
                  ),
                  CatchFieldLanes.single(
                    child: CatchField.action(
                      copy: catchFieldCopy(context.l10n),
                      title: context.l10n.hostEventRehearsalApplyIssue,
                      icon: CatchIcons.playArrowRounded,
                      onTap: canEdit && selectedActorId != null
                          ? () => widget.onBehavior(selectedActorId, _behavior)
                          : null,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        if (widget.rehearsal.canUseInternalFaults) ...[
          gapH20,
          CatchSection.fieldRows(
            title: context.l10n.hostEventRehearsalQaFaultsTitle,
            children: [
              CatchField.control(
                copy: catchFieldCopy(context.l10n),
                title: context.l10n.hostEventRehearsalQaFaultsTitle,
                body: context.l10n.hostEventRehearsalQaFaultsBody,
                icon: CatchIcons.scienceOutlined,
                contractExemption:
                    'Internal-only fault state is callable-owned and isolated.',
                child: CatchMenu<EventRehearsalFault>.anchored(
                  items: [
                    for (final fault in EventRehearsalFault.values)
                      CatchMenuItem<EventRehearsalFault>(
                        value: fault,
                        label: eventRehearsalFaultLabel(context.l10n, fault),
                        selected: fault == widget.rehearsal.session.fault,
                        variant: CatchMenuItemVariant.choice,
                      ),
                  ],
                  onSelected: (fault, _) => widget.onFault(fault),
                  builder: (context, controller, _) => CatchFieldLanes.single(
                    child: CatchField.nav(
                      copy: catchFieldCopy(context.l10n),
                      title: context.l10n.hostEventRehearsalChooseFault,
                      valueText: eventRehearsalFaultLabel(
                        context.l10n,
                        widget.rehearsal.session.fault,
                      ),
                      onTap: !faultEnabled
                          ? null
                          : controller.isOpen
                          ? controller.close
                          : controller.open,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }
}

class EventRehearsalRosterSection extends StatelessWidget {
  const EventRehearsalRosterSection({super.key, required this.rehearsal});

  final EventRehearsalBootstrap rehearsal;

  @override
  Widget build(BuildContext context) => CatchSection.fieldRows(
    title: context.l10n.hostEventRehearsalRosterTitle,
    children: [
      CatchField.read(
        copy: catchFieldCopy(context.l10n),
        title: context.l10n.hostEventRehearsalRoomSummary(
          present: rehearsal.presentCount,
          total: rehearsal.actors.length,
          unresolved: rehearsal.unresolvedCount,
        ),
        body: eventRehearsalScenarioTitle(
          context.l10n,
          rehearsal.session.scenario,
        ),
        icon: CatchIcons.groupsOutlined,
      ),
      for (final actor in rehearsal.actors)
        CatchFieldLanes.single(
          child: CatchField.read(
            copy: catchFieldCopy(context.l10n),
            title: actor.displayName,
            body: [
              eventRehearsalActorStatusLabel(context.l10n, actor.status),
              if (actor.optedOut) context.l10n.hostEventRehearsalBehaviorOptOut,
              if (actor.helpRequested)
                context.l10n.hostEventRehearsalSignalHelp,
              if (actor.promptCompleted)
                context.l10n.hostEventRehearsalSignalPromptComplete,
            ].join(' · '),
          ),
        ),
    ],
  );
}

class EventRehearsalRecapSection extends StatelessWidget {
  const EventRehearsalRecapSection({
    super.key,
    required this.rehearsal,
    required this.isLoading,
    required this.onReset,
    required this.onFork,
    required this.onExport,
  });

  final EventRehearsalBootstrap rehearsal;
  final bool isLoading;
  final VoidCallback onReset;
  final VoidCallback onFork;
  final VoidCallback onExport;

  @override
  Widget build(BuildContext context) => CatchSection.fieldRows(
    title: context.l10n.hostEventRehearsalRecapTitle,
    children: [
      CatchField.control(
        copy: catchFieldCopy(context.l10n),
        title: context.l10n.hostEventRehearsalRecapTitle,
        body: context.l10n.hostEventRehearsalRecapBody(
          actions: rehearsal.session.actionCount,
          seed: rehearsal.session.seed,
          revision: rehearsal.session.runtimeRevision,
        ),
        icon: CatchIcons.factCheckOutlined,
        contractExemption:
            'Recap and deterministic reproduction are rehearsal projections.',
        disclosureMode:
            rehearsal.session.status == EventRehearsalStatus.complete
            ? CatchFieldMode.localExpanded
            : CatchFieldMode.localCollapsed,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Wrap(
              spacing: CatchSpacing.s2,
              runSpacing: CatchSpacing.s2,
              children: [
                CatchButton(
                  label: context.l10n.hostEventRehearsalReset,
                  size: CatchButtonSize.md,
                  variant: CatchButtonVariant.secondary,
                  onPressed: isLoading ? null : onReset,
                ),
                CatchButton(
                  label: context.l10n.hostEventRehearsalFork,
                  size: CatchButtonSize.md,
                  variant: CatchButtonVariant.secondary,
                  onPressed: isLoading ? null : onFork,
                ),
                CatchButton(
                  label: context.l10n.hostEventRehearsalExport,
                  size: CatchButtonSize.md,
                  variant: CatchButtonVariant.quiet,
                  onPressed: isLoading ? null : onExport,
                ),
              ],
            ),
          ],
        ),
      ),
      if (rehearsal.actions.isNotEmpty)
        CatchSection.fieldRows(
          title: context.l10n.hostEventRehearsalRecentActions,
          children: [
            for (final action in rehearsal.actions.reversed.take(8))
              CatchField.read(
                copy: catchFieldCopy(context.l10n),
                title: eventRehearsalActionNameLabel(context.l10n, action.name),
                body: context.l10n.hostEventRehearsalActionRevision(
                  kind: eventRehearsalActionKindLabel(
                    context.l10n,
                    action.kind,
                  ),
                  revision: action.runtimeRevision,
                ),
              ),
          ],
        ),
    ],
  );
}
