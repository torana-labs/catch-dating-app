import 'package:meta/meta.dart';

enum HostOfferMutationKind { recordEvidence, reconcileEvidence }

enum HostOfferSourceKind { application, formResponse }

enum HostOfferStatus { draft, offered, withdrawn, expired }

enum HostManualPaymentStatus {
  none,
  evidenceSubmitted,
  hostAttestedReceived,
  rejected,
}

/// One reviewed source, one current CRM contact and one canonical event.
/// A form may produce different offers for different events.
@immutable
class HostOfferRow {
  const HostOfferRow({
    required this.organizerId,
    required this.eventId,
    required this.contactId,
    required this.sourceKind,
    required this.sourceId,
    required this.expiresAt,
    this.organizerPaymentLink,
  });

  final String organizerId;
  final String eventId;
  final String contactId;
  final HostOfferSourceKind sourceKind;
  final String sourceId;
  final DateTime expiresAt;
  final Uri? organizerPaymentLink;

  void validate({required DateTime now, required DateTime eventStartsAt}) {
    if (organizerId.isEmpty ||
        eventId.isEmpty ||
        contactId.isEmpty ||
        sourceId.isEmpty ||
        !expiresAt.isAfter(now) ||
        expiresAt.isAfter(eventStartsAt)) {
      throw ArgumentError('Choose a current source, contact and future event.');
    }
    final link = organizerPaymentLink;
    if (link != null &&
        (link.scheme != 'https' ||
            link.host.isEmpty ||
            link.userInfo.isNotEmpty ||
            link.toString().length > 2048)) {
      throw ArgumentError('Use a public HTTPS payment link.');
    }
  }

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'eventId': eventId,
    'contactId': contactId,
    'sourceKind': sourceKind.name,
    // The server service calls this authority-bearing source ID applicationId
    // for both approved applications and eligible direct form responses.
    'applicationId': sourceId,
    'expiresAtMillis': expiresAt.millisecondsSinceEpoch,
    'organizerPaymentLink': organizerPaymentLink?.toString(),
  };
}

@immutable
class HostOfferBatchDraft {
  const HostOfferBatchDraft({
    required this.organizerId,
    required this.eventId,
    required this.rows,
    this.mode = 'offer',
  });

  final String organizerId;
  final String eventId;
  final List<HostOfferRow> rows;
  final String mode;

  void validate({required DateTime now, required DateTime eventStartsAt}) {
    if (organizerId.isEmpty ||
        eventId.isEmpty ||
        (mode != 'offer' && mode != 'draft') ||
        rows.isEmpty ||
        rows.length > 25) {
      throw ArgumentError('Choose one to twenty-five offer recipients.');
    }
    final contacts = <String>{};
    for (final row in rows) {
      if (row.organizerId != organizerId ||
          row.eventId != eventId ||
          !contacts.add(row.contactId)) {
        throw ArgumentError('One contact may receive one offer per event.');
      }
      row.validate(now: now, eventStartsAt: eventStartsAt);
    }
  }

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'eventId': eventId,
    'mode': mode,
    'rows': rows.map((row) => row.toJson()).toList(growable: false),
  };

  factory HostOfferBatchDraft.fromJson(Map<String, Object?> map) =>
      HostOfferBatchDraft(
        organizerId: _offerString(map, 'organizerId'),
        eventId: _offerString(map, 'eventId'),
        mode: _offerString(map, 'mode'),
        rows: List.unmodifiable((map['rows']! as List).map((value) {
          final row = _offerMap(value, 'offer row');
          return HostOfferRow(
            organizerId: _offerString(row, 'organizerId'),
            eventId: _offerString(row, 'eventId'),
            contactId: _offerString(row, 'contactId'),
            sourceKind: HostOfferSourceKind.values.byName(
              _offerString(row, 'sourceKind'),
            ),
            sourceId: _offerString(row, 'applicationId'),
            expiresAt: DateTime.fromMillisecondsSinceEpoch(
              _offerInt(row, 'expiresAtMillis'),
            ),
            organizerPaymentLink: row['organizerPaymentLink'] is String
                ? Uri.parse(row['organizerPaymentLink']! as String)
                : null,
          );
        })),
      );
}

@immutable
class HostOfferPreview {
  const HostOfferPreview({required this.planDigest, required this.rows});

  factory HostOfferPreview.fromCallableData(Object? data) {
    final map = _offerMap(data, 'offer preview');
    final rows = map['rows'];
    if (rows is! List || rows.isEmpty || rows.length > 25) {
      throw const FormatException('Offer preview rows are invalid.');
    }
    return HostOfferPreview(
      planDigest: _offerString(map, 'planDigest'),
      rows: List.unmodifiable(
        rows.map((entry) {
          final row = _offerMap(entry, 'offer preview row');
          return HostOfferPreviewRow(
            offerId: _offerString(row, 'offerId'),
            revision: _offerInt(row, 'revision'),
            generation: _offerInt(row, 'generation'),
            status: _offerString(row, 'status'),
          );
        }),
      ),
    );
  }

  final String planDigest;
  final List<HostOfferPreviewRow> rows;

  Map<String, Object?> toJson() => {
    'planDigest': planDigest,
    'rows': [
      for (final row in rows)
        {
          'offerId': row.offerId,
          'revision': row.revision,
          'generation': row.generation,
          'status': row.status,
        },
    ],
  };
}

@immutable
class HostOfferPreviewRow {
  const HostOfferPreviewRow({
    required this.offerId,
    required this.revision,
    required this.generation,
    required this.status,
  });

  final String offerId;
  final int revision;
  final int generation;
  final String status;
}

@immutable
class HostOfferCommitReceipt {
  const HostOfferCommitReceipt({
    required this.organizerId,
    required this.eventId,
    required this.requestId,
    required this.results,
    this.requestHash,
  });

  factory HostOfferCommitReceipt.fromCallableData(Object? data) {
    final map = _offerMap(data, 'offer commit');
    final results = map['results'];
    if (results is! List) {
      throw const FormatException('Offer commit results are invalid.');
    }
    return HostOfferCommitReceipt(
      organizerId: _offerString(map, 'organizerId'),
      eventId: _offerString(map, 'eventId'),
      requestId: _offerString(map, 'requestId'),
      requestHash: _offerString(map, 'requestHash'),
      results: List.unmodifiable(
        results.map((entry) {
          final result = _offerMap(entry, 'offer commit row');
          return HostOfferPreviewRow(
            offerId: _offerString(result, 'offerId'),
            revision: _offerInt(result, 'revision'),
            generation: _offerInt(result, 'generation'),
            status: 'committed',
          );
        }),
      ),
    );
  }

  final String organizerId;
  final String eventId;
  final String requestId;
  final String? requestHash;
  final List<HostOfferPreviewRow> results;
}

@immutable
class HostOfferPaymentSnapshot {
  const HostOfferPaymentSnapshot({
    required this.eventPaymentRevision,
    required this.eventPaymentHash,
    required this.collectionMode,
    required this.expectedAmountMinor,
    required this.currency,
    required this.reusablePaymentPageUrl,
    required this.paymentInstructions,
    required this.messageTemplate,
    required this.personalPaymentLink,
    required this.expiresAt,
  });

  factory HostOfferPaymentSnapshot.fromMap(Object? value) {
    final map = _offerMap(value, 'offer payment snapshot');
    return HostOfferPaymentSnapshot(
      eventPaymentRevision: _offerInt(map, 'eventPaymentRevision'),
      eventPaymentHash: _offerString(map, 'eventPaymentHash'),
      collectionMode: _offerNullableString(map['collectionMode']),
      expectedAmountMinor: _offerInt(map, 'expectedAmountMinor'),
      currency: _offerNullableString(map['currency']),
      reusablePaymentPageUrl: _offerNullableUri(map['reusablePaymentPageUrl']),
      paymentInstructions: _offerNullableString(map['paymentInstructions']),
      messageTemplate: _offerNullableString(map['messageTemplate']),
      personalPaymentLink: _offerNullableUri(map['personalPaymentLink']),
      expiresAt: DateTime.fromMillisecondsSinceEpoch(
        _offerInt(map, 'expiresAtMillis'),
      ),
    );
  }

  final int eventPaymentRevision;
  final String eventPaymentHash;
  final String? collectionMode;
  final int expectedAmountMinor;
  final String? currency;
  final Uri? reusablePaymentPageUrl;
  final String? paymentInstructions;
  final String? messageTemplate;
  final Uri? personalPaymentLink;
  final DateTime expiresAt;
}

@immutable
class HostManualPaymentReview {
  const HostManualPaymentReview({
    required this.status,
    required this.evidenceReference,
    required this.evidenceRecordedAt,
    required this.reviewedByUid,
    required this.reviewedAt,
    required this.reviewNote,
    required this.bankReceiptChecked,
    this.attestedAmountMinor,
    this.attestedCurrency,
    this.attestedEventPaymentRevision,
    this.attestedEventPaymentHash,
  });

  factory HostManualPaymentReview.fromMap(Object? data) {
    final map = _offerMap(data, 'manual payment review');
    return HostManualPaymentReview(
      status: HostManualPaymentStatus.values.byName(
        _offerString(map, 'status'),
      ),
      evidenceReference: _offerNullableString(map['evidenceReference']),
      evidenceRecordedAt: _offerNullableTime(map['evidenceRecordedAtMillis']),
      reviewedByUid: _offerNullableString(map['reviewedByUid']),
      reviewedAt: _offerNullableTime(map['reviewedAtMillis']),
      reviewNote: _offerNullableString(map['reviewNote']),
      bankReceiptChecked: map['bankReceiptChecked'] == true,
      attestedAmountMinor: _offerNullableInt(map['attestedAmountMinor']),
      attestedCurrency: _offerNullableString(map['attestedCurrency']),
      attestedEventPaymentRevision: _offerNullableInt(
        map['attestedEventPaymentRevision'],
      ),
      attestedEventPaymentHash: _offerNullableString(
        map['attestedEventPaymentHash'],
      ),
    );
  }

  final HostManualPaymentStatus status;
  final String? evidenceReference;
  final DateTime? evidenceRecordedAt;
  final String? reviewedByUid;
  final DateTime? reviewedAt;
  final String? reviewNote;
  final bool bankReceiptChecked;
  final int? attestedAmountMinor;
  final String? attestedCurrency;
  final int? attestedEventPaymentRevision;
  final String? attestedEventPaymentHash;
}

@immutable
class HostEventOffer {
  const HostEventOffer({
    required this.offerId,
    required this.organizerId,
    required this.eventId,
    required this.contactId,
    required this.sourceId,
    required this.sourceKind,
    required this.status,
    required this.effectiveStatus,
    required this.generation,
    required this.revision,
    required this.expiresAt,
    required this.organizerPaymentLink,
    required this.manualPayment,
    this.paymentSnapshot,
  });

  factory HostEventOffer.fromCallableData(Object? data) {
    final wrapper = _offerMap(data, 'event offer detail');
    final offer = _offerMap(wrapper['offer'], 'event offer');
    return HostEventOffer(
      offerId: _offerString(offer, 'offerId'),
      organizerId: _offerString(offer, 'organizerId'),
      eventId: _offerString(offer, 'eventId'),
      contactId: _offerString(offer, 'contactId'),
      sourceId: _offerString(offer, 'applicationId'),
      sourceKind: HostOfferSourceKind.values.byName(
        _offerString(offer, 'sourceKind'),
      ),
      status: HostOfferStatus.values.byName(_offerString(offer, 'status')),
      effectiveStatus: HostOfferStatus.values.byName(
        _offerString(wrapper, 'effectiveStatus'),
      ),
      generation: _offerInt(offer, 'generation'),
      revision: _offerInt(offer, 'revision'),
      expiresAt: DateTime.fromMillisecondsSinceEpoch(
        _offerInt(offer, 'expiresAtMillis'),
      ),
      organizerPaymentLink: switch (offer['organizerPaymentLink']) {
        String value => Uri.parse(value),
        null => null,
        _ => throw const FormatException('Offer payment link is invalid.'),
      },
      manualPayment: HostManualPaymentReview.fromMap(offer['manualPayment']),
      paymentSnapshot: HostOfferPaymentSnapshot.fromMap(
        offer['paymentSnapshot'],
      ),
    );
  }

  final String offerId;
  final String organizerId;
  final String eventId;
  final String contactId;
  final String sourceId;
  final HostOfferSourceKind sourceKind;
  final HostOfferStatus status;
  final HostOfferStatus effectiveStatus;
  final int generation;
  final int revision;
  final DateTime expiresAt;
  final Uri? organizerPaymentLink;
  final HostManualPaymentReview manualPayment;
  final HostOfferPaymentSnapshot? paymentSnapshot;

  bool get hasOffer => status == HostOfferStatus.offered;
  bool get isHostAttested =>
      manualPayment.status == HostManualPaymentStatus.hostAttestedReceived;
}

@immutable
class HostOfferHandoff {
  const HostOfferHandoff({
    required this.kind,
    required this.offerId,
    required this.blockers,
    this.contactId,
    this.editableText,
    this.copyText,
    this.whatsappUrl,
  });

  factory HostOfferHandoff.fromCallableData(Object? value) {
    final map = _offerMap(value, 'offer handoff');
    final kind = _offerString(map, 'kind');
    if (kind != 'blocked' && kind != 'prepared') {
      throw const FormatException('Offer handoff kind is invalid.');
    }
    final blockers = map['blockers'];
    if (kind == 'blocked' && (blockers is! List ||
        blockers.any((entry) => entry is! String))) {
      throw const FormatException('Offer handoff blockers are invalid.');
    }
    return HostOfferHandoff(
      kind: kind,
      offerId: _offerString(map, 'offerId'),
      blockers: kind == 'blocked'
          ? List<String>.unmodifiable(blockers! as List)
          : const [],
      contactId: kind == 'prepared' ? _offerString(map, 'contactId') : null,
      editableText: kind == 'prepared'
          ? _offerString(map, 'editableText')
          : null,
      copyText: kind == 'prepared' ? _offerString(map, 'copyText') : null,
      whatsappUrl: kind == 'prepared'
          ? _offerNullableUri(_offerString(map, 'whatsappUrl'))
          : null,
    );
  }

  final String kind;
  final String offerId;
  final List<String> blockers;
  final String? contactId;
  final String? editableText;
  final String? copyText;
  final Uri? whatsappUrl;
}

abstract interface class HostEventOfferGateway {
  Future<HostOfferPreview> preview(HostOfferBatchDraft draft);
  Future<HostOfferCommitReceipt> commit({
    required HostOfferBatchDraft draft,
    required HostOfferPreview preview,
    required String requestId,
  });
  Future<HostEventOffer> recordReference({
    required HostEventOffer offer,
    required String reference,
    required String requestId,
  });
  Future<HostEventOffer> reviewReference({
    required HostEventOffer offer,
    required HostManualPaymentStatus decision,
    required String note,
    required bool bankReceiptChecked,
    required String requestId,
  });
}

@immutable
class HostOfferPendingCommit {
  const HostOfferPendingCommit({required this.draft,
    required this.preview, required this.requestId});
  final HostOfferBatchDraft draft;
  final HostOfferPreview preview;
  final String requestId;
}

abstract interface class HostOfferCommitOutbox {
  Future<HostOfferCommitReceipt?> submit({
    required String accountId,
    required HostOfferBatchDraft draft,
    required HostOfferPreview preview,
    required String requestId,
  });
  Future<HostOfferPendingCommit?> pending({
    required String accountId,
    required String organizerId,
    required String eventId,
  });
}

abstract interface class HostOfferMutationOutbox {
  Future<HostOfferPendingMutation?> pendingMutation({
    required String accountId,
    required String organizerId,
    required String eventId,
  });
  Future<HostEventOffer> replayMutation({
    required String accountId,
    required String organizerId,
    required String eventId,
  });
  Future<HostEventOffer> mutate({
    required String accountId,
    required HostEventOffer offer,
    required Map<String, Object?> action,
  });
}

@immutable
class HostOfferPendingMutation {
  const HostOfferPendingMutation({
    required this.requestId,
    required this.contactId,
    required this.kind,
    required this.decision,
  });

  final String requestId;
  final String contactId;
  final String kind;
  final String? decision;
}

Map<String, Object?> _offerMap(Object? value, String label) {
  if (value is! Map) throw FormatException('$label is invalid.');
  return value.map((key, item) {
    if (key is! String) throw FormatException('$label key is invalid.');
    return MapEntry(key, item);
  });
}

String _offerString(Map<String, Object?> map, String key) {
  final value = map[key];
  if (value is! String || value.isEmpty) {
    throw FormatException('Offer $key is invalid.');
  }
  return value;
}

int _offerInt(Map<String, Object?> map, String key) {
  final value = map[key];
  if (value is! int || value < 0) {
    throw FormatException('Offer $key is invalid.');
  }
  return value;
}

String? _offerNullableString(Object? value) {
  if (value == null) return null;
  if (value is! String) throw const FormatException('Offer text is invalid.');
  return value;
}

DateTime? _offerNullableTime(Object? value) {
  if (value == null) return null;
  if (value is! int || value < 0) {
    throw const FormatException('Offer time is invalid.');
  }
  return DateTime.fromMillisecondsSinceEpoch(value);
}

int? _offerNullableInt(Object? value) {
  if (value == null) return null;
  if (value is! int || value < 0) {
    throw const FormatException('Offer number is invalid.');
  }
  return value;
}

Uri? _offerNullableUri(Object? value) {
  if (value == null) return null;
  if (value is! String) {
    throw const FormatException('Offer link is invalid.');
  }
  return Uri.parse(value);
}
