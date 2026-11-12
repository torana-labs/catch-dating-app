import 'dart:async';

import 'package:catch_dating_app/contexts/programmes/data/program_planner_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_message_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_controller.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_create_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_message_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_planner_commands_controller.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:catch_dating_app/hosts/programmes/planner/widgets/programme_state_body.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// A planned message (RbProgMessage): new, or the one [momentId] names.
///
/// Approve and schedule runs `upsertOrganizerMoment` then
/// `armOrganizerMoment`; Save draft runs only the upsert. Both carry the
/// planner anchor, so the message moves with its function or flight.
class HostProgrammeMessageScreen extends ConsumerStatefulWidget {
  const HostProgrammeMessageScreen({
    super.key,
    required this.programId,
    this.momentId,
  });

  final String programId;
  final String? momentId;

  @override
  ConsumerState<HostProgrammeMessageScreen> createState() =>
      _HostProgrammeMessageScreenState();
}

class _HostProgrammeMessageScreenState
    extends ConsumerState<HostProgrammeMessageScreen> {
  ProgramMessageDraft? _draft;
  bool _saving = false;
  String? _error;

  ProgramMessageDraft _initial(
    HostProgrammeState programme,
    ProgramPlannedMessages messages,
  ) {
    final existing = messages.messages
        .where((message) => message.momentId == widget.momentId)
        .firstOrNull;
    if (existing != null) {
      return ProgramMessageDraft(
        anchorKind: existing.anchorKind,
        anchorId: existing.anchorId,
        offsetMinutes: existing.offsetMinutes ?? -1440,
        scheduledAt: existing.scheduledAt,
        audience: existing.audience ?? ProgramMessageAudience.everyone,
        template: existing.template ?? ProgramMessageTemplate.functionStarting,
        name: existing.name,
      );
    }
    final function = programme.functions.firstOrNull;
    return ProgramMessageDraft(
      anchorKind: function == null
          ? ProgramMessageAnchorKind.date
          : ProgramMessageAnchorKind.function,
      anchorId: function?.functionId,
      offsetMinutes: -1440,
      scheduledAt: null,
      audience: ProgramMessageAudience.everyone,
      template: ProgramMessageTemplate.functionStarting,
      name: '',
    );
  }

  Future<void> _pickDate(ProgramMessageDraft draft) async {
    final l10n = context.l10n;
    final day = await showCatchBottomSheet<DateTime>(
      context: context,
      builder: (_) => HostProgrammeDaySheet(
        title: l10n.hostProgrammeMessageSendOn,
        today: ref.read(appClockProvider).now(),
        value: draft.scheduledAt,
      ),
    );
    if (day == null || !mounted) return;
    setState(
      () => _draft = ProgramMessageDraft(
        anchorKind: draft.anchorKind,
        anchorId: draft.anchorId,
        offsetMinutes: draft.offsetMinutes,
        // Date messages go at 10 AM on the chosen day.
        scheduledAt: DateTime(day.year, day.month, day.day, 10),
        audience: draft.audience,
        template: draft.template,
        name: draft.name,
      ),
    );
  }

  Future<void> _save({
    required ProgramMessageDraft draft,
    required String sender,
    required bool approve,
  }) async {
    final l10n = context.l10n;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await ref
          .read(hostProgrammePlannerCommandsProvider.notifier)
          .saveMessage(
            programId: widget.programId,
            senderConnectionId: sender,
            momentId: widget.momentId,
            approve: approve,
            draft: ProgramMessageDraft(
              anchorKind: draft.anchorKind,
              anchorId: draft.anchorId,
              offsetMinutes: draft.offsetMinutes,
              scheduledAt: draft.scheduledAt,
              audience: draft.audience,
              template: draft.template,
              name: draft.name.isEmpty
                  ? hostProgrammeMessageTemplateLabel(l10n, draft.template)
                  : draft.name,
            ),
          );
      ref.invalidate(programPlannedMessagesProvider(widget.programId));
      if (mounted) context.pop();
    } on Object {
      if (mounted) {
        setState(() {
          _saving = false;
          _error = l10n.hostProgrammeMessageSaveFailed;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final programme = ref.watch(
      hostProgrammeControllerProvider(widget.programId),
    );
    final messages = catchAsyncStateFromAsyncValue(
      ref.watch(programPlannedMessagesProvider(widget.programId)),
    );
    final roster = ref.watch(
      programArrivalsRosterProvider(widget.programId, null),
    );
    final loaded = messages.value;
    final ready =
        programme.status == HostProgrammeStatus.ready && loaded != null;
    final draft = ready ? _draft ??= _initial(programme, loaded) : null;
    final sender = loaded?.senderConnectionId;
    final canSave =
        draft != null && draft.isComplete && sender != null && !_saving;
    return CatchRoot(
      format: CatchFormat.nightsOut,
      child: CatchScreen(
        key: const ValueKey<String>('host-programme-message-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          back: CatchTopBarBack(label: l10n.hostProgrammeClose, close: true),
          kicker: programme.program?.title,
          title: widget.momentId == null
              ? l10n.hostProgrammeMessageNewTitle
              : l10n.hostProgrammeMessageEditTitle,
        ),
        dock: draft == null
            ? null
            : CatchDock(
                primary: CatchDockAction(
                  label: l10n.hostProgrammeMessageApprove,
                  loading: _saving,
                  onPressed: canSave
                      ? () => unawaited(
                          _save(draft: draft, sender: sender, approve: true),
                        )
                      : null,
                ),
                secondary: CatchDockAction(
                  label: l10n.hostProgrammeMessageSaveDraft,
                  onPressed: canSave
                      ? () => unawaited(
                          _save(draft: draft, sender: sender, approve: false),
                        )
                      : null,
                ),
              ),
        body: draft == null
            ? HostProgrammeStateBody(
                status: messages.error != null
                    ? HostProgrammeStatus.error
                    : programme.status,
                onRetry: () {
                  refreshHostProgramme(ref, widget.programId);
                  ref.invalidate(
                    programPlannedMessagesProvider(widget.programId),
                  );
                },
              )
            : HostProgrammeMessageBody(
                draft: draft,
                functions: programme.functions,
                flights: [
                  for (final row
                      in roster.value?.rows ?? const <ArrivalsRosterRow>[])
                    (
                      row.legId,
                      '${row.flightNumber ?? row.guestDisplayName}'
                          ' · ${row.partyLabel ?? row.guestDisplayName}',
                    ),
                ],
                hostName: programme.program?.title ?? '',
                hasSender: sender != null,
                error: _error,
                onChanged: (next) => setState(() => _draft = next),
                onPickDate: () => unawaited(_pickDate(draft)),
              ),
      ),
    );
  }
}
