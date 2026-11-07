import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/primitives/contracts/shell_preview.dart';
import 'package:widgetbook_workspace/support/contract_preview.dart';

/// One variant compact and wide, each at rest and once the body has scrolled.
class _Matrix extends StatelessWidget {
  const _Matrix(this.bar);

  final CatchTopBar bar;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    spacing: CatchSpacing.s3,
    children: [
      for (final (width, sizeClass) in const [
        (WidgetbookShellLayout.phone, CatchWindowSize.compact),
        (WidgetbookShellLayout.wideBar, CatchWindowSize.medium),
      ])
        for (final scrolled in const [false, true])
          WidgetbookShellWindow(
            width: width,
            sizeClass: sizeClass,
            child: Builder(
              builder: (context) => ColoredBox(
                // A subject bar sits over its hero; the tile stands in for it.
                color: bar.variant == CatchTopBarVariant.subject
                    ? CatchTokens.of(context).tile
                    : CatchTokens.of(context).ground,
                child: CatchScreenScope(
                  data: CatchScreenScopeData(scrolled: scrolled),
                  child: bar,
                ),
              ),
            ),
          ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchTopBar,
  path: '[Core primitives]/Navigation',
)
Widget catchSystemTopBarContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchTopBar',
    contractId: 'catch.top_bar',
    states: const ['tab-home', 'tool', 'subject', 'step', 'live', 'moment'],
    children: [
      for (final (label, description, bar) in [
        (
          'tab-home',
          'A tab\'s own screen: the kicker over a section title.',
          CatchTopBar(
            variant: CatchTopBarVariant.tabHome,
            kicker: 'Lantern Lane Social',
            title: 'Events',
            actions: [
              CatchIconAction.icon(
                icon: CatchIcons.search,
                tooltip: 'Search',
                onPressed: () {},
                size: GeneratedCatchSizeTokens.controlMd,
              ),
            ],
          ),
        ),
        (
          'tool',
          'A sub-screen with back, a breadcrumb and a text action.',
          CatchTopBar(
            variant: CatchTopBarVariant.tool,
            kicker: 'Rooftop Run Club',
            title: 'Edit event',
            back: CatchTopBarBack(onPressed: () {}),
            action: CatchTopBarAction(label: 'Save', onPressed: () {}),
          ),
        ),
        (
          'subject',
          'Over a hero: transparent, titles hidden until the body scrolls.',
          CatchTopBar(
            variant: CatchTopBarVariant.subject,
            title: 'Harbor Social',
            back: CatchTopBarBack(onPressed: () {}),
          ),
        ),
        (
          'step',
          'A step in a flow with its position and a segmented meter.',
          CatchTopBar(
            variant: CatchTopBarVariant.step,
            title: 'When is it?',
            back: CatchTopBarBack(onPressed: () {}),
            step: const CatchTopBarStep(
              index: 2,
              total: 5,
              label: 'Step 2 of 5',
            ),
          ),
        ),
        (
          'live',
          'The live console: the kicker under the title, the live badge.',
          CatchTopBar(
            variant: CatchTopBarVariant.live,
            title: 'Thursday social run',
            kicker: '42 checked in',
            live: 'Live · 9:04 PM',
            back: CatchTopBarBack(onPressed: () {}),
          ),
        ),
        (
          'moment',
          'A full-screen moment: close alone, at the end.',
          CatchTopBar(
            variant: CatchTopBarVariant.moment,
            back: CatchTopBarBack(close: true, onPressed: () {}),
          ),
        ),
      ])
        WidgetbookContractStateCard(
          label: label,
          description: description,
          child: _Matrix(bar),
        ),
    ],
  );
}
