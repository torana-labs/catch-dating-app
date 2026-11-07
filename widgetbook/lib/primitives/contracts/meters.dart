import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/preview_layout_contracts.dart';
import 'package:widgetbook_workspace/primitives/contracts/shell_preview.dart';
import 'package:widgetbook_workspace/support/contract_preview.dart';

// The system Marker, Meter and Calendar: the dots, bars and month grid the
// host boards draw.

Widget _state(
  BuildContext context, {
  required String label,
  required String description,
  required Widget child,
  bool night = false,
  CatchFormat? format,
}) => WidgetbookContractStateCard(
  label: label,
  description: description,
  child: SizedBox(
    width: WidgetbookPreviewLayout.standardContractWidth,
    child: CatchRoot(
      theme: night ? CatchThemeMode.night : widgetbookThemeOf(context),
      format: format,
      child: child,
    ),
  ),
);

Widget _row(List<Widget> children) => CatchStack(
  direction: CatchStackDirection.row,
  gap: CatchStackGap.g12,
  align: CatchStackAlign.center,
  children: children,
);

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchMarker,
  path: '[Core primitives]/Status',
)
Widget catchMarkerContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchMarker',
    contractId: 'catch.marker',
    states: const ['dot', 'ring', 'check', 'number', 'tones', 'format', 'live'],
    children: [
      _state(
        context,
        label: 'dot',
        description: 'A status light in three sizes.',
        child: _row(const [
          CatchMarker(size: CatchMarkerSize.sm),
          CatchMarker(),
          CatchMarker(size: CatchMarkerSize.lg),
        ]),
      ),
      _state(
        context,
        label: 'ring',
        description: 'A plan step not reached yet.',
        child: _row(const [
          CatchMarker(
            variant: CatchMarkerVariant.ring,
            size: CatchMarkerSize.lg,
          ),
        ]),
      ),
      _state(
        context,
        label: 'check',
        description: 'A step done.',
        child: _row(const [CatchMarker(variant: CatchMarkerVariant.check)]),
      ),
      _state(
        context,
        label: 'number',
        description: 'The editor step rail: the current step in ink.',
        child: _row(const [
          CatchMarker.number(1),
          CatchMarker.number(2, tone: CatchMarkerTone.muted),
        ]),
      ),
      _state(
        context,
        label: 'tones',
        description: 'Ink, muted, success, warning, danger and info.',
        child: _row(const [
          CatchMarker(),
          CatchMarker(tone: CatchMarkerTone.muted),
          CatchMarker(tone: CatchMarkerTone.success),
          CatchMarker(tone: CatchMarkerTone.warning),
          CatchMarker(tone: CatchMarkerTone.danger),
          CatchMarker(tone: CatchMarkerTone.info),
        ]),
      ),
      _state(
        context,
        label: 'format',
        description: 'The format tone takes the root format.',
        format: CatchFormat.games,
        child: _row(const [CatchMarker(tone: CatchMarkerTone.format)]),
      ),
      _state(
        context,
        label: 'live',
        description:
            'The step happening now pulses; still under reduced motion.',
        night: true,
        format: CatchFormat.games,
        child: _row(const [
          CatchMarker(
            tone: CatchMarkerTone.format,
            size: CatchMarkerSize.lg,
            live: true,
          ),
        ]),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchMeter,
  path: '[Core primitives]/Status',
)
Widget catchMeterContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchMeter',
    contractId: 'catch.meter',
    states: const [
      'progress',
      'cap',
      'segments',
      'stack',
      'on-colour',
      'labelled',
    ],
    children: [
      _state(
        context,
        label: 'progress',
        description: 'The door: how many are in.',
        child: const CatchMeter(value: 19, max: 26, label: 'Checked in'),
      ),
      _state(
        context,
        label: 'cap',
        description: 'The Catch bill against its monthly cap.',
        child: const CatchMeter(
          value: 64,
          limit: 80,
          variant: CatchMeterVariant.cap,
          label: 'This cycle',
        ),
      ),
      _state(
        context,
        label: 'segments',
        description: 'Step 2 of 4, 4 px thick.',
        child: const CatchMeter(
          value: 2,
          max: 4,
          variant: CatchMeterVariant.segments,
          size: CatchMeterSize.sm,
          label: 'Step 2 of 4',
        ),
      ),
      _state(
        context,
        label: 'stack',
        description: 'Where bookings came from, with its legend.',
        child: const CatchMeter(
          value: 100,
          variant: CatchMeterVariant.stack,
          label: 'Where bookings came from',
          parts: [
            CatchMeterPart(label: 'Instagram bio', value: 61),
            CatchMeterPart(
              label: 'WhatsApp',
              value: 22,
              color: CatchMeterPartColor.courts,
            ),
            CatchMeterPart(
              label: 'Direct',
              value: 11,
              color: CatchMeterPartColor.games,
            ),
            CatchMeterPart(
              label: 'Other',
              value: 6,
              color: CatchMeterPartColor.muted,
            ),
          ],
        ),
      ),
      _state(
        context,
        label: 'on-colour',
        description: 'Inside a format spotlight the fill turns ink.',
        child: const CatchSurface(
          block: CatchSurfaceBlock.spotlight,
          color: CatchSurfaceColor.games,
          child: CatchMeter(value: 60, label: 'Time in this step'),
        ),
      ),
      _state(
        context,
        label: 'labelled',
        description: 'The label shown above the track.',
        child: const CatchMeter(
          value: 32,
          max: 40,
          label: 'Booked',
          showLabel: true,
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchCalendar,
  path: '[Core primitives]/Inputs',
)
Widget catchCalendarContractStates(BuildContext context) {
  Widget calendar({
    DateTime? value,
    DateTime? min,
    List<DateTime> marked = const [],
    List<DateTime> repeats = const [],
    bool legend = false,
  }) => CatchCalendar(
    label: 'Pick a date',
    month: DateTime(2026, 11),
    value: value,
    min: min,
    marked: marked,
    repeats: repeats,
    onChanged: (_) {},
    markedLabel: legend ? 'You already have something on' : null,
    repeatsLabel: legend ? 'Rings show the next weekly dates' : null,
  );
  return WidgetbookContractFrame(
    title: 'CatchCalendar',
    contractId: 'catch.calendar',
    states: const [
      'month',
      'selected',
      'min',
      'marked',
      'repeats',
      'legend',
      'night',
    ],
    children: [
      _state(
        context,
        label: 'month',
        description: 'November, Monday first, with the month arrows.',
        child: calendar(),
      ),
      _state(
        context,
        label: 'selected',
        description: 'The chosen day in ink.',
        child: calendar(value: DateTime(2026, 11, 3)),
      ),
      _state(
        context,
        label: 'min',
        description: 'Days before the first bookable day are muted.',
        child: calendar(min: DateTime(2026, 11, 10)),
      ),
      _state(
        context,
        label: 'marked',
        description: 'A dot where something is already on.',
        child: calendar(marked: [DateTime(2026, 11, 1), DateTime(2026, 11, 4)]),
      ),
      _state(
        context,
        label: 'repeats',
        description: 'Rings on the next weekly dates.',
        child: calendar(
          value: DateTime(2026, 11, 3),
          repeats: [DateTime(2026, 11, 10), DateTime(2026, 11, 17)],
        ),
      ),
      _state(
        context,
        label: 'legend',
        description: 'The legend for the dot and the ring.',
        child: calendar(
          value: DateTime(2026, 11, 3),
          marked: [DateTime(2026, 11, 4)],
          repeats: [DateTime(2026, 11, 10)],
          legend: true,
        ),
      ),
      _state(
        context,
        label: 'night',
        description: 'On a night screen.',
        night: true,
        child: calendar(
          value: DateTime(2026, 11, 3),
          min: DateTime(2026, 10, 27),
        ),
      ),
    ],
  );
}
