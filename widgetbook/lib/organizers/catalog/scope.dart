import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizer_membership_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_membership.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import 'package:catch_dating_app/organizers/presentation/detail/organizer_detail_read_only_preview.dart';
import 'package:catch_dating_app/organizers/presentation/detail/organizer_detail_screen.dart';
import 'package:catch_dating_app/organizers/presentation/detail/organizer_detail_screen_state.dart';
import 'package:catch_dating_app/organizers/presentation/detail/organizer_detail_view_model.dart';
import 'package:catch_dating_app/organizers/presentation/detail/widgets/organizer_detail_body.dart';
import 'package:catch_dating_app/organizers/presentation/detail/widgets/organizer_detail_dock.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_error_banner.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../support/contract_preview.dart';
import '../../support/widgetbook_harness.dart';
import 'fixtures.dart';
import 'screen.dart';

class WidgetbookOrganizerOrganizerScreenPreview extends StatelessWidget {
  const WidgetbookOrganizerOrganizerScreenPreview({
    super.key,
    required this.uid,
    required this.membership,
    required this.viewModel,
    this.useInitialOrganizer = true,
  });

  final String? uid;
  final OrganizerMembership? membership;
  final AsyncValue<OrganizerDetailViewModel?> viewModel;
  final bool useInitialOrganizer;

  @override
  Widget build(BuildContext context) {
    final effectiveUid = uid;
    return WidgetbookFixtureScope(
      overrides: [
        uidProvider.overrideWith((ref) => Stream<String?>.value(effectiveUid)),
        watchUserProfileProvider.overrideWith(
          (ref) => Stream<UserProfile?>.value(
            effectiveUid == null ? null : widgetbookOrganizerViewer,
          ),
        ),
        if (effectiveUid != null)
          watchOrganizerMembershipProvider(
            widgetbookOrganizerOrganizer.id,
            effectiveUid,
          ).overrideWith((ref) => Stream<OrganizerMembership?>.value(membership)),
        organizerDetailViewModelProvider(
          widgetbookOrganizerOrganizer.id,
        ).overrideWith((ref) => viewModel),
      ],
      child: OrganizerDetailScreen(
        clubId: widgetbookOrganizerOrganizer.id,
        initialOrganizer: useInitialOrganizer ? widgetbookOrganizerOrganizer : null,
      ),
    );
  }
}

class WidgetbookOrganizerOrganizerComposedPreview extends StatelessWidget {
  const WidgetbookOrganizerOrganizerComposedPreview({
    super.key,
    this.organizer,
    this.events,
    this.reviews,
    required this.isMember,
    required this.isAuthenticated,
    this.isMutating = false,
    this.mutationError,
  });

  final Organizer? organizer;
  final List<Event>? events;
  final List<Review>? reviews;
  final bool isMember;
  final bool isAuthenticated;
  final bool isMutating;
  final Object? mutationError;

  @override
  Widget build(BuildContext context) {
    final previewOrganizer = organizer ?? widgetbookOrganizerOrganizer;
    final previewEvents = events ?? widgetbookOrganizerEvents;
    final previewReviews = reviews ?? widgetbookOrganizerReviews;
    final state = !isAuthenticated
        ? OrganizerDetailDockRole.guest
        : isMember
        ? OrganizerDetailDockRole.member
        : OrganizerDetailDockRole.visitor;
    final footnote = switch (state) {
      OrganizerDetailDockRole.visitor => 'FREE TO JOIN · LEAVE ANYTIME',
      OrganizerDetailDockRole.member => 'MEMBER · MANAGE ANYTIME',
      _ => null,
    };

    return Scaffold(
      body: Column(
        children: [
          if (mutationError != null)
            CatchLocalizedErrorBanner(
              mutationError!,
              context: AppErrorContext.organizer,
              onRetry: widgetbookNoop,
            ),
          Expanded(
            child: OrganizerDetailBody(
              state: OrganizerDetailBodyState.fromDomain(
                organizer: previewOrganizer,
                upcomingEvents: previewEvents,
                reviews: previewReviews,
                userProfile: isAuthenticated ? widgetbookOrganizerViewer : null,
                uid: isAuthenticated ? widgetbookOrganizerViewerUid : null,
                isMember: isMember,
                isMutating: isMutating,
                organizerPushNotificationsEnabled: isMember,
                isAuthenticated: isAuthenticated,
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: OrganizerDetailDock(
        state: state,
        activityKind: previewOrganizer.hostDefaults.primaryActivityKind,
        members: state == OrganizerDetailDockRole.owner
            ? null
            : previewOrganizer.memberCount,
        notificationsEnabled: true,
        footnote: footnote,
        isJoinLoading: isMutating,
        onSignIn: widgetbookNoop,
        onJoin: widgetbookNoop,
        onManage: widgetbookNoop,
        onBell: widgetbookNoop,
      ),
    );
  }
}

class WidgetbookOrganizerOrganizerReadOnlyPreview extends StatelessWidget {
  const WidgetbookOrganizerOrganizerReadOnlyPreview({super.key});

  @override
  Widget build(BuildContext context) {
    return WidgetbookFixtureScope(
      overrides: [
        organizerDetailViewModelProvider(widgetbookOrganizerOrganizer.id).overrideWithValue(
          AsyncData<OrganizerDetailViewModel?>(
            OrganizerDetailViewModel(
              organizer: widgetbookOrganizerOrganizer,
              isHost: true,
              isMember: true,
              upcomingEvents: widgetbookOrganizerEvents,
              reviews: widgetbookOrganizerReviews,
              userProfile: widgetbookOrganizerViewer,
              uid: widgetbookOrganizerViewerUid,
              isAuthenticated: true,
            ),
          ),
        ),
      ],
      child: Scaffold(
        body: CustomScrollView(
          slivers: [
            OrganizerDetailReadOnlyPreview(
              initialOrganizer: widgetbookOrganizerOrganizer,
              currentUid: widgetbookOrganizerViewer.uid,
            ),
          ],
        ),
      ),
    );
  }
}

class WidgetbookOrganizerOrganizerDirectoryPreviewScope extends StatelessWidget {
  const WidgetbookOrganizerOrganizerDirectoryPreviewScope({
    super.key,
    required this.child,
  });

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return WidgetbookFixtureScope(
      overrides: [
        uidProvider.overrideWith((ref) => Stream<String?>.value(null)),
      ],
      child: IgnorePointer(child: child),
    );
  }
}
