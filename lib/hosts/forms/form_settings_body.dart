import 'dart:async';

import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_configuration.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_definition.dart';
import 'package:catch_dating_app/hosts/forms/form_settings_logic_sheet.dart';
import 'package:catch_dating_app/hosts/forms/form_settings_payment_section.dart';
import 'package:catch_dating_app/hosts/forms/form_settings_target_section.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_copy.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart' show MaterialLocalizations;
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

/// Form settings in reading order: the save notices, then one section each
/// for the details, where the form is used, who can answer, WhatsApp
/// updates, the fee, personalising, the look, when it is open, consent,
/// what people see after sending and the logic rules.
///
/// Text saves when the field loses focus; choices and switches save at
/// once. Every edit goes through [editor].
class HostFormSettingsBody extends StatelessWidget {
  const HostFormSettingsBody({
    super.key,
    required this.organizerId,
    required this.accountId,
    required this.state,
    required this.editor,
  });

  final String organizerId;

  /// The signed-in manager the editor is bound to; null hides the target
  /// choice until the account is known.
  final String? accountId;
  final HostFormEditorState state;
  final HostFormEditorController editor;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final copy = catchFieldCopy(l10n);
    final definition = state.editor.definition;
    final phoneVerified =
        definition.identityPolicy == HostFormIdentityPolicy.phoneVerified;
    return CatchPageBody.screen(
      child: CatchStack(
        gap: CatchStackGap.g24,
        children: [
          HostFormSettingsNotices(state: state, editor: editor),
          CatchText(
            hostFormSaveLabel(context, state),
            key: const ValueKey<String>('host-form-settings-save-state'),
            variant: CatchTextVariant.bodySmall,
            tone: CatchTextTone.secondary,
          ),
          CatchSection(
            title: l10n.hostAudienceFormDetails,
            dividers: CatchSectionPlacement.none,
            children: [
              CatchField.input(
                key: ValueKey('form-title-${definition.title}'),
                copy: copy,
                title: l10n.hostFormTitleLabel,
                initialValue: definition.title,
                contractExemption:
                    'The backend form definition validates this title.',
                onBlur: (value) => editor.updateMetadata(title: value.trim()),
              ),
              CatchField.input(
                key: ValueKey('form-description-${definition.description}'),
                copy: copy,
                title: l10n.hostFormDescriptionLabel,
                initialValue: definition.description,
                contractExemption:
                    'The backend form definition validates this optional '
                    'description.',
                labelMode: CatchFieldLabelTextMode.optional,
                maxLines: 3,
                onBlur: (value) => editor.updateMetadata(
                  description: value.trim(),
                  clearDescription: value.trim().isEmpty,
                ),
              ),
              CatchField<HostFormPurpose>.select(
                copy: copy,
                title: l10n.hostFormPurposeLabel,
                contract: CatchContractConstraints
                    .organizerFormDraftDocumentDefinitionPurpose,
                contractValueBuilder: (value) => value.name,
                values: HostFormPurpose.values,
                value: definition.purpose,
                itemLabelBuilder: (value) =>
                    hostFormPurposeLabel(context, value),
                onChanged: (value) => editor.updateMetadata(purpose: value),
              ),
            ],
          ),
          if (accountId case final accountId?)
            HostFormSettingsTargetSection(
              organizerId: organizerId,
              accountId: accountId,
              definition: definition,
              editor: editor,
              hasPublishedVersion: state.editor.form.activeVersionId != null,
            ),
          CatchSection(
            title: l10n.hostAudienceFormAccess,
            dividers: CatchSectionPlacement.none,
            children: [
              CatchText(
                '${hostFormBuilderIdentityConsequence(context, definition.identityPolicy)}. '
                '${l10n.hostFormConsequenceNoMessagingPermission}',
                variant: CatchTextVariant.bodySmall,
                tone: CatchTextTone.secondary,
              ),
              CatchField<HostFormIdentityPolicy>.select(
                copy: copy,
                title: l10n.hostFormIdentityLabel,
                contract: CatchContractConstraints
                    .organizerFormDraftDocumentDefinitionIdentityPolicy,
                contractValueBuilder: (value) => value.name,
                values: HostFormIdentityPolicy.values,
                value: definition.identityPolicy,
                itemLabelBuilder: (value) =>
                    hostFormIdentityLabel(context, value),
                onChanged: (value) =>
                    editor.updateMetadata(identityPolicy: value),
              ),
            ],
          ),
          _HostFormMessagingSection(definition: definition, editor: editor),
          HostFormSettingsPaymentSection(
            organizerId: organizerId,
            definition: definition,
            onChanged: editor.updatePayment,
          ),
          CatchSection(
            title: l10n.eventProfilePersonalize,
            dividers: CatchSectionPlacement.none,
            children: [
              CatchField.toggle(
                copy: copy,
                title: l10n.eventProfileQuestionAudience,
                value: definition.eventProfileEnabled,
                contractExemption:
                    'The versioned event profile policy gates attendee fields.',
                onChanged: phoneVerified || definition.eventProfileEnabled
                    ? editor.updateEventProfileEnabled
                    : null,
              ),
            ],
          ),
          CatchSection(
            title: l10n.hostFormAppearance,
            dividers: CatchSectionPlacement.none,
            children: [
              CatchField<HostFormAppearancePreset>.select(
                copy: copy,
                title: l10n.hostFormAppearancePreset,
                contract: CatchContractConstraints
                    .organizerFormDraftDocumentDefinitionAppearancePreset,
                contractValueBuilder: (value) => value.name,
                values: HostFormAppearancePreset.values,
                value: definition.appearancePreset,
                itemLabelBuilder: (value) =>
                    hostFormAppearanceLabel(context, value),
                onChanged: (value) =>
                    editor.updateMetadata(appearancePreset: value),
              ),
              if (definition.appearancePreset ==
                  HostFormAppearancePreset.activity)
                CatchField.input(
                  key: ValueKey('form-activity-${definition.activityKind}'),
                  copy: copy,
                  title: l10n.hostFormActivityKind,
                  initialValue: definition.activityKind,
                  labelMode: CatchFieldLabelTextMode.optional,
                  contractExemption:
                      'The backend form definition validates activity labels.',
                  onBlur: (value) => editor.updateMetadata(
                    activityKind: value.trim(),
                    clearActivityKind: value.trim().isEmpty,
                  ),
                ),
            ],
          ),
          _HostFormAvailabilitySection(definition: definition, editor: editor),
          CatchSection(
            title: l10n.hostFormConsent,
            dividers: CatchSectionPlacement.none,
            children: [
              CatchField.input(
                key: ValueKey('form-consent-${definition.consentCopy}'),
                copy: copy,
                title: l10n.hostFormConsentCopy,
                initialValue: definition.consentCopy,
                maxLines: 4,
                contractExemption: 'The form contract validates consent copy.',
                onBlur: (value) =>
                    editor.updateMetadata(consentCopy: value.trim()),
              ),
              CatchField.input(
                key: ValueKey(
                  'form-consent-version-${definition.consentVersion}',
                ),
                copy: copy,
                title: l10n.hostFormConsentVersion,
                initialValue: definition.consentVersion,
                contractExemption:
                    'The form contract validates consent versions.',
                onBlur: (value) =>
                    editor.updateMetadata(consentVersion: value.trim()),
              ),
              CatchField.input(
                key: ValueKey('form-retention-${definition.retentionCopy}'),
                copy: copy,
                title: l10n.hostFormRetentionCopy,
                initialValue: definition.retentionCopy,
                maxLines: 3,
                contractExemption:
                    'The form contract validates retention copy.',
                onBlur: (value) =>
                    editor.updateMetadata(retentionCopy: value.trim()),
              ),
            ],
          ),
          _HostFormCompletionSection(definition: definition, editor: editor),
          _HostFormLogicSection(definition: definition, editor: editor),
        ],
      ),
    );
  }
}

/// The save conflict, a failed save and the draft's validation issues,
/// each with what the host can do about it.
class HostFormSettingsNotices extends StatelessWidget {
  const HostFormSettingsNotices({
    super.key,
    required this.state,
    required this.editor,
  });

  final HostFormEditorState state;
  final HostFormEditorController editor;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final issues = state.editor.validationIssues;
    final notices = [
      if (state.saveState == HostFormSaveState.conflict)
        CatchNotice.inline(
          key: const ValueKey<String>('host-form-settings-conflict'),
          title: l10n.hostFormConflictTitle,
          body: l10n.hostFormConflictBody,
          tone: CatchNoticeTone.warning,
          action: CatchNoticeAction(
            label: l10n.hostFormReload,
            onPressed: () => unawaited(editor.reload()),
          ),
        )
      else if (state.saveState == HostFormSaveState.failed)
        CatchNotice.inline(
          key: const ValueKey<String>('host-form-settings-save-failed'),
          title: l10n.hostFormSaveFailed,
          body: state.error?.toString() ?? l10n.hostFormSaveFailed,
          tone: CatchNoticeTone.danger,
          action: CatchNoticeAction(
            label: l10n.hostFormRetrySave,
            onPressed: () => unawaited(editor.saveNow()),
          ),
        ),
      if (issues.isNotEmpty)
        CatchNotice.inline(
          key: const ValueKey<String>('host-form-settings-validation'),
          title: l10n.hostFormValidationTitle(count: issues.length),
          body: issues.first.message,
          tone: state.hasBlockingValidationErrors
              ? CatchNoticeTone.danger
              : CatchNoticeTone.warning,
        ),
    ];
    if (notices.isEmpty) return const SizedBox.shrink();
    return CatchStack(gap: CatchStackGap.g8, children: notices);
  }
}

/// The WhatsApp updates the form offers; the organizer and Catch choices
/// need a verified phone, and a purpose form sets its own.
class _HostFormMessagingSection extends StatelessWidget {
  const _HostFormMessagingSection({
    required this.definition,
    required this.editor,
  });

  final HostFormDefinition definition;
  final HostFormEditorController editor;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final copy = catchFieldCopy(l10n);
    final phoneVerified =
        definition.identityPolicy == HostFormIdentityPolicy.phoneVerified;
    return CatchSection(
      title: l10n.hostFormMessagingTitle,
      dividers: CatchSectionPlacement.none,
      children: [
        CatchText(
          definition.usesPurposeMessaging
              ? l10n.hostFormMessagingPurposeHelp
              : phoneVerified
              ? l10n.hostFormMessagingHelp
              : l10n.hostFormMessagingPhoneRequired,
          variant: CatchTextVariant.bodySmall,
          tone: CatchTextTone.secondary,
        ),
        if (!definition.usesPurposeMessaging) ...[
          CatchField.toggle(
            copy: copy,
            title: l10n.hostFormMessagingOrganizer,
            value: definition.offersOrganizerWhatsapp,
            contract: CatchContractConstraints
                .organizerFormDraftDocumentDefinitionMessagingConsentOrganizerWhatsapp,
            onChanged: phoneVerified || definition.offersOrganizerWhatsapp
                ? (value) =>
                      editor.updateMessagingConsent(organizerWhatsapp: value)
                : null,
          ),
          CatchField.toggle(
            copy: copy,
            title: l10n.hostFormMessagingCatch,
            value: definition.offersCatchWhatsapp,
            contract: CatchContractConstraints
                .organizerFormDraftDocumentDefinitionMessagingConsentCatchWhatsapp,
            onChanged: phoneVerified || definition.offersCatchWhatsapp
                ? (value) => editor.updateMessagingConsent(catchWhatsapp: value)
                : null,
          ),
        ],
        CatchField.toggle(
          copy: copy,
          title: l10n.hostFormMessagingOperations,
          value: definition.offersOrganizerOperationsWhatsapp,
          contract: CatchContractConstraints
              .organizerFormDraftDocumentDefinitionMessagingConsentOrganizerOperationsWhatsapp,
          onChanged: (value) =>
              editor.updateMessagingConsent(organizerOperationsWhatsapp: value),
        ),
        CatchField.toggle(
          copy: copy,
          title: l10n.hostFormMessagingFuture,
          value: definition.offersOrganizerMarketingWhatsapp,
          contract: CatchContractConstraints
              .organizerFormDraftDocumentDefinitionMessagingConsentOrganizerMarketingWhatsapp,
          onChanged: (value) =>
              editor.updateMessagingConsent(organizerMarketingWhatsapp: value),
        ),
        CatchField.toggle(
          copy: copy,
          title: l10n.hostFormMessagingCatchFuture,
          value: definition.offersCatchMarketingWhatsapp,
          contract: CatchContractConstraints
              .organizerFormDraftDocumentDefinitionMessagingConsentCatchMarketingWhatsapp,
          onChanged: (value) =>
              editor.updateMessagingConsent(catchMarketingWhatsapp: value),
        ),
      ],
    );
  }
}

/// When the form opens and closes, how many answers it takes and what it
/// says once it is closed.
class _HostFormAvailabilitySection extends StatelessWidget {
  const _HostFormAvailabilitySection({
    required this.definition,
    required this.editor,
  });

  final HostFormDefinition definition;
  final HostFormEditorController editor;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final copy = catchFieldCopy(l10n);
    return CatchSection(
      title: l10n.hostFormAvailability,
      dividers: CatchSectionPlacement.none,
      children: [
        _HostFormDateField(
          key: const ValueKey<String>('host-form-settings-opens'),
          title: l10n.hostFormOpensAt,
          value: definition.opensAt,
          onChanged: (value) =>
              editor.updateMetadata(opensAt: value, setOpensAt: true),
        ),
        _HostFormDateField(
          key: const ValueKey<String>('host-form-settings-closes'),
          title: l10n.hostFormClosesAt,
          value: definition.closesAt,
          endOfDay: true,
          onChanged: (value) =>
              editor.updateMetadata(closesAt: value, setClosesAt: true),
        ),
        CatchField.input(
          key: ValueKey('form-limit-${definition.responseLimit}'),
          copy: copy,
          title: l10n.hostFormResponseLimit,
          initialValue: definition.responseLimit?.toString(),
          labelMode: CatchFieldLabelTextMode.optional,
          keyboardType: TextInputType.number,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          contractExemption: 'The form contract validates response limits.',
          onBlur: (value) => editor.updateMetadata(
            responseLimit: value.trim().isEmpty
                ? null
                : int.tryParse(value.trim()),
            setResponseLimit: true,
          ),
        ),
        CatchField.input(
          key: ValueKey('form-closed-${definition.closedMessage}'),
          copy: copy,
          title: l10n.hostFormClosedMessage,
          initialValue: definition.closedMessage,
          labelMode: CatchFieldLabelTextMode.optional,
          maxLines: 3,
          contractExemption: 'The form contract validates closed copy.',
          onBlur: (value) => editor.updateMetadata(
            closedMessage: value.trim(),
            clearClosedMessage: value.trim().isEmpty,
          ),
        ),
      ],
    );
  }
}

/// One opening or closing day: tap to choose it, or clear it. A closing
/// day runs to the end of that day.
class _HostFormDateField extends StatelessWidget {
  const _HostFormDateField({
    super.key,
    required this.title,
    required this.value,
    required this.onChanged,
    this.endOfDay = false,
  });

  final String title;
  final DateTime? value;
  final ValueChanged<DateTime?> onChanged;
  final bool endOfDay;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final date = value;
    return CatchFieldLanes.single(
      child: CatchField.action(
        copy: catchFieldCopy(l10n),
        title: title,
        valueText: date == null
            ? l10n.hostFormDateNotSet
            : MaterialLocalizations.of(
                context,
              ).formatMediumDate(date.toLocal()),
        actions: date == null
            ? null
            : CatchIconAction(
                tooltip: l10n.hostFormClearDate,
                variant: CatchIconActionVariant.plain,
                onPressed: () => onChanged(null),
                child: CatchIcon(CatchIcons.close),
              ),
        onTap: () => unawaited(_pick(context)),
      ),
    );
  }

  Future<void> _pick(BuildContext context) async {
    final now = DateTime.now();
    final selected = await showCatchDatePicker(
      context: context,
      copy: catchDatePickerCopy(context.l10n),
      title: title,
      initialDate: value?.toLocal() ?? now,
      firstDate: DateTime(now.year - 1),
      lastDate: DateTime(now.year + 10, 12, 31),
    );
    if (selected == null) return;
    final local = endOfDay
        ? DateTime(selected.year, selected.month, selected.day, 23, 59, 59, 999)
        : DateTime(selected.year, selected.month, selected.day);
    onChanged(local.toUtc());
  }
}

/// What people see after they send the form, and the button it offers.
class _HostFormCompletionSection extends StatelessWidget {
  const _HostFormCompletionSection({
    required this.definition,
    required this.editor,
  });

  final HostFormDefinition definition;
  final HostFormEditorController editor;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final copy = catchFieldCopy(l10n);
    return CatchSection(
      title: l10n.hostAudienceAfterSubmission,
      dividers: CatchSectionPlacement.none,
      children: [
        CatchField.input(
          key: ValueKey('form-completion-${definition.completionTitle}'),
          copy: copy,
          title: l10n.hostFormCompletionTitleLabel,
          initialValue: definition.completionTitle,
          contractExemption:
              'The backend form definition validates completion copy.',
          onBlur: (value) =>
              editor.updateMetadata(completionTitle: value.trim()),
        ),
        CatchField.input(
          key: ValueKey(
            'form-completion-message-${definition.completionMessage}',
          ),
          copy: copy,
          title: l10n.hostFormCompletionMessageLabel,
          initialValue: definition.completionMessage,
          labelMode: CatchFieldLabelTextMode.optional,
          maxLines: 3,
          contractExemption:
              'The backend form definition validates completion copy.',
          onBlur: (value) => editor.updateMetadata(
            completionMessage: value.trim(),
            clearCompletionMessage: value.trim().isEmpty,
          ),
        ),
        CatchField<HostFormCompletionAction>.select(
          copy: copy,
          title: l10n.hostFormCompletionActionLabel,
          contract: CatchContractConstraints
              .organizerFormDraftDocumentDefinitionCompletionActionKind,
          contractValueBuilder: (value) => value.name,
          values: HostFormCompletionAction.values,
          value: definition.completionAction,
          itemLabelBuilder: (value) =>
              hostFormCompletionActionLabel(context, value),
          onChanged: (value) => editor.updateMetadata(
            completionAction: value,
            clearCompletionActionLabel: value == HostFormCompletionAction.none,
            clearCompletionActionUrl:
                value != HostFormCompletionAction.externalUrl,
          ),
        ),
        if (definition.completionAction != HostFormCompletionAction.none)
          CatchField.input(
            key: ValueKey(
              'form-completion-label-${definition.completionActionLabel}',
            ),
            copy: copy,
            title: l10n.hostFormCompletionButtonLabel,
            initialValue: definition.completionActionLabel,
            contractExemption:
                'The form contract validates completion button labels.',
            onBlur: (value) => editor.updateMetadata(
              completionActionLabel: value.trim(),
              clearCompletionActionLabel: value.trim().isEmpty,
            ),
          ),
        if (definition.completionAction == HostFormCompletionAction.externalUrl)
          CatchField.input(
            key: ValueKey(
              'form-completion-url-${definition.completionActionUrl}',
            ),
            copy: copy,
            title: l10n.hostFormCompletionUrl,
            initialValue: definition.completionActionUrl,
            keyboardType: TextInputType.url,
            contractExemption:
                'The form contract validates completion destinations.',
            onBlur: (value) => editor.updateMetadata(
              completionActionUrl: value.trim(),
              clearCompletionActionUrl: value.trim().isEmpty,
            ),
          ),
      ],
    );
  }
}

/// The form's logic rules, each with Remove, and Add a rule.
class _HostFormLogicSection extends StatelessWidget {
  const _HostFormLogicSection({required this.definition, required this.editor});

  final HostFormDefinition definition;
  final HostFormEditorController editor;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final hasQuestions = definition.sections.any(
      (section) => section.questions.isNotEmpty,
    );
    return CatchSection(
      title: l10n.hostFormLogic,
      dividers: CatchSectionPlacement.none,
      action: CatchSectionAction(
        label: l10n.hostFormAddRule,
        onPressed: hasQuestions
            ? () => unawaited(
                showHostFormLogicRuleSheet(
                  context,
                  definition: definition,
                  editor: editor,
                ),
              )
            : null,
      ),
      children: [
        CatchText(
          l10n.hostFormLogicHelp,
          variant: CatchTextVariant.bodySmall,
          tone: CatchTextTone.secondary,
        ),
        for (final (index, rule) in definition.logicRules.indexed)
          CatchIndexRow(
            key: ValueKey<String>('host-form-logic-rule-${rule.ruleId}'),
            title: hostFormLogicRuleSummary(context, definition, rule),
            titleMaxLines: 3,
            onTap: null,
            trailing: CatchIconAction(
              key: ValueKey<String>('host-form-logic-remove-${rule.ruleId}'),
              tooltip: l10n.hostFormRemoveRule,
              variant: CatchIconActionVariant.plain,
              onPressed: () => editor.removeLogicRule(index),
              child: CatchIcon(CatchIcons.delete),
            ),
          ),
      ],
    );
  }
}
