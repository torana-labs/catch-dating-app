import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_event_entry_sheet.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_event_entry_state.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/widgets/draft_picker_sheet.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/widgets/event_guest_details_section.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Draft sheet states',
  type: HostEventEntrySheet,
  path: '[P1 product surfaces]/Host create event',
)
Widget draftPickerSheetCatalogStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'HostEventEntrySheet',
    contractId: 'component.host.event.draft_picker_sheet',
    children: [
      WidgetbookPageStateCard(
        label: 'with drafts',
        child: WidgetbookHostDeviceFrame(
          child: HostEventEntrySheet(
            state: HostEventEntryState.resolve(
              organizerId: HostOperationsFixtures.primaryOrganizer.id,
              drafts: [HostOperationsFixtures.eventDraft],
            ),
            onDeleteDraft: (_) async {},
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'empty',
        child: WidgetbookHostDeviceFrame(
          child: HostEventEntrySheet(
            state: HostEventEntryState.resolve(
              organizerId: HostOperationsFixtures.primaryOrganizer.id,
            ),
            onDeleteDraft: (_) async {},
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Draft card states',
  type: DraftCard,
  path: '[P1 product surfaces]/Host create event',
)
Widget draftCardCatalogStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'DraftCard',
    contractId: 'component.host.event.draft_card',
    children: [
      WidgetbookPageStateCard(
        label: 'saved draft',
        child: DraftCard(
          draft: HostOperationsFixtures.eventDraft,
          isDeleting: false,
          onSelect: () {},
          onDelete: () {},
        ),
      ),
      WidgetbookPageStateCard(
        label: 'delete pending',
        child: DraftCard(
          draft: HostOperationsFixtures.eventDraft,
          isDeleting: true,
          onSelect: () {},
          onDelete: () {},
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Guest information',
  type: EventGuestDetailsSection,
  path: '[P1 product surfaces]/Host create event',
)
Widget eventGuestDetailsSectionPreview(BuildContext context) {
  return WidgetbookHostDeviceFrame(
    child: EventGuestDetailsSection(
      included: 'Equipment, a guided session and refreshments.',
      accessibility:
          'Step-free entrance and accessible toilets. The activity includes standing and walking.',
      onSave: (_, _) {},
    ),
  );
}
