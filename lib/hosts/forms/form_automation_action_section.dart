import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience_filter_options.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_send_summary.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_automation.dart';
import 'package:catch_dating_app/hosts/forms/form_automation_labels.dart';
import 'package:catch_dating_app/hosts/forms/host_form_operations_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// One step of a rule being edited: its kind and the setting that kind
/// needs (a tag, an event, a webhook, or a draft message to hand off to).
class HostFormAutomationActionDraft {
  HostFormAutomationActionDraft(this.id);

  factory HostFormAutomationActionDraft.fromAction(
    HostFormAutomationAction action,
  ) => HostFormAutomationActionDraft(action.actionId)
    ..kind = action.kind
    ..tagId = action.tagId
    ..eventId = action.eventId
    ..url.text = action.webhookUrl ?? ''
    ..originalUrl = action.webhookUrl
    ..keepSecret = action.webhookSecretConfigured
    ..campaignId = action.campaignId
    ..campaignRevision = action.campaignRevision;

  final String id;
  HostFormAutomationActionKind kind = HostFormAutomationActionKind.notifyTeam;
  String? tagId;
  String? eventId;
  String? campaignId;

  /// The webhook URL the rule was saved with; a blank secret keeps the
  /// saved one only while the URL is unchanged.
  String? originalUrl;
  int? campaignRevision;
  bool keepSecret = false;
  bool loadingMessage = false;
  final url = TextEditingController();
  final secret = TextEditingController();

  /// The step has every setting its kind needs.
  bool get complete => switch (kind) {
    HostFormAutomationActionKind.addOrganizerTag => tagId != null,
    HostFormAutomationActionKind.proposeEventAttendee => eventId != null,
    HostFormAutomationActionKind.campaignHandoff =>
      campaignId != null && campaignRevision != null && !loadingMessage,
    _ => true,
  };

  /// A new kind starts with none of the old kind's settings.
  void changeKind(HostFormAutomationActionKind value) {
    kind = value;
    tagId = null;
    eventId = null;
    campaignId = null;
    campaignRevision = null;
    url.clear();
    secret.clear();
    originalUrl = null;
    keepSecret = false;
  }

  Map<String, Object?> toJson() => {
    'actionId': id,
    'kind': kind.name,
    'tagId': tagId,
    'eventId': eventId,
    'webhookUrl': kind == HostFormAutomationActionKind.signedWebhook
        ? url.text.trim()
        : null,
    'webhookSecret': secret.text.isEmpty ? null : secret.text,
    'channel': kind == HostFormAutomationActionKind.campaignHandoff
        ? 'whatsapp'
        : null,
    'campaignId': campaignId,
    'campaignRevision': campaignRevision,
  };

  void dispose() {
    url.dispose();
    secret.dispose();
  }
}

/// One Then section: the step's kind and its setting, and Remove step
/// when the rule has more than one.
class HostFormAutomationActionSection extends StatelessWidget {
  const HostFormAutomationActionSection({
    super.key,
    required this.action,
    required this.trigger,
    required this.source,
    required this.messages,
    required this.busy,
    required this.canRemove,
    required this.onChanged,
    required this.onKind,
    required this.onMessage,
    required this.onRemove,
    required this.onMoreMessages,
  });

  final HostFormAutomationActionDraft action;
  final HostFormAutomationTrigger trigger;
  final HostSavedAudienceFilterOptions source;

  /// Draft messages to hand off to; null until a step needs them.
  final HostAutomationMessagesState? messages;
  final bool busy;
  final bool canRemove;

  /// The step changed in place; redraw.
  final VoidCallback onChanged;
  final ValueChanged<HostFormAutomationActionKind> onKind;
  final ValueChanged<String> onMessage;
  final VoidCallback onRemove;
  final VoidCallback onMoreMessages;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final copy = catchFieldCopy(l10n);
    final disabled = <WidgetState>{if (busy) WidgetState.disabled};
    final page = messages;
    return CatchSection(
      title: l10n.hostAudienceAutomationThen,
      dividers: CatchSectionPlacement.none,
      children: [
        CatchField<HostFormAutomationActionKind>.select(
          copy: copy,
          title: l10n.hostAutomationAction,
          contract: CatchContractConstraints
              .createOrganizerFormAutomationCallablePayloadActionsItemsKind,
          contractValueBuilder: (value) => value.name,
          values: hostFormAutomationAllowedActions(trigger),
          itemLabelBuilder: (value) =>
              hostFormAutomationActionText(l10n, value),
          value: action.kind,
          states: disabled,
          onChanged: (value) {
            if (value != null) onKind(value);
          },
        ),
        if (action.kind == HostFormAutomationActionKind.addOrganizerTag)
          CatchField<String>.select(
            copy: copy,
            title: l10n.hostAutomationTag,
            contract: CatchContractConstraints
                .createOrganizerFormAutomationCallablePayloadActionsItemsTagId,
            values: [for (final tag in source.tags) tag.tagId],
            itemLabelBuilder: (value) =>
                source.tags.firstWhere((tag) => tag.tagId == value).label,
            value: source.tags.any((tag) => tag.tagId == action.tagId)
                ? action.tagId
                : null,
            states: disabled,
            onChanged: (value) {
              action.tagId = value;
              onChanged();
            },
          ),
        if (action.kind == HostFormAutomationActionKind.proposeEventAttendee)
          CatchField<String>.select(
            copy: copy,
            title: l10n.hostAutomationEvent,
            contract: CatchContractConstraints
                .createOrganizerFormAutomationCallablePayloadActionsItemsEventId,
            values: [for (final event in source.events) event.id],
            itemLabelBuilder: (value) =>
                source.events.firstWhere((event) => event.id == value).title,
            value: source.events.any((event) => event.id == action.eventId)
                ? action.eventId
                : null,
            states: disabled,
            onChanged: (value) {
              action.eventId = value;
              onChanged();
            },
          ),
        if (action.kind == HostFormAutomationActionKind.signedWebhook) ...[
          CatchText(
            l10n.hostAutomationWebhookHelp,
            variant: CatchTextVariant.bodySmall,
            tone: CatchTextTone.secondary,
          ),
          CatchField.input(
            key: ValueKey('automation-url-${action.id}'),
            copy: copy,
            title: l10n.hostAutomationWebhookUrl,
            contract: CatchContractConstraints
                .createOrganizerFormAutomationCallablePayloadActionsItemsWebhookUrl,
            controller: action.url,
            keyboardType: TextInputType.url,
            states: disabled,
            onValidate: (text) => isHostAutomationWebhookUrl(text)
                ? null
                : l10n.hostAutomationUrlInvalid,
          ),
          CatchField.input(
            key: ValueKey('automation-secret-${action.id}'),
            copy: copy,
            title: l10n.hostAutomationWebhookSecret,
            contractExemption:
                'Blank preserves an existing secret only for the same URL; '
                'otherwise 32 through 256 characters are required by the '
                'callable.',
            controller: action.secret,
            inputVariant: CatchTextInputVariant.obscured,
            states: disabled,
            helperText: l10n.hostAutomationSecretHelp,
            onValidate: (text) {
              final value = text ?? '';
              if (value.isEmpty &&
                  action.keepSecret &&
                  action.url.text.trim() == action.originalUrl) {
                return null;
              }
              return value.length < 32 || value.length > 256
                  ? l10n.hostAutomationSecretInvalid
                  : null;
            },
          ),
        ],
        if (action.kind == HostFormAutomationActionKind.campaignHandoff) ...[
          CatchText(
            l10n.hostAutomationDraftHelp,
            variant: CatchTextVariant.bodySmall,
            tone: CatchTextTone.secondary,
          ),
          if (page == null)
            const CatchLoadingIndicator()
          else ...[
            CatchField<HostCampaignSendSummary>.select(
              copy: copy,
              title: l10n.hostAutomationDraft,
              contract: CatchContractConstraints
                  .createOrganizerFormAutomationCallablePayloadActionsItemsCampaignId,
              contractValueBuilder: (message) => message.campaignId,
              values: page.messages,
              itemLabelBuilder: (message) =>
                  '${message.name} · ${message.templateName ?? message.name} · '
                  '${message.savedAudienceName ?? l10n.hostSavedAudiencesManage}',
              value: page.messages
                  .where((message) => message.campaignId == action.campaignId)
                  .firstOrNull,
              states: {if (busy || action.loadingMessage) WidgetState.disabled},
              onChanged: (message) {
                if (message != null) onMessage(message.campaignId);
              },
            ),
            if (page.messages.isEmpty)
              CatchText(
                l10n.hostAutomationDraftsEmpty,
                variant: CatchTextVariant.bodySmall,
                tone: CatchTextTone.secondary,
              ),
            if (action.campaignId != null)
              CatchIndexRow(
                title: l10n.hostAutomationCurrentDraft,
                value: action.loadingMessage
                    ? l10n.hostFormAutomationRunning
                    : '${l10n.hostAutomationConfigured} · '
                          'v${action.campaignRevision ?? 0}',
                onTap: null,
              ),
            if (page.error case final error?)
              CatchLocalizedErrorState(
                error,
                context: AppErrorContext.forms,
                mode: CatchErrorStateMode.compact,
                onRetry: onMoreMessages,
              )
            else if (page.hasMore)
              CatchButton(
                label: l10n.hostAutomationDraftsMore,
                variant: CatchButtonVariant.secondary,
                fullWidth: true,
                status: page.loadingMore
                    ? CatchButtonStatus.loading
                    : CatchButtonStatus.idle,
                onPressed: page.loadingMore ? null : onMoreMessages,
              ),
          ],
        ],
        if (canRemove)
          CatchButton(
            label: l10n.hostAutomationRemoveAction,
            variant: CatchButtonVariant.quiet,
            fullWidth: true,
            onPressed: busy ? null : onRemove,
          ),
      ],
    );
  }
}
