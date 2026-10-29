import 'dart:async';

import 'package:catch_dating_app/auth/presentation/auth_session_controller.dart';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/public_profiles_lookup.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/contexts/safety/data/safety_repository.dart';
import 'package:catch_dating_app/design_fixtures/utility_surface_fixtures.dart';
import 'package:catch_dating_app/platform/device/external_links.dart';
import 'package:catch_dating_app/safety/presentation/settings_account_state.dart';
import 'package:catch_dating_app/safety/presentation/settings_controller.dart';
import 'package:catch_dating_app/safety/presentation/settings_screen.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../support/page_preview.dart';
import '../support/widgetbook_harness.dart';
import 'fixtures.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Contained people with unblock actions',
  type: BlockedAccountsSection,
  path: '[P3 utility surfaces]/Settings',
)
Widget blockedAccountsSectionStates(BuildContext context) =>
    settingsScreenStates(context);

@widgetbook.UseCase(
  name: 'Account profile states',
  type: AccountProfileSection,
  path: '[P3 utility surfaces]/Settings',
)
Widget accountProfileSectionStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'AccountProfileSection',
    contractId: 'screen.settings.account_profile',
    children: [
      for (final (label, profile) in [
        (
          'loaded',
          const SettingsProfileState(
            status: SettingsProfileStatus.loaded,
            phoneNumber: '+91 98765 43210',
            email: 'host@example.com',
          ),
        ),
        (
          'loading',
          const SettingsProfileState(
            status: SettingsProfileStatus.loading,
            phoneNumber: '',
            email: '',
          ),
        ),
        (
          'missing profile',
          const SettingsProfileState(
            status: SettingsProfileStatus.missing,
            phoneNumber: '',
            email: '',
          ),
        ),
        (
          'load error',
          SettingsProfileState(
            status: SettingsProfileStatus.error,
            phoneNumber: '',
            email: '',
            error: Exception('offline'),
          ),
        ),
      ])
        WidgetbookPageStateCard(
          label: label,
          child: AccountProfileSection(
            profile: profile,
            onRetry: () {},
            onReviewForms: () {},
          ),
        ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Screen states',
  type: SettingsScreen,
  path: '[P3 utility surfaces]/Settings',
)
Widget settingsScreenStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'SettingsScreen',
    contractId: 'screen.settings.account',
    children: [
      WidgetbookPageStateCard(
        label: 'profile-backed account',
        child: WidgetbookUtilityDeviceFrame(
          child: _SettingsScope(
            blockedUsersStream: Stream.value(const <BlockedUser>[]),
            child: const SettingsScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'Cross Paths global opt-in',
        child: WidgetbookUtilityDeviceFrame(
          child: _SettingsScope(
            profileStream: Stream.value(
              widgetbookUtilityViewer.copyWith(prefsShowInCrossPaths: true),
            ),
            blockedUsersStream: Stream.value(const <BlockedUser>[]),
            child: const SettingsScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'profile loading',
        child: WidgetbookUtilityDeviceFrame(
          child: _SettingsScope(
            profileStream: widgetbookUtilityLoadingStream<UserProfile?>(),
            blockedUsersStream: Stream.value(const <BlockedUser>[]),
            child: const SettingsScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'blocked accounts loading',
        child: WidgetbookUtilityDeviceFrame(
          child: _SettingsScope(
            blockedUsersStream:
                widgetbookUtilityLoadingStream<List<BlockedUser>>(),
            child: const SettingsScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'blocked accounts error',
        child: WidgetbookUtilityDeviceFrame(
          child: _SettingsScope(
            blockedUsersStream: widgetbookUtilityErrorStream(
              'Blocked users failed',
            ),
            child: const SettingsScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'blocked accounts list',
        child: WidgetbookUtilityDeviceFrame(
          child: _SettingsScope(
            blockedUsersStream: Stream.value(_blockedUsers),
            publicProfiles: UtilitySurfaceFixtures.blockedPublicProfiles,
            child: const SettingsScreen(),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Blocked account row',
  type: CatchPersonLayout,
  path: '[P3 utility surfaces]/Settings',
)
Widget blockedAccountTileState(BuildContext context) => WidgetbookContentFrame(
  child: CatchSection.containedRows(
    children: [
      CatchField.read(
        content: const CatchPersonLayout(
          name: 'Maya Shah',
          supportingText: 'Blocked from event chat',
        ),
        secondaryAction: CatchFieldSecondaryAction.button(
          label: 'Unblock',
          onActivate: () {},
        ),
      ),
    ],
  ),
);

Widget settingsDangerDialogStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'CatchDialog',
    contractId: 'screen.settings.account.destructive_dialog',
    children: [
      WidgetbookPageStateCard(
        label: 'delete account confirmation',
        child: const _DialogFrame(
          child: CatchDialog<bool>.confirmation(
            title: 'Delete account?',
            message:
                'This removes your public profile, signs you out, and keeps only the minimal records required for safety and payment history.',
            actions: [
              CatchDialogAction(label: 'Cancel', value: false),
              CatchDialogAction(
                label: 'Delete',
                value: true,
                isDestructive: true,
              ),
            ],
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'sign out confirmation pattern',
        child: const _DialogFrame(
          child: CatchDialog<bool>.confirmation(
            title: 'Log out?',
            message: 'You can sign back in with your phone number.',
            actions: [
              CatchDialogAction(label: 'Cancel', value: false),
              CatchDialogAction(label: 'Log out', value: true),
            ],
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Mutation states',
  type: SettingsScreen,
  path: '[P3 utility surfaces]/Settings',
)
Widget settingsMutationStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'SettingsScreen mutation lifecycle',
    contractId: 'screen.settings.account.mutations',
    children: [
      WidgetbookPageStateCard(
        label: 'preference save pending',
        child: WidgetbookUtilityDeviceFrame(
          child: _SettingsScope(
            blockedUsersStream: Stream.value(const <BlockedUser>[]),
            child: const _SettingsMutationSeeder(
              mode: _SettingsMutationMode.preferencePending,
              child: SettingsScreen(),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'preference save error',
        child: WidgetbookUtilityDeviceFrame(
          child: _SettingsScope(
            blockedUsersStream: Stream.value(const <BlockedUser>[]),
            child: const _SettingsMutationSeeder(
              mode: _SettingsMutationMode.preferenceError,
              child: SettingsScreen(),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'delete account pending',
        child: WidgetbookUtilityDeviceFrame(
          child: _SettingsScope(
            blockedUsersStream: Stream.value(const <BlockedUser>[]),
            child: const _SettingsMutationSeeder(
              mode: _SettingsMutationMode.deletePending,
              child: SettingsScreen(),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'delete account error',
        child: WidgetbookUtilityDeviceFrame(
          child: _SettingsScope(
            blockedUsersStream: Stream.value(const <BlockedUser>[]),
            child: const _SettingsMutationSeeder(
              mode: _SettingsMutationMode.deleteError,
              child: SettingsScreen(),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'sign out pending',
        child: WidgetbookUtilityDeviceFrame(
          child: _SettingsScope(
            blockedUsersStream: Stream.value(const <BlockedUser>[]),
            child: const _SettingsMutationSeeder(
              mode: _SettingsMutationMode.signOutPending,
              child: SettingsScreen(),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'unblock user error',
        child: WidgetbookUtilityDeviceFrame(
          child: _SettingsScope(
            blockedUsersStream: Stream.value(_blockedUsers),
            publicProfiles: UtilitySurfaceFixtures.blockedPublicProfiles,
            child: const _SettingsMutationSeeder(
              mode: _SettingsMutationMode.unblockError,
              child: SettingsScreen(),
            ),
          ),
        ),
      ),
    ],
  );
}

enum _SettingsMutationMode {
  preferencePending,
  preferenceError,
  deletePending,
  deleteError,
  signOutPending,
  unblockError,
}

class _SettingsMutationSeeder extends ConsumerStatefulWidget {
  const _SettingsMutationSeeder({required this.mode, required this.child});

  final _SettingsMutationMode mode;
  final Widget child;

  @override
  ConsumerState<_SettingsMutationSeeder> createState() =>
      _SettingsMutationSeederState();
}

class _SettingsMutationSeederState
    extends ConsumerState<_SettingsMutationSeeder> {
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
      case _SettingsMutationMode.preferencePending:
        _runPending(SettingsController.savePreferenceMutation);
        break;
      case _SettingsMutationMode.preferenceError:
        _runError(
          SettingsController.savePreferenceMutation,
          'Preference save failed',
        );
        break;
      case _SettingsMutationMode.deletePending:
        _runPending(SettingsController.requestAccountDeletionMutation);
        break;
      case _SettingsMutationMode.deleteError:
        _runError(
          SettingsController.requestAccountDeletionMutation,
          'Delete account failed',
        );
        break;
      case _SettingsMutationMode.signOutPending:
        _runPending(AuthSessionController.signOutMutation);
        break;
      case _SettingsMutationMode.unblockError:
        _runError(SettingsController.unblockUserMutation, 'Unblock failed');
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

class _SettingsScope extends StatelessWidget {
  const _SettingsScope({
    required this.child,
    this.profileStream,
    this.blockedUsersStream,
    this.publicProfiles = const {},
  });

  final Widget child;
  final Stream<UserProfile?>? profileStream;
  final Stream<List<BlockedUser>>? blockedUsersStream;
  final Map<String, PublicProfile> publicProfiles;

  @override
  Widget build(BuildContext context) {
    final query = PublicProfilesQuery(
      _blockedUsers.map((blocked) => blocked.uid),
    );
    return WidgetbookFixtureScope(
      overrides: [
        uidProvider.overrideWith(
          (ref) => Stream<String?>.value(widgetbookUtilityViewerUid),
        ),
        watchUserProfileProvider.overrideWith(
          (ref) =>
              profileStream ??
              Stream<UserProfile?>.value(widgetbookUtilityViewer),
        ),
        watchBlockedUsersProvider.overrideWith(
          (ref) => blockedUsersStream ?? Stream.value(const <BlockedUser>[]),
        ),
        publicProfilesByIdsProvider(
          query,
        ).overrideWith((ref) async => publicProfiles),
        externalUrlLauncherProvider.overrideWithValue(
          widgetbookUtilityNoopLauncher,
        ),
      ],
      child: child,
    );
  }
}

class _DialogFrame extends StatelessWidget {
  const _DialogFrame({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return ColoredBox(
      color: t.ink.withValues(alpha: CatchOpacity.confirmDialogScrim),
      child: SizedBox(
        height: widgetbookUtilityDialogFrameHeight,
        child: Center(child: child),
      ),
    );
  }
}

final _blockedUsers = UtilitySurfaceFixtures.blockedUsers;
