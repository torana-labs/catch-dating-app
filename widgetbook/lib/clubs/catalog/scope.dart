import 'package:catch_dating_app/clubs/presentation/detail/club_detail_read_only_preview.dart';
import 'package:catch_dating_app/clubs/presentation/detail/club_detail_screen.dart';
import 'package:catch_dating_app/clubs/presentation/detail/club_detail_screen_state.dart';
import 'package:catch_dating_app/clubs/presentation/detail/club_detail_view_model.dart';
import 'package:catch_dating_app/clubs/presentation/detail/widgets/club_detail_body.dart';
import 'package:catch_dating_app/clubs/presentation/detail/widgets/club_detail_dock.dart';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/organizers/data/club_membership_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club_membership.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../support/contract_preview.dart';
import '../../support/widgetbook_harness.dart';
import 'fixtures.dart';
import 'screen.dart';

class WidgetbookClubClubScreenPreview extends StatelessWidget {
  const WidgetbookClubClubScreenPreview({
    super.key,
    required this.uid,
    required this.membership,
    required this.viewModel,
    this.useInitialClub = true,
  });

  final String? uid;
  final ClubMembership? membership;
  final AsyncValue<ClubDetailViewModel?> viewModel;
  final bool useInitialClub;

  @override
  Widget build(BuildContext context) {
    final effectiveUid = uid;
    return WidgetbookFixtureScope(
      overrides: [
        uidProvider.overrideWith((ref) => Stream<String?>.value(effectiveUid)),
        watchUserProfileProvider.overrideWith(
          (ref) => Stream<UserProfile?>.value(
            effectiveUid == null ? null : widgetbookClubViewer,
          ),
        ),
        if (effectiveUid != null)
          watchClubMembershipProvider(
            widgetbookClubClub.id,
            effectiveUid,
          ).overrideWith((ref) => Stream<ClubMembership?>.value(membership)),
        clubDetailViewModelProvider(
          widgetbookClubClub.id,
        ).overrideWith((ref) => viewModel),
      ],
      child: ClubDetailScreen(
        clubId: widgetbookClubClub.id,
        initialClub: useInitialClub ? widgetbookClubClub : null,
      ),
    );
  }
}

class WidgetbookClubClubComposedPreview extends StatelessWidget {
  const WidgetbookClubClubComposedPreview({
    super.key,
    this.club,
    this.events,
    this.reviews,
    required this.isMember,
    required this.isAuthenticated,
    this.isMutating = false,
    this.mutationError,
  });

  final Club? club;
  final List<Event>? events;
  final List<Review>? reviews;
  final bool isMember;
  final bool isAuthenticated;
  final bool isMutating;
  final Object? mutationError;

  @override
  Widget build(BuildContext context) {
    final previewClub = club ?? widgetbookClubClub;
    final previewEvents = events ?? widgetbookClubEvents;
    final previewReviews = reviews ?? widgetbookClubReviews;
    final state = !isAuthenticated
        ? ClubDetailDockRole.guest
        : isMember
        ? ClubDetailDockRole.member
        : ClubDetailDockRole.visitor;
    final footnote = switch (state) {
      ClubDetailDockRole.visitor => 'FREE TO JOIN · LEAVE ANYTIME',
      ClubDetailDockRole.member => 'MEMBER · MANAGE ANYTIME',
      _ => null,
    };

    return Scaffold(
      body: Column(
        children: [
          if (mutationError != null)
            CatchLocalizedErrorBanner(
              mutationError!,
              context: AppErrorContext.club,
              onRetry: widgetbookNoop,
            ),
          Expanded(
            child: ClubDetailBody(
              state: ClubDetailBodyState.fromDomain(
                club: previewClub,
                upcomingEvents: previewEvents,
                reviews: previewReviews,
                userProfile: isAuthenticated ? widgetbookClubViewer : null,
                uid: isAuthenticated ? widgetbookClubViewerUid : null,
                isMember: isMember,
                isMutating: isMutating,
                clubPushNotificationsEnabled: isMember,
                isAuthenticated: isAuthenticated,
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: ClubDetailDock(
        state: state,
        activityKind: previewClub.hostDefaults.primaryActivityKind,
        members: state == ClubDetailDockRole.owner
            ? null
            : previewClub.memberCount,
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

class WidgetbookClubClubReadOnlyPreview extends StatelessWidget {
  const WidgetbookClubClubReadOnlyPreview({super.key});

  @override
  Widget build(BuildContext context) {
    return WidgetbookFixtureScope(
      overrides: [
        clubDetailViewModelProvider(widgetbookClubClub.id).overrideWithValue(
          AsyncData<ClubDetailViewModel?>(
            ClubDetailViewModel(
              club: widgetbookClubClub,
              isHost: true,
              isMember: true,
              upcomingEvents: widgetbookClubEvents,
              reviews: widgetbookClubReviews,
              userProfile: widgetbookClubViewer,
              uid: widgetbookClubViewerUid,
              isAuthenticated: true,
            ),
          ),
        ),
      ],
      child: Scaffold(
        body: CustomScrollView(
          slivers: [
            ClubDetailReadOnlyPreview(
              initialClub: widgetbookClubClub,
              currentUid: widgetbookClubViewer.uid,
            ),
          ],
        ),
      ),
    );
  }
}

class WidgetbookClubClubDirectoryPreviewScope extends StatelessWidget {
  const WidgetbookClubClubDirectoryPreviewScope({
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
