import 'package:catch_dating_app/contexts/audience/data/host_roster_intake_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/host_roster_import.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_roster_import_sheet.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_roster_intake_review_sheet.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_roster_mapping_field.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/page_preview.dart';
import 'package:widgetbook_workspace/support/widgetbook_harness.dart';

const _headers = ['Guest', 'Email', 'Ticket'];
const _rows = [
  ['Asha Shah', 'asha@example.com', 'General'],
  ['Ravi Rao', 'ravi@example.com', 'VIP'],
];

@widgetbook.UseCase(
  name: 'Ready and missing name mapping',
  type: HostRosterImportSheet,
  path: '[P1 product surfaces]/Host/Roster',
)
Widget hostRosterImportSheetStates(BuildContext context) =>
    WidgetbookScrollCatalogFrame(
      title: 'HostRosterImportSheet',
      catalogId: 'host.roster_import',
      children: [
        for (final mapped in [true, false])
          WidgetbookPageStateCard(
            label: mapped ? 'Ready to import' : 'Guest name mapping required',
            child: WidgetbookViewportFrame.sheet(
              size: const Size(390, 760),
              child: HostRosterImportSheet(
                table: HostRosterTable(
                  fileName: 'guests.csv',
                  format: EventAttendeeImportFormat.csv,
                  headers: _headers,
                  rows: _rows,
                  suggestedMapping: {
                    if (mapped) HostRosterField.displayName: 0,
                    HostRosterField.email: 1,
                    HostRosterField.ticketType: 2,
                  },
                  adapter: const HostRosterAdapterDetection(
                    adapterId: HostRosterAdapterId.genericV1,
                    support: HostRosterAdapterSupport.generic,
                    confidence: 1,
                  ),
                ),
                suggestedRevenueAmountMinor: 150000,
              ),
            ),
          ),
      ],
    );

@widgetbook.UseCase(
  name: 'Adds, updates, and identity conflicts',
  type: HostRosterIntakeReviewSheet,
  path: '[P1 product surfaces]/Host/Roster',
)
Widget hostRosterIntakeReviewSheetStates(BuildContext context) =>
    const WidgetbookScrollCatalogFrame(
      title: 'HostRosterIntakeReviewSheet',
      catalogId: 'host.roster_intake_review',
      children: [
        WidgetbookPageStateCard(
          label: 'Review required before apply',
          child: WidgetbookViewportFrame.sheet(
            size: Size(390, 760),
            child: _HostRosterIntakeReviewPreview(),
          ),
        ),
      ],
    );

class _HostRosterIntakeReviewPreview extends StatefulWidget {
  const _HostRosterIntakeReviewPreview();

  @override
  State<_HostRosterIntakeReviewPreview> createState() =>
      _HostRosterIntakeReviewPreviewState();
}

class _HostRosterIntakeReviewPreviewState
    extends State<_HostRosterIntakeReviewPreview> {
  final _scopeRevision = ValueNotifier<int>(0);

  @override
  void dispose() {
    _scopeRevision.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => HostRosterIntakeReviewSheet(
    review: _intakeReview,
    scopeRevision: _scopeRevision,
    onSetExcluded: (review, _) async => review,
    onApply: (review) async => review,
  );
}

const _intakeReview = HostRosterIntakeReview(
  sessionId: 'hri_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  revision: 3,
  fileName: 'eventbrite-guests.xlsx',
  state: 'review',
  reviewHash:
      'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  eligibleForApply: false,
  counts: {
    'add': 1,
    'update': 1,
    'unchanged': 0,
    'excluded': 1,
    'needsReview': 0,
    'identityConflict': 1,
  },
  rows: [
    HostRosterIntakePreviewRow(
      rowId: '2',
      sourceRowNumber: 2,
      displayName: 'Asha Shah',
      externalReference: 'ticket-2',
      kind: 'add',
      changedFields: ['displayName', 'ticketType'],
      fieldChanges: [
        HostRosterIntakeFieldChange(
          field: 'displayName',
          currentValue: null,
          proposedValue: 'Asha Shah',
          origin: 'upload',
        ),
        HostRosterIntakeFieldChange(
          field: 'ticketType',
          currentValue: null,
          proposedValue: 'General admission',
          origin: 'upload',
        ),
      ],
      issueCode: null,
    ),
    HostRosterIntakePreviewRow(
      rowId: '3',
      sourceRowNumber: 3,
      displayName: 'Ravi Rao',
      externalReference: 'ticket-3',
      kind: 'update',
      changedFields: ['ticketType'],
      fieldChanges: [
        HostRosterIntakeFieldChange(
          field: 'ticketType',
          currentValue: 'General admission',
          proposedValue: 'VIP',
          origin: 'hostCorrection',
        ),
      ],
      issueCode: null,
    ),
    HostRosterIntakePreviewRow(
      rowId: '4',
      sourceRowNumber: 4,
      displayName: 'Maya Iyer',
      externalReference: 'ticket-4',
      kind: 'identityConflict',
      changedFields: ['phone'],
      fieldChanges: [
        HostRosterIntakeFieldChange(
          field: 'phone',
          currentValue: null,
          proposedValue: '+919876543210',
          origin: 'upload',
        ),
      ],
      issueCode: 'contact-belongs-to-another-attendee',
    ),
    HostRosterIntakePreviewRow(
      rowId: '5',
      sourceRowNumber: 5,
      displayName: 'Cancelled guest',
      externalReference: 'ticket-5',
      kind: 'excluded',
      changedFields: [],
      issueCode: null,
    ),
  ],
  evidenceRows: [],
  excludedRowIds: ['5'],
);

@widgetbook.UseCase(
  name: 'Mapped and excluded columns',
  type: HostRosterMappingField,
  path: '[P1 product surfaces]/Host/Roster',
)
Widget hostRosterMappingFieldStates(BuildContext context) =>
    WidgetbookScrollCatalogFrame(
      title: 'HostRosterMappingField',
      catalogId: 'host.roster_mapping',
      children: [
        for (final mapped in [true, false])
          WidgetbookPageStateCard(
            label: mapped ? 'Guest samples' : 'Column excluded',
            child: WidgetbookContentFrame(
              child: HostRosterMappingField(
                field: HostRosterField.displayName,
                headers: _headers,
                rows: _rows,
                value: mapped ? 0 : null,
                onChanged: (_) {},
              ),
            ),
          ),
      ],
    );
