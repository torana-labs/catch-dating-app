import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/design_fixtures/profile_surface_fixtures.dart';
import 'package:catch_dating_app/image_uploads/shared/photo_grid.dart';
import 'package:catch_dating_app/platform/catch_async_state.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/callable_request_dtos.g.dart'
    show UpdateUserProfilePatch;
import 'package:catch_dating_app/platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/user_profile/presentation/profile_screen.dart';
import 'package:catch_dating_app/user_profile/presentation/self_profile_screen_state.dart';
import 'package:catch_dating_app/user_profile/presentation/widgets/profile_inline_editors.dart';
import 'package:catch_dating_app/user_profile/presentation/widgets/profile_insights_tab_sliver_body.dart'
    show ProfileInsightsTabSliverBody;
import 'package:catch_dating_app/user_profile/presentation/widgets/profile_preview_body.dart';
import 'package:catch_dating_app/user_profile/presentation/widgets/profile_sliver_header.dart';
import 'package:catch_dating_app/user_profile/presentation/widgets/profile_tab_body.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import '../../support/page_preview.dart';
import 'fixtures.dart';
import 'preview.dart';
import 'scope.dart';

final _longContentViewer = ProfileSurfaceFixtures.longContentViewer;

@widgetbook.UseCase(
  name: 'Self tab body states',
  type: ProfileScreen,
  path: '[P1 product surfaces]/Profiles/Sections',
)
Widget profileScreenSelfTabBodyStates(BuildContext context) {
  const idleUploadState = widgetbookProfileIdlePhotoUploadState;

  return WidgetbookProfileProfileCatalog(
    title: 'ProfileScreen tab body',
    contractId: 'screen.profile.self.tab_body',
    children: [
      WidgetbookProfileStateCard(
        label: 'loading tab shell',
        child: WidgetbookProfileSectionFrame(
          height: WidgetbookPreviewLayout.profilePhonePreviewHeight,
          child: WidgetbookProfileProfileScreenTabBodyPreview(
            state: SelfProfileScreenState(
              status: SelfProfileRouteStatus.loading,
              uploadState: idleUploadState,
              mutationMode: SelfProfileMutationMode.idle,
            ),
          ),
        ),
      ),
      WidgetbookProfileStateCard(
        label: 'load error',
        child: WidgetbookProfileSectionFrame(
          height: WidgetbookPreviewLayout.profileSheetPreviewHeight,
          child: WidgetbookProfileProfileScreenTabBodyPreview(
            state: SelfProfileScreenState(
              status: SelfProfileRouteStatus.error,
              error: StateError('Profile failed'),
              uploadState: idleUploadState,
              mutationMode: SelfProfileMutationMode.idle,
              retryIntent: SelfProfileRetryIntent.reloadProfile,
            ),
          ),
        ),
      ),
      WidgetbookProfileStateCard(
        label: 'profile unavailable',
        child: WidgetbookProfileSectionFrame(
          height: WidgetbookPreviewLayout.profileSheetPreviewHeight,
          child: WidgetbookProfileProfileScreenTabBodyPreview(
            state: SelfProfileScreenState(
              status: SelfProfileRouteStatus.unavailable,
              uploadState: idleUploadState,
              mutationMode: SelfProfileMutationMode.idle,
            ),
          ),
        ),
      ),
      WidgetbookProfileStateCard(
        label: 'ready edit tab',
        child: WidgetbookProfileSectionFrame(
          height: WidgetbookPreviewLayout.profilePhonePreviewHeight,
          child: WidgetbookProfileProfileScreenTabBodyPreview(
            state: SelfProfileScreenState.fromAsync(
              profileState: CatchAsyncState.data(widgetbookProfileViewer),
              today: ProfileSurfaceFixtures.now,
              uploadState: idleUploadState,
              uploadMutationPending: false,
              saveMutationPending: false,
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Insights sliver body states',
  type: ProfileInsightsTabSliverBody,
  path: '[P1 product surfaces]/Profiles/Sections',
)
Widget profileInsightsTabSliverBodyStates(BuildContext context) {
  return const WidgetbookProfileProfileCatalog(
    title: 'ProfileInsightsTabSliverBody',
    contractId: 'screen.profile.insights_tab.sliver_body',
    children: [
      WidgetbookProfileStateCard(
        label: 'analytics body',
        child: WidgetbookProfileSectionFrame(
          height: WidgetbookPreviewLayout.profilePhonePreviewHeight,
          child: CustomScrollView(
            slivers: [
              CatchPageBody.slivers(
                mode: CatchPageBodyMode.standard,
                children: [ProfileInsightsTabSliverBody()],
              ),
            ],
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Self section states',
  type: ProfileScreen,
  path: '[P1 product surfaces]/Profiles',
)
Widget profileScreenSelfSectionStates(BuildContext context) {
  return WidgetbookProfileProfileCatalog(
    title: 'Profile sections',
    contractId: 'screen.profile.self sections',
    children: [
      WidgetbookProfileStateCard(
        label: 'header edit / preview selected',
        child: WidgetbookProfileSectionFrame(
          height: WidgetbookPreviewLayout.profileSectionPreviewHeight,
          child: Column(
            children: const [
              Expanded(child: _ProfileHeaderPreview(initialIndex: 0)),
              CatchDivider.section(),
              Expanded(child: _ProfileHeaderPreview(initialIndex: 1)),
            ],
          ),
        ),
      ),
      WidgetbookProfileStateCard(
        label: 'edit tab complete profile',
        child: WidgetbookProfileSectionFrame(
          height: WidgetbookPreviewLayout.profileExpandedPreviewHeight,
          child: ProfileTabBody(
            user: widgetbookProfileViewer,
            uploadState: widgetbookProfileIdlePhotoUploadState,
            builder: (context, children) => ListView(
              key: const ValueKey('profile-tab-scroll-view'),
              padding: CatchInsets.pageBody.copyWith(left: 0, right: 0),
              children: children,
            ),
          ),
        ),
      ),
      WidgetbookProfileStateCard(
        label: 'edit tab incomplete profile',
        child: WidgetbookProfileSectionFrame(
          height: WidgetbookPreviewLayout.profilePhonePreviewHeight,
          child: ProfileTabBody(
            user: widgetbookProfileIncompleteViewer,
            uploadState: widgetbookProfileIdlePhotoUploadState,
            builder: (context, children) => ListView(
              key: const ValueKey('profile-tab-scroll-view'),
              padding: CatchInsets.pageBody.copyWith(left: 0, right: 0),
              children: children,
            ),
          ),
        ),
      ),
      WidgetbookProfileStateCard(
        label: 'photo grid loading and delete disabled',
        child: WidgetbookProfileSectionFrame(
          height: WidgetbookPreviewLayout.profileSectionPreviewHeight,
          child: Padding(
            padding: CatchInsets.content,
            child: PhotoGrid(
              profilePhotos:
                  widgetbookProfileIncompleteViewer.effectiveProfilePhotos,
              loadingIndices: const {1},
              canDeletePhotos: false,
              onSlotTapped: (_) {},
            ),
          ),
        ),
      ),
      WidgetbookProfileStateCard(
        label: 'inline editor variants',
        child: const WidgetbookProfileSectionFrame(
          height: WidgetbookPreviewLayout.profilePhonePreviewHeight,
          child: _InlineEditorVariants(),
        ),
      ),
      WidgetbookProfileStateCard(
        label: 'preview tab default',
        child: WidgetbookProfileSectionFrame(
          height: WidgetbookPreviewLayout.profilePhonePreviewHeight,
          child: ProfilePreviewBody(profile: widgetbookProfileOwnProfile),
        ),
      ),
      WidgetbookProfileStateCard(
        label: 'long content and text scale',
        child: WidgetbookProfileSectionFrame(
          height: WidgetbookPreviewLayout.profileEditorPreviewHeight,
          child: WidgetbookMediaOverride(
            textScaler: const TextScaler.linear(1.45),
            child: ProfileTabBody(
              user: _longContentViewer,
              uploadState: widgetbookProfileIdlePhotoUploadState,
              builder: (context, children) => ListView(
                key: const ValueKey('profile-tab-scroll-view'),
                padding: CatchInsets.pageBody.copyWith(left: 0, right: 0),
                children: children,
              ),
            ),
          ),
        ),
      ),
    ],
  );
}

class _ProfileHeaderPreview extends StatefulWidget {
  const _ProfileHeaderPreview({required this.initialIndex});

  final int initialIndex;

  @override
  State<_ProfileHeaderPreview> createState() => _ProfileHeaderPreviewState();
}

class _ProfileHeaderPreviewState extends State<_ProfileHeaderPreview>
    with SingleTickerProviderStateMixin {
  late final TabController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TabController(
      length: 3,
      initialIndex: widget.initialIndex,
      vsync: this,
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return CustomScrollView(
      slivers: [
        ...CatchSliverHeader(
          title: const CatchTopBar.primaryRail(
            title: 'Your profile',
            actions: [ProfileSettingsButton()],
          ),
          bottomHeight: CatchLayout.tabRailHeight,
          bottom: ProfileTabBar(controller: _controller),
        ).buildSlivers(context),
        const SliverFillRemaining(
          hasScrollBody: false,
          child: Center(child: Text('Header review body')),
        ),
      ],
    );
  }
}

class _InlineEditorVariants extends StatefulWidget {
  const _InlineEditorVariants();

  @override
  State<_InlineEditorVariants> createState() => _InlineEditorVariantsState();
}

class _InlineEditorVariantsState extends State<_InlineEditorVariants> {
  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: CatchInsets.content,
      children: [
        const ProfileInlineRelationshipGoalChoiceEntryEditor(),
        gapH12,
        const ProfileInlineLanguageMultiChoiceEntryEditor(),
        gapH12,
        ProfileInlineRangeEditor(
          icon: CatchIcons.activity,
          title: 'Pace',
          minimumContract: CatchContractConstraints
              .updateUserProfilePatchActivityPreferencesRunningPaceMinSecsPerKm,
          maximumContract: CatchContractConstraints
              .updateUserProfilePatchActivityPreferencesRunningPaceMaxSecsPerKm,
          value: '5:15-6:30 min/km',
          currentMin: 315,
          currentMax: 390,
          sliderMin: 240,
          sliderMax: 540,
          divisions: 20,
          labelText: widgetbookProfilePaceLabel,
          isExpanded: true,
          onTap: () {},
          onSaved: () {},
          onCancel: () {},
          patchForRange: (min, max) => UpdateUserProfilePatch(
            activityPreferences: ActivityPreferences(
              running: RunningPreferences(
                paceMinSecsPerKm: min,
                paceMaxSecsPerKm: max,
                version: currentRunPreferencesVersion,
              ),
            ),
          ),
        ),
      ],
    );
  }
}
