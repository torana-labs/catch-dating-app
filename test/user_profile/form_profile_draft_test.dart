import 'package:catch_dating_app/contexts/profiles/domain/form_profile.dart';
import 'package:catch_dating_app/contexts/profiles/domain/form_profile_draft.dart';
import 'package:flutter_test/flutter_test.dart';

FormProfileReview reviewFixture({
  List<FormProfileField> fields = const [],
  Map<String, Object?>? current,
}) => FormProfileReview(
  responseId: 'response',
  organizerId: 'org',
  cardRevision: 0,
  claimedAt: null,
  formTitle: 'RSVP escape',
  organizerName: 'RSVP',
  profileRevision: 4,
  intakeRevision: 2,
  termsVersion: 'form-profile-claim-v1',
  fields: fields,
  selectedCardQuestionIds: const [],
  currentProfile: current,
  currentLinkedinUrl: null,
);

void main() {
  test('photo selection sends a reviewed source pointer, never a raw URL', () {
    final field = FormProfileField(
      questionId: 'photo',
      destination: FormProfileDestination.catchProfile,
      canonicalFieldId: 'profilePhoto',
      label: 'Your photo',
      kind: 'file',
      value: const ['asset'],
    );
    final draft = FormProfileDraft(reviewFixture(fields: [field]));
    draft.select(field, true);
    expect(draft.request('request-0000000003').selectedQuestionIds, ['photo']);
    expect(draft.profile.containsKey('profilePhotos'), false);
    draft.select(field, false);
    expect(draft.selected, isEmpty);
  });
  test(
    'fractional heights are not silently changed into a different answer',
    () {
      expect(FormProfileDraft.normalizeValue('height', 170.8, {}), isNull);
      expect(
        FormProfileDraft.normalizeValue('height', double.infinity, {}),
        isNull,
      );
      expect(FormProfileDraft.normalizeValue('height', 170.0, {}), 170);
    },
  );

  test(
    'custom labels never become core bindings and cards contain selected pointers only',
    () {
      final card = FormProfileField(
        questionId: 'first-name',
        destination: FormProfileDestination.organizerCard,
        canonicalFieldId: null,
        label: 'First name',
        kind: 'shortText',
        value: 'Sara',
      );
      final draft = FormProfileDraft(reviewFixture(fields: [card]));
      expect(card.definition, isNull);
      expect(draft.selected, isEmpty);
      draft.select(card, true);
      final request = draft.request('request-0000000001');
      expect(request.profile, isEmpty);
      expect(request.selectedQuestionIds, ['first-name']);
      expect(request.toJson().toString(), isNot(contains('Sara')));
    },
  );
  test(
    'selecting and deselecting source values preserves unrelated existing preferences',
    () {
      final field = FormProfileField(
        questionId: 'job',
        destination: FormProfileDestination.catchProfile,
        canonicalFieldId: 'occupation',
        label: 'Occupation',
        kind: 'shortText',
        value: 'Founder',
      );
      final draft = FormProfileDraft(
        reviewFixture(
          fields: [field],
          current: {
            'occupation': 'Engineer',
            'interestedInGenders': ['woman'],
            'displayName': 'My name',
          },
        ),
      );
      expect(draft.profile['occupation'], 'Engineer');
      draft.select(field, true);
      expect(draft.profile['occupation'], 'Founder');
      draft.confirmed = true;
      draft.select(field, false);
      expect(draft.profile['occupation'], 'Engineer');
      expect(draft.profile['interestedInGenders'], ['woman']);
      expect(draft.confirmed, false);
      expect(draft.request('request-0000000002').expectedProfileRevision, 4);
    },
  );
  test('only explicit catalog destinations allow profile writes', () {
    for (final canonical in ['phoneNumber', 'profilePhoto', 'age', 'unknown']) {
      final field = FormProfileField(
        questionId: canonical,
        destination: FormProfileDestination.catchProfile,
        canonicalFieldId: canonical,
        label: 'Source',
        kind: 'shortText',
        value: 'untrusted',
      );
      final draft = FormProfileDraft(reviewFixture(fields: [field]));
      draft.select(field, true);
      expect(draft.selected, isEmpty);
      expect(draft.profile, isEmpty);
    }
  });
  test(
    'choices accept canonical values or exact labels, but do not invent mappings',
    () {
      expect(FormProfileDraft.normalizeValue('gender', 'Woman', {}), 'woman');
      expect(
        FormProfileDraft.normalizeValue('gender', 'female-vendor-code', {}),
        isNull,
      );
      expect(
        FormProfileDraft.normalizeValue('education', 'college', {
          'college': "Bachelor's",
        }),
        'bachelors',
      );
      expect(
        FormProfileDraft.normalizeValue('languages', ['Hindi', 'English'], {}),
        ['hindi', 'english'],
      );
      expect(
        FormProfileDraft.normalizeValue('languages', ['Hindi', 'unknown'], {}),
        isNull,
      );
      expect(
        FormProfileDraft.normalizeValue('city', 'Indore', {}),
        'in-mp-indore',
      );
    },
  );
}
