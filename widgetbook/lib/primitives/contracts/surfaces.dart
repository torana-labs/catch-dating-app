import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/contract_preview.dart';
import 'package:widgetbook_workspace/support/widgetbook_harness.dart';

import '../../preview_layout_contracts.dart';

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchSurface,
  path: '[Core primitives]/Surfaces',
)
Widget catchSurfaceContractStates(BuildContext context) {
  final t = CatchTokens.of(context);

  return WidgetbookContractFrame(
    title: 'CatchSurface',
    contractId: 'catch.surface',
    states: const [
      'surface',
      'raised',
      'primary-soft',
      'transparent',
      'tappable',
      'semantic-border',
      'focused',
      'elevated',
      'card',
      'tinted',
    ],
    children: [
      WidgetbookContractStateCard(
        label: 'surface',
        child: _SurfaceSpec(tone: CatchSurfaceTone.surface),
      ),
      WidgetbookContractStateCard(
        label: 'raised',
        child: _SurfaceSpec(tone: CatchSurfaceTone.raised),
      ),
      WidgetbookContractStateCard(
        label: 'primary-soft',
        child: _SurfaceSpec(tone: CatchSurfaceTone.primarySoft),
      ),
      WidgetbookContractStateCard(
        label: 'transparent',
        child: WidgetbookContractPhotoPanel(
          child: _SurfaceSpec(
            tone: CatchSurfaceTone.transparent,
            borderColor: t.surface,
            foregroundColor: t.surface,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'tappable',
        child: _SurfaceSpec(
          tone: CatchSurfaceTone.surface,
          onTap: widgetbookNoop,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'semantic-border',
        child: CatchSurface(
          borderRole: CatchBorderRole.boundary,
          padding: CatchInsets.contentRelaxed,
          child: Text(
            'Boundary role resolves color and width together.',
            style: CatchTextStyles.bodyM(context),
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'focused',
        child: CatchSurface(
          borderRole: CatchBorderRole.focus,
          padding: CatchInsets.contentRelaxed,
          child: Text(
            'Focus role is intentionally thicker and geometry-stable.',
            style: CatchTextStyles.bodyM(context),
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'elevated',
        child: const WidgetbookContractWrap(
          children: [
            _SurfaceSpec(label: 'Card', emphasis: CatchSurfaceEmphasis.subtle),
            _SurfaceSpec(
              label: 'Raised',
              emphasis: CatchSurfaceEmphasis.raised,
            ),
            _SurfaceSpec(
              label: 'Overlay',
              emphasis: CatchSurfaceEmphasis.floating,
            ),
          ],
        ),
      ),
      WidgetbookContractStateCard(
        label: 'card',
        child: CatchSurface.card(
          width: WidgetbookPreviewLayout.surfaceCardWidth,
          child: Text(
            'Default bounded group',
            style: CatchTextStyles.bodyM(context),
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'tinted',
        child: CatchSurface.tinted(
          child: Text(
            'Only attendees can see this matching detail.',
            style: CatchTextStyles.supporting(context),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchTicket,
  path: '[Core primitives]/Entity material',
)
Widget catchTicketContractStates(BuildContext context) {
  final t = CatchTokens.of(context);
  return WidgetbookContractFrame(
    title: 'Ticket material',
    contractId: 'catch.ticket',
    states: const ['compact', 'expanded', 'large-text', 'card'],
    children: [
      WidgetbookContractStateCard(
        label: 'card recipe',
        child: SizedBox(
          width: 340,
          child: CatchTicket.card(
            onTap: () {},
            mediaBuilder: (context, _) => ColoredBox(
              color: t.bg,
              child: Center(
                child: Text(
                  'Card media',
                  style: CatchTextStyles.statusLabel(context, color: t.ink),
                ),
              ),
            ),
            bodyBuilder: (context, _) => Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Card body',
                  style: CatchTextStyles.statusLabel(context, color: t.ink),
                ),
                gapH8,
                Text(
                  'Width-driven ticket with a notched outline',
                  style: CatchTextStyles.supporting(context, color: t.ink2),
                ),
              ],
            ),
          ),
        ),
      ),
      for (final height in [359.0, 360.0])
        WidgetbookContractStateCard(
          label: '${height.toInt()} px hero',
          child: WidgetbookViewportFrame.device(
            size: Size(340, height),
            child: CatchTicket.hero(
              mediaBuilder: (context, compact) => ColoredBox(
                color: t.bg,
                child: Center(
                  child: Text(
                    compact ? 'Compact visual' : 'Expanded visual',
                    style: CatchTextStyles.statusLabel(context, color: t.ink),
                  ),
                ),
              ),
              bodyBuilder: (context, compact) => Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    compact ? 'Compact body' : 'Expanded body',
                    style: CatchTextStyles.statusLabel(context, color: t.ink),
                  ),
                  gapH8,
                  Text(
                    'Admission confirmed',
                    style: CatchTextStyles.supporting(context, color: t.ink2),
                  ),
                ],
              ),
            ),
          ),
        ),
      WidgetbookContractStateCard(
        label: 'Perforation geometry and color',
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            CatchTicketDivider(
              height: 32,
              notchRadius: 14,
              lineColor: t.primary,
            ),
            for (final radius in [4.0, 10.0, 14.0])
              CustomPaint(
                size: const Size(320, 20),
                painter: CatchTicketPerforationPainter(
                  lineColor: t.line2,
                  notchRadius: radius,
                ),
              ),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchViewport,
  path: '[Core primitives]/Layout',
)
Widget catchViewportContractStates(
  BuildContext context,
) => WidgetbookContractFrame(
  title: 'Viewport layouts',
  contractId: 'catch.viewport',
  states: const [
    'compact',
    'medium',
    'expanded',
    'expanded-falls-back-to-medium',
    'missing-overrides-use-compact',
    'large-text',
    'below-breakpoint',
    'at-breakpoint',
    'above-breakpoint',
    'local-cross-axis-width',
    'width-capped',
    'local-height',
    'safe-area-metrics',
  ],
  children: [
    for (final width in [599.0, 600.0, 839.0, 840.0])
      WidgetbookContractStateCard(
        label: '${width.toInt()} px available width',
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: SizedBox(
            width: width,
            child: CatchViewport(
              compactBuilder: (_) => CatchSurface.card(
                child: Text(
                  'Compact layout',
                  style: CatchTextStyles.bodyM(context),
                ),
              ),
              mediumBuilder: (_) => CatchSurface.card(
                child: Text(
                  'Medium layout',
                  style: CatchTextStyles.bodyM(context),
                ),
              ),
              expandedBuilder: (_) => CatchSurface.card(
                child: Text(
                  'Expanded layout',
                  style: CatchTextStyles.bodyM(context),
                ),
              ),
            ),
          ),
        ),
      ),
    for (final provideMedium in [true, false])
      WidgetbookContractStateCard(
        label: provideMedium
            ? 'Expanded falls back to medium'
            : 'All widths fall back to compact',
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: SizedBox(
            width: 840,
            child: CatchViewport(
              compactBuilder: (_) => CatchSurface.card(
                child: Text(
                  'Compact fallback',
                  style: CatchTextStyles.bodyM(context),
                ),
              ),
              mediumBuilder: provideMedium
                  ? (_) => CatchSurface.card(
                      child: Text(
                        'Medium fallback',
                        style: CatchTextStyles.bodyM(context),
                      ),
                    )
                  : null,
            ),
          ),
        ),
      ),
    for (final width in [319.0, 320.0, 321.0])
      WidgetbookContractStateCard(
        label: '${width.toInt()} px at a 320 px local breakpoint',
        child: Align(
          alignment: Alignment.centerLeft,
          child: SizedBox(
            width: width,
            child: CatchViewport.atWidth(
              breakpoint: 320,
              compactBuilder: (_) => CatchSurface.card(
                child: Text(
                  'Compact component',
                  style: CatchTextStyles.bodyM(context),
                ),
              ),
              expandedBuilder: (_) => CatchSurface.card(
                child: Text(
                  'Expanded component',
                  style: CatchTextStyles.bodyM(context),
                ),
              ),
            ),
          ),
        ),
      ),
    for (final width in [320.0, 600.0, 840.0])
      WidgetbookContractStateCard(
        label: '${width.toInt()} px local sliver width',
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: SizedBox(
            width: width,
            height: 100,
            child: CustomScrollView(
              slivers: [
                CatchViewport.sliver(
                  sliverBuilder: (context, viewport) => SliverToBoxAdapter(
                    child: CatchSurface.card(
                      child: Text(
                        '${viewport.width.toInt()} px · ${viewport.sizeClass.name}',
                        style: CatchTextStyles.bodyM(context),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    for (final maximum in [240.0, 520.0])
      WidgetbookContractStateCard(
        label: '${maximum.toInt()} px scene cap with safe-area metrics',
        child: MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(padding: const EdgeInsets.only(top: 24, bottom: 16)),
          child: SizedBox(
            height: 180,
            child: CatchViewport.scene(
              maxWidth: maximum,
              builder:
                  (
                    BuildContext context,
                    CatchViewportSceneData viewport,
                  ) => CatchSurface.card(
                    child: Text(
                      '${viewport.width.toInt()} × ${viewport.height.toInt()}\n'
                      'Insets ${viewport.mediaPadding.top.toInt()} / '
                      '${viewport.mediaPadding.bottom.toInt()}',
                      style: CatchTextStyles.bodyM(context),
                    ),
                  ),
            ),
          ),
        ),
      ),
  ],
);

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchDivider,
  path: '[Core primitives]/Data display',
)
Widget catchDividerContractStates(BuildContext context) {
  final t = CatchTokens.of(context);

  return WidgetbookContractFrame(
    title: 'CatchDivider',
    contractId: 'catch.section.divider',
    states: const [
      'section',
      'field-section',
      'field-row',
      'vertical',
      'default',
      'color-override',
    ],
    children: [
      const WidgetbookContractStateCard(
        label: 'horizontal rules',
        child: Column(
          spacing: CatchSpacing.s4,
          children: [
            CatchDivider.section(),
            CatchDivider.fieldSection(),
            CatchDivider.fieldRow(),
          ],
        ),
      ),
      WidgetbookContractStateCard(
        label: 'divider colors',
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CatchDivider.vertical(),
            const SizedBox(width: CatchSpacing.s2),
            CatchDivider.vertical(color: t.primary),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchRevealViewport,
  path: '[Core primitives]/Motion',
)
Widget catchMotionViewportContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'Motion viewport',
    contractId: 'catch.motion_viewport',
    states: const [
      'initial',
      'mid-transition',
      'settled',
      'mid-reveal',
      'reduced-motion',
      'flight',
    ],
    children: [
      for (final pose in const [
        ('initial', CatchRevealViewportVariant.content, 0.0, false),
        ('mid-transition', CatchRevealViewportVariant.content, 0.5, false),
        ('settled', CatchRevealViewportVariant.content, 1.0, false),
        ('mid-reveal', CatchRevealViewportVariant.stationaryMedia, 0.5, false),
        ('reduced-motion', CatchRevealViewportVariant.content, 0.0, true),
        ('flight', CatchRevealViewportVariant.flight, 0.5, false),
      ])
        WidgetbookContractStateCard(
          label: pose.$1,
          child: MediaQuery(
            data: MediaQuery.of(context).copyWith(disableAnimations: pose.$4),
            child: SizedBox(
              height: CatchSpacing.s16 * 2,
              width: double.infinity,
              child: CatchRevealViewport(
                variant: pose.$2,
                animation: AlwaysStoppedAnimation<double>(pose.$3),
                child: CatchSurface.card(
                  child: Text(
                    'Route content',
                    style: CatchTextStyles.bodyM(context),
                  ),
                ),
              ),
            ),
          ),
        ),
    ],
  );
}

class _SurfaceSpec extends StatelessWidget {
  const _SurfaceSpec({
    this.label = 'Preview surface',
    this.tone = CatchSurfaceTone.surface,
    this.emphasis = CatchSurfaceEmphasis.flat,
    this.borderColor,
    this.foregroundColor,
    this.onTap,
  });

  final String label;
  final CatchSurfaceTone tone;
  final CatchSurfaceEmphasis emphasis;
  final Color? borderColor;
  final Color? foregroundColor;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final color = foregroundColor ?? t.ink;

    return CatchSurface(
      tone: tone,
      emphasis: emphasis,
      borderSpec: CatchBorder.resolve(
        t,
        CatchBorderRole.separator,
        color: borderColor,
      ),
      onTap: onTap,
      width: MediaQuery.textScalerOf(context).scale(1) >= 2
          ? WidgetbookPreviewLayout.mediumComponentWidth
          : WidgetbookPreviewLayout.surfaceSpecWidth,
      padding: CatchInsets.content,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label,
            style: CatchTextStyles.fieldRowTitle(context, color: color),
          ),
          const SizedBox(height: CatchSpacing.s2),
          Text(
            onTap == null ? 'Static panel' : 'Tap target',
            style: CatchTextStyles.supporting(
              context,
              color: color.withValues(alpha: 0.72),
            ),
          ),
        ],
      ),
    );
  }
}
