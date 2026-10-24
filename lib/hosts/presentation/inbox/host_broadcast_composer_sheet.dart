import 'dart:async';

import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/events/data/event_callable_responses.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_broadcast_controller.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_view_model.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

typedef HostBroadcastRequestIdFactory = String Function();
typedef HostBroadcastSendAction = HostInboxBroadcastSendOperation;

enum HostBroadcastTemplate { reminder, meetingPoint, change }

extension HostBroadcastTemplateX on HostBroadcastTemplate {
  String label(AppLocalizations l10n) => switch (this) {
    HostBroadcastTemplate.reminder =>
      l10n.hostsHostBroadcastComposerSheetLabelReminder,
    HostBroadcastTemplate.meetingPoint =>
      l10n.hostsHostBroadcastComposerSheetLabelMeetingPoint,
    HostBroadcastTemplate.change =>
      l10n.hostsHostBroadcastComposerSheetLabelChange,
  };

  String description(AppLocalizations l10n) => switch (this) {
    HostBroadcastTemplate.reminder =>
      l10n.hostsHostBroadcastComposerSheetDescriptionConfirmTimingAndHelp,
    HostBroadcastTemplate.meetingPoint =>
      l10n.hostsHostBroadcastComposerSheetDescriptionShareArrivalNotesParking,
    HostBroadcastTemplate.change =>
      l10n.hostsHostBroadcastComposerSheetDescriptionCallOutAnImportant,
  };

  String bodyFor(Event event, AppLocalizations l10n) => switch (this) {
    HostBroadcastTemplate.reminder =>
      l10n.hostsHostBroadcastComposerSheetBodyforReminderForTitleDoors(
        title: event.title,
      ),
    HostBroadcastTemplate.meetingPoint =>
      l10n.hostsHostBroadcastComposerSheetBodyforWeAreMeetingAt(
        locationName: event.locationName,
      ),
    HostBroadcastTemplate.change =>
      l10n.hostsHostBroadcastComposerSheetBodyforQuickUpdateForTitle(
        title: event.title,
      ),
  };
}

class HostBroadcastComposerSheet extends ConsumerStatefulWidget {
  const HostBroadcastComposerSheet({
    super.key,
    required this.event,
    required this.bookedCount,
    required this.prospectiveCount,
    required this.initialSegment,
    this.sendingEnabled,
    this.initialTemplate,
    this.requestIdFactory,
    this.sendAction,
  });

  final Event event;
  final int bookedCount;
  final int prospectiveCount;
  final HostInboxAudienceSegment initialSegment;
  final bool? sendingEnabled;
  final HostBroadcastTemplate? initialTemplate;
  final HostBroadcastRequestIdFactory? requestIdFactory;
  final HostBroadcastSendAction? sendAction;

  @override
  ConsumerState<HostBroadcastComposerSheet> createState() =>
      _HostBroadcastComposerSheetState();
}

class _HostBroadcastComposerSheetState
    extends ConsumerState<HostBroadcastComposerSheet> {
  late final TextEditingController _bodyController;
  late EventBroadcastAudience _audience;
  HostBroadcastTemplate? _template;
  late String _requestId;
  bool _seededInitialTemplate = false;

  @override
  void initState() {
    super.initState();
    _bodyController = TextEditingController();
    _audience = widget.initialSegment == HostInboxAudienceSegment.booked
        ? EventBroadcastAudience.booked
        : EventBroadcastAudience.prospective;
    _template = widget.initialTemplate;
    _requestId = _generateRequestId();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_seededInitialTemplate) return;
    _seededInitialTemplate = true;
    if (_template case final template?) {
      _bodyController.text = template.bodyFor(widget.event, context.l10n);
    }
  }

  @override
  void dispose() {
    _bodyController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final mutation = ref.watch(HostInboxBroadcastController.sendMutation);
    final recipientCount = _recipientCount(_audience);
    final body = _bodyController.text.trim();
    final enabled =
        _sendingEnabled &&
        recipientCount > 0 &&
        body.isNotEmpty &&
        !mutation.isPending;

    return CatchSheet.standard(
      footer: CatchButton.sheet(
        role: CatchButtonEmphasis.commit,
        label: recipientCount == 1
            ? context.l10n.hostsHostBroadcastComposerSheetLabelSendTo1Person
            : context.l10n
                  .hostsHostBroadcastComposerSheetLabelSendToRecipientcountPeople(
                    recipientCount: recipientCount,
                  ),
        onPressed: enabled ? _send : null,
        status: (mutation.isPending)
            ? CatchButtonStatus.loading
            : CatchButtonStatus.idle,
      ),
      title: context.l10n.hostsHostBroadcastComposerSheetTitleNewBroadcast,
      subtitle: widget.event.title,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CatchNotice(
            dismissLabel: context.l10n.coreCatchNoticeTooltipDismiss,
            notice: CatchNoticeData(
              id: 'host.inbox.catch-announcement',
              title: context.l10n.hostSendsCatchAnnouncementChannel,
              message: context.l10n.hostInboxAnnouncementDisclosure,
            ),
          ),
          gapH20,
          Text(
            context.l10n.hostsHostBroadcastComposerSheetTextAudience,
            style: CatchTextStyles.fieldRowTitle(context),
          ),
          gapH8,
          CatchChoiceInput<EventBroadcastAudience>.segmented(
            contract: CatchContractConstraints
                .sendEventBroadcastCallablePayloadAudience,
            contractValueBuilder: (audience) => audience.name,
            options: [
              CatchOption(
                value: EventBroadcastAudience.booked,
                label: context.l10n
                    .hostsHostBroadcastComposerSheetLabelBookedBookedcount(
                      bookedCount: widget.bookedCount,
                    ),
              ),
              CatchOption(
                value: EventBroadcastAudience.prospective,
                label: context.l10n
                    .hostsHostBroadcastComposerSheetLabelWaitlistProspectivecount(
                      prospectiveCount: widget.prospectiveCount,
                    ),
              ),
              CatchOption(
                value: EventBroadcastAudience.everyone,
                label: context.l10n
                    .hostsHostBroadcastComposerSheetLabelEveryoneRecipientcount(
                      recipientCount: _recipientCount(
                        EventBroadcastAudience.everyone,
                      ),
                    ),
              ),
            ],
            selected: _audience,
            scrollable: true,
            onChanged: mutation.isPending ? null : _selectAudience,
          ),
          gapH20,
          Text(
            context.l10n.hostsHostBroadcastComposerSheetTextTemplate,
            style: CatchTextStyles.fieldRowTitle(context),
          ),
          gapH8,
          CatchChoiceInput<HostBroadcastTemplate>.described(
            values: HostBroadcastTemplate.values,
            itemLabelBuilder: (template) => template.label(context.l10n),
            itemSubtitleBuilder: (template) =>
                template.description(context.l10n),
            selected: {?_template},
            contract:
                CatchContractConstraints.mobileFormStateHostBroadcastTemplate,
            contractValueBuilder: (template) => template.name,
            onChanged: mutation.isPending
                ? null
                : (selection) => _selectTemplate(selection.single),
          ),
          gapH20,
          CatchFieldLanes.single(
            child: CatchField.input(
              copy: catchFieldCopy(context.l10n),
              title: context.l10n.hostsHostBroadcastComposerSheetTitleMessage,
              contract: CatchContractConstraints
                  .sendEventBroadcastCallablePayloadBody,
              controller: _bodyController,
              placeholder: context
                  .l10n
                  .hostsHostBroadcastComposerSheetPlaceholderWriteAClearUpdate,
              minLines: 3,
              maxLines: 5,
              states: <WidgetState>{
                if (mutation.isPending) WidgetState.disabled,
              },
              textCapitalization: TextCapitalization.sentences,
              onChanged: (_) => _handleContentChanged(),
            ),
          ),
          if (!_sendingEnabled) ...[
            gapH12,
            CatchText(
              context.l10n.hostsHostBroadcastComposerSheetTextSendingStaysOffIn,
              variant: CatchTextVariant.supporting,
              color: t.ink2,
            ),
          ],
          if (recipientCount == 0) ...[
            gapH12,
            CatchText(
              context.l10n.hostsHostBroadcastComposerSheetTextThisAudienceHasNo,
              variant: CatchTextVariant.supporting,
              color: t.ink2,
            ),
          ],
          if (mutation.hasError) ...[
            gapH12,
            CatchLocalizedErrorBanner.mutation(
              mutation: mutation,
              context: AppErrorContext.event,
              onRetry: enabled ? _send : null,
            ),
          ],
        ],
      ),
    );
  }

  int _recipientCount(EventBroadcastAudience audience) => switch (audience) {
    EventBroadcastAudience.booked => widget.bookedCount,
    EventBroadcastAudience.prospective => widget.prospectiveCount,
    EventBroadcastAudience.everyone =>
      widget.bookedCount + widget.prospectiveCount,
  };

  void _selectAudience(EventBroadcastAudience audience) {
    if (_audience == audience) return;
    setState(() {
      _audience = audience;
      _rotateRequestId();
    });
  }

  void _selectTemplate(HostBroadcastTemplate template) {
    setState(() {
      _template = template;
      _bodyController.text = template.bodyFor(widget.event, context.l10n);
      _bodyController.selection = TextSelection.collapsed(
        offset: _bodyController.text.length,
      );
      _rotateRequestId();
    });
  }

  void _handleContentChanged() {
    setState(_rotateRequestId);
  }

  void _rotateRequestId() {
    _requestId = _generateRequestId();
    HostInboxBroadcastController.sendMutation.reset(ref);
  }

  String _generateRequestId() =>
      widget.requestIdFactory?.call() ??
      HostInboxBroadcastController.generateRequestId(ref);

  bool get _sendingEnabled => widget.sendingEnabled ?? true;

  void _send() {
    if (ref.read(HostInboxBroadcastController.sendMutation).isPending) return;
    final body = _bodyController.text.trim();
    if (!_sendingEnabled || body.isEmpty || _recipientCount(_audience) == 0) {
      return;
    }
    unawaited(
      HostInboxBroadcastController.send(
            ref: ref,
            requestId: _requestId,
            eventId: widget.event.id,
            audience: _audience,
            body: body,
            operation: widget.sendAction,
          )
          .then((result) {
            if (mounted) Navigator.of(context).pop(result);
          })
          .catchError((Object _) {}),
    );
  }
}
