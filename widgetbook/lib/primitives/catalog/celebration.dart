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
      WidgetbookCatalogStateCard(
        label: 'paper confirmation',
        child: WidgetbookCatalogPhoneFrame(
          height: WidgetbookPreviewLayout.paperCelebrationViewportHeight,
          child: PaperCelebrationScaffold(
            showCloseButton: false,
            icon: CatchIcons.verified,
            eyebrow: 'Event created',
            title: 'Your event is live.',
            message:
                'Sundowner 5K, Bandra seafront is now listed on Sunday sea-face crew.',
            details: [
              CelebrationDetail(
                label: 'When',
                value: 'Sun, 22 Jun · 6:30 – 8:00 AM',
                icon: CatchIcons.date,
              ),
              CelebrationDetail(
                label: 'Where',
                value: 'Carter Road jetty, Bandra West',
                icon: CatchIcons.location,
              ),
              CelebrationDetail(
                label: 'Event',
                value: '5 km easy social run',
                icon: CatchIcons.activity,
              ),
              CelebrationDetail(
                label: 'Capacity',
                value: '10 attendees',
                icon: CatchIcons.people,
              ),
            ],
            note:
                'Bookings, waitlist, and attendance are tracked from Manage event.',
            primaryAction: CelebrationAction(
              label: 'Manage event',
              onPressed: widgetbookNoop,
            ),
            secondaryAction: CelebrationAction(
              label: 'Back to club',
              onPressed: widgetbookNoop,
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: PaperCelebrationScaffold,
  path: '[Core catalog]/Moments',
)
Widget paperCelebrationScaffoldCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'PaperCelebrationScaffold',
    catalogId: 'core.celebration.paper_scaffold',
    children: [
      WidgetbookCatalogStateCard(
        label: 'confirmation shell',
        child: WidgetbookCatalogPhoneFrame(
          height: WidgetbookPreviewLayout.paperScaffoldViewportHeight,
          child: PaperCelebrationScaffold(
            showCloseButton: false,
            icon: CatchIcons.verified,
            eyebrow: 'Event created',
            title: 'Your event is live.',
            message:
                'Sundowner 5K, Bandra seafront is now listed on Sunday sea-face crew.',
            details: _celebrationDetails,
            note:
                'Bookings, waitlist, and attendance are tracked from Manage event.',
            primaryAction: CelebrationAction(
              label: 'Manage event',
              onPressed: widgetbookNoop,
            ),
            secondaryAction: CelebrationAction(
              label: 'Back to club',
              onPressed: widgetbookNoop,
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: PaperCelebrationIcon,
  path: '[Core catalog]/Moments',
)
Widget paperCelebrationIconCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'PaperCelebrationIcon',
    catalogId: 'core.celebration.paper_icon',
    children: [
      WidgetbookCatalogStateCard(
        label: 'paper mark',
        child: Center(child: PaperCelebrationIcon(icon: CatchIcons.verified)),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: PaperCelebrationDetailsCard,
  path: '[Core catalog]/Moments',
)
Widget paperCelebrationDetailsCardCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'PaperCelebrationDetailsCard',
    catalogId: 'core.celebration.paper_details_card',
    children: [
      WidgetbookCatalogStateCard(
        label: 'event details',
        child: PaperCelebrationDetailsCard(details: _celebrationDetails),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: PaperCelebrationDetailRow,
  path: '[Core catalog]/Moments',
)
Widget paperCelebrationDetailRowCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'PaperCelebrationDetailRow',
    catalogId: 'core.celebration.paper_detail_row',
    children: [
      WidgetbookCatalogStateCard(
        label: 'icon detail',
        child: PaperCelebrationDetailRow(detail: _whenCelebrationDetail),
      ),
      WidgetbookCatalogStateCard(
        label: 'text detail',
        child: PaperCelebrationDetailRow(detail: _hostCelebrationDetail),
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
