import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_button.dart';
import 'package:catch_ui/src/components/catch_dialog_action.dart';
import 'package:catch_ui/src/components/catch_dialog_copy.dart';
import 'package:catch_ui/src/foundations/catch_adaptive_platform.dart';
import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:catch_ui/src/primitives/catch_gap.dart';
import 'package:catch_ui/src/primitives/catch_legacy_surface.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

Future<T?> showCatchAdaptiveDialog<T>({
  required BuildContext context,
  required String title,
  required String message,
  required List<CatchDialogAction<T>> actions,
  bool barrierDismissible = true,
}) {
  if (prefersCupertinoControls()) {
    return showCupertinoDialog<T>(
      context: context,
      barrierDismissible: barrierDismissible,
      builder: (context) => CupertinoAlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          for (final action in actions)
            CupertinoDialogAction(
              isDefaultAction: action.isDefault,
              isDestructiveAction: action.isDestructive,
              onPressed: () => Navigator.of(context).pop(action.value),
              child: Text(action.label),
            ),
        ],
      ),
    );
  }

  return showDialog<T>(
    context: context,
    barrierDismissible: barrierDismissible,
    barrierColor: CatchTokens.of(
      context,
    ).ink.withValues(alpha: CatchOpacity.confirmDialogScrim),
    builder: (context) => CatchDialog<T>.confirmation(
      title: title,
      message: message,
      actions: actions,
    ),
  );
}

Future<bool?> showCatchConfirmDialog({
  required BuildContext context,
  required String title,
  required CatchDialogCopy copy,
  String message = '',
  String? confirmLabel,
  String? cancelLabel,
  bool danger = false,
  bool barrierDismissible = true,
}) {
  return showCatchAdaptiveDialog<bool>(
    context: context,
    title: title,
    message: message,
    barrierDismissible: barrierDismissible,
    actions: [
      CatchDialogAction(label: cancelLabel ?? copy.cancelLabel, value: false),
      CatchDialogAction(
        label: confirmLabel ?? copy.confirmLabel,
        value: true,
        isDefault: !danger,
        isDestructive: danger,
      ),
    ],
  );
}

/// Shared modal frame for slotted content and typed confirmation choices.
class CatchDialog<T> extends StatelessWidget {
  const CatchDialog({
    super.key,
    required this.title,
    required Widget this.child,
    required this.actions,
  }) : _confirmation = null;

  const CatchDialog.confirmation({
    super.key,
    required this.title,
    required String message,
    required List<CatchDialogAction<T>> actions,
  }) : child = null,
       actions = const [],
       _confirmation = (message: message, actions: actions);

  final String title;
  final Widget? child;
  final List<Widget> actions;
  final _ConfirmationDialogConfig<T>? _confirmation;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final confirmation = _confirmation;
    final actionButtons = [
      if (confirmation != null)
        for (final action in confirmation.actions)
          CatchButton(
            label: action.label,
            variant: action.isDestructive
                ? CatchButtonVariant.danger
                : action.isDefault
                ? CatchButtonVariant.primary
                : CatchButtonVariant.secondary,
            fullWidth: true,
            onPressed: () => Navigator.of(context).pop(action.value),
          ),
    ];
    return Dialog(
      elevation: 0,
      insetPadding: const EdgeInsets.all(CatchLayout.confirmDialogInset),
      backgroundColor: Colors.transparent,
      child: CatchLegacySurface(
        emphasis: CatchSurfaceEmphasis.floating,
        padding: CatchInsets.confirmDialogCard,
        width: CatchLayout.confirmDialogMaxWidth,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              title,
              textAlign: confirmation != null ? TextAlign.center : null,
              style: CatchTextStyles.titleL(context, color: t.ink),
            ),
            if (confirmation != null) ...[
              if (confirmation.message.isNotEmpty) ...[
                gapH10,
                Text(
                  confirmation.message,
                  textAlign: TextAlign.center,
                  style: CatchTextStyles.supporting(context, color: t.ink2),
                ),
              ],
              gapH20,
              LayoutBuilder(
                builder: (context, constraints) {
                  if (actionButtons.isEmpty) return const SizedBox.shrink();
                  final availableWidth =
                      (constraints.maxWidth -
                          CatchSpacing.micro10 * (actionButtons.length - 1)) /
                      actionButtons.length;
                  final horizontal =
                      actionButtons.length <= 2 &&
                      confirmation.actions.every(
                        (action) =>
                            CatchButton.minimumLabelWidth(
                              context,
                              action.label,
                            ) <=
                            availableWidth,
                      );
                  return horizontal
                      ? Row(
                          children: [
                            for (final indexed in actionButtons.indexed) ...[
                              if (indexed.$1 > 0) gapW10,
                              Expanded(child: indexed.$2),
                            ],
                          ],
                        )
                      : Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            for (final indexed in actionButtons.indexed) ...[
                              if (indexed.$1 > 0) gapH10,
                              indexed.$2,
                            ],
                          ],
                        );
                },
              ),
            ] else ...[
              gapH16,
              child!,
              if (actions.isNotEmpty) ...[
                gapH20,
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    for (final indexed in actions.indexed) ...[
                      if (indexed.$1 > 0) gapW8,
                      indexed.$2,
                    ],
                  ],
                ),
              ],
            ],
          ],
        ),
      ),
    );
  }
}

typedef _ConfirmationDialogConfig<T> = ({
  String message,
  List<CatchDialogAction<T>> actions,
});
