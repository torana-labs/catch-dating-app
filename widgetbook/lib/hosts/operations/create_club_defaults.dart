import 'package:catch_dating_app/hosts/presentation/club_management/create/widgets/club_event_success_defaults_step.dart';
import 'package:catch_dating_app/hosts/presentation/club_management/create/widgets/club_host_defaults_step.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_wizard_step_header.dart';
import 'package:catch_dating_app/kernel/city_catalog.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import 'fixtures.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Defaults states',
  type: ClubHostDefaultsStep,
  path: '[P1 product surfaces]/Host create club',
)
Widget clubHostDefaultsStepCatalogStates(BuildContext context) {
  return const WidgetbookPageCatalogFrame(
    title: 'ClubHostDefaultsStep',
    contractId: 'component.host.club.host_defaults_step',
    children: [
      WidgetbookPageStateCard(
        label: 'prefilled',
        child: WidgetbookHostDeviceFrame(child: _ClubHostDefaultsStepFrame()),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Policy defaults states',
  type: ClubPolicyDefaultsCard,
  path: '[P1 product surfaces]/Host create club',
)
Widget clubPolicyDefaultsCardCatalogStates(BuildContext context) {
  return const WidgetbookPageCatalogFrame(
    title: 'ClubPolicyDefaultsCard',
    contractId: 'component.host.club.policy_defaults_card',
    children: [
      WidgetbookPageStateCard(
        label: 'editable',
        child: WidgetbookHostDeviceFrame(child: _ClubPolicyDefaultsCardFrame()),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Event success defaults states',
  type: ClubEventSuccessDefaultsStep,
  path: '[P1 product surfaces]/Host create club',
)
Widget clubEventSuccessDefaultsStepCatalogStates(BuildContext context) {
  return const WidgetbookPageCatalogFrame(
    title: 'ClubEventSuccessDefaultsStep',
    contractId: 'component.host.club.event_success_defaults_step',
    children: [
      WidgetbookPageStateCard(
        label: 'activity-aware defaults',
        child: WidgetbookHostDeviceFrame(
          child: _ClubEventSuccessDefaultsStepFrame(),
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
Widget createClubStepHeaderCatalogStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'CreateClubStepHeader',
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

class _ClubHostDefaultsStepFrame extends StatefulWidget {
  const _ClubHostDefaultsStepFrame();

  @override
  State<_ClubHostDefaultsStepFrame> createState() =>
      _ClubHostDefaultsStepFrameState();
}

class _ClubHostDefaultsStepFrameState
    extends State<_ClubHostDefaultsStepFrame> {
  final _formKey = GlobalKey<FormState>();
  var _defaults = widgetbookClub.hostDefaults;

  @override
  Widget build(BuildContext context) {
    return ClubHostDefaultsStep(
      formKey: _formKey,
      defaults: _defaults,
      currencyCode: currencyCodeForCityName(widgetbookClub.location),
      onChanged: (defaults) => setState(() => _defaults = defaults),
    );
  }
}

class _ClubPolicyDefaultsCardFrame extends StatefulWidget {
  const _ClubPolicyDefaultsCardFrame();

  @override
  State<_ClubPolicyDefaultsCardFrame> createState() =>
      _ClubPolicyDefaultsCardFrameState();
}

class _ClubPolicyDefaultsCardFrameState
    extends State<_ClubPolicyDefaultsCardFrame> {
  var _defaults = widgetbookClub.hostDefaults.eventPolicy;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: CatchInsets.content,
      child: ClubPolicyDefaultsCard(
        defaults: _defaults,
        currencyCode: currencyCodeForCityName(widgetbookClub.location),
        onChanged: (update) => setState(() => _defaults = update(_defaults)),
      ),
    );
  }
}

class _ClubEventSuccessDefaultsStepFrame extends StatefulWidget {
  const _ClubEventSuccessDefaultsStepFrame();

  @override
  State<_ClubEventSuccessDefaultsStepFrame> createState() =>
      _ClubEventSuccessDefaultsStepFrameState();
}

class _ClubEventSuccessDefaultsStepFrameState
    extends State<_ClubEventSuccessDefaultsStepFrame> {
  final _formKey = GlobalKey<FormState>();
  var _defaults = widgetbookClub.hostDefaults;

  @override
  Widget build(BuildContext context) {
    return ClubEventSuccessDefaultsStep(
      formKey: _formKey,
      defaults: _defaults,
      onChanged: (defaults) => setState(() => _defaults = defaults),
    );
  }
}
