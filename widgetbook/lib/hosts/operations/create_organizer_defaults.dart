import 'package:catch_dating_app/hosts/presentation/organizer_management/create/widgets/organizer_host_defaults_step.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_wizard_step_header.dart';
import 'package:catch_kernel/city_catalog.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import 'fixtures.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Defaults states',
  type: OrganizerHostDefaultsStep,
  path: '[P1 product surfaces]/Host create club',
)
Widget organizerHostDefaultsStepCatalogStates(BuildContext context) {
  return const WidgetbookPageCatalogFrame(
    title: 'OrganizerHostDefaultsStep',
    contractId: 'component.host.club.host_defaults_step',
    children: [
      WidgetbookPageStateCard(
        label: 'prefilled',
        child: WidgetbookHostDeviceFrame(
          child: _OrganizerHostDefaultsStepFrame(),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Policy defaults states',
  type: OrganizerPolicyDefaultsCard,
  path: '[P1 product surfaces]/Host create club',
)
Widget organizerPolicyDefaultsCardCatalogStates(BuildContext context) {
  return const WidgetbookPageCatalogFrame(
    title: 'OrganizerPolicyDefaultsCard',
    contractId: 'component.host.club.policy_defaults_card',
    children: [
      WidgetbookPageStateCard(
        label: 'editable',
        child: WidgetbookHostDeviceFrame(
          child: _OrganizerPolicyDefaultsCardFrame(),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Header states',
  type: HostWizardStepHeader,
  path: '[P1 product surfaces]/Host create club',
)
Widget createOrganizerStepHeaderCatalogStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'CreateOrganizerStepHeader',
    contractId: 'component.host.club.step_header',
    children: [
      WidgetbookPageStateCard(
        label: 'step 1',
        child: WidgetbookHostDeviceFrame(
          child: HostWizardStepHeader(
            title: 'Club basics',
            subtitle: 'Add your club identity and media',
            currentStep: 0,
            totalSteps: 4,
            onClose: () {},
            onStepOverview: () {},
          ),
        ),
      ),
    ],
  );
}

class _OrganizerHostDefaultsStepFrame extends StatefulWidget {
  const _OrganizerHostDefaultsStepFrame();

  @override
  State<_OrganizerHostDefaultsStepFrame> createState() =>
      _OrganizerHostDefaultsStepFrameState();
}

class _OrganizerHostDefaultsStepFrameState
    extends State<_OrganizerHostDefaultsStepFrame> {
  final _formKey = GlobalKey<FormState>();
  var _defaults = widgetbookOrganizer.hostDefaults;

  @override
  Widget build(BuildContext context) {
    return OrganizerHostDefaultsStep(
      formKey: _formKey,
      defaults: _defaults,
      currencyCode: currencyCodeForCityName(widgetbookOrganizer.location),
      onChanged: (defaults) => setState(() => _defaults = defaults),
    );
  }
}

class _OrganizerPolicyDefaultsCardFrame extends StatefulWidget {
  const _OrganizerPolicyDefaultsCardFrame();

  @override
  State<_OrganizerPolicyDefaultsCardFrame> createState() =>
      _OrganizerPolicyDefaultsCardFrameState();
}

class _OrganizerPolicyDefaultsCardFrameState
    extends State<_OrganizerPolicyDefaultsCardFrame> {
  var _defaults = widgetbookOrganizer.hostDefaults.eventPolicy;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: CatchInsets.content,
      child: OrganizerPolicyDefaultsCard(
        defaults: _defaults,
        currencyCode: currencyCodeForCityName(widgetbookOrganizer.location),
        onChanged: (update) => setState(() => _defaults = update(_defaults)),
      ),
    );
  }
}
