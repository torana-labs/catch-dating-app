part of '../organizer_list_tile.dart';

const double _avatarChipTileSize = CatchSpacing.s16;
const double _avatarChipColumnWidth =
    CatchLayout.organizerAvatarRailColumnWidth;

class AvatarChip extends StatelessWidget {
  const AvatarChip({
    super.key,
    required this.organizer,
    this.showLiveBadge = false,
    this.onTap,
  });

  final Organizer organizer;
  final bool showLiveBadge;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);

    return Semantics(
      button: onTap != null,
      label: context.l10n.organizersAvatarChipLabelOpenNameOrganizer(
        name: organizer.name,
      ),
      child: CatchLegacySurface(
        tone: CatchSurfaceTone.transparent,
        radius: CatchRadius.none,
        duration: Duration.zero,
        onTap: onTap,
        child: SizedBox(
          width: _avatarChipColumnWidth,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CatchLegacySurface(
                width: _avatarChipTileSize,
                height: _avatarChipTileSize,
                radius: CatchRadius.pill,
                borderSpec: showLiveBadge
                    ? CatchBorder.resolve(t, CatchBorderRole.selected)
                    : CatchBorder.resolve(t, CatchBorderRole.boundary),
                padding: CatchInsets.iconChipContentTight,
                child: CatchLegacySurface(
                  duration: Duration.zero,
                  tone: CatchSurfaceTone.transparent,
                  radius: CatchRadius.pill,
                  clipBehavior: Clip.antiAlias,
                  child: OrganizerImage(
                    organizer: organizer,
                    preferProfileImage: true,
                  ),
                ),
              ),
              gapH6,
              CatchLegacyText(
                organizer.name,
                variant: CatchLegacyTextVariant.statusLabel,
                color: t.ink,
                textAlign: TextAlign.center,
                maxLines: 1,
              ),
              if (showLiveBadge) ...[
                gapH2,
                CatchLegacyText(
                  context.l10n.organizersAvatarChipTextEventSoon,
                  variant: CatchLegacyTextVariant.statusLabel,
                  color: t.primary,
                  textAlign: TextAlign.center,
                  maxLines: 1,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
