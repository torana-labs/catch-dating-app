import 'package:catch_dating_app/contexts/connections/domain/match.dart';
import 'package:catch_dating_app/contexts/messaging/domain/suvbot_identity.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';

class ChatThreadLookupState {
  const ChatThreadLookupState({
    required this.uid,
    required this.match,
    required this.otherUid,
    required this.isSuvbot,
    required this.isHostInquiry,
    required this.hostInquiryClubId,
    required this.hostProfile,
    required this.initialProfile,
    required this.latestEventId,
    required this.shouldReadPublicProfile,
  });

  final String? uid;
  final Match? match;
  final String? otherUid;
  final bool isSuvbot;
  final bool isHostInquiry;
  final String? hostInquiryClubId;
  final ClubHostProfile? hostProfile;
  final PublicProfile? initialProfile;
  final String? latestEventId;
  final bool shouldReadPublicProfile;

  String? get publicProfileUid => shouldReadPublicProfile ? otherUid : null;

  factory ChatThreadLookupState.resolve({
    required String matchId,
    required String? uid,
    required Match? match,
    required PublicProfile? routeProfile,
    Club? hostInquiryClub,
  }) {
    final otherUid = uid == null ? null : match?.otherId(uid);
    final isSuvbot = isSuvbotConversation(matchId: matchId, otherUid: otherUid);
    final isHostInquiry = match?.isClubHostInquiry == true;
    final hostInquiryClubId = isHostInquiry ? match?.clubId : null;
    final hostProfile = _hostProfileFor(hostInquiryClub, otherUid);
    final otherParticipantIsHost = hostProfile != null;
    final shouldReadPublicProfile =
        otherUid != null &&
        !isSuvbot &&
        (!isHostInquiry ||
            (hostInquiryClub != null && !otherParticipantIsHost));

    return ChatThreadLookupState(
      uid: uid,
      match: match,
      otherUid: isSuvbot ? null : otherUid,
      isSuvbot: isSuvbot,
      isHostInquiry: isHostInquiry,
      hostInquiryClubId: hostInquiryClubId,
      hostProfile: isSuvbot ? null : hostProfile,
      initialProfile: isHostInquiry ? null : routeProfile,
      latestEventId: isSuvbot ? null : match?.latestEventId,
      shouldReadPublicProfile: shouldReadPublicProfile,
    );
  }
}

ClubHostProfile? _hostProfileFor(Club? club, String? uid) {
  if (club == null || uid == null) return null;
  for (final host in club.displayHostProfiles) {
    if (host.uid == uid) return host;
  }
  return null;
}
