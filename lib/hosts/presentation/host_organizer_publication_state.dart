import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';

enum HostOrganizerPublicationKind { private, catchOnly, websiteOnly, everywhere }

/// Keeps native-app discovery and website publication separate in Host UI.
///
/// A single "public/private" label cannot represent these independently
/// governed channels and previously produced contradictory organizer copy.
class HostOrganizerPublicationState {
  const HostOrganizerPublicationState._({
    required this.kind,
    required this.catchAppVisible,
    required this.websiteEnabled,
  });

  factory HostOrganizerPublicationState.fromOrganizer(Organizer organizer) {
    final catchAppVisible = organizer.isPubliclyBrowseable;
    final websiteEnabled = organizer.publicPage?.isPublicWebsiteEnabled == true;
    final kind = switch ((catchAppVisible, websiteEnabled)) {
      (false, false) => HostOrganizerPublicationKind.private,
      (true, false) => HostOrganizerPublicationKind.catchOnly,
      (false, true) => HostOrganizerPublicationKind.websiteOnly,
      (true, true) => HostOrganizerPublicationKind.everywhere,
    };
    return HostOrganizerPublicationState._(
      kind: kind,
      catchAppVisible: catchAppVisible,
      websiteEnabled: websiteEnabled,
    );
  }

  final HostOrganizerPublicationKind kind;
  final bool catchAppVisible;
  final bool websiteEnabled;

  /// The existing owner mutation intentionally brings the two public channels
  /// back into sync: enable both unless both are already enabled.
  bool get targetPublicListingEnabled =>
      kind != HostOrganizerPublicationKind.everywhere;
}
