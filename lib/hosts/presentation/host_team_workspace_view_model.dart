import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/contexts/organizers/domain/host_profile.dart';
import 'package:catch_dating_app/core/presentation/catch_async_state.dart';
import 'package:catch_dating_app/hosts/presentation/host_team_workspace_state.dart';

HostTeamWorkspaceState buildHostTeamWorkspaceState({
  required String? uid,
  required CatchAsyncState<HostProfile?> profile,
  required CatchAsyncState<List<Club>> clubs,
  bool editMode = true,
  bool creatingProfile = false,
}) {
  final profileState = buildHostTeamProfileState(
    uid: uid,
    profile: profile,
    clubs: clubs,
  );
  return HostTeamWorkspaceState(
    profile: profileState,
    clubs: buildHostTeamHostedClubsState(clubs),
    actions: HostTeamWorkspaceActionState.from(
      uid: uid,
      editMode: editMode,
      creatingProfile: creatingProfile,
      profile: profileState,
    ),
  );
}

HostTeamProfileState buildHostTeamProfileState({
  required String? uid,
  required CatchAsyncState<HostProfile?> profile,
  required CatchAsyncState<List<Club>> clubs,
}) {
  final loadedProfile = profile.value;
  if (loadedProfile != null) {
    return HostTeamProfileContent(profile: loadedProfile);
  }

  final fallbackProfile = uid == null
      ? null
      : _fallbackHostProfileFromClubs(uid, clubs.value);
  if (fallbackProfile != null) {
    return HostTeamProfileContent(profile: fallbackProfile, isFallback: true);
  }

  if (profile.hasError) return HostTeamProfileError(error: profile.error!);
  if (profile.isLoading) return const HostTeamProfileLoading();
  return const HostTeamProfileMissing();
}

HostTeamHostedClubsState buildHostTeamHostedClubsState(
  CatchAsyncState<List<Club>> clubs,
) {
  if (clubs.hasError) return HostTeamHostedClubsError(error: clubs.error!);
  if (clubs.isLoading) return const HostTeamHostedClubsLoading();
  final value = clubs.value ?? const <Club>[];
  return value.isEmpty
      ? const HostTeamHostedClubsEmpty()
      : HostTeamHostedClubsContent(clubs: value);
}

HostProfile? _fallbackHostProfileFromClubs(String uid, List<Club>? clubs) {
  if (clubs == null || clubs.isEmpty) return null;
  final hostedClubs = clubs.where((club) => club.isHostedBy(uid)).toList();
  if (hostedClubs.isEmpty) return null;
  final firstClub = hostedClubs.first;
  ClubHostProfile? clubHostProfile;
  for (final club in hostedClubs) {
    for (final profile in club.displayHostProfiles) {
      if (profile.uid == uid) {
        clubHostProfile = profile;
        break;
      }
    }
    if (clubHostProfile != null) break;
  }

  final displayName = _firstNonBlank([
    clubHostProfile?.displayName,
    firstClub.hostName,
    firstClub.displayHostName,
    'Catch Host',
  ]);
  final avatarUrl = _firstNonBlank([
    clubHostProfile?.avatarUrl,
    firstClub.hostAvatarUrl,
  ]);
  final ownsAnyClub = hostedClubs.any((club) => club.isOwnedBy(uid));

  return HostProfile(
    uid: uid,
    displayName: displayName,
    avatarUrl: avatarUrl,
    roleTitle: ownsAnyClub ? 'Owner' : 'Host team',
    status: HostProfileStatus.active,
    linkedClubIds: [for (final club in hostedClubs) club.id],
    createdAt: null,
    updatedAt: null,
  );
}

String _firstNonBlank(Iterable<String?> values) {
  for (final value in values) {
    final trimmed = value?.trim();
    if (trimmed != null && trimmed.isNotEmpty) return trimmed;
  }
  return 'Catch Host';
}
