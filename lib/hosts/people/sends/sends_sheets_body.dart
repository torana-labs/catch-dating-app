import 'dart:async';

import 'package:catch_dating_app/contexts/audience/domain/crm/host_communication_plan.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_manual_send_task.dart';
import 'package:catch_dating_app/hosts/people/sends/sends_body.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// One personal WhatsApp handoff: where it is and what Catch can and cannot
/// prove, Open WhatsApp (the stored number is checked again first), Skip,
/// and Mark as sent once WhatsApp has opened. Pops true when the handoff
/// changed. The commands come from Sends.
class HostManualSendSheet extends StatefulWidget {
  const HostManualSendSheet({
    super.key,
    required this.task,
    required this.onOpenWhatsapp,
    required this.onMark,
  });

  final HostManualSendTask task;

  /// Checks the number, opens WhatsApp and records it; resolves the task
  /// as it now stands.
  final Future<HostManualSendTask> Function(HostManualSendTask task)
  onOpenWhatsapp;

  /// Records the host's mark (sent or skipped).
  final Future<void> Function(
    HostManualSendTask task,
    HostManualSendTaskAction action,
  )
  onMark;

  @override
  State<HostManualSendSheet> createState() => _HostManualSendSheetState();
}

class _HostManualSendSheetState extends State<HostManualSendSheet> {
  late HostManualSendTask _task = widget.task;
  bool _busy = false;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return CatchSheet.standard(
      title: l10n.hostManualSendTaskTitle(name: _task.displayName),
      subtitle: l10n.hostManualSendTaskSubtitle,
      footer: CatchButton.sheet(
        role: CatchButtonEmphasis.commit,
        key: const ValueKey<String>('host-manual-send-mark-sent'),
        label: l10n.hostManualSendTaskMarkSent,
        status: _busy ? CatchButtonStatus.loading : CatchButtonStatus.idle,
        onPressed:
            _busy || _task.status != HostManualSendTaskStatus.handoffOpened
            ? null
            : () => unawaited(_mark(HostManualSendTaskAction.hostMarkedSent)),
      ),
      child: CatchStack(
        gap: CatchStackGap.g16,
        children: [
          CatchNotice.inline(
            title: hostManualTaskStatus(l10n, _task),
            body: l10n.hostManualSendTaskDisclosure,
          ),
          CatchSection(
            children: [
              CatchIndexRow(
                key: const ValueKey<String>('host-manual-send-open-whatsapp'),
                title: l10n.hostManualSendTaskOpenWhatsapp,
                subtitle: _task.phoneE164,
                icon: CatchIcons.chat,
                chevron: true,
                onTap: _busy ? null : () => unawaited(_openWhatsapp()),
              ),
              CatchIndexRow(
                key: const ValueKey<String>('host-manual-send-skip'),
                title: l10n.hostManualSendTaskSkip,
                subtitle: l10n.hostManualSendTaskSkipBody,
                icon: CatchIcons.close,
                iconTone: CatchIndexRowTone.danger,
                onTap: _busy
                    ? null
                    : () => unawaited(_mark(HostManualSendTaskAction.skipped)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _openWhatsapp() async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      // provider-graph: ownership-widget-async-callback:_HostManualSendSheetState._openWhatsapp:await:widget.onOpenWhatsapp watch CAT156 -- Sends owns the commands (check the number, open WhatsApp, record it); the sheet holds only its busy flag and the task it shows.
      final updated = await widget.onOpenWhatsapp(_task);
      if (mounted) setState(() => _task = updated);
    } on Object catch (error) {
      if (mounted) {
        showCatchNoticeError(
          context,
          error,
          errorContext: AppErrorContext.customer,
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _mark(HostManualSendTaskAction action) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      // provider-graph: ownership-widget-async-callback:_HostManualSendSheetState._mark:await:widget.onMark watch CAT156 -- Sends owns the mark command; the sheet holds only its busy flag and closes once it succeeds.
      await widget.onMark(_task, action);
      if (mounted) Navigator.of(context).pop(true);
    } on Object catch (error) {
      if (mounted) {
        showCatchNoticeError(
          context,
          error,
          errorContext: AppErrorContext.customer,
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }
}

/// What Check options found for each handoff (up to 50): a managed route
/// is available, keep it by hand, unavailable, no longer active, or the
/// number changed.
class HostManualSendReplanSheet extends StatelessWidget {
  const HostManualSendReplanSheet({
    super.key,
    required this.tasks,
    required this.results,
  });

  final List<HostManualSendTask> tasks;
  final Map<String, HostManualSendTaskReplanResult> results;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return CatchSheet.standard(
      title: l10n.hostManualSendReplanTitle,
      subtitle: l10n.hostManualSendReplanSubtitle,
      child: CatchSection(
        children: [
          for (final task in tasks.take(50))
            CatchIndexRow(
              key: ValueKey<String>('host-manual-replan-${task.taskId}'),
              title: task.displayName,
              subtitle: hostManualReplanBody(l10n, results[task.taskId]),
              onTap: null,
            ),
        ],
      ),
    );
  }
}

/// A replan result in the host's words.
String hostManualReplanBody(
  AppLocalizations l10n,
  HostManualSendTaskReplanResult? result,
) => result?.blocker == HostCommunicationRouteBlocker.endpointChanged
    ? l10n.hostManualSendReplanEndpointChanged
    : switch (result?.disposition) {
        HostManualSendTaskDisposition.managedRouteAvailable =>
          l10n.hostManualSendReplanManagedAvailable,
        HostManualSendTaskDisposition.keepByHand =>
          l10n.hostManualSendReplanKeepByHand,
        HostManualSendTaskDisposition.unavailable =>
          l10n.hostManualSendReplanUnavailable,
        HostManualSendTaskDisposition.taskInactive =>
          l10n.hostManualSendReplanInactive,
        null => l10n.hostManualSendReplanUnavailable,
      };

/// Posts a follower update; resolves once the callable accepts it, with
/// the WhatsApp messages queued (null when WhatsApp was not asked for).
typedef HostFollowerUpdateSubmit =
    Future<int?> Function({
      required String requestId,
      required String text,
      required bool whatsapp,
    });

/// A follower update: the weekly quota, where it appears, the update
/// (500 characters), and the WhatsApp switch when the organizer's number
/// and its follower update template are ready. Pops the post response
/// once the callable accepts it.
class HostFollowerUpdateSheet extends StatefulWidget {
  const HostFollowerUpdateSheet({
    super.key,
    required this.remainingQuota,
    required this.weeklyQuota,
    required this.requestIdFactory,
    required this.onSubmit,
    this.whatsappAvailable = false,
  });

  final int remainingQuota;

  /// Follower updates an organizer may post in seven days.
  final int weeklyQuota;
  final String Function() requestIdFactory;
  final HostFollowerUpdateSubmit onSubmit;
  final bool whatsappAvailable;

  @override
  State<HostFollowerUpdateSheet> createState() =>
      _HostFollowerUpdateSheetState();
}

class _HostFollowerUpdateSheetState extends State<HostFollowerUpdateSheet> {
  final _controller = TextEditingController();
  Object? _error;
  bool _pending = false;
  bool _whatsapp = false;
  late String _requestId;

  @override
  void initState() {
    super.initState();
    _requestId = widget.requestIdFactory();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final text = _controller.text.trim();
    final canSubmit = !_pending && widget.remainingQuota > 0 && text.isNotEmpty;
    return CatchSheet.standard(
      title: l10n.hostsHostOrganizerToolsTitlePostToFollowers,
      subtitle: l10n
          .hostsHostOrganizerToolsSubtitleRemainingquotaOfWeeklyquotaPosts(
            remainingQuota: widget.remainingQuota,
            weeklyQuota: widget.weeklyQuota,
          ),
      footer: CatchButton.sheet(
        role: CatchButtonEmphasis.commit,
        key: const ValueKey<String>('host-follower-update-submit'),
        label: _pending
            ? l10n.hostsHostOrganizerToolsLabelPosting
            : l10n.hostsHostOrganizerToolsLabelPostUpdate,
        status: _pending ? CatchButtonStatus.loading : CatchButtonStatus.idle,
        onPressed: canSubmit ? () => unawaited(_submit(text)) : null,
      ),
      child: CatchStack(
        gap: CatchStackGap.g16,
        children: [
          CatchNotice.inline(
            title: l10n.hostSendsFollowerUpdateChannel,
            body: l10n.hostSendsFollowerUpdateDescription,
          ),
          CatchFieldLanes.single(
            child: CatchField.input(
              key: const ValueKey<String>('host-follower-update-text'),
              copy: catchFieldCopy(l10n),
              title: l10n.hostsHostOrganizerToolsTitleUpdate,
              contract: CatchContractConstraints
                  .createOrganizerPostCallablePayloadText,
              controller: _controller,
              placeholder:
                  l10n.hostsHostOrganizerToolsPlaceholderShareARouteNote,
              keyboardType: TextInputType.multiline,
              textInputAction: TextInputAction.newline,
              textCapitalization: TextCapitalization.sentences,
              maxLines: 5,
              minLines: 3,
              helperText: l10n
                  .hostsHostOrganizerToolsHelpertextValue1CharactersLeft(
                    value1: 500 - _controller.text.length,
                  ),
              states: {if (_pending) WidgetState.disabled},
              onChanged: (_) =>
                  setState(() => _requestId = widget.requestIdFactory()),
            ),
          ),
          CatchIndexRow(
            title: l10n.hostFollowerUpdateWhatsappToggle,
            subtitle: widget.whatsappAvailable
                ? l10n.hostFollowerUpdateWhatsappToggleBody
                : l10n.hostFollowerUpdateWhatsappUnavailable,
            onTap: null,
            trailing: CatchToggleInput(
              key: const ValueKey<String>('host-follower-update-whatsapp'),
              value: widget.whatsappAvailable && _whatsapp,
              semanticLabel: l10n.hostFollowerUpdateWhatsappToggle,
              contractExemption:
                  'Adds whatsapp to the channels array sent with the post.',
              onChanged: widget.whatsappAvailable && !_pending
                  ? (value) => setState(() {
                      _whatsapp = value;
                      _requestId = widget.requestIdFactory();
                    })
                  : null,
            ),
          ),
          if (_error != null)
            CatchText(
              l10n.hostsHostOrganizerToolsTextCouldNotPostThis,
              variant: CatchTextVariant.bodySmall,
              tone: CatchTextTone.danger,
            ),
        ],
      ),
    );
  }

  Future<void> _submit(String text) async {
    if (_pending) return;
    setState(() {
      _pending = true;
      _error = null;
    });
    try {
      final queued = await widget.onSubmit(
        requestId: _requestId,
        text: text,
        whatsapp: widget.whatsappAvailable && _whatsapp,
      );
      if (mounted) {
        Navigator.of(context).pop(HostFollowerUpdatePosted(queued));
      }
    } on Object catch (error) {
      if (!mounted) return;
      setState(() {
        _pending = false;
        _error = error;
      });
    }
  }
}

/// Opens the follower update sheet and, once the callable accepts the
/// post, confirms it (with the WhatsApp messages queued, if any). Returns
/// true only after the post was accepted; dismissing returns false.
Future<bool> showHostFollowerUpdateSheet({
  required BuildContext context,
  required int remainingQuota,
  required int weeklyQuota,
  required String Function() requestIdFactory,
  required HostFollowerUpdateSubmit onSubmitPost,
  bool whatsappAvailable = false,
}) async {
  final posted = await showCatchBottomSheet<HostFollowerUpdatePosted>(
    context: context,
    builder: (_) => HostFollowerUpdateSheet(
      remainingQuota: remainingQuota,
      weeklyQuota: weeklyQuota,
      requestIdFactory: requestIdFactory,
      whatsappAvailable: whatsappAvailable,
      onSubmit: onSubmitPost,
    ),
  );
  if (posted != null && context.mounted) {
    final queued = posted.whatsappQueued;
    showCatchNotice(
      context,
      queued == null
          ? context.l10n.hostsHostOrganizerToolsCatchbuttonPostedToFollowers
          : context.l10n.hostFollowerUpdatePostedWhatsapp(count: queued),
    );
  }
  return posted != null;
}

/// What the follower update sheet pops once the callable accepted the post.
final class HostFollowerUpdatePosted {
  const HostFollowerUpdatePosted(this.whatsappQueued);

  /// WhatsApp messages queued; null when WhatsApp was not asked for.
  final int? whatsappQueued;
}
