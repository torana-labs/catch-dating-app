import 'dart:async';

import 'package:catch_dating_app/contexts/audience/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact_detail.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_customer_memory.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/device/external_links.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class HostCustomerEmailHandoffSheet extends ConsumerStatefulWidget {
  const HostCustomerEmailHandoffSheet({super.key, required this.customer});

  final HostAudienceContactDetail customer;

  @override
  ConsumerState<HostCustomerEmailHandoffSheet> createState() =>
      _HostCustomerEmailHandoffSheetState();
}

class _HostCustomerEmailHandoffSheetState
    extends ConsumerState<HostCustomerEmailHandoffSheet> {
  TextEditingController? _messageController;
  bool _opening = false;

  TextEditingController get _message => _messageController!;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _messageController ??= TextEditingController(
      text: context.l10n.hostCustomersEmailDefaultMessage(
        name: widget.customer.displayName,
      ),
    );
  }

  @override
  void dispose() {
    _messageController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final message = _message.text.trim();
    return CatchSheet.standard(
      title: context.l10n.hostCustomersEmailHandoffTitle,
      subtitle: context.l10n.hostCustomersEmailHandoffSubtitle(
        name: widget.customer.displayName,
        email: widget.customer.email!,
      ),
      footer: CatchButton.sheet(
        role: CatchButtonEmphasis.commit,
        key: const ValueKey('host-customer-confirm-email'),
        label: context.l10n.hostCustomersOpenEmail,
        status: (_opening) ? CatchButtonStatus.loading : CatchButtonStatus.idle,
        onPressed: _opening || message.isEmpty ? null : _open,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          CatchNotice(
            dismissLabel: context.l10n.coreCatchNoticeTooltipDismiss,
            notice: CatchNoticeData(
              id: 'host.customer.email-handoff',
              title: context.l10n.hostCustomersEmailAppChannel,
              message: context.l10n.hostCustomersEmailHandoffDisclosure,
            ),
          ),
          gapH16,
          CatchFieldLanes.single(
            child: CatchField.input(
              copy: catchFieldCopy(context.l10n),
              key: const ValueKey('host-customer-email-message'),
              title: context.l10n.hostCustomersEmailMessage,
              controller: _message,
              minLines: 3,
              maxLines: 7,
              maxLength: 1000,
              textCapitalization: TextCapitalization.sentences,
              contractExemption:
                  'Editable handoff copy is passed to the external mail app '
                  'and never persisted; only the outreach attempt is '
                  'recorded.',
              states: <WidgetState>{if (_opening) WidgetState.disabled},
              onChanged: (_) => setState(() {}),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _open() async {
    if (_opening) return;
    final email = widget.customer.email;
    if (email == null || email.trim().isEmpty) return;
    setState(() => _opening = true);
    try {
      // provider-graph: ownership-widget-async:_HostCustomerEmailHandoffSheetState._open:await:externalLinkControllerProvider.open watch CAT156 -- Existing bounded review signal at _HostCustomerEmailHandoffSheetState._open (await:externalLinkControllerProvider.open). The method combines local completion publication with an awaited provider seam or declared Future callback. Its mutated fields/caller contract need focused classification: navigation, form/media/animation feedback may be mechanical, while loaded data, authorization, server pending/error or retry identity need a generated owner. This watch disposition does not certify compliance or declare a confirmed violation; inspect the exact responsibility before its CAT156 migration.
      final opened = await ref
          .read(externalLinkControllerProvider)
          .open(
            Uri(
              scheme: 'mailto',
              path: email,
              queryParameters: {'body': _message.text.trim()},
            ),
          );
      if (!opened) {
        if (!mounted) return;
        throw ExternalActionException(
          context.l10n.hostCustomersEmailOpenFailed,
        );
      }
      try {
        // provider-graph: ownership-widget-async:_HostCustomerEmailHandoffSheetState._open:await:hostCustomersControllerProvider.recordOutreach watch CAT156 -- Existing bounded review signal at _HostCustomerEmailHandoffSheetState._open (await:hostCustomersControllerProvider.recordOutreach). The method combines local completion publication with an awaited provider seam or declared Future callback. Its mutated fields/caller contract need focused classification: navigation, form/media/animation feedback may be mechanical, while loaded data, authorization, server pending/error or retry identity need a generated owner. This watch disposition does not certify compliance or declare a confirmed violation; inspect the exact responsibility before its CAT156 migration.
        await ref
            .read(hostCustomersControllerProvider)
            .recordOutreach(
              organizerId: widget.customer.organizerId,
              contactId: widget.customer.contactId,
              channel: HostCustomerOutreachChannel.email,
              outcome: HostCustomerOutreachOutcome.attempted,
            );
      } on Object {
        if (!mounted) return;
        showCatchNoticeError(
          context,
          ExternalActionException(context.l10n.hostCustomersEmailRecordFailed),
          errorContext: AppErrorContext.customer,
        );
      }
      ref.invalidate(
        hostAudienceContactDetailProvider(
          widget.customer.organizerId,
          widget.customer.contactId,
        ),
      );
      if (mounted) Navigator.of(context).pop();
    } on Object catch (error) {
      if (mounted) {
        showCatchNoticeError(
          context,
          error,
          errorContext: AppErrorContext.customer,
        );
      }
    } finally {
      if (mounted) setState(() => _opening = false);
    }
  }
}
