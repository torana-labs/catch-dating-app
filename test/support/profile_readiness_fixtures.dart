import 'package:catch_dating_app/contexts/profiles/domain/profile_photo_policy.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_prompts.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';

import '../events/events_test_helpers.dart' as event_helpers;

UserProfile buildSocialReadyUser({
  String uid = 'runner-1',
  String name = 'Runner',
  String? firstName,
  String? lastName,
  String displayName = '',
  String email = 'runner@example.com',
  String bio = 'Here for the event.',
  List<ProfilePromptAnswer>? profilePrompts,
  Gender gender = Gender.man,
  List<Gender> interestedInGenders = const [Gender.woman],
  DateTime? dateOfBirth,
  String phoneNumber = '+910000000000',
  List<String>? photoUrls,
  int runPreferencesVersion = currentRunPreferencesVersion,
}) {
  return event_helpers.buildUser(
    uid: uid,
    name: name,
    firstName: firstName,
    lastName: lastName,
    displayName: displayName,
    email: email,
    bio: bio,
    profilePrompts: profilePrompts ?? requiredProfilePromptAnswers(),
    gender: gender,
    interestedInGenders: interestedInGenders,
    dateOfBirth: dateOfBirth,
    phoneNumber: phoneNumber,
    photoUrls: photoUrls ?? profilePhotoUrls(uid),
    runPreferencesVersion: runPreferencesVersion,
  );
}

UserProfile buildBookingReadyIncompleteUser({
  String uid = 'runner-1',
  String name = 'Runner',
  String? firstName,
  String? lastName,
  String displayName = '',
  String email = 'runner@example.com',
  String bio = 'Here for the event.',
  Gender gender = Gender.man,
  List<Gender> interestedInGenders = const [Gender.woman],
  DateTime? dateOfBirth,
  String phoneNumber = '+910000000000',
}) {
  return buildSocialReadyUser(
    uid: uid,
    name: name,
    firstName: firstName,
    lastName: lastName,
    displayName: displayName,
    email: email,
    bio: bio,
    gender: gender,
    interestedInGenders: interestedInGenders,
    dateOfBirth: dateOfBirth,
    phoneNumber: phoneNumber,
  ).copyWith(profileComplete: false, profilePhotos: const []);
}

List<ProfilePromptAnswer> requiredProfilePromptAnswers() {
  return [
    for (final promptId in defaultProfilePromptIds)
      profilePromptAnswerFor(
        definition: profilePromptDefinition(promptId),
        answer: 'Integration answer for $promptId.',
      ),
  ];
}

List<String> profilePhotoUrls(String uid) {
  return [
    for (var index = 0; index < minimumProfilePhotoCount; index += 1)
      'https://example.test/profiles/$uid/$index.jpg',
  ];
}
