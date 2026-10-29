import 'package:catch_dating_app/clubs/presentation/detail/club_detail_screen.dart';
import 'package:catch_dating_app/clubs/presentation/detail/club_detail_view_model.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club_membership.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import '../../support/page_preview.dart';
import 'fixtures.dart';
import 'preview.dart';
import 'scope.dart';

final widgetbookClubViewer = UserProfile(
  uid: widgetbookClubViewerUid,
  name: 'Neha Kapoor',
  firstName: 'Neha',
  lastName: 'Kapoor',
  displayName: 'Neha',
  dateOfBirth: DateTime(1996, 4, 12),
  gender: Gender.woman,
  phoneNumber: '+919876543210',
  profileComplete: true,
  city: 'Mumbai',
  interestedInGenders: const [Gender.man],
);

@widgetbook.UseCase(
  name: 'Screen states',
  type: ClubDetailScreen,
  path: '[Club Detail]/Screen',
)
Widget clubDetailScreenStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'ClubDetailScreen',
    catalogId: 'screen.club.detail',
    children: [
      WidgetbookPageStateCard(
        label: 'member default',
        description:
            'Authenticated member with events, hosts, photos, contact, and reviews.',
        child: WidgetbookClubDeviceFrame(
          child: WidgetbookClubClubScreenPreview(
            uid: widgetbookClubViewerUid,
            membership: _membership(pushNotificationsEnabled: true),
            viewModel: AsyncData(_viewModel(isMember: true)),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'visitor',
        description: 'Authenticated user who can join the club.',
        child: WidgetbookClubDeviceFrame(
          child: WidgetbookClubClubScreenPreview(
            uid: widgetbookClubViewerUid,
            membership: null,
            viewModel: AsyncData(_viewModel(isMember: false)),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'guest join',
        description:
            'Signed-out viewer; the dock switches to sign-in affordance.',
        child: WidgetbookClubDeviceFrame(
          child: WidgetbookClubClubScreenPreview(
            uid: null,
            membership: null,
            viewModel: AsyncData(
              _viewModel(
                uid: null,
                includeUserProfile: false,
                isMember: false,
                isAuthenticated: false,
              ),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'loading',
        child: const WidgetbookClubDeviceFrame(
          height: WidgetbookPreviewLayout.clubRoutePreviewHeight,
          child: WidgetbookClubClubScreenPreview(
            uid: widgetbookClubViewerUid,
            membership: null,
            viewModel: AsyncLoading<ClubDetailViewModel?>(),
            useInitialClub: false,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'missing club',
        child: const WidgetbookClubDeviceFrame(
          height: WidgetbookPreviewLayout.clubRoutePreviewHeight,
          child: WidgetbookClubClubScreenPreview(
            uid: widgetbookClubViewerUid,
            membership: null,
            viewModel: AsyncData<ClubDetailViewModel?>(null),
            useInitialClub: false,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'fatal error',
        child: WidgetbookClubDeviceFrame(
          height: WidgetbookPreviewLayout.clubRoutePreviewHeight,
          child: WidgetbookClubClubScreenPreview(
            uid: widgetbookClubViewerUid,
            membership: null,
            viewModel: AsyncError<ClubDetailViewModel?>(
              StateError('Widgetbook club detail load failed'),
              StackTrace.empty,
            ),
            useInitialClub: false,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'offline fallback',
        description:
            'Current generic data-load fallback until explicit offline copy is defined.',
        child: WidgetbookClubDeviceFrame(
          height: WidgetbookPreviewLayout.clubRoutePreviewHeight,
          child: WidgetbookClubClubScreenPreview(
            uid: widgetbookClubViewerUid,
            membership: null,
            viewModel: AsyncError<ClubDetailViewModel?>(
              StateError('No network connection for Club Detail'),
              StackTrace.empty,
            ),
            useInitialClub: false,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'pending mutation',
        description: 'Screen composition with a loading Join affordance.',
        child: WidgetbookClubDeviceFrame(
          child: WidgetbookClubClubComposedPreview(
            isMember: false,
            isAuthenticated: true,
            isMutating: true,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'failed mutation',
        description: 'Static review state for persistent mutation feedback.',
        child: WidgetbookClubDeviceFrame(
          child: WidgetbookClubClubComposedPreview(
            isMember: false,
            isAuthenticated: true,
            mutationError: StateError('Could not join this club.'),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'text scale 2.0',
        description:
            'Tall text-scale review target for hero, host rows, reviews, and dock.',
        child: WidgetbookMediaOverride(
          textScaler: const TextScaler.linear(2),
          child: WidgetbookClubDeviceFrame(
            child: WidgetbookClubClubScreenPreview(
              uid: widgetbookClubViewerUid,
              membership: _membership(pushNotificationsEnabled: true),
              viewModel: AsyncData(_viewModel(isMember: true)),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'reduced motion',
        description:
            'Screen review target with platform animation suppression enabled.',
        child: WidgetbookMediaOverride(
          disableAnimations: true,
          child: WidgetbookClubDeviceFrame(
            child: WidgetbookClubClubScreenPreview(
              uid: widgetbookClubViewerUid,
              membership: _membership(pushNotificationsEnabled: true),
              viewModel: AsyncData(_viewModel(isMember: true)),
            ),
          ),
        ),
      ),
    ],
  );
}

ClubDetailViewModel _viewModel({
  String? uid = widgetbookClubViewerUid,
  UserProfile? userProfile,
  bool includeUserProfile = true,
  required bool isMember,
  bool isAuthenticated = true,
}) {
  return ClubDetailViewModel(
    club: widgetbookClubClub,
    isHost: false,
    isMember: isMember,
    upcomingEvents: widgetbookClubEvents,
    reviews: widgetbookClubReviews,
    userProfile: includeUserProfile
        ? userProfile ?? widgetbookClubViewer
        : null,
    uid: uid,
    isAuthenticated: isAuthenticated,
  );
}

ClubMembership _membership({bool pushNotificationsEnabled = false}) {
  return ClubMembership(
    id: '${widgetbookClubClub.id}_$widgetbookClubViewerUid',
    clubId: widgetbookClubClub.id,
    uid: widgetbookClubViewerUid,
    role: ClubMembershipRole.member,
    status: ClubMembershipStatus.active,
    pushNotificationsEnabled: pushNotificationsEnabled,
    joinedAt: DateTime(2026, 1, 12),
  );
}
