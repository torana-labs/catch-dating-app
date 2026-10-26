import 'package:catch_dating_app/hosts/presentation/widgets/participant_table.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/contract_preview.dart';

import '../../preview_layout_contracts.dart';

@widgetbook.UseCase(
  name: 'Contract states',
  type: ParticipantRow,
  path: '[Core primitives]/Host operations',
)
Widget catchRosterRowContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'ParticipantRow',
    contractId: 'catch.roster_row',
    states: const [
      'button-action',
      'decision-action',
      'badge-action',
      'text-action',
      'empty-signal',
      'disabled-action',
      'truncated',
    ],
    children: [
      WidgetbookContractStateCard(
        label: 'button-action',
        child: ParticipantRow(
          person: 'Aanya Rao',
          meta: 'Paid - arrives 7:40 PM',
          signal: 'Checked in',
          tone: CatchBadgeTone.success,
          action: ParticipantButtonAction(
            label: 'View',
            icon: CatchIcons.show,
            onPressed: widgetbookNoop,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'decision-action',
        child: ParticipantRow(
          person: 'Dev Malhotra',
          meta: 'Request to join - first event',
          signal: 'Review',
          tone: CatchBadgeTone.warning,
          action: ParticipantDecideAction(
            onProfile: widgetbookNoop,
            onApprove: widgetbookNoop,
            onDecline: widgetbookNoop,
          ),
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'badge-action',
        child: ParticipantRow(
          person: 'Kabir Mehta',
          meta: 'Guest invite - +1',
          signal: 'Hosted',
          tone: CatchBadgeTone.gold,
          action: ParticipantBadgeAction(
            label: 'VIP',
            tone: CatchBadgeTone.gold,
          ),
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'text-action',
        child: ParticipantRow(
          person: 'Mira Shah',
          meta: 'Ticket refunded',
          signal: 'Cancelled',
          tone: CatchBadgeTone.danger,
          action: ParticipantTextAction('Done'),
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'empty-signal',
        child: ParticipantRow(
          person: 'Noor Khan',
          meta: 'Invite pending',
          action: ParticipantTextAction('Waiting'),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'disabled-action',
        child: ParticipantRow(
          person: 'Naina Bose',
          meta: 'Reminder already sent',
          signal: 'Pending',
          action: ParticipantButtonAction(
            label: 'Sent',
            disabled: true,
            onPressed: widgetbookNoop,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'truncated',
        child: SizedBox(
          width: WidgetbookPreviewLayout.standardContractWidth,
          child: ParticipantRow(
            person: 'A very long guest name that should ellipsize cleanly',
            meta: 'VIP invite with a very long arrival note and payment status',
            signal: 'Needs help',
            tone: CatchBadgeTone.warning,
            action: ParticipantButtonAction(
              label: 'Open',
              onPressed: widgetbookNoop,
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: ParticipantTable,
  path: '[Core primitives]/Host operations',
)
Widget catchRosterTableContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'ParticipantTable',
    contractId: 'catch.roster_table',
    states: const ['populated', 'empty', 'partial-columns', 'long-copy'],
    children: [
      WidgetbookContractStateCard(
        label: 'populated',
        child: ParticipantTable(
          columns: const ['Guest', 'Signal', 'Action'],
          rows: [
            ParticipantRow(
              person: 'Aanya Rao',
              meta: 'Paid - checked in 7:42 PM',
              signal: 'Here',
              tone: CatchBadgeTone.success,
              action: ParticipantButtonAction(
                label: 'Open',
                icon: CatchIcons.show,
                onPressed: widgetbookNoop,
              ),
            ),
            ParticipantRow(
              person: 'Dev Malhotra',
              meta: 'Request to join',
              signal: 'Review',
              tone: CatchBadgeTone.warning,
              action: ParticipantDecideAction(
                onProfile: widgetbookNoop,
                onApprove: widgetbookNoop,
                onDecline: widgetbookNoop,
              ),
            ),
            const ParticipantRow(
              person: 'Mira Shah',
              meta: 'Ticket refunded',
              signal: 'Cancelled',
              tone: CatchBadgeTone.danger,
              action: ParticipantBadgeAction(label: 'Closed'),
            ),
          ],
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'empty',
        child: ParticipantTable(
          columns: ['Guest', 'Signal', 'Action'],
          showEmpty: true,
          emptyTitle: 'No guests in this view',
          emptyMessage:
              'Change the roster filter or wait for guests to join this event.',
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'partial-columns',
        child: ParticipantTable(
          columns: ['Guest', 'Signal'],
          rows: [
            ParticipantRow(
              person: 'Noor Khan',
              meta: 'Invite pending',
              signal: 'Pending',
              action: ParticipantTextAction('Waiting'),
            ),
          ],
        ),
      ),
      WidgetbookContractStateCard(
        label: 'long-copy',
        child: ParticipantTable(
          columns: const ['Guest', 'Signal', 'Action'],
          rows: [
            ParticipantRow(
              person: 'A very long guest name that should ellipsize cleanly',
              meta:
                  'VIP invite with a very long arrival note and payment status',
              signal: 'Needs help',
              tone: CatchBadgeTone.warning,
              action: ParticipantButtonAction(
                label: 'Open',
                onPressed: widgetbookNoop,
              ),
            ),
          ],
        ),
      ),
    ],
  );
}
