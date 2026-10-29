import 'dart:io';

import 'package:catch_dating_app/contexts/audience/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_saved_audience_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_customer_timeline.dart';
import 'package:catch_dating_app/contexts/forms/data/host_application_repository.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/hosts/presentation/applications/host_applications_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_operations_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_response_review_detail.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:riverpod/misc.dart' show Override;

import '../catalog/screen_capture_catalog.dart';
import '../support/capture_pump.dart';
import 'host_audience_journey_fixture.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  for (final id in [
    'host_person_overview',
    'host_person_details',
    'host_person_notes',
    'host_person_history',
  ]) {
    testWidgets('captures actual Person catalog $id', (tester) async {
      final entry = findScreenCapture(id);
      final artifacts = await captureCatchWidget(
        tester,
        id: entry.id,
        builder: entry.builder,
        drive: entry.drive,
        cleanup: entry.cleanup,
        device: entry.device,
        textScale: entry.textScale,
        disableAnimations: entry.disableAnimations,
        includeOverlays: entry.includeOverlays,
        precache: entry.precache,
        providerOverrides: entry.providerOverrides,
        outputDirectory: Directory(
          'artifacts/ui-captures/audience-person-review',
        ),
      );
      expect(tester.takeException(), isNull);
      expect(artifacts.map((artifact) => artifact.theme.name), [
        'light',
        'dark',
      ]);
      for (final artifact in artifacts) {
        expect(artifact.file.existsSync(), isTrue);
        expect(artifact.file.lengthSync(), greaterThan(0));
      }
    }, variant: TargetPlatformVariant.only(TargetPlatform.iOS));
  }

  // These use the catalog's overrides, not a second test-only projection. The
  // old catalog joins response_1/version_1 to design-response-1/design-form-version-1.
  for (final capture in [
    'host_form_response_application',
    'host_application_detail',
    'host_response_review_submitted',
  ]) {
    test(
      '$capture joins the requested native response and application',
      () async {
        final container = _captureContainer(capture);
        final fromResponse = capture == 'host_form_response_application';
        final detail = await container.read(
          hostResponseReviewDetailProvider((
            organizerId: 'org_1',
            responseId: fromResponse ? 'response_1' : null,
            applicationId: fromResponse ? null : 'design-application-1',
          )).future,
        );
        final response = detail.response!;
        final application = detail.application!;
        expect(application.organizerId, 'org_1');
        expect(application.applicationId, 'design-application-1');
        expect(response.response.responseId, 'response_1');
        expect(application.sourceResponseId, response.response.responseId);
        expect(response.applicationId, application.applicationId);
        expect(application.formId, response.response.formId);
        expect(application.formVersionId, response.response.versionId);
        expect(application.applicantDisplayName, 'Maya Kapoor');
        expect(response.response.identity.displayName, 'Maya Kapoor');
        expect(
          application.answers.map((answer) => answer.questionId),
          response.answers.map((answer) => answer.questionId),
        );
        expect(
          application.answers.map((answer) => answer.questionKey),
          response.answers.map((answer) => answer.key),
        );
        expect(
          application.answers.map((answer) => answer.value.textValue),
          response.answers.map((answer) => answer.answer),
        );
        expect(detail.canReview, isTrue);
        expect(detail.canConvert, isTrue);
      },
    );
  }

  for (final capture in [
    'host_person_overview',
    'host_person_details',
    'host_person_notes',
    'host_person_history',
  ]) {
    test(
      '$capture keeps the requested Person across list and detail',
      () async {
        final container = _captureContainer(capture);
        final organizerId = HostOperationsFixtures.primaryClub.id;
        const contactId = 'capture-customer-ananya';
        final contact = await container.read(
          hostAudienceContactDetailProvider(organizerId, contactId).future,
        );
        final request = HostApplicationListRequest(
          organizerId: organizerId,
          contactId: contactId,
        );
        final page = await container.read(
          hostApplicationsDirectoryControllerProvider(request).future,
        );
        expect(page.applications, hasLength(1));
        final listed = page.applications.single;
        final application = await container.read(
          hostApplicationDetailProvider(
            organizerId,
            listed.applicationId,
          ).future,
        );
        expect(contact.organizerId, organizerId);
        expect(contact.contactId, contactId);
        expect(application.organizerId, contact.organizerId);
        expect(application.contactId, contact.contactId);
        expect(application.applicantDisplayName, contact.displayName);
        expect(application.applicantDisplayName, 'Ananya Rao');
        expect(application.formId, 'capture-form-1');
        expect(application.sourceResponseId, 'capture-response-1');
        expect(listed.formVersionId, application.formVersionId);
        final reviewed = await container.read(
          hostResponseReviewDetailProvider((
            organizerId: organizerId,
            responseId: null,
            applicationId: listed.applicationId,
          )).future,
        );
        expect(
          reviewed.response!.response.responseId,
          application.sourceResponseId,
        );
        expect(reviewed.response!.response.formId, application.formId);
        expect(
          reviewed.response!.response.versionId,
          application.formVersionId,
        );
        expect(reviewed.contactId, contactId);
        final timeline = contact.timeline
            .whereType<HostCustomerFormTimelineEntry>()
            .single;
        expect(timeline.responseId, reviewed.response!.response.responseId);
        expect(timeline.formId, reviewed.response!.response.formId);
        expect(
          timeline.answeredQuestionCount,
          reviewed.response!.answers.length,
        );
      },
    );
  }

  for (final (index, request) in [
    const HostApplicationListRequest(
      organizerId: 'foreign',
      contactId: 'capture-customer-ananya',
    ),
    HostApplicationListRequest(
      organizerId: HostOperationsFixtures.primaryClub.id,
      contactId: 'contact_1',
    ),
    HostApplicationListRequest(
      organizerId: HostOperationsFixtures.primaryClub.id,
    ),
  ].indexed) {
    test('Person capture rejects unrelated request $index', () async {
      final container = _captureContainer('host_person_overview');
      await expectLater(
        container.read(
          hostApplicationsDirectoryControllerProvider(request).future,
        ),
        throwsStateError,
      );
    });
  }

  for (final (capture, revoked) in [
    ('host_response_review_imported', false),
    ('host_response_review_revoked', true),
  ]) {
    test('$capture preserves its non-native or revoked boundary', () async {
      final container = _captureContainer(capture);
      final detail = await container.read(
        hostResponseReviewDetailProvider((
          organizerId: 'org_1',
          responseId: null,
          applicationId: 'design-application-1',
        )).future,
      );
      expect(detail.response, isNull);
      expect(detail.canConvert, isFalse);
      expect(detail.canReview, !revoked);
      if (revoked) {
        expect(detail.application!.answers, isEmpty);
        expect(detail.application!.outreach.phoneE164, isNull);
        expect(detail.application!.outreach.email, isNull);
        expect(detail.application!.outreach.instagramUrl, isNull);
        expect(detail.application!.outreach.linkedinUrl, isNull);
      } else {
        expect(detail.application!.sourceResponseId, isNull);
        expect(detail.application!.answers, isNotEmpty);
      }
    });
  }

  test(
    'imported and revoked projections never request a native response',
    () async {
      for (final revoked in [false, true]) {
        var reads = 0;
        final story = HostAudienceJourneyFixture.maya;
        final container = ProviderContainer(
          overrides: [
            hostApplicationDetailProvider(
              story.organizerId,
              story.applicationId,
            ).overrideWith(
              (_) async =>
                  story.application(imported: !revoked, revoked: revoked),
            ),
            hostFormResponseDetailProvider(
              organizerId: story.organizerId,
              responseId: story.responseId,
            ).overrideWith((_) async {
              reads++;
              throw StateError(
                'Revoked/imported data must not request a response',
              );
            }),
          ],
          retry: (_, _) => null,
        );
        addTearDown(container.dispose);
        await container.read(
          hostResponseReviewDetailProvider((
            organizerId: story.organizerId,
            responseId: null,
            applicationId: story.applicationId,
          )).future,
        );
        expect(reads, 0);
      }
    },
  );

  test(
    'intake and withdrawn catalog cases do not acquire an application',
    () async {
      for (final (capture, status) in [
        ('host_form_response_intake', HostFormResponseStatus.submitted),
        ('host_form_response_withdrawn', HostFormResponseStatus.withdrawn),
      ]) {
        final container = _captureContainer(capture);
        final detail = await container.read(
          hostResponseReviewDetailProvider((
            organizerId: 'org_1',
            responseId: 'response_1',
            applicationId: null,
          )).future,
        );
        expect(detail.application, isNull);
        expect(detail.response!.response.status, status);
        expect(detail.canReview, isFalse);
      }
    },
  );

  test(
    'linked stories expose their own forms without invented filter choices',
    () async {
      for (final (capture, organizerId, formId) in [
        ('host_form_response_application', 'org_1', 'form_1'),
        (
          'host_person_overview',
          HostOperationsFixtures.primaryClub.id,
          'capture-form-1',
        ),
      ]) {
        final container = _captureContainer(capture);
        final options = await container.read(
          hostSavedAudienceFilterOptionsProvider(organizerId).future,
        );
        expect(options.forms.map((form) => form.id), [formId]);
        expect(
          options.events.map((event) => event.id),
          organizerId == 'org_1' ? ['sunday-social'] : isEmpty,
        );
        if (organizerId == 'org_1') {
          expect(options.events.single.title, 'Sunday social');
        }
        expect(
          options.questions,
          isEmpty,
          reason: 'These text answers are detail-only',
        );
      }
      final group = _captureContainer('host_group_overview');
      final options = await group.read(
        hostSavedAudienceFilterOptionsProvider('preview-organizer').future,
      );
      expect(options.questions.single.questionId, 'drink');
      expect(options.questions.single.options.single.value, 'coffee');
    },
  );

  test('response projections are fresh and use the production parser', () {
    final story = HostAudienceJourneyFixture.maya;
    final data = story.responseData();
    final response = data['response']! as Map<String, Object?>;
    response['status'] = 'not-a-response-status';
    expect(
      () => HostFormResponseDetail.fromCallableData(data),
      throwsFormatException,
    );
    expect(story.response().response.status, HostFormResponseStatus.submitted);
    final answers = data['answers']! as List<Object?>;
    (answers.first! as Map<String, Object?>)['questionId'] = 'foreign-question';
    expect(story.response().answers.first.questionId, 'question_1');
    expect(story.application().answers.first.questionId, 'question_1');
  });
}

ProviderContainer _captureContainer(String id) {
  final entry = screenCaptureCatalog.singleWhere((entry) => entry.id == id);
  final container = ProviderContainer(
    overrides: entry.providerOverrides.cast<Override>().toList(),
    retry: (_, _) => null,
  );
  addTearDown(container.dispose);
  return container;
}
