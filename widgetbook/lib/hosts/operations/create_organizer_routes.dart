import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizer_follow_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_follow.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/hosts/presentation/organizer_management/host_create_organizer_screen.dart';
import 'package:catch_platform/app_config.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import '../../support/widgetbook_harness.dart';
import 'fixtures.dart';
import 'preview.dart';
import 'role_theme.dart';

@widgetbook.UseCase(
  name: 'Route and wizard states',
  type: HostCreateOrganizerScreen,
  path: '[P1 product surfaces]/Host operations',
)
Widget hostCreateOrganizerRouteAndWizardStates(BuildContext context) {
  return const WidgetbookPageCatalogFrame(
    title: 'HostCreateOrganizerScreen',
    contractId: 'screen.host.club.create',
    children: [
      WidgetbookPageStateCard(
        label: 'auth required',
        child: WidgetbookHostDeviceFrame(
          child: _HostCreateOrganizerScope(
            uid: null,
            child: HostCreateOrganizerScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'route entry',
        child: WidgetbookHostDeviceFrame(
          child: _HostCreateOrganizerScope(child: HostCreateOrganizerScreen()),
        ),
      ),
    ],
  );
}

class _HostCreateOrganizerScope extends StatelessWidget {
  const _HostCreateOrganizerScope({
    required this.child,
    this.uid = 'design-host-owner',
  });

  final Widget child;
  final String? uid;

  @override
  Widget build(BuildContext context) {
    final effectiveUid = uid ?? widgetbookHostUid;
    final overrides = [
      uidProvider.overrideWithValue(AsyncData<String?>(uid)),
      watchUserProfileProvider.overrideWith(
        (ref) =>
            Stream.value(uid == null ? null : HostOperationsFixtures.owner),
      ),
      watchOrganizerFollowProvider(
        widgetbookOrganizer.id,
        effectiveUid,
      ).overrideWith((ref) => Stream<OrganizerFollow?>.value(null)),
    ];

    return WidgetbookAppRoleBoundary(
      role: AppRole.host,
      child: WidgetbookFixtureScope(
        overrides: overrides,
        child: WidgetbookThemedHostPreview(
          themeMode: ThemeMode.light,
          child: child,
        ),
      ),
    );
  }
}
