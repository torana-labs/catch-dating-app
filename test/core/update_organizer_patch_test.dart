// Schema-conformance tests for the generated [UpdateOrganizerPatch].
// Catches drift against the canonical
// `contracts/callables/update_organizer_payload.schema.json`.
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_host_defaults.dart';
import 'package:catch_dating_app/contexts/organizers/domain/update_organizer_patch.dart';
import 'package:catch_dating_app/platform/media/uploaded_photo.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/schema_contracts.g.dart'
    as schema_contracts;
import 'package:flutter_test/flutter_test.dart';
import 'package:json_schema/json_schema.dart';

void main() {
  group('UpdateOrganizerPatch schema parity', () {
    test('every patch named parameter maps to a schema field key', () {
      final allSet = UpdateOrganizerPatch(
        name: 'X',
        description: 'X',
        organizerType: OrganizerType.community,
        location: 'x',
        area: 'X',
        hostName: 'X',
        hostAvatarUrl: 'https://example.test/avatar.png',
        imageUrl: 'https://example.test/cover.png',
        profileImageUrl: 'https://example.test/profile.png',
        clubPhotos: [_uploadedPhoto(id: 'club-photo-1')],
        logoPhoto: _uploadedPhoto(id: 'club-logo-1'),
        tags: const ['social'],
        instagramHandle: 'x',
        phoneNumber: '+10000000000',
        email: 'x@example.test',
        hostDefaults: const OrganizerHostDefaults(),
        publicListingEnabled: true,
      );

      final schema = schema_contracts
          .schemaContractsByName['UpdateOrganizerCallablePayload']!;
      final fieldsSchema =
          (schema['properties'] as Map<String, Object?>)['fields']
              as Map<String, Object?>;
      final schemaFields = (fieldsSchema['properties'] as Map<String, Object?>)
          .keys
          .toSet();
      final patchKeys = allSet.keys.toSet();

      final missingFromPatch = schemaFields.difference(patchKeys);
      final extraInPatch = patchKeys.difference(schemaFields);
      expect(missingFromPatch, isEmpty);
      expect(extraInPatch, isEmpty);
    });

    test('omits parameters that were not passed', () {
      final patch = UpdateOrganizerPatch(name: 'New Name');
      expect(patch.toFieldsJson(), {'name': 'New Name'});
    });

    test('serializes organizer type by its canonical contract name', () {
      final patch = UpdateOrganizerPatch(
        organizerType: OrganizerType.eventProducer,
      );
      expect(patch.toFieldsJson(), {'organizerType': 'eventProducer'});
    });

    test('nullable fields can be explicitly cleared via null', () {
      final patch = UpdateOrganizerPatch(
        location: null,
        instagramHandle: null,
        phoneNumber: null,
        email: null,
      );
      expect(patch.toFieldsJson(), {
        'location': null,
        'instagramHandle': null,
        'phoneNumber': null,
        'email': null,
      });
    });

    test('typed host defaults serialize to schema-valid JSON', () {
      final patch = UpdateOrganizerPatch(
        hostDefaults: const OrganizerHostDefaults(),
      );
      final schema = JsonSchema.create(
        schema_contracts
            .schemaContractsByName['UpdateOrganizerCallablePayload']!,
      );
      expect(
        schema.validate(patch.toCallableJson(clubId: 'club-1')).isValid,
        isTrue,
      );
    });

    test('raw() escape hatch produces a schema-valid patch', () {
      final patch = UpdateOrganizerPatch.raw({'name': 'New Name'});
      final schema = JsonSchema.create(
        schema_contracts
            .schemaContractsByName['UpdateOrganizerCallablePayload']!,
      );
      expect(
        schema.validate(patch.toCallableJson(clubId: 'club-1')).isValid,
        isTrue,
      );
    });
  });
}

UploadedPhoto _uploadedPhoto({required String id}) => UploadedPhoto(
  id: id,
  url: 'https://example.test/$id.jpg',
  storagePath: 'clubs/club-1/photos/$id.jpg',
  position: 0,
  createdAt: DateTime.fromMillisecondsSinceEpoch(1000, isUtc: true),
  updatedAt: DateTime.fromMillisecondsSinceEpoch(1000, isUtc: true),
);
