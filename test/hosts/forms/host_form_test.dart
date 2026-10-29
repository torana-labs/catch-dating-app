import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_analytics.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_automation.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_configuration.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_conversion.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_definition.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_logic.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_question.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_section.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_share.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_summary.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('HostFormDefinition', () {
    test(
      'parses a versioned definition and preserves unknown contract fields',
      () {
        final definition = HostFormDefinition.fromMap(_definitionMap());

        expect(definition.title, 'Community application');
        expect(definition.purpose, HostFormPurpose.application);
        expect(
          definition.sections.single.questions.single.kind,
          HostFormQuestionKind.shortText,
        );

        final updated = definition.copyWith(title: 'Member application');
        expect(updated.title, 'Member application');
        expect(updated.toJson()['schemaVersion'], 1);
        expect(updated.toJson()['customFutureField'], 'preserved');
      },
    );

    test(
      'person mapping survives edits and clears incompatible type changes',
      () {
        final question = HostFormQuestion.create(
          questionId: 'phone',
          kind: HostFormQuestionKind.phone,
        ).copyWith(canonicalFieldId: 'phoneNumber');
        expect(question.canonicalFieldId, 'phoneNumber');
        expect(question.privacyClass, HostFormPrivacyClass.contact);
        expect(
          question.copyWith(label: 'WhatsApp number').canonicalFieldId,
          'phoneNumber',
        );
        expect(
          question.copyWith(kind: HostFormQuestionKind.email).canonicalFieldId,
          isNull,
        );
        expect(
          question.copyWith(clearCanonicalField: true).canonicalFieldId,
          isNull,
        );
        expect(
          () => question.copyWith(canonicalFieldId: 'displayName'),
          throwsArgumentError,
        );
        final instagram = HostFormQuestion.create(
          questionId: 'instagram',
          kind: HostFormQuestionKind.url,
        ).copyWith(canonicalFieldId: 'instagramHandle');
        expect(instagram.canonicalFieldId, 'instagramHandle');
        final age = HostFormQuestion.create(
          questionId: 'age',
          kind: HostFormQuestionKind.number,
        ).copyWith(canonicalFieldId: 'age');
        expect(age.privacyClass, HostFormPrivacyClass.sensitive);
        expect(age.hostPresentation, HostFormPresentation.detailOnly);
      },
    );

    test('event audience stays separate and clears when profile is disabled', () {
      final question = HostFormQuestion.create(
        questionId: 'drink', kind: HostFormQuestionKind.shortText,
      ).copyWith(answerDestination: HostFormAnswerDestination.organizerCard,
        eventProfileAudience: true,
        hostPresentation: HostFormPresentation.filterable);
      expect(question.proposesEventProfile, true);
      expect(question.canonicalFieldId, isNull);
      expect(question.hostPresentation, HostFormPresentation.filterable);
      expect(question.copyWith(
        answerDestination: HostFormAnswerDestination.organizerOnly,
      ).proposesEventProfile, false);
      final definition = HostFormDefinition.fromMap(_definitionMap());
      final withQuestion = definition.replaceSection(0,
        definition.sections.single.replaceQuestion(0, question));
      final enabled = withQuestion.withEventProfileEnabled(true);
      expect(enabled.eventProfileEnabled, true);
      expect(enabled.sections.single.questions.single.proposesEventProfile,
        true);
      final disabled = enabled.withEventProfileEnabled(false);
      expect(disabled.eventProfileEnabled, false);
      expect(disabled.sections.single.questions.single.proposesEventProfile,
        false);
    });

    test('section and question mutations are ordered and non-destructive', () {
      final definition = HostFormDefinition.fromMap(_definitionMap());
      final withSection = definition.addSection(
        HostFormSection.create(sectionId: 'section_2', title: 'Availability'),
      );
      final withQuestion = withSection.replaceSection(
        1,
        withSection.sections[1].addQuestion(
          HostFormQuestion.create(
            questionId: 'question_2',
            kind: HostFormQuestionKind.singleChoice,
          ),
        ),
      );

      expect(withQuestion.sections, hasLength(2));
      expect(withQuestion.sections[1].questions.single.options, hasLength(2));

      final moved = withQuestion.moveSection(1, 0);
      expect(moved.sections.first.sectionId, 'section_2');
      expect(definition.sections.single.sectionId, 'section_1');
    });

    test('moves a stable question between sections without data loss', () {
      final definition = HostFormDefinition.fromMap(_definitionMap())
          .addSection(
            HostFormSection.create(
              sectionId: 'section_2',
              title: 'Availability',
            ),
          );

      final moved = definition.moveQuestionToSection(
        sourceSectionIndex: 0,
        questionIndex: 0,
        targetSectionIndex: 1,
      );

      expect(moved.sections.first.questions, isEmpty);
      expect(moved.sections.last.questions.single.questionId, 'question_1');
      expect(moved.sections.last.questions.single.label, 'Full name');
      expect(
        definition.sections.first.questions.single.questionId,
        'question_1',
      );
    });

    test(
      'edits advanced settings, validation, and logic without data loss',
      () {
        final definition = HostFormDefinition.fromMap(_definitionMap());
        final question = definition.sections.single.questions.single;
        final validation = question.validation.copyWith(
          minLength: 2,
          maxLength: 80,
          patternPreset: HostFormPatternPreset.lettersAndSpaces,
        );
        final withQuestion = definition.replaceSection(
          0,
          definition.sections.single.replaceQuestion(
            0,
            question.copyWith(
              privacyClass: HostFormPrivacyClass.sensitive,
              prefillPolicy: HostFormPrefillPolicy.participantReviewRequired,
              hostPresentation: HostFormPresentation.filterable,
              validation: validation,
            ),
          ),
        );
        final opensAt = DateTime.utc(2026, 9);
        final updated = withQuestion
            .copyWith(
              appearancePreset: HostFormAppearancePreset.activity,
              activityKind: 'Run club',
              opensAt: opensAt,
              setOpensAt: true,
              responseLimit: 120,
              setResponseLimit: true,
              completionAction: HostFormCompletionAction.externalUrl,
              completionActionLabel: 'See schedule',
              completionActionUrl: 'https://catchdates.com/events/',
            )
            .addLogicRule(
              HostFormLogicRule.create(
                ruleId: 'rule_1',
                questionId: question.questionId,
                operator: HostFormLogicOperator.answered,
                expectedValues: const [],
                action: HostFormLogicAction.finish,
              ),
            );

        expect(updated.appearancePreset, HostFormAppearancePreset.activity);
        expect(updated.opensAt, opensAt);
        expect(updated.responseLimit, 120);
        expect(updated.logicRules.single.action, HostFormLogicAction.finish);
        expect(
          updated.sections.single.questions.single.validation.patternPreset,
          HostFormPatternPreset.lettersAndSpaces,
        );
        expect(updated.toJson()['customFutureField'], 'preserved');
      },
    );

    test('resolves forward routes and early finish for preview parity', () {
      final map = _definitionMap();
      final sections = List<Object?>.from(map['sections']! as Iterable);
      map['sections'] = sections;
      sections.addAll([
        _sectionMap('section_2', 'Middle', 'question_2'),
        _sectionMap('section_3', 'Finish', 'question_3'),
      ]);
      map['logicRules'] = [
        {
          'ruleId': 'route_1',
          'conditionMode': 'all',
          'conditions': [
            {
              'questionId': 'question_1',
              'operator': 'equals',
              'expectedValues': ['skip'],
            },
          ],
          'action': 'routeToSection',
          'targetQuestionId': null,
          'targetSectionId': 'section_3',
        },
      ];
      final definition = HostFormDefinition.fromMap(map);

      expect(
        definition
            .reachableSections({'question_1': 'skip'})
            .map((section) => section.sectionId),
        ['section_1', 'section_3'],
      );
      map['logicRules'] = [
        {
          'ruleId': 'finish_1',
          'conditionMode': 'all',
          'conditions': [
            {
              'questionId': 'question_1',
              'operator': 'answered',
              'expectedValues': <Object?>[],
            },
          ],
          'action': 'finish',
          'targetQuestionId': null,
          'targetSectionId': null,
        },
      ];
      expect(
        HostFormDefinition.fromMap(
          map,
        ).reachableSections({'question_1': 'done'}),
        hasLength(1),
      );
    });
  });

  group('HostFormSummary', () {
    test('derives valid lifecycle actions from server state', () {
      final published = HostFormSummary.fromMap(
        _summaryMap(status: 'published', publishedVersion: 1),
      );
      final draft = HostFormSummary.fromMap(
        _summaryMap(status: 'draft', publishedVersion: 0),
      );

      expect(published.canPause, isTrue);
      expect(published.canResume, isFalse);
      expect(published.canDeleteDraft, isFalse);
      expect(draft.canDeleteDraft, isTrue);
      expect(published.consequences.isExact, isTrue);
      expect(
        published.consequences.enabledAutomationActionKinds,
        contains(HostFormAutomationActionKind.createCrmContact),
      );
    });
  });

  test(
    'HostFormListRequest equality includes filter sets independent of order',
    () {
      const first = HostFormListRequest(
        organizerId: 'org_1',
        statuses: {
          HostFormLifecycleStatus.draft,
          HostFormLifecycleStatus.published,
        },
      );
      const second = HostFormListRequest(
        organizerId: 'org_1',
        statuses: {
          HostFormLifecycleStatus.published,
          HostFormLifecycleStatus.draft,
        },
      );

      expect(first, second);
      expect(first.hashCode, second.hashCode);
    },
  );

  test('form share projections retain canonical and attributed URLs', () {
    final assets = HostFormShareAssets.fromCallableData(const {
      'canonicalUrl': 'https://catchdates.com/f/public_form_1234567890/',
      'embedUrl': 'https://catchdates.com/f/public_form_1234567890/?embed=1',
      'embedSnippet': '<iframe></iframe>',
    });
    final link = HostFormShareLink.fromCallableData(const {
      'linkId': 'formlink_123',
      'label': 'Instagram story',
      'source': 'instagram_story',
      'sourceToken': 'formlink_12345678901234567890',
      'url': 'https://catchdates.com/f/public_form_1234567890/?source=x',
    });

    expect(assets.embedUrl, contains('embed=1'));
    expect(link.source, 'instagram_story');
    expect(link.url, contains('source='));
  });

  test('response pages preserve provenance, pagination, and conversions', () {
    final page = HostFormResponsePage.fromCallableData({
      'organizerId': 'org_1',
      'items': [_responseMap()],
      'nextCursor': 'cursor_2',
    });

    expect(page.nextCursor, 'cursor_2');
    expect(page.items.single.identity.primaryLabel, 'Ada Host');
    expect(
      page.items.single.conversionKinds,
      contains(HostFormConversionKind.crmContact),
    );
    expect(
      page.items.single.identity.origin,
      HostFormDataOrigin.respondentGranted,
    );
  });

  test('response request equality treats filter sets as unordered', () {
    const first = HostFormResponseListRequest(
      organizerId: 'org_1',
      statuses: {
        HostFormResponseStatus.submitted,
        HostFormResponseStatus.withdrawn,
      },
      identityKinds: {
        HostFormResponseIdentityKind.emailVerified,
        HostFormResponseIdentityKind.phoneVerified,
      },
    );
    const second = HostFormResponseListRequest(
      organizerId: 'org_1',
      statuses: {
        HostFormResponseStatus.withdrawn,
        HostFormResponseStatus.submitted,
      },
      identityKinds: {
        HostFormResponseIdentityKind.phoneVerified,
        HostFormResponseIdentityKind.emailVerified,
      },
    );

    expect(first, second);
    expect(first.hashCode, second.hashCode);
  });

  test(
    'answer selections and sort participate in request identity and cursors',
    () {
      const first = HostFormResponseListRequest(
        organizerId: 'org_1',
        formId: 'form_1',
        answerFilters: {
          'city': {'Mumbai', 'Dubai'},
          'intent': {'Friendship'},
        },
        oldestFirst: true,
      );
      const reordered = HostFormResponseListRequest(
        organizerId: 'org_1',
        formId: 'form_1',
        answerFilters: {
          'intent': {'Friendship'},
          'city': {'Dubai', 'Mumbai'},
        },
        oldestFirst: true,
      );
      const different = HostFormResponseListRequest(
        organizerId: 'org_1',
        formId: 'form_1',
        answerFilters: {
          'city': {'Dubai'},
          'intent': {'Friendship'},
        },
        oldestFirst: true,
      );
      expect(first, reordered);
      expect(first.hashCode, reordered.hashCode);
      expect(first, isNot(different));
      final next = first.copyWith(cursor: 'next');
      expect(next.answerFilters, first.answerFilters);
      expect(next.oldestFirst, isTrue);
      expect(next.cursor, 'next');
      final page = HostFormResponsePage.fromCallableData(const {
        'organizerId': 'org_1',
        'items': [],
        'nextCursor': 'scan-next',
        'answerFilterOptions': [
          {
            'questionId': 'city',
            'label': 'Event city',
            'options': [
              {'value': 'Mumbai', 'label': 'Mumbai'},
            ],
          },
        ],
      });
      expect(page.answerFilterOptions.single.options, {'Mumbai': 'Mumbai'});
      expect(page.nextCursor, 'scan-next');
    },
  );

  test('analytics and automation projections parse required state', () {
    final analytics = HostFormAnalytics.fromCallableData(const {
      'formId': 'form_1',
      'versionId': 'version_1',
      'version': 2,
      'opens': 10,
      'starts': 8,
      'submissions': 6,
      'withdrawals': 1,
      'completionRate': 0.75,
      'medianCompletionMillis': 60000,
      'questions': <Object?>[],
      'sources': <Object?>[],
      'privacyThreshold': 5,
    });
    final automations = HostFormAutomationPage.fromCallableData(const {
      'rules': <Object?>[
        {
          'ruleId': 'rule_1',
          'organizerId': 'org_1',
          'formId': 'form_1',
          'name': 'Notify my team',
          'enabled': true,
          'revision': 1,
          'trigger': 'responseSubmitted',
          'condition': null,
          'actions': <Object?>[
            {
              'actionId': 'action_1',
              'kind': 'notifyTeam',
              'tagId': null,
              'eventId': null,
              'webhookUrl': null,
              'webhookSecretConfigured': false,
              'channel': null,
            },
          ],
          'updatedAtMillis': 10,
        },
      ],
      'runs': <Object?>[],
      'nextCursor': null,
    });

    expect(analytics.completionRate, 0.75);
    expect(automations.rules.single.enabled, isTrue);
    expect(
      automations.rules.single.actions.single.kind,
      HostFormAutomationActionKind.notifyTeam,
    );
  });
}

Map<String, Object?> _responseMap() => {
  'responseId': 'response_1',
  'formId': 'form_1',
  'formTitle': 'Community application',
  'versionId': 'version_1',
  'version': 2,
  'status': 'submitted',
  'identityKind': 'emailVerified',
  'identity': {
    'displayName': 'Ada Host',
    'email': 'ada@example.com',
    'phoneE164': null,
    'origin': 'respondentGranted',
  },
  'sourceLinkId': 'source_1',
  'sourceLabel': 'Instagram',
  'submittedAtMillis': 10,
  'withdrawnAtMillis': null,
  'highlights': <Object?>[],
  'conversionKinds': ['crmContact'],
};

Map<String, Object?> _definitionMap() => {
  'schemaVersion': 1,
  'title': 'Community application',
  'description': 'Tell us about yourself.',
  'purpose': 'application',
  'identityPolicy': 'emailOrPhoneVerified',
  'sections': [
    {
      'sectionId': 'section_1',
      'title': 'About you',
      'description': null,
      'pageBreak': false,
      'questions': [
        {
          'questionId': 'question_1',
          'key': 'full_name',
          'label': 'Full name',
          'helpText': null,
          'kind': 'shortText',
          'required': true,
          'options': <Object?>[],
          'canonicalFieldId': 'fullName',
          'privacyClass': 'contact',
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
        },
      ],
    },
  ],
  'logicRules': <Object?>[],
  'appearance': {
    'preset': 'minimal',
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
    'consentCopy': 'I consent.',
    'consentVersion': 'v1',
    'retentionCopy': 'Retained for this form purpose.',
  },
  'completion': {
    'title': 'Thanks',
    'message': 'We will be in touch.',
    'actionKind': 'none',
    'actionLabel': null,
    'actionUrl': null,
  },
  'customFutureField': 'preserved',
};

Map<String, Object?> _sectionMap(
  String sectionId,
  String title,
  String questionId,
) => {
  'sectionId': sectionId,
  'title': title,
  'description': null,
  'pageBreak': true,
  'questions': [
    {
      'questionId': questionId,
      'key': questionId,
      'label': title,
      'helpText': null,
      'kind': 'shortText',
      'required': false,
      'options': <Object?>[],
      'canonicalFieldId': null,
      'privacyClass': 'organizerCustom',
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
    },
  ],
};

Map<String, Object?> _summaryMap({
  required String status,
  required int publishedVersion,
}) => {
  'organizerId': 'org_1',
  'formId': 'form_1',
  'title': 'Community application',
  'description': null,
  'purpose': 'application',
  'status': status,
  'templateId': 'community_application',
  'publicFormId': 'public_1',
  'defaultTargetKind': 'organizer',
  'defaultTargetId': null,
  'activeVersionId': publishedVersion == 0 ? null : 'version_1',
  'draftRevision': 2,
  'publishedVersion': publishedVersion,
  'submittedResponseCount': 0,
  'consequences': {
    'coverage': 'exact',
    'identityPolicy': 'emailVerified',
    'enabledAutomationActionKinds': ['createCrmContact'],
  },
  'updatedAtMillis': 1,
  'publishedAtMillis': publishedVersion == 0 ? null : 1,
  'lastResponseAtMillis': null,
};
