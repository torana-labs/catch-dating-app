import 'package:catch_dating_app/contexts/programmes/domain/program_bill_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:catch_dating_app/hosts/programmes/planner/widgets/programme_state_body.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:intl/intl.dart';

/// Whole-rupee money as the bill prints it, such as ₹1,26,000.
String hostProgrammeMoney(int minor, String currency) =>
    NumberFormat.simpleCurrency(
      locale: 'en_IN',
      name: currency,
      decimalDigits: 0,
    ).format(minor / 100);

/// Checking a bill (RbProgReconcile) as a feed beside its aside. The main
/// column: the vendor and invoice, the bill lines against the recorded
/// trips and three totals, or the form that takes a new bill. The aside:
/// the lines to question, the note to the vendor, Send the questions and
/// Approve, and the recorded trips the bill leaves out.
class HostProgrammeReconcileBody extends StatelessWidget {
  const HostProgrammeReconcileBody({
    super.key,
    required this.status,
    required this.view,
    required this.editing,
    required this.invoiceController,
    required this.linesController,
    required this.noteController,
    required this.onCheck,
    required this.onNewBill,
    required this.onQuestion,
    required this.onApprove,
    required this.onRetry,
    this.busy = false,
  });

  final HostProgrammeStatus status;
  final ProgramVendorBillView? view;

  /// Shows the form that takes a new bill.
  final bool editing;
  final TextEditingController invoiceController;
  final TextEditingController linesController;
  final TextEditingController noteController;
  final VoidCallback onCheck;
  final VoidCallback onNewBill;
  final VoidCallback onQuestion;
  final VoidCallback onApprove;
  final VoidCallback onRetry;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final view = this.view;
    if (status != HostProgrammeStatus.ready || view == null) {
      return HostProgrammeStateBody(status: status, onRetry: onRetry);
    }
    String money(int minor) => hostProgrammeMoney(minor, view.currency);
    final bill = editing ? null : view.bill;
    final main = bill == null
        ? _HostProgrammeBillForm(
            view: view,
            invoiceController: invoiceController,
            linesController: linesController,
            busy: busy,
            onCheck: onCheck,
          )
        : CatchStack(
            gap: CatchStackGap.g16,
            children: [
              CatchText(
                bill.invoiceNumber == null
                    ? view.vendorName
                    : l10n.hostProgrammeBillHeading(
                        vendor: view.vendorName,
                        invoice: bill.invoiceNumber!,
                      ),
                variant: CatchTextVariant.displaySm,
              ),
              CatchText(
                [
                  if (bill.receivedAt != null)
                    l10n.hostProgrammeBillReceived(
                      date: AppTimeFormatters.monthDay(bill.receivedAt!),
                    ),
                  l10n.hostProgrammeBillCounts(
                    billed: bill.lines.length,
                    recorded: bill.recordedTrips,
                  ),
                ].join(' · '),
                variant: CatchTextVariant.bodySmall,
                tone: CatchTextTone.secondary,
              ),
              CatchSurface(
                block: CatchSurfaceBlock.floating,
                child: CatchTable(
                  label: l10n.hostProgrammeBillTable,
                  columns: [
                    CatchTableColumn(
                      label: l10n.hostProgrammeBillOnTheBill,
                      variant: CatchTableColumnVariant.title,
                      flex: 3,
                    ),
                    CatchTableColumn(
                      label: l10n.hostProgrammeBillBilled,
                      variant: CatchTableColumnVariant.number,
                    ),
                    CatchTableColumn(
                      label: l10n.hostProgrammeBillRecorded,
                      variant: CatchTableColumnVariant.number,
                    ),
                    CatchTableColumn(
                      label: l10n.hostProgrammeBillCheck,
                      variant: CatchTableColumnVariant.badge,
                    ),
                  ],
                  children: [
                    for (final line in bill.lines)
                      CatchTableRow.cells(
                        key: ValueKey<String>('host-bill-${line.lineId}'),
                        cells: [
                          CatchTableCell.title(
                            line.reference,
                            subtitle: line.tripId,
                          ),
                          CatchTableCell.text(money(line.billedMinor)),
                          CatchTableCell.text(
                            line.recordedMinor == null
                                ? '—'
                                : money(line.recordedMinor!),
                            tone: CatchTableCellTone.secondary,
                          ),
                          CatchTableCell.badge(
                            hostProgrammeBillBadge(l10n, line.check),
                          ),
                        ],
                      ),
                  ],
                ),
              ),
              CatchStack(
                direction: CatchStackDirection.row,
                equal: true,
                children: [
                  CatchMetricTile.stat(
                    label: l10n.hostProgrammeBillBilled,
                    value: money(bill.billedMinor),
                  ),
                  CatchMetricTile.stat(
                    label: l10n.hostProgrammeBillRecorded,
                    value: money(bill.recordedMinor),
                  ),
                  CatchMetricTile.stat(
                    label: l10n.hostProgrammeBillToQuestion,
                    value: money(bill.questionMinor),
                    note: bill.questionMinor == 0
                        ? null
                        : l10n.hostProgrammeBillToQuestionNote,
                    noteTone: CatchMetricTileTone.warning,
                  ),
                ],
              ),
            ],
          );
    final questions = bill?.toQuestion ?? const <ProgramBillLine>[];
    final aside = CatchStack(
      gap: CatchStackGap.g16,
      children: [
        if (bill != null) ...[
          CatchText(
            l10n.hostProgrammeBillQuestionsTitle(count: questions.length),
            variant: CatchTextVariant.titleBar,
          ),
          CatchSection(
            empty: l10n.hostProgrammeBillQuestionsEmpty,
            children: [
              for (final line in questions)
                CatchIndexRow(
                  title: line.reference,
                  subtitle: hostProgrammeBillReason(
                    l10n,
                    line,
                    money(line.billedMinor),
                    line.recordedMinor == null
                        ? null
                        : money(line.recordedMinor!),
                  ),
                  marker: CatchIndexRowTone.warning,
                  onTap: null,
                ),
            ],
          ),
          if (bill.status != ProgramBillStatus.approved) ...[
            CatchFieldLanes.single(
              child: CatchField.input(
                key: const ValueKey<String>('host-bill-note'),
                copy: catchFieldCopy(l10n),
                title: l10n.hostProgrammeBillNote(vendor: view.vendorName),
                contractExemption: 'Free-text note to a transport vendor.',
                controller: noteController,
                maxLines: 5,
                minLines: 3,
                maxLength: 1000,
              ),
            ),
            CatchButton(
              key: const ValueKey<String>('host-bill-question'),
              label: l10n.hostProgrammeBillSendQuestions(
                count: questions.length,
              ),
              leading: CatchIcon(CatchIcons.send),
              fullWidth: true,
              status: busy ? CatchButtonStatus.loading : CatchButtonStatus.idle,
              onPressed: busy || questions.isEmpty ? null : onQuestion,
            ),
            CatchButton(
              key: const ValueKey<String>('host-bill-approve'),
              label: l10n.hostProgrammeBillApprove(
                amount: money(bill.recordedMinor),
              ),
              variant: CatchButtonVariant.secondary,
              fullWidth: true,
              onPressed: busy ? null : onApprove,
            ),
          ] else
            CatchNotice.inline(
              tone: CatchNoticeTone.success,
              icon: CatchIcons.check,
              body: l10n.hostProgrammeBillApproved(
                amount: money(bill.approvedMinor ?? bill.recordedMinor),
              ),
            ),
          CatchButton(
            key: const ValueKey<String>('host-bill-new'),
            label: l10n.hostProgrammeBillNew,
            variant: CatchButtonVariant.quiet,
            onPressed: busy ? null : onNewBill,
          ),
        ],
        CatchSection(
          title: l10n.hostProgrammeBillUnbilled,
          empty: l10n.hostProgrammeBillUnbilledEmpty,
          children: [
            for (final trip in view.unbilled)
              CatchIndexRow(
                title: trip.destinationLabel ?? trip.tripId,
                subtitle: trip.departedAt == null
                    ? null
                    : AppTimeFormatters.dateTime(trip.departedAt!),
                value: trip.recordedMinor == null
                    ? null
                    : money(trip.recordedMinor!),
                onTap: null,
              ),
          ],
        ),
      ],
    );
    return CatchScrollView(
      primary: false,
      child: CatchPageBody(
        child: CatchPaneLayout(
          pattern: CatchPaneLayoutMode.feed,
          children: [main, aside],
        ),
      ),
    );
  }
}

/// A new bill: the invoice number and the pasted lines, then Check.
class _HostProgrammeBillForm extends StatelessWidget {
  const _HostProgrammeBillForm({
    required this.view,
    required this.invoiceController,
    required this.linesController,
    required this.busy,
    required this.onCheck,
  });

  final ProgramVendorBillView view;
  final TextEditingController invoiceController;
  final TextEditingController linesController;
  final bool busy;
  final VoidCallback onCheck;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return CatchStack(
      gap: CatchStackGap.g16,
      children: [
        CatchText(view.vendorName, variant: CatchTextVariant.displaySm),
        CatchText(
          l10n.hostProgrammeBillRecordedSummary(
            count: view.recordedTrips,
            amount: hostProgrammeMoney(view.recordedMinor, view.currency),
          ),
          variant: CatchTextVariant.bodySmall,
          tone: CatchTextTone.secondary,
        ),
        CatchFieldLanes.single(
          child: CatchField.input(
            key: const ValueKey<String>('host-bill-invoice'),
            copy: catchFieldCopy(l10n),
            title: l10n.hostProgrammeBillInvoice,
            contractExemption: 'Vendor invoice number.',
            controller: invoiceController,
            maxLength: 80,
          ),
        ),
        CatchFieldLanes.single(
          child: CatchField.input(
            key: const ValueKey<String>('host-bill-lines'),
            copy: catchFieldCopy(l10n),
            title: l10n.hostProgrammeBillLines,
            helperText: l10n.hostProgrammeBillLinesHelp,
            contractExemption: 'Pasted vendor bill lines.',
            controller: linesController,
            maxLines: 12,
            minLines: 6,
          ),
        ),
        CatchButton(
          key: const ValueKey<String>('host-bill-check'),
          label: l10n.hostProgrammeBillCheckButton,
          status: busy ? CatchButtonStatus.loading : CatchButtonStatus.idle,
          onPressed: busy ? null : onCheck,
        ),
      ],
    );
  }
}

/// A line's check as a badge.
CatchBadge hostProgrammeBillBadge(
  AppLocalizations l10n,
  ProgramBillCheck check,
) => switch (check) {
  ProgramBillCheck.matches => CatchBadge(
    label: l10n.hostProgrammeBillMatches,
    tone: CatchBadgeTone.success,
  ),
  ProgramBillCheck.amountDiffers => CatchBadge(
    label: l10n.hostProgrammeBillDiffers,
    tone: CatchBadgeTone.warning,
  ),
  ProgramBillCheck.noRate => CatchBadge(label: l10n.hostProgrammeBillNoRate),
  ProgramBillCheck.noTrip => CatchBadge(
    label: l10n.hostProgrammeBillNoTrip,
    tone: CatchBadgeTone.warning,
  ),
  ProgramBillCheck.voided => CatchBadge(
    label: l10n.hostProgrammeBillVoided,
    tone: CatchBadgeTone.warning,
  ),
  ProgramBillCheck.duplicate => CatchBadge(
    label: l10n.hostProgrammeBillDuplicate,
    tone: CatchBadgeTone.warning,
  ),
};

/// Why a line is questioned, in the vendor's terms.
String hostProgrammeBillReason(
  AppLocalizations l10n,
  ProgramBillLine line,
  String billed,
  String? recorded,
) => switch (line.check) {
  ProgramBillCheck.amountDiffers => l10n.hostProgrammeBillReasonDiffers(
    billed: billed,
    recorded: recorded ?? '—',
  ),
  ProgramBillCheck.noRate => l10n.hostProgrammeBillReasonNoRate(billed: billed),
  ProgramBillCheck.noTrip => l10n.hostProgrammeBillReasonNoTrip(billed: billed),
  ProgramBillCheck.voided => l10n.hostProgrammeBillReasonVoided(billed: billed),
  ProgramBillCheck.duplicate => l10n.hostProgrammeBillReasonDuplicate(
    billed: billed,
  ),
  ProgramBillCheck.matches => billed,
};
