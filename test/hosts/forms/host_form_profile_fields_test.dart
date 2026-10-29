import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_question.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  HostFormQuestion nameQuestion() => HostFormQuestion.create(
    questionId: 'name',
    kind: HostFormQuestionKind.shortText,
  ).copyWith(canonicalFieldId: 'givenName', label: 'First name');

  test('legacy labels and CRM mappings never implicitly prepare a profile', () {
    final question = nameQuestion();
    expect(question.answerDestination, HostFormAnswerDestination.organizerOnly);
    expect(question.toJson().containsKey('answerDestination'), isFalse);
    final renamed = question.copyWith(
      label: 'Catch first name',
      required: true,
    );
    expect(renamed.answerDestination, HostFormAnswerDestination.organizerOnly);
    expect(renamed.required, isTrue);
    expect(renamed.copyWith(required: false).required, isFalse);
  });

  test(
    'explicit destination round-trips and clearing its mapping narrows use',
    () {
      final profile = nameQuestion().copyWith(
        answerDestination: HostFormAnswerDestination.catchProfile,
      );
      final restored = HostFormQuestion.fromMap(profile.toJson());
      expect(
        restored.answerDestination,
        HostFormAnswerDestination.catchProfile,
      );
      expect(
        restored.copyWith(clearCanonicalField: true).answerDestination,
        HostFormAnswerDestination.organizerOnly,
      );
      expect(
        restored.copyWith(kind: HostFormQuestionKind.boolean).answerDestination,
        HostFormAnswerDestination.organizerOnly,
      );
      expect(profile.canonicalFieldId, 'givenName');
    },
  );

  test(
    'custom answers can prepare organizer cards without core-field mapping',
    () {
      final question =
          HostFormQuestion.create(
            questionId: 'drink',
            kind: HostFormQuestionKind.shortText,
          ).copyWith(
            label: 'Favourite cocktail',
            answerDestination: HostFormAnswerDestination.organizerCard,
          );
      expect(question.canonicalFieldId, isNull);
      expect(
        question.answerDestination,
        HostFormAnswerDestination.organizerCard,
      );
      expect(
        question.availableAnswerDestinations,
        isNot(contains(HostFormAnswerDestination.catchProfile)),
      );
      expect(
        question
            .copyWith(kind: HostFormQuestionKind.signature)
            .answerDestination,
        HostFormAnswerDestination.organizerOnly,
      );
    },
  );

  test(
    'derived age, signatures and unmapped fields cannot become core fields',
    () {
      final fields = [
        HostFormQuestion.create(
          questionId: 'age',
          kind: HostFormQuestionKind.number,
        ).copyWith(canonicalFieldId: 'age'),
        HostFormQuestion.create(
          questionId: 'signature',
          kind: HostFormQuestionKind.signature,
        ),
        HostFormQuestion.create(
          questionId: 'custom',
          kind: HostFormQuestionKind.shortText,
        ),
      ];
      for (final question in fields) {
        expect(question.canPrepareCatchProfile, isFalse);
        expect(
          () => question.copyWith(
            answerDestination: HostFormAnswerDestination.catchProfile,
          ),
          throwsArgumentError,
        );
      }
    },
  );

  test(
    'profile photos start with one protected image instead of arbitrary files',
    () {
      final question =
          HostFormQuestion.create(
            questionId: 'photo',
            kind: HostFormQuestionKind.file,
          ).copyWith(
            canonicalFieldId: 'profilePhoto',
            answerDestination: HostFormAnswerDestination.catchProfile,
          );
      expect(question.validation.maxFileCount, 1);
      expect(question.validation.maxFileSizeBytes, 10 * 1024 * 1024);
      expect(question.validation.allowedMimeTypes, [
        'image/jpeg',
        'image/png',
        'image/webp',
      ]);
      expect(
        HostFormQuestion.fromMap(question.toJson()).answerDestination,
        HostFormAnswerDestination.catchProfile,
      );
    },
  );
}
