import 'package:catch_dating_app/hosts/organizer/settings_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// Settings in board order: Tell me when, Account, Help, Sign out and the
/// version line.
class OrganizerSettingsBody extends StatelessWidget {
  const OrganizerSettingsBody({
    super.key,
    required this.state,
    required this.onAction,
    required this.onMessages,
  });

  final OrganizerSettingsState state;
  final ValueChanged<OrganizerSettingsAction> onAction;
  final ValueChanged<bool> onMessages;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final messagesOn = state.messagesOn;
    final organizers = state.organizerNames;
    final version = state.version;
    final busy = state.busy;
    return CatchPageBody.screen(
      variant: CatchPageBodyVariant.fixed,
      gap: CatchPageBodyGap.tight,
      children: [
        if (messagesOn != null)
          CatchSection(
            title: l10n.hostOrganizerSettingsNotifyTitle,
            kicker: l10n.hostOrganizerSettingsNotifyKicker,
            children: [
              CatchIndexRow(
                title: l10n.hostOrganizerSettingsNotifyMessages,
                density: CatchIndexRowSize.regular,
                trailing: CatchToggleInput(
                  key: const ValueKey<String>('settings-notify-messages'),
                  value: messagesOn,
                  semanticLabel: l10n.hostOrganizerSettingsNotifyMessages,
                  contract: CatchContractConstraints
                      .updateUserProfilePatchPrefsMessages,
                  onChanged: busy ? null : onMessages,
                ),
                onTap: null,
              ),
            ],
          ),
        CatchSection(
          title: l10n.hostOrganizerSettingsAccountTitle,
          children: [
            CatchIndexRow(
              key: const ValueKey<String>('settings-row-name'),
              title: l10n.hostOrganizerSettingsName,
              value: state.name,
              density: CatchIndexRowSize.regular,
              chevron: true,
              onTap: busy
                  ? null
                  : () => onAction(OrganizerSettingsAction.editName),
            ),
            if (state.phone case final phone?)
              CatchIndexRow(
                title: l10n.hostOrganizerSettingsPhone,
                value: phone,
                density: CatchIndexRowSize.regular,
                onTap: null,
              ),
            CatchIndexRow(
              key: const ValueKey<String>('settings-row-organizers'),
              title: l10n.hostOrganizerSettingsOrganizers,
              subtitle: organizers.isEmpty ? null : organizers.join(', '),
              value: '${organizers.length}',
              density: CatchIndexRowSize.regular,
              chevron: organizers.length > 1,
              onTap: organizers.length > 1 && !busy
                  ? () => onAction(OrganizerSettingsAction.switchOrganizer)
                  : null,
            ),
            CatchIndexRow(
              key: const ValueKey<String>('settings-row-delete'),
              title: l10n.hostOrganizerSettingsDelete,
              icon: CatchIcons.delete,
              iconTone: CatchIndexRowTone.danger,
              density: CatchIndexRowSize.regular,
              onTap: busy
                  ? null
                  : () => onAction(OrganizerSettingsAction.deleteAccount),
            ),
          ],
        ),
        if (state.hasHelp)
          CatchSection(
            title: l10n.hostOrganizerSettingsHelpTitle,
            children: [
              if (state.guidesAvailable)
                CatchIndexRow(
                  title: l10n.hostOrganizerSettingsGuides,
                  density: CatchIndexRowSize.regular,
                  chevron: true,
                  onTap: busy
                      ? null
                      : () => onAction(OrganizerSettingsAction.guides),
                ),
              if (state.termsAvailable)
                CatchIndexRow(
                  title: l10n.hostOrganizerSettingsTerms,
                  density: CatchIndexRowSize.regular,
                  chevron: true,
                  onTap: busy
                      ? null
                      : () => onAction(OrganizerSettingsAction.terms),
                ),
              if (state.privacyAvailable)
                CatchIndexRow(
                  title: l10n.hostOrganizerSettingsPrivacy,
                  density: CatchIndexRowSize.regular,
                  chevron: true,
                  onTap: busy
                      ? null
                      : () => onAction(OrganizerSettingsAction.privacy),
                ),
            ],
          ),
        CatchButton(
          key: const ValueKey<String>('settings-sign-out'),
          label: l10n.hostOrganizerSettingsSignOut,
          variant: CatchButtonVariant.danger,
          fullWidth: true,
          onPressed: busy
              ? null
              : () => onAction(OrganizerSettingsAction.signOut),
        ),
        if (version != null)
          CatchText(
            l10n.hostOrganizerSettingsVersion(version: version),
            variant: CatchTextVariant.bodyMeta,
            tone: CatchTextTone.tertiary,
            align: TextAlign.center,
          ),
      ],
    );
  }
}
