import 'dart:async';

import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/event_success/domain/event_success_assignment.dart';
import 'package:catch_dating_app/event_success/presentation/assignments/event_success_assignment_profiles.dart';
import 'package:catch_dating_app/event_success/presentation/assignments/event_success_group_override_draft.dart';
import 'package:catch_dating_app/event_success/presentation/assignments/event_success_group_override_round_section.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/public_profile/domain/public_profile.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventSuccessGroupOverrideSheet extends StatefulWidget {
  const EventSuccessGroupOverrideSheet({
    super.key,
    required this.event,
    required this.assignments,
    required this.participantProfiles,
    this.onOverride,
  });

  final Event event;
  final List<EventSuccessAssignment> assignments;
  final List<PublicProfile> participantProfiles;
  final Future<void> Function(List<EventSuccessGroupOverrideRound> rounds)?
  onOverride;

  @override
  State<EventSuccessGroupOverrideSheet> createState() =>
      _EventSuccessGroupOverrideSheetState();
}

class _EventSuccessGroupOverrideSheetState
    extends State<EventSuccessGroupOverrideSheet> {
  late final List<String> _participantUids =
      eventSuccessAssignmentParticipantUids(widget.assignments);
  late final Map<String, String> _participantLabels = {
    for (final profile in widget.participantProfiles) profile.uid: profile.name,
  };
  late final List<GroupOverrideRoundDraft> _rounds =
      eventSuccessGroupOverrideDrafts(widget.assignments);
  bool _isSaving = false;
  Object? _saveError;

  @override
  Widget build(BuildContext context) {
    final validationError = _validationError;
    return CatchSheet.standard(
      title: context.l10n.eventSuccessEventSuccessHostOverridesTitleEditGroups,
      subtitle: context
          .l10n
          .eventSuccessEventSuccessHostOverridesSubtitleHostOverride,
      footer: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (_saveError != null) ...[
            CatchLocalizedErrorBanner(
              _saveError!,
              context: AppErrorContext.event,
            ),
            gapH8,
          ],
          if (validationError != null) ...[
            CatchText(
              validationError,
              variant: CatchTextVariant.supporting,
              color: CatchTokens.of(context).danger,
            ),
            gapH8,
          ],
          CatchButton.sheet(
            role: CatchButtonEmphasis.commit,
            label: context
                .l10n
                .eventSuccessEventSuccessHostOverridesLabelSaveOverrides,
            leading: Icon(CatchIcons.checkRounded),
            status: (_isSaving)
                ? CatchButtonStatus.loading
                : CatchButtonStatus.idle,
            onPressed:
                _isSaving ||
                    validationError != null ||
                    widget.onOverride == null
                ? null
                : () => unawaited(_saveOverrides(context)),
          ),
        ],
      ),
      child: ListView.separated(
        physics: const NeverScrollableScrollPhysics(),
        padding: EdgeInsets.zero,
        shrinkWrap: true,
        itemCount: _rounds.length,
        separatorBuilder: (_, _) => gapH12,
        itemBuilder: (context, index) {
          final round = _rounds[index];
          return EventSuccessGroupOverrideRoundSection(
            round: round,
            participantUids: _participantUids,
            participantLabel: _participantLabel,
            onChanged: () => setState(() {}),
            onAddGroup: () => setState(() => _addGroup(round)),
            onRemoveGroup: (group) =>
                setState(() => round.groups.remove(group)),
            onAddMember: (group) => setState(() => _addMember(round, group)),
            onRemoveMember: (group, member) =>
                setState(() => group.memberUids.remove(member)),
          );
        },
      ),
    );
  }

  String _participantLabel(String uid) => _participantLabels[uid] ?? uid;

  String? get _validationError {
    if (_rounds.every((round) => round.groups.isEmpty)) {
      return context
          .l10n
          .eventSuccessEventSuccessHostOverridesVisiblecopyAddAtLeastOne;
    }
    for (final round in _rounds) {
      final usedInRound = <String>{};
      for (final group in round.groups) {
        if (group.label.trim().isEmpty) {
          return context
              .l10n
              .eventSuccessEventSuccessHostOverridesVisiblecopyNameEveryGroup;
        }
        if (group.memberUids.isEmpty) {
          return context
              .l10n
              .eventSuccessEventSuccessHostOverridesVisiblecopyAddAtLeastOne64c0b6;
        }
        for (final memberUid in group.memberUids) {
          if (memberUid == null) {
            return context
                .l10n
                .eventSuccessEventSuccessHostOverridesVisiblecopyChooseEveryAttendeeSlot;
          }
          if (!usedInRound.add(memberUid)) {
            return context
                .l10n
                .eventSuccessEventSuccessHostOverridesVisiblecopyEachAttendeeCanAppear;
          }
        }
      }
    }
    return null;
  }

  void _addGroup(GroupOverrideRoundDraft round) {
    final used = round.groups
        .expand((group) => group.memberUids)
        .whereType<String>()
        .toSet();
    final available = _participantUids
        .where((uid) => !used.contains(uid))
        .toList(growable: false);
    round.groups.add(
      GroupOverrideUnitDraft(
        label: context.l10n
            .eventSuccessEventSuccessHostOverridesLabelGroupValue1(
              value1: round.groups.length + 1,
            ),
        memberUids: <String?>[if (available.isNotEmpty) available.first],
      ),
    );
  }

  void _addMember(GroupOverrideRoundDraft round, GroupOverrideUnitDraft group) {
    final used = round.groups
        .expand((draft) => draft.memberUids)
        .whereType<String>()
        .toSet();
    final available = _participantUids
        .where((uid) => !used.contains(uid))
        .toList(growable: false);
    group.memberUids.add(available.isEmpty ? null : available.first);
  }

  Future<void> _saveOverrides(BuildContext context) async {
    final overrideRounds = [
      for (final round in _rounds)
        EventSuccessGroupOverrideRound(
          roundIndex: round.roundIndex,
          groups: [
            for (final group in round.groups)
              EventSuccessGroupOverrideUnit(
                label: group.label.trim(),
                participantUids: group.memberUids.whereType<String>().toList(),
              ),
          ],
        ),
    ];
    final saveOverrides = widget.onOverride;
    if (saveOverrides == null) return;
    setState(() {
      _isSaving = true;
      _saveError = null;
    });
    var saved = false;
    try {
      await saveOverrides(overrideRounds);
      saved = true;
      if (context.mounted) Navigator.of(context).pop();
    } catch (error) {
      if (context.mounted) {
        setState(() => _saveError = error);
      }
    } finally {
      if (context.mounted && !saved) {
        setState(() => _isSaving = false);
      }
    }
  }
}
