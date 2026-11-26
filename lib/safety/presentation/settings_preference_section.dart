part of 'settings_screen.dart';

typedef SettingsSavePreference =
    Future<void> Function({
      required SettingsPreference preference,
      required bool value,
    });

/// The notification switches. Writes go through the screen's save.
class SettingsNotificationsSection extends StatelessWidget {
  const SettingsNotificationsSection({
    super.key,
    required this.state,
    required this.operationPending,
    required this.preferenceChangesBlocked,
    required this.onSave,
  });

  final SettingsAccountState state;
  final bool operationPending;
  final bool preferenceChangesBlocked;
  final SettingsSavePreference onSave;

  @override
  Widget build(BuildContext context) {
    return CatchSection.fieldRows(
      title: context.l10n.safetySettingsScreenTitleNotifications,
      children: [
        CatchField.nav(
          copy: catchFieldCopy(context.l10n),
          title: context.l10n.messagingPermissionsTitle,
          body: context.l10n.messagingPermissionsSettingsHelp,
          bodyMaxLines: 4,
          onTap: operationPending
              ? null
              : () => context.pushNamed(Routes.messagingPermissionsScreen.name),
        ),
        CatchField.toggle(
          copy: catchFieldCopy(context.l10n),
          key: SettingsKeys.newCatchesSwitch,
          contract:
              CatchContractConstraints.updateUserProfilePatchPrefsNewCatches,
          title: context.l10n.safetySettingsScreenTitlePushNotifications,
          icon: CatchIcons.like,
          value: state.preferences.newCatches,
          onChanged: preferenceChangesBlocked
              ? null
              : (value) => onSave(
                  preference: SettingsPreference.newCatches,
                  value: value,
                ),
        ),
        CatchField.toggle(
          copy: catchFieldCopy(context.l10n),
          key: SettingsKeys.crossPathsInvitationsSwitch,
          contract: CatchContractConstraints
              .updateUserProfilePatchPrefsCrossPathsInvitations,
          title: context.l10n.safetySettingsScreenTitleCrossPathsInvitations,
          icon: CatchIcons.findPerson,
          value: state.preferences.crossPathsInvitations,
          onChanged: preferenceChangesBlocked
              ? null
              : (value) => onSave(
                  preference: SettingsPreference.crossPathsInvitations,
                  value: value,
                ),
        ),
        CatchField.toggle(
          copy: catchFieldCopy(context.l10n),
          key: SettingsKeys.messagesSwitch,
          contract:
              CatchContractConstraints.updateUserProfilePatchPrefsMessages,
          title: context.l10n.safetySettingsScreenTitleMessages,
          icon: CatchIcons.chat,
          value: state.preferences.messages,
          onChanged: preferenceChangesBlocked
              ? null
              : (value) => onSave(
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
          icon: CatchIcons.activity,
          value: state.preferences.eventReminders,
          onChanged: preferenceChangesBlocked
              ? null
              : (value) => onSave(
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
          icon: CatchIcons.recurring,
          value: state.preferences.eventStatusUpdates,
          onChanged: preferenceChangesBlocked
              ? null
              : (value) => onSave(
                  preference: SettingsPreference.eventStatusUpdates,
                  value: value,
                ),
        ),
        CatchField.toggle(
          copy: catchFieldCopy(context.l10n),
          key: SettingsKeys.organizerUpdatesSwitch,
          contract: CatchContractConstraints
              .updateUserProfilePatchPrefsOrganizerUpdates,
          title: context.l10n.safetySettingsScreenTitleOrganizerAnnouncements,
          icon: CatchIcons.notificationsOn,
          value: state.preferences.organizerUpdates,
          onChanged: preferenceChangesBlocked
              ? null
              : (value) => onSave(
                  preference: SettingsPreference.organizerUpdates,
                  value: value,
                ),
        ),
        CatchField.toggle(
          copy: catchFieldCopy(context.l10n),
          key: SettingsKeys.weeklyDigestSwitch,
          contract:
              CatchContractConstraints.updateUserProfilePatchPrefsWeeklyDigest,
          title: context.l10n.safetySettingsScreenTitleEmailUpdates,
          icon: CatchIcons.emailRead,
          value: state.preferences.weeklyDigest,
          onChanged: preferenceChangesBlocked
              ? null
              : (value) => onSave(
                  preference: SettingsPreference.weeklyDigest,
                  value: value,
                ),
        ),
      ],
    );
  }
}

/// Which profile answers reach other guests (#2493, FIX-8). Organisers
/// never see these answers, so the switches speak only of guests.
class SettingsProfileAnswersSection extends StatelessWidget {
  const SettingsProfileAnswersSection({
    super.key,
    required this.state,
    required this.preferenceChangesBlocked,
    required this.onSave,
  });

  final SettingsAccountState state;
  final bool preferenceChangesBlocked;
  final SettingsSavePreference onSave;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final answers =
        <(Key, CatchContractFieldConstraints, String, SettingsPreference)>[
          (
            SettingsKeys.showReligionSwitch,
            CatchContractConstraints.updateUserProfilePatchPrefsHideReligion,
            l10n.safetySettingsScreenTitleProfileAnswerReligion,
            SettingsPreference.showReligion,
          ),
          (
            SettingsKeys.showRelationshipGoalSwitch,
            CatchContractConstraints
                .updateUserProfilePatchPrefsHideRelationshipGoal,
            l10n.safetySettingsScreenTitleProfileAnswerRelationshipGoal,
            SettingsPreference.showRelationshipGoal,
          ),
          (
            SettingsKeys.showDrinkingSwitch,
            CatchContractConstraints.updateUserProfilePatchPrefsHideDrinking,
            l10n.safetySettingsScreenTitleProfileAnswerDrinking,
            SettingsPreference.showDrinking,
          ),
          (
            SettingsKeys.showSmokingSwitch,
            CatchContractConstraints.updateUserProfilePatchPrefsHideSmoking,
            l10n.safetySettingsScreenTitleProfileAnswerSmoking,
            SettingsPreference.showSmoking,
          ),
          (
            SettingsKeys.showChildrenSwitch,
            CatchContractConstraints.updateUserProfilePatchPrefsHideChildren,
            l10n.safetySettingsScreenTitleProfileAnswerChildren,
            SettingsPreference.showChildren,
          ),
        ];

    return CatchSection.fieldRows(
      title: l10n.safetySettingsScreenTitleProfileAnswers,
      footer: CatchText(
        l10n.safetySettingsScreenBodyProfileAnswers,
        variant: CatchTextVariant.bodySmall,
        tone: CatchTextTone.secondary,
      ),
      children: [
        for (final (key, contract, title, preference) in answers)
          CatchField.toggle(
            copy: catchFieldCopy(l10n),
            key: key,
            contract: contract,
            title: title,
            value: state.preferences.valueFor(preference),
            onChanged: preferenceChangesBlocked
                ? null
                : (value) => onSave(preference: preference, value: value),
          ),
      ],
    );
  }
}
