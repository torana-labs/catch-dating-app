part of 'settings_screen.dart';

CatchPersonLayout blockedAccountLayout(
  BuildContext context,
  SettingsBlockedAccountRow row,
) => CatchPersonLayout(
  name: row.name,
  imageUrl: row.imageUrl,
  supportingText: row.metaLine,
);

class BlockedAccountsSection extends StatelessWidget {
  const BlockedAccountsSection({
    super.key,
    required this.state,
    required this.unblocking,
    this.enabled = true,
    required this.onRetry,
    required this.onUnblock,
  });

  final SettingsBlockedAccountsState state;
  final bool unblocking;
  final bool enabled;
  final VoidCallback? onRetry;
  final ValueChanged<String> onUnblock;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const CatchDivider(),
        switch (state.status) {
          SettingsBlockedAccountsStatus.loading =>
            const BlockedAccountsSkeleton(),
          SettingsBlockedAccountsStatus.error => Padding(
            padding: CatchInsets.content,
            child: CatchLocalizedErrorState(
              state.error!,
              mode: CatchErrorStateMode.compact,
              onRetry: onRetry,
            ),
          ),
          SettingsBlockedAccountsStatus.empty => Padding(
            padding: CatchInsets.content,
            child: CatchEmptyState(
              icon: CatchIcons.verified,
              title: context.l10n.safetySettingsScreenTitleNoBlockedAccounts,
              message:
                  context.l10n.safetySettingsScreenMessagePeopleYouBlockWill,
              iconSize: CatchIconSize.tile,
              titleStyle: CatchTextStyles.sectionTitle(context),
              messageStyle: CatchTextStyles.supporting(context, color: t.ink2),
            ),
          ),
          SettingsBlockedAccountsStatus.content => CatchSection.containedRows(
            children: [
              for (var i = 0; i < state.rows.length; i++)
                CatchField.read(
                  content: blockedAccountLayout(context, state.rows[i]),
                  secondaryAction: CatchFieldSecondaryAction.button(
                    key: SettingsKeys.unblockButton(state.rows[i].uid),
                    label: context.l10n.safetySettingsScreenLabelUnblock,
                    loading: unblocking,
                    onActivate: enabled && !unblocking
                        ? () => onUnblock(state.rows[i].uid)
                        : null,
                  ),
                ),
            ],
          ),
        },
      ],
    );
  }
}
