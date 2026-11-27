import 'package:catch_dating_app/hosts/organizer/edit/organizer_host_defaults_step.dart';
import 'package:catch_kernel/city_catalog.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import 'fixtures.dart';
import 'preview.dart';

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
