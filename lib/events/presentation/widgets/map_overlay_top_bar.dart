import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class MapOverlayTopBar extends StatelessWidget {
  const MapOverlayTopBar({super.key, this.trailing, this.below, this.onBack});

  final Widget? trailing;
  final Widget? below;
  final VoidCallback? onBack;

  @override
  Widget build(BuildContext context) {
    final below = this.below;

    return Positioned(
      top: CatchSpacing.s4,
      left: CatchSpacing.s4,
      right: CatchSpacing.s4,
      child: SafeArea(
        bottom: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                CatchIconAction(
                  tooltip: MaterialLocalizations.of(context).backButtonTooltip,
                  backgroundColor: CatchTokens.of(context).surface.withValues(
                    alpha: CatchOpacity.mapOverlayChromeFill,
                  ),
                  onPressed: onBack ?? () => Navigator.of(context).maybePop(),
                  child: Icon(
                    CatchIcons.arrowBackIosNewRounded,
                    size: CatchIconSize.md,
                  ),
                ),
                const Spacer(),
                ?trailing,
              ],
            ),
            if (below != null) ...[
              const SizedBox(height: CatchSpacing.s3),
              below,
            ],
          ],
        ),
      ),
    );
  }
}
