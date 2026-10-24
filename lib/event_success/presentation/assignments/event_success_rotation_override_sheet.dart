import 'dart:async';

import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/event_success/domain/event_success_assignment.dart';
import 'package:catch_dating_app/event_success/presentation/assignments/event_success_assignment_profiles.dart';
import 'package:catch_dating_app/event_success/presentation/assignments/event_success_rotation_override_draft.dart';
import 'package:catch_dating_app/event_success/presentation/assignments/event_success_rotation_override_round_section.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/public_profile/domain/public_profile.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventSuccessRotationOverrideSheet extends StatefulWidget {
  const EventSuccessRotationOverrideSheet({
    super.key,
    required this.event,
    required this.assignments,
    required this.participantProfiles,
    this.onOverride,
  });

  final Event event;
  final List<EventSuccessAssignment> assignments;
  final List<PublicProfile> participantProfiles;
  final Future<void> Function(List<EventSuccessRotationOverrideRound> rounds)?
  onOverride;

  @override
  State<EventSuccessRotationOverrideSheet> createState() =>
      _EventSuccessRotationOverrideSheetState();
}

class _EventSuccessRotationOverrideSheetState
    extends State<EventSuccessRotationOverrideSheet> {
  late final List<String> _participantUids =
      eventSuccessAssignmentParticipantUids(widget.assignments);
  late final Map<String, String> _participantLabels = {
    for (final profile in widget.participantProfiles) profile.uid: profile.name,
  };
  late final List<RotationOverrideRoundDraft> _rounds =
      eventSuccessRotationOverrideDrafts(widget.assignments);
  bool _isSaving = false;
  Object? _saveError;

  @override
  Widget build(BuildContext context) {
    final validationError = _validationError;
    return CatchSheet.standard(
      title:
          context.l10n.eventSuccessEventSuccessHostOverridesTitleEditRotations,
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
          return EventSuccessRotationOverrideRoundSection(
            round: round,
            participantUids: _participantUids,
            participantLabel: _participantLabel,
            onChanged: () => setState(() {}),
            onAddPair: () => setState(() => _addPair(round)),
            onRemovePair: (pair) => setState(() => round.pairings.remove(pair)),
          );
        },
      ),
    );
  }

  String _participantLabel(String uid) => _participantLabels[uid] ?? uid;

  String? get _validationError {
    if (_rounds.every((round) => round.pairings.isEmpty)) {
      return context
          .l10n
          .eventSuccessEventSuccessHostOverridesVisiblecopyAddAtLeastOne76e783;
    }
    for (final round in _rounds) {
      final usedInRound = <String>{};
      for (final pair in round.pairings) {
        final uidA = pair.uidA;
        final uidB = pair.uidB;
        if (uidA == null || uidB == null) {
          return context
              .l10n
              .eventSuccessEventSuccessHostOverridesVisiblecopyChooseBothAttendeesFor;
        }
        if (uidA == uidB) {
          return context
              .l10n
              .eventSuccessEventSuccessHostOverridesVisiblecopyChooseTwoDifferentAttendees;
        }
        if (!usedInRound.add(uidA) || !usedInRound.add(uidB)) {
          return context
              .l10n
              .eventSuccessEventSuccessHostOverridesVisiblecopyEachAttendeeCanAppear;
        }
      }
    }
    return null;
  }

  void _addPair(RotationOverrideRoundDraft round) {
    final used = round.pairings
        .expand((pair) => [pair.uidA, pair.uidB])
        .whereType<String>()
        .toSet();
    final available = _participantUids
        .where((uid) => !used.contains(uid))
        .toList(growable: false);
    round.pairings.add(
      RotationOverridePairDraft(
        uidA: available.isEmpty ? null : available.first,
        uidB: available.length < 2 ? null : available[1],
      ),
    );
  }

  Future<void> _saveOverrides(BuildContext context) async {
    final overrideRounds = [
      for (final round in _rounds)
        EventSuccessRotationOverrideRound(
          roundIndex: round.roundIndex,
          pairings: [
            for (final pair in round.pairings)
              EventSuccessRotationOverridePair(
                uidA: pair.uidA!,
                uidB: pair.uidB!,
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
