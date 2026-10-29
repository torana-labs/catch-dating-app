import 'dart:convert';

import 'package:catch_dating_app/contexts/forms/domain/forms/host_event_offer.dart';
import 'package:catch_dating_app/core/cryptography/sha256_digest.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callables/commit_organizer_form_admission_callable_request.g.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callables/preview_organizer_form_admission_callable_request.g.dart';

final class HostFormAdmissionScope {
  const HostFormAdmissionScope({
    required this.organizerId,
    required this.eventId,
    required this.responseId,
    required this.contactId,
    required this.offerId,
  });

  factory HostFormAdmissionScope.fromOffer(
    HostEventOffer offer, {String? responseId}
  ) {
    final sourceResponseId = offer.sourceKind == HostOfferSourceKind.formResponse
        ? offer.sourceId : responseId;
    if (sourceResponseId == null || sourceResponseId.isEmpty ||
        responseId != null && responseId != sourceResponseId) {
      throw const FormatException('Admission requires its submitted response.');
    }
    return HostFormAdmissionScope(
      organizerId: offer.organizerId,
      eventId: offer.eventId,
      responseId: sourceResponseId,
      contactId: offer.contactId,
      offerId: offer.offerId,
    );
  }

  factory HostFormAdmissionScope.fromJson(Map<String, Object?> map) =>
      HostFormAdmissionScope(
        organizerId: _id(map, 'organizerId'),
        eventId: _id(map, 'eventId'),
        responseId: _id(map, 'responseId'),
        contactId: _id(map, 'contactId'),
        offerId: _id(map, 'offerId'),
      );

  final String organizerId;
  final String eventId;
  final String responseId;
  final String contactId;
  final String offerId;
  String get journalScope => '$organizerId|$eventId|$responseId';

  Map<String, Object?> toJson() => PreviewOrganizerFormAdmissionCallableRequest(
    organizerId: organizerId,
    eventId: eventId,
    responseId: responseId,
    contactId: contactId,
    offerId: offerId,
  ).toJson();

  void validateResult(Map<String, Object?> map) {
    if (toJson().entries.any((entry) => map[entry.key] != entry.value)) {
      throw const FormatException(
        'Admission result belongs to another source.',
      );
    }
  }
}

final class HostFormAdmissionPreview {
  const HostFormAdmissionPreview._({
    required this.scope,
    required this.canCommit,
    required this.offerRevision,
    required this.offerGeneration,
    required this.ledgerRevision,
    required this.paymentAuthority,
    required this.seatAlreadyOccupied,
    required this.blocker,
  });

  factory HostFormAdmissionPreview.fromData(
    Object? data,
    HostFormAdmissionScope scope,
  ) {
    final map = _map(data);
    scope.validateResult(map);
    final ready = map['canCommit'];
    if (ready is! bool) {
      throw const FormatException('Invalid admission preview.');
    }
    if (ready) {
      if (map['blocker'] != null ||
          map['seatAlreadyOccupied'] is! bool ||
          !{'explicitFree', 'hostAttested'}.contains(map['paymentAuthority'])) {
        throw const FormatException('Incomplete admission authority.');
      }
      return HostFormAdmissionPreview._(
        scope: scope,
        canCommit: true,
        offerRevision: _positive(map, 'expectedOfferRevision'),
        offerGeneration: _positive(map, 'expectedOfferGeneration'),
        ledgerRevision: _positive(map, 'expectedLedgerRevision'),
        paymentAuthority: map['paymentAuthority']! as String,
        seatAlreadyOccupied: map['seatAlreadyOccupied']! as bool,
        blocker: null,
      );
    }
    final blocker = _map(map['blocker']);
    if (!{'unavailable', 'stale', 'conflict'}.contains(blocker['code']) ||
        blocker['message'] is! String ||
        (blocker['message']! as String).isEmpty ||
        [
          'expectedOfferRevision',
          'expectedOfferGeneration',
          'expectedLedgerRevision',
          'paymentAuthority',
          'seatAlreadyOccupied',
        ].any((key) => map[key] != null)) {
      throw const FormatException('Invalid admission blocker.');
    }
    return HostFormAdmissionPreview._(
      scope: scope,
      canCommit: false,
      offerRevision: null,
      offerGeneration: null,
      ledgerRevision: null,
      paymentAuthority: null,
      seatAlreadyOccupied: null,
      blocker: blocker['message']! as String,
    );
  }

  final HostFormAdmissionScope scope;
  final bool canCommit;
  final int? offerRevision;
  final int? offerGeneration;
  final int? ledgerRevision;
  final String? paymentAuthority;
  final bool? seatAlreadyOccupied;
  final String? blocker;

  HostFormAdmissionCommand command(String requestId) {
    if (!canCommit) throw StateError('Review admission readiness first.');
    return HostFormAdmissionCommand(
      scope: scope,
      requestId: requestId,
      offerRevision: offerRevision!,
      offerGeneration: offerGeneration!,
      ledgerRevision: ledgerRevision!,
    );
  }
}

final class HostFormAdmissionCommand {
  const HostFormAdmissionCommand({
    required this.scope,
    required this.requestId,
    required this.offerRevision,
    required this.offerGeneration,
    required this.ledgerRevision,
  });

  factory HostFormAdmissionCommand.fromJson(Map<String, Object?> map) =>
      HostFormAdmissionCommand(
        scope: HostFormAdmissionScope.fromJson(map),
        requestId: _id(map, 'requestId'),
        offerRevision: _positive(map, 'expectedOfferRevision'),
        offerGeneration: _positive(map, 'expectedOfferGeneration'),
        ledgerRevision: _positive(map, 'expectedLedgerRevision'),
      );

  final HostFormAdmissionScope scope;
  final String requestId;
  final int offerRevision;
  final int offerGeneration;
  final int ledgerRevision;

  Map<String, Object?> toJson() => CommitOrganizerFormAdmissionCallableRequest(
    organizerId: scope.organizerId,
    eventId: scope.eventId,
    responseId: scope.responseId,
    contactId: scope.contactId,
    offerId: scope.offerId,
    requestId: requestId,
    expectedOfferRevision: offerRevision,
    expectedOfferGeneration: offerGeneration,
    expectedLedgerRevision: ledgerRevision,
  ).toJson();

  String get requestHash => sha256Digest(jsonEncode([
    'form-admission-v1', scope.organizerId, scope.eventId, scope.responseId,
    scope.contactId, scope.offerId, requestId, offerRevision,
    offerGeneration, ledgerRevision,
  ]));
}

final class HostFormAdmissionReceipt {
  const HostFormAdmissionReceipt._(this.attendeeId, this.replayed);

  factory HostFormAdmissionReceipt.fromData(
    Object? data,
    HostFormAdmissionCommand command,
  ) {
    final map = _map(data);
    command.scope.validateResult(map);
    _id(map, 'receiptId');
    _id(map, 'canonicalSeatKey');
    _positive(map, 'resultingLedgerRevision');
    _positive(map, 'admittedAtMillis');
    if (map['requestId'] != command.requestId ||
        map['requestHash'] != command.requestHash ||
        map['replayed'] is! bool ||
        map['seatAlreadyOccupied'] is! bool) {
      throw const FormatException(
        'Admission receipt does not match the command.',
      );
    }
    return HostFormAdmissionReceipt._(
      _id(map, 'attendeeId'),
      map['replayed']! as bool,
    );
  }

  final String attendeeId;
  final bool replayed;
}

Map<String, Object?> _map(Object? value) {
  if (value is! Map) throw const FormatException('Invalid admission response.');
  return value.cast<String, Object?>();
}

String _id(Map<String, Object?> map, String key) {
  final value = map[key];
  if (value is! String ||
      !RegExp(r'^[A-Za-z0-9][A-Za-z0-9_-]{0,179}$').hasMatch(value)) {
    throw const FormatException('Invalid admission identity.');
  }
  return value;
}

int _positive(Map<String, Object?> map, String key) {
  final value = map[key];
  if (value is! int || value <= 0 || value > 9007199254740991) {
    throw const FormatException('Invalid admission revision.');
  }
  return value;
}
