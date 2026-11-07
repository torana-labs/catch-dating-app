import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/preview_layout_contracts.dart';
import 'package:widgetbook_workspace/support/contract_preview.dart';

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchListSection,
  path: '[Core primitives]/Sections',
)
Widget catchListSectionContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchSection()',
    contractId: 'catch.section.list',
    states: const [
      'system-note',
      'system-action',
      'system-empty',
      'system-no-dividers',
    ],
    children: [
      for (final (label, description, section) in [
        (
          'system-note',
          'Task rows under a muted note; the section draws the lines.',
          CatchSection(
            title: 'Needs you',
            note: '3 before doors',
            children: const [
              CatchIndexRow(
                title: '2 people want in',
                subtitle: 'Ishaan and Zoya asked to join tonight',
                marker: CatchIndexRowTone.warning,
                action: CatchIndexRowAction(
                  label: 'Review',
                  onPressed: widgetbookNoop,
                ),
                density: CatchIndexRowSize.roomy,
                onTap: null,
              ),
              CatchIndexRow(
                title: 'A place opened up',
                subtitle: 'Offer it to Nikhil, first on the waitlist',
                marker: CatchIndexRowTone.info,
                action: CatchIndexRowAction(
                  label: 'Offer',
                  onPressed: widgetbookNoop,
                ),
                density: CatchIndexRowSize.roomy,
                onTap: null,
              ),
            ],
          ),
        ),
        (
          'system-action',
          'Event rows under a quiet action.',
          CatchSection(
            title: 'This week',
            action: const CatchSectionAction(
              label: 'All events',
              onPressed: widgetbookNoop,
            ),
            children: const [
              CatchIndexRow(
                title: 'Carter Road Social Run',
                meta: '6:30 AM · 32 of 40 booked',
                status: '8 left',
                progress: CatchIndexRowProgress(
                  value: 32,
                  max: 40,
                  label: 'Booked',
                ),
                date: CatchIndexRowDate(
                  day: 'Sun',
                  date: '1',
                  format: CatchFormat.run,
                ),
                density: CatchIndexRowSize.regular,
                onTap: widgetbookNoop,
              ),
              CatchIndexRow(
                title: 'Long Table Supper',
                meta: '8:00 PM · 14 of 14 booked',
                status: 'Full',
                statusTone: CatchIndexRowTone.success,
                progress: CatchIndexRowProgress(
                  value: 14,
                  max: 14,
                  label: 'Booked',
                ),
                date: CatchIndexRowDate(
                  day: 'Wed',
                  date: '4',
                  format: CatchFormat.dinner,
                ),
                density: CatchIndexRowSize.regular,
                onTap: widgetbookNoop,
              ),
            ],
          ),
        ),
        (
          'system-empty',
          'No rows: the empty copy under the title.',
          CatchSection(
            title: 'Needs you',
            empty: 'Nothing needs you before doors.',
            children: const [],
          ),
        ),
        (
          'system-no-dividers',
          'A stat row: no lines.',
          CatchSection(
            title: 'Last 30 days',
            action: const CatchSectionAction(
              label: 'Insights',
              onPressed: widgetbookNoop,
            ),
            dividers: CatchSectionPlacement.none,
            children: const [
              CatchStack(
                direction: CatchStackDirection.row,
                equal: true,
                children: [
                  CatchMetricTile.stat(
                    label: 'Bookings',
                    value: '312',
                    note: 'Up 18%',
                    noteTone: CatchMetricTileTone.success,
                  ),
                  CatchMetricTile.stat(
                    label: 'Came back',
                    value: '41%',
                    note: 'of guests rebooked',
                  ),
                ],
              ),
            ],
          ),
        ),
      ])
        WidgetbookContractStateCard(
          label: label,
          description: description,
          child: SizedBox(
            width: WidgetbookPreviewLayout.standardContractWidth,
            child: section,
          ),
        ),
    ],
  );
}
