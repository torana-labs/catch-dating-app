import 'dart:async';
import 'dart:math';

import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_whatsapp_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/inbox/programme_inbox_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/inbox/programme_inbox_commands.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_routes.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

final _random = Random.secure();

/// Guest messages (RbProgInbox), from `listProgramWhatsappThreads` and
/// `getProgramWhatsappThread`. Send runs `sendProgramWhatsappReply` inside
/// the 24-hour window; Take over and Hand back run
/// `setProgramWhatsappThreadHandling`; saved replies fill the composer.
class HostProgrammeInboxScreen extends ConsumerStatefulWidget {
  const HostProgrammeInboxScreen({
    super.key,
    required this.programId,
    this.initialThreadId,
  });

  final String programId;

  /// The conversation that opens beside the list.
  final String? initialThreadId;

  @override
  ConsumerState<HostProgrammeInboxScreen> createState() =>
      _HostProgrammeInboxScreenState();
}

class _HostProgrammeInboxScreenState
    extends ConsumerState<HostProgrammeInboxScreen> {
  ProgramWhatsappFilter _filter = ProgramWhatsappFilter.needsYou;
  late String? _threadId = widget.initialThreadId;
  String? _cannedReplyId;
  bool _busy = false;
  final _composer = TextEditingController();

  @override
  void dispose() {
    _composer.dispose();
    super.dispose();
  }

  String _key(String prefix) =>
      '$prefix-${DateTime.now().microsecondsSinceEpoch}-'
      '${_random.nextInt(1 << 30)}';

  void _refresh() {
    ref.invalidate(programWhatsappInboxProvider(widget.programId, _filter));
    final threadId = _threadId;
    if (threadId != null) {
      ref.invalidate(programWhatsappThreadProvider(widget.programId, threadId));
    }
  }

  Future<void> _run(Future<void> Function() action, String failure) async {
    setState(() => _busy = true);
    var ok = true;
    try {
      await action();
    } on Object {
      ok = false;
    }
    _refresh();
    if (!mounted) return;
    setState(() => _busy = false);
    if (!ok) {
      showCatchNotice(context, failure, tone: CatchNoticeTone.danger);
    }
  }

  void _send(ProgramWhatsappThread thread, String text) {
    final body = text.trim();
    if (body.isEmpty) return;
    final cannedReplyId = _cannedReplyId;
    unawaited(
      _run(() async {
        await ref
            .read(programmeInboxCommandsProvider)
            .sendWhatsappReply(
              programId: widget.programId,
              threadId: thread.summary.threadId,
              text: body,
              idempotencyKey: _key('reply'),
              lastInboundAt: thread.summary.lastInboundAt,
              cannedReplyId: cannedReplyId,
            );
        _composer.clear();
        _cannedReplyId = null;
      }, context.l10n.hostProgrammeInboxSendFailed),
    );
  }

  void _handling(
    ProgramWhatsappThreadSummary thread,
    ProgramWhatsappHandledBy handledBy,
    ProgramWhatsappThreadState? state,
  ) => unawaited(
    _run(
      () => ref
          .read(programmeInboxCommandsProvider)
          .setWhatsappThreadHandling(
            programId: widget.programId,
            thread: thread,
            handledBy: handledBy,
            state: state,
          ),
      context.l10n.hostProgrammeInboxHandlingFailed,
    ),
  );

  void _back() => context.canPop()
      ? context.pop()
      : context.goNamed(
          Routes.hostProgramWorkspaceScreen.name,
          pathParameters: {'programId': widget.programId},
        );

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final read = catchAsyncStateFromAsyncValue(
      ref.watch(programWhatsappInboxProvider(widget.programId, _filter)),
    );
    final inbox = read.value?.value;
    final threadId = _threadId;
    final threadRead = threadId == null
        ? null
        : catchAsyncStateFromAsyncValue(
            ref.watch(
              programWhatsappThreadProvider(widget.programId, threadId),
            ),
          );
    final thread = threadRead?.value?.value;
    final canned =
        catchAsyncStateFromAsyncValue(
          ref.watch(programCannedRepliesProvider(widget.programId)),
        ).value?.value ??
        const <ProgramCannedReply>[];
    return CatchRoot(
      format: CatchFormat.nightsOut,
      child: CatchScreen(
        key: const ValueKey<String>('host-programme-inbox-screen'),
        bodyScrolls: false,
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          back: CatchTopBarBack(
            label: l10n.hostProgrammeBackToProgramme,
            onPressed: _back,
          ),
          title: l10n.hostProgrammeInboxTitle,
        ),
        body: HostProgrammeInboxBody(
          status: read.hasError
              ? HostProgrammeStatus.error
              : inbox == null
              ? HostProgrammeStatus.loading
              : HostProgrammeStatus.ready,
          inbox: inbox,
          filter: _filter,
          selectedThreadId: threadId,
          thread: thread,
          threadStatus: threadRead == null || threadRead.hasError
              ? HostProgrammeStatus.error
              : thread == null
              ? HostProgrammeStatus.loading
              : HostProgrammeStatus.ready,
          cannedReplies: [
            for (final reply in canned)
              if (!reply.archived) reply,
          ],
          composer: _composer,
          now: ref.watch(appClockProvider).now(),
          busy: _busy,
          onBack: _back,
          onSettings: () => openHostProgrammePage(
            context,
            widget.programId,
            HostProgrammePage.assistant,
          ),
          onFilter: (filter) => setState(() => _filter = filter),
          onSelect: (row) => setState(() {
            _threadId = row.threadId;
            _composer.clear();
            _cannedReplyId = null;
          }),
          onCloseThread: () => setState(() => _threadId = null),
          onOpenHousehold: (householdId) => openHostProgrammePage(
            context,
            widget.programId,
            HostProgrammePage.household,
            id: householdId,
          ),
          onHandling: _handling,
          onCanned: (reply) {
            _cannedReplyId = reply.cannedReplyId;
            _composer.text = reply.textFor(thread?.summary.language);
          },
          onSend: (text) {
            if (thread != null) _send(thread, text);
          },
          onRetry: _refresh,
        ),
      ),
    );
  }
}
