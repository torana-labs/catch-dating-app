import 'package:catch_dating_app/contexts/organizers/domain/organizer_membership.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/organizers/presentation/detail/organizer_detail_screen.dart';
import 'package:catch_dating_app/organizers/presentation/detail/organizer_detail_view_model.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import '../../support/page_preview.dart';
import 'fixtures.dart';
import 'preview.dart';
import 'scope.dart';

final widgetbookOrganizerViewer = UserProfile(
  uid: widgetbookOrganizerViewerUid,
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
  type: OrganizerDetailScreen,
  path: '[Club Detail]/Screen',
)
Widget organizerDetailScreenStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'ClubDetailScreen',
    catalogId: 'screen.club.detail',
    children: [
      WidgetbookPageStateCard(
        label: 'member default',
        description:
            'Authenticated member with events, hosts, photos, contact, and reviews.',
        child: WidgetbookOrganizerDeviceFrame(
          child: WidgetbookOrganizerOrganizerScreenPreview(
            uid: widgetbookOrganizerViewerUid,
            membership: _membership(pushNotificationsEnabled: true),
            viewModel: AsyncData(_viewModel(isMember: true)),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'visitor',
        description: 'Authenticated user who can join the club.',
        child: WidgetbookOrganizerDeviceFrame(
          child: WidgetbookOrganizerOrganizerScreenPreview(
            uid: widgetbookOrganizerViewerUid,
            membership: null,
            viewModel: AsyncData(_viewModel(isMember: false)),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'guest join',
        description:
            'Signed-out viewer; the dock switches to sign-in affordance.',
        child: WidgetbookOrganizerDeviceFrame(
          child: WidgetbookOrganizerOrganizerScreenPreview(
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
        child: const WidgetbookOrganizerDeviceFrame(
          height: WidgetbookPreviewLayout.organizerRoutePreviewHeight,
          child: WidgetbookOrganizerOrganizerScreenPreview(
            uid: widgetbookOrganizerViewerUid,
            membership: null,
            viewModel: AsyncLoading<OrganizerDetailViewModel?>(),
            useInitialOrganizer: false,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'missing club',
        child: const WidgetbookOrganizerDeviceFrame(
          height: WidgetbookPreviewLayout.organizerRoutePreviewHeight,
          child: WidgetbookOrganizerOrganizerScreenPreview(
            uid: widgetbookOrganizerViewerUid,
            membership: null,
            viewModel: AsyncData<OrganizerDetailViewModel?>(null),
            useInitialOrganizer: false,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'fatal error',
        child: WidgetbookOrganizerDeviceFrame(
          height: WidgetbookPreviewLayout.organizerRoutePreviewHeight,
          child: WidgetbookOrganizerOrganizerScreenPreview(
            uid: widgetbookOrganizerViewerUid,
            membership: null,
            viewModel: AsyncError<OrganizerDetailViewModel?>(
              StateError('Widgetbook club detail load failed'),
              StackTrace.empty,
            ),
            useInitialOrganizer: false,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'offline fallback',
        description:
            'Current generic data-load fallback until explicit offline copy is defined.',
        child: WidgetbookOrganizerDeviceFrame(
          height: WidgetbookPreviewLayout.organizerRoutePreviewHeight,
          child: WidgetbookOrganizerOrganizerScreenPreview(
            uid: widgetbookOrganizerViewerUid,
            membership: null,
            viewModel: AsyncError<OrganizerDetailViewModel?>(
              StateError('No network connection for Club Detail'),
              StackTrace.empty,
            ),
            useInitialOrganizer: false,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'pending mutation',
        description: 'Screen composition with a loading Join affordance.',
        child: WidgetbookOrganizerDeviceFrame(
          child: WidgetbookOrganizerOrganizerComposedPreview(
            isMember: false,
            isAuthenticated: true,
            isMutating: true,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'failed mutation',
        description: 'Static review state for persistent mutation feedback.',
        child: WidgetbookOrganizerDeviceFrame(
          child: WidgetbookOrganizerOrganizerComposedPreview(
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
          child: WidgetbookOrganizerDeviceFrame(
            child: WidgetbookOrganizerOrganizerScreenPreview(
              uid: widgetbookOrganizerViewerUid,
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
          child: WidgetbookOrganizerDeviceFrame(
            child: WidgetbookOrganizerOrganizerScreenPreview(
              uid: widgetbookOrganizerViewerUid,
              membership: _membership(pushNotificationsEnabled: true),
              viewModel: AsyncData(_viewModel(isMember: true)),
            ),
          ),
        ),
      ),
    ],
  );
}

OrganizerDetailViewModel _viewModel({
  String? uid = widgetbookOrganizerViewerUid,
  UserProfile? userProfile,
  bool includeUserProfile = true,
  required bool isMember,
  bool isAuthenticated = true,
}) {
  return OrganizerDetailViewModel(
    organizer: widgetbookOrganizerOrganizer,
    isHost: false,
    isMember: isMember,
    upcomingEvents: widgetbookOrganizerEvents,
    reviews: widgetbookOrganizerReviews,
    userProfile: includeUserProfile
        ? userProfile ?? widgetbookOrganizerViewer
        : null,
    uid: uid,
    isAuthenticated: isAuthenticated,
  );
}

OrganizerMembership _membership({bool pushNotificationsEnabled = false}) {
  return OrganizerMembership(
    id: '${widgetbookOrganizerOrganizer.id}_$widgetbookOrganizerViewerUid',
    clubId: widgetbookOrganizerOrganizer.id,
    uid: widgetbookOrganizerViewerUid,
    role: OrganizerMembershipRole.member,
    status: OrganizerMembershipStatus.active,
    pushNotificationsEnabled: pushNotificationsEnabled,
    joinedAt: DateTime(2026, 1, 12),
  );
}
