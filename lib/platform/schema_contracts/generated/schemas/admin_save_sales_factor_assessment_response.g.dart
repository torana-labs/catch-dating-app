// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/admin_sales_intelligence_assessment_response.schema.json.

const schemaAdminSaveSalesFactorAssessmentResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/admin_sales_intelligence_assessment_response.schema.json',
  'title': 'AdminSaveSalesFactorAssessmentResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'assessment',
  ],
  'properties': <String, Object?>{
    'assessment': <String, Object?>{
      'title': 'SalesIntelligenceAssessmentDocument',
      'description': 'Employee-reviewed factor rating linked to existing reviewed Sales evidence; unknown and disputed ratings cannot score.',
      'type': 'object',
      'additionalProperties': false,
      'x-firestore-collection': 'salesIntelligenceAssessments',
      'x-firestore-path': 'salesIntelligenceAssessments/{assessmentId}',
      'x-document-id-field': 'assessmentId',
      'x-owner': 'private Sales intelligence assessment callable',
      'required': <Object?>[
        'schemaVersion',
        'classification',
        'assessmentId',
        'organizerId',
        'factorId',
        'revision',
        'state',
        'value',
        'evidenceIds',
        'reason',
        'reviewedAt',
        'reviewerUid',
      ],
      'properties': <String, Object?>{
        'schemaVersion': <String, Object?>{
          'const': 1,
        },
        'classification': <String, Object?>{
          'const': 'sales_private',
        },
        'assessmentId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 96,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'organizerId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 96,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'factorId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 96,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
        },
        'state': <String, Object?>{
          'enum': <Object?>[
            'known',
            'unknown',
            'disputed',
          ],
        },
        'value': <String, Object?>{
          'type': <Object?>[
            'integer',
            'null',
          ],
          'minimum': 0,
          'maximum': 5,
        },
        'evidenceIds': <String, Object?>{
          'type': 'array',
          'maxItems': 8,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 96,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
        },
        'reason': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 240,
        },
        'reviewedAt': <String, Object?>{
          'type': 'string',
          'format': 'date-time',
        },
        'reviewerUid': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 96,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
      },
      'definitions': <String, Object?>{
        'id': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 96,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
      },
    },
  },
  'x-callable-aliases': <Object?>[
    'adminSaveSalesFactorAssessment',
  ],
};
