import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_automation.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_configuration.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_question.dart';
import 'package:catch_dating_app/contexts/forms/domain/host_application_summary.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';

/// What a form is for, in the words of the forms list: Application,
/// Interest list, Enquiry, Feedback.
String hostFormKindLabel(AppLocalizations l10n, HostFormPurpose purpose) =>
    switch (purpose) {
      HostFormPurpose.application => l10n.hostFormsKindApplication,
      HostFormPurpose.registration => l10n.hostFormsKindInterestList,
      HostFormPurpose.intake => l10n.hostFormsKindEnquiry,
      HostFormPurpose.feedback => l10n.hostFormsKindFeedback,
      HostFormPurpose.waiver => l10n.hostFormsKindWaiver,
      HostFormPurpose.survey => l10n.hostFormsKindSurvey,
    };

/// What happens after someone answers, for the new form's kind choice.
String hostFormKindNote(AppLocalizations l10n, HostFormPurpose purpose) =>
    switch (purpose) {
      HostFormPurpose.application => l10n.hostFormsKindApplicationNote,
      HostFormPurpose.registration => l10n.hostFormsKindInterestListNote,
      HostFormPurpose.intake => l10n.hostFormsKindEnquiryNote,
      HostFormPurpose.feedback => l10n.hostFormsKindFeedbackNote,
      HostFormPurpose.waiver => l10n.hostFormsKindWaiverNote,
      HostFormPurpose.survey => l10n.hostFormsKindSurveyNote,
    };

/// The kind badge's tone on a form row.
CatchBadgeTone hostFormKindTone(HostFormPurpose purpose) => switch (purpose) {
  HostFormPurpose.application => CatchBadgeTone.info,
  HostFormPurpose.registration => CatchBadgeTone.social,
  HostFormPurpose.intake => CatchBadgeTone.warning,
  HostFormPurpose.feedback => CatchBadgeTone.success,
  HostFormPurpose.waiver || HostFormPurpose.survey => CatchBadgeTone.neutral,
};

/// Whether the form is taking answers, in the host's words.
String hostFormStatusText(
  AppLocalizations l10n,
  HostFormLifecycleStatus status,
) => switch (status) {
  HostFormLifecycleStatus.published => l10n.hostFormsStatusTakingAnswers,
  HostFormLifecycleStatus.paused => l10n.hostFormsStatusPaused,
  HostFormLifecycleStatus.draft => l10n.hostFormsStatusDraft,
  HostFormLifecycleStatus.archived => l10n.hostFormsStatusClosed,
};

/// The status badge's tone; only a form taking answers reads as success.
CatchBadgeTone hostFormStatusTone(HostFormLifecycleStatus status) =>
    switch (status) {
      HostFormLifecycleStatus.published => CatchBadgeTone.success,
      HostFormLifecycleStatus.paused => CatchBadgeTone.warning,
      HostFormLifecycleStatus.draft ||
      HostFormLifecycleStatus.archived => CatchBadgeTone.neutral,
    };

/// Where people find the form.
String hostFormPlacementText(AppLocalizations l10n, HostFormTargetKind kind) =>
    switch (kind) {
      HostFormTargetKind.organizer => l10n.hostFormsPlacementPage,
      HostFormTargetKind.event => l10n.hostFormsPlacementEvent,
      HostFormTargetKind.campaign => l10n.hostFormsPlacementCampaign,
    };

/// Where a response stands with the host.
String hostFormReviewText(
  AppLocalizations l10n,
  HostApplicationReviewStatus status,
) => switch (status) {
  HostApplicationReviewStatus.submitted => l10n.hostFormsReviewNew,
  HostApplicationReviewStatus.inReview => l10n.hostFormsReviewReviewing,
  HostApplicationReviewStatus.approved => l10n.hostFormsReviewIn,
  HostApplicationReviewStatus.waitlisted => l10n.hostFormsReviewWaitlist,
  HostApplicationReviewStatus.declined => l10n.hostFormsReviewNotNow,
  HostApplicationReviewStatus.withdrawn => l10n.hostFormsReviewWithdrawn,
};

CatchBadgeTone hostFormReviewTone(HostApplicationReviewStatus status) =>
    switch (status) {
      HostApplicationReviewStatus.submitted => CatchBadgeTone.social,
      HostApplicationReviewStatus.inReview => CatchBadgeTone.warning,
      HostApplicationReviewStatus.approved => CatchBadgeTone.success,
      HostApplicationReviewStatus.waitlisted => CatchBadgeTone.info,
      HostApplicationReviewStatus.declined ||
      HostApplicationReviewStatus.withdrawn => CatchBadgeTone.neutral,
    };

/// A question's kind and whether it is required, under its title.
String hostFormQuestionKindText(
  AppLocalizations l10n,
  HostFormQuestionKind kind,
) => switch (kind) {
  HostFormQuestionKind.shortText => l10n.hostFormsQuestionShortAnswer,
  HostFormQuestionKind.longText => l10n.hostFormsQuestionLongAnswer,
  HostFormQuestionKind.singleChoice => l10n.hostFormsQuestionPickOne,
  HostFormQuestionKind.multiChoice => l10n.hostFormsQuestionPickAny,
  HostFormQuestionKind.date => l10n.hostFormsQuestionDate,
  HostFormQuestionKind.phone => l10n.hostFormsQuestionPhone,
  HostFormQuestionKind.email => l10n.hostFormsQuestionEmail,
  HostFormQuestionKind.url => l10n.hostFormsQuestionLink,
  HostFormQuestionKind.number => l10n.hostFormsQuestionNumber,
  HostFormQuestionKind.boolean => l10n.hostFormsQuestionYesNo,
  HostFormQuestionKind.file => l10n.hostFormsQuestionFile,
  HostFormQuestionKind.acknowledgement => l10n.hostFormsQuestionAgreement,
  HostFormQuestionKind.signature => l10n.hostFormsQuestionSignature,
};

/// What happens when the host lets someone in, one line per enabled action.
String hostFormConsequenceText(
  AppLocalizations l10n,
  HostFormAutomationActionKind kind,
) => switch (kind) {
  HostFormAutomationActionKind.notifyTeam => l10n.hostFormsThenNotifyTeam,
  HostFormAutomationActionKind.addOrganizerTag => l10n.hostFormsThenTag,
  HostFormAutomationActionKind.createCrmContact => l10n.hostFormsThenPeople,
  HostFormAutomationActionKind.addApplicationQueue => l10n.hostFormsThenQueue,
  HostFormAutomationActionKind.proposeEventAttendee =>
    l10n.hostFormsThenProposeEvent,
  HostFormAutomationActionKind.signedWebhook => l10n.hostFormsThenWebhook,
  HostFormAutomationActionKind.campaignHandoff => l10n.hostFormsThenMessage,
};
