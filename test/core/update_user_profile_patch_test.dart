// Schema-conformance tests for the generated [UpdateUserProfilePatch].
// Catches generator drift against
// `contracts/patches/update_user_profile.schema.json`.
import 'package:catch_dating_app/contexts/profiles/domain/profile_photo.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/kernel/brand.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/callable_request_dtos.g.dart'
    show UpdateUserProfilePatch;
import 'package:catch_dating_app/platform/schema_contracts/generated/schema_contracts.g.dart'
    as schema_contracts;
import 'package:flutter_test/flutter_test.dart';
import 'package:json_schema/json_schema.dart';

void main() {
  group('UpdateUserProfilePatch schema parity', () {
    test('every patch named parameter maps to a schema field key', () {
      // Construct a patch that sets every typed setter at once, then assert
      // the resulting keys are exactly the schema's fields.properties keys.
      // This guarantees the typed constructor cannot have a key the schema
      // doesn't accept, and the schema cannot have a key the patch doesn't
      // expose.
      final allSet = UpdateUserProfilePatch(
        name: 'X',
        displayName: 'X',
        email: 'x@example.test',
        instagramHandle: 'x',
        profilePrompts: const [],
        dateOfBirth: DateTime.utc(1990),
        gender: Gender.other,
        profileComplete: true,
        profilePhotos: const [],
        city: 'x',
        latitude: 0,
        longitude: 0,
        interestedInGenders: const [Gender.other],
        minAgePreference: 18,
        maxAgePreference: 99,
        height: 170,
        occupation: 'x',
        company: 'x',
        education: EducationLevel.other,
        religion: Religion.other,
        languages: const [Language.other],
        relationshipGoal: RelationshipGoal.unsure,
        drinking: DrinkingHabit.never,
        smoking: SmokingHabit.never,
        workout: WorkoutFrequency.sometimes,
        diet: DietaryPreference.other,
        children: ChildrenStatus.dontHave,
        activityPreferences: const ActivityPreferences(
          running: RunningPreferences(
            preferredDistances: [PreferredDistance.fiveK],
            runningReasons: [RunReason.fitness],
            preferredRunTimes: [PreferredRunTime.morning],
            version: 1,
          ),
        ),
        prefsNewCatches: true,
        prefsMessages: true,
        prefsEventReminders: true,
        prefsRunStatusUpdates: true,
        prefsOrganizerUpdates: true,
        prefsWeeklyDigest: true,
        prefsShowOnMap: true,
        prefsShowInCrossPaths: true,
        prefsCrossPathsInvitations: true,
      );

      final schema = schema_contracts
          .schemaContractsByName['UpdateUserProfileCallablePayload']!;
      final fieldsSchema =
          (schema['properties'] as Map<String, Object?>)['fields']
              as Map<String, Object?>;
      final schemaFields = (fieldsSchema['properties'] as Map<String, Object?>)
          .keys
          .toSet();
      final patchKeys = allSet.keys.toSet();

      final missingFromPatch = schemaFields.difference(patchKeys);
      final extraInPatch = patchKeys.difference(schemaFields);
      expect(
        missingFromPatch,
        isEmpty,
        reason:
            'Schema declares fields that UpdateUserProfilePatch does not expose: '
            '$missingFromPatch. Add named parameters to keep them reachable.',
      );
      expect(
        extraInPatch,
        isEmpty,
        reason:
            'UpdateUserProfilePatch sets keys not declared by the schema: '
            '$extraInPatch. Either remove them or update the schema.',
      );
    });

    test('toFieldsJson omits parameters that were not passed', () {
      final patch = UpdateUserProfilePatch(profileComplete: true);
      expect(patch.toFieldsJson(), {'profileComplete': true});
    });

    test('DateTime fields serialize as integer milliseconds', () {
      final dob = DateTime.utc(1994, 5, 20);
      final patch = UpdateUserProfilePatch(dateOfBirth: dob);
      final encoded = patch.toFieldsJson();
      expect(encoded['dateOfBirth'], dob.millisecondsSinceEpoch);
      expect(encoded['dateOfBirth'], isA<int>());
    });

    test('Enum fields serialize as enum names', () {
      final patch = UpdateUserProfilePatch(
        gender: Gender.nonBinary,
        relationshipGoal: RelationshipGoal.marriage,
      );
      final encoded = patch.toFieldsJson();
      expect(encoded['gender'], 'nonBinary');
      expect(encoded['relationshipGoal'], 'marriage');
    });

    test('Lists of enum values serialize as lists of enum names', () {
      final patch = UpdateUserProfilePatch(
        interestedInGenders: const [Gender.man, Gender.woman],
        activityPreferences: const ActivityPreferences(
          running: RunningPreferences(
            preferredDistances: [
              PreferredDistance.fiveK,
              PreferredDistance.tenK,
            ],
          ),
        ),
      );
      final encoded = patch.toFieldsJson();
      expect(encoded['interestedInGenders'], ['man', 'woman']);
      expect(
        (encoded['activityPreferences'] as Map)['running'],
        containsPair('preferredDistances', ['fiveK', 'tenK']),
      );
    });

    test('typed embedded objects serialize to callable-safe JSON', () {
      final createdAt = DateTime.utc(2026, 1, 1, 8);
      final updatedAt = DateTime.utc(2026, 1, 2, 8);
      final patch = UpdateUserProfilePatch(
        profilePhotos: [
          ProfilePhoto(
            id: 'photo-1',
            url: '${Brand.webOrigin}/photo.jpg',
            thumbnailUrl: '${Brand.webOrigin}/photo-thumb.jpg',
            storagePath: 'users/runner-1/photos/photo.jpg',
            thumbnailStoragePath: 'users/runner-1/photoThumbnails/photo.jpg',
            position: 0,
            createdAt: createdAt,
            updatedAt: updatedAt,
          ),
        ],
      );

      final photos = patch.toFieldsJson()['profilePhotos'] as List<Object?>;
      final photoJson = Map<String, Object?>.from(photos.single! as Map);
      expect(photoJson['createdAt'], createdAt.millisecondsSinceEpoch);
      expect(photoJson['updatedAt'], updatedAt.millisecondsSinceEpoch);

      final schema = JsonSchema.create(
        schema_contracts
            .schemaContractsByName['UpdateUserProfileCallablePayload']!,
      );
      expect(schema.validate({'fields': patch.toFieldsJson()}).isValid, isTrue);
    });

    test('Nullable fields can be explicitly cleared via null', () {
      // Nullable fields use the sentinel pattern: not passing = omit, passing
      // null = explicitly clear.
      final cleared = UpdateUserProfilePatch(
        city: null,
        occupation: null,
        height: null,
        education: null,
        relationshipGoal: null,
      );
      expect(cleared.toFieldsJson(), {
        'city': null,
        'occupation': null,
        'height': null,
        'education': null,
        'relationshipGoal': null,
      });

      final omitted = UpdateUserProfilePatch();
      expect(omitted.toFieldsJson(), isEmpty);
    });

    test('raw() escape hatch produces a schema-valid patch', () {
      final patch = UpdateUserProfilePatch.raw({
        'prefsShowOnMap': false,
        'height': 175,
      });
      final schema = JsonSchema.create(
        schema_contracts
            .schemaContractsByName['UpdateUserProfileCallablePayload']!,
      );
      expect(schema.validate(patch.toCallableJson()).isValid, isTrue);
    });
  });
}
