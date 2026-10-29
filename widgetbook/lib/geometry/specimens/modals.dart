import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/contract_preview.dart';
import '../../support/geometry_preview.dart';

@widgetbook.UseCase(
  name: 'Geometry matrix',
  type: CatchSheet,
  path: '[Geometry system]',
)
Widget modalGeometryMatrix(BuildContext context) {
  return widgetbookGeometryPage(
    context,
    title: 'Sheets and dialogs',
    contractIds: const ['catch.sheet', 'catch.confirm_dialog'],
    principles: const [
      'Modals establish a new plane; their internal fields and actions remain flat.',
      'Sheets own viewport edges, safe area, keyboard clearance, and top radii.',
      'Dialogs own a bounded centered silhouette and action reflow.',
    ],
    children: [
      widgetbookGeometrySpecimen(
        context,
        label: 'Live presentations',
        description:
            'Launch the real presenters to inspect scrim, viewport, safe-area, and dismissal behavior.',
        child: Wrap(
          spacing: CatchSpacing.s3,
          runSpacing: CatchSpacing.s3,
          children: [
            CatchButton(
              label: 'Open sheet',
              onPressed: () => showCatchBottomSheet<void>(
                context: context,
                useRootNavigator: false,
                builder: (_) => CatchSheet(
                  title: 'Invite guests',
                  subtitle: 'Share this event with people who fit the format.',
                  footer: CatchButton(
                    label: 'Copy invite link',
                    fullWidth: true,
                    onPressed: widgetbookNoop,
                  ),
                  child: const Text('Invites close at 6 PM.'),
                ),
              ),
            ),
            CatchButton(
              label: 'Open dialog',
              variant: CatchButtonVariant.secondary,
              onPressed: () => showCatchAdaptiveDialog<bool>(
                context: context,
                title: 'Join this event?',
                message:
                    'Your profile and first name will be shared with the host.',
                actions: const [
                  CatchDialogAction(label: 'Cancel', value: false),
                  CatchDialogAction(
                    label: 'Join',
                    value: true,
                    isDefault: true,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      widgetbookGeometrySpecimen(
        context,
        label: 'Sheet composition',
        child: SizedBox(
          width: widgetbookGeometryPhoneWidth,
          child: CatchSheet(
            title: 'Arrival note',
            subtitle: 'Tell guests where to meet.',
            keyboardSafe: true,
            footer: CatchButton(
              label: 'Save note',
              fullWidth: true,
              onPressed: widgetbookNoop,
            ),
            child: CatchField.input(
              copy: catchFieldCopy(context.l10n),
              title: 'Note',
              initialValue: 'Meet beside the cafe entrance.',
            ),
          ),
        ),
      ),
      widgetbookGeometrySpecimen(
        context,
        label: 'Dialog composition',
        child: CatchDialog<bool>.confirmation(
          title: 'Cancel this event?',
          message: 'Guests will be notified immediately.',
          actions: const [
            CatchDialogAction(label: 'Keep event', value: false),
            CatchDialogAction(
              label: 'Cancel event',
              value: true,
              isDestructive: true,
            ),
          ],
        ),
      ),
    ],
  );
}
