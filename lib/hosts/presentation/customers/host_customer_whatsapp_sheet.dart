import 'package:catch_dating_app/contexts/audience/data/crm/host_communication_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact_detail.dart';
import 'package:catch_dating_app/hosts/presentation/host_audience_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/device/external_links.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class HostCustomerWhatsappHandoffSheet extends ConsumerStatefulWidget {
  const HostCustomerWhatsappHandoffSheet({super.key, required this.customer});

  final HostAudienceContactDetail customer;

  @override
  ConsumerState<HostCustomerWhatsappHandoffSheet> createState() =>
      _HostWhatsappHandoffSheetState();
}

class _HostWhatsappHandoffSheetState
    extends ConsumerState<HostCustomerWhatsappHandoffSheet> {
  TextEditingController? _messageController;
  late final String _requestId =
      'handoff_${DateTime.now().microsecondsSinceEpoch}_${widget.customer.contactId}';
  bool _opening = false;

  TextEditingController get _message => _messageController!;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _messageController ??= TextEditingController(
      text: context.l10n.hostCustomersWhatsappDefaultMessage(
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
      title: context.l10n.hostCustomersWhatsappHandoffTitle,
      subtitle: context.l10n.hostCustomersWhatsappHandoffSubtitle(
        name: widget.customer.displayName,
        phone: widget.customer.phoneE164!,
      ),
      footer: CatchButton.sheet(
        role: CatchButtonEmphasis.commit,
        key: const ValueKey('host-customer-confirm-whatsapp'),
        label: context.l10n.hostCustomersOpenWhatsapp,
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
              id: 'host.customer.whatsapp-handoff',
              title: context.l10n.hostCustomersWhatsappAppChannel,
              message: context.l10n.hostCustomersWhatsappHandoffDisclosure,
            ),
          ),
          gapH16,
          CatchFieldLanes.single(
            child: CatchField.input(
              copy: catchFieldCopy(context.l10n),
              key: const ValueKey('host-customer-whatsapp-message'),
              title: context.l10n.hostCustomersWhatsappMessage,
              controller: _message,
              minLines: 3,
              maxLines: 7,
              maxLength: 1000,
              textCapitalization: TextCapitalization.sentences,
              contractExemption:
                  'Editable handoff copy is persisted only in the bounded '
                  'TTL manual-send task, then passed to the external app.',
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
    setState(() => _opening = true);
    try {
      final controller = ref.read(hostAudienceControllerProvider);
      final task = await controller.prepareManualSendTask(
        organizerId: widget.customer.organizerId,
        contactId: widget.customer.contactId,
        requestId: _requestId,
        prefillText: _message.text,
      );
      ref.invalidate(hostManualSendTasksProvider(widget.customer.organizerId));
      final opened = await ref
          .read(externalLinkControllerProvider)
          .openWhatsappHandoff(
            phoneE164: task.phoneE164,
            message: task.prefillText,
          );
      if (!opened) {
        if (!mounted) return;
        throw ExternalActionException(
          context.l10n.hostCustomersWhatsappOpenFailed,
        );
      }
      try {
        await controller.recordManualHandoffOpened(task);
      } on Object {
        if (!mounted) return;
        showCatchNoticeError(
          context,
          ExternalActionException(
            context.l10n.hostCustomersWhatsappRecordFailed,
          ),
          errorContext: AppErrorContext.customer,
        );
      }
      ref.invalidate(hostManualSendTasksProvider(widget.customer.organizerId));
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
