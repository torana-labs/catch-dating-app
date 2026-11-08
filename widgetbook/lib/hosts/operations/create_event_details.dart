import 'package:catch_dating_app/hosts/presentation/event_management/widgets/event_guest_details_section.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import 'preview.dart';

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
