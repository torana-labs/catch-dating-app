part of '../organizer_list_tile.dart';

const double _avatarChipTileSize = CatchSpacing.s16;
const double _avatarChipColumnWidth = CatchLayout.organizerAvatarRailColumnWidth;

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
      label: context.l10n.organizersAvatarChipLabelOpenNameOrganizer(name: organizer.name),
      child: CatchSurface(
        tone: CatchSurfaceTone.transparent,
        radius: CatchRadius.none,
        duration: Duration.zero,
        onTap: onTap,
        child: SizedBox(
          width: _avatarChipColumnWidth,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CatchSurface(
                width: _avatarChipTileSize,
                height: _avatarChipTileSize,
                radius: CatchRadius.pill,
                borderSpec: showLiveBadge
                    ? CatchBorder.resolve(t, CatchBorderRole.selected)
                    : CatchBorder.resolve(t, CatchBorderRole.boundary),
                padding: CatchInsets.iconChipContentTight,
                child: CatchSurface(
                  duration: Duration.zero,
                  tone: CatchSurfaceTone.transparent,
                  radius: CatchRadius.pill,
                  clipBehavior: Clip.antiAlias,
                  child: OrganizerImage(organizer: organizer, preferProfileImage: true),
                ),
              ),
              gapH6,
              CatchText(
                organizer.name,
                variant: CatchTextVariant.statusLabel,
                color: t.ink,
                textAlign: TextAlign.center,
                maxLines: 1,
              ),
              if (showLiveBadge) ...[
                gapH2,
                CatchText(
                  context.l10n.organizersAvatarChipTextEventSoon,
                  variant: CatchTextVariant.statusLabel,
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
