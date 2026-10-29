import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

@widgetbook.UseCase(
  name: 'Derived content',
  type: CatchSkeleton,
  path: '[Core catalog]/Loading compositions',
)
Widget catchSkeletonContentCatalogState(BuildContext context) {
  return Scaffold(
    body: CatchSkeleton.content(
      child: CatchSectionList.inset(
        emptyStateOmitted: true,
        children: [
          CatchSection.containedFieldRows(
            title: 'Customer details',
            children: [
              CatchField.read(
                copy: catchFieldCopy(context.l10n),
                title: 'Name',
                body: 'Customer name',
              ),
              CatchField.read(
                copy: catchFieldCopy(context.l10n),
                title: 'Mobile number',
                body: '+919876543210',
              ),
              CatchField.read(
                copy: catchFieldCopy(context.l10n),
                title: 'Email',
                body: 'customer@example.com',
              ),
            ],
          ),
          CatchSection.plain(
            title: 'Attendance',
            child: Text(
              'Two events attended out of three expected.',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
        ],
      ),
    ),
  );
}
