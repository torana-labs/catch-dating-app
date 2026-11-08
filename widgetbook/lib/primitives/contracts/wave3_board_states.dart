import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/preview_layout_contracts.dart';
import 'package:widgetbook_workspace/primitives/contracts/shell_preview.dart';
import 'package:widgetbook_workspace/support/contract_preview.dart';

// The states the programme and formats boards add to existing contracts.
// This file sorts after each contract page it extends, so the collected
// states keep the registry order.

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
      child: child,
    ),
  ),
);

@widgetbook.UseCase(
  name: 'Wave 3 board states',
  type: CatchBadge,
  path: '[Core primitives]/Status',
)
Widget catchBadgeWave3States(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchBadge',
    contractId: 'catch.badge',
    states: const ['system-outline'],
    children: [
      _state(
        context,
        label: 'system-outline',
        description:
            'No fill under a dashed edge: a reply still waiting, read '
            'aloud through its semantic label.',
        child: const Wrap(
          spacing: CatchSpacing.s2,
          children: [
            CatchBadge(
              label: '?',
              emphasis: CatchBadgeEmphasis.outline,
              semanticLabel: 'No reply yet',
            ),
            CatchBadge(label: '4 of 6', emphasis: CatchBadgeEmphasis.outline),
          ],
        ),
      ),
    ],
  );
}

const _householdColumns = [
  CatchTableColumn(
    label: 'Household',
    flex: 2,
    variant: CatchTableColumnVariant.title,
  ),
  CatchTableColumn(label: 'Guests', variant: CatchTableColumnVariant.number),
  CatchTableColumn(label: 'Reply', variant: CatchTableColumnVariant.badge),
];

@widgetbook.UseCase(
  name: 'Wave 3 board states',
  type: CatchTable,
  path: '[Core primitives]/Data display',
)
Widget catchTableWave3States(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchTable',
    contractId: 'catch.table',
    states: const ['data-cells', 'number-column'],
    children: [
      _state(
        context,
        label: 'data-cells',
        description:
            'Rows as data: a title with its household side, a figure and '
            'a reply badge; the row opens on tap.',
        child: CatchTable(
          label: 'Guests by household',
          columns: _householdColumns,
          children: [
            CatchTableRow.cells(
              onTap: widgetbookNoop,
              cells: const [
                CatchTableCell.title('The Mehras', subtitle: 'Bride side'),
                CatchTableCell.number(6),
                CatchTableCell.badge(
                  CatchBadge(label: 'Yes', tone: CatchBadgeTone.success),
                ),
              ],
            ),
            const CatchTableRow.cells(
              cells: [
                CatchTableCell.title('Farhan Qureshi', subtitle: 'Friends'),
                CatchTableCell.number(2),
                CatchTableCell.badge(
                  CatchBadge(label: '?', emphasis: CatchBadgeEmphasis.outline),
                ),
              ],
            ),
          ],
        ),
      ),
      _state(
        context,
        label: 'number-column',
        description:
            'A number column places its label and figures at the end; '
            'a text cell can take a tone.',
        child: const CatchTable(
          columns: [
            CatchTableColumn(label: 'Trip', flex: 2),
            CatchTableColumn(
              label: 'Seats',
              variant: CatchTableColumnVariant.number,
            ),
          ],
          children: [
            CatchTableRow.cells(
              cells: [
                CatchTableCell.text('Airport to Taj, 11:40'),
                CatchTableCell.number(1284, text: '1,284'),
              ],
            ),
            CatchTableRow.cells(
              cells: [
                CatchTableCell.text(
                  'Two guests missing',
                  tone: CatchTableCellTone.warning,
                ),
                CatchTableCell.number(7),
              ],
            ),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Wave 3 board states',
  type: CatchChatBubble,
  path: '[Core primitives]/Feedback',
)
Widget catchChatBubbleWave3States(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchChatBubble',
    contractId: 'catch.chat_bubble',
    states: const ['author', 'footer'],
    children: [
      _state(
        context,
        label: 'author',
        description:
            'Group chats name the sender over the first bubble of a run '
            'and draw the avatar from the author.',
        child: const Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            CatchChatBubble(
              text: 'Moving to stop two in five minutes.',
              variant: CatchChatBubbleVariant.host,
              format: CatchFormat.nightsOut,
              author: CatchChatAuthor(name: 'Asha', note: 'host'),
              time: '9:40 PM',
            ),
            CatchChatBubble(
              text: 'Saving us a table?',
              author: CatchChatAuthor(name: 'Kabir'),
              time: '9:41 PM',
            ),
          ],
        ),
      ),
      _state(
        context,
        label: 'footer',
        description: 'An attachment, a card or buttons under the bubble.',
        child: CatchChatBubble(
          text: 'Here is where we are',
          author: const CatchChatAuthor(name: 'Kabir'),
          footer: CatchBadge(
            label: 'Location shared',
            icon: CatchIcons.location,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Wave 3 board states',
  type: CatchChoiceTile,
  path: '[Core primitives]/Selection',
)
Widget catchChoiceTileWave3States(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchChoiceTile',
    contractId: 'catch.option_card',
    states: const ['attention', 'vacant'],
    children: [
      _state(
        context,
        label: 'attention',
        description: 'The games yellow ring: this room needs the planner.',
        child: const FractionallySizedBox(
          alignment: AlignmentDirectional.centerStart,
          widthFactor: 0.5,
          child: CatchChoiceTile(
            title: '216',
            subtitle: 'Mehra · Dadi',
            meta: 'Twin',
            variant: CatchChoiceTileVariant.tile,
            emphasis: CatchChoiceTileEmphasis.attention,
            onTap: widgetbookNoop,
          ),
        ),
      ),
      _state(
        context,
        label: 'vacant',
        description: 'A dashed edge: a free room that can be taken.',
        child: const FractionallySizedBox(
          alignment: AlignmentDirectional.centerStart,
          widthFactor: 0.5,
          child: CatchChoiceTile(
            title: '222',
            subtitle: 'Free',
            meta: 'King',
            variant: CatchChoiceTileVariant.tile,
            emphasis: CatchChoiceTileEmphasis.vacant,
            onTap: widgetbookNoop,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Wave 3 board states',
  type: CatchNotice,
  path: '[Core primitives]/Feedback',
)
Widget catchNoticeWave3States(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchNotice',
    contractId: 'catch.notice',
    states: const ['inline-footer'],
    children: [
      _state(
        context,
        label: 'inline-footer',
        description: 'Two buttons under the copy, in place of one action.',
        child: CatchNotice.inline(
          title: 'Kabir landed early',
          body: 'Flight AI 865 is on the ground. No car is there yet.',
          tone: CatchNoticeTone.warning,
          footer: const Wrap(
            spacing: CatchSpacing.s2,
            children: [
              CatchButton(
                label: 'Call them',
                onPressed: widgetbookNoop,
                variant: CatchButtonVariant.secondary,
                size: CatchButtonSize.sm,
              ),
              CatchButton(
                label: 'Tell the planner',
                onPressed: widgetbookNoop,
                variant: CatchButtonVariant.quiet,
                size: CatchButtonSize.sm,
              ),
            ],
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Wave 3 board states',
  type: CatchDock,
  path: '[Core primitives]/Product composites',
)
Widget catchDockWave3States(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchDock',
    contractId: 'catch.bottom_action',
    states: const ['header', 'accent-primary'],
    children: [
      _state(
        context,
        label: 'header',
        description: 'A status line above the actions: the door is offline.',
        child: const CatchDock(
          placement: CatchDockPlacement.bar,
          header: CatchBadge(
            label: 'Offline · 3 check-ins to send',
            tone: CatchBadgeTone.warning,
            dot: true,
          ),
          primary: CatchDockAction(
            label: 'Scan the next guest',
            onPressed: widgetbookNoop,
          ),
        ),
      ),
      _state(
        context,
        label: 'accent-primary',
        description: 'The primary in the event colour, for the reveal.',
        child: const CatchDock(
          placement: CatchDockPlacement.bar,
          primary: CatchDockAction(
            label: 'Reveal the tables',
            onPressed: widgetbookNoop,
            emphasis: CatchDockActionEmphasis.accent,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Wave 3 board states',
  type: CatchTabBarIdentity,
  path: '[Core primitives]/Navigation',
)
Widget catchTabBarIdentityWave3States(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchTabBarIdentity',
    contractId: 'catch.tab_bar.identity',
    states: const ['leading-avatar'],
    children: [
      _state(
        context,
        label: 'leading-avatar',
        description: 'A square organisation avatar in the leading slot.',
        child: SizedBox(
          width: WidgetbookShellLayout.sidebarSlot,
          child: CatchTabBarIdentity(
            name: 'Torana Weddings',
            note: 'Switch planner',
            switcher: true,
            leading: CatchAvatar.system(
              size: CatchAvatarSize.sm,
              name: 'Torana Weddings',
              color: CatchAvatarColor.nightsOut,
              variant: CatchAvatarVariant.square,
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Wave 3 board states',
  type: CatchRangeInput,
  path: '[Core primitives]/Inputs',
)
Widget catchRangeInputWave3States(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchRangeInput',
    contractId: 'catch.range_slider',
    states: const ['single-value'],
    children: [
      _state(
        context,
        label: 'single-value',
        description:
            'One value on the same track is CatchSliderInput, a member of '
            'this record.',
        child: CatchSliderInput(value: 40, onChanged: (_) {}),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchSliderInput,
  path: '[Core primitives]/Inputs',
)
Widget catchSliderInputContractStates(BuildContext context) {
  String rounds(double value) => '${value.round()} rounds';
  return WidgetbookContractFrame(
    title: 'CatchSliderInput',
    contractId: 'catch.range_slider.single',
    states: const ['single-value', 'divided', 'value-label', 'disabled'],
    children: [
      _state(
        context,
        label: 'single-value',
        description: 'A free value on the Catch track.',
        child: CatchSliderInput(value: 40, onChanged: (_) {}),
      ),
      _state(
        context,
        label: 'divided',
        description: 'Three steps: three, four or five rounds.',
        child: CatchSliderInput(
          value: 4,
          min: 3,
          max: 5,
          divisions: 2,
          onChanged: (_) {},
        ),
      ),
      _state(
        context,
        label: 'value-label',
        description: 'A label at the start and the value at the end.',
        child: CatchSliderInput(
          value: 4,
          min: 3,
          max: 5,
          divisions: 2,
          label: 'Rounds',
          valueLabelBuilder: rounds,
          onChanged: (_) {},
        ),
      ),
      _state(
        context,
        label: 'disabled',
        description: 'A null onChanged locks the thumb.',
        child: CatchSliderInput(
          value: 4,
          min: 3,
          max: 5,
          divisions: 2,
          label: 'Rounds',
          valueLabelBuilder: rounds,
          onChanged: null,
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Wave 3 board states',
  type: CatchField,
  path: '[Core primitives]/Fields',
)
Widget catchFieldWave3States(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchField',
    contractId: 'catch.field',
    states: const ['slider'],
    children: [
      _state(
        context,
        label: 'slider',
        description:
            'A disclosure holding one slider; the value shows in the row.',
        child: CatchField<void>.slider(
          copy: catchFieldCopy(context.l10n),
          title: 'Rounds',
          value: 4,
          min: 3,
          max: 5,
          divisions: 2,
          valueLabelBuilder: (value) => '${value.round()} rounds',
          onChanged: (_) {},
          disclosureMode: CatchFieldMode.localExpanded,
        ),
      ),
    ],
  );
}
