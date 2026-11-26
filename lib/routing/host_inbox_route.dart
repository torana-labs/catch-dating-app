part of 'host_router.dart';

/// The Sends workspace (`workspace=campaigns`), which stays on the inbox
/// screen until its redraw.
@visibleForTesting
HostInboxScreen hostInboxScreenForUri(Uri uri, {String? initialOrganizerId}) {
  final requestedAudienceId = uri.queryParameters['audienceId']?.trim();
  return HostInboxScreen(
    initialScope: hostInboxScopeForQuery(uri.queryParameters),
    initialSegment: _hostInboxSegmentForQuery(uri.queryParameters),
    initialWorkspace: HostMessagingWorkspace.values.firstWhere(
      (workspace) => workspace.name == uri.queryParameters['workspace'],
      orElse: () => HostMessagingWorkspace.inbox,
    ),
    initialSavedAudienceId:
        uri.queryParameters['compose'] == '1' &&
            requestedAudienceId != null &&
            requestedAudienceId.isNotEmpty
        ? requestedAudienceId
        : null,
    initialOrganizerId:
        initialOrganizerId ?? uri.queryParameters['organizerId'],
    initialThreadId: uri.queryParameters['threadId'],
  );
}

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
/// compose screen for an event (`eventId`), or Messages. Sends
/// (`workspace=campaigns`) stays on the inbox screen until its redraw.
@visibleForTesting
Widget hostMessagesScreenForUri(Uri uri, {String? initialOrganizerId}) {
  final query = uri.queryParameters;
  final organizerId = initialOrganizerId ?? query['organizerId'];
  bool present(String key) => query[key]?.trim().isNotEmpty ?? false;
  if (query['workspace'] == HostMessagingWorkspace.campaigns.name) {
    return hostInboxScreenForUri(uri, initialOrganizerId: initialOrganizerId);
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
