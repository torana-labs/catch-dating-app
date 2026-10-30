import 'package:catch_dating_app/contexts/organizers/domain/host_profile.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/hosts/presentation/host_team_workspace_state.dart';
import 'package:catch_dating_app/platform/catch_async_state.dart';

HostTeamWorkspaceState buildHostTeamWorkspaceState({
  required String? uid,
  required CatchAsyncState<HostProfile?> profile,
  required CatchAsyncState<List<Organizer>> organizers,
  bool editMode = true,
  bool creatingProfile = false,
}) {
  final profileState = buildHostTeamProfileState(
    uid: uid,
    profile: profile,
    organizers: organizers,
  );
  return HostTeamWorkspaceState(
    profile: profileState,
    organizers: buildHostTeamHostedOrganizersState(organizers),
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
  required CatchAsyncState<List<Organizer>> organizers,
}) {
  final loadedProfile = profile.value;
  if (loadedProfile != null) {
    return HostTeamProfileContent(profile: loadedProfile);
  }

  final fallbackProfile = uid == null
      ? null
      : _fallbackHostProfileFromOrganizers(uid, organizers.value);
  if (fallbackProfile != null) {
    return HostTeamProfileContent(profile: fallbackProfile, isFallback: true);
  }

  if (profile.hasError) return HostTeamProfileError(error: profile.error!);
  if (profile.isLoading) return const HostTeamProfileLoading();
  return const HostTeamProfileMissing();
}

HostTeamHostedOrganizersState buildHostTeamHostedOrganizersState(
  CatchAsyncState<List<Organizer>> organizers,
) {
  if (organizers.hasError) return HostTeamHostedOrganizersError(error: organizers.error!);
  if (organizers.isLoading) return const HostTeamHostedOrganizersLoading();
  final value = organizers.value ?? const <Organizer>[];
  return value.isEmpty
      ? const HostTeamHostedOrganizersEmpty()
      : HostTeamHostedOrganizersContent(organizers: value);
}

HostProfile? _fallbackHostProfileFromOrganizers(String uid, List<Organizer>? organizers) {
  if (organizers == null || organizers.isEmpty) return null;
  final hostedOrganizers = organizers.where((organizer) => organizer.isHostedBy(uid)).toList();
  if (hostedOrganizers.isEmpty) return null;
  final firstOrganizer = hostedOrganizers.first;
  OrganizerHostProfile? organizerHostProfile;
  for (final organizer in hostedOrganizers) {
    for (final profile in organizer.displayHostProfiles) {
      if (profile.uid == uid) {
        organizerHostProfile = profile;
        break;
      }
    }
    if (organizerHostProfile != null) break;
  }

  final displayName = _firstNonBlank([
    organizerHostProfile?.displayName,
    firstOrganizer.hostName,
    firstOrganizer.displayHostName,
    'Catch Host',
  ]);
  final avatarUrl = _firstNonBlank([
    organizerHostProfile?.avatarUrl,
    firstOrganizer.hostAvatarUrl,
  ]);
  final ownsAnyOrganizer = hostedOrganizers.any((organizer) => organizer.isOwnedBy(uid));

  return HostProfile(
    uid: uid,
    displayName: displayName,
    avatarUrl: avatarUrl,
    roleTitle: ownsAnyOrganizer ? 'Owner' : 'Host team',
    status: HostProfileStatus.active,
    linkedOrganizerIds: [for (final organizer in hostedOrganizers) organizer.id],
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
