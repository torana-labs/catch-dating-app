import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/theme/activity_palette.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/contract_preview.dart';

import '../../preview_layout_contracts.dart';

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchChip,
  path: '[Core primitives]/Selection',
)
Widget catchChipContractStates(BuildContext context) {
  final t = CatchTokens.of(context);
  final socialRun = ActivityPalette.resolve(context, ActivityKind.socialRun);

  return WidgetbookContractFrame(
    title: 'CatchChip',
    contractId: 'catch.chip',
    states: const [
      'tag',
      'selectable-resting',
      'selectable-selected',
      'selectable-disabled',
      'selectable-focused',
      'selectable-accented',
      'selectable-with-leading',
      'removable',
      'activity-soft',
      'activity-solid',
      'activity-tappable',
      'truncated',
      'choice-single',
      'choice-multiple',
      'choice-disabled',
    ],
    children: [
      WidgetbookContractStateCard(
        label: 'checked choices · single / multiple / disabled',
        child: WidgetbookContractWrap(
          children: [
            CatchChip.choice(
              label: 'Single',
              selected: true,
              mode: CatchChipMode.single,
              onPressed: widgetbookNoop,
            ),
            CatchChip.choice(
              label: 'Multiple',
              selected: true,
              mode: CatchChipMode.multiple,
              onPressed: widgetbookNoop,
            ),
            const CatchChip.choice(
              label: 'Disabled',
              selected: false,
              mode: CatchChipMode.multiple,
              onPressed: null,
            ),
          ],
        ),
      ),
      WidgetbookContractStateCard(
        label: 'tag',
        description: 'Passive metadata: neutral, tinted, and icon-leading.',
        child: WidgetbookContractWrap(
          children: [
            const CatchChip.tag(label: 'Tonight'),
            CatchChip.tag(
              label: 'Low key',
              tintColor: t.primarySoft,
              inkColor: t.primary,
            ),
            CatchChip.tag(label: 'Weekend', leading: Icon(CatchIcons.weekend)),
          ],
        ),
      ),
      WidgetbookContractStateCard(
        label: 'selectable states',
        description: 'Resting, selected, and disabled shown side by side.',
        child: WidgetbookContractWrap(
          children: [
            CatchChip.selectable(
              label: 'Resting',
              selected: false,
              onChanged: _ignoreBool,
            ),
            CatchChip.selectable(
              label: 'Selected',
              selected: true,
              onChanged: _ignoreBool,
            ),
            CatchChip.selectable(
              label: 'Disabled',
              selected: false,
              enabled: false,
              onChanged: _ignoreBool,
            ),
          ],
        ),
      ),
      WidgetbookContractStateCard(
        label: 'selectable options',
        description: 'Optional accent and leading icon stay semantic.',
        child: WidgetbookContractWrap(
          children: [
            CatchChip.selectable(
              label: 'Accent',
              selected: true,
              accent: t.like,
              onChanged: _ignoreBool,
            ),
            CatchChip.selectable(
              label: 'With icon',
              selected: false,
              leading: Icon(CatchIcons.like),
              onChanged: _ignoreBool,
            ),
          ],
        ),
      ),
      WidgetbookContractStateCard(
        label: 'selectable-focused',
        description:
            'Use keyboard traversal to inspect the semantic focus ring.',
        child: CatchChip.selectable(
          label: 'Keyboard focus target',
          selected: false,
          onChanged: _ignoreBool,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'removable',
        description: 'One full-chip removal action; disabled is visibly inert.',
        child: WidgetbookContractWrap(
          children: [
            CatchChip.removable(
              label: 'Rooftop',
              leading: Icon(CatchIcons.location),
              onRemove: widgetbookNoop,
            ),
            CatchChip.removable(
              label: 'Disabled',
              enabled: false,
              onRemove: widgetbookNoop,
            ),
          ],
        ),
      ),
      WidgetbookContractStateCard(
        label: 'activity emphasis',
        description: 'Soft, solid, and tappable activity identity.',
        child: WidgetbookContractWrap(
          children: [
            CatchChip.activity(
              data: CatchChipData(
                label: socialRun.label,
                icon: socialRun.glyph,
                accent: socialRun.accent,
                deep: socialRun.deep,
                soft: socialRun.soft,
              ),
            ),
            CatchChip.activity(
              data: ActivityPalette.resolve(
                context,
                ActivityKind.pickleball,
              ).chipData,
              emphasis: CatchChipEmphasis.solid,
            ),
            CatchChip.activity(
              data: ActivityPalette.resolve(
                context,
                ActivityKind.dinner,
              ).chipData,
              onTap: widgetbookNoop,
            ),
          ],
        ),
      ),
      WidgetbookContractStateCard(
        label: 'truncated',
        description: 'Long labels ellipsize inside constrained hosts.',
        child: WidgetbookContractWrap(
          children: [
            const SizedBox(
              width: WidgetbookPreviewLayout.passiveChipTruncationWidth,
              child: CatchChip.tag(label: 'A very long passive metadata label'),
            ),
            SizedBox(
              width: WidgetbookPreviewLayout.activityChipTruncationWidth,
              child: CatchChip.activity(
                data: ActivityPalette.resolve(
                  context,
                  ActivityKind.strengthTraining,
                ).chipData,
                label: 'Strength training after work',
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
  type: CatchChoiceInput,
  path: '[Core primitives]/Inputs',
)
Widget catchChoiceInputContractStates(BuildContext context) {
  const values = ['English', 'Hindi', 'Tamil', 'Marathi'];
  final t = CatchTokens.of(context);
  const options = [
    CatchOption(value: 'all', label: 'All'),
    CatchOption(value: 'going', label: 'Going'),
    CatchOption(value: 'hosting', label: 'Hosting'),
  ];
  return WidgetbookContractFrame(
    title: 'CatchChoiceInput',
    contractId: 'catch.chip.field',
    states: const [
      'single-select',
      'multi-select',
      'selected',
      'disabled',
      'semantic-keys',
      'allow-empty-selection',
      'retain-final-selection',
      'wrapped',
      'form-validation',
      'label-free',
      'described-selected',
      'described-unselected',
      'described-disabled',
      'segmented-label',
      'segmented-mono',
      'segmented-operational',
      'segmented-selected',
      'segmented-disabled',
      'segmented-accented',
      'segmented-trailing',
      'segmented-overflow',
      'segmented-summary',
    ],
    children: [
      WidgetbookContractStateCard(
        label: 'single · retains selection',
        child: CatchChoiceInput<String>(
          values: values,
          itemLabelBuilder: (value) => value,
          selected: const {'English'},
          mode: CatchChipMode.single,
          onChanged: (_) {},
        ),
      ),
      WidgetbookContractStateCard(
        label: 'multiple · may clear',
        child: CatchChoiceInput<String>(
          values: values,
          itemLabelBuilder: (value) => value,
          selected: const {'English', 'Hindi'},
          mode: CatchChipMode.multiple,
          allowEmptySelection: true,
          itemKeyBuilder: (value) => ValueKey('preview-choice-$value'),
          onChanged: (_) {},
        ),
      ),
      WidgetbookContractStateCard(
        label: 'disabled',
        child: CatchChoiceInput<String>(
          values: values,
          itemLabelBuilder: (value) => value,
          selected: const {'Hindi'},
          mode: CatchChipMode.multiple,
          onChanged: null,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'form · validation',
        child: Form(
          autovalidateMode: AutovalidateMode.always,
          child: CatchChoiceInput<String>.form(
            label: 'Languages',
            copy: catchFieldLabelTextCopy(context.l10n),
            values: values,
            itemLabelBuilder: (value) => value,
            selected: const {},
            mode: CatchChipMode.multiple,
            onValidate: (value) => value == null || value.isEmpty
                ? 'Choose at least one language'
                : null,
            onChanged: (_) {},
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'form · label supplied by surrounding content',
        child: CatchChoiceInput<String>.form(
          label: null,
          copy: catchFieldLabelTextCopy(context.l10n),
          values: values,
          itemLabelBuilder: (value) => value,
          selected: const {'English'},
          mode: CatchChipMode.single,
          onChanged: (_) {},
        ),
      ),

      WidgetbookContractStateCard(
        label: 'selected / unselected',
        child: CatchChoiceInput<String>.described(
          values: const ['open', 'invite'],
          selected: {'open'},
          onChanged: (_) {},
          itemLabelBuilder: (value) =>
              value == 'open' ? 'Open capacity' : 'Invite only',
          itemSubtitleBuilder: (value) => value == 'open'
              ? 'Anyone eligible can book until capacity.'
              : 'Only people with the invite code can book.',
        ),
      ),
      WidgetbookContractStateCard(
        label: 'disabled',
        child: CatchChoiceInput<String>.described(
          values: const ['standard'],
          selected: {'standard'},
          onChanged: null,
          itemLabelBuilder: (_) => 'Standard',
          itemSubtitleBuilder: (_) =>
              'Refunds step down as the event approaches.',
        ),
      ),

      WidgetbookContractStateCard(
        label: 'segmented · summary',
        child: CatchChoiceInput<int>.segmented(
          options: const [
            CatchOption(value: 0, label: 'All 214'),
            CatchOption(value: 1, label: 'Returning 148'),
            CatchOption(value: 2, label: 'New 19'),
          ],
          selected: 0,
          variant: CatchChoiceInputVariant.summary,
          contractExemption: 'Local Widgetbook scope preview.',
          onChanged: (_) {},
        ),
      ),
      WidgetbookContractStateCard(
        label: 'segmented · label',
        child: WidgetbookContractFieldWidth(
          child: CatchChoiceInput<String>.segmented(
            options: options,
            selected: 'all',
            onChanged: widgetbookIgnoreString,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'segmented · mono',
        child: WidgetbookContractFieldWidth(
          child: CatchChoiceInput<String>.segmented(
            options: options,
            selected: 'going',
            variant: CatchChoiceInputVariant.mono,
            onChanged: widgetbookIgnoreString,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'segmented · selected',
        child: WidgetbookContractFieldWidth(
          child: CatchChoiceInput<String>.segmented(
            options: options,
            selected: 'hosting',
            onChanged: widgetbookIgnoreString,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'segmented · operational',
        child: WidgetbookContractFieldWidth(
          child: CatchChoiceInput<String>.segmented(
            options: [
              CatchOption(value: 'now', label: 'Now', icon: CatchIcons.time),
              CatchOption(
                value: 'guests',
                label: 'Guests',
                icon: CatchIcons.people,
              ),
              CatchOption(value: 'room', label: 'Room', icon: CatchIcons.grid),
            ],
            selected: 'room',
            variant: CatchChoiceInputVariant.operational,
            onChanged: widgetbookIgnoreString,
          ),
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'segmented · disabled',
        child: WidgetbookContractFieldWidth(
          child: CatchChoiceInput<String>.segmented(
            options: options,
            selected: 'all',
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'segmented · accented',
        child: WidgetbookContractFieldWidth(
          child: CatchChoiceInput<String>.segmented(
            options: options,
            selected: 'going',
            accent: t.primary,
            onChanged: widgetbookIgnoreString,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'segmented · trailing',
        child: WidgetbookContractFieldWidth(
          child: CatchChoiceInput<String>.segmented(
            options: options,
            selected: 'all',
            trailing: const CatchBadge(label: '12'),
            onChanged: widgetbookIgnoreString,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'segmented · overflow',
        child: SizedBox(
          width: WidgetbookPreviewLayout.compactComponentWidth,
          child: CatchChoiceInput<String>.segmented(
            options: const [
              CatchOption(value: 'attending', label: 'Attending tonight'),
              CatchOption(value: 'waitlist', label: 'Waitlist'),
              CatchOption(value: 'declined', label: 'Declined invites'),
            ],
            selected: 'attending',
            onChanged: widgetbookIgnoreString,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchChoiceTile,
  path: '[Core primitives]/Selection',
)
Widget catchChoiceTileContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchChoiceTile',
    contractId: 'catch.option_card',
    states: const ['default', 'selected', 'focused', 'disabled-by-null-action'],
    children: [
      WidgetbookContractStateCard(
        label: 'default',
        child: _OptionWidth(
          child: CatchChoiceTile(
            title: 'Casual',
            onTap: widgetbookNoop,
            subtitle: 'Low commitment attendance with flexible arrival.',
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'selected',
        child: _OptionWidth(
          child: CatchChoiceTile(
            title: 'Curated',
            selected: true,
            onTap: widgetbookNoop,
            subtitle: 'Host approves each request before the event.',
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'focused',
        description:
            'Use keyboard traversal to inspect the semantic focus ring.',
        child: _OptionWidth(
          child: CatchChoiceTile(
            title: 'Keyboard focus target',
            onTap: widgetbookNoop,
            subtitle: 'The focus border is thicker without changing layout.',
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'disabled-by-null-action',
        child: const _OptionWidth(
          child: CatchChoiceTile(
            title: 'Application only',
            subtitle: 'Visible but not currently selectable.',
          ),
        ),
      ),
    ],
  );
}

void _ignoreBool(bool _) {}

class _OptionWidth extends StatelessWidget {
  const _OptionWidth({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: WidgetbookPreviewLayout.standardContractWidth,
      child: child,
    );
  }
}
