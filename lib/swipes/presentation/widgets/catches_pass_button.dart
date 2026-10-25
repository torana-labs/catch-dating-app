import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/swipes/presentation/swipe_keys.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class CatchesPassButton extends StatelessWidget {
  const CatchesPassButton({
    super.key,
    required this.onPressed,
    this.isPending = false,
  });

  final VoidCallback? onPressed;
  final bool isPending;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final passColor = Theme.of(context).colorScheme.error;
    final isEnabled = onPressed != null && !isPending;

    return Tooltip(
      message: isPending
          ? context.l10n.swipesCatchesPassButtonMessagePassing
          : context.l10n.swipesCatchesPassButtonMessagePass,
      child: Semantics(
        label: isPending
            ? context.l10n.swipesCatchesPassButtonLabelPassingProfile
            : context.l10n.swipesCatchesPassButtonLabelPassProfile,
        button: true,
        enabled: isEnabled,
        child: AnimatedOpacity(
          opacity: isEnabled || isPending ? 1 : CatchOpacity.disabledControl,
          duration: CatchMotion.fast,
          child: CatchIconAction(
            key: SwipeKeys.passButton,
            onPressed: isEnabled ? onPressed : null,
            variant: CatchIconActionVariant.float,
            backgroundColor: t.surface.withValues(
              alpha: CatchOpacity.passButtonFill,
            ),
            borderColor: t.line,
            size: CatchLayout.passButtonExtent,
            child: isPending
                ? SizedBox.square(
                    dimension: CatchIconSize.passButton,
                    child: CircularProgressIndicator(
                      strokeWidth: CatchStroke.passProgress,
                      valueColor: AlwaysStoppedAnimation<Color>(passColor),
                    ),
                  )
                : Icon(
                    CatchIcons.closeRounded,
                    color: passColor,
                    size: CatchIconSize.passButton,
                  ),
          ),
        ),
      ),
    );
  }
}
