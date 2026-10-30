// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/catch_whatsapp_readiness_ingress.schema.json.

const schemaCatchWhatsappReadinessIngressDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/catch_whatsapp_readiness_ingress.schema.json',
  'title': 'CatchWhatsappReadinessIngressDocument',
  'description': 'Server-only audited atomic-ingress cutover evidence; not an enablement flag. Approval pins evidence digest; transaction checks identity and state. No writer or live ingress attestation is provided.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'ingressId',
    'projectId',
    'wabaId',
    'phoneNumberId',
    'state',
    'atomicIngressStartedAtMillis',
    'evidenceSha256',
    'verifiedAtMillis',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'type': 'integer',
      'const': 1,
    },
    'ingressId': <String, Object?>{
      'type': 'string',
      'pattern': '^cwingress_[a-f0-9]{64}\$',
      'minLength': 74,
      'maxLength': 74,
    },
    'projectId': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-z][a-z0-9-]{4,28}[a-z0-9]\$',
      'minLength': 6,
      'maxLength': 30,
    },
    'wabaId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 32,
      'pattern': '^[0-9]{1,32}\$',
    },
    'phoneNumberId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 32,
      'pattern': '^[0-9]{1,32}\$',
    },
    'state': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'active',
        'revoked',
      ],
    },
    'atomicIngressStartedAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'evidenceSha256': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
      'minLength': 64,
      'maxLength': 64,
    },
    'verifiedAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
  },
  'x-firestore-collection': 'catchWhatsappReadinessIngress',
  'x-firestore-path': 'catchWhatsappReadinessIngress/{ingressId}',
  'x-document-id-field': 'ingressId',
  'x-owner': 'Catch support readiness provisioning',
};
