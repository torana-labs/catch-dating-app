import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/programs/presentation/program_events_row.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../support/page_preview.dart';

@widgetbook.UseCase(
  name: 'Inventory row',
  type: ProgramEventsRow,
  path: '[P1 product surfaces]/Program workspace',
)
Widget programEventsRowStates(BuildContext context) =>
    WidgetbookPageCatalogFrame(
      title: 'ProgramEventsRow',
      contractId: 'screen.host.events',
      children: [
        for (final state in [
          (
            label: 'creator draft',
            creator: true,
            status: 'draft',
            pending: false,
            deadline: null,
            anonymizedAt: null,
          ),
          (
            label: 'organizer manager setup',
            creator: false,
            status: 'draft',
            pending: false,
            deadline: null,
            anonymizedAt: null,
          ),
          (
            label: 'program admin setup',
            creator: false,
            status: 'draft',
            pending: false,
            deadline: null,
            anonymizedAt: null,
          ),
          (
            label: 'creator pending',
            creator: true,
            status: 'draft',
            pending: true,
            deadline: null,
            anonymizedAt: null,
          ),
          (
            label: 'creator restore',
            creator: true,
            status: 'archived',
            pending: false,
            deadline: DateTime(2026, 10, 19),
            anonymizedAt: null,
          ),
          (
            label: 'restore window expired',
            creator: true,
            status: 'archived',
            pending: false,
            deadline: DateTime(2026, 10, 4),
            anonymizedAt: null,
          ),
          (
            label: 'anonymized archive',
            creator: true,
            status: 'archived',
            pending: false,
            deadline: DateTime(2026, 10, 4),
            anonymizedAt: DateTime(2026, 10, 4),
          ),
        ])
          WidgetbookPageStateCard(
            label: state.label,
            child: ProgramEventsRow(
              program: OrganizerProgramListRow(
                programId: 'program',
                title: 'Kapoor–Shah Wedding',
                kind: 'wedding',
                status: state.status,
                timezone: 'Asia/Kolkata',
                revision: 1,
                startsAt: DateTime(2026, 10, 5),
                endsAt: DateTime(2026, 10, 8),
                functionCount: 3,
                canArchive: state.creator && state.status != 'archived',
                canUnarchive: state.creator && state.status == 'archived',
                anonymizeAt: state.deadline,
                anonymizedAt: state.anonymizedAt,
              ),
              now: DateTime(2026, 10, 5),
              pending: state.pending,
              onOpen: () {},
              onLifecycle: (_) {},
            ),
          ),
      ],
    );
