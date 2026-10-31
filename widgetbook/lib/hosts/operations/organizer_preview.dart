import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizer_membership_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_membership.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/organizers/presentation/detail/organizer_detail_screen.dart';
import 'package:catch_dating_app/organizers/presentation/detail/organizer_detail_view_model.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_dating_app/platform/device/connectivity_service.dart';
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
  type: OrganizerDetailScreen,
  path: '[P1 product surfaces]/Host operations',
)
Widget hostOrganizerDetailPublicPreviewStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'HostOrganizerDetailScreen',
    contractId: 'screen.host.club.detail',
    children: [
      WidgetbookPageStateCard(
        label: 'host public preview',
        child: const WidgetbookHostDeviceFrame(
          child: _HostOrganizerDetailScope(),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'initial club loading fallback',
        child: const WidgetbookHostDeviceFrame(
          child: _HostOrganizerDetailScope(viewModel: AsyncLoading()),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'load error',
        child: WidgetbookHostDeviceFrame(
          child: _HostOrganizerDetailScope(
            viewModel: AsyncError<OrganizerDetailViewModel?>(
              StateError('Club detail failed'),
              StackTrace.empty,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'offline',
        child: WidgetbookHostDeviceFrame(
          child: _HostOrganizerDetailScope(
            viewModel: AsyncError<OrganizerDetailViewModel?>(
              obviousOfflineException(),
              StackTrace.empty,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'not found',
        child: const WidgetbookHostDeviceFrame(
          child: _HostOrganizerDetailScope(
            useInitialOrganizer: false,
            viewModel: AsyncData<OrganizerDetailViewModel?>(null),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'signed out preview',
        child: WidgetbookHostDeviceFrame(
          child: _HostOrganizerDetailScope(
            uid: null,
            viewModel: AsyncData<OrganizerDetailViewModel?>(
              _organizerDetailViewModel(isHost: false, uid: null),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'signed-in non-host preview',
        child: WidgetbookHostDeviceFrame(
          child: _HostOrganizerDetailScope(
            uid: 'design-host-non-team',
            viewModel: AsyncData<OrganizerDetailViewModel?>(
              _organizerDetailViewModel(
                isHost: false,
                uid: 'design-host-non-team',
              ),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'empty schedule',
        child: WidgetbookHostDeviceFrame(
          child: _HostOrganizerDetailScope(
            viewModel: AsyncData<OrganizerDetailViewModel?>(
              _organizerDetailViewModel(upcomingEvents: const <Event>[]),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'text scale 2.0',
        child: const WidgetbookHostDeviceFrame(
          child: WidgetbookMediaOverride(
            textScaler: TextScaler.linear(2),
            child: _HostOrganizerDetailScope(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'reduced motion',
        child: const WidgetbookHostDeviceFrame(
          child: WidgetbookMediaOverride(
            disableAnimations: true,
            child: _HostOrganizerDetailScope(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'dark theme',
        child: const WidgetbookHostDeviceFrame(
          child: _HostOrganizerDetailScope(themeMode: ThemeMode.dark),
        ),
      ),
    ],
  );
}

class _HostOrganizerDetailScope extends StatelessWidget {
  const _HostOrganizerDetailScope({
    this.uid = 'design-host-owner',
    this.viewModel,
    this.useInitialOrganizer = true,
    this.themeMode,
  });

  final String? uid;
  final AsyncValue<OrganizerDetailViewModel?>? viewModel;
  final bool useInitialOrganizer;
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
          watchOrganizerMembershipProvider(
            widgetbookOrganizer.id,
            effectiveUid,
          ).overrideWith((ref) => Stream<OrganizerMembership?>.value(null)),
          organizerDetailViewModelProvider(widgetbookOrganizer.id).overrideWith(
            (ref) =>
                viewModel ??
                AsyncData<OrganizerDetailViewModel?>(
                  _organizerDetailViewModel(uid: effectiveUid),
                ),
          ),
        ],
        child: WidgetbookThemedHostPreview(
          themeMode: themeMode ?? ThemeMode.light,
          child: OrganizerDetailScreen(
            clubId: widgetbookOrganizer.id,
            initialOrganizer: useInitialOrganizer ? widgetbookOrganizer : null,
          ),
        ),
      ),
    );
  }
}

OrganizerDetailViewModel _organizerDetailViewModel({
  bool isHost = true,
  String? uid = 'design-host-owner',
  List<Event>? upcomingEvents,
}) {
  return OrganizerDetailViewModel(
    organizer: widgetbookOrganizer,
    isHost: isHost,
    isMember: false,
    upcomingEvents:
        upcomingEvents ??
        HostOperationsFixtures.eventsByOrganizer[widgetbookOrganizer.id] ??
        const [],
    reviews: const [],
    userProfile: uid == null ? null : HostOperationsFixtures.owner,
    uid: uid,
    isAuthenticated: uid != null,
  );
}
