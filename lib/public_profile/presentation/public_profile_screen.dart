import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/core/widgets/block_user_dialog.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/public_profile/data/public_profile_repository.dart';
import 'package:catch_dating_app/public_profile/domain/public_profile.dart';
import 'package:catch_dating_app/public_profile/presentation/public_profile_controller.dart';
import 'package:catch_dating_app/public_profile/presentation/public_profile_screen_state.dart';
import 'package:catch_dating_app/public_profile/presentation/public_profile_screen_view_model.dart';
import 'package:catch_dating_app/swipes/shared/profile_surface/profile_surface.dart';
import 'package:catch_dating_app/user_profile/domain/user_profile.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class PublicProfileScreen extends ConsumerWidget {
  const PublicProfileScreen({
    super.key,
    required this.uid,
    this.initialProfile,
    this.sharedRunTitle,
  });

  final String uid;
  final PublicProfile? initialProfile;
  final String? sharedRunTitle;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final screenState = ref.watch(
      publicProfileScreenStateProvider(
        PublicProfileScreenStateArgs(
          uid: uid,
          initialProfile: initialProfile,
          sharedRunTitle: sharedRunTitle,
        ),
      ),
    );
    final profile = screenState.profile;

    Future<void> confirmBlock(PublicProfile profile) async {
      final confirmed = await showBlockUserDialog(
        context: context,
        name: profile.name,
      );
      if (confirmed != true) return;
      if (!context.mounted) return;

      try {
        await PublicProfileController.blockUserMutation.run(ref, (tx) async {
          await tx
              .get(publicProfileControllerProvider.notifier)
              .blockUser(targetUserId: profile.uid);
        });
      } catch (_) {
        return;
      }
    }

    Future<void> report(PublicProfile profile) async {
      final reason = await showCatchBottomSheet<String>(
        context: context,
        builder: (context) => SafeArea(
          child: PublicProfileReportSheet(
            profileName: profile.name,
            onReasonSelected: (reason) => Navigator.of(context).pop(reason),
          ),
        ),
      );
      if (reason == null) return;
      if (!context.mounted) return;

      try {
        await PublicProfileController.reportUserMutation.run(ref, (tx) async {
          await tx
              .get(publicProfileControllerProvider.notifier)
              .reportUser(targetUserId: profile.uid, reasonCode: reason);
        });
      } catch (_) {
        return;
      }
    }

    ref.listen(PublicProfileController.blockUserMutation, (previous, current) {
      if (previous?.isPending == true && current.isSuccess) {
        if (profile != null) {
          showCatchNotice(
            context,
            context.l10n
                .publicProfilePublicProfileScreenVisiblecopyNameHasBeenBlocked(
                  name: profile.name,
                ),
          );
        }
        Navigator.of(context).maybePop();
      }
    });

    ref.listen(PublicProfileController.reportUserMutation, (previous, current) {
      if (previous?.isPending == true && current.isSuccess) {
        showCatchNotice(
          context,
          context
              .l10n
              .publicProfilePublicProfileScreenVisiblecopyReportSubmitted,
        );
      }
    });

    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [
        PublicProfileController.blockUserMutation,
        PublicProfileController.reportUserMutation,
      ],
    );
    return CatchRouteScaffold(
      topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
        title: screenState.title(context.l10n),
        navigation: const CatchTopBarNavigation(
          mode: CatchTopBarNavigationMode.back,
        ),
        emphasis: scrolledUnder
            ? CatchTopBarEmphasis.divided
            : CatchTopBarEmphasis.plain,
        actions: [
          if (screenState.showSafetyActions)
            CatchActionMenu<String>(
              tooltip: context
                  .l10n
                  .publicProfilePublicProfileScreenTooltipProfileActions,
              enabled: screenState.enableSafetyActions,
              onSelected: (value) {
                if (value ==
                    context
                        .l10n
                        .publicProfilePublicProfileScreenVisiblecopyReport) {
                  report(profile!);
                } else if (value ==
                    context
                        .l10n
                        .publicProfilePublicProfileScreenVisiblecopyBlock) {
                  confirmBlock(profile!);
                }
              },
              items: [
                CatchActionMenuItem(
                  value: context
                      .l10n
                      .publicProfilePublicProfileScreenVisiblecopyReport,
                  label:
                      context.l10n.publicProfilePublicProfileScreenLabelReport,
                  icon: CatchIcons.flagOutlined,
                ),
                CatchActionMenuItem(
                  value: context
                      .l10n
                      .publicProfilePublicProfileScreenVisiblecopyBlock,
                  label:
                      context.l10n.publicProfilePublicProfileScreenLabelBlock,
                  icon: CatchIcons.blockRounded,
                  isDestructive: true,
                ),
              ],
            ),
        ],
      ),
      body: CatchRouteBody.fullBleed(
        child: PublicProfileScreenBody(
          state: screenState,
          onRetry:
              screenState.retryIntent == PublicProfileRetryIntent.reloadProfile
              ? () =>
                    ref.invalidate(watchPublicProfileProvider(screenState.uid))
              : null,
        ),
      ),
    );
  }
}

class PublicProfileScreenBody extends StatelessWidget {
  const PublicProfileScreenBody({super.key, required this.state, this.onRetry});

  final PublicProfileScreenState state;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    switch (state.status) {
      case PublicProfileRouteStatus.loading:
        return const ProfileSurfaceSkeleton(bottomPadding: CatchSpacing.s8);
      case PublicProfileRouteStatus.error:
        return CatchLocalizedErrorState(
          state.error!,
          context: AppErrorContext.profile,
          onRetry: onRetry,
        );
      case PublicProfileRouteStatus.unavailable:
        return Center(
          child: CatchEmptyState(
            icon: CatchIcons.personOffOutlined,
            title: context
                .l10n
                .publicProfilePublicProfileScreenTitleProfileUnavailable,
            message: context
                .l10n
                .publicProfilePublicProfileScreenMessageThisProfileIsNo,
          ),
        );
      case PublicProfileRouteStatus.ready:
        return PublicProfileBody(
          profile: state.profile!,
          submitting: state.isSubmitting,
          viewerProfile: state.viewerProfileForSurface,
          sharedRunTitle: state.sharedRunTitle,
        );
    }
  }
}

class PublicProfileBody extends StatelessWidget {
  const PublicProfileBody({
    super.key,
    required this.profile,
    required this.submitting,
    this.viewerProfile,
    this.sharedRunTitle,
  });

  final PublicProfile profile;
  final bool submitting;
  final UserProfile? viewerProfile;
  final String? sharedRunTitle;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return Stack(
      children: [
        Positioned.fill(
          child: ProfileSurface(
            profile: profile,
            mode: ProfileSurfaceMode.publicProfile,
            bottomPadding: CatchSpacing.s8,
            viewerProfile: viewerProfile?.uid == profile.uid
                ? null
                : viewerProfile,
            sharedRunTitle: sharedRunTitle,
          ),
        ),
        if (submitting)
          Positioned.fill(
            child: CatchSurface(
              duration: Duration.zero,
              radius: CatchRadius.none,
              backgroundColor: t.overlay,
              child: const CatchLoadingIndicator(),
            ),
          ),
      ],
    );
  }
}

class PublicProfileReportSheet extends StatelessWidget {
  const PublicProfileReportSheet({
    super.key,
    required this.profileName,
    required this.onReasonSelected,
  });

  final String profileName;
  final ValueChanged<String> onReasonSelected;

  @override
  Widget build(BuildContext context) {
    return CatchSheet(
      title: context.l10n
          .publicProfilePublicProfileScreenTitleReportProfilename(
            profileName: profileName,
          ),
      padding: CatchInsets.contentBlock,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          PublicProfileReportReasonTile(
            label: context
                .l10n
                .publicProfilePublicProfileScreenLabelHarassmentOrAbuse,
            value: context
                .l10n
                .publicProfilePublicProfileScreenVisiblecopyHarassmentOrAbuse,
            onSelected: onReasonSelected,
          ),
          PublicProfileReportReasonTile(
            label: context
                .l10n
                .publicProfilePublicProfileScreenLabelFakeOrMisleadingProfile,
            value: context
                .l10n
                .publicProfilePublicProfileScreenVisiblecopyFakeOrMisleadingProfile,
            onSelected: onReasonSelected,
          ),
          PublicProfileReportReasonTile(
            label: context
                .l10n
                .publicProfilePublicProfileScreenLabelInappropriateContent,
            value: context
                .l10n
                .publicProfilePublicProfileScreenVisiblecopyInappropriateContent,
            onSelected: onReasonSelected,
          ),
          PublicProfileReportReasonTile(
            label: context
                .l10n
                .publicProfilePublicProfileScreenLabelOtherSafetyConcern,
            value:
                context.l10n.publicProfilePublicProfileScreenVisiblecopyOther,
            onSelected: onReasonSelected,
          ),
        ],
      ),
    );
  }
}

class PublicProfileReportReasonTile extends StatelessWidget {
  const PublicProfileReportReasonTile({
    super.key,
    required this.label,
    required this.value,
    required this.onSelected,
  });

  final String label;
  final String value;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    return CatchFieldLanes.single(
      child: CatchField.nav(
        copy: catchFieldCopy(context.l10n),
        title: label,
        icon: CatchIcons.flagOutlined,
        onTap: () => onSelected(value),
      ),
    );
  }
}
