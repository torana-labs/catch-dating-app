import 'package:catch_dating_app/hosts/presentation/event_management/widgets/event_age_range_field.dart';
import 'package:catch_platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import 'preview.dart';

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
