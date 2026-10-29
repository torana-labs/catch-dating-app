import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/design_fixtures/profile_surface_fixtures.dart';
import 'package:catch_dating_app/user_profile/presentation/profile_screen.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import 'preview.dart';
import 'scope.dart';

@widgetbook.UseCase(
  name: 'Self route states',
  type: ProfileScreen,
  path: '[P1 product surfaces]/Profiles',
)
Widget profileScreenSelfRouteStates(BuildContext context) {
  return WidgetbookProfileProfileCatalog(
    title: 'ProfileScreen',
    contractId: 'screen.profile.self',
    children: [
      WidgetbookProfileStateCard(
        label: 'profile loading',
        child: WidgetbookProfileDeviceFrame(
          child: WidgetbookProfileSelfProfileRouteScope(
            profileStream: ProfileSurfaceFixtures.loadingStream<UserProfile?>(),
          ),
        ),
      ),
      WidgetbookProfileStateCard(
        label: 'profile error',
        child: WidgetbookProfileDeviceFrame(
          child: WidgetbookProfileSelfProfileRouteScope(
            profileStream: ProfileSurfaceFixtures.errorStream<UserProfile?>(
              'Profile failed',
            ),
          ),
        ),
      ),
      WidgetbookProfileStateCard(
        label: 'offline load error',
        child: WidgetbookProfileDeviceFrame(
          child: WidgetbookProfileSelfProfileRouteScope(
            profileStream: Stream<UserProfile?>.error(
              ProfileSurfaceFixtures.offlineException(action: 'load profile'),
              StackTrace.empty,
            ),
          ),
        ),
      ),
      WidgetbookProfileStateCard(
        label: 'profile unavailable',
        child: WidgetbookProfileDeviceFrame(
          child: WidgetbookProfileSelfProfileRouteScope(
            profileStream: Stream<UserProfile?>.value(null),
          ),
        ),
      ),
      WidgetbookProfileStateCard(
        label: 'edit tab default',
        child: const WidgetbookProfileDeviceFrame(
          child: WidgetbookProfileSelfProfileRouteScope(),
        ),
      ),
      WidgetbookProfileStateCard(
        label: 'upload pending in photo grid',
        child: const WidgetbookProfileDeviceFrame(
          child: WidgetbookProfileSelfProfileRouteScope(
            uploadLoadingIndices: {1},
          ),
        ),
      ),
      WidgetbookProfileStateCard(
        label: 'text scale 2.0',
        child: const WidgetbookProfileDeviceFrame(
          child: WidgetbookMediaOverride(
            textScaler: TextScaler.linear(2),
            child: WidgetbookProfileSelfProfileRouteScope(),
          ),
        ),
      ),
      WidgetbookProfileStateCard(
        label: 'reduced motion',
        child: const WidgetbookProfileDeviceFrame(
          child: WidgetbookMediaOverride(
            disableAnimations: true,
            child: WidgetbookProfileSelfProfileRouteScope(),
          ),
        ),
      ),
      WidgetbookProfileStateCard(
        label: 'dark theme',
        child: const WidgetbookProfileDeviceFrame(
          child: WidgetbookProfileSelfProfileRouteScope(
            themeMode: ThemeMode.dark,
          ),
        ),
      ),
    ],
  );
}
