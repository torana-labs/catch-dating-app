import 'package:catch_platform/routing/app_deep_links.dart';

/// The guest link for an invite-only event, or null without an invite code.
String? hostEventInviteUrl({
  required String organizerId,
  required String eventId,
  required String? inviteCode,
  String? inviteLinkId,
}) {
  final normalizedInviteCode = inviteCode?.trim();
  if (normalizedInviteCode == null || normalizedInviteCode.isEmpty) {
    return null;
  }
  return AppDeepLinks.event(
    organizerId: organizerId,
    eventId: eventId,
    inviteCode: normalizedInviteCode,
    inviteLinkId: inviteLinkId,
  ).toString();
}
