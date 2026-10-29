import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/widgetbook_harness.dart';

import '../preview_layout_contracts.dart';

@widgetbook.UseCase(
  name: 'Interaction shapes and paint states',
  type: CatchFieldSurface,
  path: '[Core primitives]/Fields',
)
Widget fieldSurfaceStates(BuildContext context) {
  const shapes = [
    ('Rounded row', CatchFieldGeometryScopeVariant.roundedTile),
    ('Inside a section', CatchFieldGeometryScopeVariant.sectionClipped),
    ('Across the page', CatchFieldGeometryScopeVariant.fullBleedBand),
  ];
  const states = [
    ('Idle', <WidgetState>{}),
    ('Active', {WidgetState.selected}),
    ('Pressed', {WidgetState.pressed}),
    ('Active and pressed', {WidgetState.selected, WidgetState.pressed}),
    ('Keyboard focus', {WidgetState.selected, WidgetState.focused}),
    (
      'Keyboard focus and pressed',
      {WidgetState.selected, WidgetState.focused, WidgetState.pressed},
    ),
  ];
  final copy = catchFieldCopy(context.l10n);
  return WidgetbookCatalogFrame(
    title: 'Field interaction surfaces',
    catalogId: 'catch.field.surface',
    children: [
      for (final (label, shape) in shapes) ...[
        Text(label, style: CatchTextStyles.headline(context)),
        for (final (label, state) in states)
          CatchFieldGeometryScope(
            gutterOwnership: CatchFieldGeometryScopeMode.field,
            interactionShape: shape,
            interactionOutsets: EdgeInsets.zero,
            child: CatchFieldSurface(
              pressedOverlayKey: ValueKey((shape, label)),
              states: state,
              child: CatchFieldRow.standard(
                body: CatchFieldContentRow.value(
                  labelCopy: copy.label,
                  label: label,
                  value: 'Field content',
                ),
              ),
            ),
          ),
      ],
      Text('Small control focus', style: CatchTextStyles.headline(context)),
      for (final focused in [false, true])
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CatchMetadataText(
              focused ? 'focus-target-visible' : 'focus-target-hidden',
              color: CatchTokens.of(context).ink2,
            ),
            gapH8,
            CatchFieldSurface.focusTarget(
              outlineKey: ValueKey('catch-field-focus-target-$focused'),
              states: focused ? const {WidgetState.focused} : const {},
              borderRadius: BorderRadius.circular(CatchRadius.pill),
              child: SizedBox(
                width: WidgetbookPreviewLayout.fieldFocusTargetWidth,
                height: WidgetbookPreviewLayout.fieldFocusTargetHeight,
                child: Center(
                  child: Text('Target', style: CatchTextStyles.bodyM(context)),
                ),
              ),
            ),
          ],
        ),
    ],
  );
}
