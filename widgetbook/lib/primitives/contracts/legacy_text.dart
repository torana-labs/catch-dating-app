import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/contract_preview.dart';

import '../../preview_layout_contracts.dart';

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchLegacyText,
  path: '[Core primitives]/Legacy',
)
Widget catchLegacyTextContractStates(BuildContext context) {
  final t = CatchTokens.of(context);

  const variants = [
    CatchLegacyTextVariant.displayXs,
    CatchLegacyTextVariant.displayS,
    CatchLegacyTextVariant.displayM,
    CatchLegacyTextVariant.displayL,
    CatchLegacyTextVariant.displayXl,
    CatchLegacyTextVariant.displayXxl,
    CatchLegacyTextVariant.headline,
    CatchLegacyTextVariant.titleL,
    CatchLegacyTextVariant.sectionTitle,
    CatchLegacyTextVariant.titleS,
    CatchLegacyTextVariant.bodyLead,
    CatchLegacyTextVariant.bodyL,
    CatchLegacyTextVariant.bodyM,
    CatchLegacyTextVariant.bodyS,
    CatchLegacyTextVariant.supporting,
    CatchLegacyTextVariant.supportingStrong,
    CatchLegacyTextVariant.fieldLabel,
    CatchLegacyTextVariant.statusLabel,
    CatchLegacyTextVariant.metric,
  ];

  return WidgetbookContractFrame(
    title: 'CatchLegacyText',
    contractId: 'catch.text.legacy',
    states: const ['roles', 'recolored', 'clamped', 'aligned'],
    children: [
      WidgetbookContractStateCard(
        label: 'roles',
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          spacing: CatchGaps.related,
          children: [
            for (final variant in variants)
              CatchLegacyText(
                variant == CatchLegacyTextVariant.metric
                    ? '1,280'
                    : '${variant.name}: Thursday supper club',
                variant: variant,
              ),
          ],
        ),
      ),
      WidgetbookContractStateCard(
        label: 'recolored',
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          spacing: CatchGaps.inline,
          children: [
            CatchLegacyText(
              'Payment failed',
              variant: CatchLegacyTextVariant.supporting,
              color: t.danger,
            ),
            CatchLegacyText(
              'Spot confirmed',
              variant: CatchLegacyTextVariant.supporting,
              color: t.positiveText,
            ),
          ],
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'clamped',
        child: SizedBox(
          width: WidgetbookPreviewLayout.kickerTruncationWidth,
          child: CatchLegacyText(
            'A long description of the evening wraps past the line limit',
            variant: CatchLegacyTextVariant.bodyL,
            maxLines: 2,
          ),
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'aligned',
        child: SizedBox(
          width: double.infinity,
          child: CatchLegacyText(
            'Centred copy',
            variant: CatchLegacyTextVariant.bodyM,
            textAlign: TextAlign.center,
          ),
        ),
      ),
    ],
  );
}
