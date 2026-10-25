import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/contract_preview.dart';
import '../../support/geometry_preview.dart';

@widgetbook.UseCase(
  name: 'Geometry matrix',
  type: CatchButton,
  path: '[Geometry system]',
)
Widget buttonGeometryMatrix(BuildContext context) {
  return widgetbookGeometryPage(
    context,
    title: 'Buttons',
    contractIds: const ['catch.button', 'catch.icon_button'],
    principles: const [
      'Hierarchy changes color and border treatment, not the pill silhouette.',
      'Size changes preserve optical centering and minimum target intent.',
      'Loading and disabled states do not reflow the surrounding composition.',
    ],
    children: [
      widgetbookGeometrySpecimen(
        context,
        label: 'Hierarchy variants',
        child: Wrap(
          spacing: CatchSpacing.s3,
          runSpacing: CatchSpacing.s3,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            CatchButton(label: 'Primary', onPressed: widgetbookNoop),
            CatchButton(
              label: 'Secondary',
              variant: CatchButtonVariant.secondary,
              onPressed: widgetbookNoop,
            ),
            CatchButton(
              label: 'Ghost',
              variant: CatchButtonVariant.ghost,
              onPressed: widgetbookNoop,
            ),
            CatchButton(
              label: 'Danger',
              variant: CatchButtonVariant.danger,
              onPressed: widgetbookNoop,
            ),
            CatchButton(
              label: 'Light',
              variant: CatchButtonVariant.light,
              onPressed: widgetbookNoop,
            ),
          ],
        ),
      ),
      widgetbookGeometrySpecimen(
        context,
        label: 'Size ladder',
        child: Wrap(
          spacing: CatchSpacing.s4,
          runSpacing: CatchSpacing.s3,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            CatchButton(
              label: 'Small',
              size: CatchButtonSize.md,
              onPressed: widgetbookNoop,
            ),
            CatchButton(
              label: 'Medium',
              size: CatchButtonSize.lg,
              onPressed: widgetbookNoop,
            ),
            CatchButton(
              label: 'Large',
              size: CatchButtonSize.lg,
              onPressed: widgetbookNoop,
            ),
          ],
        ),
      ),
      widgetbookGeometrySpecimen(
        context,
        label: 'State stability',
        child: Wrap(
          spacing: CatchSpacing.s3,
          runSpacing: CatchSpacing.s3,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            const CatchButton(label: 'Disabled', onPressed: null),
            CatchButton(
              label: 'Loading',
              status: CatchButtonStatus.loading,
              onPressed: widgetbookNoop,
            ),
            CatchButton(
              label: 'With icon',
              leading: Icon(CatchIcons.calendarAdd),
              onPressed: widgetbookNoop,
            ),
          ],
        ),
      ),
      widgetbookGeometrySpecimen(
        context,
        label: 'Composition width',
        description:
            'Full-width actions fill their owner without becoming taller than the selected size token.',
        child: SizedBox(
          width: widgetbookGeometryComponentWidth,
          child: CatchButton(
            label: 'Continue',
            size: CatchButtonSize.lg,
            fullWidth: true,
            onPressed: widgetbookNoop,
          ),
        ),
      ),
    ],
  );
}
