import 'package:catch_dating_app/contexts/organizers/data/host_tracking_settings_repository.dart';
import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/hosts/presentation/host_tracking_settings_section.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_tracking_settings_input_section.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import '../../support/page_preview.dart';
import 'preview.dart';

// Insights and its report body are rebuilt under lib/hosts/insights, which
// takes no Widgetbook case: captures and body render tests cover them.

Widget _hostAnalyticsExactCatalog(BuildContext context, String focus) {
  return WidgetbookPageCatalogFrame(
    title: focus,
    contractId:
        'component.host.analytics.${widgetbookHostComponentSlug(focus)}',
    children: [
      WidgetbookPageStateCard(
        label: 'exact component',
        child: WidgetbookHostComponentFrame(
          child: _hostAnalyticsPreviewFor(focus),
        ),
      ),
    ],
  );
}

Widget _hostAnalyticsPreviewFor(String focus) {
  return switch (focus) {
    'CatchBarIndicator' => const SizedBox(
      height: WidgetbookPreviewLayout.smallPreviewExtent,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(child: CatchBarIndicator(value: 18, maxValue: 42)),
          gapW8,
          Expanded(child: CatchBarIndicator(value: 32, maxValue: 42)),
          gapW8,
          Expanded(child: CatchBarIndicator(value: 42, maxValue: 42)),
        ],
      ),
    ),
    _ => Text('No exact preview registered for $focus.'),
  };
}

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: CatchBarIndicator,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictCatchBarIndicatorCatalogStates(BuildContext context) =>
    _hostAnalyticsExactCatalog(context, 'CatchBarIndicator');

@widgetbook.UseCase(
  name: 'Mocked private settings read and save',
  type: HostTrackingSettingsSection,
  path: '[P1 product surfaces]/Host operations/Analytics',
)
Widget hostTrackingSettingsSectionState(BuildContext context) =>
    WidgetbookHostComponentFrame(
      child: HostTrackingSettingsSection(
        organizerId: HostOperationsFixtures.primaryOrganizer.id,
      ),
    );

@widgetbook.UseCase(
  name: 'Policy blocked and unclaimed configuration',
  type: HostTrackingSettingsInputSection,
  path: '[P1 product surfaces]/Host operations/Analytics',
)
Widget hostTrackingSettingsInputSectionStates(
  BuildContext context,
) => WidgetbookPageCatalogFrame(
  title: 'HostTrackingSettingsInputSection',
  contractId:
      'component.host.analytics.${widgetbookHostComponentSlug('HostTrackingSettingsInputSection')}',
  children: [
    for (final canEdit in [true, false])
      WidgetbookPageStateCard(
        label: canEdit
            ? 'disabled configuration; policy review required'
            : 'unclaimed read only',
        child: WidgetbookHostComponentFrame(
          child: HostTrackingSettingsInputSection(
            current: HostTrackingSettings(
              organizerId: HostOperationsFixtures.primaryOrganizer.id,
              revision: 0,
              metaPixelId: null,
              googleMeasurementId: null,
              enabled: false,
              publicationAllowed: false,
              canEdit: canEdit,
              editBlockedReason: canEdit ? 'none' : 'unclaimed',
            ),
            pending: false,
            onReload: () {},
            onSave:
                ({
                  required metaPixelId,
                  required googleMeasurementId,
                  required enabled,
                }) async {},
          ),
        ),
      ),
  ],
);
