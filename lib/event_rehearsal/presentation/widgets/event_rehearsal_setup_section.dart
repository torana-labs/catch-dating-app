import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_copy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class EventRehearsalSetupSection extends StatefulWidget {
  const EventRehearsalSetupSection({
    super.key,
    required this.session,
    required this.isLoading,
    required this.onSave,
  });

  final EventRehearsalSession session;
  final bool isLoading;
  final void Function(
    EventRehearsalSetup setup,
    EventRehearsalScenario scenario,
    int actorCount,
  )
  onSave;

  @override
  State<EventRehearsalSetupSection> createState() =>
      _EventRehearsalSetupSectionState();
}

class _EventRehearsalSetupSectionState
    extends State<EventRehearsalSetupSection> {
  late final TextEditingController _title;
  late final TextEditingController _location;
  late final TextEditingController _duration;
  late final TextEditingController _hostGoal;
  late final TextEditingController _attendeePrompt;
  late EventRehearsalScenario _scenario;
  late int _actorCount;
  late Set<EventRehearsalModule> _modules;
  bool _open = false;

  @override
  void initState() {
    super.initState();
    _title = TextEditingController();
    _location = TextEditingController();
    _duration = TextEditingController();
    _hostGoal = TextEditingController();
    _attendeePrompt = TextEditingController();
    _loadSession();
  }

  @override
  void didUpdateWidget(covariant EventRehearsalSetupSection oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!_open &&
        oldWidget.session.setupRevision != widget.session.setupRevision) {
      _loadSession();
    }
  }

  @override
  void dispose() {
    _title.dispose();
    _location.dispose();
    _duration.dispose();
    _hostGoal.dispose();
    _attendeePrompt.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final editable = widget.session.canEditSetup;
    return CatchSection.fieldRows(
      title: context.l10n.hostEventRehearsalSetupTitle,
      children: [
        CatchField.control(
          copy: catchFieldCopy(context.l10n),
          title: widget.session.setup.title,
          body: editable
              ? eventRehearsalScenarioTitle(
                  context.l10n,
                  widget.session.scenario,
                )
              : context.l10n.hostEventRehearsalSetupFrozen,
          contractExemption:
              'Rehearsal setup is submitted as one callable-owned snapshot.',
          disclosureMode: _open
              ? CatchFieldMode.controlledExpanded
              : CatchFieldMode.controlledCollapsed,
          states: <WidgetState>{if (!editable) WidgetState.disabled},
          status: widget.isLoading
              ? CatchFieldStatus.saving
              : CatchFieldStatus.idle,
          onOpenChanged: editable
              ? (open) => setState(() => _open = open)
              : null,
          onCancel: _cancel,
          onSubmit: _valid ? _save : null,
          child: CatchFieldLanes.divided(
            children: [
              _EventRehearsalSetupInput(
                title: context.l10n.hostEventRehearsalFieldTitle,
                contract: CatchContractConstraints
                    .updateEventRehearsalSetupCallablePayloadSetupTitle,
                controller: _title,
                textCapitalization: TextCapitalization.sentences,
                onChanged: (_) => setState(() {}),
              ),
              _EventRehearsalSetupInput(
                title: context.l10n.hostEventRehearsalFieldLocation,
                contract: CatchContractConstraints
                    .updateEventRehearsalSetupCallablePayloadSetupLocationName,
                controller: _location,
                textCapitalization: TextCapitalization.words,
                onChanged: (_) => setState(() {}),
              ),
              _EventRehearsalSetupInput(
                title: context.l10n.hostEventRehearsalDuration,
                contract: CatchContractConstraints
                    .updateEventRehearsalSetupCallablePayloadSetupDurationMinutes,
                controller: _duration,
                keyboardType: TextInputType.number,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                onChanged: (_) => setState(() {}),
              ),
              _EventRehearsalSetupInput(
                title: context.l10n.hostEventRehearsalFieldGoal,
                contract: CatchContractConstraints
                    .updateEventRehearsalSetupCallablePayloadSetupHostGoal,
                controller: _hostGoal,
                maxLines: 3,
                textCapitalization: TextCapitalization.sentences,
                onChanged: (_) => setState(() {}),
              ),
              _EventRehearsalSetupInput(
                title: context.l10n.hostEventRehearsalFieldPrompt,
                contract: CatchContractConstraints
                    .updateEventRehearsalSetupCallablePayloadSetupAttendeePrompt,
                controller: _attendeePrompt,
                maxLines: 3,
                textCapitalization: TextCapitalization.sentences,
                onChanged: (_) => setState(() {}),
              ),
              _EventRehearsalScenarioPicker(
                selected: _scenario,
                onSelected: (scenario) => setState(() => _scenario = scenario),
              ),
              _EventRehearsalActorCountPicker(
                selected: _actorCount,
                onSelected: (count) => setState(() => _actorCount = count),
              ),
              CatchField<EventRehearsalModule>.choices(
                copy: catchFieldCopy(context.l10n),
                title: context.l10n.hostEventRehearsalModules,
                contract: CatchContractConstraints
                    .updateEventRehearsalSetupCallablePayloadSetupModuleIds,
                contractValueBuilder: (module) => module.name,
                values: EventRehearsalModule.values,
                itemLabelBuilder: (module) =>
                    eventRehearsalModuleLabel(context.l10n, module),
                selected: _modules,
                mode: CatchChipMode.multiple,
                disclosureMode: CatchFieldMode.localExpanded,
                onSelectionChanged: (selection) =>
                    setState(() => _modules = selection),
              ),
            ],
          ),
        ),
        if (widget.session.setup.movementSimulation case final movement?)
          CatchField.read(
            copy: catchFieldCopy(context.l10n),
            title: context.l10n.hostEventRehearsalMovementTitle,
            body: context.l10n.hostEventRehearsalMovementSummary(
              itineraryCount: movement.itinerary.length,
              routePointCount: movement.routePlan?.path.length ?? 0,
              positionCount: movement.livePositions.length,
            ),
            valueText: movement.lateArrivalGuidance,
            icon: CatchIcons.route,
          ),
      ],
    );
  }

  bool get _valid {
    final duration = int.tryParse(_duration.text);
    return _title.text.trim().isNotEmpty &&
        _location.text.trim().isNotEmpty &&
        _hostGoal.text.trim().isNotEmpty &&
        _attendeePrompt.text.trim().isNotEmpty &&
        duration != null &&
        duration >= 30 &&
        duration <= 360 &&
        _modules.isNotEmpty;
  }

  void _loadSession() {
    final session = widget.session;
    _title.text = session.setup.title;
    _location.text = session.setup.locationName;
    _duration.text = session.setup.durationMinutes.toString();
    _hostGoal.text = session.setup.hostGoal;
    _attendeePrompt.text = session.setup.attendeePrompt;
    _scenario = session.scenario;
    _actorCount = session.actorCount;
    _modules = session.setup.modules.toSet();
  }

  void _cancel() {
    setState(() {
      _loadSession();
      _open = false;
    });
  }

  void _save() {
    if (!_valid || widget.isLoading) return;
    widget.onSave(
      EventRehearsalSetup(
        title: _title.text.trim(),
        locationName: _location.text.trim(),
        durationMinutes: int.parse(_duration.text),
        hostGoal: _hostGoal.text.trim(),
        attendeePrompt: _attendeePrompt.text.trim(),
        modules: EventRehearsalModule.values
            .where(_modules.contains)
            .toList(growable: false),
        unitOutcome: widget.session.setup.unitOutcome,
        movementSimulation: widget.session.setup.movementSimulation,
      ),
      _scenario,
      _actorCount,
    );
    setState(() => _open = false);
  }
}

class _EventRehearsalSetupInput extends StatelessWidget {
  const _EventRehearsalSetupInput({
    required this.title,
    required this.contract,
    required this.controller,
    required this.onChanged,
    this.keyboardType,
    this.inputFormatters,
    this.maxLines,
    this.textCapitalization = TextCapitalization.none,
  });

  final String title;
  final CatchContractFieldConstraints contract;
  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  final TextInputType? keyboardType;
  final List<TextInputFormatter>? inputFormatters;
  final int? maxLines;
  final TextCapitalization textCapitalization;

  @override
  Widget build(BuildContext context) => CatchFieldLanes.single(
    child: CatchField.input(
      copy: catchFieldCopy(context.l10n),
      title: title,
      contract: contract,
      controller: controller,
      keyboardType: keyboardType,
      inputFormatters: inputFormatters,
      maxLines: maxLines,
      textCapitalization: textCapitalization,
      onChanged: onChanged,
    ),
  );
}

class _EventRehearsalScenarioPicker extends StatelessWidget {
  const _EventRehearsalScenarioPicker({
    required this.selected,
    required this.onSelected,
  });

  final EventRehearsalScenario selected;
  final ValueChanged<EventRehearsalScenario> onSelected;

  @override
  Widget build(BuildContext context) =>
      CatchMenu<EventRehearsalScenario>.anchored(
        items: [
          for (final scenario in EventRehearsalScenario.values)
            CatchMenuItem<EventRehearsalScenario>(
              value: scenario,
              label: eventRehearsalScenarioTitle(context.l10n, scenario),
              sublabel: eventRehearsalScenarioBody(context.l10n, scenario),
              selected: scenario == selected,
              variant: CatchMenuItemVariant.choice,
            ),
        ],
        onSelected: (scenario, _) => onSelected(scenario),
        builder: (context, controller, _) => CatchFieldLanes.single(
          child: CatchField.nav(
            copy: catchFieldCopy(context.l10n),
            title: context.l10n.hostEventRehearsalScenario,
            valueText: eventRehearsalScenarioTitle(context.l10n, selected),
            onTap: controller.isOpen ? controller.close : controller.open,
          ),
        ),
      );
}

class _EventRehearsalActorCountPicker extends StatelessWidget {
  const _EventRehearsalActorCountPicker({
    required this.selected,
    required this.onSelected,
  });

  final int selected;
  final ValueChanged<int> onSelected;

  @override
  Widget build(BuildContext context) => CatchMenu<int>.anchored(
    items: [
      for (final count in const [8, 12, 14, 15, 16, 18, 24, 32, 50])
        CatchMenuItem<int>(
          value: count,
          label: context.l10n.hostEventRehearsalActorCount(count: count),
          selected: count == selected,
          variant: CatchMenuItemVariant.choice,
        ),
    ],
    onSelected: (count, _) => onSelected(count),
    builder: (context, controller, _) => CatchFieldLanes.single(
      child: CatchField.nav(
        copy: catchFieldCopy(context.l10n),
        title: context.l10n.hostEventRehearsalActorCount(count: selected),
        onTap: controller.isOpen ? controller.close : controller.open,
      ),
    ),
  );
}
