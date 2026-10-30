import 'package:catch_dating_app/hosts/presentation/widgets/host_stepper_dock.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_wizard_step_header.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
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

@widgetbook.UseCase(
  name: 'Footer states',
  type: HostStepperDock,
  path: '[P1 product surfaces]/Host shared',
)
Widget stepperFooterCatalogStates(BuildContext context) {
  final t = CatchTokens.of(context);
  Widget scrollingBody(String title) => ListView(
    padding: CatchInsets.formStepBodyWithBottomActions,
    children: [
      Text(title, style: CatchTextStyles.titleL(context)),
      gapH24,
      for (var index = 0; index < 5; index++) ...[
        DecoratedBox(
          decoration: BoxDecoration(
            color: t.surface,
            border: Border.all(color: t.line),
            borderRadius: BorderRadius.circular(CatchRadius.md),
          ),
          child: SizedBox(
            height: 88,
            child: Center(
              child: Text(
                'Scrolling form content ${index + 1}',
                style: CatchTextStyles.supporting(context),
              ),
            ),
          ),
        ),
        gapH12,
      ],
    ],
  );

  return WidgetbookPageCatalogFrame(
    title: 'HostStepperDock',
    contractId: 'component.host.stepper_footer',
    children: [
      WidgetbookPageStateCard(
        label: 'previous and next',
        child: WidgetbookHostDeviceFrame(
          child: HostStepperDock(
            body: scrollingBody('Event basics'),
            isLastStep: false,
            isLoading: false,
            onPrimary: () {},
            onPrevious: () {},
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'review needs information',
        child: WidgetbookHostDeviceFrame(
          child: HostStepperDock(
            body: CatchFormReviewPageBody(
              fieldCopy: catchFieldCopy(context.l10n),
              statusLabelBuilder: catchFormStepStatusLabelBuilder(context.l10n),
              message:
                  'Review every section. Open a section to add or change information.',
              items: const [
                CatchFormStepReviewItem(
                  index: 0,
                  title: 'Event basics',
                  status: CatchFormStepListStatus.complete,
                ),
                CatchFormStepReviewItem(
                  index: 1,
                  title: 'Meeting location',
                  status: CatchFormStepListStatus.needsInformation,
                ),
                CatchFormStepReviewItem(
                  index: 2,
                  title: 'Live event guide',
                  status: CatchFormStepListStatus.optional,
                ),
              ],
              onStepSelected: (_) {},
            ),
            isLastStep: true,
            isLoading: false,
            primaryEnabled: false,
            primaryLabel: 'Schedule event',
            onPrimary: () {},
            onPrevious: () {},
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'last step loading',
        child: WidgetbookHostDeviceFrame(
          child: HostStepperDock(
            body: scrollingBody('Event success'),
            isLastStep: true,
            isLoading: true,
            onPrimary: () {},
            onPrevious: () {},
            lastStepLabel: 'Schedule event',
          ),
        ),
      ),
    ],
  );
}
