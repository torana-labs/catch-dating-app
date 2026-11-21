import 'dart:async';

import 'package:catch_dating_app/contexts/audience/domain/crm/host_contact_merge.dart';
import 'package:catch_dating_app/hosts/people/duplicates/duplicates_body.dart';
import 'package:catch_dating_app/hosts/people/duplicates/duplicates_controller.dart';
import 'package:catch_dating_app/hosts/people/duplicates/duplicates_state.dart';
import 'package:catch_dating_app/hosts/people/duplicates/widgets/merge_confirm_sheet.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Possible duplicates: the pairs the server's review found, with the
/// evidence for each, and the pairs marked as different people.
///
/// It watches [hostDuplicatesControllerProvider], keeps the view and the
/// pair a command runs on, and turns the body's callbacks into the merge
/// commands. Merge asks which record stays in [HostMergeConfirmSheet] and
/// offers Undo afterwards; every command reads the review again, and the
/// people it names update through their own listeners.
class HostPeopleDuplicatesScreen extends ConsumerStatefulWidget {
  const HostPeopleDuplicatesScreen({super.key, required this.organizerId});

  final String organizerId;

  @override
  ConsumerState<HostPeopleDuplicatesScreen> createState() =>
      _HostPeopleDuplicatesScreenState();
}

class _HostPeopleDuplicatesScreenState
    extends ConsumerState<HostPeopleDuplicatesScreen> {
  HostDuplicatesView _view = HostDuplicatesView.open;
  String? _pendingPairId;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final organizerId = widget.organizerId;
    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [
        HostDuplicateCommands.mergeMutation,
        HostDuplicateCommands.differentMutation,
        HostDuplicateCommands.reopenMutation,
        HostDuplicateCommands.undoMutation,
      ],
      errorContext: AppErrorContext.organizer,
    );
    final state = ref.watch(
      hostDuplicatesControllerProvider(organizerId, _view),
    );
    return CatchRoot(
      child: CatchScreen(
        key: const ValueKey<String>('host-people-duplicates-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          title: l10n.hostPeopleDuplicatesTitle,
          kicker: l10n.hostPeopleTitle,
          back: CatchTopBarBack(
            label: l10n.hostPeopleBackToPeople,
            onPressed: () => Navigator.of(context).maybePop(),
          ),
        ),
        body: HostPeopleDuplicatesBody(
          state: state,
          pendingPairId: _pendingPairId,
          onView: (view) => setState(() => _view = view),
          onMerge: (pair) => unawaited(_merge(pair)),
          onDifferent: (pair) => unawaited(
            _run(
              pair,
              HostDuplicateCommands.differentMutation,
              (commands) =>
                  commands.markDifferent(organizerId: organizerId, pair: pair),
              l10n.hostPeopleDuplicatesMarkedNotice,
            ),
          ),
          onReopen: (pair) => unawaited(
            _run(
              pair,
              HostDuplicateCommands.reopenMutation,
              (commands) =>
                  commands.reopen(organizerId: organizerId, pair: pair),
              l10n.hostPeopleDuplicatesReopenedNotice,
            ),
          ),
          onLoadMore: () => unawaited(
            ref
                .read(hostDuplicateReviewPagesProvider(organizerId).notifier)
                .loadMore(),
          ),
          onRetry: () => refreshHostDuplicates(ref, organizerId),
        ),
      ),
    );
  }

  Future<void> _merge(HostContactMergeCandidate pair) async {
    final survivorId = await showCatchBottomSheet<String>(
      context: context,
      builder: (_) => HostMergeConfirmSheet(pair: pair),
    );
    if (survivorId == null || !mounted) return;
    final survivor = pair.contacts.firstWhere(
      (contact) => contact.contactId == survivorId,
    );
    await _command(
      pair,
      HostDuplicateCommands.mergeMutation,
      (commands) => commands.merge(
        organizerId: widget.organizerId,
        pair: pair,
        survivorContactId: survivorId,
      ),
      onDone: (receipt) {
        final l10n = context.l10n;
        showCatchNotice(
          context,
          l10n.hostPeopleMergedNotice(name: survivor.displayName),
          tone: CatchNoticeTone.success,
          actionLabel: l10n.hostPeopleMergeUndoAction,
          onAction: () {
            // The person page keeps Undo merge once this page is closed.
            if (!mounted) return;
            unawaited(
              undoHostMerge(
                context,
                ref,
                organizerId: widget.organizerId,
                mergeReceiptId: receipt.receiptId,
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _run(
    HostContactMergeCandidate pair,
    Mutation<void> mutation,
    Future<void> Function(HostDuplicateCommands commands) command,
    String done,
  ) => _command(
    pair,
    mutation,
    command,
    onDone: (_) => showCatchNotice(context, done),
  );

  /// Runs one command on [pair], reads the review again and calls [onDone]
  /// with its result. A failure is left to the mutation listener; a write
  /// the server may not have confirmed offers no retry.
  Future<void> _command<T>(
    HostContactMergeCandidate pair,
    Mutation<T> mutation,
    Future<T> Function(HostDuplicateCommands commands) command, {
    required ValueChanged<T> onDone,
  }) async {
    setState(() => _pendingPairId = pair.candidateId);
    try {
      // provider-graph: ownership-widget-async-callback:_HostPeopleDuplicatesScreenState._command:await:command watch CAT156 -- Each merge command runs through its HostDuplicateCommands mutation, which owns pending and error (listened to above); the widget keeps only which pair the running command acts on, for that card's spinner. Move the pair id into the mutation state in the CAT156 migration.
      final result = await mutation.run(
        ref,
        (tx) => command(tx.get(hostDuplicateCommandsProvider)),
      );
      if (!mounted) return;
      refreshHostDuplicates(ref, widget.organizerId);
      onDone(result);
    } on Object {
      // The mutation is watched for errors, which the screen shows.
    } finally {
      if (mounted) setState(() => _pendingPairId = null);
    }
  }
}

/// Asks before undoing one merge into a person, then undoes it.
Future<void> confirmUndoHostMerge(
  BuildContext context,
  WidgetRef ref, {
  required String organizerId,
  required HostActiveContactMerge merge,
}) async {
  final l10n = context.l10n;
  final confirmed = await showCatchConfirmDialog(
    context: context,
    copy: catchDialogCopy(l10n),
    title: l10n.hostPeopleUndoMergeTitle,
    message: l10n.hostPeopleUndoMergeBody(name: merge.sourceDisplayName),
    confirmLabel: l10n.hostPeopleUndoMerge,
  );
  if (confirmed != true || !context.mounted) return;
  await undoHostMerge(
    context,
    ref,
    organizerId: organizerId,
    mergeReceiptId: merge.mergeReceiptId,
  );
}

/// Undoes one merge: the existing unmerge command on its receipt, then the
/// review is read again. The person pages follow their listeners.
Future<void> undoHostMerge(
  BuildContext context,
  WidgetRef ref, {
  required String organizerId,
  required String mergeReceiptId,
}) async {
  try {
    await HostDuplicateCommands.undoMutation.run(
      ref,
      (tx) => tx
          .get(hostDuplicateCommandsProvider)
          .undo(organizerId: organizerId, mergeReceiptId: mergeReceiptId),
    );
    if (!context.mounted) return;
    refreshHostDuplicates(ref, organizerId);
    showCatchNotice(
      context,
      context.l10n.hostPeopleUndoneNotice,
      tone: CatchNoticeTone.success,
    );
  } on Object {
    // The mutation is watched for errors, which the screen shows.
  }
}
