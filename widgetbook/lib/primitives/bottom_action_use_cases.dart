import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/widgetbook_harness.dart';

@widgetbook.UseCase(
  name: 'Scrolling content and safe areas',
  type: CatchBottomActionOverlay,
  path: '[Core patterns]/Viewport',
)
Widget bottomActionOverlayStates(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'Actions over scrolling content',
      catalogId: 'catch.bottom_action.overlay',
      children: [
        for (final safeBottom in [0.0, 34.0]) ...[
          CatchMetadataText(
            safeBottom == 0 ? 'No bottom inset' : 'Stacked + safe area',
            color: CatchTokens.of(context).ink2,
          ),
          SizedBox(
            height: 360,
            child: MediaQuery(
              data: MediaQuery.of(
                context,
              ).copyWith(padding: EdgeInsets.only(bottom: safeBottom)),
              child: CatchBottomActionOverlay(
                body: ListView(
                  padding: CatchInsets.formStepBodyWithBottomActions,
                  children: [
                    for (var index = 0; index < 8; index++) ...[
                      Text(
                        'Content row ${index + 1}',
                        style: CatchTextStyles.bodyM(context),
                      ),
                      gapH24,
                    ],
                  ],
                ),
                meta: safeBottom == 0
                    ? null
                    : const Center(child: CatchBadge(label: 'Draft saved')),
                actions: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CatchButton(
                      label: 'Continue',
                      onPressed: () {},
                      fullWidth: true,
                    ),
                    if (safeBottom > 0) ...[
                      gapH8,
                      CatchButton(
                        label: 'Previous',
                        onPressed: () {},
                        variant: CatchButtonVariant.quiet,
                        fullWidth: true,
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ],
      ],
    );
