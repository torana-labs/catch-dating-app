import 'dart:async';

import 'package:catch_dating_app/auth/presentation/auth_session_controller.dart';
import 'package:catch_dating_app/core/analytics/app_analytics.dart';
import 'package:catch_dating_app/core/app_config.dart';
import 'package:catch_dating_app/core/external_links.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/core/widgets/confirm_danger_dialog.dart';
import 'package:catch_dating_app/force_update/data/force_update_provider.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/public_profile/data/public_profiles_lookup.dart';
import 'package:catch_dating_app/public_profile/domain/public_profile.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_dating_app/safety/data/safety_repository.dart';
import 'package:catch_dating_app/safety/presentation/host_analytics_consent_dialog.dart';
import 'package:catch_dating_app/safety/presentation/settings_account_state.dart';
import 'package:catch_dating_app/safety/presentation/settings_account_view_model.dart';
import 'package:catch_dating_app/safety/presentation/settings_controller.dart';
import 'package:catch_dating_app/safety/presentation/settings_keys.dart';
import 'package:catch_dating_app/user_profile/data/user_profile_repository.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

part 'blocked_account_tile.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  SettingsPreferenceValues _preferences =
      const SettingsPreferenceValues.defaults();
  String? _seededUid;
  _SettingsExternalLinkAction? _pendingExternalLink;

  bool get _operationPending =>
      _pendingExternalLink != null ||
      ref.read(SettingsController.savePreferenceMutation).isPending ||
      ref.read(SettingsController.saveHostAnalyticsMutation).isPending ||
      ref.read(SettingsController.requestAccountDeletionMutation).isPending ||
      ref.read(AuthSessionController.signOutMutation).isPending ||
      ref.read(SettingsController.unblockUserMutation).isPending;

  Future<void> _savePref({
    required SettingsPreference preference,
    required bool value,
  }) async {
    if (_operationPending) return;

    final previousPreferences = _preferences;
    setState(() {
      _preferences = _preferences.copyWithPreference(preference, value);
    });

    // Track error locally to avoid reading mutation state that could have
    // been overwritten by a concurrent call (matching _savePref is guarded
    // by the toggle disabled state, but capturing the result is safer).
    bool hadError = false;
    try {
      await SettingsController.savePreferenceMutation.run(
        ref,
        (tx) async => tx
            .get(settingsControllerProvider.notifier)
            .savePreference(preference: preference, value: value),
      );
    } catch (_) {
      hadError = true;
      // listenToCatchMutationErrors owns user-facing error display.
    }

    if (!mounted) return;
    if (hadError) {
      setState(() => _preferences = previousPreferences);
    }
  }

  Future<void> _confirmDeleteAccount() async {
    if (_operationPending) return;

    final confirmed = await showConfirmDangerDialog(
      context: context,
      title: context.l10n.safetySettingsScreenTitleDeleteAccount,
      message: context.l10n.safetySettingsScreenMessageThisRemovesYourPublic,
      confirmLabel: context.l10n.sharedActionDelete,
    );
    if (confirmed != true || !mounted || _operationPending) return;

    try {
      await SettingsController.requestAccountDeletionMutation.run(
        ref,
        (tx) async => tx
            .get(settingsControllerProvider.notifier)
            .requestAccountDeletion(),
      );
    } catch (_) {
      // listenToCatchMutationErrors owns user-facing error display.
    }
  }

  Future<void> _chooseHostAnalytics() async {
    if (_operationPending) return;
    final granted = await showHostAnalyticsConsentDialog(context);
    if (granted == null || !mounted || _operationPending) return;
    try {
      await SettingsController.saveHostAnalyticsMutation.run(
        ref,
        (tx) => tx
            .get(settingsControllerProvider.notifier)
            .saveHostAnalytics(granted),
      );
    } catch (_) {
      // The mutation listener owns the localized failure message.
    }
  }

  Future<void> _signOut() async {
    if (_operationPending) return;

    try {
      await AuthSessionController.signOutMutation.run(
        ref,
        (tx) async => tx.get(authSessionControllerProvider.notifier).signOut(),
      );
    } catch (_) {
      // listenToCatchMutationErrors owns user-facing error display.
    }
  }

  void _openExternal(_SettingsExternalLinkAction action, Uri uri) {
    unawaited(
      _launchExternalLink(
        action,
        () => ref.read(externalLinkControllerProvider).openExternal(uri),
      ),
    );
  }

  void _openHostApp() {
    unawaited(
      _launchExternalLink(
        _SettingsExternalLinkAction.hostApp,
        () => ref.read(externalLinkControllerProvider).openHostApp(),
      ),
    );
  }

  Future<void> _launchExternalLink(
    _SettingsExternalLinkAction action,
    Future<bool> Function() launch,
  ) async {
    if (_operationPending) return;

    setState(() => _pendingExternalLink = action);
    var opened = false;
    try {
      opened = await launch();
    } catch (_) {
      // ExternalLinkController retains the backend context; this route owns
      // the visible result for both thrown and false launcher outcomes.
    } finally {
      if (mounted) {
        setState(() => _pendingExternalLink = null);
      }
    }

    if (!mounted || opened) return;
    showCatchNotice(
      context,
      context.l10n.safetySettingsScreenExternalLinkOpenFailed,
    );
  }

  void _unblockUser(String targetUserId) {
    if (_operationPending) return;
    unawaited(
      SettingsController.unblockUserMutation.run(
        ref,
        (tx) async => tx
            .get(settingsControllerProvider.notifier)
            .unblockUser(targetUserId: targetUserId),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final packageInfoAsync = ref.watch(appPackageInfoProvider);
    final packageInfo = catchAsyncStateFromAsyncValue(packageInfoAsync).value;
    final version = packageInfo?.version ?? '—';
    final userProfileAsync = ref.watch(watchUserProfileProvider);
    final userProfile = catchAsyncStateFromAsyncValue(userProfileAsync).value;
    final blockedUsersAsync = ref.watch(watchBlockedUsersProvider);
    final blockedUsers = catchAsyncStateFromAsyncValue(blockedUsersAsync).value;
    final blockedProfilesAsync = blockedUsers == null || blockedUsers.isEmpty
        ? const AsyncData(<String, PublicProfile>{})
        : ref.watch(
            publicProfilesByIdsProvider(
              PublicProfilesQuery(blockedUsers.map((blocked) => blocked.uid)),
            ),
          );

    if (userProfile != null && userProfile.uid != _seededUid) {
      _seededUid = userProfile.uid;
      _preferences = SettingsPreferenceValues.fromProfile(userProfile);
    }

    final state = buildSettingsAccountState(
      profile: userProfileAsync,
      preferences: _preferences,
      blockedUsers: blockedUsersAsync,
      blockedProfiles: blockedProfilesAsync,
      mutations: SettingsMutationState(
        savingPreference: ref
            .watch(SettingsController.savePreferenceMutation)
            .isPending,
        deletingAccount: ref
            .watch(SettingsController.requestAccountDeletionMutation)
            .isPending,
        signingOut: ref.watch(AuthSessionController.signOutMutation).isPending,
        unblocking: ref.watch(SettingsController.unblockUserMutation).isPending,
      ),
    );
    final operationPending =
        state.mutations.operationPending ||
        _pendingExternalLink != null ||
        ref.watch(SettingsController.saveHostAnalyticsMutation).isPending;
    final preferenceChangesBlocked =
        operationPending ||
        state.profile.status != SettingsProfileStatus.loaded;

    ref.listen(SettingsController.unblockUserMutation, (previous, current) {
      if (previous?.isPending == true && current.isSuccess) {
        showCatchNotice(context, context.l10n.safetyAccountUnblockedMessage);
      }
    });

    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [
        AuthSessionController.signOutMutation,
        SettingsController.savePreferenceMutation,
        SettingsController.requestAccountDeletionMutation,
        SettingsController.unblockUserMutation,
        SettingsController.saveHostAnalyticsMutation,
      ],
    );
    return PopScope(
      canPop: !operationPending,
      child: CatchRouteScaffold(
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          title: context.l10n.safetySettingsScreenTitleSettings,
          navigation: const CatchTopBarNavigation(
            mode: CatchTopBarNavigationMode.back,
          ),
          leading: operationPending
              ? CatchIconAction.toolbar(
                  icon: CatchIcons.arrowBackIosNewRounded,
                  tooltip: MaterialLocalizations.of(context).backButtonTooltip,
                )
              : null,
          emphasis: scrolledUnder
              ? CatchTopBarEmphasis.divided
              : CatchTopBarEmphasis.plain,
        ),
        body: CatchRouteBody.standardConstrained(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              CatchSection.fieldRows(
                first: true,
                title: context.l10n.safetySettingsScreenTitleAccount,
                footer: AccountProfileSection(
                  profile: state.profile,
                  onRetry: operationPending
                      ? null
                      : () => ref.invalidate(watchUserProfileProvider),
                  onReviewForms: operationPending
                      ? null
                      : () => context.pushNamed(Routes.formProfilesScreen.name),
                ),
                children: [
                  CatchField.read(
                    copy: catchFieldCopy(context.l10n),
                    title: context.l10n.safetySettingsScreenTitlePhoneNumber,
                    valueText: state.profile.phoneNumber,
                    icon: CatchIcons.phoneOutlined,
                  ),
                  CatchField.read(
                    copy: catchFieldCopy(context.l10n),
                    title: context.l10n.safetySettingsScreenTitleEmail,
                    valueText: state.profile.email,
                    icon: CatchIcons.emailOutlined,
                  ),
                  CatchField.nav(
                    copy: catchFieldCopy(context.l10n),
                    key: SettingsKeys.reviewHistoryRow,
                    title: context.l10n.safetySettingsScreenTitleReviewHistory,
                    valueText:
                        context.l10n.safetySettingsScreenBodyEventsYouReviewed,
                    icon: CatchIcons.rateReviewOutlined,
                    onTap: operationPending
                        ? null
                        : () => context.pushNamed(
                            Routes.reviewsHistoryScreen.name,
                          ),
                  ),
                  CatchField.nav(
                    copy: catchFieldCopy(context.l10n),
                    key: SettingsKeys.paymentHistoryRow,
                    title: context.l10n.safetySettingsScreenTitlePaymentHistory,
                    valueText: context
                        .l10n
                        .safetySettingsScreenBodyBookingsAndReceipts,
                    icon: CatchIcons.receiptLongOutlined,
                    onTap: operationPending
                        ? null
                        : () => context.pushNamed(
                            Routes.paymentHistoryScreen.name,
                          ),
                  ),
                  CatchField.nav(
                    copy: catchFieldCopy(context.l10n),
                    key: SettingsKeys.hostAppRow,
                    title: context.l10n.safetySettingsScreenTitleCatchHost,
                    valueText: context
                        .l10n
                        .safetySettingsScreenBodyManageEventsAndClubs,
                    icon: CatchIcons.workOutlineRounded,
                    actions:
                        _pendingExternalLink ==
                            _SettingsExternalLinkAction.hostApp
                        ? const SizedBox.square(
                            dimension: CatchIcon.control,
                            child: CatchLoadingIndicator(),
                          )
                        : null,
                    onTap: operationPending ? null : _openHostApp,
                  ),
                  CatchField.nav(
                    copy: catchFieldCopy(context.l10n),
                    key: SettingsKeys.launchAccessRow,
                    title: context
                        .l10n
                        .launchAccessLaunchAccessApplicationScreenTextJoinTheNextCity,
                    valueText: context
                        .l10n
                        .launchAccessLaunchAccessApplicationScreenTextTellUsWhereYou,
                    icon: CatchIcons.locationCityOutlined,
                    onTap: operationPending
                        ? null
                        : () =>
                              context.pushNamed(Routes.launchAccessScreen.name),
                  ),
                ],
              ),
              CatchSection.fieldRows(
                title: context.l10n.safetySettingsScreenTitleNotifications,
                children: [
                  CatchField.nav(
                    copy: catchFieldCopy(context.l10n),
                    title: context.l10n.messagingPermissionsTitle,
                    body: context.l10n.messagingPermissionsSettingsHelp,
                    bodyMaxLines: 4,
                    onTap: operationPending
                        ? null
                        : () => context.pushNamed(
                            Routes.messagingPermissionsScreen.name,
                          ),
                  ),
                  CatchField.toggle(
                    copy: catchFieldCopy(context.l10n),
                    key: SettingsKeys.newCatchesSwitch,
                    contract: CatchContractConstraints
                        .updateUserProfilePatchPrefsNewCatches,
                    title:
                        context.l10n.safetySettingsScreenTitlePushNotifications,
                    icon: CatchIcons.favoriteOutline,
                    value: state.preferences.newCatches,
                    onChanged: preferenceChangesBlocked
                        ? null
                        : (value) => _savePref(
                            preference: SettingsPreference.newCatches,
                            value: value,
                          ),
                  ),
                  CatchField.toggle(
                    copy: catchFieldCopy(context.l10n),
                    key: SettingsKeys.crossPathsInvitationsSwitch,
                    contract: CatchContractConstraints
                        .updateUserProfilePatchPrefsCrossPathsInvitations,
                    title: context
                        .l10n
                        .safetySettingsScreenTitleCrossPathsInvitations,
                    icon: CatchIcons.personSearchOutlined,
                    value: state.preferences.crossPathsInvitations,
                    onChanged: preferenceChangesBlocked
                        ? null
                        : (value) => _savePref(
                            preference:
                                SettingsPreference.crossPathsInvitations,
                            value: value,
                          ),
                  ),
                  CatchField.toggle(
                    copy: catchFieldCopy(context.l10n),
                    key: SettingsKeys.messagesSwitch,
                    contract: CatchContractConstraints
                        .updateUserProfilePatchPrefsMessages,
                    title: context.l10n.safetySettingsScreenTitleMessages,
                    icon: CatchIcons.chatBubbleOutlineRounded,
                    value: state.preferences.messages,
                    onChanged: preferenceChangesBlocked
                        ? null
                        : (value) => _savePref(
                            preference: SettingsPreference.messages,
                            value: value,
                          ),
                  ),
                  CatchField.toggle(
                    copy: catchFieldCopy(context.l10n),
                    key: SettingsKeys.eventRemindersSwitch,
                    contract: CatchContractConstraints
                        .updateUserProfilePatchPrefsEventReminders,
                    title: context.l10n.safetySettingsScreenTitleEventReminders,
                    icon: CatchIcons.directionsRunOutlined,
                    value: state.preferences.eventReminders,
                    onChanged: preferenceChangesBlocked
                        ? null
                        : (value) => _savePref(
                            preference: SettingsPreference.eventReminders,
                            value: value,
                          ),
                  ),
                  CatchField.toggle(
                    copy: catchFieldCopy(context.l10n),
                    key: SettingsKeys.eventStatusUpdatesSwitch,
                    contract: CatchContractConstraints
                        .updateUserProfilePatchPrefsRunStatusUpdates,
                    title: context
                        .l10n
                        .safetySettingsScreenTitleEventChangesAndCancellations,
                    icon: CatchIcons.eventRepeatOutlined,
                    value: state.preferences.eventStatusUpdates,
                    onChanged: preferenceChangesBlocked
                        ? null
                        : (value) => _savePref(
                            preference: SettingsPreference.eventStatusUpdates,
                            value: value,
                          ),
                  ),
                  CatchField.toggle(
                    copy: catchFieldCopy(context.l10n),
                    key: SettingsKeys.clubUpdatesSwitch,
                    contract: CatchContractConstraints
                        .updateUserProfilePatchPrefsClubUpdates,
                    title:
                        context.l10n.safetySettingsScreenTitleClubAnnouncements,
                    icon: CatchIcons.notificationsActiveOutlined,
                    value: state.preferences.clubUpdates,
                    onChanged: preferenceChangesBlocked
                        ? null
                        : (value) => _savePref(
                            preference: SettingsPreference.clubUpdates,
                            value: value,
                          ),
                  ),
                  CatchField.toggle(
                    copy: catchFieldCopy(context.l10n),
                    key: SettingsKeys.weeklyDigestSwitch,
                    contract: CatchContractConstraints
                        .updateUserProfilePatchPrefsWeeklyDigest,
                    title: context.l10n.safetySettingsScreenTitleEmailUpdates,
                    icon: CatchIcons.markEmailReadOutlined,
                    value: state.preferences.weeklyDigest,
                    onChanged: preferenceChangesBlocked
                        ? null
                        : (value) => _savePref(
                            preference: SettingsPreference.weeklyDigest,
                            value: value,
                          ),
                  ),
                ],
              ),
              CatchSection.fieldRows(
                title: context.l10n.safetySettingsScreenTitlePrivacySafety,
                footer: BlockedAccountsSection(
                  state: state.blockedAccounts,
                  unblocking: state.mutations.unblocking,
                  enabled: !operationPending,
                  onRetry: operationPending
                      ? null
                      : () => ref.invalidate(watchBlockedUsersProvider),
                  onUnblock: _unblockUser,
                ),
                children: [
                  if (AppConfig.appRole.isHost)
                    CatchField.nav(
                      copy: catchFieldCopy(context.l10n),
                      key: const ValueKey('host-analytics-privacy'),
                      title: context.l10n.hostAnalyticsPrivacyTitle,
                      valueText:
                          ref
                              .read(appAnalyticsProvider)
                              .hostAnalyticsChoiceGranted
                          ? context.l10n.hostAnalyticsPrivacyOn
                          : context.l10n.hostAnalyticsPrivacyOff,
                      onTap: operationPending ? null : _chooseHostAnalytics,
                    ),
                  CatchField.toggle(
                    copy: catchFieldCopy(context.l10n),
                    key: SettingsKeys.showInCrossPathsSwitch,
                    contract: CatchContractConstraints
                        .updateUserProfilePatchPrefsShowInCrossPaths,
                    title:
                        context.l10n.safetySettingsScreenTitleShowInCrossPaths,
                    body: context.l10n.safetySettingsScreenBodyShowInCrossPaths,
                    icon: CatchIcons.favoriteBorderRounded,
                    value: state.preferences.showInCrossPaths,
                    onChanged: preferenceChangesBlocked
                        ? null
                        : (value) => _savePref(
                            preference: SettingsPreference.showInCrossPaths,
                            value: value,
                          ),
                  ),
                  CatchField.read(
                    copy: catchFieldCopy(context.l10n),
                    title: context.l10n.safetySettingsScreenTitleBlockedUsers,
                    valueText: state.blockedAccounts.count?.toString(),
                    icon: CatchIcons.shieldOutlined,
                  ),
                  CatchField.read(
                    copy: catchFieldCopy(context.l10n),
                    title: context.l10n.safetySettingsScreenTitleWhoCanSeeYou,
                    valueText:
                        context.l10n.safetySettingsScreenBodyRunnersOnMyEvents,
                    icon: CatchIcons.visibilityOutlined,
                  ),
                  CatchField.toggle(
                    copy: catchFieldCopy(context.l10n),
                    key: SettingsKeys.showOnMapSwitch,
                    contract: CatchContractConstraints
                        .updateUserProfilePatchPrefsShowOnMap,
                    title: context.l10n.safetySettingsScreenTitleShowMeOnMap,
                    icon: CatchIcons.mapOutlined,
                    value: state.preferences.showOnMap,
                    onChanged: preferenceChangesBlocked
                        ? null
                        : (value) => _savePref(
                            preference: SettingsPreference.showOnMap,
                            value: value,
                          ),
                  ),
                  if (AppConfig.privacyPolicyUrl case final uri?)
                    CatchField.nav(
                      copy: catchFieldCopy(context.l10n),
                      key: SettingsKeys.privacyPolicyRow,
                      title:
                          context.l10n.safetySettingsScreenTitlePrivacyPolicy,
                      icon: CatchIcons.lockOutline,
                      actions:
                          _pendingExternalLink ==
                              _SettingsExternalLinkAction.privacyPolicy
                          ? const SizedBox.square(
                              dimension: CatchIcon.control,
                              child: CatchLoadingIndicator(),
                            )
                          : null,
                      onTap: operationPending
                          ? null
                          : () => _openExternal(
                              _SettingsExternalLinkAction.privacyPolicy,
                              uri,
                            ),
                    ),
                  CatchField.nav(
                    copy: catchFieldCopy(context.l10n),
                    key: SettingsKeys.deleteAccountRow,
                    title: context
                        .l10n
                        .safetySettingsScreenTitleDeleteAccount658588,
                    icon: CatchIcons.deleteOutline,
                    tone: CatchFieldTone.danger,
                    actions: state.mutations.deletingAccount
                        ? const SizedBox.square(
                            dimension: CatchIcon.control,
                            child: CatchLoadingIndicator(),
                          )
                        : null,
                    onTap: operationPending ? null : _confirmDeleteAccount,
                  ),
                ],
              ),
              CatchSection.fieldRows(
                title: context.l10n.safetySettingsScreenTitleAbout,
                children: [
                  if (AppConfig.helpUrl case final uri?)
                    CatchField.nav(
                      copy: catchFieldCopy(context.l10n),
                      key: SettingsKeys.helpSupportRow,
                      title: context.l10n.safetySettingsScreenTitleHelpSupport,
                      valueText: context.l10n.safetySettingsScreenBodyContactUs,
                      icon: CatchIcons.helpOutline,
                      actions:
                          _pendingExternalLink ==
                              _SettingsExternalLinkAction.helpSupport
                          ? const SizedBox.square(
                              dimension: CatchIcon.control,
                              child: CatchLoadingIndicator(),
                            )
                          : null,
                      onTap: operationPending
                          ? null
                          : () => _openExternal(
                              _SettingsExternalLinkAction.helpSupport,
                              uri,
                            ),
                    ),
                  if (AppConfig.termsUrl case final uri?)
                    CatchField.nav(
                      copy: catchFieldCopy(context.l10n),
                      key: SettingsKeys.termsRow,
                      title: context.l10n.safetySettingsScreenTitleTerms,
                      valueText: context.l10n.safetySettingsScreenBodyLegal,
                      icon: CatchIcons.descriptionOutlined,
                      actions:
                          _pendingExternalLink ==
                              _SettingsExternalLinkAction.terms
                          ? const SizedBox.square(
                              dimension: CatchIcon.control,
                              child: CatchLoadingIndicator(),
                            )
                          : null,
                      onTap: operationPending
                          ? null
                          : () => _openExternal(
                              _SettingsExternalLinkAction.terms,
                              uri,
                            ),
                    ),
                  CatchField.read(
                    copy: catchFieldCopy(context.l10n),
                    title: context.l10n.safetySettingsScreenTitleVersion,
                    valueText: version,
                    icon: CatchIcons.infoOutline,
                  ),
                ],
              ),
              CatchSection.fieldRows(
                children: [
                  CatchField.nav(
                    copy: catchFieldCopy(context.l10n),
                    key: SettingsKeys.signOutRow,
                    title: context.l10n.safetySettingsScreenTitleLogOut,
                    icon: CatchIcons.logoutRounded,
                    tone: CatchFieldTone.danger,
                    actions: state.mutations.signingOut
                        ? const SizedBox.square(
                            dimension: CatchIcon.control,
                            child: CatchLoadingIndicator(),
                          )
                        : null,
                    onTap: operationPending ? null : _signOut,
                  ),
                ],
              ),
              gapH20,
              Center(
                child: CatchText(
                  context.l10n.safetySettingsScreenTextVersionMade(
                    version: version,
                  ),
                  variant: CatchTextVariant.statusLabel,
                  color: t.ink3,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

enum _SettingsExternalLinkAction { hostApp, privacyPolicy, helpSupport, terms }

class AccountProfileSection extends StatelessWidget {
  const AccountProfileSection({
    super.key,
    required this.profile,
    required this.onRetry,
    required this.onReviewForms,
  });

  final SettingsProfileState profile;
  final VoidCallback? onRetry;
  final VoidCallback? onReviewForms;

  @override
  Widget build(BuildContext context) {
    if (profile.isError) {
      return Padding(
        padding: CatchInsets.content,
        child: CatchLocalizedErrorState(
          profile.error!,
          mode: CatchErrorStateMode.compact,
          onRetry: onRetry,
        ),
      );
    }

    if (profile.isMissing) {
      return Padding(
        padding: CatchInsets.content,
        child: CatchFieldLanes.single(
          child: CatchField.nav(
            copy: catchFieldCopy(context.l10n),
            title: context.l10n.safetySettingsScreenTitleAccountUnavailable,
            body: context.l10n.safetySettingsScreenMessageSignOutAndSign,
            bodyMaxLines: 8,
            onTap: onReviewForms,
          ),
        ),
      );
    }

    return const SizedBox.shrink();
  }
}

class BlockedAccountsSkeleton extends StatelessWidget {
  const BlockedAccountsSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: CatchInsets.content,
      child: Column(
        children: [
          for (var index = 0; index < 3; index++) ...[
            Row(
              children: [
                CatchSkeleton.circle(size: CatchIcon.avatarLg),
                gapW12,
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      CatchSkeleton.text(
                        width: index == 1
                            ? CatchLayout.skeletonTextTitleWidth
                            : CatchLayout.skeletonTextShortWidth,
                      ),
                      gapH8,
                      CatchSkeleton.text(
                        width: index == 0
                            ? CatchLayout.skeletonTextBodyWidth
                            : index == 1
                            ? CatchLayout.skeletonTextCompactWidth
                            : CatchLayout.skeletonTextShortWidth,
                      ),
                    ],
                  ),
                ),
                gapW12,
                CatchSkeleton.box(
                  width: CatchLayout.skeletonTextShortWidth,
                  height: CatchSpacing.s8,
                  radius: CatchRadius.pill,
                ),
              ],
            ),
            if (index < 2) ...[gapH12, const CatchDivider(), gapH12],
          ],
        ],
      ),
    );
  }
}
