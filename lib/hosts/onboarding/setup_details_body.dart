import 'package:catch_dating_app/hosts/onboarding/setup_state.dart';
import 'package:catch_dating_app/hosts/onboarding/widgets/page_link_tile.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

/// Setup step two: the logo, a line about the nights, what the page runs and
/// where its link will live.
class HostSetupDetailsBody extends StatelessWidget {
  const HostSetupDetailsBody({
    super.key,
    required this.state,
    required this.onPickLogo,
    required this.onDescriptionChanged,
    required this.onToggleFormat,
    this.createError,
  });

  final HostSetupState state;

  /// Null while the page is being created.
  final VoidCallback? onPickLogo;
  final ValueChanged<String> onDescriptionChanged;
  final ValueChanged<HostSetupFormat> onToggleFormat;

  /// Why creating the page failed.
  final String? createError;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final formats = state.formats;
    return CatchPageBody.screen(
      gap: CatchPageBodyGap.tight,
      children: [
        CatchStack(
          direction: CatchStackDirection.row,
          gap: CatchStackGap.g16,
          align: CatchStackAlign.center,
          children: [
            CatchAvatar.system(
              size: CatchAvatarSize.xl,
              name: state.name,
              color: _avatarColor(formats),
              variant: CatchAvatarVariant.square,
            ),
            Expanded(
              child: CatchStack(
                gap: CatchStackGap.g4,
                align: CatchStackAlign.start,
                children: [
                  CatchText(
                    state.hasLogo
                        ? l10n.hostOnboardingDetailsLogoAdded
                        : l10n.hostOnboardingDetailsLogoNote,
                    variant: CatchTextVariant.bodySmall,
                    tone: CatchTextTone.secondary,
                  ),
                  CatchButton(
                    key: const ValueKey<String>('host-setup-logo'),
                    label: state.hasLogo
                        ? l10n.hostOnboardingDetailsChangeLogo
                        : l10n.hostOnboardingDetailsAddLogo,
                    onPressed: onPickLogo,
                    variant: CatchButtonVariant.quiet,
                    size: CatchButtonSize.sm,
                  ),
                ],
              ),
            ),
          ],
        ),
        CatchFieldLanes.single(
          child: CatchField.input(
            key: const ValueKey<String>('host-setup-description'),
            copy: catchFieldCopy(l10n),
            title: l10n.hostOnboardingDetailsAbout,
            contract: CatchContractConstraints
                .createOrganizerCallablePayloadDescription,
            initialValue: state.description,
            placeholder: l10n.hostOnboardingDetailsAboutPlaceholder,
            minLines: 3,
            maxLines: 5,
            textCapitalization: TextCapitalization.sentences,
            textInputAction: TextInputAction.newline,
            onChanged: onDescriptionChanged,
          ),
        ),
        CatchStack(
          children: [
            CatchText(
              l10n.hostOnboardingDetailsFormats,
              variant: CatchTextVariant.labelAction,
            ),
            CatchStack(
              direction: CatchStackDirection.row,
              gap: CatchStackGap.g8,
              wrap: true,
              children: [
                for (final format in HostSetupFormat.values)
                  CatchChip.choice(
                    key: ValueKey<String>('host-setup-format-${format.name}'),
                    label: _formatLabel(l10n, format),
                    selected: formats.contains(format),
                    mode: CatchChipMode.multiple,
                    dot: _catchFormat(format),
                    colourWhenSelected: true,
                    onPressed: () => onToggleFormat(format),
                  ),
              ],
            ),
          ],
        ),
        HostSetupPageLinkTile(
          link: l10n.hostOnboardingDetailsPagePending,
          note: l10n.hostOnboardingDetailsDomainNote,
        ),
        if (createError != null)
          CatchNotice.inline(body: createError!, tone: CatchNoticeTone.danger),
      ],
    );
  }
}

String _formatLabel(AppLocalizations l10n, HostSetupFormat format) =>
    switch (format) {
      HostSetupFormat.games => l10n.hostOnboardingFormatGames,
      HostSetupFormat.run => l10n.hostOnboardingFormatRun,
      HostSetupFormat.dinner => l10n.hostOnboardingFormatDinner,
      HostSetupFormat.courts => l10n.hostOnboardingFormatCourts,
      HostSetupFormat.nightsOut => l10n.hostOnboardingFormatNightsOut,
    };

CatchFormat _catchFormat(HostSetupFormat format) => switch (format) {
  HostSetupFormat.games => CatchFormat.games,
  HostSetupFormat.run => CatchFormat.run,
  HostSetupFormat.dinner => CatchFormat.dinner,
  HostSetupFormat.courts => CatchFormat.courts,
  HostSetupFormat.nightsOut => CatchFormat.nightsOut,
};

/// The logo stand-in takes the colour of the first format picked.
CatchAvatarColor? _avatarColor(Set<HostSetupFormat> formats) {
  if (formats.isEmpty) return null;
  return switch (HostSetupFormat.values.firstWhere(formats.contains)) {
    HostSetupFormat.games => CatchAvatarColor.games,
    HostSetupFormat.run => CatchAvatarColor.run,
    HostSetupFormat.dinner => CatchAvatarColor.dinner,
    HostSetupFormat.courts => CatchAvatarColor.courts,
    HostSetupFormat.nightsOut => CatchAvatarColor.nightsOut,
  };
}
