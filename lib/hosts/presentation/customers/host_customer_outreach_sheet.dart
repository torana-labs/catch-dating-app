import 'dart:async';

import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact_detail.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_customer_memory.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class HostCustomerOutreachSheet extends ConsumerStatefulWidget {
  const HostCustomerOutreachSheet({super.key, required this.customer});

  final HostAudienceContactDetail customer;

  @override
  ConsumerState<HostCustomerOutreachSheet> createState() =>
      _HostCustomerOutreachSheetState();
}

class _HostCustomerOutreachSheetState
    extends ConsumerState<HostCustomerOutreachSheet> {
  HostCustomerOutreachChannel _channel = HostCustomerOutreachChannel.phoneCall;
  HostCustomerOutreachOutcome _outcome = HostCustomerOutreachOutcome.reached;
  final TextEditingController _noteController = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => CatchSheet.standard(
    footer: CatchButton.sheet(
      role: CatchButtonEmphasis.commit,

      key: const ValueKey('host-customer-save-outreach'),
      label: context.l10n.hostCustomersLogOutreach,
      status: (_saving) ? CatchButtonStatus.loading : CatchButtonStatus.idle,
      onPressed: _saving ? null : _save,
    ),
    title: context.l10n.hostCustomersLogOutreach,
    subtitle: context.l10n.hostCustomersLogOutreachBody,
    child: CatchFieldLanes.custom(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          CatchSelectionMenu<HostCustomerOutreachChannel>.control(
            title: context.l10n.hostCustomersOutreachChannelField,
            tooltip: context.l10n.hostCustomersOutreachChannelField,
            buttonKey: const ValueKey('host-customer-outreach-channel'),
            value: _channel,
            labelBuilder: (item) => context.l10n.hostCustomersOutreachChannel(
              channel: item.value.name,
            ),
            onSelected: (value) => setState(() => _channel = value),
            items: [
              for (final channel in HostCustomerOutreachChannel.values)
                CatchSelectionMenuItem(
                  value: channel,
                  label: context.l10n.hostCustomersOutreachChannel(
                    channel: channel.name,
                  ),
                ),
            ],
          ),
          gapH16,
          CatchSelectionMenu<HostCustomerOutreachOutcome>.control(
            title: context.l10n.hostCustomersOutreachOutcomeField,
            tooltip: context.l10n.hostCustomersOutreachOutcomeField,
            buttonKey: const ValueKey('host-customer-outreach-outcome'),
            value: _outcome,
            labelBuilder: (item) => context.l10n.hostCustomersOutreachOutcome(
              outcome: item.value.name,
            ),
            onSelected: (value) => setState(() => _outcome = value),
            items: [
              for (final outcome in HostCustomerOutreachOutcome.values)
                CatchSelectionMenuItem(
                  value: outcome,
                  label: context.l10n.hostCustomersOutreachOutcome(
                    outcome: outcome.name,
                  ),
                ),
            ],
          ),
          gapH16,
          CatchField.input(
            copy: catchFieldCopy(context.l10n),
            key: const ValueKey('host-customer-outreach-note'),
            title: context.l10n.hostCustomersOutreachNote,
            contract: CatchContractConstraints
                .recordOrganizerContactOutreachCallablePayloadNote,
            controller: _noteController,
            minLines: 2,
            maxLines: 5,
            textCapitalization: TextCapitalization.sentences,
          ),
        ],
      ),
    ),
  );

  Future<void> _save() async {
    if (_saving) return;
    setState(() => _saving = true);
    try {
      final note = _noteController.text.trim();
      await ref
          .read(hostCustomersControllerProvider)
          .recordOutreach(
            organizerId: widget.customer.organizerId,
            contactId: widget.customer.contactId,
            channel: _channel,
            outcome: _outcome,
            note: note.isEmpty ? null : note,
          );
      if (mounted) Navigator.of(context).pop(true);
    } on Object catch (error) {
      if (mounted) {
        showCatchNoticeError(
          context,
          error,
          errorContext: AppErrorContext.club,
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }
}
