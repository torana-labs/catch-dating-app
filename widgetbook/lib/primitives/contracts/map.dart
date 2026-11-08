import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/preview_layout_contracts.dart';
import 'package:widgetbook_workspace/primitives/contracts/shell_preview.dart';
import 'package:widgetbook_workspace/support/contract_preview.dart';

// The system MapPreview drawn without a provider: the crawl and pods boards.

Widget _state(
  BuildContext context, {
  required String label,
  required String description,
  required Widget child,
}) => WidgetbookContractStateCard(
  label: label,
  description: description,
  child: SizedBox(
    width: WidgetbookPreviewLayout.standardContractWidth,
    child: CatchRoot(
      theme: widgetbookThemeOf(context),
      format: CatchFormat.nightsOut,
      child: TickerMode(enabled: false, child: child),
    ),
  ),
);

const _crawl = [
  CatchMapPoint(x: 14, y: 72),
  CatchMapPoint(x: 40, y: 38),
  CatchMapPoint(x: 72, y: 56),
];

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchMap,
  path: '[Core primitives]/Media',
)
Widget catchMapContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchMap',
    contractId: 'catch.map',
    states: const ['pins', 'selected-pin', 'route', 'open', 'footer'],
    children: [
      _state(
        context,
        label: 'pins',
        description: 'Event-coloured dots at percent positions, labelled.',
        child: const CatchMap(
          label: 'Map of tonight, three venues',
          pins: [
            CatchMapPin(
              x: 20,
              y: 30,
              label: 'Courts',
              format: CatchFormat.courts,
            ),
            CatchMapPin(x: 55, y: 60, label: 'Quiz', format: CatchFormat.games),
            CatchMapPin(
              x: 80,
              y: 25,
              label: 'Supper',
              format: CatchFormat.dinner,
            ),
          ],
        ),
      ),
      _state(
        context,
        label: 'selected-pin',
        description: 'The selected pin is larger, its label on the colour.',
        child: const CatchMap(
          label: 'Map of the crawl, stop two selected',
          pins: [
            CatchMapPin(x: 14, y: 72, format: CatchFormat.nightsOut),
            CatchMapPin(
              x: 40,
              y: 38,
              label: 'Bar Paradiso',
              format: CatchFormat.nightsOut,
              status: CatchMapPinStatus.selected,
            ),
          ],
        ),
      ),
      _state(
        context,
        label: 'route',
        description: 'A dotted route through percent points.',
        child: const CatchMap(
          label: 'Map of the crawl route',
          route: _crawl,
          pins: [
            CatchMapPin(
              x: 14,
              y: 72,
              label: 'Start',
              format: CatchFormat.nightsOut,
            ),
            CatchMapPin(x: 72, y: 56, format: CatchFormat.nightsOut),
          ],
        ),
      ),
      _state(
        context,
        label: 'open',
        description: 'The whole map is a button that opens the full map.',
        child: const CatchMap(
          label: 'Open the run route',
          aspect: 2,
          onOpen: widgetbookNoop,
          route: _crawl,
          pins: [CatchMapPin(x: 14, y: 72, label: 'Start')],
        ),
      ),
      _state(
        context,
        label: 'footer',
        description: 'The address and a directions button under the map.',
        child: const CatchMap(
          label: 'Map of the meeting point',
          pins: [
            CatchMapPin(
              x: 50,
              y: 50,
              label: 'Carter Road gate',
              status: CatchMapPinStatus.selected,
            ),
          ],
          footer: CatchButton(
            label: 'Directions',
            onPressed: widgetbookNoop,
            variant: CatchButtonVariant.secondary,
            size: CatchButtonSize.sm,
          ),
        ),
      ),
    ],
  );
}
