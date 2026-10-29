import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_automation.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_configuration.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_definition.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_logic.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_question.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_summary.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:flutter/material.dart';

String hostFormQuestionSummary(
  BuildContext context,
  HostFormQuestion question,
) => context.l10n.hostFormQuestionSummary(
  type: hostFormQuestionKindLabel(context, question.kind),
  requirement: question.required
      ? context.l10n.hostFormRequiredShort
      : context.l10n.hostFormOptionalShort,
);

String hostFormAvailabilitySummary(
  BuildContext context,
  HostFormDefinition definition,
) {
  final opensAt = definition.opensAt;
  final closesAt = definition.closesAt;
  if (opensAt == null && closesAt == null) {
    return context.l10n.hostFormAvailabilityAlwaysOpen;
  }
  final localizations = MaterialLocalizations.of(context);
  final opensLabel = opensAt == null
      ? null
      : context.l10n.hostFormAvailabilityOpens(
          date: localizations.formatMediumDate(opensAt.toLocal()),
        );
  final closesLabel = closesAt == null
      ? null
      : context.l10n.hostFormAvailabilityCloses(
          date: localizations.formatMediumDate(closesAt.toLocal()),
        );
  return [opensLabel, closesLabel].whereType<String>().join(' · ');
}

String hostFormAppearanceLabel(
  BuildContext context,
  HostFormAppearancePreset value,
) => switch (value) {
  HostFormAppearancePreset.editorial =>
    context.l10n.hostFormAppearanceEditorial,
  HostFormAppearancePreset.minimal => context.l10n.hostFormAppearanceMinimal,
  HostFormAppearancePreset.activity => context.l10n.hostFormAppearanceActivity,
};

String hostFormCompletionActionLabel(
  BuildContext context,
  HostFormCompletionAction value,
) => switch (value) {
  HostFormCompletionAction.none => context.l10n.hostFormCompletionActionNone,
  HostFormCompletionAction.externalUrl =>
    context.l10n.hostFormCompletionActionExternal,
  HostFormCompletionAction.event => context.l10n.hostFormCompletionActionEvent,
  HostFormCompletionAction.eventRuntime =>
    context.l10n.hostFormCompletionActionRuntime,
};

String hostFormPrivacyLabel(BuildContext context, HostFormPrivacyClass value) =>
    switch (value) {
      HostFormPrivacyClass.contact => context.l10n.hostFormPrivacyContact,
      HostFormPrivacyClass.profile => context.l10n.hostFormPrivacyProfile,
      HostFormPrivacyClass.sensitive => context.l10n.hostFormPrivacySensitive,
      HostFormPrivacyClass.organizerCustom =>
        context.l10n.hostFormPrivacyCustom,
    };

String hostFormPrefillLabel(
  BuildContext context,
  HostFormPrefillPolicy value,
) => switch (value) {
  HostFormPrefillPolicy.never => context.l10n.hostFormPrefillNever,
  HostFormPrefillPolicy.participantReviewRequired =>
    context.l10n.hostFormPrefillReview,
};

String hostFormPresentationLabel(
  BuildContext context,
  HostFormPresentation value,
) => switch (value) {
  HostFormPresentation.detailOnly => context.l10n.hostFormPresentationDetail,
  HostFormPresentation.filterable => context.l10n.hostFormPresentationFilter,
  HostFormPresentation.sortable => context.l10n.hostFormPresentationSort,
};

String hostFormPatternLabel(
  BuildContext context,
  HostFormPatternPreset value,
) => switch (value) {
  HostFormPatternPreset.lettersAndSpaces => context.l10n.hostFormPatternLetters,
  HostFormPatternPreset.alphanumeric =>
    context.l10n.hostFormPatternAlphanumeric,
  HostFormPatternPreset.postalCode => context.l10n.hostFormPatternPostal,
  HostFormPatternPreset.handle => context.l10n.hostFormPatternHandle,
};

String hostFormLogicOperatorLabel(
  BuildContext context,
  HostFormLogicOperator value,
) => switch (value) {
  HostFormLogicOperator.equals => context.l10n.hostFormOperatorEquals,
  HostFormLogicOperator.notEquals => context.l10n.hostFormOperatorNotEquals,
  HostFormLogicOperator.contains => context.l10n.hostFormOperatorContains,
  HostFormLogicOperator.notContains => context.l10n.hostFormOperatorNotContains,
  HostFormLogicOperator.greaterThan => context.l10n.hostFormOperatorGreater,
  HostFormLogicOperator.lessThan => context.l10n.hostFormOperatorLess,
  HostFormLogicOperator.answered => context.l10n.hostFormOperatorAnswered,
  HostFormLogicOperator.notAnswered => context.l10n.hostFormOperatorNotAnswered,
};

String hostFormLogicActionLabel(
  BuildContext context,
  HostFormLogicAction value,
) => switch (value) {
  HostFormLogicAction.showQuestion => context.l10n.hostFormActionShowQuestion,
  HostFormLogicAction.hideQuestion => context.l10n.hostFormActionHideQuestion,
  HostFormLogicAction.showSection => context.l10n.hostFormActionShowSection,
  HostFormLogicAction.hideSection => context.l10n.hostFormActionHideSection,
  HostFormLogicAction.routeToSection => context.l10n.hostFormActionRouteSection,
  HostFormLogicAction.finish => context.l10n.hostFormActionFinish,
};

String hostFormLogicRuleSummary(
  BuildContext context,
  HostFormDefinition definition,
  HostFormLogicRule rule,
) {
  final questions = definition.sections
      .expand((section) => section.questions)
      .toList(growable: false);
  final source = questions
      .where((question) => question.questionId == rule.condition.questionId)
      .map((question) => question.label)
      .firstOrNull;
  final target = rule.targetQuestionId == null
      ? definition.sections
            .where((section) => section.sectionId == rule.targetSectionId)
            .map((section) => section.title)
            .firstOrNull
      : questions
            .where((question) => question.questionId == rule.targetQuestionId)
            .map((question) => question.label)
            .firstOrNull;
  return [
    source,
    hostFormLogicOperatorLabel(context, rule.condition.operator),
    hostFormLogicActionLabel(context, rule.action),
    target,
  ].whereType<String>().join(' · ');
}

String hostFormSaveLabel(BuildContext context, HostFormEditorState state) =>
    switch (state.saveState) {
      HostFormSaveState.saved => context.l10n.hostFormSaved,
      HostFormSaveState.dirty => context.l10n.hostFormUnsaved,
      HostFormSaveState.saving => context.l10n.hostFormSaving,
      HostFormSaveState.conflict => context.l10n.hostFormSaveConflict,
      HostFormSaveState.failed => context.l10n.hostFormSaveFailed,
    };

String hostFormBuilderConsequenceSummary(
  BuildContext context, {
  required HostFormPurpose purpose,
  required HostFormIdentityPolicy identityPolicy,
  required HostFormConsequences consequences,
}) {
  final parts = <String>[
    hostFormBuilderIdentityConsequence(context, identityPolicy),
  ];
  if (purpose == HostFormPurpose.application) {
    parts.add(context.l10n.hostFormConsequenceApplicationReview);
  }
  if (!consequences.isExact) {
    parts.add(context.l10n.hostFormAutomationConsequencesUnavailable);
    return parts.join(' · ');
  }
  final enabledActions = consequences.enabledAutomationActionKinds;
  if (enabledActions.contains(HostFormAutomationActionKind.createCrmContact)) {
    parts.add(context.l10n.hostFormConsequenceCreatesCustomer);
  }
  if (purpose != HostFormPurpose.application &&
      enabledActions.contains(
        HostFormAutomationActionKind.addApplicationQueue,
      )) {
    parts.add(context.l10n.hostFormConsequenceApplicationReview);
  }
  if (enabledActions.contains(
    HostFormAutomationActionKind.proposeEventAttendee,
  )) {
    parts.add(context.l10n.hostFormConsequenceProposesAttendee);
  }
  if (enabledActions.contains(HostFormAutomationActionKind.addOrganizerTag)) {
    parts.add(context.l10n.hostFormConsequenceAppliesTags);
  }
  if (enabledActions.contains(HostFormAutomationActionKind.notifyTeam)) {
    parts.add(context.l10n.hostFormConsequenceNotifiesTeam);
  }
  if (enabledActions.contains(HostFormAutomationActionKind.signedWebhook)) {
    parts.add(context.l10n.hostFormConsequenceCallsWebhook);
  }
  if (enabledActions.contains(HostFormAutomationActionKind.campaignHandoff)) {
    parts.add(context.l10n.hostFormConsequencePreparesSend);
  }
  if (parts.length == 1) {
    parts.add(context.l10n.hostFormConsequenceFormsOnly);
  }
  return parts.join(' · ');
}

String hostFormBuilderIdentityConsequence(
  BuildContext context,
  HostFormIdentityPolicy policy,
) => switch (policy) {
  HostFormIdentityPolicy.anonymous =>
    context.l10n.hostFormConsequenceIdentityAnonymous,
  HostFormIdentityPolicy.emailVerified =>
    context.l10n.hostFormConsequenceIdentityEmail,
  HostFormIdentityPolicy.phoneVerified =>
    context.l10n.hostFormConsequenceIdentityPhone,
  HostFormIdentityPolicy.emailOrPhoneVerified =>
    context.l10n.hostFormConsequenceIdentityEmailOrPhone,
  HostFormIdentityPolicy.catchAccount =>
    context.l10n.hostFormConsequenceIdentityCatchAccount,
};

String hostFormIdentityLabel(
  BuildContext context,
  HostFormIdentityPolicy policy,
) => switch (policy) {
  HostFormIdentityPolicy.anonymous => context.l10n.hostFormIdentityAnonymous,
  HostFormIdentityPolicy.emailVerified => context.l10n.hostFormIdentityEmail,
  HostFormIdentityPolicy.phoneVerified => context.l10n.hostFormIdentityPhone,
  HostFormIdentityPolicy.emailOrPhoneVerified =>
    context.l10n.hostFormIdentityEmailOrPhone,
  HostFormIdentityPolicy.catchAccount =>
    context.l10n.hostFormIdentityCatchAccount,
};

String hostFormQuestionKindLabel(
  BuildContext context,
  HostFormQuestionKind kind,
) => switch (kind) {
  HostFormQuestionKind.shortText => context.l10n.hostFormTypeShortText,
  HostFormQuestionKind.longText => context.l10n.hostFormTypeLongText,
  HostFormQuestionKind.singleChoice => context.l10n.hostFormTypeSingleChoice,
  HostFormQuestionKind.multiChoice => context.l10n.hostFormTypeMultiChoice,
  HostFormQuestionKind.date => context.l10n.hostFormTypeDate,
  HostFormQuestionKind.phone => context.l10n.hostFormTypePhone,
  HostFormQuestionKind.email => context.l10n.hostFormTypeEmail,
  HostFormQuestionKind.url => context.l10n.hostFormTypeUrl,
  HostFormQuestionKind.number => context.l10n.hostFormTypeNumber,
  HostFormQuestionKind.boolean => context.l10n.hostFormTypeBoolean,
  HostFormQuestionKind.file => context.l10n.hostFormTypeFile,
  HostFormQuestionKind.acknowledgement =>
    context.l10n.hostFormTypeAcknowledgement,
  HostFormQuestionKind.signature => context.l10n.hostFormTypeSignature,
};

String hostFormConsequenceSummary(BuildContext context, HostFormSummary form) {
  final projection = form.consequences;
  if (projection.coverage == HostFormConsequenceCoverage.unavailable) {
    return [
      context.l10n.hostFormConsequencesUnavailable,
      if (form.purpose == HostFormPurpose.application)
        context.l10n.hostFormConsequenceApplicationReview,
    ].join(' · ');
  }
  final parts = <String>[
    _hostFormIdentityConsequence(context, projection.identityPolicy),
  ];
  if (projection.coverage == HostFormConsequenceCoverage.identityOnly) {
    parts.add(context.l10n.hostFormAutomationConsequencesUnavailable);
    return parts.join(' · ');
  }
  final actions = projection.enabledAutomationActionKinds;
  if (actions.contains(HostFormAutomationActionKind.createCrmContact)) {
    parts.add(context.l10n.hostFormConsequenceCreatesCustomer);
  }
  if (form.purpose == HostFormPurpose.application ||
      actions.contains(HostFormAutomationActionKind.addApplicationQueue)) {
    parts.add(context.l10n.hostFormConsequenceApplicationReview);
  }
  if (actions.contains(HostFormAutomationActionKind.proposeEventAttendee)) {
    parts.add(context.l10n.hostFormConsequenceProposesAttendee);
  }
  if (actions.contains(HostFormAutomationActionKind.addOrganizerTag)) {
    parts.add(context.l10n.hostFormConsequenceAppliesTags);
  }
  if (actions.contains(HostFormAutomationActionKind.notifyTeam)) {
    parts.add(context.l10n.hostFormConsequenceNotifiesTeam);
  }
  if (actions.contains(HostFormAutomationActionKind.signedWebhook)) {
    parts.add(context.l10n.hostFormConsequenceCallsWebhook);
  }
  if (actions.contains(HostFormAutomationActionKind.campaignHandoff)) {
    parts.add(context.l10n.hostFormConsequencePreparesSend);
  }
  if (parts.length == 1) {
    parts.add(context.l10n.hostFormConsequenceFormsOnly);
  }
  return parts.join(' · ');
}

String _hostFormIdentityConsequence(
  BuildContext context,
  HostFormIdentityPolicy? policy,
) => switch (policy) {
  HostFormIdentityPolicy.anonymous =>
    context.l10n.hostFormConsequenceIdentityAnonymous,
  HostFormIdentityPolicy.emailVerified =>
    context.l10n.hostFormConsequenceIdentityEmail,
  HostFormIdentityPolicy.phoneVerified =>
    context.l10n.hostFormConsequenceIdentityPhone,
  HostFormIdentityPolicy.emailOrPhoneVerified =>
    context.l10n.hostFormConsequenceIdentityEmailOrPhone,
  HostFormIdentityPolicy.catchAccount =>
    context.l10n.hostFormConsequenceIdentityCatchAccount,
  null => context.l10n.hostFormConsequenceIdentityUnknown,
};

String hostFormStatusLabel(
  BuildContext context,
  HostFormLifecycleStatus status,
) => switch (status) {
  HostFormLifecycleStatus.draft => context.l10n.hostFormsStatusDraft,
  HostFormLifecycleStatus.published => context.l10n.hostFormsStatusPublished,
  HostFormLifecycleStatus.paused => context.l10n.hostFormsStatusPaused,
  HostFormLifecycleStatus.archived => context.l10n.hostFormsStatusArchived,
};

String hostFormPurposeLabel(BuildContext context, HostFormPurpose purpose) =>
    switch (purpose) {
      HostFormPurpose.application => context.l10n.hostFormsPurposeApplication,
      HostFormPurpose.registration => context.l10n.hostFormsPurposeRegistration,
      HostFormPurpose.intake => context.l10n.hostFormsPurposeIntake,
      HostFormPurpose.waiver => context.l10n.hostFormsPurposeWaiver,
      HostFormPurpose.feedback => context.l10n.hostFormsPurposeFeedback,
      HostFormPurpose.survey => context.l10n.hostFormsPurposeSurvey,
    };
