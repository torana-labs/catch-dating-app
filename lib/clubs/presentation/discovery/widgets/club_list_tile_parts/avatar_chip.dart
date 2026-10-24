part of '../club_list_tile.dart';

const double _avatarChipTileSize = CatchSpacing.s16;
const double _avatarChipColumnWidth = CatchLayout.clubAvatarRailColumnWidth;

class AvatarChip extends StatelessWidget {
  const AvatarChip({
    super.key,
    required this.club,
    this.showLiveBadge = false,
    this.onTap,
  });

  final Club club;
  final bool showLiveBadge;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);

    return Semantics(
      button: onTap != null,
      label: context.l10n.clubsAvatarChipLabelOpenNameClub(name: club.name),
      child: GestureDetector(
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
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(CatchRadius.pill),
                  child: ClubImage(club: club, preferProfileImage: true),
                ),
              ),
              gapH6,
              CatchText(
                club.name,
                variant: CatchTextVariant.statusLabel,
                color: t.ink,
                textAlign: TextAlign.center,
                maxLines: 1,
              ),
              if (showLiveBadge) ...[
                gapH2,
                CatchText(
                  context.l10n.clubsAvatarChipTextEventSoon,
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
