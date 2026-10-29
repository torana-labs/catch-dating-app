import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience_filter_options.dart';
import 'package:catch_dating_app/contexts/forms/data/host_application_repository.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';

/// Display-only stories. These projections do not prove a backend submission.
class HostAudienceJourneyFixture {
  const HostAudienceJourneyFixture._({
    required this.organizerId,
    required this.contactId,
    required this.applicationId,
    required this.responseId,
    required this.formId,
    required this.versionId,
    required this.formTitle,
    required this.name,
    required this.email,
    required this.identityKind,
    required this.submittedAt,
    required this.questions,
    this.targetId,
    this.targetTitle,
  });

  static final maya = HostAudienceJourneyFixture._(
    organizerId: 'org_1',
    contactId: 'contact_1',
    applicationId: 'design-application-1',
    responseId: 'response_1',
    formId: 'form_1',
    versionId: 'version_1',
    formTitle: 'Saturday Social application',
    targetId: 'sunday-social',
    targetTitle: 'Sunday social',
    name: 'Maya Kapoor',
    email: 'maya@example.com',
    identityKind: 'phoneVerified',
    submittedAt: DateTime(2026, 8, 20, 10, 42),
    questions: const [
      (
        id: 'question_1',
        key: 'why_join',
        label: 'Why do you want to join?',
        kind: 'longText',
        answer: 'I love meeting new people in the city.',
      ),
      (
        id: 'question_2',
        key: 'anything_else',
        label: 'Anything else we should know?',
        kind: 'longText',
        answer: 'I am visiting from Montreal.',
      ),
    ],
  );

  factory HostAudienceJourneyFixture.ananya(String organizerId) =>
      HostAudienceJourneyFixture._(
        organizerId: organizerId,
        contactId: 'capture-customer-ananya',
        applicationId: 'capture-application-1',
        responseId: 'capture-response-1',
        formId: 'capture-form-1',
        versionId: 'capture-version-1',
        formTitle: 'Sunday Run sign-up',
        name: 'Ananya Rao',
        email: 'ananya@example.com',
        identityKind: 'catchAccount',
        submittedAt: DateTime(2026, 5, 20),
        questions: const [
          (
            id: 'name',
            key: 'name',
            label: 'Name',
            kind: 'shortText',
            answer: 'Ananya Rao',
          ),
          (
            id: 'phone',
            key: 'phone',
            label: 'Phone',
            kind: 'phone',
            answer: '+919876543210',
          ),
          (
            id: 'email',
            key: 'email',
            label: 'Email',
            kind: 'email',
            answer: 'ananya@example.com',
          ),
          (
            id: 'diet',
            key: 'diet',
            label: 'Diet',
            kind: 'shortText',
            answer: 'Vegetarian',
          ),
          (
            id: 'occupation',
            key: 'occupation',
            label: 'Occupation',
            kind: 'shortText',
            answer: 'Product designer',
          ),
        ],
      );

  final String? targetId;
  final String? targetTitle;
  final String organizerId;
  final String contactId;
  final String applicationId;
  final String responseId;
  final String formId;
  final String versionId;
  final String formTitle;
  final String name;
  final String email;
  final String identityKind;
  final DateTime submittedAt;
  final List<
    ({String id, String key, String label, String kind, String answer})
  >
  questions;

  Map<String, Object?> responseData({
    bool linked = true,
    bool withdrawn = false,
  }) => {
    'applicationId': linked && !withdrawn ? applicationId : null,
    'contactId': linked && !withdrawn ? contactId : null,
    'response': {
      'responseId': responseId,
      'formId': formId,
      'formTitle': formTitle,
      'versionId': versionId,
      'version': 1,
      'status': withdrawn ? 'withdrawn' : 'submitted',
      'identityKind': identityKind,
      'identity': {
        'displayName': name,
        'email': email,
        'phoneE164': '+919876543210',
        'origin': 'respondentGranted',
      },
      'sourceLinkId': null,
      'sourceLabel': 'Instagram',
      'submittedAtMillis': submittedAt.millisecondsSinceEpoch,
      'withdrawnAtMillis': withdrawn
          ? submittedAt.add(const Duration(days: 1)).millisecondsSinceEpoch
          : null,
      'highlights': <Object?>[],
      'conversionKinds': <Object?>[],
    },
    'answers': [
      for (final question in questions)
        {
          'questionId': question.id,
          'key': question.key,
          'label': question.label,
          'kind': question.kind,
          'privacyClass': 'organizerCustom',
          'hostPresentation': 'detailOnly',
          'answer': question.answer,
          'origin': withdrawn ? 'revoked' : 'respondentGranted',
          'assetDownloads': <Object?>[],
        },
    ],
    'consentVersion': 'v1',
    'completionMillis': 82000,
  };

  HostFormResponseDetail response({
    bool linked = true,
    bool withdrawn = false,
  }) => HostFormResponseDetail.fromCallableData(
    responseData(linked: linked, withdrawn: withdrawn),
  );

  HostApplicationDetail application({
    bool imported = false,
    bool revoked = false,
    HostApplicationReviewStatus status = HostApplicationReviewStatus.approved,
  }) => HostApplicationDetail.fromCallableData({
    'organizerId': organizerId,
    'applicationId': applicationId,
    'formId': formId,
    'formVersionId': versionId,
    'targetKind': targetId == null ? 'organizer' : 'event',
    'targetId': targetId,
    'applicantDisplayName': name,
    'reviewStatus': status.name,
    'answers': [
      if (!revoked)
        for (final question in questions)
          {
            'questionId': question.id,
            'questionKey': question.key,
            'questionLabel': question.label,
            'questionKind': question.kind,
            'canonicalFieldId': null,
            'privacyClass': 'organizerCustom',
            'hostPresentation': 'detailOnly',
            'value': {
              'valueKind': 'text',
              'textValue': question.answer,
              'numberValue': null,
              'booleanValue': null,
              'dateValue': null,
              'optionValues': <Object?>[],
              'assetIds': <Object?>[],
            },
          },
    ],
    'outreach': {
      'phoneE164': revoked ? null : '+919876543210',
      'email': revoked ? null : email,
      'instagramUrl': revoked
          ? null
          : 'https://www.instagram.com/${name.split(' ').first.toLowerCase()}.example/',
      'linkedinUrl': null,
    },
    'reviewNote': null,
    'assignedReviewerUid': null,
    'submittedAtMillis': submittedAt.millisecondsSinceEpoch,
    'reviewedAtMillis': status == HostApplicationReviewStatus.approved
        ? submittedAt.add(const Duration(days: 1)).millisecondsSinceEpoch
        : null,
    'revision': status == HostApplicationReviewStatus.approved ? 2 : 1,
    'contactId': imported || revoked ? null : contactId,
    'sourceResponseId': imported ? null : responseId,
    'dataAccessState': revoked
        ? 'revokedParticipantGrant'
        : imported
        ? 'organizerImported'
        : 'submittedFormResponse',
  });

  // These text answers are detail-only, not categorical filter choices.
  HostSavedAudienceFilterOptions get filterOptions =>
      HostSavedAudienceFilterOptions(
        forms: [HostAudienceSourceOption(id: formId, title: formTitle)],
        questions: const [],
        events: [
          if (targetId case final id?)
            HostAudienceSourceOption(id: id, title: targetTitle!),
        ],
        tags: const [],
      );
}
