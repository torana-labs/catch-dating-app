part of 'host_form_response.dart';

/// One intake submission, optionally carrying its application review projection.
@immutable
class HostFormInboxEntry {
  const HostFormInboxEntry({
    required this.entryId,
    required this.submittedAt,
    this.response,
    this.application,
  }) : assert(response != null || application != null);

  factory HostFormInboxEntry.fromResponse(HostFormResponseSummary response) =>
      HostFormInboxEntry(
        entryId: 'response:${response.responseId}',
        submittedAt: response.submittedAt,
        response: response,
      );

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
}
