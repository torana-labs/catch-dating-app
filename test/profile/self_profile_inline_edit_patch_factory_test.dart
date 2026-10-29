import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/user_profile/presentation/self_profile_inline_edit_patch_factory.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart';

void main() {
  const factory = SelfProfileInlineEditPatchFactory();

  test('optional profile text patches carry an explicit null clear', () {
    expect(factory.instagramHandle(null).toFieldsJson(), {
      'instagramHandle': null,
    });
    expect(factory.occupation(null).toFieldsJson(), {'occupation': null});
    expect(factory.company(null).toFieldsJson(), {'company': null});
    expect(factory.email('').toFieldsJson(), {'email': ''});
  });

  test('SelfProfileInlineEditPatchFactory maps direct identity fields', () {
    expect(factory.displayName('S.').toFieldsJson(), {'displayName': 'S.'});
    expect(factory.email('suvrat@example.com').toFieldsJson(), {
      'email': 'suvrat@example.com',
    });
    expect(factory.instagramHandle(null).toFieldsJson(), {
      'instagramHandle': null,
    });
  });

  test('SelfProfileInlineEditPatchFactory maps enum and list fields', () {
    expect(factory.education(EducationLevel.masters).toFieldsJson(), {
      'education': 'masters',
    });
    expect(
      factory.languages(const [
        Language.english,
        Language.hindi,
      ]).toFieldsJson(),
      {
        'languages': ['english', 'hindi'],
      },
    );
  });

  test('SelfProfileInlineEditPatchFactory maps running preference patches', () {
    final user = buildUser(name: 'Suvrat Garg');

    final paceFields = factory.paceRange(user, 270, 540).toFieldsJson();
    final distanceFields = factory.preferredDistances(user, const [
      PreferredDistance.tenK,
    ]).toFieldsJson();

    expect(
      paceFields['activityPreferences'],
      containsPair('running', containsPair('paceMinSecsPerKm', 270)),
    );
    expect(
      paceFields['activityPreferences'],
      containsPair('running', containsPair('paceMaxSecsPerKm', 540)),
    );
    expect(
      distanceFields['activityPreferences'],
      containsPair('running', containsPair('preferredDistances', ['tenK'])),
    );
  });
}
