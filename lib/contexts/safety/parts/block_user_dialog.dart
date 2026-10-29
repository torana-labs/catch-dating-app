import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/dialogs/confirm_danger_dialog.dart';
import 'package:flutter/material.dart';

Future<bool?> showBlockUserDialog({
  required BuildContext context,
  required String name,
}) {
  return showConfirmDangerDialog(
    context: context,
    title: context.l10n.coreBlockUserDialogTitleBlockName(name: name),
    message: context.l10n.coreBlockUserDialogMessageYouWillStopSeeing,
    confirmLabel: context.l10n.coreBlockUserDialogVisiblecopyBlock,
  );
}
