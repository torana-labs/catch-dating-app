import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/event_rehearsal/domain/event_rehearsal_configuration.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_copy.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_choice_tile.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class EventRehearsalCustomiseSheet extends StatefulWidget {
  const EventRehearsalCustomiseSheet({super.key, required this.configuration});

  final EventRehearsalConfiguration configuration;

  @override
  State<EventRehearsalCustomiseSheet> createState() =>
      _EventRehearsalCustomiseSheetState();
}

class _EventRehearsalCustomiseSheetState
    extends State<EventRehearsalCustomiseSheet> {
  late EventRehearsalConfiguration _draft = widget.configuration;
  final _title = TextEditingController();
  final _venue = TextEditingController();
  final _duration = TextEditingController();
  final _goal = TextEditingController();
  final _prompt = TextEditingController();
  final _count = TextEditingController();
  bool _loaded = false;
  bool _detailsOpen = false;
  bool _playbookOpen = false;
  bool _showErrors = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_loaded) {
      _loadInputs();
      _loaded = true;
    }
  }

  void _loadInputs() {
    final l10n = context.l10n;
    _title.text = eventRehearsalConfigurationTitle(l10n, _draft);
    _venue.text = eventRehearsalConfigurationVenue(l10n, _draft);
    _duration.text =
        (_draft.durationMinutes ??
                _draft.sourceEvent?.endTime
                    .difference(_draft.sourceEvent!.startTime)
                    .inMinutes ??
                90)
            .toString();
    _goal.text = _draft.hostGoal ?? _draft.successDefaults.hostGoal;
    _prompt.text = eventRehearsalConfigurationPrompt(l10n, _draft);
    _count.text = _draft.actorCount.toString();
  }

  @override
  void dispose() {
    for (final controller in [
      _title,
      _venue,
      _duration,
      _goal,
      _prompt,
      _count,
    ]) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return CatchSheet.standard(
      title: l10n.hostRehearsalCustomise,
      footer: CatchButton.sheet(
        role: CatchButtonEmphasis.commit,

        label: l10n.coreCatchFieldLabelDone,
        onPressed: _done,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CatchText(
            l10n.hostRehearsalChangesLocal,
            variant: CatchTextVariant.bodyS,
            color: CatchTokens.of(context).ink2,
          ),
          gapH16,
          CatchSection.plain(
            title: l10n.hostRehearsalEventType,
            padding: EdgeInsets.zero,
            child: EventRehearsalChoiceTile(
              title: _draft.format.activityKind.label,
              description: l10n.hostRehearsalEventTypeDescription,
              onTap: _chooseActivity,
            ),
          ),
          gapH16,
          CatchText(
            l10n.hostRehearsalGuests,
            variant: CatchTextVariant.sectionTitle,
          ),
          if (_draft.sourceEvent case final event?) ...[
            gapH8,
            CatchText(
              l10n.hostRehearsalCopiedGuests(
                count: _draft.sourceGuestCount ?? event.signedUpCount,
              ),
              variant: CatchTextVariant.bodyS,
              color: CatchTokens.of(context).ink2,
            ),
            CatchFieldLanes.single(
              child: CatchField.toggle(
                copy: catchFieldCopy(context.l10n),
                titleMaxLines: 3,
                title: l10n.hostRehearsalSimulatedGuests,
                contractExemption:
                    'Rehearsal-only guest source choice; production roster remains read-only.',
                value: _draft.useSimulatedGuests,
                onChanged: (value) => setState(() {
                  _draft = _draft.changeGuestSource(value);
                  _count.text = _draft.actorCount.toString();
                }),
              ),
            ),
          ],
          if (_draft.useSimulatedGuests) ...[
            gapH8,
            EventRehearsalConfigInput(
              showErrors: _showErrors,
              onEdited: () => setState(() {}),
              label: l10n.hostRehearsalGuestCount,
              controller: _count,
              contract: CatchContractConstraints
                  .createEventRehearsalCallablePayloadActorCount,
              numeric: true,
              error: _showErrors && !_validCount
                  ? l10n.hostRehearsalGuestCountRange
                  : null,
              onChanged: (value) => _draft = _draft.copyWith(
                actorCount: int.tryParse(value),
                customActorCount: true,
              ),
            ),
          ],
          gapH16,
          const CatchDivider.section(),
          EventRehearsalChoiceTile(
            title: l10n.hostRehearsalEventDetails,
            description: l10n.hostRehearsalEventDetailsDescription,
            expanded: _detailsOpen,
            onTap: () => setState(() => _detailsOpen = !_detailsOpen),
          ),
          if (_detailsOpen) ...[
            EventRehearsalConfigInput(
              showErrors: _showErrors,
              onEdited: () => setState(() {}),
              label: l10n.hostRehearsalEventTitle,
              controller: _title,
              contract: CatchContractConstraints
                  .updateEventRehearsalSetupCallablePayloadSetupTitle,
              onChanged: (value) => _draft = _draft.copyWith(title: value),
            ),
            gapH16,
            EventRehearsalConfigInput(
              showErrors: _showErrors,
              onEdited: () => setState(() {}),
              label: l10n.hostRehearsalVenue,
              controller: _venue,
              contract: CatchContractConstraints
                  .updateEventRehearsalSetupCallablePayloadSetupLocationName,
              onChanged: (value) =>
                  _draft = _draft.copyWith(locationName: value),
            ),
            gapH16,
            EventRehearsalConfigInput(
              showErrors: _showErrors,
              onEdited: () => setState(() {}),
              label: l10n.hostRehearsalDuration,
              controller: _duration,
              numeric: true,
              contract: CatchContractConstraints
                  .updateEventRehearsalSetupCallablePayloadSetupDurationMinutes,
              error: _showErrors && !_validDuration
                  ? l10n.hostRehearsalDurationRange
                  : null,
              onChanged: (value) => _draft = _draft.copyWith(
                durationMinutes: int.tryParse(value),
              ),
            ),
            gapH16,
            EventRehearsalConfigInput(
              showErrors: _showErrors,
              onEdited: () => setState(() {}),
              label: l10n.hostRehearsalHostGoal,
              controller: _goal,
              contract: CatchContractConstraints
                  .updateEventRehearsalSetupCallablePayloadSetupHostGoal,
              multiline: true,
              onChanged: (value) => _draft = _draft.copyWith(hostGoal: value),
            ),
            gapH16,
            EventRehearsalConfigInput(
              showErrors: _showErrors,
              onEdited: () => setState(() {}),
              label: l10n.hostRehearsalGuestPrompt,
              controller: _prompt,
              contract: CatchContractConstraints
                  .updateEventRehearsalSetupCallablePayloadSetupAttendeePrompt,
              multiline: true,
              onChanged: (value) =>
                  _draft = _draft.copyWith(attendeePrompt: value),
            ),
            gapH16,
          ],
          const CatchDivider.section(),
          EventRehearsalChoiceTile(
            title: l10n.hostRehearsalPlaybook,
            description: l10n.hostRehearsalPlaybookDescription,
            expanded: _playbookOpen,
            onTap: () => setState(() => _playbookOpen = !_playbookOpen),
          ),
          if (_playbookOpen)
            CatchSection.fieldRows(
              first: true,
              children: [
                for (final module in _draft.availableModules)
                  CatchField.toggle(
                    copy: catchFieldCopy(context.l10n),
                    titleMaxLines: 3,
                    title: eventRehearsalConfigurationModuleLabel(l10n, module),
                    contractExemption:
                        'One item in the rehearsal setup moduleIds collection.',
                    body: _draft.canConfigureModule(module)
                        ? null
                        : l10n.hostRehearsalRequiredModule,
                    value: _draft.selectedModules.contains(module),
                    onChanged: !_draft.canConfigureModule(module)
                        ? null
                        : (selected) => setState(
                            () => _draft = _draft.copyWith(
                              moduleOverrides: {
                                ..._draft.moduleOverrides,
                                module: selected,
                              },
                            ),
                          ),
                  ),
              ],
            ),
          if (_showErrors && _draft.selectedModules.isEmpty)
            CatchText(
              l10n.hostRehearsalSelectModule,
              variant: CatchTextVariant.bodyS,
              color: CatchTokens.of(context).danger,
            ),
          gapH16,
          CatchButton(
            label: l10n.hostRehearsalReset,
            variant: CatchButtonVariant.ghost,
            fullWidth: true,
            onPressed: () => setState(() {
              _draft = _draft.reset();
              _showErrors = false;
              _loadInputs();
            }),
          ),
        ],
      ),
    );
  }

  bool get _validCount {
    final count = int.tryParse(_count.text);
    return count != null && count >= 2 && count <= 50;
  }

  bool get _validDuration {
    final duration = int.tryParse(_duration.text);
    return duration != null && duration >= 30 && duration <= 360;
  }

  void _done() {
    if ((_draft.useSimulatedGuests && !_validCount) ||
        !_validDuration ||
        [
          _title,
          _venue,
          _goal,
          _prompt,
        ].any((input) => input.text.trim().isEmpty) ||
        _draft.selectedModules.isEmpty) {
      setState(() {
        _showErrors = true;
        _detailsOpen = true;
      });
      return;
    }
    Navigator.of(context).pop(_draft);
  }

  Future<void> _chooseActivity() async {
    final kind = await showCatchSelectionSheet<ActivityKind>(
      context: context,
      title: context.l10n.hostRehearsalEventType,
      value: _draft.format.activityKind,
      items: [
        for (final kind in ActivityKind.eventCreationDefaults)
          CatchSelectionMenuItem(value: kind, label: kind.label),
      ],
    );
    if (kind == null || !mounted || kind == _draft.format.activityKind) return;
    setState(() {
      _draft = _draft.changeActivity(kind);
      // A format change updates suggestions, while unfinished input stays in
      // its controller so validation never silently discards the host's edit.
      if (!_draft.customActorCount) {
        _count.text = _draft.actorCount.toString();
      }
      if (_draft.hostGoal == null) {
        _goal.text = _draft.successDefaults.hostGoal;
      }
      if (_draft.attendeePrompt == null) {
        _prompt.text = eventRehearsalConfigurationPrompt(context.l10n, _draft);
      }
    });
  }
}

class EventRehearsalConfigInput extends StatelessWidget {
  const EventRehearsalConfigInput({
    super.key,
    required this.label,
    required this.controller,
    required this.contract,
    required this.onChanged,
    required this.onEdited,
    required this.showErrors,
    this.numeric = false,
    this.multiline = false,
    this.error,
  });

  final String label;
  final TextEditingController controller;
  final CatchContractFieldConstraints contract;
  final ValueChanged<String> onChanged;
  final VoidCallback onEdited;
  final bool showErrors;
  final bool numeric;
  final bool multiline;
  final String? error;

  @override
  Widget build(BuildContext context) => CatchFieldLanes.single(
    child: CatchField.input(
      copy: catchFieldCopy(context.l10n),
      title: label,
      contract: contract,
      controller: controller,
      keyboardType: numeric
          ? TextInputType.number
          : multiline
          ? TextInputType.multiline
          : TextInputType.text,
      inputFormatters: numeric
          ? [FilteringTextInputFormatter.digitsOnly]
          : null,
      minLines: multiline ? 2 : 1,
      maxLines: multiline ? null : 1,
      errorText:
          error ??
          (showErrors && controller.text.trim().isEmpty
              ? context.l10n.coreCatchFormValidationRequired(field: label)
              : null),
      onChanged: (value) {
        onChanged(value);
        onEdited();
      },
    ),
  );
}
