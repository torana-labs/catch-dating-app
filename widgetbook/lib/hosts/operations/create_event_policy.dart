import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_defaults.dart';
import 'package:catch_dating_app/core/city_catalog.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_policy_state.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/widgets/event_age_range_field.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/widgets/event_policy_step.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/widgets/event_success_step.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import 'fixtures.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Policy step states',
  type: EventPolicyStep,
  path: '[P1 product surfaces]/Host create event',
)
Widget eventPolicyStepCatalogStates(BuildContext context) {
  return const WidgetbookPageCatalogFrame(
    title: 'EventPolicyStep',
    contractId: 'component.host.event.policy_step',
    children: [
      WidgetbookPageStateCard(
        label: 'open capacity',
        child: WidgetbookHostDeviceFrame(child: _EventPolicyStepFrame()),
      ),
      WidgetbookPageStateCard(
        label: 'invite only',
        child: WidgetbookHostDeviceFrame(
          child: _EventPolicyStepFrame(inviteOnly: true),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Age range states',
  type: EventAgeRangeField,
  path: '[P1 product surfaces]/Host create event',
)
Widget eventAgeRangeFieldCatalogStates(BuildContext context) {
  return const WidgetbookPageCatalogFrame(
    title: 'EventAgeRangeField',
    contractId: 'component.host.event.age_range_field',
    children: [
      WidgetbookPageStateCard(
        label: 'bounded editable range',
        child: WidgetbookHostDeviceFrame(child: _EventAgeRangeFieldFrame()),
      ),
      WidgetbookPageStateCard(
        label: 'unrestricted sentinels',
        child: WidgetbookHostDeviceFrame(
          child: _EventAgeRangeFieldFrame(minAge: 0, maxAge: 99),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'disabled',
        child: WidgetbookHostDeviceFrame(
          child: _EventAgeRangeFieldFrame(enabled: false),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Event success step states',
  type: EventSuccessStep,
  path: '[P1 product surfaces]/Host create event',
)
Widget eventSuccessStepCatalogStates(BuildContext context) {
  return const WidgetbookPageCatalogFrame(
    title: 'EventSuccessStep',
    contractId: 'component.host.event.success_step',
    children: [
      WidgetbookPageStateCard(
        label: 'run guide defaults',
        child: WidgetbookHostDeviceFrame(child: _EventSuccessStepFrame()),
      ),
    ],
  );
}

class _EventPolicyStepFrame extends StatefulWidget {
  const _EventPolicyStepFrame({this.inviteOnly = false});

  final bool inviteOnly;

  @override
  State<_EventPolicyStepFrame> createState() => _EventPolicyStepFrameState();
}

class _EventAgeRangeFieldFrame extends StatefulWidget {
  const _EventAgeRangeFieldFrame({
    this.minAge = 24,
    this.maxAge = 38,
    this.enabled = true,
  });

  final int minAge;
  final int maxAge;
  final bool enabled;

  @override
  State<_EventAgeRangeFieldFrame> createState() =>
      _EventAgeRangeFieldFrameState();
}

class _EventAgeRangeFieldFrameState extends State<_EventAgeRangeFieldFrame> {
  late final TextEditingController _minAgeController;
  late final TextEditingController _maxAgeController;

  @override
  void initState() {
    super.initState();
    _minAgeController = TextEditingController(
      text: widget.minAge == 0 ? '' : widget.minAge.toString(),
    );
    _maxAgeController = TextEditingController(
      text: widget.maxAge == EventAgeRangeField.maximumAge
          ? ''
          : widget.maxAge.toString(),
    );
  }

  @override
  void dispose() {
    _minAgeController.dispose();
    _maxAgeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return EventAgeRangeField(
      minAgeController: _minAgeController,
      maxAgeController: _maxAgeController,
      minimumContract:
          CatchContractConstraints.createEventCallablePayloadConstraintsMinAge,
      maximumContract:
          CatchContractConstraints.createEventCallablePayloadConstraintsMaxAge,
      initiallyOpen: true,
      enabled: widget.enabled,
    );
  }
}

class _EventPolicyStepFrameState extends State<_EventPolicyStepFrame> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _capacityController;
  late final TextEditingController _priceController;
  late final TextEditingController _inviteCodeController;
  late final TextEditingController _dynamicPricingStepController;
  late final TextEditingController _dynamicPricingMaxController;
  late final TextEditingController _minAgeController;
  late final TextEditingController _maxAgeController;
  late final TextEditingController _maxMenController;
  late final TextEditingController _maxWomenController;
  late final TextEditingController _crossPathsPairCapacityController;
  late EventAdmissionPreset _admissionPreset;
  var _cohortCapsEnabled = false;
  var _dynamicPricingEnabled = false;
  var _crossPathsPairInventoryEnabled = false;
  var _cancellationPolicyId = EventCancellationPolicyId.standard;

  @override
  void initState() {
    super.initState();
    _admissionPreset = widget.inviteOnly
        ? EventAdmissionPreset.inviteOnly
        : EventAdmissionPreset.openCapacity;
    _capacityController = TextEditingController(text: '24');
    _priceController = TextEditingController(text: '0');
    _inviteCodeController = TextEditingController(text: 'SEAFACE');
    _dynamicPricingStepController = TextEditingController(text: '250');
    _dynamicPricingMaxController = TextEditingController(text: '1500');
    _minAgeController = TextEditingController(text: '24');
    _maxAgeController = TextEditingController(text: '38');
    _maxMenController = TextEditingController(text: '12');
    _maxWomenController = TextEditingController(text: '12');
    _crossPathsPairCapacityController = TextEditingController(text: '2');
  }

  @override
  void dispose() {
    _capacityController.dispose();
    _priceController.dispose();
    _inviteCodeController.dispose();
    _dynamicPricingStepController.dispose();
    _dynamicPricingMaxController.dispose();
    _minAgeController.dispose();
    _maxAgeController.dispose();
    _maxMenController.dispose();
    _maxWomenController.dispose();
    _crossPathsPairCapacityController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return EventPolicyStep(
      formKey: _formKey,
      capacityController: _capacityController,
      priceController: _priceController,
      currencyCode: currencyCodeForCityName(widgetbookClub.location),
      inviteCodeController: _inviteCodeController,
      dynamicPricingStepController: _dynamicPricingStepController,
      dynamicPricingMaxController: _dynamicPricingMaxController,
      minAgeController: _minAgeController,
      maxAgeController: _maxAgeController,
      maxMenController: _maxMenController,
      maxWomenController: _maxWomenController,
      crossPathsPairCapacityController: _crossPathsPairCapacityController,
      admissionPreset: _admissionPreset,
      onAdmissionPresetChanged: (preset) =>
          setState(() => _admissionPreset = preset),
      cohortCapsEnabled: _cohortCapsEnabled,
      onCohortCapsEnabledChanged: (enabled) =>
          setState(() => _cohortCapsEnabled = enabled),
      crossPathsPairInventoryEnabled: _crossPathsPairInventoryEnabled,
      onCrossPathsPairInventoryChanged: (enabled) =>
          setState(() => _crossPathsPairInventoryEnabled = enabled),
      dynamicPricingEnabled: _dynamicPricingEnabled,
      onDynamicPricingChanged: (enabled) =>
          setState(() => _dynamicPricingEnabled = enabled),
      cancellationPolicyId: _cancellationPolicyId,
      onCancellationPolicyChanged: (policyId) =>
          setState(() => _cancellationPolicyId = policyId),
    );
  }
}

class _EventSuccessStepFrame extends StatefulWidget {
  const _EventSuccessStepFrame();

  @override
  State<_EventSuccessStepFrame> createState() => _EventSuccessStepFrameState();
}

class _EventSuccessStepFrameState extends State<_EventSuccessStepFrame> {
  var _defaults = const EventSuccessDefaults();

  @override
  Widget build(BuildContext context) {
    return EventSuccessStep(
      organizerId: widgetbookClub.id,
      activityKind: ActivityKind.socialRun,
      eventSuccessDefaults: _defaults,
      targetAttendeeCount: 24,
      onEventSuccessDefaultsChanged: (defaults) =>
          setState(() => _defaults = defaults),
    );
  }
}
