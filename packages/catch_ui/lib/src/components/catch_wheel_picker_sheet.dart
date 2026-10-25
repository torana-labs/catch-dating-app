import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_button.dart';
import 'package:catch_ui/src/components/catch_picker_copy.dart';
import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:catch_ui/src/primitives/catch_divider.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

/// Shared wheel-picker sheet with caller-resolved copy and actions.
class CatchWheelPickerSheet extends StatelessWidget {
  const CatchWheelPickerSheet({
    super.key,
    required this.title,
    required this.copy,
    required this.child,
    required this.onCancel,
    required this.onDone,
  });

  final String title;
  final CatchPickerCopy copy;
  final Widget child;
  final VoidCallback onCancel;
  final VoidCallback onDone;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);

    return CupertinoPopupSurface(
      child: ColoredBox(
        color: t.surface,
        child: SafeArea(
          top: false,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(
                height: CatchLayout.iosPickerToolbarHeight,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    Align(
                      alignment: Alignment.centerLeft,
                      child: CatchButton.text(
                        label: copy.cancelLabel,
                        tone: CatchButtonTone.neutral,
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        padding: const EdgeInsets.symmetric(
                          horizontal: CatchSpacing.s4,
                        ),
                        onPressed: onCancel,
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: CatchLayout.iosPickerTitleSidePadding,
                      ),
                      child: Text(
                        title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        textAlign: TextAlign.center,
                        style: CatchTextStyles.titleS(context, color: t.ink),
                      ),
                    ),
                    Align(
                      alignment: Alignment.centerRight,
                      child: CatchButton.text(
                        label: copy.doneLabel,
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        padding: const EdgeInsets.symmetric(
                          horizontal: CatchSpacing.s4,
                        ),
                        onPressed: onDone,
                      ),
                    ),
                  ],
                ),
              ),
              const CatchDivider.section(),
              SizedBox(height: CatchLayout.iosPickerHeight, child: child),
            ],
          ),
        ),
      ),
    );
  }
}
