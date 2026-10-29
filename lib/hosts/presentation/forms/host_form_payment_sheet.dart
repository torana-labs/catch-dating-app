import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_payment.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class HostFormPaymentSheet extends StatefulWidget {
  const HostFormPaymentSheet({
    super.key,
    required this.payment,
    required this.connections,
    this.collectThroughCatch = false,
    this.collectionMode,
  });
  final bool collectThroughCatch;
  final HostFormPaymentMode? collectionMode;
  final HostFormPayment? payment;
  final List<HostFormPaymentConnection> connections;
  @override
  State<HostFormPaymentSheet> createState() => _HostFormPaymentSheetState();
}

class _HostFormPaymentSheetState extends State<HostFormPaymentSheet> {
  late String? _connectionId;
  late String _amount;
  String? _description;
  late String _refundPolicy;

  @override
  void initState() {
    super.initState();
    _connectionId = widget.collectThroughCatch
        ? null
        : widget.connections.any(
            (c) => c.connectionId == widget.payment?.connectionId,
          )
        ? widget.payment!.connectionId!
        : widget.connections.firstOrNull?.connectionId;
    _amount = widget.payment?.rupees ?? '100';
    _description = widget.payment?.description;
    _refundPolicy = widget.payment?.refundPolicy ?? '';
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final amount = HostFormPayment.parseRupees(_amount);
    final description = (_description ?? l10n.hostFormPaymentDescriptionDefault)
        .trim();
    final canSave =
        (widget.collectThroughCatch || _connectionId != null) &&
        amount != null &&
        description.isNotEmpty &&
        description.length <= 160 &&
        _refundPolicy.trim().isNotEmpty &&
        _refundPolicy.trim().length <= 1000;
    return CatchSheet.standard(
      title: l10n.hostFormPaymentConfigure,
      subtitle: l10n.hostFormPaymentHelp,
      footer: CatchButton.sheet(
        label: l10n.hostFormPaymentSave,
        role: CatchButtonEmphasis.commit,
        onPressed: !canSave
            ? null
            : () => Navigator.of(context).pop(
                HostFormPayment(
                  connectionId: _connectionId,
                  amountPaise: amount,
                  description: description,
                  refundPolicy: _refundPolicy.trim(),
                ),
              ),
      ),
      child: CatchSection.containedFieldRows(
        children: [
          if (widget.collectThroughCatch)
            CatchField.read(
              copy: catchFieldCopy(l10n),
              title: l10n.hostFormPaymentCatchCollection,
              body: widget.collectionMode == HostFormPaymentMode.test
                  ? l10n.hostFormPaymentTest
                  : l10n.hostFormPaymentLive,
            )
          else
            CatchField<String>.select(
              copy: catchFieldCopy(l10n),
              title: l10n.hostFormPaymentAccount,
              value: _connectionId,
              values: widget.connections.map((c) => c.connectionId).toList(),
              contract: CatchContractConstraints
                  .organizerFormDraftDocumentDefinitionPaymentConnectionId,
              contractValueBuilder: (value) => value,
              itemLabelBuilder: (value) => widget.connections
                  .firstWhere((c) => c.connectionId == value)
                  .accountId!,
              helperText:
                  widget.connections
                          .firstWhere((c) => c.connectionId == _connectionId)
                          .mode ==
                      HostFormPaymentMode.test
                  ? l10n.hostFormPaymentTest
                  : l10n.hostFormPaymentLive,
              onChanged: (value) {
                if (value != null) setState(() => _connectionId = value);
              },
            ),
          CatchField.input(
            copy: catchFieldCopy(l10n),
            title: l10n.hostFormPaymentAmount,
            initialValue: _amount,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            contractExemption:
                'Exact decimal INR input maps to contract-validated integer paise.',
            helperText: l10n.hostFormPaymentAmountHelp,
            errorText: amount == null ? l10n.hostFormPaymentAmountHelp : null,
            onChanged: (value) => setState(() => _amount = value),
          ),
          CatchField.input(
            copy: catchFieldCopy(l10n),
            title: l10n.hostFormPaymentDescription,
            initialValue: description,
            contract: CatchContractConstraints
                .organizerFormDraftDocumentDefinitionPaymentDescription,
            onChanged: (value) => setState(() => _description = value),
          ),
          CatchField.input(
            copy: catchFieldCopy(l10n),
            title: l10n.hostFormPaymentRefundPolicy,
            initialValue: _refundPolicy,
            maxLines: 4,
            helperText: l10n.hostFormPaymentRefundHelp,
            contract: CatchContractConstraints
                .organizerFormDraftDocumentDefinitionPaymentRefundPolicy,
            onChanged: (value) => setState(() => _refundPolicy = value),
          ),
        ],
      ),
    );
  }
}
