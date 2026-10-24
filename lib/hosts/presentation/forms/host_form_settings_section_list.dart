import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_configuration.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_definition.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_logic.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_question.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_availability_field.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_copy.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_payment_section.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_target_section.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class HostFormSettingsSectionList extends StatelessWidget {
  const HostFormSettingsSectionList({
    super.key,
    required this.organizerId,
    required this.definition,
    required this.notifier,
    this.accountId,
    this.enableEventTargetSettings = false,
    this.hasPublishedVersion = false,
  });

  final String organizerId;
  final HostFormDefinition definition;
  final HostFormEditorController notifier;
  final String? accountId;
  final bool enableEventTargetSettings;
  final bool hasPublishedVersion;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      CatchSection.fieldRows(
        title: context.l10n.hostAudienceFormDetails,
        first: true,
        children: [
          CatchField.input(
            copy: catchFieldCopy(context.l10n),
            key: ValueKey('form-title-${definition.title}'),
            title: context.l10n.hostFormTitleLabel,
            initialValue: definition.title,
            contractExemption:
                'The backend form definition validates this title.',
            onBlur: (value) => notifier.updateMetadata(title: value.trim()),
          ),
          CatchField.input(
            copy: catchFieldCopy(context.l10n),
            key: ValueKey('form-description-${definition.description}'),
            title: context.l10n.hostFormDescriptionLabel,
            initialValue: definition.description,
            contractExemption:
                'The backend form definition validates this optional description.',
            labelMode: CatchFieldLabelTextMode.optional,
            maxLines: 3,
            onBlur: (value) => notifier.updateMetadata(
              description: value.trim(),
              clearDescription: value.trim().isEmpty,
            ),
          ),
          CatchField<HostFormPurpose>.select(
            copy: catchFieldCopy(context.l10n),
            title: context.l10n.hostFormPurposeLabel,
            contract: CatchContractConstraints
                .organizerFormDraftDocumentDefinitionPurpose,
            contractValueBuilder: (value) => value.name,
            values: HostFormPurpose.values,
            value: definition.purpose,
            itemLabelBuilder: (value) => hostFormPurposeLabel(context, value),
            onChanged: (value) => notifier.updateMetadata(purpose: value),
          ),
        ],
      ),
      gapH24,
      if (enableEventTargetSettings && accountId != null)
        HostFormTargetSection(
          organizerId: organizerId,
          definition: definition,
          notifier: notifier,
          accountId: accountId!,
          enableEventTargetSettings: enableEventTargetSettings,
          hasPublishedVersion: hasPublishedVersion,
        ),
      CatchSection.fieldRows(
        title: context.l10n.hostAudienceFormAccess,
        children: [
          CatchField<HostFormIdentityPolicy>.select(
            copy: catchFieldCopy(context.l10n),
            title: context.l10n.hostFormIdentityLabel,
            contract: CatchContractConstraints
                .organizerFormDraftDocumentDefinitionIdentityPolicy,
            contractValueBuilder: (value) => value.name,
            values: HostFormIdentityPolicy.values,
            value: definition.identityPolicy,
            itemLabelBuilder: (value) => hostFormIdentityLabel(context, value),
            onChanged: (value) =>
                notifier.updateMetadata(identityPolicy: value),
          ),
          CatchField.read(
            copy: catchFieldCopy(context.l10n),
            title: context.l10n.hostFormIdentityConsequenceTitle,
            body:
                '${hostFormBuilderIdentityConsequence(context, definition.identityPolicy)}. '
                '${context.l10n.hostFormConsequenceNoMessagingPermission}',
            bodyMaxLines: 5,
          ),
        ],
      ),
      gapH20,
      CatchSection.fieldRows(
        title: context.l10n.hostFormMessagingTitle,
        footer: CatchText(
          definition.usesPurposeMessaging
              ? context.l10n.hostFormMessagingPurposeHelp
              : definition.identityPolicy ==
                    HostFormIdentityPolicy.phoneVerified
              ? context.l10n.hostFormMessagingHelp
              : context.l10n.hostFormMessagingPhoneRequired,
          variant: CatchTextVariant.supporting,
        ),
        children: [
          if (!definition.usesPurposeMessaging) ...[
            CatchField.toggle(
              copy: catchFieldCopy(context.l10n),
              title: context.l10n.hostFormMessagingOrganizer,
              value: definition.offersOrganizerWhatsapp,
              contract: CatchContractConstraints
                  .organizerFormDraftDocumentDefinitionMessagingConsentOrganizerWhatsapp,
              onChanged:
                  definition.identityPolicy ==
                          HostFormIdentityPolicy.phoneVerified ||
                      definition.offersOrganizerWhatsapp
                  ? (value) => notifier.updateMessagingConsent(
                      organizerWhatsapp: value,
                    )
                  : null,
            ),
            CatchField.toggle(
              copy: catchFieldCopy(context.l10n),
              title: context.l10n.hostFormMessagingCatch,
              value: definition.offersCatchWhatsapp,
              contract: CatchContractConstraints
                  .organizerFormDraftDocumentDefinitionMessagingConsentCatchWhatsapp,
              onChanged:
                  definition.identityPolicy ==
                          HostFormIdentityPolicy.phoneVerified ||
                      definition.offersCatchWhatsapp
                  ? (value) =>
                        notifier.updateMessagingConsent(catchWhatsapp: value)
                  : null,
            ),
          ],
          CatchField.toggle(
            copy: catchFieldCopy(context.l10n),
            title: context.l10n.hostFormMessagingOperations,
            value: definition.offersOrganizerOperationsWhatsapp,
            contract: CatchContractConstraints
                .organizerFormDraftDocumentDefinitionMessagingConsentOrganizerOperationsWhatsapp,
            onChanged: (value) => notifier.updateMessagingConsent(
              organizerOperationsWhatsapp: value,
            ),
          ),
          CatchField.toggle(
            copy: catchFieldCopy(context.l10n),
            title: context.l10n.hostFormMessagingFuture,
            value: definition.offersOrganizerMarketingWhatsapp,
            contract: CatchContractConstraints
                .organizerFormDraftDocumentDefinitionMessagingConsentOrganizerMarketingWhatsapp,
            onChanged: (value) => notifier.updateMessagingConsent(
              organizerMarketingWhatsapp: value,
            ),
          ),
          CatchField.toggle(
            copy: catchFieldCopy(context.l10n),
            title: context.l10n.hostFormMessagingCatchFuture,
            value: definition.offersCatchMarketingWhatsapp,
            contract: CatchContractConstraints
                .organizerFormDraftDocumentDefinitionMessagingConsentCatchMarketingWhatsapp,
            onChanged: (value) =>
                notifier.updateMessagingConsent(catchMarketingWhatsapp: value),
          ),
        ],
      ),
      gapH20,
      HostFormPaymentSection(
        organizerId: organizerId,
        definition: definition,
        onChanged: notifier.updatePayment,
      ),
      gapH20,
      CatchSection.fieldRows(
        title: context.l10n.eventProfilePersonalize,
        children: [
          CatchField.toggle(
            copy: catchFieldCopy(context.l10n),
            title: context.l10n.eventProfileQuestionAudience,
            value: definition.eventProfileEnabled,
            contractExemption:
                'The versioned event profile policy gates attendee fields.',
            onChanged:
                definition.identityPolicy ==
                        HostFormIdentityPolicy.phoneVerified ||
                    definition.eventProfileEnabled
                ? notifier.updateEventProfileEnabled
                : null,
          ),
        ],
      ),
      gapH20,
      CatchSection.fieldRows(
        title: context.l10n.hostFormAppearance,
        children: [
          CatchField<HostFormAppearancePreset>.select(
            copy: catchFieldCopy(context.l10n),
            title: context.l10n.hostFormAppearancePreset,
            contract: CatchContractConstraints
                .organizerFormDraftDocumentDefinitionAppearancePreset,
            contractValueBuilder: (value) => value.name,
            values: HostFormAppearancePreset.values,
            value: definition.appearancePreset,
            itemLabelBuilder: (value) =>
                hostFormAppearanceLabel(context, value),
            onChanged: (value) =>
                notifier.updateMetadata(appearancePreset: value),
          ),
          if (definition.appearancePreset == HostFormAppearancePreset.activity)
            CatchField.input(
              copy: catchFieldCopy(context.l10n),
              key: ValueKey('form-activity-${definition.activityKind}'),
              title: context.l10n.hostFormActivityKind,
              initialValue: definition.activityKind,
              labelMode: CatchFieldLabelTextMode.optional,
              contractExemption:
                  'The backend form definition validates activity labels.',
              onBlur: (value) => notifier.updateMetadata(
                activityKind: value.trim(),
                clearActivityKind: value.trim().isEmpty,
              ),
            ),
        ],
      ),
      gapH20,
      CatchSection.fieldRows(
        title: context.l10n.hostFormAvailability,
        children: [
          HostFormAvailabilityField(
            title: context.l10n.hostFormOpensAt,
            value: definition.opensAt,
            onChanged: (value) =>
                notifier.updateMetadata(opensAt: value, setOpensAt: true),
          ),
          HostFormAvailabilityField(
            title: context.l10n.hostFormClosesAt,
            value: definition.closesAt,
            endOfDay: true,
            onChanged: (value) =>
                notifier.updateMetadata(closesAt: value, setClosesAt: true),
          ),
          CatchField.input(
            copy: catchFieldCopy(context.l10n),
            key: ValueKey('form-limit-${definition.responseLimit}'),
            title: context.l10n.hostFormResponseLimit,
            initialValue: definition.responseLimit?.toString(),
            labelMode: CatchFieldLabelTextMode.optional,
            keyboardType: TextInputType.number,
            contractExemption: 'The form contract validates response limits.',
            onBlur: (value) => notifier.updateMetadata(
              responseLimit: _nullableInt(value),
              setResponseLimit: true,
            ),
          ),
          CatchField.input(
            copy: catchFieldCopy(context.l10n),
            key: ValueKey('form-closed-${definition.closedMessage}'),
            title: context.l10n.hostFormClosedMessage,
            initialValue: definition.closedMessage,
            labelMode: CatchFieldLabelTextMode.optional,
            maxLines: 3,
            contractExemption: 'The form contract validates closed copy.',
            onBlur: (value) => notifier.updateMetadata(
              closedMessage: value.trim(),
              clearClosedMessage: value.trim().isEmpty,
            ),
          ),
        ],
      ),
      gapH20,
      CatchSection.fieldRows(
        title: context.l10n.hostFormConsent,
        children: [
          CatchField.input(
            copy: catchFieldCopy(context.l10n),
            key: ValueKey('form-consent-${definition.consentCopy}'),
            title: context.l10n.hostFormConsentCopy,
            initialValue: definition.consentCopy,
            maxLines: 4,
            contractExemption: 'The form contract validates consent copy.',
            onBlur: (value) =>
                notifier.updateMetadata(consentCopy: value.trim()),
          ),
          CatchField.input(
            copy: catchFieldCopy(context.l10n),
            key: ValueKey('form-consent-version-${definition.consentVersion}'),
            title: context.l10n.hostFormConsentVersion,
            initialValue: definition.consentVersion,
            contractExemption: 'The form contract validates consent versions.',
            onBlur: (value) =>
                notifier.updateMetadata(consentVersion: value.trim()),
          ),
          CatchField.input(
            copy: catchFieldCopy(context.l10n),
            key: ValueKey('form-retention-${definition.retentionCopy}'),
            title: context.l10n.hostFormRetentionCopy,
            initialValue: definition.retentionCopy,
            maxLines: 3,
            contractExemption: 'The form contract validates retention copy.',
            onBlur: (value) =>
                notifier.updateMetadata(retentionCopy: value.trim()),
          ),
        ],
      ),
      gapH20,
      CatchSection.fieldRows(
        title: context.l10n.hostAudienceAfterSubmission,
        children: [
          CatchField.input(
            copy: catchFieldCopy(context.l10n),
            key: ValueKey('form-completion-${definition.completionTitle}'),
            title: context.l10n.hostFormCompletionTitleLabel,
            initialValue: definition.completionTitle,
            contractExemption:
                'The backend form definition validates completion copy.',
            onBlur: (value) =>
                notifier.updateMetadata(completionTitle: value.trim()),
          ),
          CatchField.input(
            copy: catchFieldCopy(context.l10n),
            key: ValueKey(
              'form-completion-message-${definition.completionMessage}',
            ),
            title: context.l10n.hostFormCompletionMessageLabel,
            initialValue: definition.completionMessage,
            labelMode: CatchFieldLabelTextMode.optional,
            maxLines: 3,
            contractExemption:
                'The backend form definition validates completion copy.',
            onBlur: (value) => notifier.updateMetadata(
              completionMessage: value.trim(),
              clearCompletionMessage: value.trim().isEmpty,
            ),
          ),
          CatchField<HostFormCompletionAction>.select(
            copy: catchFieldCopy(context.l10n),
            title: context.l10n.hostFormCompletionActionLabel,
            contract: CatchContractConstraints
                .organizerFormDraftDocumentDefinitionCompletionActionKind,
            contractValueBuilder: (value) => value.name,
            values: HostFormCompletionAction.values,
            value: definition.completionAction,
            itemLabelBuilder: (value) =>
                hostFormCompletionActionLabel(context, value),
            onChanged: (value) => notifier.updateMetadata(
              completionAction: value,
              clearCompletionActionLabel:
                  value == HostFormCompletionAction.none,
              clearCompletionActionUrl:
                  value != HostFormCompletionAction.externalUrl,
            ),
          ),
          if (definition.completionAction != HostFormCompletionAction.none)
            CatchField.input(
              copy: catchFieldCopy(context.l10n),
              key: ValueKey(
                'form-completion-label-${definition.completionActionLabel}',
              ),
              title: context.l10n.hostFormCompletionButtonLabel,
              initialValue: definition.completionActionLabel,
              contractExemption:
                  'The form contract validates completion button labels.',
              onBlur: (value) => notifier.updateMetadata(
                completionActionLabel: value.trim(),
                clearCompletionActionLabel: value.trim().isEmpty,
              ),
            ),
          if (definition.completionAction ==
              HostFormCompletionAction.externalUrl)
            CatchField.input(
              copy: catchFieldCopy(context.l10n),
              key: ValueKey(
                'form-completion-url-${definition.completionActionUrl}',
              ),
              title: context.l10n.hostFormCompletionUrl,
              initialValue: definition.completionActionUrl,
              keyboardType: TextInputType.url,
              contractExemption:
                  'The form contract validates completion destinations.',
              onBlur: (value) => notifier.updateMetadata(
                completionActionUrl: value.trim(),
                clearCompletionActionUrl: value.trim().isEmpty,
              ),
            ),
        ],
      ),
      gapH20,
      CatchSection.fieldRows(
        title: context.l10n.hostFormLogic,
        footer: CatchText(
          context.l10n.hostFormLogicHelp,
          variant: CatchTextVariant.supporting,
        ),
        children: [
          for (final ruleEntry in definition.logicRules.indexed)
            CatchField.action(
              copy: catchFieldCopy(context.l10n),
              title: hostFormLogicRuleSummary(
                context,
                definition,
                ruleEntry.$2,
              ),
              actions: IconButton(
                tooltip: context.l10n.hostFormRemoveRule,
                icon: Icon(CatchIcons.deleteOutlineRounded),
                onPressed: () => notifier.removeLogicRule(ruleEntry.$1),
              ),
              onTap: null,
            ),
          CatchField.add(
            copy: catchFieldCopy(context.l10n),
            title: context.l10n.hostFormAddRule,
            onTap: () => _showLogicRuleBuilder(
              context,
              definition: definition,
              notifier: notifier,
            ),
          ),
        ],
      ),
    ],
  );
}

int? _nullableInt(String value) =>
    value.trim().isEmpty ? null : int.tryParse(value.trim());

Future<void> _showLogicRuleBuilder(
  BuildContext context, {
  required HostFormDefinition definition,
  required HostFormEditorController notifier,
}) async {
  final questions = definition.sections
      .expand((section) => section.questions)
      .toList(growable: false);
  if (questions.isEmpty) return;
  var sourceId = questions.first.questionId;
  var operator = HostFormLogicOperator.equals;
  var action = HostFormLogicAction.showQuestion;
  var expectedText = '';
  String? expectedChoice;
  String? targetQuestionId = questions.length > 1
      ? questions[1].questionId
      : null;
  String? targetSectionId = definition.sections.first.sectionId;
  await showCatchBottomSheet<void>(
    context: context,
    builder: (sheetContext) => StatefulBuilder(
      builder: (sheetContext, setState) {
        final source = questions.firstWhere(
          (question) => question.questionId == sourceId,
        );
        final operators = _operatorsFor(source.kind);
        if (!operators.contains(operator)) operator = operators.first;
        final needsValue =
            operator != HostFormLogicOperator.answered &&
            operator != HostFormLogicOperator.notAnswered;
        final choiceValues = switch (source.kind) {
          HostFormQuestionKind.singleChoice ||
          HostFormQuestionKind.multiChoice =>
            source.options.map((option) => option.value).toList(),
          HostFormQuestionKind.boolean => const ['true', 'false'],
          _ => const <String>[],
        };
        if (choiceValues.isNotEmpty && !choiceValues.contains(expectedChoice)) {
          expectedChoice = choiceValues.first;
        }
        final targetQuestions = questions
            .where((question) => question.questionId != sourceId)
            .toList(growable: false);
        if (!targetQuestions.any(
          (question) => question.questionId == targetQuestionId,
        )) {
          targetQuestionId = targetQuestions.firstOrNull?.questionId;
        }
        final sourceSectionIndex = definition.sections.indexWhere(
          (section) => section.questions.any(
            (question) => question.questionId == sourceId,
          ),
        );
        final targetSections = definition.sections.indexed
            .where(
              (entry) =>
                  action != HostFormLogicAction.routeToSection ||
                  entry.$1 > sourceSectionIndex,
            )
            .map((entry) => entry.$2)
            .toList(growable: false);
        if (!targetSections.any(
          (section) => section.sectionId == targetSectionId,
        )) {
          targetSectionId = targetSections.firstOrNull?.sectionId;
        }
        final questionAction =
            action == HostFormLogicAction.showQuestion ||
            action == HostFormLogicAction.hideQuestion;
        final sectionAction =
            action == HostFormLogicAction.showSection ||
            action == HostFormLogicAction.hideSection ||
            action == HostFormLogicAction.routeToSection;
        final expectedValues = !needsValue
            ? const <Object?>[]
            : source.kind == HostFormQuestionKind.boolean
            ? <Object?>[expectedChoice == 'true']
            : source.kind == HostFormQuestionKind.number
            ? <Object?>[num.tryParse(expectedText)]
            : choiceValues.isNotEmpty
            ? <Object?>[expectedChoice]
            : <Object?>[expectedText.trim()];
        final canSave =
            (!needsValue ||
                expectedValues.every(
                  (value) => value != null && value.toString().isNotEmpty,
                )) &&
            (!questionAction || targetQuestionId != null) &&
            (!sectionAction || targetSectionId != null);
        return CatchSheet.standard(
          title: context.l10n.hostFormAddRule,
          footer: CatchButton.sheet(
            role: CatchButtonEmphasis.commit,
            label: context.l10n.hostFormRuleSave,

            onPressed: !canSave
                ? null
                : () {
                    notifier.addLogicRule(
                      questionId: sourceId,
                      operator: operator,
                      expectedValues: expectedValues,
                      action: action,
                      targetQuestionId: questionAction
                          ? targetQuestionId
                          : null,
                      targetSectionId: sectionAction ? targetSectionId : null,
                    );
                    Navigator.of(sheetContext).pop();
                  },
          ),
          child: CatchSection.fieldRows(
            first: true,
            children: [
              CatchField<String>.select(
                copy: catchFieldCopy(context.l10n),
                key: ValueKey('logic-source-$sourceId'),
                title: context.l10n.hostFormRuleQuestion,
                contract: CatchContractConstraints
                    .organizerFormDraftDocumentDefinitionLogicRulesItemsConditionsItemsQuestionId,
                contractValueBuilder: (value) => value,
                values: questions
                    .map((question) => question.questionId)
                    .toList(),
                value: sourceId,
                itemLabelBuilder: (value) => questions
                    .firstWhere((question) => question.questionId == value)
                    .label,
                onChanged: (value) => setState(() {
                  if (value == null) return;
                  sourceId = value;
                  expectedText = '';
                  expectedChoice = null;
                }),
              ),
              CatchField<HostFormLogicOperator>.select(
                copy: catchFieldCopy(context.l10n),
                key: ValueKey('logic-operator-$operator-$sourceId'),
                title: context.l10n.hostFormRuleOperator,
                contract: CatchContractConstraints
                    .organizerFormDraftDocumentDefinitionLogicRulesItemsConditionsItemsOperator,
                contractValueBuilder: (value) => value.name,
                values: operators,
                value: operator,
                itemLabelBuilder: (value) =>
                    hostFormLogicOperatorLabel(context, value),
                onChanged: (value) {
                  if (value != null) setState(() => operator = value);
                },
              ),
              if (needsValue && choiceValues.isNotEmpty)
                CatchField<String>.select(
                  copy: catchFieldCopy(context.l10n),
                  key: ValueKey('logic-value-$sourceId-$expectedChoice'),
                  title: context.l10n.hostFormRuleValue,
                  contract: CatchContractConstraints
                      .organizerFormDraftDocumentDefinitionLogicRulesItemsConditionsItemsExpectedValuesItems,
                  contractValueBuilder: (value) => value,
                  values: choiceValues,
                  value: expectedChoice!,
                  itemLabelBuilder: (value) =>
                      source.kind == HostFormQuestionKind.boolean
                      ? value == 'true'
                            ? context.l10n.hostFormRuleTrue
                            : context.l10n.hostFormRuleFalse
                      : source.options
                            .firstWhere((option) => option.value == value)
                            .label,
                  onChanged: (value) => setState(() => expectedChoice = value),
                )
              else if (needsValue)
                CatchField.input(
                  copy: catchFieldCopy(context.l10n),
                  key: ValueKey('logic-value-$sourceId'),
                  title: context.l10n.hostFormRuleValue,
                  initialValue: expectedText,
                  keyboardType: source.kind == HostFormQuestionKind.number
                      ? const TextInputType.numberWithOptions(
                          decimal: true,
                          signed: true,
                        )
                      : TextInputType.text,
                  contractExemption:
                      'The form contract validates comparison values.',
                  onChanged: (value) => setState(() => expectedText = value),
                ),
              CatchField<HostFormLogicAction>.select(
                copy: catchFieldCopy(context.l10n),
                key: ValueKey('logic-action-$action'),
                title: context.l10n.hostFormRuleAction,
                contract: CatchContractConstraints
                    .organizerFormDraftDocumentDefinitionLogicRulesItemsAction,
                contractValueBuilder: (value) => value.name,
                values: HostFormLogicAction.values,
                value: action,
                itemLabelBuilder: (value) =>
                    hostFormLogicActionLabel(context, value),
                onChanged: (value) {
                  if (value != null) setState(() => action = value);
                },
              ),
              if (questionAction && targetQuestions.isNotEmpty)
                CatchField<String>.select(
                  copy: catchFieldCopy(context.l10n),
                  title: context.l10n.hostFormRuleTargetQuestion,
                  contract: CatchContractConstraints
                      .organizerFormDraftDocumentDefinitionLogicRulesItemsTargetQuestionId,
                  contractValueBuilder: (value) => value,
                  values: targetQuestions
                      .map((question) => question.questionId)
                      .toList(),
                  value: targetQuestionId!,
                  itemLabelBuilder: (value) => targetQuestions
                      .firstWhere((question) => question.questionId == value)
                      .label,
                  onChanged: (value) =>
                      setState(() => targetQuestionId = value),
                ),
              if (sectionAction && targetSections.isNotEmpty)
                CatchField<String>.select(
                  copy: catchFieldCopy(context.l10n),
                  title: context.l10n.hostFormRuleTargetSection,
                  contract: CatchContractConstraints
                      .organizerFormDraftDocumentDefinitionLogicRulesItemsTargetSectionId,
                  contractValueBuilder: (value) => value,
                  values: targetSections
                      .map((section) => section.sectionId)
                      .toList(),
                  value: targetSectionId!,
                  itemLabelBuilder: (value) => targetSections
                      .firstWhere((section) => section.sectionId == value)
                      .title,
                  onChanged: (value) => setState(() => targetSectionId = value),
                ),
            ],
          ),
        );
      },
    ),
  );
}

List<HostFormLogicOperator> _operatorsFor(HostFormQuestionKind kind) =>
    switch (kind) {
      HostFormQuestionKind.number => const [
        HostFormLogicOperator.equals,
        HostFormLogicOperator.notEquals,
        HostFormLogicOperator.greaterThan,
        HostFormLogicOperator.lessThan,
        HostFormLogicOperator.answered,
        HostFormLogicOperator.notAnswered,
      ],
      HostFormQuestionKind.multiChoice => const [
        HostFormLogicOperator.contains,
        HostFormLogicOperator.notContains,
        HostFormLogicOperator.answered,
        HostFormLogicOperator.notAnswered,
      ],
      HostFormQuestionKind.singleChoice ||
      HostFormQuestionKind.boolean => const [
        HostFormLogicOperator.equals,
        HostFormLogicOperator.notEquals,
        HostFormLogicOperator.answered,
        HostFormLogicOperator.notAnswered,
      ],
      _ => const [
        HostFormLogicOperator.equals,
        HostFormLogicOperator.notEquals,
        HostFormLogicOperator.contains,
        HostFormLogicOperator.notContains,
        HostFormLogicOperator.answered,
        HostFormLogicOperator.notAnswered,
      ],
    };
