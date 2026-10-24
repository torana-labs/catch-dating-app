import 'dart:async';

import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/hosts/data/crm/host_whatsapp_repository.dart';
import 'package:catch_dating_app/hosts/domain/crm/host_whatsapp_thread.dart';
import 'package:catch_dating_app/hosts/presentation/host_audience_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

class HostWhatsappThreadSheet extends ConsumerStatefulWidget {
  const HostWhatsappThreadSheet({
    super.key,
    required this.organizerId,
    required this.threadId,
  });

  final String organizerId;
  final String threadId;

  @override
  ConsumerState<HostWhatsappThreadSheet> createState() =>
      _HostWhatsappThreadSheetState();
}

class _HostWhatsappThreadSheetState
    extends ConsumerState<HostWhatsappThreadSheet> {
  final _replyController = TextEditingController();
  late Future<HostWhatsappThreadDetail> _thread;
  bool _sending = false;
  String? _replyIdempotencyKey;
  String? _replyIdempotencyBody;

  @override
  void initState() {
    super.initState();
    _thread = _load();
  }

  @override
  void dispose() {
    _replyController.dispose();
    super.dispose();
  }

  Future<HostWhatsappThreadDetail> _load() => ref
      .read(hostAudienceControllerProvider)
      .getWhatsappThread(
        organizerId: widget.organizerId,
        threadId: widget.threadId,
      );

  void _reload() => setState(() => _thread = _load());

  @override
  Widget build(BuildContext context) => FutureBuilder<HostWhatsappThreadDetail>(
    future: _thread,
    builder: (context, snapshot) => CatchSheet.standard(
      title:
          snapshot.data?.displayName ?? context.l10n.hostInboxWhatsappChannel,
      subtitle: context.l10n.hostInboxWhatsappChannel,
      child: switch (snapshot.connectionState) {
        ConnectionState.none || ConnectionState.waiting
            when snapshot.data == null =>
          const CatchStateViewport.loading(accountForBottomOverlay: false),
        _ when snapshot.hasError => CatchLocalizedErrorState(
          snapshot.error!,
          context: AppErrorContext.chat,
          onRetry: _reload,
        ),
        _ => _HostWhatsappThreadBody(
          thread: snapshot.requireData,
          replyController: _replyController,
          sending: _sending,
          onSend: () => unawaited(_send(snapshot.requireData)),
        ),
      },
    ),
  );

  Future<void> _send(HostWhatsappThreadDetail thread) async {
    final body = _replyController.text.trim();
    if (body.isEmpty || _sending) return;
    if (_replyIdempotencyBody != body || _replyIdempotencyKey == null) {
      _replyIdempotencyBody = body;
      _replyIdempotencyKey =
          'reply-${widget.threadId}-'
          '${DateTime.now().microsecondsSinceEpoch}';
    }
    setState(() => _sending = true);
    try {
      await ref
          .read(hostAudienceControllerProvider)
          .sendWhatsappReply(
            organizerId: widget.organizerId,
            thread: thread,
            body: body,
            idempotencyKey: _replyIdempotencyKey!,
          );
      _replyController.clear();
      _replyIdempotencyKey = null;
      _replyIdempotencyBody = null;
      ref.invalidate(hostWhatsappThreadsProvider(widget.organizerId));
      _reload();
    } on Object catch (error) {
      if (mounted) {
        showCatchNoticeError(
          context,
          error,
          errorContext: AppErrorContext.chat,
        );
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }
}

class _HostWhatsappThreadBody extends StatelessWidget {
  const _HostWhatsappThreadBody({
    required this.thread,
    required this.replyController,
    required this.sending,
    required this.onSend,
  });

  final HostWhatsappThreadDetail thread;
  final TextEditingController replyController;
  final bool sending;
  final VoidCallback onSend;

  @override
  Widget build(BuildContext context) => Column(
    mainAxisSize: MainAxisSize.min,
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (thread.messagesTruncated) ...[
            CatchText(
              context.l10n.hostInboxWhatsappHistoryTruncated,
              variant: CatchTextVariant.supporting,
            ),
            gapH12,
          ],
          for (final message in thread.messages) ...[
            Align(
              alignment:
                  message.direction == HostWhatsappMessageDirection.outbound
                  ? Alignment.centerRight
                  : Alignment.centerLeft,
              child: CatchSurface(
                width: MediaQuery.sizeOf(context).width * 0.72,
                padding: CatchInsets.cardContent,
                child: CatchText(
                  message.body,
                  variant: CatchTextVariant.bodyM,
                  color: CatchTokens.of(context).ink,
                ),
              ),
            ),
            gapH8,
          ],
        ],
      ),
      CatchText(
        thread.serviceWindowOpen
            ? context.l10n.hostInboxWhatsappWindowOpen(
                time: DateFormat.jm().format(thread.serviceWindowExpiresAt),
              )
            : context.l10n.hostInboxWhatsappWindowClosed,
        variant: CatchTextVariant.supporting,
      ),
      gapH8,
      CatchFieldLanes.single(
        child: CatchField.input(
          copy: catchFieldCopy(context.l10n),
          title: context.l10n.hostInboxWhatsappReplyHint,
          contract: CatchContractConstraints
              .sendOrganizerWhatsappReplyCallablePayloadBody,
          controller: replyController,
          maxLines: 4,
          minLines: 2,
          states: <WidgetState>{
            if (!(thread.serviceWindowOpen && !sending)) WidgetState.disabled,
          },
          labelMode: CatchFieldLabelTextMode.hidden,
          inputHint: context.l10n.hostInboxWhatsappReplyHint,
        ),
      ),
      gapH8,
      CatchButton(
        label: context.l10n.hostInboxWhatsappReply,
        status: (sending) ? CatchButtonStatus.loading : CatchButtonStatus.idle,
        onPressed: !thread.serviceWindowOpen || sending ? null : onSend,
      ),
    ],
  );
}
