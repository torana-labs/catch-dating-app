part of 'host_router.dart';

/// The scope a link names: `eventId`, else `programId`, else
/// `scope=general`; null names none.
@visibleForTesting
HostInboxScope? hostInboxScopeForQuery(Map<String, String> query) {
  final eventId = query['eventId']?.trim();
  final programId = query['programId']?.trim();
  if (eventId != null && eventId.isNotEmpty) {
    return HostInboxScope.event(eventId);
  }
  if (programId != null && programId.isNotEmpty) {
    return HostInboxScope.program(programId);
  }
  return query['scope'] == 'general' ? const HostInboxScope.general() : null;
}

HostInboxAudienceSegment _hostInboxSegmentForQuery(Map<String, String> query) =>
    HostInboxAudienceSegment.values.firstWhere(
      (segment) => segment.name == query['segment'],
      orElse: () => HostInboxAudienceSegment.booked,
    );

/// The People tab's People view. Forms and responses keep their own
/// screens through [hostAudienceScreenForUri].
@visibleForTesting
Widget hostPeopleScreenForUri(Uri uri) => HostPeopleScreen(
  initialOrganizerId: uri.queryParameters['organizerId'],
  initialContactId: uri.queryParameters['contactId'],
);

/// The inbox route: Messages with a conversation open (`threadId`, read in
/// the scope the link names), Messages on a programme (`programId`), the
/// compose screen for an event (`eventId`), Sends (`workspace=campaigns`),
/// or Messages.
@visibleForTesting
Widget hostMessagesScreenForUri(Uri uri, {String? initialOrganizerId}) {
  final query = uri.queryParameters;
  final organizerId = initialOrganizerId ?? query['organizerId'];
  bool present(String key) => query[key]?.trim().isNotEmpty ?? false;
  // Sends: a new campaign to a saved audience (`compose=1&audienceId=`)
  // and an announcement that prefers the linked `eventId`.
  if (query['workspace'] == 'campaigns') {
    final audienceId = query['audienceId']?.trim();
    final eventId = query['eventId']?.trim();
    return HostSendsScreen(
      initialOrganizerId: organizerId,
      initialSavedAudienceId:
          query['compose'] == '1' && audienceId != null && audienceId.isNotEmpty
          ? audienceId
          : null,
      preferredEventId: eventId == null || eventId.isEmpty ? null : eventId,
    );
  }
  final scope = hostInboxScopeForQuery(query);
  if (present('threadId')) {
    return HostMessagesScreen(
      initialOrganizerId: organizerId,
      threadId: query['threadId']!.trim(),
      threadScope: scope,
    );
  }
  if (scope?.isProgram ?? false) {
    return HostMessagesScreen(
      initialOrganizerId: organizerId,
      initialScope: scope,
      initialSegment: _hostInboxSegmentForQuery(query),
    );
  }
  if (present('eventId')) {
    return HostComposeScreen(
      organizerId: organizerId,
      eventId: query['eventId']!.trim(),
    );
  }
  return HostMessagesScreen(initialOrganizerId: organizerId);
}
