import 'dart:async';
import 'dart:math';

import 'package:catch_dating_app/contexts/programmes/data/program_inbox_views_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_snapshot_reader.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_whatsapp_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/inbox/programme_inbox_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_routes.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/catch_async_state.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

final _random = Random.secure();

/// Guest messages (RbProgInbox), from the thread, message and sender read
/// models (`programWhatsappThreadViews`, `programWhatsappMessages`,
/// `programSenderViews`). Send runs `sendProgramWhatsappReply` inside
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

  /// Reads the inbox and the open conversation again after a failed load.
  /// A command needs no refresh: both are listeners and show its result.
  void _refresh() {
    ref.invalidate(programWhatsappThreadRowsStreamProvider(widget.programId));
    ref.invalidate(programWhatsappSenderProvider(widget.programId));
    final threadId = _threadId;
    if (threadId != null) {
      ref.invalidate(
        programWhatsappThreadStreamProvider(widget.programId, threadId),
      );
    }
  }

  /// Marks the open conversation read once per revision, the write half of
  /// opening it.
  final Map<String, int> _marked = {};

  /// The revision marking a thread read answered, newer than the view's
  /// until the trigger catches up.
  final Map<String, int> _readRevision = {};
  void _markRead(ProgramWhatsappThreadSummary thread) {
    if (thread.unreadCount == 0 ||
        _marked[thread.threadId] == thread.revision) {
      return;
    }
    _marked[thread.threadId] = thread.revision;
    unawaited(
      ref
          .read(programmeInboxCommandsProvider)
          .markWhatsappThreadRead(
            programId: widget.programId,
            threadId: thread.threadId,
          )
          .then<void>(
            (revision) => _readRevision[thread.threadId] = revision,
            onError: (Object _) {},
          ),
    );
  }

  Future<void> _run(Future<void> Function() action, String failure) async {
    setState(() => _busy = true);
    var ok = true;
    try {
      // provider-graph: ownership-widget-async-callback:_HostProgrammeInboxScreenState._run:await:action watch CAT156 -- Each action is a programmeInboxCommandsProvider command; _run only holds the screen's busy flag, refreshes the thread and shows a failure notice. No loaded data, authority or retry identity lives here; it moves to a generated mutation with the inbox's CAT156 migration.
      await action();
    } on Object {
      ok = false;
    }
    if (!mounted) return;
    setState(() => _busy = false);
    if (!ok) {
      showCatchNotice(context, failure, tone: CatchNoticeTone.danger);
    }
  }

  /// Sends a reply. The composer clears itself as it hands the text over, so
  /// nothing here clears it once the reply lands: by then the host may have
  /// typed the next message. A failed reply puts its text back, unless the
  /// host has moved on (left, opened another conversation or typed again).
  void _send(ProgramWhatsappThread thread, String text) {
    final body = text.trim();
    if (body.isEmpty) return;
    final threadId = thread.summary.threadId;
    final cannedReplyId = _cannedReplyId;
    _cannedReplyId = null;
    unawaited(
      _run(() async {
        try {
          await ref
              .read(programmeInboxCommandsProvider)
              .sendWhatsappReply(
                programId: widget.programId,
                threadId: threadId,
                text: body,
                idempotencyKey: _key('reply'),
                lastInboundAt: thread.summary.lastInboundAt,
                cannedReplyId: cannedReplyId,
              );
        } on Object {
          if (mounted && _threadId == threadId && _composer.text.isEmpty) {
            _composer.text = body;
            _cannedReplyId = cannedReplyId;
          }
          rethrow;
        }
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
            threadId: thread.threadId,
            expectedRevision: max(
              thread.revision,
              _readRevision[thread.threadId] ?? 0,
            ),
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
    if (threadId != null) {
      ref.listen(programWhatsappThreadProvider(widget.programId, threadId), (
        _,
        next,
      ) {
        final summary = next.value?.value.summary;
        if (summary != null) _markRead(summary);
      });
    }
    final CatchAsyncState<ProgramReadView<ProgramWhatsappThread>>? threadRead =
        threadId == null
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
    final status = read.hasError
        ? HostProgrammeStatus.error
        : inbox == null
        ? HostProgrammeStatus.loading
        : HostProgrammeStatus.ready;
    return CatchRoot(
      format: CatchFormat.nightsOut,
      child: CatchScreen(
        key: const ValueKey<String>('host-programme-inbox-screen'),
        bodyScrolls: false,
        // Once the inbox is ready its pane header carries the title, back
        // and settings, as on Rooms and the ID tracker; a top bar as well
        // would show "Guest messages" twice. While it loads or fails the
        // body has no header, so the top bar keeps the way back.
        topBar: status == HostProgrammeStatus.ready
            ? null
            : CatchTopBar(
                variant: CatchTopBarVariant.tool,
                back: CatchTopBarBack(
                  label: l10n.hostProgrammeBackToProgramme,
                  onPressed: _back,
                ),
                title: l10n.hostProgrammeInboxTitle,
              ),
        body: HostProgrammeInboxBody(
          status: status,
          inbox: inbox,
          filter: _filter,
          selectedThreadId: threadId,
          thread: thread,
          threadStatus: switch (threadRead?.status) {
            CatchAsyncStatus.data when thread != null =>
              HostProgrammeStatus.ready,
            CatchAsyncStatus.loading => HostProgrammeStatus.loading,
            _ => HostProgrammeStatus.error,
          },
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
