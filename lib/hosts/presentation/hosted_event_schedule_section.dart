// ignore_for_file: prefer_initializing_formals

import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:catch_dating_app/core/business_rules.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_form_keys.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_edit_screen_state.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class HostedEventScheduleSection extends StatelessWidget {
  const HostedEventScheduleSection.editable({
    super.key,
    required HostEventEditScheduleFieldState state,
    required VoidCallback onPickDate,
    required VoidCallback onPickStartTime,
    required ValueChanged<int> onDurationChanged,
  }) : _state = state,
       _event = null,
       _onPickDate = onPickDate,
       _onPickStartTime = onPickStartTime,
       _onDurationChanged = onDurationChanged;

  const HostedEventScheduleSection.readOnly({super.key, required Event event})
    : _state = null,
      _event = event,
      _onPickDate = null,
      _onPickStartTime = null,
      _onDurationChanged = null;

  final HostEventEditScheduleFieldState? _state;
  final Event? _event;
  final VoidCallback? _onPickDate;
  final VoidCallback? _onPickStartTime;
  final ValueChanged<int>? _onDurationChanged;

  @override
  Widget build(BuildContext context) {
    final event = _event;
    if (event != null) {
      return CatchSection.fieldRows(
        title: context.l10n.hostsEditHostedEventScreenLabelSchedule,
        children: [
          CatchField.read(
            copy: catchFieldCopy(context.l10n),
            title: event.shortDateLabel,
            body: event.timeRangeLabel,
            icon: CatchIcons.date,
          ),
          CatchField.read(
            copy: catchFieldCopy(context.l10n),
            body: context
                .l10n
                .hostsEditHostedEventScreenTextScheduleChangesAreBlocked,
            bodyMaxLines: 3,
            icon: CatchIcons.locked,
          ),
        ],
      );
    }

    final state = _state!;
    return CatchSection.fieldRows(
      title: context.l10n.hostsEditHostedEventScreenLabelSchedule,
      children: [
        CatchField.nav(
          copy: catchFieldCopy(context.l10n),
          key: CreateEventFormKeys.datePicker,
          title: context.l10n.hostsEditHostedEventScreenTitleEventDate,
          body: state.dateValue,
          icon: CatchIcons.date,
          onTap: _onPickDate,
        ),
        CatchField.nav(
          copy: catchFieldCopy(context.l10n),
          key: CreateEventFormKeys.timePicker,
          title: context.l10n.hostsEditHostedEventScreenTitleStartTime,
          body: state.startTimeValue,
          icon: CatchIcons.time,
          error: state.errorText,
          onTap: _onPickStartTime,
        ),
        CatchField.stepper(
          copy: catchFieldCopy(context.l10n),
          title: context.l10n.hostsEditHostedEventScreenLabelDuration,
          contract:
              CatchContractConstraints.mobileFormStateEventDurationMinutes,
          body: EventFormatters.durationMinutes(state.durationMinutes),
          value: state.durationMinutes,
          min: BusinessRules.eventMinDurationMinutes,
          max: BusinessRules.eventMaxDurationMinutes,
          step: BusinessRules.eventDurationStepMinutes,
          valueLabelBuilder: (value) =>
              EventFormatters.durationMinutes(value.round()),
          decreaseSemanticLabel:
              context.l10n.hostsEditHostedEventScreenBodyDecreaseDuration,
          increaseSemanticLabel:
              context.l10n.hostsEditHostedEventScreenBodyIncreaseDuration,
          onChanged: (duration) => _onDurationChanged!(duration.round()),
          icon: CatchIcons.timer,
        ),
      ],
    );
  }
}
