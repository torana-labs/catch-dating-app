import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

/// The format colour each brand colour previews in.
CatchFormat hostProgrammeBrandFormat(ProgramBrandColor color) =>
    switch (color) {
      ProgramBrandColor.rani => CatchFormat.nightsOut,
      ProgramBrandColor.marigold => CatchFormat.dinner,
      ProgramBrandColor.mehendi => CatchFormat.courts,
      ProgramBrandColor.rose => CatchFormat.games,
      ProgramBrandColor.haldi => CatchFormat.run,
    };

/// How it looks (RbProgBranding): the credit line, the colour, the cover
/// photo, a preview of the guest page and whether the credit shows.
class HostProgrammeBrandingBody extends StatelessWidget {
  const HostProgrammeBrandingBody({
    super.key,
    required this.program,
    required this.branding,
    required this.showCredit,
    required this.onChanged,
    required this.onShowCredit,
    required this.onChangeCover,
    this.coverUrl,
    this.uploadingCover = false,
    this.error,
  });

  final OrganizerProgramSettings program;
  final ProgramBranding branding;
  final bool showCredit;
  final ValueChanged<ProgramBranding> onChanged;
  final ValueChanged<bool> onShowCredit;

  /// Picks and uploads a new cover photo.
  final VoidCallback onChangeCover;

  /// The saved cover, signed for a few minutes; null before one is saved
  /// or while a new one waits to be saved.
  final String? coverUrl;
  final bool uploadingCover;
  final String? error;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final credit = branding.creditLine;
    return CatchPageBody.screen(
      children: [
        if (error != null)
          CatchNotice.inline(
            tone: CatchNoticeTone.danger,
            icon: CatchIcons.error,
            body: error!,
          ),
        CatchField.input(
          key: const ValueKey<String>('host-programme-branding-credit'),
          copy: catchFieldCopy(l10n),
          title: l10n.hostProgrammeBrandingShownAs,
          helperText: l10n.hostProgrammeBrandingShownAsHelp,
          contractExemption: 'Planner credit line on guest pages.',
          initialValue: credit ?? '',
          maxLength: 120,
          textCapitalization: TextCapitalization.words,
          onChanged: (value) => onChanged(
            value.trim().isEmpty
                ? branding.copyWith(clearCredit: true)
                : branding.copyWith(creditLine: value.trim()),
          ),
        ),
        CatchSection(
          title: l10n.hostProgrammeBrandingColour,
          dividers: CatchSectionPlacement.none,
          children: [
            CatchStack(
              direction: CatchStackDirection.row,
              gap: CatchStackGap.g8,
              wrap: true,
              children: [
                for (final color in ProgramBrandColor.values)
                  CatchChip.choice(
                    key: ValueKey<String>(
                      'host-programme-branding-${color.name}',
                    ),
                    label: hostProgrammeBrandColorLabel(l10n, color),
                    selected: branding.color == color,
                    mode: CatchChipMode.single,
                    dot: hostProgrammeBrandFormat(color),
                    colourWhenSelected: true,
                    onPressed: () => onChanged(branding.copyWith(color: color)),
                  ),
              ],
            ),
          ],
        ),
        CatchSection(
          title: l10n.hostProgrammeBrandingCover,
          dividers: CatchSectionPlacement.none,
          children: [
            CatchNetworkImage(
              coverUrl ?? '',
              aspect: 16 / 9,
              corner: CatchNetworkImageSize.lg,
              placeholder: CatchNetworkImageColor.tile,
              semanticLabel: branding.coverImagePath == null
                  ? l10n.hostProgrammeBrandingNoCover
                  : l10n.hostProgrammeBrandingHasCover,
            ),
            CatchButton(
              key: const ValueKey<String>('host-programme-branding-cover'),
              label: l10n.hostProgrammeBrandingChangeCover,
              variant: CatchButtonVariant.secondary,
              size: CatchButtonSize.sm,
              leading: CatchIcon(CatchIcons.addPhoto),
              status: uploadingCover
                  ? CatchButtonStatus.loading
                  : CatchButtonStatus.idle,
              onPressed: uploadingCover ? null : onChangeCover,
            ),
          ],
        ),
        CatchSection(
          title: l10n.hostProgrammeBrandingPreview,
          note: l10n.hostProgrammeBrandingPreviewNote,
          dividers: CatchSectionPlacement.none,
          children: [
            CatchSurface(
              block: CatchSurfaceBlock.spotlight,
              color: CatchSurfaceColor.values.byName(
                hostProgrammeBrandFormat(branding.color).name,
              ),
              child: CatchStack(
                children: [
                  CatchText(
                    l10n.hostProgrammeBrandingPreviewKicker,
                    variant: CatchTextVariant.labelKicker,
                  ),
                  CatchText(program.title, variant: CatchTextVariant.displayLg),
                  if (showCredit && credit != null)
                    CatchText(
                      l10n.hostProgrammeBrandingBy(name: credit),
                      variant: CatchTextVariant.bodySmall,
                    ),
                ],
              ),
            ),
          ],
        ),
        CatchSection(
          title: l10n.hostProgrammeBrandingCredit,
          children: [
            CatchIndexRow(
              title: l10n.hostProgrammeBrandingShowCredit,
              onTap: null,
              density: CatchIndexRowSize.roomy,
              trailing: CatchToggleInput(
                key: const ValueKey<String>('host-programme-branding-show'),
                value: showCredit,
                semanticLabel: l10n.hostProgrammeBrandingShowCredit,
                onChanged: onShowCredit,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

String hostProgrammeBrandColorLabel(
  AppLocalizations l10n,
  ProgramBrandColor color,
) => switch (color) {
  ProgramBrandColor.rani => l10n.hostProgrammeBrandingRani,
  ProgramBrandColor.marigold => l10n.hostProgrammeBrandingMarigold,
  ProgramBrandColor.mehendi => l10n.hostProgrammeBrandingMehendi,
  ProgramBrandColor.rose => l10n.hostProgrammeBrandingRose,
  ProgramBrandColor.haldi => l10n.hostProgrammeBrandingHaldi,
};
