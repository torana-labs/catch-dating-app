import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/contexts/organizers/domain/host_profile.dart';

final class HostTeamWorkspaceState {
  const HostTeamWorkspaceState({
    required this.profile,
    required this.clubs,
    required this.actions,
  });

  final HostTeamProfileState profile;
  final HostTeamHostedClubsState clubs;
  final HostTeamWorkspaceActionState actions;
}

final class HostTeamWorkspaceActionState {
  const HostTeamWorkspaceActionState({
    required this.uid,
    required this.editMode,
    required this.creatingProfile,
    required this.canCreateProfile,
    required this.profileForEdit,
  });

  factory HostTeamWorkspaceActionState.from({
    required String? uid,
    required bool editMode,
    required bool creatingProfile,
    required HostTeamProfileState profile,
  }) {
    return HostTeamWorkspaceActionState(
      uid: uid,
      editMode: editMode,
      creatingProfile: creatingProfile,
      canCreateProfile:
          uid != null && !creatingProfile && profile is HostTeamProfileMissing,
      profileForEdit: switch (profile) {
        HostTeamProfileContent(:final profile) => profile,
        _ => null,
      },
    );
  }

  final String? uid;
  final bool editMode;
  final bool creatingProfile;
  final bool canCreateProfile;
  final HostProfile? profileForEdit;

  bool get canEditProfile => editMode && uid != null && profileForEdit != null;

  HostTeamClubNavigationState clubNavigationFor(Club club) {
    final isOwner = club.isOwnedBy(uid);
    return HostTeamClubNavigationState(
      club: club,
      roleLabel: isOwner ? 'Owner' : 'Host team',
      destination: editMode && isOwner
          ? HostTeamClubDestination.edit
          : HostTeamClubDestination.preview,
    );
  }
}

enum HostTeamClubDestination { edit, preview }

final class HostTeamClubNavigationState {
  const HostTeamClubNavigationState({
    required this.club,
    required this.roleLabel,
    required this.destination,
  });

  final Club club;
  final String roleLabel;
  final HostTeamClubDestination destination;
}

sealed class HostTeamProfileState {
  const HostTeamProfileState();
}

final class HostTeamProfileLoading extends HostTeamProfileState {
  const HostTeamProfileLoading();
}

final class HostTeamProfileError extends HostTeamProfileState {
  const HostTeamProfileError({required this.error});

  final Object error;
}

final class HostTeamProfileMissing extends HostTeamProfileState {
  const HostTeamProfileMissing();
}

final class HostTeamProfileContent extends HostTeamProfileState {
  const HostTeamProfileContent({
    required this.profile,
    this.isFallback = false,
  });

  final HostProfile profile;
  final bool isFallback;
}

sealed class HostTeamHostedClubsState {
  const HostTeamHostedClubsState();
}

final class HostTeamHostedClubsLoading extends HostTeamHostedClubsState {
  const HostTeamHostedClubsLoading();
}

final class HostTeamHostedClubsError extends HostTeamHostedClubsState {
  const HostTeamHostedClubsError({required this.error});

  final Object error;
}

final class HostTeamHostedClubsEmpty extends HostTeamHostedClubsState {
  const HostTeamHostedClubsEmpty();
}

final class HostTeamHostedClubsContent extends HostTeamHostedClubsState {
  const HostTeamHostedClubsContent({required this.clubs});

  final List<Club> clubs;
}
