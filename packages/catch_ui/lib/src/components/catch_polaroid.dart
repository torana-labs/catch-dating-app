import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/foundations/catch_icons.dart';
import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:catch_ui/src/primitives/catch_gap.dart';
import 'package:catch_ui/src/primitives/catch_surface.dart';
import 'package:flutter/material.dart';

/// Canonical person material: a portrait-first instant photograph with a
/// quiet handwritten-note lane rendered in Catch's editorial typography.
///
/// Product context remains outside the object. Event overlap, reactions, and
/// relationship state may be supplied as overlays or surrounding composition,
/// but the polaroid itself only represents the person.
class CatchPolaroid extends StatelessWidget {
  const CatchPolaroid({
    super.key,
    required this.media,
    required this.name,
    this.kicker,
    this.meta,
    this.mediaOverlay,
    this.accentColor,
    this.onTap,
    this.showArrow = false,
  });

  final Widget media;
  final String name;
  final String? kicker;
  final String? meta;
  final Widget? mediaOverlay;
  final Color? accentColor;
  final VoidCallback? onTap;
  final bool showArrow;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final kickerText = kicker?.trim();
    final metaText = meta?.trim();

    return CatchSurface(
      key: const ValueKey('person-polaroid'),
      onTap: onTap,
      borderRole: CatchBorderRole.separator,
      radius: CatchLayout.personPolaroidRadius,
      emphasis: CatchSurfaceEmphasis.subtle,
      backgroundColor: t.surface,
      padding: CatchInsets.contentDense,
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          AspectRatio(
            aspectRatio: CatchAspectRatio.portrait4x5,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(
                CatchLayout.personPolaroidMediaRadius,
              ),
              child: Stack(
                fit: StackFit.expand,
                children: [media, ?mediaOverlay],
              ),
            ),
          ),
          gapH10,
          if (kickerText != null && kickerText.isNotEmpty) ...[
            Text(
              kickerText.toUpperCase(),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: CatchTextStyles.kicker(
                context,
                color: accentColor ?? t.primary,
              ),
            ),
            gapH4,
          ],
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: CatchTextStyles.displayXs(context, color: t.ink),
                ),
              ),
              if (showArrow) ...[
                gapW10,
                Icon(CatchIcons.forward, size: CatchIconSize.sm, color: t.ink2),
              ],
            ],
          ),
          if (metaText != null && metaText.isNotEmpty) ...[
            gapH6,
            Text(
              metaText.toUpperCase(),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: CatchTextStyles.numericMeta(context, color: t.ink2),
            ),
          ],
        ],
      ),
    );
  }
}
