import 'dart:async';

import 'package:catch_dating_app/auth/presentation/auth_session_controller.dart';
import 'package:catch_dating_app/contexts/account/data/force_update_provider.dart';
import 'package:catch_dating_app/contexts/organizers/data/host_profile_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/host_profile.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/hosts/organizer/organizer_controller.dart';
import 'package:catch_dating_app/hosts/organizer/organizer_screen.dart';
import 'package:catch_dating_app/hosts/organizer/settings_body.dart';
import 'package:catch_dating_app/hosts/organizer/settings_state.dart';
import 'package:catch_dating_app/hosts/presentation/host_organizer_selection_controller.dart';
import 'package:catch_dating_app/hosts/presentation/host_profile_controller.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_organizer_switcher_sheet.dart';
import 'package:catch_dating_app/safety/presentation/settings_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/app_config.dart';
import 'package:catch_platform/device/external_links.dart';
import 'package:catch_platform/dialogs/confirm_danger_dialog.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// The host's own settings: guest-message notifications, the account, help,
/// signing out and the build. Every switch and row runs an existing command:
/// the profile preference, the host profile save, the organizer selection,
/// account deletion and sign-out.
class OrganizerSettingsScreen extends ConsumerStatefulWidget {
  const OrganizerSettingsScreen({super.key, this.initialOrganizerId});

  final String? initialOrganizerId;

  @override
  ConsumerState<OrganizerSettingsScreen> createState() =>
      _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<OrganizerSettingsScreen> {
  bool _opening = false;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final read = watchHostOrganizerScope(
      ref,
      organizerId: widget.initialOrganizerId,
    );
    final scope = read.scope;
    final busy =
        _opening ||
        ref.watch(AuthSessionController.signOutMutation).isPending ||
        ref.watch(SettingsController.requestAccountDeletionMutation).isPending;
    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [
        AuthSessionController.signOutMutation,
        SettingsController.requestAccountDeletionMutation,
      ],
      errorContext: AppErrorContext.auth,
    );
    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [
        SettingsController.savePreferenceMutation,
        HostProfileController.ensureProfileMutation,
        HostProfileController.saveProfileMutation,
      ],
      errorContext: AppErrorContext.profile,
    );
    final Widget body;
    String? kicker;
    if (scope == null) {
      body = HostOrganizerScopeFallback(
        gap: read.gap,
        error: read.error,
        onRetry: () => retryHostOrganizerScope(ref),
      );
    } else {
      final profile = ref.watch(watchUserProfileProvider).value;
      final hostProfile = ref.watch(watchHostProfileProvider(scope.uid)).value;
      final hostName = hostProfile?.displayName.trim();
      final firstName = profile?.firstName.trim();
      final name = hostName != null && hostName.isNotEmpty
          ? hostName
          : firstName != null && firstName.isNotEmpty
          ? firstName
          : null;
      kicker = name;
      final state = OrganizerSettingsState(
        name: name,
        phone: settingsMaskedPhone(profile?.phoneNumber),
        organizerNames: [for (final item in scope.organizers) item.name],
        messagesOn: profile?.prefsMessages,
        version: ref.watch(appPackageInfoProvider).value?.version,
        guidesAvailable: AppConfig.helpUrl != null,
        termsAvailable: AppConfig.termsUrl != null,
        privacyAvailable: AppConfig.privacyPolicyUrl != null,
        busy: busy,
      );
      body = OrganizerSettingsBody(
        state: state,
        onMessages: (value) => unawaited(_saveMessages(value)),
        onAction: (action) =>
            unawaited(_act(scope, hostProfile, state, action)),
      );
    }
    return CatchRoot(
      child: CatchScreen(
        key: const ValueKey<String>('host-organizer-settings-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          title: l10n.hostOrganizerSettingsTitle,
          kicker: kicker,
          back: CatchTopBarBack(
            label: l10n.hostOrganizerBack,
            onPressed: _close,
          ),
        ),
        body: body,
      ),
    );
  }

  void _close() => context.goNamed(
    Routes.hostOrganizerScreen.name,
    queryParameters: {'organizerId': ?widget.initialOrganizerId},
  );

  Future<void> _saveMessages(bool value) async {
    try {
      await SettingsController.savePreferenceMutation.run(
        ref,
        (tx) => tx
            .get(settingsControllerProvider.notifier)
            .savePreference(
              preference: SettingsPreference.messages,
              value: value,
            ),
      );
    } on Object {
      // The mutation listener shows the error; the profile listener keeps
      // the switch where it was.
    }
  }

  Future<void> _act(
    HostOrganizerScope scope,
    HostProfile? hostProfile,
    OrganizerSettingsState state,
    OrganizerSettingsAction action,
  ) async {
    switch (action) {
      case OrganizerSettingsAction.editName:
        await _editName(hostProfile, state.name);
      case OrganizerSettingsAction.switchOrganizer:
        final selected = scope.organizer;
        if (selected == null) return;
        final organizerId = await showHostOrganizerSwitcherSheet(
          context: context,
          organizers: scope.organizers,
          selectedOrganizerId: selected.id,
        );
        if (!mounted || organizerId == null) return;
        ref
            .read(hostOrganizerSelectionProvider(scope.uid).notifier)
            .select(organizerId);
        context.goNamed(
          Routes.hostOrganizerScreen.name,
          queryParameters: {'organizerId': organizerId},
        );
      case OrganizerSettingsAction.guides:
        await _open(AppConfig.helpUrl);
      case OrganizerSettingsAction.terms:
        await _open(AppConfig.termsUrl);
      case OrganizerSettingsAction.privacy:
        await _open(AppConfig.privacyPolicyUrl);
      case OrganizerSettingsAction.deleteAccount:
        await _deleteAccount();
      case OrganizerSettingsAction.signOut:
        await _signOut();
    }
  }

  Future<void> _editName(HostProfile? hostProfile, String? name) async {
    final draft = await showCatchBottomSheet<_HostProfileDraft>(
      context: context,
      builder: (_) => _HostProfileSheet(
        initial: _HostProfileDraft(
          name: hostProfile?.displayName ?? name ?? '',
          role: hostProfile?.roleTitle ?? '',
          bio: hostProfile?.bio ?? '',
        ),
      ),
    );
    if (draft == null || !mounted) return;
    final controller = hostProfileControllerProvider.notifier;
    try {
      if (hostProfile == null) {
        await HostProfileController.ensureProfileMutation.run(
          ref,
          (tx) => tx.get(controller).ensureProfile(displayName: draft.name),
        );
      }
      await HostProfileController.saveProfileMutation.run(
        ref,
        (tx) => tx
            .get(controller)
            .saveProfile(
              displayName: draft.name,
              roleTitle: draft.role.isEmpty ? null : draft.role,
              bio: draft.bio.isEmpty ? null : draft.bio,
            ),
      );
    } on Object {
      // The mutation listener shows the error.
    }
  }

  Future<void> _open(Uri? uri) async {
    if (uri == null || _opening) return;
    setState(() => _opening = true);
    var opened = false;
    try {
      opened = await ref.read(externalLinkControllerProvider).openExternal(uri);
    } on Object {
      // The notice below is the visible result of a failed launch.
    } finally {
      if (mounted) setState(() => _opening = false);
    }
    if (!opened && mounted) {
      showCatchNotice(
        context,
        context.l10n.safetySettingsScreenExternalLinkOpenFailed,
      );
    }
  }

  Future<void> _deleteAccount() async {
    final l10n = context.l10n;
    final confirmed = await showConfirmDangerDialog(
      context: context,
      title: l10n.safetySettingsScreenTitleDeleteAccount,
      message: l10n.hostAccountDeletionConfirmation,
      confirmLabel: l10n.sharedActionDelete,
    );
    if (confirmed != true || !mounted) return;
    try {
      await SettingsController.requestAccountDeletionMutation.run(
        ref,
        (tx) => tx
            .get(settingsControllerProvider.notifier)
            .requestAccountDeletion(),
      );
    } on Object {
      // The mutation listener shows the error.
      return;
    }
    if (mounted) context.go(Routes.startScreen.path);
  }

  Future<void> _signOut() async {
    try {
      await AuthSessionController.signOutMutation.run(
        ref,
        (tx) async => tx.get(authSessionControllerProvider.notifier).signOut(),
      );
    } on Object {
      // The mutation listener shows the error.
      return;
    }
    if (mounted) context.go(Routes.startScreen.path);
  }
}

/// The host profile fields the name sheet edits.
@immutable
class _HostProfileDraft {
  const _HostProfileDraft({
    required this.name,
    required this.role,
    required this.bio,
  });

  final String name;
  final String role;
  final String bio;
}

/// The name, role and bio guests see on the host's profile, with Save.
class _HostProfileSheet extends StatefulWidget {
  const _HostProfileSheet({required this.initial});

  final _HostProfileDraft initial;

  @override
  State<_HostProfileSheet> createState() => _HostProfileSheetState();
}

class _HostProfileSheetState extends State<_HostProfileSheet> {
  late _HostProfileDraft _draft = widget.initial;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final copy = catchFieldCopy(l10n);
    return CatchSheet(
      title: l10n.hostOrganizerProfileTitle,
      keyboardSafe: true,
      footer: CatchButton(
        key: const ValueKey<String>('settings-profile-save'),
        label: l10n.hostOrganizerProfileSave,
        fullWidth: true,
        onPressed: _draft.name.trim().isEmpty
            ? null
            : () => Navigator.of(context).pop(
                _HostProfileDraft(
                  name: _draft.name.trim(),
                  role: _draft.role.trim(),
                  bio: _draft.bio.trim(),
                ),
              ),
      ),
      child: CatchSection(
        dividers: CatchSectionPlacement.none,
        children: [
          CatchField.input(
            copy: copy,
            title: l10n.hostOrganizerProfileName,
            initialValue: _draft.name,
            onChanged: (value) => setState(
              () => _draft = _HostProfileDraft(
                name: value,
                role: _draft.role,
                bio: _draft.bio,
              ),
            ),
          ),
          CatchField.input(
            copy: copy,
            title: l10n.hostOrganizerProfileRole,
            initialValue: _draft.role,
            onChanged: (value) => _draft = _HostProfileDraft(
              name: _draft.name,
              role: value,
              bio: _draft.bio,
            ),
          ),
          CatchField.input(
            copy: copy,
            title: l10n.hostOrganizerProfileBio,
            initialValue: _draft.bio,
            minLines: 3,
            onChanged: (value) => _draft = _HostProfileDraft(
              name: _draft.name,
              role: _draft.role,
              bio: value,
            ),
          ),
        ],
      ),
    );
  }
}
