import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/insights/data/user_analytics_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/public_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/photo_upload_state.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/contexts/safety/data/safety_repository.dart';
import 'package:catch_dating_app/design_fixtures/profile_surface_fixtures.dart';
import 'package:catch_dating_app/image_uploads/shared/photo_upload_controller.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_dating_app/public_profile/presentation/public_profile_controller.dart';
import 'package:catch_dating_app/public_profile/presentation/public_profile_screen.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_dating_app/user_profile/presentation/profile_screen.dart';
import 'package:catch_dating_app/user_profile/presentation/self_profile_screen_state.dart';
import 'package:catch_dating_app/user_profile/presentation/self_profile_screen_state_provider.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../support/widgetbook_harness.dart';
import 'fixtures.dart';

class WidgetbookProfileSelfProfileRouteScope extends StatelessWidget {
  const WidgetbookProfileSelfProfileRouteScope({
    super.key,
    this.profileStream,
    this.uploadLoadingIndices = const {},
    this.themeMode = ThemeMode.light,
  });

  final Stream<UserProfile?>? profileStream;
  final Set<int> uploadLoadingIndices;
  final ThemeMode themeMode;

  @override
  Widget build(BuildContext context) {
    return WidgetbookFixtureScope(
      overrides: [
        uidProvider.overrideWithValue(
          AsyncData<String?>(widgetbookProfileViewer.uid),
        ),
        watchUserProfileProvider.overrideWith(
          (ref) =>
              profileStream ??
              Stream<UserProfile?>.value(widgetbookProfileViewer),
        ),
        userProfileRepositoryProvider.overrideWithValue(
          ProfileFixtureUserProfileRepository(profile: widgetbookProfileViewer),
        ),
        photoUploadControllerProvider.overrideWithValue(
          PhotoUploadState.fromLegacy(loadingIndices: uploadLoadingIndices),
        ),
        userAnalyticsRepositoryProvider.overrideWithValue(
          ProfileFixtureUserAnalyticsRepository(
            report: ProfileSurfaceFixtures.analyticsReport,
          ),
        ),
      ],
      child: _ProfileRouter(themeMode: themeMode),
    );
  }
}

class WidgetbookProfileProfileScreenTabBodyPreview extends StatelessWidget {
  const WidgetbookProfileProfileScreenTabBodyPreview({
    super.key,
    required this.state,
  });

  final SelfProfileScreenState state;

  @override
  Widget build(BuildContext context) {
    return WidgetbookFixtureScope(
      overrides: [selfProfileScreenStateProvider.overrideWithValue(state)],
      child: const ProfileScreen(),
    );
  }
}

class WidgetbookProfilePublicProfileRouteScope extends StatelessWidget {
  const WidgetbookProfilePublicProfileRouteScope({
    super.key,
    this.uid = ProfileSurfaceFixtures.targetUid,
    this.profile,
    this.initialProfile,
    this.profileStream,
    this.mutationMode,
    this.themeMode = ThemeMode.light,
  });

  final String uid;
  final PublicProfile? profile;
  final PublicProfile? initialProfile;
  final Stream<PublicProfile?>? profileStream;
  final WidgetbookProfilePublicProfileMutationMode? mutationMode;
  final ThemeMode themeMode;

  @override
  Widget build(BuildContext context) {
    final effectiveProfile = profile ?? widgetbookProfileTargetProfile;
    Widget child = PublicProfileScreen(
      uid: uid,
      initialProfile: initialProfile,
    );
    final mutationMode = this.mutationMode;
    if (mutationMode != null) {
      child = _PublicProfileMutationSeeder(mode: mutationMode, child: child);
    }

    return WidgetbookFixtureScope(
      overrides: [
        uidProvider.overrideWithValue(
          AsyncData<String?>(widgetbookProfileViewer.uid),
        ),
        watchUserProfileProvider.overrideWith(
          (ref) => Stream<UserProfile?>.value(widgetbookProfileViewer),
        ),
        watchPublicProfileProvider(uid).overrideWith(
          (ref) =>
              profileStream ?? Stream<PublicProfile?>.value(effectiveProfile),
        ),
        publicProfileRepositoryProvider.overrideWithValue(
          ProfileFixturePublicProfileRepository({
            uid: effectiveProfile,
            widgetbookProfileTargetProfile.uid: widgetbookProfileTargetProfile,
            widgetbookProfileOwnProfile.uid: widgetbookProfileOwnProfile,
          }),
        ),
        safetyRepositoryProvider.overrideWithValue(
          const ProfileFixtureSafetyRepository(),
        ),
      ],
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light,
        darkTheme: AppTheme.dark,
        themeMode: themeMode,
        home: child,
      ),
    );
  }
}

class _ProfileRouter extends StatelessWidget {
  const _ProfileRouter({required this.themeMode});

  final ThemeMode themeMode;

  @override
  Widget build(BuildContext context) {
    final router = GoRouter(
      initialLocation: Routes.profileScreen.path,
      routes: [
        GoRoute(
          path: Routes.profileScreen.path,
          name: Routes.profileScreen.name,
          builder: (_, _) => const ProfileScreen(),
        ),
        GoRoute(
          path: Routes.settingsScreen.path,
          name: Routes.settingsScreen.name,
          builder: (_, _) => const _SettingsPlaceholder(),
        ),
      ],
    );

    return MaterialApp.router(
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: themeMode,
      routerConfig: router,
    );
  }
}

class WidgetbookProfileProfileHeaderRouterFrame extends StatelessWidget {
  const WidgetbookProfileProfileHeaderRouterFrame({
    super.key,
    required this.child,
  });

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final router = GoRouter(
      routes: [
        GoRoute(path: '/', builder: (_, _) => child),
        GoRoute(
          path: Routes.settingsScreen.path,
          name: Routes.settingsScreen.name,
          builder: (_, _) => const _SettingsPlaceholder(),
        ),
      ],
    );

    return MaterialApp.router(
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      routerConfig: router,
    );
  }
}

class _PublicProfileMutationSeeder extends ConsumerStatefulWidget {
  const _PublicProfileMutationSeeder({required this.mode, required this.child});

  final WidgetbookProfilePublicProfileMutationMode mode;
  final Widget child;

  @override
  ConsumerState<_PublicProfileMutationSeeder> createState() =>
      _PublicProfileMutationSeederState();
}

class _PublicProfileMutationSeederState
    extends ConsumerState<_PublicProfileMutationSeeder> {
  Completer<void>? _pendingCompleter;
  bool _started = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _started) return;
      _started = true;
      _seed();
    });
  }

  @override
  void dispose() {
    final completer = _pendingCompleter;
    if (completer != null && !completer.isCompleted) {
      completer.complete();
    }
    super.dispose();
  }

  void _seed() {
    switch (widget.mode) {
      case WidgetbookProfilePublicProfileMutationMode.blockPending:
        _runPending(PublicProfileController.blockUserMutation);
        break;
      case WidgetbookProfilePublicProfileMutationMode.blockError:
        _runError(PublicProfileController.blockUserMutation, 'Block failed');
        break;
      case WidgetbookProfilePublicProfileMutationMode.reportError:
        _runError(PublicProfileController.reportUserMutation, 'Report failed');
        break;
    }
  }

  void _runPending(Mutation<void> mutation) {
    final completer = Completer<void>();
    _pendingCompleter = completer;
    unawaited(mutation.run(ref, (_) => completer.future));
  }

  void _runError(Mutation<void> mutation, String message) {
    unawaited(
      mutation
          .run(ref, (_) async => throw StateError(message))
          .catchError((_) {}),
    );
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

enum WidgetbookProfilePublicProfileMutationMode {
  blockPending,
  blockError,
  reportError,
}

class _SettingsPlaceholder extends StatelessWidget {
  const _SettingsPlaceholder();

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return Scaffold(
      body: Center(
        child: Text(
          'Settings',
          style: CatchTextStyles.titleL(context, color: t.ink),
        ),
      ),
    );
  }
}
