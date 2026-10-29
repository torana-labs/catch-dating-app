import 'dart:math' as math;

import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_sliver_error_state.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/image_uploads/shared/photo_upload_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/swipes/shared/profile_surface/profile_surface.dart';
import 'package:catch_dating_app/user_profile/presentation/form_profiles_screen.dart';
import 'package:catch_dating_app/user_profile/presentation/self_profile_screen_state.dart';
import 'package:catch_dating_app/user_profile/presentation/self_profile_screen_state_provider.dart';
import 'package:catch_dating_app/user_profile/presentation/widgets/preview_scroll_physics.dart';
import 'package:catch_dating_app/user_profile/presentation/widgets/profile_insights_tab_sliver_body.dart';
import 'package:catch_dating_app/user_profile/presentation/widgets/profile_preview_body.dart';
import 'package:catch_dating_app/user_profile/presentation/widgets/profile_sliver_header.dart';
import 'package:catch_dating_app/user_profile/presentation/widgets/profile_tab_body.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key, this.initialTab = SelfProfileTab.edit});

  final SelfProfileTab initialTab;

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  late final ScrollController _outerScrollController;
  late final ScrollController _previewScrollController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(
      length: SelfProfileTab.values.length,
      initialIndex: widget.initialTab.index,
      vsync: this,
    );
    _outerScrollController = ScrollController();
    _previewScrollController = ScrollController();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _outerScrollController.dispose();
    _previewScrollController.dispose();
    super.dispose();
  }

  void _handlePreviewLeadingOverscroll(double overscroll) {
    if (!_outerScrollController.hasClients || overscroll >= 0) return;

    final position = _outerScrollController.position;
    final nextOffset = (_outerScrollController.offset + overscroll).clamp(
      position.minScrollExtent,
      position.maxScrollExtent,
    );
    _outerScrollController.jumpTo(nextOffset);
  }

  double _handlePreviewForwardScroll(double scrollDelta) {
    if (!_outerScrollController.hasClients || scrollDelta <= 0) return 0;

    final position = _outerScrollController.position;
    final remainingOuterScroll = position.maxScrollExtent - position.pixels;
    if (remainingOuterScroll <= 0) return 0;

    final consumedByHeader = math.min(scrollDelta, remainingOuterScroll);
    _outerScrollController.jumpTo(
      (position.pixels + consumedByHeader).clamp(
        position.minScrollExtent,
        position.maxScrollExtent,
      ),
    );
    return consumedByHeader;
  }

  @override
  Widget build(BuildContext context) {
    final screenState = ref.watch(selfProfileScreenStateProvider);

    ref.listen(photoUploadControllerProvider, (_, state) {
      final uploadError = state.uploadError;
      if (uploadError != null) {
        // Surface the mapped exception copy (e.g. "That image is too large")
        // instead of a generic hardcoded message.
        showCatchNoticeError(
          context,
          uploadError,
          errorContext: AppErrorContext.profile,
        );
      }
    });

    return CatchRootScreenScaffold.withPrimaryRail(
      header: CatchRootScreenHeader.title(
        title: context.l10n.userProfileProfileScreenTitleYourProfile,
        actions: const [ProfileSettingsButton()],
      ),
      actions: ProfileTabBar(controller: _tabController),
      controller: _outerScrollController,
      semanticsLabel: context.l10n.userProfileProfileScreenLabelProfileTabs,
      semanticsHint: context.l10n.userProfileProfileScreenBodyDragLeftOrRight,
      body: _selfProfileRootBody(
        context: context,
        state: screenState,
        controller: _tabController,
        previewScrollController: _previewScrollController,
        onPreviewForwardScroll: _handlePreviewForwardScroll,
        onPreviewLeadingOverscroll: _handlePreviewLeadingOverscroll,
        onRetry: () => _handleRetry(screenState.retryIntent),
      ),
    );
  }

  void _handleRetry(SelfProfileRetryIntent? intent) {
    switch (intent) {
      case SelfProfileRetryIntent.reloadProfile:
        ref.invalidate(watchUserProfileProvider);
      case null:
        break;
    }
  }

  CatchRootScreenBody _selfProfileRootBody({
    required BuildContext context,
    required SelfProfileScreenState state,
    required TabController controller,
    required ScrollController previewScrollController,
    required double Function(double scrollDelta) onPreviewForwardScroll,
    required ValueChanged<double> onPreviewLeadingOverscroll,
    VoidCallback? onRetry,
  }) {
    switch (state.status) {
      case SelfProfileRouteStatus.loading:
        return CatchRootScreenBody.paged(
          controller: controller,
          pages: [
            const CatchRootScreenPageSpec.scroll(
              page: CatchRootScreenPageScrollView.standard(
                scrollKey: PageStorageKey('profile-edit-tab-loading'),
                children: [ProfileTabSkeletonSliverBody()],
              ),
            ),
            CatchRootScreenPageSpec.scroll(
              page: CatchRootScreenPageScrollView.embeddedViewport(
                scrollKey: const PageStorageKey('profile-preview-tab-loading'),
                children: [
                  ProfilePreviewSkeletonSliverBody(
                    scrollController: previewScrollController,
                    onForwardScroll: onPreviewForwardScroll,
                    onLeadingOverscroll: onPreviewLeadingOverscroll,
                  ),
                ],
              ),
            ),
            const CatchRootScreenPageSpec.scroll(
              page: CatchRootScreenPageScrollView.standard(
                scrollKey: PageStorageKey('profile-insights-tab-loading'),
                children: [ProfileInsightsTabSliverBody()],
              ),
            ),
            _formProfilesPage,
          ],
        );
      case SelfProfileRouteStatus.error:
      case SelfProfileRouteStatus.unavailable:
        return CatchRootScreenBody.paged(
          controller: controller,
          pages: [
            for (final tab in SelfProfileTab.values)
              if (tab == SelfProfileTab.forms)
                _formProfilesPage
              else
                CatchRootScreenPageSpec.scroll(
                  page: CatchRootScreenPageScrollView.standard(
                    scrollKey: PageStorageKey(
                      'profile-${tab.name}-${state.status.name}',
                    ),
                    children: [
                      if (state.status == SelfProfileRouteStatus.error)
                        CatchLocalizedSliverErrorState(
                          state.error!,
                          context: AppErrorContext.profile,
                          onRetry: onRetry,
                        )
                      else
                        CatchSliverEmptyState(
                          icon: CatchIcons.personRemoved,
                          title: context
                              .l10n
                              .userProfileProfileScreenTitleProfileNotAvailable,
                          message: context
                              .l10n
                              .userProfileProfileScreenMessageFinishOnboardingOrSign,
                        ),
                    ],
                  ),
                ),
          ],
        );
      case SelfProfileRouteStatus.ready:
        final user = state.user!;
        final previewProfile = state.previewProfile!;
        return CatchRootScreenBody.paged(
          controller: controller,
          pages: [
            CatchRootScreenPageSpec.scroll(
              page: CatchRootScreenPageScrollView.sections(
                scrollKey: const PageStorageKey('profile-edit-tab-scroll'),
                children: [
                  ProfileTabSliverBody(
                    user: user,
                    uploadState: state.uploadState,
                  ),
                ],
              ),
            ),
            CatchRootScreenPageSpec.scroll(
              page: CatchRootScreenPageScrollView.embeddedViewport(
                scrollKey: const PageStorageKey('profile-preview-tab-scroll'),
                children: [
                  ProfilePreviewSliverBody(
                    profile: previewProfile,
                    scrollController: previewScrollController,
                    onForwardScroll: onPreviewForwardScroll,
                    onLeadingOverscroll: onPreviewLeadingOverscroll,
                  ),
                ],
              ),
            ),
            const CatchRootScreenPageSpec.scroll(
              page: CatchRootScreenPageScrollView.standard(
                scrollKey: PageStorageKey('profile-insights-tab-scroll'),
                children: [ProfileInsightsTabSliverBody()],
              ),
            ),
            _formProfilesPage,
          ],
        );
    }
  }
}

const _formProfilesPage = CatchRootScreenPageSpec.scroll(
  page: CatchRootScreenPageScrollView.standard(
    scrollKey: PageStorageKey('profile-forms-tab-scroll'),
    children: [SliverToBoxAdapter(child: FormProfilesAsyncBoundary())],
  ),
);

class ProfilePreviewSkeletonSliverBody extends StatelessWidget {
  const ProfilePreviewSkeletonSliverBody({
    super.key,
    required this.scrollController,
    required this.onForwardScroll,
    required this.onLeadingOverscroll,
  });

  final ScrollController scrollController;
  final double Function(double scrollDelta) onForwardScroll;
  final ValueChanged<double> onLeadingOverscroll;

  @override
  Widget build(BuildContext context) {
    return SliverFillRemaining(
      child: Padding(
        padding: CatchInsets.profilePreviewBodyTop,
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(
              maxWidth: CatchLayout.maxContentWidth,
            ),
            child: ProfileSurfaceSkeleton(
              scrollController: scrollController,
              scrollPhysics: PreviewHeaderBridgeScrollPhysics(
                onForwardScroll: onForwardScroll,
              ),
              bottomPadding: 0,
              onLeadingOverscroll: onLeadingOverscroll,
            ),
          ),
        ),
      ),
    );
  }
}

class ProfilePreviewSliverBody extends StatelessWidget {
  const ProfilePreviewSliverBody({
    super.key,
    required this.profile,
    required this.scrollController,
    required this.onForwardScroll,
    required this.onLeadingOverscroll,
  });

  final PublicProfile profile;
  final ScrollController scrollController;
  final double Function(double scrollDelta) onForwardScroll;
  final ValueChanged<double> onLeadingOverscroll;

  @override
  Widget build(BuildContext context) {
    return SliverFillRemaining(
      child: Padding(
        padding: CatchInsets.profilePreviewBodyTop,
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(
              maxWidth: CatchLayout.maxContentWidth,
            ),
            child: ProfilePreviewBody(
              profile: profile,
              scrollController: scrollController,
              scrollPhysics: PreviewHeaderBridgeScrollPhysics(
                onForwardScroll: onForwardScroll,
              ),
              onLeadingOverscroll: onLeadingOverscroll,
            ),
          ),
        ),
      ),
    );
  }
}
