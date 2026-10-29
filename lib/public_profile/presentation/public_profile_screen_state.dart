import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/l10n/l10n.dart';

class PublicProfileScreenStateArgs {
  const PublicProfileScreenStateArgs({
    required this.uid,
    required this.initialProfile,
    required this.sharedRunTitle,
  });

  final String uid;
  final PublicProfile? initialProfile;
  final String? sharedRunTitle;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PublicProfileScreenStateArgs &&
          runtimeType == other.runtimeType &&
          uid == other.uid &&
          initialProfile == other.initialProfile &&
          sharedRunTitle == other.sharedRunTitle;

  @override
  int get hashCode => Object.hash(uid, initialProfile, sharedRunTitle);
}

enum PublicProfileRouteStatus { loading, error, unavailable, ready }

enum PublicProfileRetryIntent { reloadProfile }

enum PublicProfileMutationMode {
  idle,
  reportPending,
  blockPending,
  reportAndBlockPending,
}

class PublicProfileScreenState {
  const PublicProfileScreenState({
    required this.uid,
    required this.status,
    required this.mutationMode,
    required this.sharedRunTitle,
    this.profile,
    this.viewerProfile,
    this.error,
    this.retryIntent,
    this.isInitialProfileFallback = false,
  });

  final String uid;
  final PublicProfileRouteStatus status;
  final PublicProfile? profile;
  final UserProfile? viewerProfile;
  final Object? error;
  final PublicProfileRetryIntent? retryIntent;
  final PublicProfileMutationMode mutationMode;
  final String? sharedRunTitle;
  final bool isInitialProfileFallback;

  String title(AppLocalizations l10n) =>
      profile?.name ?? l10n.publicProfilePublicProfileScreenStateTitleProfile;
  bool get isSubmitting => mutationMode != PublicProfileMutationMode.idle;
  bool get showSafetyActions => profile != null;
  bool get enableSafetyActions => showSafetyActions && !isSubmitting;

  UserProfile? get viewerProfileForSurface {
    final target = profile;
    final viewer = viewerProfile;
    if (target == null || viewer == null || viewer.uid == target.uid) {
      return null;
    }
    return viewer;
  }
}

PublicProfileMutationMode publicProfileMutationModeFromFlags({
  required bool blockPending,
  required bool reportPending,
}) {
  if (blockPending && reportPending) {
    return PublicProfileMutationMode.reportAndBlockPending;
  }
  if (blockPending) return PublicProfileMutationMode.blockPending;
  if (reportPending) return PublicProfileMutationMode.reportPending;
  return PublicProfileMutationMode.idle;
}
