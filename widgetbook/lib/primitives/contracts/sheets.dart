import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/organizers/presentation/detail/widgets/organizer_detail_dock.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/contract_preview.dart';

import '../../preview_layout_contracts.dart';

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchSheet,
  path: '[Core primitives]/Sheets and footers',
)
Widget catchSheetContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchSheet',
    contractId: 'catch.sheet',
    states: const [
      'plain',
      'branded',
      'badge',
      'action',
      'keyboard-safe',
      'scrollable',
      'without-grabber',
      'filter',
    ],
    children: [
      WidgetbookContractStateCard(
        label: 'filter',
        child: CatchSheet.filter(
          title: 'Filters',
          closeLabel: 'Close',
          onClose: widgetbookNoop,
          child: CatchSection.choiceGroup(
            first: true,
            title: 'Purpose',
            child: CatchChoiceInput<String>(
              values: const ['Application', 'Registration', 'Intake'],
              selected: const {'Application', 'Intake'},
              itemLabelBuilder: (value) => value,
              mode: CatchChipMode.multiple,
              allowEmptySelection: true,
              onChanged: (_) {},
            ),
          ),
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'plain',
        child: CatchSheet(
          title: 'Invite guests',
          subtitle: 'Share this event with people who fit the format.',
          child: CatchSurface.tinted(child: Text('Invites close at 6 PM.')),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'branded',
        child: CatchSheet(
          glyph: CatchIcons.sparkle,
          title: 'Good fit',
          subtitle: 'Guests will see this before joining.',
          child: Text('Keep it social, specific, and short.'),
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'badge',
        child: CatchSheet(
          title: 'Invite guests',
          badge: 'Host',
          child: Text('Host-only invite controls.'),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'action',
        child: CatchSheet(
          title: 'Invite guests',
          footer: CatchButton(
            label: 'Copy invite link',
            fullWidth: true,
            onPressed: widgetbookNoop,
          ),
          child: const Text('Copy a shareable invite link.'),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'keyboard-safe',
        child: CatchSheet(
          title: 'Arrival note',
          keyboardSafe: true,
          child: CatchField.input(
            copy: catchFieldCopy(context.l10n),
            title: 'Note',
            initialValue: 'Meet beside the cafe entrance.',
          ),
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'without-grabber',
        child: CatchSheet(
          title: 'Embedded sheet',
          grabber: false,
          child: Text('Used when a parent already owns the grab handle.'),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'scrollable',
        child: SizedBox(
          height: WidgetbookPreviewLayout.stateViewportHeight,
          child: CatchSheet(
            title: 'Review answers',
            mode: CatchSheetMode.scrollable,
            child: Column(
              children: [
                for (var i = 0; i < 12; i++)
                  CatchField.read(
                    copy: catchFieldCopy(context.l10n),
                    title: 'Question ${i + 1}',
                    body: 'Submitted answer',
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
  name: 'Plain header states',
  type: CatchSheetHeader,
  path: '[Core primitives]/Sheets and footers',
)
Widget catchPlainSheetHeaderContractStates(BuildContext context) {
  return const WidgetbookContractFrame(
    title: 'CatchSheetHeader',
    contractId: 'catch.sheet.header',
    states: ['title-subtitle', 'trailing', 'title-only'],
    children: [
      WidgetbookContractStateCard(
        label: 'title-subtitle',
        child: CatchSheetHeader(
          title: 'Invite guests',
          subtitle: 'Share this event with people who fit the format.',
        ),
      ),
      WidgetbookContractStateCard(
        label: 'trailing',
        child: CatchSheetHeader(
          title: 'Filters',
          subtitle: 'Tune what shows up first.',
          trailing: CatchBadge(label: '2', tone: CatchBadgeTone.gold),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'title-only',
        child: CatchSheetHeader(title: 'Embedded sheet'),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Branded header states',
  type: CatchSheetHeader,
  path: '[Core primitives]/Sheets and footers',
)
Widget catchBrandedSheetHeaderContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchSheetHeader.branded',
    contractId: 'catch.sheet.header',
    states: const ['title-subtitle', 'trailing', 'title-only'],
    children: [
      WidgetbookContractStateCard(
        label: 'title-subtitle',
        child: CatchSheetHeader.branded(
          glyph: CatchIcons.sparkle,
          title: 'Good fit',
          subtitle: 'Guests will see this before joining.',
        ),
      ),
      WidgetbookContractStateCard(
        label: 'trailing',
        child: CatchSheetHeader.branded(
          glyph: CatchIcons.hostBadge,
          title: 'Set up payouts',
          subtitle: 'Powered by Stripe',
          trailing: Text('Soon'),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'title-only',
        child: CatchSheetHeader.branded(
          glyph: CatchIcons.settingsOutlined,
          title: 'Sheet settings',
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchDock,
  path: '[Core primitives]/Product composites',
)
Widget catchDockSurfaceContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchDock',
    contractId: 'catch.bottom_action',
    states: const [
      'ios-floating',
      'android-anchored',
      'leading-content',
      'catch-line',
      'footnote',
      'scroll-overlay',
      'loading',
      'disabled',
      'rounded-button',
      'custom',
      'custom-no-safe-area',
      'embedded',
    ],
    children: [
      WidgetbookContractStateCard(
        label: 'ios-floating',
        child: _DockFrame(
          child: Theme(
            data: Theme.of(context).copyWith(platform: TargetPlatform.iOS),
            child: const CatchDock.primary(
              label: 'Book your spot',
              onPressed: widgetbookNoop,
            ),
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'android-anchored',
        child: _DockFrame(
          child: Theme(
            data: Theme.of(context).copyWith(platform: TargetPlatform.android),
            child: const CatchDock.primary(
              label: 'Book your spot',
              onPressed: widgetbookNoop,
            ),
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'leading-content',
        child: _DockFrame(
          child: CatchDock.primary(
            label: 'Join waitlist',
            leading: const CatchBadge(label: '4 left'),
            onPressed: widgetbookNoop,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'rounded-button',
        child: _DockFrame(
          child: CatchDock.primary(
            label: 'Review & publish',
            buttonMode: CatchButtonMode.rounded,
            onPressed: widgetbookNoop,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'catch-line-footnote',
        child: _DockFrame(
          child: CatchDock.primary(
            label: 'Confirm',
            catchLine: 'FREE TO JOIN',
            footnote: 'No charge until the host approves.',
            onPressed: widgetbookNoop,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'scroll-overlay',
        child: SizedBox(
          width: WidgetbookPreviewLayout.dockFrameWidth,
          height: WidgetbookPreviewLayout.bodyFrameExtent,
          child: CatchBottomActionOverlay(
            body: ListView(
              padding: CatchInsets.formStepBodyWithBottomActions,
              children: [
                for (var index = 0; index < 5; index++) ...[
                  Text('Scrolling form row ${index + 1}'),
                  const Divider(),
                  const SizedBox(height: CatchSpacing.s6),
                ],
              ],
            ),
            actions: Row(
              children: [
                Expanded(
                  child: CatchButton(
                    label: 'Save Draft',
                    variant: CatchButtonVariant.quiet,
                    size: CatchButtonSize.lg,
                    onPressed: widgetbookNoop,
                  ),
                ),
                const SizedBox(width: CatchSpacing.s3),
                Expanded(
                  child: CatchButton(
                    label: 'Next',
                    size: CatchButtonSize.lg,
                    fullWidth: true,
                    onPressed: widgetbookNoop,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'loading',
        child: _DockFrame(
          child: CatchDock.primary(
            label: 'Saving',
            isLoading: true,
            onPressed: null,
          ),
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'disabled',
        child: _DockFrame(
          child: CatchDock.primary(label: 'Sold out', onPressed: null),
        ),
      ),

      WidgetbookContractStateCard(
        label: 'custom',
        child: _DockFrame(
          child: CatchDock(
            child: CatchButton(label: 'Continue', onPressed: widgetbookNoop),
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'custom-no-safe-area',
        child: _DockFrame(
          child: CatchDock(
            includeSafeArea: false,
            child: CatchButton(
              label: 'Apply filters',
              onPressed: widgetbookNoop,
            ),
          ),
        ),
      ),

      const WidgetbookContractStateCard(
        label: 'embedded',
        child: _DockFrame(
          child: CatchDock.primaryContent(
            label: 'Next',
            onPressed: widgetbookNoop,
            leading: CatchBadge(label: 'Step 2'),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: OrganizerDetailDock,
  path: '[Core primitives]/Product composites',
)
Widget organizerDetailDockContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'OrganizerDetailDock',
    contractId: 'catch.club_dock',
    states: const [
      'guest',
      'visitor',
      'visitor-pending',
      'member',
      'member-bell-pending',
      'owner',
    ],
    children: [
      WidgetbookContractStateCard(
        label: 'guest',
        child: _DockFrame(
          child: OrganizerDetailDock(
            state: OrganizerDetailDockRole.guest,
            activityKind: ActivityKind.socialRun,
            footnote: 'Sign in to request access.',
            onSignIn: widgetbookNoop,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'visitor',
        child: _DockFrame(
          child: OrganizerDetailDock(
            state: OrganizerDetailDockRole.visitor,
            activityKind: ActivityKind.pickleball,
            members: 128,
            footnote: 'Requests are approved by the host.',
            onJoin: widgetbookNoop,
          ),
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'visitor-pending',
        child: _DockFrame(
          child: OrganizerDetailDock(
            state: OrganizerDetailDockRole.visitor,
            activityKind: ActivityKind.dinner,
            members: 42,
            isJoinLoading: true,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'member',
        child: _DockFrame(
          child: OrganizerDetailDock(
            state: OrganizerDetailDockRole.member,
            activityKind: ActivityKind.yoga,
            members: 76,
            footnote: 'You are a member.',
            onBell: widgetbookNoop,
            onManage: widgetbookNoop,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'member-bell-pending',
        child: _DockFrame(
          child: OrganizerDetailDock(
            state: OrganizerDetailDockRole.member,
            activityKind: ActivityKind.socialRun,
            members: 76,
            notificationsEnabled: false,
            isBellLoading: true,
            onBell: widgetbookNoop,
            onManage: widgetbookNoop,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'owner',
        child: _DockFrame(
          child: OrganizerDetailDock(
            state: OrganizerDetailDockRole.owner,
            activityKind: ActivityKind.pubQuiz,
            onManage: widgetbookNoop,
            onCreate: widgetbookNoop,
          ),
        ),
      ),
    ],
  );
}

class _DockFrame extends StatelessWidget {
  const _DockFrame({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: WidgetbookPreviewLayout.dockFrameWidth,
      child: child,
    );
  }
}
