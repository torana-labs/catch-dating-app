import 'package:catch_dating_app/contexts/organizers/domain/club.dart';

enum HostClubPublicationKind { private, catchOnly, websiteOnly, everywhere }

/// Keeps native-app discovery and website publication separate in Host UI.
///
/// A single "public/private" label cannot represent these independently
/// governed channels and previously produced contradictory organizer copy.
class HostClubPublicationState {
  const HostClubPublicationState._({
    required this.kind,
    required this.catchAppVisible,
    required this.websiteEnabled,
  });

  factory HostClubPublicationState.fromClub(Club club) {
    final catchAppVisible = club.isPubliclyBrowseable;
    final websiteEnabled = club.publicPage?.isPublicWebsiteEnabled == true;
    final kind = switch ((catchAppVisible, websiteEnabled)) {
      (false, false) => HostClubPublicationKind.private,
      (true, false) => HostClubPublicationKind.catchOnly,
      (false, true) => HostClubPublicationKind.websiteOnly,
      (true, true) => HostClubPublicationKind.everywhere,
    };
    return HostClubPublicationState._(
      kind: kind,
      catchAppVisible: catchAppVisible,
      websiteEnabled: websiteEnabled,
    );
  }

  final HostClubPublicationKind kind;
  final bool catchAppVisible;
  final bool websiteEnabled;

  /// The existing owner mutation intentionally brings the two public channels
  /// back into sync: enable both unless both are already enabled.
  bool get targetPublicListingEnabled =>
      kind != HostClubPublicationKind.everywhere;
}
