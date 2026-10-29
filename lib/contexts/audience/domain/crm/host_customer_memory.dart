import 'package:catch_dating_app/contexts/audience/domain/crm/crm_response_fields.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_query.dart';

class HostCustomerTraits {
  const HostCustomerTraits({
    required this.expectedEventCount,
    required this.attendedEventCount,
    required this.cancelledEventCount,
    required this.noShowCount,
    required this.importedEventCount,
    required this.attendanceRate,
    required this.segments,
    required this.whatsappStatus,
    required this.sourceCoverage,
  });

  factory HostCustomerTraits.fromMap(Map<Object?, Object?> map) =>
      HostCustomerTraits(
        expectedEventCount: crmRequiredInt(map, 'expectedEventCount'),
        attendedEventCount: crmRequiredInt(map, 'attendedEventCount'),
        cancelledEventCount: crmRequiredInt(map, 'cancelledEventCount'),
        noShowCount: crmRequiredInt(map, 'noShowCount'),
        importedEventCount: crmRequiredInt(map, 'importedEventCount'),
        attendanceRate: crmNullableDouble(map['attendanceRate']),
        segments: crmStringList(map['segmentIds'])
            .map(HostAudienceSegment.fromWireValue)
            .whereType<HostAudienceSegment>()
            .toSet(),
        whatsappStatus: crmEnumByName(
          HostAudiencePermissionStatus.values,
          crmRequiredString(map, 'whatsappStatus'),
          'whatsappStatus',
        ),
        sourceCoverage: crmEnumByName(
          HostAudienceSourceCoverage.values,
          crmRequiredString(map, 'sourceCoverage'),
          'sourceCoverage',
        ),
      );

  final int expectedEventCount;
  final int attendedEventCount;
  final int cancelledEventCount;
  final int noShowCount;
  final int importedEventCount;
  final double? attendanceRate;
  final Set<HostAudienceSegment> segments;
  final HostAudiencePermissionStatus whatsappStatus;
  final HostAudienceSourceCoverage sourceCoverage;
}

class HostCustomerNote {
  const HostCustomerNote({
    required this.noteId,
    required this.body,
    required this.authorUid,
    required this.createdAt,
    required this.updatedAt,
    required this.revision,
  });

  factory HostCustomerNote.fromMap(Map<Object?, Object?> map) =>
      HostCustomerNote(
        noteId: crmRequiredString(map, 'noteId'),
        body: crmRequiredString(map, 'body'),
        authorUid: crmRequiredString(map, 'authorUid'),
        createdAt: crmRequiredDateTimeFromMillis(map, 'createdAtMillis'),
        updatedAt: crmRequiredDateTimeFromMillis(map, 'updatedAtMillis'),
        revision: crmRequiredInt(map, 'revision'),
      );

  factory HostCustomerNote.fromCallableData(Object? data) =>
      HostCustomerNote.fromMap(crmRequiredMap(data, 'organizer contact note'));

  final String noteId;
  final String body;
  final String authorUid;
  final DateTime createdAt;
  final DateTime updatedAt;
  final int revision;

  bool get wasEdited => updatedAt.isAfter(createdAt);
}

enum HostCustomerOutreachChannel {
  phoneCall,
  whatsapp,
  email,
  sms,
  inPerson,
  other;

  String get wireValue => name;
}

enum HostCustomerOutreachOutcome {
  reached,
  noAnswer,
  leftMessage,
  wrongContact,
  attempted;

  String get wireValue => name;
}

class HostCustomerOutreach {
  const HostCustomerOutreach({
    required this.outreachId,
    required this.channel,
    required this.outcome,
    required this.note,
    required this.authorUid,
    required this.occurredAt,
    required this.createdAt,
    required this.updatedAt,
    required this.revision,
  });

  factory HostCustomerOutreach.fromMap(Map<Object?, Object?> map) =>
      HostCustomerOutreach(
        outreachId: crmRequiredString(map, 'outreachId'),
        channel: crmEnumByName(
          HostCustomerOutreachChannel.values,
          crmRequiredString(map, 'channel'),
          'outreach channel',
        ),
        outcome: crmEnumByName(
          HostCustomerOutreachOutcome.values,
          crmRequiredString(map, 'outcome'),
          'outreach outcome',
        ),
        note: crmNullableString(map['note']),
        authorUid: crmRequiredString(map, 'authorUid'),
        occurredAt: crmRequiredDateTimeFromMillis(map, 'occurredAtMillis'),
        createdAt: crmRequiredDateTimeFromMillis(map, 'createdAtMillis'),
        updatedAt: crmRequiredDateTimeFromMillis(map, 'updatedAtMillis'),
        revision: crmRequiredInt(map, 'revision'),
      );

  factory HostCustomerOutreach.fromCallableData(Object? data) =>
      HostCustomerOutreach.fromMap(
        crmRequiredMap(data, 'organizer contact outreach'),
      );

  final String outreachId;
  final HostCustomerOutreachChannel channel;
  final HostCustomerOutreachOutcome outcome;
  final String? note;
  final String authorUid;
  final DateTime occurredAt;
  final DateTime createdAt;
  final DateTime updatedAt;
  final int revision;
}

enum HostCustomerPermissionEvidenceStatus {
  unavailable,
  notApplicable,
  complete,
  incomplete,
}

class HostCustomerWhatsappPermission {
  const HostCustomerWhatsappPermission({
    required this.status,
    required this.evidenceStatus,
    required this.receiptId,
    required this.source,
    required this.sourceFormId,
    required this.sourceFormTitle,
    required this.decisionAt,
    required this.identityStrength,
    this.purposes = const {},
  });

  factory HostCustomerWhatsappPermission.fromMap(Map<Object?, Object?> map) =>
      HostCustomerWhatsappPermission(
        status: crmEnumByName(
          HostAudiencePermissionStatus.values,
          crmRequiredString(map, 'status'),
          'WhatsApp permission status',
        ),
        evidenceStatus: crmEnumByName(
          HostCustomerPermissionEvidenceStatus.values,
          crmRequiredString(map, 'evidenceStatus'),
          'WhatsApp permission evidence status',
        ),
        receiptId: crmNullableString(map['receiptId']),
        source: crmNullableString(map['source']),
        sourceFormId: crmNullableString(map['sourceFormId']),
        sourceFormTitle: crmNullableString(map['sourceFormTitle']),
        decisionAt: crmDateTimeFromMillis(map['decisionAtMillis']),
        identityStrength: crmNullableString(map['identityStrength']),
        purposes: _parseWhatsappPurposes(map['purposes']),
      );

  final HostAudiencePermissionStatus status;
  final HostCustomerPermissionEvidenceStatus evidenceStatus;
  final String? receiptId;
  final String? source;
  final String? sourceFormId;
  final String? sourceFormTitle;
  final DateTime? decisionAt;
  final String? identityStrength;
  final Map<String, HostCustomerWhatsappPurposePermission> purposes;
  HostAudiencePermissionStatus get effectiveStatus =>
      purposes.values.any(
        (decision) =>
            decision.status == HostAudiencePermissionStatus.optedIn &&
            decision.evidenceStatus ==
                HostCustomerPermissionEvidenceStatus.complete,
      )
      ? HostAudiencePermissionStatus.optedIn
      : status;
}

Map<String, HostCustomerWhatsappPurposePermission> _parseWhatsappPurposes(
  Object? value,
) {
  if (value == null) return const {};
  final map = crmRequiredMap(value, 'WhatsApp purposes');
  return {
    for (final purpose in ['eventOperations', 'marketing'])
      if (map[purpose] != null)
        purpose: HostCustomerWhatsappPurposePermission.fromMap(
          crmRequiredMap(map[purpose], 'WhatsApp $purpose permission'),
        ),
  };
}

class HostCustomerWhatsappPurposePermission {
  const HostCustomerWhatsappPurposePermission({
    required this.status,
    required this.evidenceStatus,
    required this.receiptId,
    required this.decisionAt,
    required this.deliveryAvailable,
  });

  factory HostCustomerWhatsappPurposePermission.fromMap(
    Map<Object?, Object?> map,
  ) => HostCustomerWhatsappPurposePermission(
    status: crmEnumByName(
      HostAudiencePermissionStatus.values,
      crmRequiredString(map, 'status'),
      'WhatsApp purpose permission status',
    ),
    evidenceStatus: crmEnumByName(
      HostCustomerPermissionEvidenceStatus.values,
      crmRequiredString(map, 'evidenceStatus'),
      'WhatsApp purpose evidence status',
    ),
    receiptId: crmNullableString(map['receiptId']),
    decisionAt: crmDateTimeFromMillis(map['decisionAtMillis']),
    deliveryAvailable: crmRequiredBool(map, 'deliveryAvailable'),
  );

  final HostAudiencePermissionStatus status;
  final HostCustomerPermissionEvidenceStatus evidenceStatus;
  final String? receiptId;
  final DateTime? decisionAt;
  final bool deliveryAvailable;
}

enum HostCustomerOriginSourceKind {
  catchBooking,
  hostImport,
  hostManual,
  webOtp,
  providerSync,
  hostForm,
}

class HostCustomerOrigin {
  const HostCustomerOrigin({
    required this.originId,
    required this.sourceKind,
    required this.sourceEntityKind,
    required this.formId,
    required this.formTitle,
    required this.eventId,
    required this.eventTitle,
    required this.observedAt,
  });

  factory HostCustomerOrigin.fromMap(Map<Object?, Object?> map) =>
      HostCustomerOrigin(
        originId: crmRequiredString(map, 'originId'),
        sourceKind: crmEnumByName(
          HostCustomerOriginSourceKind.values,
          crmRequiredString(map, 'sourceKind'),
          'customer origin source',
        ),
        sourceEntityKind: crmRequiredString(map, 'sourceEntityKind'),
        formId: crmNullableString(map['formId']),
        formTitle: crmNullableString(map['formTitle']),
        eventId: crmNullableString(map['eventId']),
        eventTitle: crmNullableString(map['eventTitle']),
        observedAt: crmRequiredDateTimeFromMillis(map, 'observedAtMillis'),
      );

  final String originId;
  final HostCustomerOriginSourceKind sourceKind;
  final String sourceEntityKind;
  final String? formId;
  final String? formTitle;
  final String? eventId;
  final String? eventTitle;
  final DateTime observedAt;
}
