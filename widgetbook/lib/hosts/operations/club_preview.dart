import 'package:catch_dating_app/clubs/presentation/detail/club_detail_screen.dart';
import 'package:catch_dating_app/clubs/presentation/detail/club_detail_view_model.dart';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/organizers/data/club_membership_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club_membership.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/core/app_config.dart';
import 'package:catch_dating_app/core/connectivity_service.dart';
import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import '../../support/widgetbook_harness.dart';
import 'fixtures.dart';
import 'preview.dart';
import 'role_theme.dart';

@widgetbook.UseCase(
  name: 'Public preview states',
  type: ClubDetailScreen,
  path: '[P1 product surfaces]/Host operations',
)
Widget hostClubDetailPublicPreviewStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'HostClubDetailScreen',
    contractId: 'screen.host.club.detail',
    children: [
      WidgetbookPageStateCard(
        label: 'host public preview',
        child: const WidgetbookHostDeviceFrame(child: _HostClubDetailScope()),
      ),
      WidgetbookPageStateCard(
        label: 'initial club loading fallback',
        child: const WidgetbookHostDeviceFrame(
          child: _HostClubDetailScope(viewModel: AsyncLoading()),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'load error',
        child: WidgetbookHostDeviceFrame(
          child: _HostClubDetailScope(
            viewModel: AsyncError<ClubDetailViewModel?>(
              StateError('Club detail failed'),
              StackTrace.empty,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'offline',
        child: WidgetbookHostDeviceFrame(
          child: _HostClubDetailScope(
            viewModel: AsyncError<ClubDetailViewModel?>(
              obviousOfflineException(),
              StackTrace.empty,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'not found',
        child: const WidgetbookHostDeviceFrame(
          child: _HostClubDetailScope(
            useInitialClub: false,
            viewModel: AsyncData<ClubDetailViewModel?>(null),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'signed out preview',
        child: WidgetbookHostDeviceFrame(
          child: _HostClubDetailScope(
            uid: null,
            viewModel: AsyncData<ClubDetailViewModel?>(
              _clubDetailViewModel(isHost: false, uid: null),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'signed-in non-host preview',
        child: WidgetbookHostDeviceFrame(
          child: _HostClubDetailScope(
            uid: 'design-host-non-team',
            viewModel: AsyncData<ClubDetailViewModel?>(
              _clubDetailViewModel(isHost: false, uid: 'design-host-non-team'),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'empty schedule',
        child: WidgetbookHostDeviceFrame(
          child: _HostClubDetailScope(
            viewModel: AsyncData<ClubDetailViewModel?>(
              _clubDetailViewModel(upcomingEvents: const <Event>[]),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'text scale 2.0',
        child: const WidgetbookHostDeviceFrame(
          child: WidgetbookMediaOverride(
            textScaler: TextScaler.linear(2),
            child: _HostClubDetailScope(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'reduced motion',
        child: const WidgetbookHostDeviceFrame(
          child: WidgetbookMediaOverride(
            disableAnimations: true,
            child: _HostClubDetailScope(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'dark theme',
        child: const WidgetbookHostDeviceFrame(
          child: _HostClubDetailScope(themeMode: ThemeMode.dark),
        ),
      ),
    ],
  );
}

class _HostClubDetailScope extends StatelessWidget {
  const _HostClubDetailScope({
    this.uid = 'design-host-owner',
    this.viewModel,
    this.useInitialClub = true,
    this.themeMode,
  });

  final String? uid;
  final AsyncValue<ClubDetailViewModel?>? viewModel;
  final bool useInitialClub;
  final ThemeMode? themeMode;

  @override
  Widget build(BuildContext context) {
    final effectiveUid = uid ?? widgetbookHostUid;
    return WidgetbookAppRoleBoundary(
      role: AppRole.host,
      child: WidgetbookFixtureScope(
        overrides: [
          uidProvider.overrideWithValue(AsyncData<String?>(uid)),
          watchUserProfileProvider.overrideWith(
            (ref) =>
                Stream.value(uid == null ? null : HostOperationsFixtures.owner),
          ),
          watchClubMembershipProvider(
            widgetbookClub.id,
            effectiveUid,
          ).overrideWith((ref) => Stream<ClubMembership?>.value(null)),
          clubDetailViewModelProvider(widgetbookClub.id).overrideWith(
            (ref) =>
                viewModel ??
                AsyncData<ClubDetailViewModel?>(
                  _clubDetailViewModel(uid: effectiveUid),
                ),
          ),
        ],
        child: WidgetbookThemedHostPreview(
          themeMode: themeMode ?? ThemeMode.light,
          child: ClubDetailScreen(
            clubId: widgetbookClub.id,
            initialClub: useInitialClub ? widgetbookClub : null,
          ),
        ),
      ),
    );
  }
}

ClubDetailViewModel _clubDetailViewModel({
  bool isHost = true,
  String? uid = 'design-host-owner',
  List<Event>? upcomingEvents,
}) {
  return ClubDetailViewModel(
    club: widgetbookClub,
    isHost: isHost,
    isMember: false,
    upcomingEvents:
        upcomingEvents ??
        HostOperationsFixtures.eventsByClub[widgetbookClub.id] ??
        const [],
    reviews: const [],
    userProfile: uid == null ? null : HostOperationsFixtures.owner,
    uid: uid,
    isAuthenticated: uid != null,
  );
}
