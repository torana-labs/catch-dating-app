import 'package:catch_dating_app/contexts/programmes/domain/phone_import_batch.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// Read-only confirmed command, including after a process restart. No native
/// contact identifiers, unused numbers or draft data are rendered here.
class PhoneImportSavedReviewSection extends StatelessWidget {
  const PhoneImportSavedReviewSection({super.key, required this.batch});
  final PhoneImportBatch batch;

  @override
  Widget build(BuildContext context) => CatchSection.containedFieldRows(
    title: context.l10n.phoneImportConfirmedGuests,
    children: [
      for (final row in batch.rows)
        CatchField.read(
          copy: catchFieldCopy(context.l10n),
          title: row['displayName']! as String,
          body: [
            row['phoneE164'] as String? ?? context.l10n.phoneImportManualSource,
            if (row['householdLabel'] case final String household) household,
            if (row['groupLabels'] case final String side) side.substring(5),
          ].join(' · '),
          bodyMaxLines: 5,
        ),
    ],
  );
}
