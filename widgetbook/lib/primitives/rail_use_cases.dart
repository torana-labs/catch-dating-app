import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/widgetbook_harness.dart';

@widgetbook.UseCase(
  name: 'Bounded and intrinsic rails',
  type: CatchHorizontalScrollView,
  path: '[Core primitives]/Sections',
)
Widget horizontalScrollViewStates(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'Horizontal rail viewport',
      catalogId: 'catch.section.horizontal_rail_body',
      children: [
        for (final height in <double?>[110, null])
          CatchHorizontalScrollView(
            height: height,
            spacing: CatchSpacing.s3,
            listPadding: EdgeInsets.zero,
            itemCount: 3,
            itemWidth: const CatchRailItemWidth.fixed(160),
            itemBuilder: (context, index) => CatchSurface.card(
              height: height == null ? 84 : 110,
              child: Text(
                'Item ${index + 1}',
                style: CatchTextStyles.statusLabel(context),
              ),
            ),
            footer: CatchButton(label: 'More', onPressed: () {}),
          ),
      ],
    );
