import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/contract_preview.dart';

import '../../preview_layout_contracts.dart';

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchKickerText,
  path: '[Core primitives]/Typography',
)
Widget catchTypographyContractStates(BuildContext context) {
  final t = CatchTokens.of(context);

  return WidgetbookContractFrame(
    title: 'CatchTypography',
    contractId: 'catch.typography',
    states: const [
      'kicker-md',
      'kicker-lg',
      'kicker-field-section',
      'tinted',
      'truncated',
      'mono-label',
    ],
    children: [
      const WidgetbookContractStateCard(
        label: 'kicker-md',
        child: CatchKickerText(label: 'Today'),
      ),
      WidgetbookContractStateCard(
        label: 'kicker-lg',
        child: CatchKickerText(
          label: 'Featured format',
          variant: CatchKickerTextVariant.lg,
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'kicker-field-section',
        child: CatchKickerText(
          label: 'About you',
          variant: CatchKickerTextVariant.fieldSection,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'tinted',
        child: CatchKickerText(label: 'Social run format', color: t.primary),
      ),
      const WidgetbookContractStateCard(
        label: 'truncated',
        child: SizedBox(
          width: WidgetbookPreviewLayout.kickerTruncationWidth,
          child: CatchKickerText(label: 'Very long metadata label'),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'mono-label',
        child: WidgetbookContractWrap(
          children: [
            CatchMetadataText('6 going', color: t.ink2),
            CatchMetadataText('2.4 km away', color: t.primary),
            SizedBox(
              width: WidgetbookPreviewLayout.monoLabelTruncationWidth,
              child: CatchMetadataText(
                'A very long metadata label',
                color: t.ink3,
              ),
            ),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchIndexRow,
  path: '[Core primitives]/Lists',
)
Widget catchIndexRowContractStates(BuildContext context) {
  final t = CatchTokens.of(context);
  return WidgetbookContractFrame(
    title: 'CatchIndexRow',
    contractId: 'catch.index_row',
    states: const [
      'default',
      'selected',
      'leading',
      'trailing',
      'stacked',
      'disabled',
      'marker',
      'date',
      'progress',
      'action',
    ],
    children: [
      WidgetbookContractStateCard(
        label: 'default',
        child: CatchIndexRow(title: 'Dinner', onTap: widgetbookNoop),
      ),
      WidgetbookContractStateCard(
        label: 'selected with leading and trailing',
        child: CatchIndexRow(
          title: 'Social run',
          selected: true,
          leading: CatchStatusIndicator(color: t.accent),
          trailing: const Text('12'),
          onTap: widgetbookNoop,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'stacked with subtitle and footer',
        child: CatchIndexRow(
          title: 'Sunday Long Run',
          subtitle: '6:30 am · Carter Road jetty',
          leading: const CatchAvatar.monogram(
            size: 56,
            ground: CatchBandGround.pink,
            initials: '1',
            variant: CatchAvatarVariant.square,
          ),
          footer: CatchLegacyText(
            '₹500 · 12 spots left',
            variant: CatchLegacyTextVariant.supportingStrong,
            color: t.ink,
          ),
          trailing: Icon(CatchIcons.forward, size: CatchIconSize.sm),
          onTap: widgetbookNoop,
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'disabled',
        child: CatchIndexRow(title: 'Coming soon', onTap: null),
      ),
      const WidgetbookContractStateCard(
        label: 'marker',
        description: 'A roomy task row: a tone dot, the title and a subtitle.',
        child: CatchIndexRow(
          title: 'A place opened up',
          subtitle: 'Offer it to Nikhil, first on the waitlist',
          marker: CatchIndexRowTone.info,
          density: CatchIndexRowSize.roomy,
          onTap: null,
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'date',
        description: 'An event row led by its format-tinted date tile.',
        child: CatchIndexRow(
          title: 'Long Table Supper',
          meta: '8:00 PM · 14 of 14 booked',
          status: 'Full',
          statusTone: CatchIndexRowTone.success,
          date: CatchIndexRowDate(
            day: 'Wed',
            date: '4',
            format: CatchFormat.dinner,
          ),
          density: CatchIndexRowSize.regular,
          onTap: widgetbookNoop,
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'progress',
        description: 'Meta, status and the fill meter under the text.',
        child: CatchIndexRow(
          title: 'Carter Road Social Run',
          meta: '6:30 AM · 32 of 40 booked',
          status: '8 left',
          progress: CatchIndexRowProgress(value: 32, max: 40, label: 'Booked'),
          date: CatchIndexRowDate(
            day: 'Sun',
            date: '1',
            format: CatchFormat.run,
          ),
          density: CatchIndexRowSize.regular,
          onTap: widgetbookNoop,
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'action',
        description: 'One secondary button at the end; the row stays still.',
        child: CatchIndexRow(
          title: '2 people want in',
          subtitle: 'Ishaan and Zoya asked to join tonight',
          marker: CatchIndexRowTone.warning,
          action: CatchIndexRowAction(
            label: 'Review',
            onPressed: widgetbookNoop,
          ),
          density: CatchIndexRowSize.roomy,
          onTap: null,
        ),
      ),
    ],
  );
}
