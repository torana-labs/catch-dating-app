part of 'host_form_response.dart';

/// One intake submission, optionally carrying its application review projection.
@immutable
class HostFormInboxEntry {
  const HostFormInboxEntry({
    required this.entryId,
    required this.submittedAt,
    this.response,
    this.application,
    this.offer,
  }) : assert(response != null || application != null);

  factory HostFormInboxEntry.fromResponse(HostFormResponseSummary response) =>
      HostFormInboxEntry(
        entryId: 'response:${response.responseId}',
        submittedAt: response.submittedAt,
        response: response,
      );

  /// A summary row with the summary's derived offer, when it has one.
  factory HostFormInboxEntry.fromSummary(Map<Object?, Object?> summary) {
    final entry = HostFormInboxEntry.fromMap(
      formOperationRequiredMap(summary['row'], 'row'),
    );
    final offer = summary['offer'];
    return offer == null
        ? entry
        : HostFormInboxEntry(
            entryId: entry.entryId,
            submittedAt: entry.submittedAt,
            response: entry.response,
            application: entry.application,
            offer: HostFormEntryOffer.fromMap(
              formOperationRequiredMap(offer, 'offer'),
            ),
          );
  }

  factory HostFormInboxEntry.fromMap(Map<Object?, Object?> map) {
    final response = map['response'];
    final application = map['application'];
    if (response == null && application == null) {
      throw const FormatException('Empty response entry.');
    }
    return HostFormInboxEntry(
      entryId: formOperationRequiredString(map, 'entryId'),
      submittedAt: formOperationDateTime(map, 'submittedAtMillis'),
      response: response == null
          ? null
          : HostFormResponseSummary.fromMap(
              formOperationRequiredMap(response, 'response'),
            ),
      application: application == null
          ? null
          : HostApplicationSummary.fromMap(
              formOperationRequiredMap(application, 'application'),
            ),
    );
  }
  final String entryId;
  final DateTime submittedAt;
  final HostFormResponseSummary? response;
  final HostApplicationSummary? application;

  /// The latest event offer made from this entry's application; null when
  /// none was made, or when the list came from the callable.
  final HostFormEntryOffer? offer;
}

/// Where an event offer made from an answer stands. A draft is not shown.
enum HostFormEntryOfferStatus { offered, withdrawn, expired }

/// The event offer derived onto a response summary by the server.
@immutable
class HostFormEntryOffer {
  const HostFormEntryOffer({
    required this.status,
    required this.eventId,
    this.offeredAt,
  });

  factory HostFormEntryOffer.fromMap(Map<Object?, Object?> map) {
    final status = HostFormEntryOfferStatus.values
        .where((value) => value.name == map['status'])
        .firstOrNull;
    if (status == null) {
      throw const FormatException('Unknown response offer status.');
    }
    final offeredAt = map['offeredAtMillis'];
    return HostFormEntryOffer(
      status: status,
      eventId: formOperationRequiredString(map, 'eventId'),
      offeredAt: offeredAt == null
          ? null
          : formOperationDateTime(map, 'offeredAtMillis'),
    );
  }

  final HostFormEntryOfferStatus status;
  final String eventId;
  final DateTime? offeredAt;
}
