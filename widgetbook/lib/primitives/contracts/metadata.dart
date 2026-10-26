import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/contract_preview.dart';
import 'package:widgetbook_workspace/support/widgetbook_harness.dart';

import '../../preview_layout_contracts.dart';

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchMetaRow,
  path: '[Core primitives]/Metadata',
)
Widget catchMetaRowContractStates(BuildContext context) {
  final t = CatchTokens.of(context);

  return WidgetbookContractFrame(
    title: 'CatchMetaRow',
    contractId: 'catch.meta_row',
    states: const [
      'default',
      'semantic-icon',
      'semantic-label',
      'truncated',
      'entry',
      'flow',
      'group',
      'strong',
      'rtl',
      'large-text',
    ],
    children: [
      WidgetbookContractStateCard(
        label: 'default',
        child: CatchMetaRow(icon: CatchIcons.location, label: '2.4 km away'),
      ),
      WidgetbookContractStateCard(
        label: 'semantic-icon',
        child: CatchMetaRow(
          icon: CatchIcons.activity,
          label: 'Social run',
          color: t.success,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'semantic-label',
        child: CatchMetaRow(
          icon: CatchIcons.info,
          label: 'Host confirmation required',
          color: t.warning,
          labelColor: t.warning,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'truncated',
        child: CatchMetaRow(
          icon: CatchIcons.location,
          label:
              'A deliberately long venue description that demonstrates the single-line truncation contract in the review surface',
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'entry / strong',
        child: CatchMetaRow.entry(
          entry: CatchMetaEntry(label: '2.4 km'),
          isStrong: true,
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'flow',
        child: CatchMetaRow.flow(
          entries: [
            CatchMetaEntry(label: 'Tonight'),
            CatchMetaEntry(label: 'Easy pace'),
          ],
        ),
      ),
      for (final direction in TextDirection.values)
        WidgetbookContractStateCard(
          label: 'group / ${direction.name}',
          child: Directionality(
            textDirection: direction,
            child: const CatchMetaRow.group(
              entries: [
                CatchMetaEntry(label: 'Tonight'),
                CatchMetaEntry(label: 'Easy pace'),
              ],
              trailing: CatchMetaEntry(label: '2.4 km'),
            ),
          ),
        ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchBadge,
  path: '[Core primitives]/Status',
)
Widget catchBadgeContractStates(BuildContext context) {
  final t = CatchTokens.of(context);

  return WidgetbookContractFrame(
    title: 'CatchBadge',
    contractId: 'catch.badge',
    states: const [
      'metadata',
      'functional',
      'semantic-tones',
      'solid',
      'live',
      'on-dark',
      'privacy',
      'truncated',
      'readable-status',
      'ticket-status',
      'optional-field',
    ],
    children: [
      WidgetbookContractStateCard(
        label: 'ticket-status / soft and strong',
        child: WidgetbookContractWrap(
          children: [
            CatchBadge.ticketStatus(label: 'Going', color: t.primary),
            CatchBadge.ticketStatus(
              label: 'Full',
              color: t.primary,
              emphasis: CatchBadgeEmphasis.strong,
            ),
            SizedBox(
              width: WidgetbookPreviewLayout.compactBadgeWidth,
              child: CatchBadge.ticketStatus(
                label: 'A long ticket status for narrow spaces',
                color: t.primary,
              ),
            ),
          ],
        ),
      ),
      WidgetbookContractStateCard(
        label: 'optional-field / default and error',
        child: WidgetbookContractWrap(
          children: [
            CatchBadge.optional(
              label: context.l10n.coreCatchFormFieldLabelTextOptional,
            ),
            CatchBadge.optional(
              label: context.l10n.coreCatchFormFieldLabelTextOptional,
              hasError: true,
            ),
          ],
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'readable-status',
        child: WidgetbookContractWrap(
          children: [
            CatchBadge.status(label: 'Regular', tone: CatchBadgeTone.affinity),
            CatchBadge.status(label: 'New', tone: CatchBadgeTone.success),
            CatchBadge.status(label: 'At risk', tone: CatchBadgeTone.warning),
          ],
        ),
      ),
      WidgetbookContractStateCard(
        label: 'metadata / sentence case',
        child: WidgetbookContractWrap(
          children: const [
            CatchBadge(label: 'Queued'),
            CatchBadge(label: 'Action', size: CatchBadgeSize.action),
          ],
        ),
      ),
      WidgetbookContractStateCard(
        label: 'functional / uppercase mono',
        child: const WidgetbookContractWrap(
          children: [
            CatchBadge.functional(label: 'Ready', tone: CatchBadgeTone.success),
            CatchBadge.solidStatus(label: 'Owner'),
          ],
        ),
      ),
      WidgetbookContractStateCard(
        label: 'semantic-tones',
        child: const WidgetbookContractWrap(
          children: [
            CatchBadge(label: 'Brand', tone: CatchBadgeTone.brand),
            CatchBadge(label: 'Success', tone: CatchBadgeTone.success),
            CatchBadge(label: 'Warning', tone: CatchBadgeTone.warning),
            CatchBadge(label: 'Danger', tone: CatchBadgeTone.danger),
            CatchBadge(label: 'Gold', tone: CatchBadgeTone.gold),
          ],
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'solid metadata',
        child: CatchBadge.solid(label: '412 members'),
      ),
      const WidgetbookContractStateCard(
        label: 'live status',
        child: CatchBadge.live(label: 'Live now'),
      ),
      WidgetbookContractStateCard(
        label: 'on-dark metadata / status',
        child: CatchSurface(
          backgroundColor: t.ink,
          padding: CatchInsets.content,
          child: WidgetbookContractWrap(
            children: [
              CatchBadge.onDark(label: 'Starts in 2 hours'),
              CatchBadge.onDarkStatus(
                label: 'Preview only',
                icon: CatchIcons.show,
              ),
            ],
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'privacy',
        child: CatchBadge.privacy(
          label: 'Private to you',
          icon: CatchIcons.locked,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'truncated',
        child: SizedBox(
          width: WidgetbookPreviewLayout.compactBadgeWidth,
          child: CatchBadge(
            label: 'Very long review pending label',
            tone: CatchBadgeTone.warning,
            icon: CatchIcons.info,
            borderColor: t.warning,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchCountBadge,
  path: '[Core primitives]/Status',
)
Widget catchCountBadgeContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchCountBadge',
    contractId: 'catch.badge.count_badge',
    states: const [
      'hidden',
      'count',
      '99-boundary',
      'overflow-count',
      'standalone',
      'spoken-count',
      'tight-constraints',
      'navigation-plain',
      'navigation-badge',
      'navigation-large-badge',
    ],
    children: [
      WidgetbookContractStateCard(
        label: 'navigation icon badges',
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            CatchCountBadge.navigationIcon(
              icon: Icons.explore_outlined,
              color: CatchTokens.of(context).ink,
            ),
            const SizedBox(width: CatchSpacing.s4),
            CatchCountBadge.navigationIcon(
              icon: Icons.chat_bubble_outline,
              color: CatchTokens.of(context).ink,
              count: 7,
            ),
            const SizedBox(width: CatchSpacing.s4),
            CatchCountBadge.navigationIcon(
              icon: Icons.chat_bubble_outline,
              color: CatchTokens.of(context).ink,
              count: 104,
            ),
          ],
        ),
      ),
      WidgetbookContractStateCard(
        label: 'spoken-count / localized unread semantics',
        child: WidgetbookContractWrap(
          children: [
            for (final count in [1, 12, 118])
              CatchCountBadge.label(
                count: count,
                semanticsLabel: catchPersonRowCopy(
                  context.l10n,
                ).unreadCountLabel(count),
              ),
          ],
        ),
      ),
      WidgetbookContractStateCard(
        label: 'hidden',
        child: CatchCountBadge(count: 0, child: Icon(CatchIcons.chat)),
      ),
      WidgetbookContractStateCard(
        label: 'count',
        child: CatchCountBadge(count: 7, child: Icon(CatchIcons.chat)),
      ),
      WidgetbookContractStateCard(
        label: '99-boundary',
        child: CatchCountBadge(
          count: 99,
          child: Icon(CatchIcons.notifications),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'overflow-count',
        child: CatchCountBadge(
          count: 104,
          child: Icon(CatchIcons.notifications),
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'standalone',
        child: CatchCountBadge.label(count: 12),
      ),
      const WidgetbookContractStateCard(
        label: 'tight-constraints',
        child: SizedBox(
          width: WidgetbookPreviewLayout.fullWidthButtonWidth,
          child: CatchCountBadge(
            count: 12,
            child: CatchSurface(
              padding: CatchInsets.content,
              child: Text('Messages'),
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchStatusRow,
  path: '[Core primitives]/Status',
)
Widget catchInlineStatusContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchStatusRow',
    contractId: 'catch.badge.inline_status',
    states: const ['neutral', 'success', 'warning', 'danger', 'live', 'scaled'],
    children: [
      const WidgetbookContractStateCard(
        label: 'semantic tones',
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CatchStatusRow(label: 'Draft saved locally'),
            gapH8,
            CatchStatusRow(
              label: 'Changes saved',
              tone: CatchStatusRowTone.success,
            ),
            gapH8,
            CatchStatusRow(
              label: 'Unsaved changes',
              tone: CatchStatusRowTone.warning,
            ),
            gapH8,
            CatchStatusRow(
              label: 'Connection lost',
              tone: CatchStatusRowTone.danger,
            ),
            gapH8,
            CatchStatusRow(
              label: 'Updating live',
              tone: CatchStatusRowTone.live,
            ),
          ],
        ),
      ),
      WidgetbookContractStateCard(
        label: '2x text / wrapped copy',
        child: MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: const TextScaler.linear(2)),
          child: const SizedBox(
            width: WidgetbookPreviewLayout.scaledStatusWidth,
            child: CatchStatusRow(
              label: 'Unsaved changes with longer localized supporting copy',
              tone: CatchStatusRowTone.warning,
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchStatusIndicator,
  path: '[Core primitives]/Status',
)
Widget catchStatusDotContractStates(BuildContext context) {
  final t = CatchTokens.of(context);

  return WidgetbookContractFrame(
    title: 'CatchStatusIndicator',
    contractId: 'catch.badge.status_dot',
    states: const [
      'default',
      'success',
      'warning',
      'danger',
      'bordered',
      'spoken-status',
    ],
    children: [
      WidgetbookContractStateCard(
        label: 'spoken-status / localized new-match semantics',
        child: CatchStatusIndicator(
          size: CatchSpacing.s2,
          semanticsLabel: catchPersonRowCopy(context.l10n).newMatchLabel,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'tones',
        child: WidgetbookContractWrap(
          children: [
            const CatchStatusIndicator(),
            CatchStatusIndicator(color: t.success),
            CatchStatusIndicator(color: t.warning),
            CatchStatusIndicator(color: t.danger),
          ],
        ),
      ),
      WidgetbookContractStateCard(
        label: 'bordered',
        child: CatchStatusIndicator(
          color: t.primary,
          size: 10,
          borderColor: t.surface,
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchPrivacyBadge,
  path: '[Core primitives]/Status',
)
Widget catchPrivacyBadgeContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchPrivacyBadge',
    contractId: 'catch.privacy_badge',
    states: const ['private-to-you', 'catch-private', 'host-visible'],
    children: [
      WidgetbookContractStateCard(
        label: 'private-to-you',
        child: CatchPrivacyBadge(copy: catchPrivacyBadgeCopy(context.l10n)),
      ),
      WidgetbookContractStateCard(
        label: 'catch-private',
        child: CatchPrivacyBadge(
          copy: catchPrivacyBadgeCopy(context.l10n),
          variant: CatchPrivacyBadgeVariant.catchPrivate,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'host-visible',
        child: CatchPrivacyBadge(
          copy: catchPrivacyBadgeCopy(context.l10n),
          variant: CatchPrivacyBadgeVariant.hostCanSee,
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Floating states',
  type: CatchButton,
  path: '[Core primitives]/Actions',
)
Widget catchCountPillContractStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'CatchButton.floating',
    catalogId: 'core.widgets.catch_button',
    children: [
      WidgetbookContractStateCard(
        label: 'label',
        child: CatchButton.floating(
          label: '24 places',
          onPressed: widgetbookNoop,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'label-with-icon',
        child: CatchButton.floating(
          icon: CatchIcons.filters,
          label: 'Filters',
          onPressed: widgetbookNoop,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'label-with-value',
        child: CatchButton.floating(
          icon: CatchIcons.map,
          label: 'Map',
          value: '12 events',
          onPressed: widgetbookNoop,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'with-count',
        child: CatchButton.floating(
          icon: CatchIcons.filters,
          label: 'Filters',
          count: 3,
          onPressed: widgetbookNoop,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'focused',
        description:
            'Use keyboard traversal to inspect the semantic focus ring.',
        child: CatchButton.floating(
          icon: CatchIcons.filters,
          label: 'Keyboard focus target',
          onPressed: widgetbookNoop,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'semantic-label',
        child: CatchButton.floating(
          icon: CatchIcons.list,
          label: 'List',
          semanticsLabel: 'Show list view',
          onPressed: widgetbookNoop,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'text-scale-reflow',
        child: SizedBox(
          width: WidgetbookPreviewLayout.compactControlWidth,
          child: CatchButton.floating(
            icon: CatchIcons.filters,
            label: 'Very specific active filters',
            count: 12,
            onPressed: widgetbookNoop,
          ),
        ),
      ),
    ],
  );
}
