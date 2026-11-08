part of 'go_router.dart';

@visibleForTesting
HostInboxScreen hostInboxScreenForUri(Uri uri, {String? initialOrganizerId}) {
  final eventId = uri.queryParameters['eventId']?.trim();
  final programId = uri.queryParameters['programId']?.trim();
  final general = uri.queryParameters['scope'] == 'general';
  final initialScope = eventId != null && eventId.isNotEmpty
      ? HostInboxScope.event(eventId)
      : programId != null && programId.isNotEmpty
      ? HostInboxScope.program(programId)
      : general
      ? const HostInboxScope.general()
      : null;
  final initialWorkspace = HostMessagingWorkspace.values.firstWhere(
    (workspace) => workspace.name == uri.queryParameters['workspace'],
    orElse: () => HostMessagingWorkspace.inbox,
  );
  final requestedAudienceId = uri.queryParameters['audienceId']?.trim();
  return HostInboxScreen(
    initialScope: initialScope,
    initialSegment: HostInboxAudienceSegment.values.firstWhere(
      (segment) => segment.name == uri.queryParameters['segment'],
      orElse: () => HostInboxAudienceSegment.booked,
    ),
    initialWorkspace: initialWorkspace,
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

/// The People tab's People view. Requests, forms and responses keep their
/// own screens through [hostAudienceScreenForUri].
@visibleForTesting
Widget hostPeopleScreenForUri(Uri uri) => HostPeopleScreen(
  initialOrganizerId: uri.queryParameters['organizerId'],
  initialContactId: uri.queryParameters['contactId'],
);

/// The inbox route: Messages, the compose screen for an event, or the inbox
/// thread, campaign and programme views that stay until the chat redraw.
@visibleForTesting
Widget hostMessagesScreenForUri(Uri uri, {String? initialOrganizerId}) {
  final query = uri.queryParameters;
  final organizerId = initialOrganizerId ?? query['organizerId'];
  bool present(String key) => query[key]?.trim().isNotEmpty ?? false;
  if (present('threadId') || present('workspace') || present('programId')) {
    return hostInboxScreenForUri(uri, initialOrganizerId: initialOrganizerId);
  }
  if (present('eventId')) {
    return HostComposeScreen(
      organizerId: organizerId,
      eventId: query['eventId']!.trim(),
    );
  }
  return HostMessagesScreen(initialOrganizerId: organizerId);
}
