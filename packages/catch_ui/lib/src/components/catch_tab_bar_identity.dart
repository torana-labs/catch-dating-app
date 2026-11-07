import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_avatar.dart';
import 'package:catch_ui/src/foundations/catch_icons.dart';
import 'package:catch_ui/src/primitives/catch_icon.dart';
import 'package:catch_ui/src/primitives/catch_text.dart';
import 'package:catch_ui/src/primitives/catch_text_variant.dart';
import 'package:flutter/material.dart';

/// Who the app acts as (an organizer, with a switcher) or who is signed in:
/// the header and footer of a [CatchTabBar] rail or sidebar.
///
/// It draws the avatar, the name and an optional note, with the up-down mark
/// when it opens a switcher. In a slot narrower than the rail, as in the
/// rail's header row, it draws the avatar alone and keeps the name for screen
/// readers and the tooltip.
///
/// [CatchTabBar]: CatchTabBar
class CatchTabBarIdentity extends StatelessWidget {
  const CatchTabBarIdentity({
    super.key,
    required this.name,
    this.photoUrl,
    this.initials,
    this.color,
    this.note,
    this.switcher = false,
    this.onTap,
  });

  final String name;
  final String? photoUrl;

  /// Overrides the initials taken from [name]: "LL".
  final String? initials;

  /// The palette fill behind the initials, as the system Avatar draws them;
  /// null keeps the quiet person initials.
  final CatchAvatarColor? color;

  /// A muted line under the name: "Switch organiser", "Settings".
  final String? note;

  /// Shows the up-down mark: tapping switches who the app acts as.
  final bool switcher;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      final compact = constraints.maxWidth < GeneratedCatchLayoutTokens.rail;
      final avatar = color == null
          ? CatchAvatar(
              size: GeneratedCatchSizeTokens.avatarSm,
              name: name,
              imageUrl: photoUrl,
              initials: initials,
            )
          : CatchAvatar.system(
              size: CatchAvatarSize.sm,
              name: name,
              imageUrl: photoUrl,
              initials: initials,
              color: color,
            );
      final note = this.note;
      final tile = InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(CatchRadius.sm),
        child: ConstrainedBox(
          constraints: const BoxConstraints(
            minWidth: GeneratedCatchSizeTokens.touchMin,
            minHeight: GeneratedCatchSizeTokens.touchMin,
          ),
          child: Padding(
            padding: const EdgeInsets.all(CatchSpacing.s1),
            child: compact
                ? Center(child: avatar)
                : Row(
                    spacing: CatchSpacing.s3,
                    children: [
                      avatar,
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            CatchText(
                              name,
                              variant: CatchTextVariant.labelButton,
                              maxLines: 1,
                            ),
                            if (note != null)
                              CatchText(
                                note,
                                variant: CatchTextVariant.bodyMeta,
                                tone: CatchTextTone.secondary,
                                maxLines: 1,
                              ),
                          ],
                        ),
                      ),
                      if (switcher)
                        CatchIcon(CatchIcons.expand, size: CatchIconSize.xs),
                    ],
                  ),
          ),
        ),
      );
      return Semantics(
        container: true,
        button: onTap != null,
        label: note == null ? name : '$name, $note',
        child: ExcludeSemantics(
          child: compact
              ? Tooltip(message: name, excludeFromSemantics: true, child: tile)
              : tile,
        ),
      );
    },
  );
}
