import 'package:catch_dating_app/contexts/forms/data/host_application_repository.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_operations_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_response_review_detail.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:riverpod/misc.dart' show Override;

import '../catalog/screen_capture_catalog.dart';
import 'host_audience_journey_fixture.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  // These use the catalog's overrides, not a second test-only projection. The
  // old catalog joins response_1/version_1 to design-response-1/design-form-version-1.

  // These use the catalog's overrides, not a second test-only projection. The
  // old catalog joins response_1/version_1 to design-response-1/design-form-version-1.
  test(
    'host_application_detail joins the requested native response and application',
    () async {
      final container = _captureContainer('host_application_detail');
      final detail = await container.read(
        hostResponseReviewDetailProvider((
          organizerId: 'org_1',
          responseId: null,
          applicationId: 'design-application-1',
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
