import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_analytics.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_automation.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_configuration.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_question.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_summary.dart';
import 'package:catch_dating_app/contexts/forms/domain/host_application_summary.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

/// The forms fixtures: Lantern Lane's Sunday run application and its
/// answers, on Sunday 8 November 2026 at 6 PM.
final formsNow = DateTime(2026, 11, 8, 18);

HostFormSummary formSummary({
  String formId = 'join-the-run',
  String title = 'Join the Sunday run',
  HostFormPurpose purpose = HostFormPurpose.application,
  HostFormLifecycleStatus status = HostFormLifecycleStatus.published,
  int responses = 61,
  Set<HostFormAutomationActionKind> actions = const {
    HostFormAutomationActionKind.createCrmContact,
    HostFormAutomationActionKind.campaignHandoff,
  },
}) => HostFormSummary(
  organizerId: 'lantern-lane',
  formId: formId,
  title: title,
  description: null,
  purpose: purpose,
  status: status,
  templateId: null,
  publicFormId: 'public-$formId',
  defaultTargetKind: HostFormTargetKind.organizer,
  defaultTargetId: 'lantern-lane',
  activeVersionId: status == HostFormLifecycleStatus.draft
      ? null
      : 'version-$formId',
  draftRevision: 3,
  publishedVersion: status == HostFormLifecycleStatus.draft ? 0 : 1,
  submittedResponseCount: responses,
  consequences: HostFormConsequences(
    coverage: HostFormConsequenceCoverage.exact,
    identityPolicy: HostFormIdentityPolicy.phoneVerified,
    enabledAutomationActionKinds: actions,
  ),
  updatedAt: DateTime(2026, 11, 6),
  publishedAt: DateTime(2026, 11, 2),
  lastResponseAt: DateTime(2026, 11, 7),
);

/// The board's forms list.
final formsList = [
  formSummary(),
  formSummary(
    formId: 'quiz-enquiries',
    title: 'Private quiz enquiries',
    purpose: HostFormPurpose.intake,
    responses: 9,
  ),
  formSummary(
    formId: 'supper-waitlist',
    title: 'Supper club waitlist',
    purpose: HostFormPurpose.registration,
    responses: 140,
  ),
  formSummary(
    formId: 'summer-league',
    title: 'Summer quiz league',
    status: HostFormLifecycleStatus.archived,
    responses: 88,
  ),
];

/// One answer, with its application when [review] is set.
HostFormInboxEntry formEntry({
  required String id,
  required String name,
  List<String> answers = const ['Steady pace', '5 km', 'Instagram'],
  HostApplicationReviewStatus? review = HostApplicationReviewStatus.submitted,
  Duration age = const Duration(days: 2),
}) {
  final submittedAt = formsNow.subtract(age);
  final response = HostFormResponseSummary(
    responseId: 'response-$id',
    formId: 'join-the-run',
    formTitle: 'Join the Sunday run',
    versionId: 'version-join-the-run',
    version: 1,
    status: HostFormResponseStatus.submitted,
    identityKind: HostFormResponseIdentityKind.phoneVerified,
    identity: HostFormResponseIdentity(
      displayName: name,
      email: null,
      phoneE164: '+919820144718',
      origin: HostFormDataOrigin.respondentGranted,
    ),
    sourceLinkId: null,
    sourceLabel: 'Instagram bio',
    submittedAt: submittedAt,
    withdrawnAt: null,
    highlights: [
      for (final (index, answer) in answers.indexed)
        HostFormResponseHighlight(
          questionId: 'q$index',
          label: 'Question $index',
          answer: answer,
        ),
    ],
    conversionKinds: const {},
  );
  return HostFormInboxEntry(
    entryId: 'entry-$id',
    submittedAt: submittedAt,
    response: response,
    application: review == null
        ? null
        : HostApplicationSummary(
            applicationId: 'application-$id',
            formId: 'join-the-run',
            formVersionId: 'version-join-the-run',
            targetKind: 'organizer',
            targetId: 'lantern-lane',
            applicantDisplayName: name,
            reviewStatus: review,
            sourceKind: HostApplicationSourceKind.native,
            providerId: null,
            submittedAt: submittedAt,
            revision: 2,
          ),
  );
}

/// The board's waiting answers.
final formEntries = [
  formEntry(id: 'tara', name: 'Tara Menon'),
  formEntry(
    id: 'ishaan',
    name: 'Ishaan Bose',
    answers: ['Brisk pace', '10 km'],
    age: const Duration(days: 1),
  ),
  formEntry(
    id: 'nikhil',
    name: 'Nikhil Rao',
    answers: ['Chatty pace', '3 km'],
    age: const Duration(hours: 3),
  ),
];

/// A question with [label], optionally required and with choices.
HostFormQuestion formQuestion(
  String id,
  String label, {
  HostFormQuestionKind kind = HostFormQuestionKind.shortText,
  bool required = false,
  List<String> choices = const [],
}) {
  var question = HostFormQuestion.create(
    questionId: id,
    kind: kind,
  ).copyWith(label: label, required: required);
  if (choices.isNotEmpty) {
    for (final _ in question.options.toList()) {
      question = question.removeOption(0);
    }
    for (final (index, choice) in choices.indexed) {
      question = question.addOption(
        HostFormQuestionOption.create(
          optionId: '$id-$index',
          ordinal: index + 1,
        ).copyWith(label: choice),
      );
    }
  }
  return question;
}

/// The Sunday run form's funnel.
const formAnalytics = HostFormAnalytics(
  formId: 'join-the-run',
  versionId: 'version-join-the-run',
  version: 1,
  opens: 412,
  starts: 96,
  submissions: 61,
  withdrawals: 0,
  completionRate: .64,
  medianCompletionMillis: 82000,
  questions: [
    HostFormQuestionAggregate(
      questionId: 'pace',
      label: 'Your easy pace',
      kind: 'singleChoice',
      privacyClass: 'organizerCustom',
      responseCount: 61,
      choiceCounts: [
        HostFormChoiceCount(value: 'steady', label: 'Steady', count: 32),
        HostFormChoiceCount(value: 'brisk', label: 'Brisk', count: 19),
      ],
      numericCount: 0,
      numericSum: 0,
      numericMin: null,
      numericMax: null,
    ),
  ],
  sources: [],
  privacyThreshold: 5,
);

/// Pumps [child] as a phone screen body on the day theme.
Future<void> pumpFormsBody(
  WidgetTester tester,
  Widget child, {
  Size size = const Size(390, 2400),
}) async {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    MaterialApp(
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: CatchRoot(child: CatchScreen(body: child)),
    ),
  );
  await tester.pump();
}
