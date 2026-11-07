@Tags(['golden'])
library;

import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/golden_pump.dart';

CatchThemeMode _themeOf(BuildContext context) =>
    Theme.of(context).brightness == Brightness.dark
    ? CatchThemeMode.night
    : CatchThemeMode.day;

Widget _frame(BuildContext context, List<Widget> children) => CatchRoot(
  theme: _themeOf(context),
  format: CatchFormat.games,
  child: Padding(
    padding: const EdgeInsets.all(CatchSpacing.s5),
    child: CatchStack(gap: CatchStackGap.g20, children: children),
  ),
);

Widget _wrap(List<Widget> children) => Wrap(
  spacing: CatchSpacing.s2,
  runSpacing: CatchSpacing.s2,
  crossAxisAlignment: WrapCrossAlignment.center,
  children: children,
);

/// Badges, chips, notices, avatars, images, the trailing button and the
/// section kicker the people, forms, organiser and onboarding boards draw.
class _Board extends StatelessWidget {
  const _Board();

  @override
  Widget build(BuildContext context) => _frame(context, [
    _wrap([
      CatchBadge(label: 'Regular', tone: CatchBadgeTone.success),
      CatchBadge(label: 'Offered', tone: CatchBadgeTone.info),
      CatchBadge(label: 'Drifting', tone: CatchBadgeTone.social),
      CatchBadge(
        label: '12 new',
        format: CatchFormat.run,
        emphasis: CatchBadgeEmphasis.solid,
      ),
      CatchBadge(
        label: 'Paid',
        tone: CatchBadgeTone.success,
        emphasis: CatchBadgeEmphasis.solid,
      ),
      CatchBadge(label: 'Live', tone: CatchBadgeTone.success, dot: true),
    ]),
    _wrap([
      CatchChip.choice(
        label: 'Everyone',
        selected: true,
        mode: CatchChipMode.single,
        onPressed: _noop,
        size: CatchChipSize.sm,
        count: 1284,
      ),
      CatchChip.link(
        label: 'Trivia regulars',
        onPressed: _noop,
        leading: Icon(CatchIcons.people),
        count: 61,
        size: CatchChipSize.sm,
      ),
      CatchChip.tag(
        label: 'Trivia regular',
        size: CatchChipSize.sm,
        dot: CatchFormat.games,
      ),
      CatchChip.filter(
        label: 'Add a tag',
        onPressed: _noop,
        leading: Icon(CatchIcons.add),
        size: CatchChipSize.sm,
      ),
    ]),
    CatchNotice.inline(
      body: 'Pick several to offer places at once.',
      tone: CatchNoticeTone.neutral,
      action: const CatchNoticeAction(label: 'Offer places', onPressed: _noop),
    ),
    _wrap([
      for (final size in CatchAvatarSize.values.take(5))
        CatchAvatar.system(
          size: size,
          name: 'Lantern Lane',
          initials: 'LL',
          color: CatchAvatarColor.games,
        ),
      CatchAvatar.system(
        size: CatchAvatarSize.lg,
        name: '?',
        initials: '?',
        color: CatchAvatarColor.indigo,
      ),
    ]),
    const Row(
      spacing: CatchSpacing.s3,
      children: [
        Expanded(
          child: CatchNetworkImage(
            '',
            aspect: 1,
            corner: CatchNetworkImageSize.md,
            placeholder: CatchNetworkImageColor.games,
          ),
        ),
        Expanded(
          child: CatchNetworkImage(
            '',
            aspect: 1,
            corner: CatchNetworkImageSize.md,
            placeholder: CatchNetworkImageColor.dinner,
          ),
        ),
        Expanded(child: SizedBox()),
      ],
    ),
    Align(
      alignment: AlignmentDirectional.centerStart,
      child: CatchButton(
        label: 'Open Razorpay',
        onPressed: _noop,
        variant: CatchButtonVariant.quiet,
        size: CatchButtonSize.sm,
        trailing: Icon(CatchIcons.openExternal),
      ),
    ),
    CatchSection(
      title: 'Around each event',
      kicker: 'For every event. Turn one off from its workspace.',
      children: const [
        CatchIndexRow(title: 'Arrival message', onTap: null),
        CatchIndexRow(title: 'Thank-you the next morning', onTap: null),
      ],
    ),
  ]);
}

void _noop() {}

class _Chat extends StatelessWidget {
  const _Chat();

  @override
  Widget build(BuildContext context) => _frame(context, const [
    CatchChatBubble(
      text: 'Hi Tara! There is a place for you on the Sunday run.',
      variant: CatchChatBubbleVariant.mine,
      time: '7:12 PM',
      status: CatchChatBubbleStatus.read,
    ),
    CatchChatBubble(
      text: 'Can I bring my sister?',
      time: '7:14 PM',
      leading: CatchAvatar(size: CatchChatBubble.leadingWidth, name: 'Tara'),
    ),
    CatchChatBubble(
      text: 'Only if she likes trivia',
      continued: true,
      time: '7:15 PM',
    ),
    CatchChatBubble(
      text: 'Doors open at 7:30.',
      variant: CatchChatBubbleVariant.host,
      time: '6:02 PM',
    ),
    CatchChatBubble(
      text: 'Kabir joined the chat',
      variant: CatchChatBubbleVariant.system,
    ),
    CatchChatBubble(
      text: 'See you there',
      variant: CatchChatBubbleVariant.mine,
      status: CatchChatBubbleStatus.failed,
    ),
  ]);
}

class _Panes extends StatelessWidget {
  const _Panes();

  @override
  Widget build(BuildContext context) => CatchRoot(
    theme: _themeOf(context),
    size: CatchWindowSize.expanded,
    child: const CatchWorkspaceHeaderLayout(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: CatchPaneHeader(
              title: 'People',
              count: 1284,
              trailing: CatchButton(
                label: 'Message',
                onPressed: _noop,
                size: CatchButtonSize.sm,
              ),
            ),
          ),
          Expanded(
            flex: 2,
            child: CatchPaneHeader(
              title: 'Rhea Kapoor',
              kicker: 'People',
              note: 'coming since March',
              back: CatchTopBarBack(label: 'Back to People'),
            ),
          ),
        ],
      ),
    ),
  );
}

void main() {
  testWidgets('wave 2 badges, chips, notices, avatars and images', (
    tester,
  ) async {
    await matchCatchGolden(
      tester,
      'wave2_board_family',
      size: const Size(390, 900),
      builder: (_) => const _Board(),
    );
  });

  testWidgets('chat bubbles by sender', (tester) async {
    await matchCatchGolden(
      tester,
      'chat_bubble_family',
      size: const Size(390, 560),
      builder: (_) => const _Chat(),
    );
  });

  testWidgets('pane headers side by side', (tester) async {
    await matchCatchGolden(
      tester,
      'pane_header_family',
      size: const Size(1024, 120),
      builder: (_) => const _Panes(),
    );
  });
}
