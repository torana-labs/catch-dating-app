import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/design_fixtures/profile_surface_fixtures.dart';
import 'package:catch_dating_app/public_profile/presentation/public_profile_screen.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import 'fixtures.dart';
import 'preview.dart';
import 'scope.dart';

@widgetbook.UseCase(
  name: 'Route states',
  type: PublicProfileScreen,
  path: '[P1 product surfaces]/Profiles',
)
Widget publicProfileRouteStates(BuildContext context) {
  return WidgetbookProfileProfileCatalog(
    title: 'PublicProfileScreen',
    contractId: 'screen.profile.public',
    children: [
      WidgetbookProfileStateCard(
        label: 'cold loading',
        child: WidgetbookProfileDeviceFrame(
          child: WidgetbookProfilePublicProfileRouteScope(
            profileStream:
                ProfileSurfaceFixtures.loadingStream<PublicProfile?>(),
          ),
        ),
      ),
      WidgetbookProfileStateCard(
        label: 'initial profile fallback while loading',
        child: WidgetbookProfileDeviceFrame(
          child: WidgetbookProfilePublicProfileRouteScope(
            initialProfile: widgetbookProfileTargetProfile,
            profileStream:
                ProfileSurfaceFixtures.loadingStream<PublicProfile?>(),
          ),
        ),
      ),
      WidgetbookProfileStateCard(
        label: 'load error',
        child: WidgetbookProfileDeviceFrame(
          child: WidgetbookProfilePublicProfileRouteScope(
            profileStream: ProfileSurfaceFixtures.errorStream<PublicProfile?>(
              'Public profile failed',
            ),
          ),
        ),
      ),
      WidgetbookProfileStateCard(
        label: 'offline load error',
        child: WidgetbookProfileDeviceFrame(
          child: WidgetbookProfilePublicProfileRouteScope(
            profileStream: Stream<PublicProfile?>.error(
              ProfileSurfaceFixtures.offlineException(
                action: 'load public profile',
              ),
              StackTrace.empty,
            ),
          ),
        ),
      ),
      WidgetbookProfileStateCard(
        label: 'profile unavailable',
        child: WidgetbookProfileDeviceFrame(
          child: WidgetbookProfilePublicProfileRouteScope(
            profileStream: Stream<PublicProfile?>.value(null),
          ),
        ),
      ),
      WidgetbookProfileStateCard(
        label: 'loaded with viewer context',
        child: const WidgetbookProfileDeviceFrame(
          child: WidgetbookProfilePublicProfileRouteScope(),
        ),
      ),
      WidgetbookProfileStateCard(
        label: 'own profile hides viewer context',
        child: WidgetbookProfileDeviceFrame(
          child: WidgetbookProfilePublicProfileRouteScope(
            uid: widgetbookProfileOwnProfile.uid,
            profile: widgetbookProfileOwnProfile,
          ),
        ),
      ),
      WidgetbookProfileStateCard(
        label: 'mutation pending overlay',
        child: const WidgetbookProfileDeviceFrame(
          child: WidgetbookProfilePublicProfileRouteScope(
            mutationMode:
                WidgetbookProfilePublicProfileMutationMode.blockPending,
          ),
        ),
      ),
      WidgetbookProfileStateCard(
        label: 'text scale 2.0',
        child: const WidgetbookProfileDeviceFrame(
          child: WidgetbookMediaOverride(
            textScaler: TextScaler.linear(2),
            child: WidgetbookProfilePublicProfileRouteScope(),
          ),
        ),
      ),
      WidgetbookProfileStateCard(
        label: 'reduced motion',
        child: const WidgetbookProfileDeviceFrame(
          child: WidgetbookMediaOverride(
            disableAnimations: true,
            child: WidgetbookProfilePublicProfileRouteScope(),
          ),
        ),
      ),
      WidgetbookProfileStateCard(
        label: 'dark theme',
        child: const WidgetbookProfileDeviceFrame(
          child: WidgetbookProfilePublicProfileRouteScope(
            themeMode: ThemeMode.dark,
          ),
        ),
      ),
    ],
  );
}
