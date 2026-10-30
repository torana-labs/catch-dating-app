// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

class SchemaProfilePromptDefinition {
  const SchemaProfilePromptDefinition({
    required this.id,
    required this.title,
    required this.placeholder,
  });

  final String id;
  final String title;
  final String placeholder;
}

class SchemaPhotoPromptDefinition {
  const SchemaPhotoPromptDefinition({
    required this.id,
    required this.title,
    required this.placeholder,
  });

  final String id;
  final String title;
  final String placeholder;
}

class SchemaPersonFieldDefinition {
  const SchemaPersonFieldDefinition({
    required this.id,
    required this.aliases,
    required this.questionKind,
    required this.transform,
    required this.privacyClass,
    required this.prefillPolicy,
    required this.hostPresentation,
    required this.authority,
    required this.privateProfilePath,
    required this.derivedFrom,
    required this.publicProfileProjection,
    required this.publicProfilePath,
  });

  final String id;
  final List<String> aliases;
  final String questionKind;
  final String transform;
  final String privacyClass;
  final String prefillPolicy;
  final String hostPresentation;
  final String authority;
  final String? privateProfilePath;
  final String? derivedFrom;
  final String publicProfileProjection;
  final String? publicProfilePath;
}

const schemaPersonFieldOrganizerAccessPolicy = 'submittedQuestionGrantOnly';
const schemaPersonFieldPublicProfileMetadataPolicy = 'structuralMappingOnlyNotAuthorization';
const schemaPersonFieldTabularChoiceImportPolicy = 'preserveAsTextUntilOptionsMapped';

const schemaProfilePromptPerfectEventId = 'perfectRun';
const schemaMaxProfilePromptAnswers = 3;
const schemaMaxPhotoPromptCaptions = 6;
const schemaMinimumProfilePhotos = 2;
const schemaMaximumProfilePhotos = 6;
const schemaProfilePhotoAspectRatioWidth =
    3;
const schemaProfilePhotoAspectRatioHeight =
    4;
const schemaProfilePhotoThumbnailSize = 160;
const schemaProfilePhotoMaxUploadBytes = 8388608;
const schemaMaximumProfilePromptAnswerLength =
    300;
const schemaMaximumPhotoPromptCaptionLength = 140;
const schemaMinimumProfileAge = 18;
const schemaMaximumPreferredMatchAge = 99;
const schemaMinimumHeightCm = 120;
const schemaMaximumHeightCm = 220;
const schemaProfileDecisionLogicalName =
    'profileDecision';
const schemaProfileDecisionPathTemplate =
    'profileDecisions/{userId}/outgoing/{targetId}';
const schemaProfileDecisionCollectionPath =
    'profileDecisions';
const schemaProfileDecisionOutgoingSubcollectionPath =
    'outgoing';
const schemaProfileDecisionFuturePathTemplate =
    'profileDecisions/{userId}/outgoing/{targetId}';
const schemaProfileDecisionFutureCollectionPath =
    'profileDecisions';
const schemaProfileDecisionFutureOutgoingSubcollectionPath =
    'outgoing';

const schemaDefaultProfilePromptIds = <String>[
  'perfectRun',
  'afterEvent',
  'greenFlag',
];

const schemaProfilePromptCatalog = <SchemaProfilePromptDefinition>[
  SchemaProfilePromptDefinition(id: 'perfectRun', title: 'A perfect event with me looks like...', placeholder: 'Tell people what kind of event feels like you.',),
  SchemaProfilePromptDefinition(id: 'afterEvent', title: 'After an event, you can usually find me...', placeholder: 'Coffee, dosa, stretching, playlists...',),
  SchemaProfilePromptDefinition(id: 'greenFlag', title: 'My green flag is...', placeholder: 'Share something specific and easy to respond to.',),
  SchemaProfilePromptDefinition(id: 'getAlongIf', title: 'We\'ll get along if...', placeholder: 'Name the energy, habits, or humor you like.',),
  SchemaProfilePromptDefinition(id: 'favoriteRoute', title: 'My favorite running route has...', placeholder: 'Shade, chaos, hills, street food, sunrise...',),
];

const schemaPhotoPromptCatalog = <SchemaPhotoPromptDefinition>[
  SchemaPhotoPromptDefinition(id: 'proofIRun', title: 'Proof I actually run', placeholder: 'Choose this when the photo is the proof.',),
  SchemaPhotoPromptDefinition(id: 'finishLine', title: 'After the finish line', placeholder: 'What was happening in this moment?',),
  SchemaPhotoPromptDefinition(id: 'notRunning', title: 'When I\'m not running', placeholder: 'Show another side of your life.',),
  SchemaPhotoPromptDefinition(id: 'favoritePeople', title: 'My favorite people know me as', placeholder: 'A small detail friends would recognize.',),
  SchemaPhotoPromptDefinition(id: 'weekendEnergy', title: 'Weekend energy', placeholder: 'What does this photo say about your weekends?',),
  SchemaPhotoPromptDefinition(id: 'captionThis', title: 'First thought?', placeholder: 'Give people an easy opening line.',),
];

const schemaPersonFieldCatalog = <SchemaPersonFieldDefinition>[
  SchemaPersonFieldDefinition(id: 'givenName', aliases: <String>['firstname', 'givenname'], questionKind: 'shortText', transform: 'trim', privacyClass: 'contact', prefillPolicy: 'participantReviewRequired', hostPresentation: 'sortable', authority: 'privateProfile', privateProfilePath: 'firstName', derivedFrom: null, publicProfileProjection: 'never', publicProfilePath: null,),
  SchemaPersonFieldDefinition(id: 'familyName', aliases: <String>['familyname', 'lastname', 'surname'], questionKind: 'shortText', transform: 'trim', privacyClass: 'contact', prefillPolicy: 'participantReviewRequired', hostPresentation: 'sortable', authority: 'privateProfile', privateProfilePath: 'lastName', derivedFrom: null, publicProfileProjection: 'never', publicProfilePath: null,),
  SchemaPersonFieldDefinition(id: 'displayName', aliases: <String>['displayname', 'name', 'fullname', 'yourname', 'yourfullname'], questionKind: 'shortText', transform: 'trim', privacyClass: 'contact', prefillPolicy: 'participantReviewRequired', hostPresentation: 'sortable', authority: 'privateProfile', privateProfilePath: 'displayName', derivedFrom: null, publicProfileProjection: 'direct', publicProfilePath: 'name',),
  SchemaPersonFieldDefinition(id: 'dateOfBirth', aliases: <String>['dob', 'dateofbirth', 'birthdate'], questionKind: 'date', transform: 'isoDate', privacyClass: 'sensitive', prefillPolicy: 'participantReviewRequired', hostPresentation: 'sortable', authority: 'privateProfile', privateProfilePath: 'dateOfBirth', derivedFrom: null, publicProfileProjection: 'derived', publicProfilePath: 'age',),
  SchemaPersonFieldDefinition(id: 'age', aliases: <String>['age'], questionKind: 'number', transform: 'number', privacyClass: 'sensitive', prefillPolicy: 'participantReviewRequired', hostPresentation: 'sortable', authority: 'derived', privateProfilePath: null, derivedFrom: 'dateOfBirth', publicProfileProjection: 'derived', publicProfilePath: 'age',),
  SchemaPersonFieldDefinition(id: 'gender', aliases: <String>['gender'], questionKind: 'singleChoice', transform: 'trim', privacyClass: 'sensitive', prefillPolicy: 'participantReviewRequired', hostPresentation: 'filterable', authority: 'privateProfile', privateProfilePath: 'gender', derivedFrom: null, publicProfileProjection: 'direct', publicProfilePath: 'gender',),
  SchemaPersonFieldDefinition(id: 'phoneNumber', aliases: <String>['phone', 'phonenumber', 'mobile', 'mobilenumber', 'whatsapp', 'whatsappnumber'], questionKind: 'phone', transform: 'e164', privacyClass: 'contact', prefillPolicy: 'participantReviewRequired', hostPresentation: 'detailOnly', authority: 'firebaseAuth', privateProfilePath: 'phoneNumber', derivedFrom: null, publicProfileProjection: 'never', publicProfilePath: null,),
  SchemaPersonFieldDefinition(id: 'email', aliases: <String>['email', 'emailaddress'], questionKind: 'email', transform: 'trim', privacyClass: 'contact', prefillPolicy: 'participantReviewRequired', hostPresentation: 'detailOnly', authority: 'privateProfile', privateProfilePath: 'email', derivedFrom: null, publicProfileProjection: 'never', publicProfilePath: null,),
  SchemaPersonFieldDefinition(id: 'instagramHandle', aliases: <String>['instagram', 'instagramhandle', 'instagramprofile'], questionKind: 'shortText', transform: 'trim', privacyClass: 'profile', prefillPolicy: 'participantReviewRequired', hostPresentation: 'detailOnly', authority: 'privateProfile', privateProfilePath: 'instagramHandle', derivedFrom: null, publicProfileProjection: 'never', publicProfilePath: null,),
  SchemaPersonFieldDefinition(id: 'linkedinUrl', aliases: <String>['linkedin', 'linkedinurl', 'linkedinprofile'], questionKind: 'url', transform: 'assetUrl', privacyClass: 'profile', prefillPolicy: 'participantReviewRequired', hostPresentation: 'detailOnly', authority: 'intakeProfile', privateProfilePath: null, derivedFrom: null, publicProfileProjection: 'never', publicProfilePath: null,),
  SchemaPersonFieldDefinition(id: 'profilePhoto', aliases: <String>['photo', 'profilephoto', 'uploadaphoto'], questionKind: 'file', transform: 'assetUrl', privacyClass: 'profile', prefillPolicy: 'participantReviewRequired', hostPresentation: 'detailOnly', authority: 'privateProfile', privateProfilePath: 'profilePhotos', derivedFrom: null, publicProfileProjection: 'direct', publicProfilePath: 'profilePhotos',),
  SchemaPersonFieldDefinition(id: 'city', aliases: <String>['city', 'location'], questionKind: 'shortText', transform: 'trim', privacyClass: 'profile', prefillPolicy: 'participantReviewRequired', hostPresentation: 'filterable', authority: 'privateProfile', privateProfilePath: 'city', derivedFrom: null, publicProfileProjection: 'direct', publicProfilePath: 'city',),
  SchemaPersonFieldDefinition(id: 'heightCm', aliases: <String>['height', 'heightcm'], questionKind: 'number', transform: 'number', privacyClass: 'profile', prefillPolicy: 'participantReviewRequired', hostPresentation: 'sortable', authority: 'privateProfile', privateProfilePath: 'height', derivedFrom: null, publicProfileProjection: 'direct', publicProfilePath: 'height',),
  SchemaPersonFieldDefinition(id: 'occupation', aliases: <String>['occupation', 'job', 'profession'], questionKind: 'shortText', transform: 'trim', privacyClass: 'profile', prefillPolicy: 'participantReviewRequired', hostPresentation: 'filterable', authority: 'privateProfile', privateProfilePath: 'occupation', derivedFrom: null, publicProfileProjection: 'direct', publicProfilePath: 'occupation',),
  SchemaPersonFieldDefinition(id: 'company', aliases: <String>['company', 'workplace', 'employer'], questionKind: 'shortText', transform: 'trim', privacyClass: 'profile', prefillPolicy: 'participantReviewRequired', hostPresentation: 'filterable', authority: 'privateProfile', privateProfilePath: 'company', derivedFrom: null, publicProfileProjection: 'direct', publicProfilePath: 'company',),
  SchemaPersonFieldDefinition(id: 'education', aliases: <String>['education', 'educationlevel'], questionKind: 'singleChoice', transform: 'trim', privacyClass: 'profile', prefillPolicy: 'participantReviewRequired', hostPresentation: 'filterable', authority: 'privateProfile', privateProfilePath: 'education', derivedFrom: null, publicProfileProjection: 'direct', publicProfilePath: 'education',),
  SchemaPersonFieldDefinition(id: 'languages', aliases: <String>['language', 'languages', 'languagesspoken'], questionKind: 'multiChoice', transform: 'splitOptions', privacyClass: 'profile', prefillPolicy: 'participantReviewRequired', hostPresentation: 'filterable', authority: 'privateProfile', privateProfilePath: 'languages', derivedFrom: null, publicProfileProjection: 'direct', publicProfilePath: 'languages',),
  SchemaPersonFieldDefinition(id: 'relationshipGoal', aliases: <String>['lookingfor', 'whatareyoulookingfor', 'relationshipgoal'], questionKind: 'singleChoice', transform: 'trim', privacyClass: 'sensitive', prefillPolicy: 'participantReviewRequired', hostPresentation: 'filterable', authority: 'privateProfile', privateProfilePath: 'relationshipGoal', derivedFrom: null, publicProfileProjection: 'direct', publicProfilePath: 'relationshipGoal',),
  SchemaPersonFieldDefinition(id: 'interestedInGenders', aliases: <String>['interestedin', 'interestedingenders', 'genderpreference'], questionKind: 'multiChoice', transform: 'splitOptions', privacyClass: 'sensitive', prefillPolicy: 'participantReviewRequired', hostPresentation: 'filterable', authority: 'privateProfile', privateProfilePath: 'interestedInGenders', derivedFrom: null, publicProfileProjection: 'never', publicProfilePath: null,),
  SchemaPersonFieldDefinition(id: 'drinking', aliases: <String>['drinking', 'drinkinghabit'], questionKind: 'singleChoice', transform: 'trim', privacyClass: 'sensitive', prefillPolicy: 'participantReviewRequired', hostPresentation: 'filterable', authority: 'privateProfile', privateProfilePath: 'drinking', derivedFrom: null, publicProfileProjection: 'direct', publicProfilePath: 'drinking',),
  SchemaPersonFieldDefinition(id: 'smoking', aliases: <String>['smoking', 'smokinghabit'], questionKind: 'singleChoice', transform: 'trim', privacyClass: 'sensitive', prefillPolicy: 'participantReviewRequired', hostPresentation: 'filterable', authority: 'privateProfile', privateProfilePath: 'smoking', derivedFrom: null, publicProfileProjection: 'direct', publicProfilePath: 'smoking',),
  SchemaPersonFieldDefinition(id: 'religion', aliases: <String>['religion', 'faith'], questionKind: 'singleChoice', transform: 'trim', privacyClass: 'sensitive', prefillPolicy: 'participantReviewRequired', hostPresentation: 'filterable', authority: 'privateProfile', privateProfilePath: 'religion', derivedFrom: null, publicProfileProjection: 'direct', publicProfilePath: 'religion',),
  SchemaPersonFieldDefinition(id: 'workout', aliases: <String>['workout', 'exercise', 'workoutfrequency'], questionKind: 'singleChoice', transform: 'trim', privacyClass: 'profile', prefillPolicy: 'participantReviewRequired', hostPresentation: 'filterable', authority: 'privateProfile', privateProfilePath: 'workout', derivedFrom: null, publicProfileProjection: 'direct', publicProfilePath: 'workout',),
  SchemaPersonFieldDefinition(id: 'diet', aliases: <String>['diet', 'dietarypreference'], questionKind: 'singleChoice', transform: 'trim', privacyClass: 'profile', prefillPolicy: 'participantReviewRequired', hostPresentation: 'filterable', authority: 'privateProfile', privateProfilePath: 'diet', derivedFrom: null, publicProfileProjection: 'direct', publicProfilePath: 'diet',),
  SchemaPersonFieldDefinition(id: 'children', aliases: <String>['children', 'kids', 'childrenstatus'], questionKind: 'singleChoice', transform: 'trim', privacyClass: 'sensitive', prefillPolicy: 'participantReviewRequired', hostPresentation: 'filterable', authority: 'privateProfile', privateProfilePath: 'children', derivedFrom: null, publicProfileProjection: 'direct', publicProfilePath: 'children',),
];

const schemaPersonFieldIdByNormalizedAlias = <String, String>{
  'firstname': 'givenName',
  'givenname': 'givenName',
  'familyname': 'familyName',
  'lastname': 'familyName',
  'surname': 'familyName',
  'displayname': 'displayName',
  'name': 'displayName',
  'fullname': 'displayName',
  'yourname': 'displayName',
  'yourfullname': 'displayName',
  'dob': 'dateOfBirth',
  'dateofbirth': 'dateOfBirth',
  'birthdate': 'dateOfBirth',
  'age': 'age',
  'gender': 'gender',
  'phone': 'phoneNumber',
  'phonenumber': 'phoneNumber',
  'mobile': 'phoneNumber',
  'mobilenumber': 'phoneNumber',
  'whatsapp': 'phoneNumber',
  'whatsappnumber': 'phoneNumber',
  'email': 'email',
  'emailaddress': 'email',
  'instagram': 'instagramHandle',
  'instagramhandle': 'instagramHandle',
  'instagramprofile': 'instagramHandle',
  'linkedin': 'linkedinUrl',
  'linkedinurl': 'linkedinUrl',
  'linkedinprofile': 'linkedinUrl',
  'photo': 'profilePhoto',
  'profilephoto': 'profilePhoto',
  'uploadaphoto': 'profilePhoto',
  'city': 'city',
  'location': 'city',
  'height': 'heightCm',
  'heightcm': 'heightCm',
  'occupation': 'occupation',
  'job': 'occupation',
  'profession': 'occupation',
  'company': 'company',
  'workplace': 'company',
  'employer': 'company',
  'education': 'education',
  'educationlevel': 'education',
  'language': 'languages',
  'languages': 'languages',
  'languagesspoken': 'languages',
  'lookingfor': 'relationshipGoal',
  'whatareyoulookingfor': 'relationshipGoal',
  'relationshipgoal': 'relationshipGoal',
  'interestedin': 'interestedInGenders',
  'interestedingenders': 'interestedInGenders',
  'genderpreference': 'interestedInGenders',
  'drinking': 'drinking',
  'drinkinghabit': 'drinking',
  'smoking': 'smoking',
  'smokinghabit': 'smoking',
  'religion': 'religion',
  'faith': 'religion',
  'workout': 'workout',
  'exercise': 'workout',
  'workoutfrequency': 'workout',
  'diet': 'diet',
  'dietarypreference': 'diet',
  'children': 'children',
  'kids': 'children',
  'childrenstatus': 'children',
};

String? schemaPersonFieldIdForNormalizedAlias(String alias) =>
    schemaPersonFieldIdByNormalizedAlias[alias];

SchemaPersonFieldDefinition? schemaPersonFieldForId(String id) {
  for (final field in schemaPersonFieldCatalog) {
    if (field.id == id) return field;
  }
  return null;
}

const schemaProfilePromptAnswerSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/embedded/profile_prompt_answer.schema.json',
  'title': 'ProfilePromptAnswer',
  'description': 'One structured written profile prompt answer stored on users and publicProfiles.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'promptId',
    'prompt',
    'answer',
  ],
  'properties': <String, Object?>{
    'promptId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 80,
    },
    'prompt': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 140,
    },
    'answer': <String, Object?>{
      'type': 'string',
      'maxLength': 300,
    },
  },
  'x-catch-catalog': '../catalogs/profile_prompts.json',
};

const schemaPhotoPromptAnswerSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/embedded/photo_prompt_answer.schema.json',
  'title': 'PhotoPromptAnswer',
  'description': 'One optional display prompt selected for a profile photo slot. The caption field is legacy-only and should no longer be written by clients.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'photoIndex',
    'promptId',
    'prompt',
  ],
  'properties': <String, Object?>{
    'photoIndex': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 5,
    },
    'promptId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 80,
    },
    'prompt': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 140,
    },
    'caption': <String, Object?>{
      'type': 'string',
      'maxLength': 140,
      'deprecated': true,
      'description': 'Legacy user-entered caption retained for compatibility with older documents.',
    },
  },
  'x-catch-catalog': '../catalogs/photo_prompts.json',
};

const schemaProfilePhotoSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/embedded/profile_photo.schema.json',
  'title': 'ProfilePhoto',
  'description': 'Future canonical profile-photo object that groups display URLs, Firebase Storage object paths, prompt metadata, moderation state, order, and lifecycle timestamps.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'id',
    'url',
    'thumbnailUrl',
    'storagePath',
    'thumbnailStoragePath',
    'position',
    'createdAt',
    'updatedAt',
  ],
  'properties': <String, Object?>{
    'id': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 80,
      'pattern': '^[A-Za-z0-9_-]+\$',
    },
    'url': <String, Object?>{
      'type': 'string',
      'format': 'uri',
      'maxLength': 2048,
    },
    'thumbnailUrl': <String, Object?>{
      'type': 'string',
      'format': 'uri',
      'maxLength': 2048,
    },
    'storagePath': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 512,
      'pattern': '^[^/\\u0000][^\\u0000]*\$',
    },
    'thumbnailStoragePath': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 512,
      'pattern': '^[^/\\u0000][^\\u0000]*\$',
    },
    'prompt': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'title': 'PhotoPromptAnswer',
          'description': 'One optional display prompt selected for a profile photo slot. The caption field is legacy-only and should no longer be written by clients.',
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'photoIndex',
            'promptId',
            'prompt',
          ],
          'properties': <String, Object?>{
            'photoIndex': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 5,
            },
            'promptId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 80,
            },
            'prompt': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 140,
            },
            'caption': <String, Object?>{
              'type': 'string',
              'maxLength': 140,
              'deprecated': true,
              'description': 'Legacy user-entered caption retained for compatibility with older documents.',
            },
          },
          'x-catch-catalog': '../catalogs/photo_prompts.json',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'moderation': <String, Object?>{
      'type': <Object?>[
        'object',
        'null',
      ],
      'additionalProperties': false,
      'required': <Object?>[
        'status',
      ],
      'properties': <String, Object?>{
        'status': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'pending',
            'approved',
            'rejected',
          ],
        },
        'reason': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 240,
        },
        'reviewedAt': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'description': 'Serialized Firestore Timestamp fixture shape.',
              'x-firestore-type': 'timestamp',
              'additionalProperties': false,
              'required': <Object?>[
                '_seconds',
                '_nanoseconds',
              ],
              'properties': <String, Object?>{
                '_seconds': <String, Object?>{
                  'type': 'integer',
                },
                '_nanoseconds': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 999999999,
                },
              },
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
      },
    },
    'position': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 11,
    },
    'createdAt': <String, Object?>{
      'type': 'object',
      'description': 'Serialized Firestore Timestamp fixture shape.',
      'x-firestore-type': 'timestamp',
      'additionalProperties': false,
      'required': <Object?>[
        '_seconds',
        '_nanoseconds',
      ],
      'properties': <String, Object?>{
        '_seconds': <String, Object?>{
          'type': 'integer',
        },
        '_nanoseconds': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 999999999,
        },
      },
    },
    'updatedAt': <String, Object?>{
      'type': 'object',
      'description': 'Serialized Firestore Timestamp fixture shape.',
      'x-firestore-type': 'timestamp',
      'additionalProperties': false,
      'required': <Object?>[
        '_seconds',
        '_nanoseconds',
      ],
      'properties': <String, Object?>{
        '_seconds': <String, Object?>{
          'type': 'integer',
        },
        '_nanoseconds': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 999999999,
        },
      },
    },
  },
  'definitions': <String, Object?>{
    'storageObjectPath': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 512,
      'pattern': '^[^/\\u0000][^\\u0000]*\$',
    },
  },
  'x-storage-metadata': true,
  'x-future-field': 'profilePhotos',
  'x-migration-contract': '../migrations/profile_photos_storage.json',
};

const schemaUpdateUserProfileCallablePayloadSchema =
    <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/patches/update_user_profile.schema.json',
  'title': 'UpdateUserProfileCallablePayload',
  'description': 'Callable request body for updateUserProfile. Values are normalized before Firestore writes.',
  'x-callable-shape': 'patch',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'fields',
  ],
  'properties': <String, Object?>{
    'fields': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'minProperties': 1,
      'properties': <String, Object?>{
        'name': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 120,
        },
        'displayName': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 80,
          'pattern': '.*\\S.*',
        },
        'email': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'const': '',
            },
            <String, Object?>{
              'type': 'string',
              'format': 'email',
              'maxLength': 320,
            },
          ],
        },
        'instagramHandle': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 30,
              'pattern': '^[A-Za-z0-9._]{1,30}\$',
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'profilePrompts': <String, Object?>{
          'type': 'array',
          'maxItems': 3,
          'items': <String, Object?>{
            'title': 'ProfilePromptAnswer',
            'description': 'One structured written profile prompt answer stored on users and publicProfiles.',
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'promptId',
              'prompt',
              'answer',
            ],
            'properties': <String, Object?>{
              'promptId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 80,
              },
              'prompt': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 140,
              },
              'answer': <String, Object?>{
                'type': 'string',
                'maxLength': 300,
              },
            },
            'x-catch-catalog': '../catalogs/profile_prompts.json',
          },
        },
        'dateOfBirth': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'description': 'Milliseconds since epoch before conversion to Firestore Timestamp.',
        },
        'gender': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'man',
            'woman',
            'nonBinary',
            'other',
          ],
        },
        'profileComplete': <String, Object?>{
          'type': 'boolean',
        },
        'profilePhotos': <String, Object?>{
          'type': 'array',
          'maxItems': 6,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'id',
              'url',
              'thumbnailUrl',
              'storagePath',
              'thumbnailStoragePath',
              'position',
              'createdAt',
              'updatedAt',
            ],
            'properties': <String, Object?>{
              'id': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 80,
                'pattern': '^[A-Za-z0-9_-]+\$',
              },
              'url': <String, Object?>{
                'type': 'string',
                'format': 'uri',
                'maxLength': 2048,
              },
              'thumbnailUrl': <String, Object?>{
                'type': 'string',
                'format': 'uri',
                'maxLength': 2048,
              },
              'storagePath': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 512,
                'pattern': '^[^/\\u0000][^\\u0000]*\$',
              },
              'thumbnailStoragePath': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 512,
                'pattern': '^[^/\\u0000][^\\u0000]*\$',
              },
              'prompt': <String, Object?>{
                'anyOf': <Object?>[
                  <String, Object?>{
                    'title': 'PhotoPromptAnswer',
                    'description': 'One optional display prompt selected for a profile photo slot. The caption field is legacy-only and should no longer be written by clients.',
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'photoIndex',
                      'promptId',
                      'prompt',
                    ],
                    'properties': <String, Object?>{
                      'photoIndex': <String, Object?>{
                        'type': 'integer',
                        'minimum': 0,
                        'maximum': 5,
                      },
                      'promptId': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 80,
                      },
                      'prompt': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 140,
                      },
                      'caption': <String, Object?>{
                        'type': 'string',
                        'maxLength': 140,
                        'deprecated': true,
                        'description': 'Legacy user-entered caption retained for compatibility with older documents.',
                      },
                    },
                    'x-catch-catalog': '../catalogs/photo_prompts.json',
                  },
                  <String, Object?>{
                    'type': 'null',
                  },
                ],
              },
              'moderation': <String, Object?>{
                'type': <Object?>[
                  'object',
                  'null',
                ],
                'additionalProperties': false,
                'required': <Object?>[
                  'status',
                ],
                'properties': <String, Object?>{
                  'status': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'pending',
                      'approved',
                      'rejected',
                    ],
                  },
                  'reason': <String, Object?>{
                    'type': <Object?>[
                      'string',
                      'null',
                    ],
                    'maxLength': 240,
                  },
                  'reviewedAt': <String, Object?>{
                    'type': <Object?>[
                      'integer',
                      'null',
                    ],
                    'minimum': 0,
                  },
                },
              },
              'position': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
                'maximum': 11,
              },
              'createdAt': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
              },
              'updatedAt': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
              },
            },
          },
        },
        'city': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 120,
              'pattern': '^[a-z]{2}-[a-z0-9]+(?:-[a-z0-9]+)*\$',
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'latitude': <String, Object?>{
          'type': <Object?>[
            'number',
            'null',
          ],
          'minimum': -90,
          'maximum': 90,
        },
        'longitude': <String, Object?>{
          'type': <Object?>[
            'number',
            'null',
          ],
          'minimum': -180,
          'maximum': 180,
        },
        'interestedInGenders': <String, Object?>{
          'type': 'array',
          'minItems': 1,
          'maxItems': 8,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'man',
              'woman',
              'nonBinary',
              'other',
            ],
          },
        },
        'minAgePreference': <String, Object?>{
          'type': 'integer',
          'minimum': 18,
          'maximum': 99,
        },
        'maxAgePreference': <String, Object?>{
          'type': 'integer',
          'minimum': 18,
          'maximum': 99,
        },
        'height': <String, Object?>{
          'type': <Object?>[
            'integer',
            'null',
          ],
          'minimum': 120,
          'maximum': 220,
        },
        'occupation': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 120,
        },
        'company': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 120,
        },
        'education': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'enum': <Object?>[
            'highSchool',
            'someCollege',
            'bachelors',
            'masters',
            'phd',
            'tradeSchool',
            'other',
            null,
          ],
        },
        'religion': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'enum': <Object?>[
            'hindu',
            'muslim',
            'christian',
            'sikh',
            'jain',
            'buddhist',
            'other',
            'nonReligious',
            null,
          ],
        },
        'languages': <String, Object?>{
          'type': 'array',
          'maxItems': 20,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'english',
              'hindi',
              'marathi',
              'tamil',
              'telugu',
              'kannada',
              'bengali',
              'gujarati',
              'punjabi',
              'malayalam',
              'odia',
              'other',
            ],
          },
        },
        'relationshipGoal': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'enum': <Object?>[
            'relationship',
            'casual',
            'marriage',
            'friendship',
            'unsure',
            null,
          ],
        },
        'drinking': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'enum': <Object?>[
            'never',
            'socially',
            'often',
            null,
          ],
        },
        'smoking': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'enum': <Object?>[
            'never',
            'occasionally',
            'often',
            null,
          ],
        },
        'workout': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'enum': <Object?>[
            'never',
            'sometimes',
            'often',
            'everyday',
            null,
          ],
        },
        'diet': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'enum': <Object?>[
            'omnivore',
            'vegetarian',
            'vegan',
            'jain',
            'other',
            null,
          ],
        },
        'children': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'enum': <Object?>[
            'dontHave',
            'haveWantMore',
            'haveNoMore',
            'wantSomeday',
            'dontWant',
            null,
          ],
        },
        'activityPreferences': <String, Object?>{
          'title': 'ActivityPreferences',
          'description': 'Per-activity user preferences. Running is the first migrated activity-specific preference object; other activity kinds can be added without new root profile fields.',
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'running',
          ],
          'properties': <String, Object?>{
            'running': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'paceMinSecsPerKm',
                'paceMaxSecsPerKm',
                'preferredDistances',
                'runningReasons',
                'preferredRunTimes',
                'version',
              ],
              'properties': <String, Object?>{
                'paceMinSecsPerKm': <String, Object?>{
                  'type': 'integer',
                  'minimum': 1,
                },
                'paceMaxSecsPerKm': <String, Object?>{
                  'type': 'integer',
                  'minimum': 1,
                },
                'preferredDistances': <String, Object?>{
                  'type': 'array',
                  'maxItems': 12,
                  'uniqueItems': true,
                  'items': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'fiveK',
                      'tenK',
                      'halfMarathon',
                      'marathon',
                    ],
                  },
                },
                'runningReasons': <String, Object?>{
                  'type': 'array',
                  'maxItems': 12,
                  'uniqueItems': true,
                  'items': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'fitness',
                      'community',
                      'mindfulness',
                      'challenge',
                      'weightLoss',
                      'raceTraining',
                      'social',
                    ],
                  },
                },
                'preferredRunTimes': <String, Object?>{
                  'type': 'array',
                  'maxItems': 8,
                  'uniqueItems': true,
                  'items': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'earlyMorning',
                      'morning',
                      'afternoon',
                      'evening',
                      'night',
                    ],
                  },
                },
                'version': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                },
              },
            },
          },
        },
        'prefsNewCatches': <String, Object?>{
          'type': 'boolean',
        },
        'prefsMessages': <String, Object?>{
          'type': 'boolean',
        },
        'prefsEventReminders': <String, Object?>{
          'type': 'boolean',
        },
        'prefsRunStatusUpdates': <String, Object?>{
          'type': 'boolean',
        },
        'prefsClubUpdates': <String, Object?>{
          'type': 'boolean',
        },
        'prefsWeeklyDigest': <String, Object?>{
          'type': 'boolean',
        },
        'prefsShowOnMap': <String, Object?>{
          'type': 'boolean',
        },
        'prefsShowInCrossPaths': <String, Object?>{
          'type': 'boolean',
        },
        'prefsCrossPathsInvitations': <String, Object?>{
          'type': 'boolean',
        },
      },
    },
  },
  'x-normalization': <Object?>[
    'trim prompt ids and display prompt titles',
    'collapse stacked blank lines in prompt answers and captions',
    'drop empty prompt answers and empty photo captions',
    'convert dateOfBirth millis to Firestore Timestamp',
  ],
  'x-intentionally-excluded-fields': <Object?>[
    'firstName',
    'lastName',
    'fcmToken',
    'deleted',
    'deletedAt',
    'sexualOrientation',
    'bio',
  ],
};
