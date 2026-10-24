import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

import '../preview_layout_contracts.dart';

void widgetbookNoop() {}

void widgetbookIgnoreString(String value) {}

final widgetbookContractTabItems = [
  CatchTabBarItem<String>(
    id: 'explore',
    icon: CatchIcons.homeOutlined,
    activeIcon: CatchIcons.homeRounded,
    label: 'Explore',
  ),
  CatchTabBarItem<String>(
    id: 'clubs',
    icon: CatchIcons.groupsOutlined,
    activeIcon: CatchIcons.groupsRounded,
    label: 'Clubs',
  ),
  CatchTabBarItem<String>(
    id: 'matches',
    icon: CatchIcons.chatBubbleOutlineRounded,
    activeIcon: CatchIcons.chatBubbleRounded,
    label: 'Chats',
    badgeCount: 3,
  ),
];

class WidgetbookContractFrame extends StatelessWidget {
  const WidgetbookContractFrame({
    super.key,
    required this.title,
    required this.contractId,
    required this.states,
    required this.children,
  }) : _maxWidth = 920,
       _stateAlignment = WrapCrossAlignment.center;

  /// Preserves the wider canvas and start-aligned state labels of token specimens.
  const WidgetbookContractFrame.foundation({
    super.key,
    required this.title,
    required this.contractId,
    required this.states,
    required this.children,
  }) : _maxWidth = 980,
       _stateAlignment = WrapCrossAlignment.start;

  /// The same review canvas for an interaction demo outside the component registry.
  const WidgetbookContractFrame.behavior({
    super.key,
    required this.title,
    required String behaviorId,
    required this.states,
    required this.children,
  }) : contractId = behaviorId,
       _maxWidth = 920,
       _stateAlignment = WrapCrossAlignment.center;

  final String title;
  final String contractId;
  final List<String> states;
  final List<Widget> children;
  final double _maxWidth;
  final WrapCrossAlignment _stateAlignment;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);

    return ColoredBox(
      color: t.bg,
      child: SingleChildScrollView(
        padding: CatchInsets.pageBodyRelaxed,
        child: Center(
          child: ConstrainedBox(
            constraints: BoxConstraints(maxWidth: _maxWidth),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CatchBadge.functional(label: contractId),
                const SizedBox(height: CatchSpacing.s3),
                Text(title, style: CatchTextStyles.headlineS(context)),
                const SizedBox(height: CatchSpacing.s3),
                WidgetbookContractWrap(
                  crossAxisAlignment: _stateAlignment,
                  children: [
                    for (final state in states)
                      CatchBadge(
                        label: state,
                        size: CatchBadgeSize.md,
                        tone: CatchBadgeTone.neutral,
                      ),
                  ],
                ),
                const SizedBox(height: CatchSpacing.s6),
                ...children.map(
                  (child) => Padding(
                    padding: const EdgeInsets.only(bottom: CatchSpacing.s4),
                    child: child,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class WidgetbookContractStateCard extends StatelessWidget {
  const WidgetbookContractStateCard({
    super.key,
    required this.label,
    required this.child,
    this.description,
  });

  final String label;
  final String? description;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);

    return CatchSurface(
      tone: CatchSurfaceTone.surface,
      borderRole: CatchBorderRole.separator,
      radius: CatchRadius.lg,
      padding: CatchInsets.content,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: CatchTextStyles.statusLabel(context, color: t.primary),
          ),
          if (description != null) ...[
            const SizedBox(height: CatchSpacing.s2),
            Text(
              description!,
              style: CatchTextStyles.supporting(context, color: t.ink2),
            ),
          ],
          const SizedBox(height: CatchSpacing.s4),
          child,
        ],
      ),
    );
  }
}

class WidgetbookContractWrap extends StatelessWidget {
  const WidgetbookContractWrap({
    super.key,
    required this.children,
    this.crossAxisAlignment = WrapCrossAlignment.center,
  });

  final List<Widget> children;
  final WrapCrossAlignment crossAxisAlignment;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: CatchSpacing.s3,
      runSpacing: CatchSpacing.s3,
      crossAxisAlignment: crossAxisAlignment,
      children: children,
    );
  }
}

class WidgetbookContractFieldWidth extends StatelessWidget {
  const WidgetbookContractFieldWidth({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: WidgetbookPreviewLayout.wideContractWidth,
      child: child,
    );
  }
}

class WidgetbookContractTopBarFrame extends StatelessWidget {
  const WidgetbookContractTopBarFrame({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return CatchSurface(
      tone: CatchSurfaceTone.raised,
      borderRole: CatchBorderRole.separator,
      clipBehavior: Clip.antiAlias,
      width: WidgetbookPreviewLayout.wideContractWidth,
      child: child,
    );
  }
}

class WidgetbookContractPhotoPanel extends StatelessWidget {
  const WidgetbookContractPhotoPanel({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);

    return Container(
      width: WidgetbookPreviewLayout.compactComponentWidth,
      height: MediaQuery.textScalerOf(context).scale(1) >= 2
          ? WidgetbookPreviewLayout.tallNarrowPanelHeight
          : WidgetbookPreviewLayout.photoLikePanelHeight,
      padding: CatchInsets.content,
      alignment: Alignment.topRight,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            t.like.withValues(alpha: 0.76),
            t.pass.withValues(alpha: 0.68),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(CatchRadius.lg),
      ),
      child: child,
    );
  }
}

class WidgetbookContractBodyFrame extends StatelessWidget {
  const WidgetbookContractBodyFrame({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);

    return Container(
      width: WidgetbookPreviewLayout.standardContractWidth,
      height: WidgetbookPreviewLayout.bodyFrameExtent,
      decoration: BoxDecoration(
        color: t.bg,
        border: Border.all(color: t.line),
        borderRadius: BorderRadius.circular(CatchRadius.lg),
      ),
      clipBehavior: Clip.antiAlias,
      child: child,
    );
  }
}

class WidgetbookContractBodySpec extends StatelessWidget {
  const WidgetbookContractBodySpec({super.key, required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return CatchSurface(
      tone: CatchSurfaceTone.surface,
      borderRole: CatchBorderRole.separator,
      padding: CatchInsets.content,
      child: Text(label, style: CatchTextStyles.supporting(context)),
    );
  }
}
