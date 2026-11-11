import 'dart:async';
import 'dart:math';

import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_bill_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_planner_commands_controller.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_reconcile_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/device/external_share.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final _random = Random.secure();

/// Checking a bill (RbProgReconcile), from `reconcileProgramVendorBill`.
/// Check the bill stores pasted lines; Send the questions stores the note
/// and opens the share sheet so the planner sends it; Approve approves the
/// recorded total.
class HostProgrammeReconcileScreen extends ConsumerStatefulWidget {
  const HostProgrammeReconcileScreen({
    super.key,
    required this.programId,
    required this.vendorId,
  });

  final String programId;
  final String vendorId;

  @override
  ConsumerState<HostProgrammeReconcileScreen> createState() =>
      _HostProgrammeReconcileScreenState();
}

class _HostProgrammeReconcileScreenState
    extends ConsumerState<HostProgrammeReconcileScreen> {
  final _invoice = TextEditingController();
  final _lines = TextEditingController();
  final _note = TextEditingController();
  bool _editing = false;
  bool _busy = false;
  bool _noteSeeded = false;

  @override
  void dispose() {
    _invoice.dispose();
    _lines.dispose();
    _note.dispose();
    super.dispose();
  }

  Future<bool> _run(
    ProgramVendorBillView view,
    ProgramBillAction action,
  ) async {
    final l10n = context.l10n;
    final lines = action == ProgramBillAction.check
        ? ProgramBillLineInput.parse(_lines.text)
        : null;
    if (lines != null && lines.isEmpty) {
      showCatchNotice(
        context,
        l10n.hostProgrammeBillLinesEmpty,
        tone: CatchNoticeTone.danger,
      );
      return false;
    }
    setState(() => _busy = true);
    var ok = true;
    try {
      await ref
          .read(hostProgrammePlannerCommandsProvider.notifier)
          .reconcileVendorBill(
            programId: widget.programId,
            vendorId: widget.vendorId,
            action: action,
            expectedRevision: view.bill?.revision ?? 0,
            requestId:
                'bill-${DateTime.now().microsecondsSinceEpoch}-'
                '${_random.nextInt(1 << 30)}',
            invoiceNumber: _invoice.text.trim().isEmpty
                ? null
                : _invoice.text.trim(),
            lines: lines,
            note: action == ProgramBillAction.question
                ? _note.text.trim()
                : null,
          );
    } on Object {
      ok = false;
    }
    ref.invalidate(
      programVendorBillViewProvider(widget.programId, widget.vendorId),
    );
    if (!mounted) return ok;
    setState(() {
      _busy = false;
      if (ok && action == ProgramBillAction.check) _editing = false;
    });
    if (!ok) {
      showCatchNotice(
        context,
        l10n.hostProgrammeBillFailed,
        tone: CatchNoticeTone.danger,
      );
    }
    return ok;
  }

  Future<void> _question(ProgramVendorBillView view) async {
    final l10n = context.l10n;
    if (_note.text.trim().isEmpty) {
      showCatchNotice(
        context,
        l10n.hostProgrammeBillNoteEmpty,
        tone: CatchNoticeTone.danger,
      );
      return;
    }
    final box = context.findRenderObject() as RenderBox?;
    final origin = box == null
        ? null
        : box.localToGlobal(Offset.zero) & box.size;
    final questions = view.bill?.toQuestion ?? const <ProgramBillLine>[];
    String money(int minor) => hostProgrammeMoney(minor, view.currency);
    final text = [
      _note.text.trim(),
      '',
      for (final line in questions)
        '• ${line.reference}: ${money(line.billedMinor)}',
    ].join('\n');
    if (!await _run(view, ProgramBillAction.question) || !mounted) return;
    await ref
        .read(externalShareControllerProvider)
        .shareText(
          text: text,
          subject: l10n.hostProgrammeBillShareSubject(vendor: view.vendorName),
          origin: origin,
        );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final read = catchAsyncStateFromAsyncValue(
      ref.watch(
        programVendorBillViewProvider(widget.programId, widget.vendorId),
      ),
    );
    final view = read.value?.value;
    if (!_noteSeeded && view != null) {
      // The stored note seeds the field once; later edits are the planner's.
      _noteSeeded = true;
      _note.text = view.bill?.note ?? '';
    }
    return CatchRoot(
      format: CatchFormat.nightsOut,
      child: CatchScreen(
        key: const ValueKey<String>('host-programme-reconcile-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          back: CatchTopBarBack(label: l10n.hostProgrammeBackToProgramme),
          title: l10n.hostProgrammeBillTitle,
        ),
        bodyScrolls: false,
        body: HostProgrammeReconcileBody(
          status: hostProgrammeStatusOf(read),
          view: view,
          editing: _editing,
          busy: _busy,
          invoiceController: _invoice,
          linesController: _lines,
          noteController: _note,
          onCheck: () => unawaited(_run(view!, ProgramBillAction.check)),
          onNewBill: () => setState(() => _editing = true),
          onQuestion: () => unawaited(_question(view!)),
          onApprove: () => unawaited(_run(view!, ProgramBillAction.approve)),
          onRetry: () => ref.invalidate(
            programVendorBillViewProvider(widget.programId, widget.vendorId),
          ),
        ),
      ),
    );
  }
}
