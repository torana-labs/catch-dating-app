import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/preview_layout_contracts.dart';
import 'package:widgetbook_workspace/primitives/contracts/shell_preview.dart';
import 'package:widgetbook_workspace/support/contract_preview.dart';

// The segmented control, sheets, notices, chart, stat and avatar states the
// host boards add. This file sorts after each contract page it extends.

Widget _state(
  BuildContext context, {
  required String label,
  required String description,
  required Widget child,
  bool night = false,
}) => WidgetbookContractStateCard(
  label: label,
  description: description,
  child: SizedBox(
    width: WidgetbookPreviewLayout.standardContractWidth,
    child: CatchRoot(
      theme: night ? CatchThemeMode.night : widgetbookThemeOf(context),
      child: child,
    ),
  ),
);

@widgetbook.UseCase(
  name: 'Board states',
  type: CatchPageTabBar,
  path: '[Core primitives]/Choices',
)
Widget catchPageTabBarBoardStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchPageTabBar.segmented',
    contractId: 'catch.tab_rail',
    states: const ['segmented', 'segmented-counts', 'segmented-scroll'],
    children: [
      _state(
        context,
        label: 'segmented',
        description: 'Insights periods: the ink pill slides.',
        child: CatchPageTabBar<String>.segmented(
          selected: '30',
          onChanged: (_) {},
          label: 'Period',
          options: const [
            CatchOption(value: '7', label: '7 days'),
            CatchOption(value: '30', label: '30 days'),
            CatchOption(value: '90', label: '90 days'),
          ],
        ),
      ),
      _state(
        context,
        label: 'segmented-counts',
        description: 'The door filters with their counts.',
        night: true,
        child: CatchPageTabBar<String>.segmented(
          selected: 'arriving',
          onChanged: (_) {},
          label: 'Show guests',
          options: const [
            CatchOption(value: 'arriving', label: 'Arriving', count: 4),
            CatchOption(value: 'in', label: 'In', count: 18),
            CatchOption(value: 'waitlist', label: 'Waitlist', count: 1),
            CatchOption(value: 'asked', label: 'Asked', count: 2),
          ],
        ),
      ),
      _state(
        context,
        label: 'segmented-scroll',
        description: 'Items at their own widths, scrolling when they overflow.',
        child: CatchPageTabBar<String>.segmented(
          selected: 'guests',
          onChanged: (_) {},
          fill: false,
          label: 'Programme views',
          options: const [
            CatchOption(value: 'schedule', label: 'Schedule'),
            CatchOption(value: 'guests', label: 'Guests'),
            CatchOption(value: 'rooms', label: 'Rooms'),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Board states',
  type: CatchSheet,
  path: '[Core primitives]/Overlays',
)
Widget catchSheetBoardStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchSheet.contained',
    contractId: 'catch.sheet',
    states: const ['contained', 'contained-floating-success'],
    children: [
      _state(
        context,
        label: 'contained',
        description: 'The date sheet docked over a dimmed screen.',
        child: SizedBox(
          height: WidgetbookPreviewLayout.wideContractWidth * 2,
          child: CatchSheet.contained(
            title: 'Pick a date',
            footer: const CatchButton(
              label: 'Use Tue 3 Nov',
              onPressed: widgetbookNoop,
              fullWidth: true,
            ),
            child: CatchCalendar(
              label: 'Pick a date',
              month: DateTime(2026, 11),
              value: DateTime(2026, 11, 3),
              onChanged: (_) {},
            ),
          ),
        ),
      ),
      _state(
        context,
        label: 'contained-floating-success',
        description:
            'A scan result floats over the scanner, which stays usable.',
        night: true,
        child: const SizedBox(
          height: WidgetbookPreviewLayout.wideContractWidth,
          child: CatchSheet.contained(
            kicker: 'Checked in',
            title: 'Dev Patel',
            tone: CatchSheetTone.success,
            scrim: false,
            footer: CatchButton(
              label: 'Next ticket',
              onPressed: widgetbookNoop,
              fullWidth: true,
            ),
            child: CatchStack(
              direction: CatchStackDirection.row,
              equal: true,
              children: [
                CatchMetricTile.stat(
                  label: 'places',
                  value: '2',
                  mode: CatchMetricTileMode.plain,
                ),
                CatchMetricTile.stat(
                  label: 'first night',
                  value: 'New',
                  mode: CatchMetricTileMode.plain,
                ),
              ],
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Board states',
  type: CatchNotice,
  path: '[Core primitives]/Feedback',
)
Widget catchNoticeBoardStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchNotice.inline',
    contractId: 'catch.notice',
    states: const ['inline-info', 'inline-success'],
    children: [
      _state(
        context,
        label: 'inline-info',
        description: 'Tickets: how payment works.',
        child: CatchNotice.inline(
          body:
              'Guests pay into your own Razorpay account. After 30 days free, '
              'Catch bills you 5% of ticket sales.',
        ),
      ),
      _state(
        context,
        label: 'inline-success',
        description: 'The door tablet: the last scan.',
        night: true,
        child: CatchNotice.inline(
          title: 'Kabir Rao is in',
          body: 'Last scan · 7:41 PM · 1 place · paid',
          tone: CatchNoticeTone.success,
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Board states',
  type: CatchBarIndicator,
  path: '[Core primitives]/Status',
)
Widget catchBarChartBoardStates(BuildContext context) {
  Widget chart({required bool partial}) => CatchBarIndicator.chart(
    label: 'Bookings each week',
    bars: [
      const CatchBarIndicatorBar(label: '6 Oct', value: 64),
      const CatchBarIndicatorBar(label: '13 Oct', value: 71),
      const CatchBarIndicatorBar(label: '20 Oct', value: 82),
      CatchBarIndicatorBar(label: '27 Oct', value: 37, partial: partial),
    ],
  );
  return WidgetbookContractFrame(
    title: 'CatchBarIndicator.chart',
    contractId: 'catch.mini_bar_chart',
    states: const ['chart', 'partial-period'],
    children: [
      _state(
        context,
        label: 'chart',
        description: 'Bookings each week on one scale.',
        child: chart(partial: false),
      ),
      _state(
        context,
        label: 'partial-period',
        description: 'This week, still filling, outlined.',
        child: chart(partial: true),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Board stat states',
  type: CatchMetricTile,
  path: '[Core primitives]/Status',
)
Widget catchStatBoardStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchMetricTile.stat',
    contractId: 'catch.metric_strip.stat_column',
    states: const ['stat-inline'],
    children: [
      _state(
        context,
        label: 'stat-inline',
        description: 'No box and a section-size value, for strips.',
        child: const CatchStack(
          direction: CatchStackDirection.row,
          equal: true,
          children: [
            CatchMetricTile.stat(
              label: 'places',
              value: '2',
              mode: CatchMetricTileMode.plain,
            ),
            CatchMetricTile.stat(
              label: 'paid on Catch',
              value: '₹998',
              mode: CatchMetricTileMode.plain,
            ),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Board states',
  type: CatchAvatar,
  path: '[Core primitives]/Avatars',
)
Widget catchAvatarBoardStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchAvatar',
    contractId: 'catch.person_avatar',
    states: const ['status-checked-in'],
    children: [
      _state(
        context,
        label: 'status-checked-in',
        description: 'A guest already in, at the door.',
        night: true,
        child: const Align(
          alignment: AlignmentDirectional.centerStart,
          child: CatchAvatar(
            size: GeneratedCatchSizeTokens.avatarLg,
            name: 'Aanya Sharma',
            status: CatchAvatarStatus.checkedIn,
          ),
        ),
      ),
    ],
  );
}
