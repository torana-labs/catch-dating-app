import 'package:catch_dating_app/pages/celebration/celebration_effects_controller.dart';
import 'package:catch_dating_app/pages/celebration/celebration_screen.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/catalog_preview.dart';
import 'package:widgetbook_workspace/support/contract_preview.dart';

import '../../preview_layout_contracts.dart';
import '../../support/widgetbook_harness.dart';

@widgetbook.UseCase(
  name: 'Catalog states',
  type: CelebrationScreen,
  path: '[Core catalog]/Moments',
)
Widget catchCelebrationScreenCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'CelebrationScreen',
    catalogId: 'core.celebration.catch_celebration_screen',
    children: [
      WidgetbookCatalogStateCard(
        label: 'full-screen moment',
        child: WidgetbookCatalogPhoneFrame(
          height: WidgetbookPreviewLayout.celebrationViewportHeight,
          child: CelebrationScreen(
            kind: CelebrationMomentKind.eventJoined,
            playEffects: false,
            eyebrow: 'You are in',
            title: 'Spot booked',
            message: 'We saved your place for Bandra easy 5K.',
            details: [
              CelebrationDetail(
                label: 'When',
                value: 'Tonight at 7:30 PM',
                icon: CatchIcons.addToCalendar,
              ),
              CelebrationDetail(
                label: 'Where',
                value: 'Carter Road promenade',
                icon: CatchIcons.location,
              ),
            ],
            note: 'Matching opens after check-in.',
            primaryAction: CelebrationAction(
              label: 'View event',
              onPressed: widgetbookNoop,
              icon: Icon(CatchIcons.event),
            ),
            secondaryAction: CelebrationAction(
              label: 'Invite a friend',
              onPressed: widgetbookNoop,
              icon: Icon(CatchIcons.share),
              variant: CatchButtonVariant.secondary,
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: CelebrationIcon,
  path: '[Core catalog]/Moments',
)
Widget celebrationIconCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'CelebrationIcon',
    catalogId: 'core.celebration.immersive_icon',
    children: [
      WidgetbookCatalogStateCard(
        label: 'immersive mark',
        child: _ImmersiveCelebrationFrame(
          child: CelebrationIcon(icon: CatchIcons.check),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: CelebrationDetailsCard,
  path: '[Core catalog]/Moments',
)
Widget celebrationDetailsCardCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'CelebrationDetailsCard',
    catalogId: 'core.celebration.immersive_details_card',
    children: [
      WidgetbookCatalogStateCard(
        label: 'full-screen details',
        child: _ImmersiveCelebrationFrame(
          child: CelebrationDetailsCard(details: _celebrationDetails),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: CelebrationDetailRow,
  path: '[Core catalog]/Moments',
)
Widget celebrationDetailRowCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'CelebrationDetailRow',
    catalogId: 'core.celebration.immersive_detail_row',
    children: [
      WidgetbookCatalogStateCard(
        label: 'icon detail',
        child: _ImmersiveCelebrationFrame(
          child: CelebrationDetailRow(detail: _whenCelebrationDetail),
        ),
      ),
      WidgetbookCatalogStateCard(
        label: 'text detail',
        child: _ImmersiveCelebrationFrame(
          child: CelebrationDetailRow(detail: _hostCelebrationDetail),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: CelebrationNotice,
  path: '[Core catalog]/Moments',
)
Widget celebrationNoteCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'CelebrationNotice',
    catalogId: 'core.celebration.immersive_note',
    children: [
      WidgetbookCatalogStateCard(
        label: 'supporting note',
        child: _ImmersiveCelebrationFrame(
          child: CelebrationNotice(note: 'Matching opens after check-in.'),
        ),
      ),
    ],
  );
}

class _ImmersiveCelebrationFrame extends StatelessWidget {
  const _ImmersiveCelebrationFrame({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return DecoratedBox(
      decoration: BoxDecoration(gradient: t.heroGrad),
      child: Padding(
        padding: const EdgeInsets.all(CatchSpacing.s4),
        child: child,
      ),
    );
  }
}

final _whenCelebrationDetail = CelebrationDetail(
  label: 'When',
  value: 'Sun, 22 Jun - 6:30 AM',
  icon: CatchIcons.date,
);

const _hostCelebrationDetail = CelebrationDetail(
  label: 'Host',
  value: 'Sunday sea-face crew',
);

final _celebrationDetails = [
  _whenCelebrationDetail,
  CelebrationDetail(
    label: 'Where',
    value: 'Carter Road jetty',
    icon: CatchIcons.location,
  ),
  _hostCelebrationDetail,
];
