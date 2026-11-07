import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/preview_layout_contracts.dart';
import 'package:widgetbook_workspace/primitives/contracts/shell_preview.dart';
import 'package:widgetbook_workspace/support/contract_preview.dart';

// The states the events, people, forms, organiser and onboarding boards add
// to existing contracts. This file sorts after each contract page it extends,
// so the collected states keep the registry order.

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
      format: CatchFormat.games,
      child: child,
    ),
  ),
);

Widget _wrap(List<Widget> children) => Wrap(
  spacing: CatchSpacing.s2,
  runSpacing: CatchSpacing.s2,
  crossAxisAlignment: WrapCrossAlignment.center,
  children: children,
);

@widgetbook.UseCase(
  name: 'Wave 2 board states',
  type: CatchAvatar,
  path: '[Core primitives]/Media',
)
Widget catchAvatarWave2States(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchAvatar',
    contractId: 'catch.person_avatar',
    states: const ['system-sizes', 'system-colors'],
    children: [
      _state(
        context,
        label: 'system-sizes',
        description:
            'The six system sizes; from xl up the initials take '
            'the display voice.',
        child: _wrap([
          for (final size in CatchAvatarSize.values)
            CatchAvatar.system(size: size, name: 'Rhea Kapoor'),
        ]),
      ),
      _state(
        context,
        label: 'system-colors',
        description:
            'Initials on ink, indigo and the formats; a square '
            'avatar is an organiser logo.',
        child: _wrap([
          for (final color in CatchAvatarColor.values)
            CatchAvatar.system(
              size: CatchAvatarSize.lg,
              name: 'Lantern Lane',
              initials: 'LL',
              color: color,
            ),
          CatchAvatar.system(
            size: CatchAvatarSize.lg,
            name: 'Lantern Lane',
            color: CatchAvatarColor.games,
            variant: CatchAvatarVariant.square,
          ),
        ]),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Wave 2 board states',
  type: CatchBadge,
  path: '[Core primitives]/Status',
)
Widget catchBadgeWave2States(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchBadge',
    contractId: 'catch.badge',
    states: const [
      'system-tones',
      'system-solid',
      'system-format',
      'system-dot',
    ],
    children: [
      _state(
        context,
        label: 'system-tones',
        description: 'Soft tones, with info in indigo and social in pink.',
        child: _wrap(const [
          CatchBadge(label: 'Not now'),
          CatchBadge(label: 'Booked', tone: CatchBadgeTone.success),
          CatchBadge(label: 'Reviewing', tone: CatchBadgeTone.warning),
          CatchBadge(label: 'Offered', tone: CatchBadgeTone.info),
          CatchBadge(label: 'Drifting', tone: CatchBadgeTone.social),
        ]),
      ),
      _state(
        context,
        label: 'system-solid',
        description: 'The tone at full strength; neutral solid is ink.',
        child: _wrap(const [
          CatchBadge(label: 'So far', emphasis: CatchBadgeEmphasis.solid),
          CatchBadge(
            label: 'Paid',
            tone: CatchBadgeTone.success,
            emphasis: CatchBadgeEmphasis.solid,
          ),
          CatchBadge(
            label: 'New',
            tone: CatchBadgeTone.social,
            emphasis: CatchBadgeEmphasis.solid,
          ),
        ]),
      ),
      _state(
        context,
        label: 'system-format',
        description: 'A format fills the badge and wins over the tone.',
        child: _wrap(const [
          CatchBadge(
            label: '12 new',
            format: CatchFormat.run,
            emphasis: CatchBadgeEmphasis.solid,
          ),
          CatchBadge(label: 'New', format: CatchFormat.games),
        ]),
      ),
      _state(
        context,
        label: 'system-dot',
        description: 'A leading dot in the label colour.',
        child: _wrap(const [
          CatchBadge(label: 'Live', tone: CatchBadgeTone.success, dot: true),
          CatchBadge(
            label: 'Taking answers',
            tone: CatchBadgeTone.success,
            size: CatchBadgeSize.md,
            dot: true,
          ),
        ]),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Wave 2 board states',
  type: CatchButton,
  path: '[Core primitives]/Actions',
)
Widget catchButtonWave2States(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchButton',
    contractId: 'catch.button',
    states: ['trailing-icon'],
    children: [
      _state(
        context,
        label: 'trailing-icon',
        description: 'An icon after the label: open Razorpay elsewhere.',
        child: _wrap([
          CatchButton(
            label: 'Open Razorpay',
            onPressed: widgetbookNoop,
            variant: CatchButtonVariant.quiet,
            size: CatchButtonSize.sm,
            trailing: Icon(CatchIcons.openExternal),
          ),
          CatchButton(
            label: 'Connect Razorpay',
            onPressed: widgetbookNoop,
            variant: CatchButtonVariant.secondary,
            size: CatchButtonSize.md,
            trailing: Icon(CatchIcons.openExternal),
          ),
        ]),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Wave 2 board states',
  type: CatchChip,
  path: '[Core primitives]/Choices',
)
Widget catchChipWave2States(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchChip',
    contractId: 'catch.chip',
    states: const ['choice-count', 'link', 'tag-sm-dot', 'filter'],
    children: [
      _state(
        context,
        label: 'choice-count',
        description: 'Filter chips with their counts.',
        child: _wrap(const [
          CatchChip.choice(
            label: 'Everyone',
            selected: true,
            mode: CatchChipMode.single,
            onPressed: widgetbookNoop,
            count: 1284,
          ),
          CatchChip.choice(
            label: 'Regulars',
            selected: false,
            mode: CatchChipMode.single,
            onPressed: widgetbookNoop,
            count: 84,
          ),
        ]),
      ),
      _state(
        context,
        label: 'link',
        description: 'A saved group: it goes somewhere.',
        child: _wrap([
          CatchChip.link(
            label: 'Trivia regulars',
            onPressed: widgetbookNoop,
            leading: Icon(CatchIcons.people),
            count: 61,
          ),
        ]),
      ),
      _state(
        context,
        label: 'tag-sm-dot',
        description: 'Small tags, one with a format dot.',
        child: _wrap([
          CatchChip.tag(
            label: 'Trivia regular',
            size: CatchChipSize.sm,
            dot: CatchFormat.games,
          ),
          CatchChip.tag(label: 'Vegetarian', size: CatchChipSize.sm),
        ]),
      ),
      _state(
        context,
        label: 'filter',
        description: 'A plain action chip: add a tag.',
        child: _wrap([
          CatchChip.filter(
            label: 'Add a tag',
            onPressed: widgetbookNoop,
            leading: Icon(CatchIcons.add),
            size: CatchChipSize.sm,
          ),
          CatchChip.filter(
            label: 'Short answer',
            onPressed: widgetbookNoop,
            leading: Icon(CatchIcons.add),
          ),
        ]),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Wave 2 board states',
  type: CatchNotice,
  path: '[Core primitives]/Feedback',
)
Widget catchNoticeWave2States(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchNotice',
    contractId: 'catch.notice',
    states: const ['inline-neutral', 'inline-action'],
    children: [
      _state(
        context,
        label: 'inline-neutral',
        description: 'The grey notice: neither help nor a warning.',
        child: CatchNotice.inline(
          body:
              'About 62 rupees to send, at WhatsApp rates. It goes on '
              'your Catch bill.',
          tone: CatchNoticeTone.neutral,
        ),
      ),
      _state(
        context,
        label: 'inline-action',
        description: 'A quiet button under the copy.',
        child: CatchNotice.inline(
          body: 'Pick several to offer places at once.',
          tone: CatchNoticeTone.neutral,
          action: const CatchNoticeAction(
            label: 'Offer places',
            onPressed: widgetbookNoop,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Wave 2 board states',
  type: CatchField,
  path: '[Core primitives]/Fields',
)
Widget catchFieldWave2States(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchField',
    contractId: 'catch.field',
    states: const ['edit-counter-always'],
    children: [
      _state(
        context,
        label: 'edit-counter-always',
        description: 'The length counter stays painted at rest.',
        child: CatchField<void>.input(
          copy: catchFieldCopy(context.l10n),
          title: 'One line',
          initialValue: 'Quizzes, runs and suppers in Bandra',
          maxLength: 80,
          counter: CatchFieldSupportRowMode.always,
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Wave 2 board states',
  type: CatchNetworkImage,
  path: '[Core primitives]/Media',
)
Widget catchNetworkImageWave2States(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchNetworkImage',
    contractId: 'catch.network_image',
    states: const ['system-aspect-corner', 'system-placeholder'],
    children: [
      _state(
        context,
        label: 'system-aspect-corner',
        description: 'A 16 by 7 cover with medium corners.',
        child: const CatchNetworkImage(
          '',
          aspect: 16 / 7,
          corner: CatchNetworkImageSize.md,
          placeholder: CatchNetworkImageColor.games,
          semanticLabel: 'Cover photo',
        ),
      ),
      _state(
        context,
        label: 'system-placeholder',
        description: 'Square photos waiting on their pictures.',
        child: _wrap([
          for (final color in const [
            CatchNetworkImageColor.games,
            CatchNetworkImageColor.dinner,
            CatchNetworkImageColor.tile,
          ])
            SizedBox(
              width: WidgetbookPreviewLayout.compactItemWidth,
              child: CatchNetworkImage(
                '',
                aspect: 1,
                corner: CatchNetworkImageSize.md,
                placeholder: color,
              ),
            ),
        ]),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Wave 2 board states',
  type: CatchPageBody,
  path: '[Core primitives]/Layout',
)
Widget catchPageBodyWave2States(BuildContext context) {
  Widget body(CatchPageBodyGap gap) => CatchPageBody.screen(
    gap: gap,
    variant: CatchPageBodyVariant.fixed,
    children: const [
      CatchText('Tonight', variant: CatchTextVariant.sectionTitle),
      CatchText('This week', variant: CatchTextVariant.sectionTitle),
    ],
  );
  return WidgetbookContractFrame(
    title: 'CatchPageBody',
    contractId: 'catch.screen_body',
    states: const ['screen-gap-section', 'screen-gap-tight'],
    children: [
      _state(
        context,
        label: 'screen-gap-section',
        description: 'Sections straight in the body, 28 apart on a phone.',
        child: body(CatchPageBodyGap.section),
      ),
      _state(
        context,
        label: 'screen-gap-tight',
        description: 'The tight rhythm, 16 apart.',
        child: body(CatchPageBodyGap.tight),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Wave 2 board states',
  type: CatchSection,
  path: '[Core primitives]/Sections',
)
Widget catchSectionWave2States(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchSection',
    contractId: 'catch.section',
    states: const ['system-kicker'],
    children: [
      _state(
        context,
        label: 'system-kicker',
        description: 'A muted line over the title.',
        child: CatchListSection(
          title: 'Keeping people coming',
          kicker: 'Each person gets at most one of these a week.',
          children: [
            CatchIndexRow(
              title: 'We miss you',
              onTap: null,
              trailing: CatchToggleInput(
                value: true,
                onChanged: (_) {},
                semanticLabel: 'We miss you',
              ),
            ),
          ],
        ),
      ),
    ],
  );
}
