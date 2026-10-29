import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

Future<bool?> showConfirmDangerDialog({
  required BuildContext context,
  required String title,
  required String message,
  required String confirmLabel,
}) {
  return showCatchConfirmDialog(
    copy: catchDialogCopy(context.l10n),
    context: context,
    title: title,
    message: message,
    confirmLabel: confirmLabel,
    danger: true,
  );
}
