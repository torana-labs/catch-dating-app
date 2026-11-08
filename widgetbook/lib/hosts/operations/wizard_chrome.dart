import 'package:catch_dating_app/hosts/presentation/widgets/host_wizard_step_header.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import 'fixtures.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Header states',
  type: HostWizardStepHeader,
  path: '[P1 product surfaces]/Host create event',
)
Widget createEventStepHeaderCatalogStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'CreateEventStepHeader',
    contractId: 'component.host.event.step_header',
    children: [
      WidgetbookPageStateCard(
        label: 'step 1',
        child: WidgetbookHostDeviceFrame(
          child: HostWizardStepHeader(
            title: 'Event basics',
            subtitle: widgetbookOrganizer.name,
            currentStep: 0,
            totalSteps: 5,
            onClose: () {},
            onStepOverview: () {},
          ),
        ),
      ),
    ],
  );
}
