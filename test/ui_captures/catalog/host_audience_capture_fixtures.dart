part of 'screen_capture_catalog.dart';

final _audienceCaptureJourney = HostAudienceJourneyFixture.maya;
final _personCaptureJourney = HostAudienceJourneyFixture.ananya(
  HostOperationsFixtures.primaryOrganizer.id,
);
Map<String, Object?> _audienceCaptureDetailMap() =>
    _audienceCaptureJourney.responseData();

final _audienceCaptureAudience = HostSavedAudience(
  organizerId: 'preview-organizer',
  audienceId: 'preview-audience',
  name: 'Sunday regulars',
  status: 'active',
  definition: const HostSavedAudienceDefinition(
    join: HostSavedAudienceJoin.all,
    predicates: [HostSavedAudienceAttendedEvent('sunday-social')],
  ),
  definitionHash: 'preview-definition',
  definitionVersion: 2,
  revision: 1,
  lastPreviewMatchCount: 1,
  lastPreviewReachSummary: _audienceCaptureReach,
  lastPreviewAt: DateTime(2026, 9, 3, 12),
  createdAt: DateTime(2026, 9, 3),
  updatedAt: DateTime(2026, 9, 3),
);
const _audienceCaptureReach = HostAudienceReachSummary(
  inCatch: 0,
  automatic: 0,
  byHand: 1,
  unavailable: 0,
);
const _audienceCaptureOptions = HostSavedAudienceFilterOptions(
  forms: [
    HostAudienceSourceOption(
      id: 'form_1',
      title: 'Saturday Social application',
    ),
  ],
  questions: [
    HostAudienceQuestionOption(
      formId: 'form_1',
      versionId: 'application-v1',
      version: 1,
      formTitle: 'Saturday Social application',
      questionId: 'drink',
      label: 'Favorite drink',
      options: [HostAudienceAnswerOption(label: 'Coffee', value: 'coffee')],
    ),
  ],
  events: [
    HostAudienceSourceOption(id: 'sunday-social', title: 'Sunday social'),
  ],
  tags: [],
);

class _AudienceCapturePreviewAudienceMembers
    extends HostSavedAudienceMembersController {
  @override
  Future<HostSavedAudienceMembersState> build(
    HostSavedAudience audience,
  ) async {
    const members = [
      HostSavedAudiencePreviewContact(
        contactId: 'preview-ada',
        displayName: 'Ada',
      ),
    ];
    return HostSavedAudienceMembersState(
      members: members,
      preview: HostSavedAudiencePreview(
        audience: audience,
        matchCount: 1,
        reachSummary: _audienceCaptureReach,
        sample: members,
        evaluatedAt: DateTime(2026, 9, 3, 12),
      ),
    );
  }
}

final _audienceCaptureApplication = _audienceCaptureJourney.application();

HostApplicationDetail _responseReviewCaptureApplication({
  bool imported = false,
  bool revoked = false,
}) => _audienceCaptureJourney.application(
  imported: imported,
  revoked: revoked,
  status: HostApplicationReviewStatus.submitted,
);

class _AudienceCaptureResponses extends HostFormResponsesController {
  @override
  Future<HostFormResponsesState> build(
    HostFormResponseListRequest request,
  ) async {
    final response = _audienceCaptureResponse.response;
    final entries = <HostFormInboxEntry>[
      for (final (index, status) in HostApplicationReviewStatus.values.indexed)
        HostFormInboxEntry(
          entryId: 'application:review-$index',
          submittedAt: DateTime(2026, 9, 21, 12 - index),
          response: index == 0 ? response : null,
          application: HostApplicationSummary(
            applicationId: 'review-$index',
            formId: response.formId,
            formVersionId: response.versionId,
            targetKind: 'organizer',
            targetId: null,
            applicantDisplayName: [
              'Maya Kapoor',
              'Asha Mehta',
              'Rohan Shah',
              'Noor Ali',
              'Dev Patel',
              'Withdrawn applicant',
            ][index],
            reviewStatus: status,
            sourceKind: index == 0
                ? HostApplicationSourceKind.native
                : HostApplicationSourceKind.tabularImport,
            providerId: null,
            submittedAt: DateTime(2026, 9, 21, 12 - index),
            revision: 1,
          ),
        ),
      HostFormInboxEntry.fromResponse(
        HostFormResponseSummary.fromMap({
          ...(_audienceCaptureDetailMap()['response']! as Map<String, Object?>),
          'responseId': 'feedback-1',
          'formTitle': 'Weekend feedback',
          'identity': const {
            'displayName': 'Sara Desai',
            'email': null,
            'phoneE164': null,
            'origin': 'respondentGranted',
          },
        }),
      ),
    ];
    return HostFormResponsesState(
      responses: const [],
      entries: entries
          .where(
            (entry) =>
                request.reviewStatus == null ||
                entry.application?.reviewStatus == request.reviewStatus,
          )
          .toList(),
      nextCursor: null,
    );
  }
}

class _AudienceCaptureApplications extends HostApplicationsDirectoryController {
  @override
  Future<HostApplicationsDirectoryState> build(
    HostApplicationListRequest request,
  ) async {
    final story = _personCaptureJourney;
    if (request.organizerId != story.organizerId ||
        request.contactId != story.contactId) {
      throw StateError(
        'Person capture requested an unrelated application scope',
      );
    }
    final application = story.application();
    return HostApplicationsDirectoryState(
      applications: [
        HostApplicationSummary(
          applicationId: application.applicationId,
          formId: application.formId,
          formVersionId: application.formVersionId,
          targetKind: application.targetKind,
          targetId: application.targetId,
          applicantDisplayName: application.applicantDisplayName,
          reviewStatus: application.reviewStatus,
          sourceKind: HostApplicationSourceKind.native,
          providerId: null,
          submittedAt: application.submittedAt,
          revision: application.revision,
        ),
      ],
      nextCursor: null,
    );
  }
}

class _AudienceCaptureAutomations extends HostFormAutomationsController {
  @override
  Future<HostFormAutomationsState> build(
    String organizerId,
    String? formId,
  ) async => HostFormAutomationsState(
    rules: [
      HostFormAutomationRule(
        ruleId: 'rule_1',
        organizerId: organizerId,
        formId: formId ?? 'form_1',
        name: 'Add new responses to People',
        enabled: true,
        revision: 1,
        trigger: HostFormAutomationTrigger.responseSubmitted,
        condition: null,
        actions: const [
          HostFormAutomationAction(
            actionId: 'action_1',
            kind: HostFormAutomationActionKind.createCrmContact,
            tagId: null,
            eventId: null,
            webhookUrl: null,
            webhookSecretConfigured: false,
            channel: null,
          ),
        ],
        updatedAt: DateTime(2026, 9, 5),
      ),
    ],
    runs: const [],
    nextCursor: null,
  );
}

class _AudienceCapturePublishedEditor extends HostFormEditorController {
  @override
  bool editorBoundTo(String? accountId) => true;

  @override
  Future<HostFormEditorState> build(String organizerId, String formId) async =>
      HostFormEditorState(
        editor: HostFormEditor(
          form: _audienceCapturePublishedSummary(organizerId, formId),
          definition: HostFormDefinition.fromMap(
            _audienceCapturePublishedDefinition(),
          ),
          validationIssues: const [],
        ),
        canUndo: true,
      );
}

HostFormSummary _audienceCapturePublishedSummary(
  String organizerId,
  String formId,
) => HostFormSummary(
  organizerId: organizerId,
  formId: formId,
  title: 'Saturday Social application',
  description: 'A concise application for the next Saturday Social.',
  purpose: HostFormPurpose.application,
  status: HostFormLifecycleStatus.published,
  templateId: 'event_application',
  publicFormId: 'public-$formId',
  defaultTargetKind: HostFormTargetKind.organizer,
  defaultTargetId: organizerId,
  activeVersionId: 'version_1',
  draftRevision: 4,
  publishedVersion: 1,
  submittedResponseCount: 48,
  consequences: const HostFormConsequences(
    coverage: HostFormConsequenceCoverage.exact,
    identityPolicy: HostFormIdentityPolicy.emailOrPhoneVerified,
    enabledAutomationActionKinds: {
      HostFormAutomationActionKind.createCrmContact,
    },
  ),
  updatedAt: DateTime(2026, 8, 31, 8, 45),
  publishedAt: null,
  lastResponseAt: null,
);

Map<String, Object?> _audienceCapturePublishedDefinition() => {
  'schemaVersion': 1,
  'title': 'Saturday Social application',
  'description': 'A concise application for the next Saturday Social.',
  'purpose': 'application',
  'identityPolicy': 'emailOrPhoneVerified',
  'sections': [
    {
      'sectionId': 'about_you',
      'title': 'About you',
      'description': 'The essentials we need to review your application.',
      'pageBreak': false,
      'questions': [
        _audienceCapturePublishedQuestion(
          id: 'full_name',
          label: 'Full name',
          kind: 'shortText',
          canonicalFieldId: 'fullName',
        ),
        _audienceCapturePublishedQuestion(
          id: 'phone_number',
          label: 'Phone number',
          kind: 'phone',
          canonicalFieldId: 'phoneNumber',
        ),
      ],
    },
    {
      'sectionId': 'intent',
      'title': 'What brings you here?',
      'description': null,
      'pageBreak': false,
      'questions': [
        _audienceCapturePublishedQuestion(
          id: 'looking_for',
          label: 'What are you hoping to find?',
          kind: 'longText',
          required: false,
        ),
      ],
    },
  ],
  'logicRules': <Object?>[],
  'appearance': {
    'preset': 'editorial',
    'logoAssetId': null,
    'coverAssetId': null,
    'activityKind': null,
  },
  'availability': {
    'opensAt': null,
    'closesAt': null,
    'responseLimit': null,
    'closedMessage': null,
  },
  'consent': {
    'consentCopy':
        'I consent to this information being used for this application.',
    'consentVersion': 'v1',
    'retentionCopy':
        'Responses are retained for the application review period.',
  },
  'completion': {
    'title': 'Application received',
    'message': 'We will be in touch after the review.',
    'actionKind': 'none',
    'actionLabel': null,
    'actionUrl': null,
  },
};

Map<String, Object?> _audienceCapturePublishedQuestion({
  required String id,
  required String label,
  required String kind,
  String? canonicalFieldId,
  bool required = true,
}) => {
  'questionId': id,
  'key': id,
  'label': label,
  'helpText': null,
  'kind': kind,
  'required': required,
  'options': <Object?>[],
  'canonicalFieldId': canonicalFieldId,
  'privacyClass': canonicalFieldId == null ? 'organizerCustom' : 'contact',
  'prefillPolicy': 'never',
  'hostPresentation': 'detailOnly',
  'validation': {
    'minLength': null,
    'maxLength': null,
    'minNumber': null,
    'maxNumber': null,
    'earliestDate': null,
    'latestDate': null,
    'minSelections': null,
    'maxSelections': null,
    'maxFileCount': null,
    'maxFileSizeBytes': null,
    'allowedMimeTypes': <Object?>[],
    'patternPreset': null,
    'customError': null,
  },
};

final _audienceCaptureResponse = HostFormResponseDetail.fromCallableData(
  _audienceCaptureDetailMap(),
);
List<Object> _audienceCaptureSources(
  String organizerId, {
  HostSavedAudienceFilterOptions? options,
}) => [
  hostSavedAudienceFilterOptionsProvider(
    organizerId,
  ).overrideWith((_) async => options ?? _audienceCaptureJourney.filterOptions),
];
List<Object> _audienceCaptureFormOverrides({bool published = false}) => [
  hostFormEditorControllerProvider(
    HostOperationsFixtures.primaryOrganizer.id,
    'saturday-social-application',
  ).overrideWith(
    published
        ? _AudienceCapturePublishedEditor.new
        : _CaptureHostFormEditorController.new,
  ),
  hostFormResponsesControllerProvider.overrideWith2(
    (_) => _AudienceCaptureResponses(),
  ),
];
List<Object> _audienceCaptureResponseOverrides({
  bool application = true,
  bool withdrawn = false,
}) => [
  ..._audienceCaptureSources('org_1'),
  hostApplicationDetailProvider(
    'org_1',
    'design-application-1',
  ).overrideWithValue(AsyncData(_audienceCaptureApplication)),
  hostFormResponseCanApplyProvider(
    organizerId: 'org_1',
    responseId: 'response_1',
  ).overrideWith((_) async => application),
  hostFormResponseDetailProvider(
    organizerId: 'org_1',
    responseId: 'response_1',
  ).overrideWith(
    (_) async => _audienceCaptureJourney.response(
      linked: application,
      withdrawn: withdrawn,
    ),
  ),
];
List<Object> _audienceCaptureAutomationOverrides() => [
  ..._audienceCaptureSources('org_1'),
  hostFormAutomationsControllerProvider.overrideWith2(
    (_) => _AudienceCaptureAutomations(),
  ),
];
List<Object> _audienceCaptureGroupOverrides() => [
  ..._audienceCaptureSources(
    _audienceCaptureAudience.organizerId,
    options: _audienceCaptureOptions,
  ),
  hostSavedAudienceMembersControllerProvider(
    _audienceCaptureAudience,
  ).overrideWith(_AudienceCapturePreviewAudienceMembers.new),
];
List<Object> _audienceCapturePersonOverrides() => [
  ..._hostShellCaptureOverrides(HostOperationsFixtures.hostUid),
  uidProvider.overrideWithValue(
    const AsyncData<String?>(HostOperationsFixtures.hostUid),
  ),
  ..._audienceCaptureSources(
    _personCaptureJourney.organizerId,
    options: _personCaptureJourney.filterOptions,
  ),
  hostAudienceContactDetailProvider(
    HostOperationsFixtures.primaryOrganizer.id,
    'capture-customer-ananya',
  ).overrideWithValue(AsyncData(_hostCustomerMemoryDetail())),
  hostCommunicationPlanProvider(
    HostOperationsFixtures.primaryOrganizer.id,
    'capture-customer-ananya',
  ).overrideWithValue(AsyncData(_hostCustomerMemoryCommunicationPlan())),
  hostApplicationDetailProvider(
    _personCaptureJourney.organizerId,
    _personCaptureJourney.applicationId,
  ).overrideWithValue(AsyncData(_personCaptureJourney.application())),
  hostFormResponseDetailProvider(
    organizerId: _personCaptureJourney.organizerId,
    responseId: _personCaptureJourney.responseId,
  ).overrideWith((_) async => _personCaptureJourney.response()),
  hostApplicationsDirectoryControllerProvider.overrideWith2(
    (_) => _AudienceCaptureApplications(),
  ),
];
Future<void> _audienceCaptureOpenTab(WidgetTester tester, String label) async {
  final tab = find.text(label).first;
  await tester.ensureVisible(tab);
  await pumpFeatureUi(tester);
  await tester.tap(tab);
  await pumpFeatureUi(tester);
}
