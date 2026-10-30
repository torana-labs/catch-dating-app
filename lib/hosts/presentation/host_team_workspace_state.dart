import 'package:catch_dating_app/contexts/organizers/domain/host_profile.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';

final class HostTeamWorkspaceState {
  const HostTeamWorkspaceState({
    required this.profile,
    required this.organizers,
    required this.actions,
  });

  final HostTeamProfileState profile;
  final HostTeamHostedOrganizersState organizers;
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

  HostTeamOrganizerNavigationState organizerNavigationFor(Organizer organizer) {
    final isOwner = organizer.isOwnedBy(uid);
    return HostTeamOrganizerNavigationState(
      organizer: organizer,
      roleLabel: isOwner ? 'Owner' : 'Host team',
      destination: editMode && isOwner
          ? HostTeamOrganizerDestination.edit
          : HostTeamOrganizerDestination.preview,
    );
  }
}

enum HostTeamOrganizerDestination { edit, preview }

final class HostTeamOrganizerNavigationState {
  const HostTeamOrganizerNavigationState({
    required this.organizer,
    required this.roleLabel,
    required this.destination,
  });

  final Organizer organizer;
  final String roleLabel;
  final HostTeamOrganizerDestination destination;
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

sealed class HostTeamHostedOrganizersState {
  const HostTeamHostedOrganizersState();
}

final class HostTeamHostedOrganizersLoading
    extends HostTeamHostedOrganizersState {
  const HostTeamHostedOrganizersLoading();
}

final class HostTeamHostedOrganizersError
    extends HostTeamHostedOrganizersState {
  const HostTeamHostedOrganizersError({required this.error});

  final Object error;
}

final class HostTeamHostedOrganizersEmpty
    extends HostTeamHostedOrganizersState {
  const HostTeamHostedOrganizersEmpty();
}

final class HostTeamHostedOrganizersContent
    extends HostTeamHostedOrganizersState {
  const HostTeamHostedOrganizersContent({required this.organizers});

  final List<Organizer> organizers;
}
