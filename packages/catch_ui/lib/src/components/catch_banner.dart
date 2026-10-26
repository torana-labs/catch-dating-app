import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_banner_status.dart';
import 'package:catch_ui/src/components/catch_button.dart';
import 'package:catch_ui/src/components/catch_icon_action.dart';
import 'package:catch_ui/src/foundations/catch_icons.dart';
import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:catch_ui/src/primitives/catch_surface.dart';
import 'package:flutter/material.dart';

enum CatchBannerTone { primary, success, warning, danger, neutral }

enum CatchBannerVariant { message, error, status, statuses }

/// Persistent feedback with one icon, copy and action renderer.
///
/// Body feedback shares spacing, typography and action placement across tones.
/// [CatchBanner.statuses] renders durable
/// header context supplied through CatchBannerStatusScope; canonical screen
/// owners alone place it and consume its publication once.
class CatchBanner extends StatelessWidget {
  const CatchBanner({
    Key? key,
    required String message,
    String? title,
    IconData? icon,
    CatchBannerTone tone = CatchBannerTone.primary,
    List<Widget> actions = const [],
    Duration duration = CatchMotion.fast,
  }) : this._(
         key: key,
         message: message,
         title: title,
         icon: icon,
         tone: tone,
         actions: actions,
         duration: duration,
       );

  const CatchBanner.error({Key? key, required String message})
    : this._(
        key: key,
        message: message,
        variant: CatchBannerVariant.error,
        tone: CatchBannerTone.danger,
      );

  /// The caller-owned retry label stays required while its callback is absent.
  const CatchBanner.errorWithRetry({
    Key? key,
    required String message,
    required String retryLabel,
    required VoidCallback? onRetry,
  }) : this._(
         key: key,
         message: message,
         retryLabel: retryLabel,
         onRetry: onRetry,
         variant: CatchBannerVariant.error,
         tone: CatchBannerTone.danger,
       );

  /// Full-width, intrinsically measured bands placed by screen layouts.
  const CatchBanner.statuses({
    Key? key,
    required List<CatchBannerStatus> statuses,
  }) : this._(
         key: key,
         variant: CatchBannerVariant.statuses,
         statuses: statuses,
       );

  const CatchBanner._({
    super.key,
    this.message = '',
    this.title,
    this.icon,
    this.tone = CatchBannerTone.primary,
    this.variant = CatchBannerVariant.message,
    this.actions = const [],
    this.duration = CatchMotion.fast,
    this.onRetry,
    this.retryLabel,
    this.statuses = const [],
    this._status,
  });

  final String message;
  final String? title;
  final IconData? icon;
  final CatchBannerTone tone;
  final CatchBannerVariant variant;
  final List<Widget> actions;
  final Duration duration;
  final VoidCallback? onRetry;
  final String? retryLabel;
  final List<CatchBannerStatus> statuses;
  final CatchBannerStatus? _status;

  @override
  Widget build(BuildContext context) {
    if (variant == CatchBannerVariant.statuses) {
      return Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (final status in statuses)
            CatchBanner._(variant: CatchBannerVariant.status, status: status),
        ],
      );
    }
    final status = _status;
    if (status == null) return _buildBodyFeedback(context);
    final tokens = CatchTokens.of(context);
    final foreground = _readableAccent(tokens, status.color);
    final rowChildren = <Widget>[
      Icon(status.icon, size: CatchIconSize.md, color: status.color),
      const SizedBox(width: CatchSpacing.micro10),
      Expanded(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              status.label.toUpperCase(),
              style: CatchTextStyles.kicker(context, color: foreground),
            ),
            const SizedBox(height: CatchSpacing.s1),
            Text(
              status.message,
              style: CatchTextStyles.supporting(context, color: foreground),
            ),
          ],
        ),
      ),
    ];
    final actionWidgets = <Widget>[
      for (final action in status.actions)
        if (action.icon != null)
          CatchIconAction.icon(
            icon: action.icon!,
            tooltip: action.label,
            onPressed: action.onPressed,
            accent: status.color,
            variant: CatchIconActionVariant.plain,
          )
        else
          CatchButton.text(
            label: action.label,
            onPressed: action.onPressed,
            foregroundColor: foreground,
            minimumSize: const Size.square(CatchLayout.iconButtonSize),
          ),
    ];
    return Semantics(
      key: ValueKey('status_strip.${status.id}'),
      container: true,
      liveRegion: true,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: _background(tokens.bg, status.color),
          border: Border(
            bottom: BorderSide(
              color: status.color.withValues(
                alpha: CatchOpacity.lightOverlayBorder,
              ),
            ),
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: CatchSpacing.screenPx,
            vertical: CatchSpacing.s2,
          ),
          // Status bands measure their own width. Inline recipes below
          // keep intrinsic sizing without a LayoutBuilder.
          child: LayoutBuilder(
            builder: (context, constraints) {
              final stacked =
                  MediaQuery.textScalerOf(context).scale(1) >= 1.4 ||
                  constraints.maxWidth < CatchLayout.statusStripInlineMinWidth;
              final statusActions = Wrap(
                alignment: WrapAlignment.end,
                crossAxisAlignment: WrapCrossAlignment.center,
                spacing: CatchSpacing.s1,
                children: actionWidgets,
              );
              final row = Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  ...rowChildren,
                  if (!stacked && actionWidgets.isNotEmpty) ...[
                    const SizedBox(width: CatchSpacing.s2),
                    statusActions,
                  ],
                ],
              );
              return ConstrainedBox(
                constraints: const BoxConstraints(minHeight: CatchSpacing.s12),
                child: stacked
                    ? Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          row,
                          if (actionWidgets.isNotEmpty) ...[
                            const SizedBox(height: CatchSpacing.s2),
                            statusActions,
                          ],
                        ],
                      )
                    : row,
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildBodyFeedback(BuildContext context) {
    final tokens = CatchTokens.of(context);
    final accent = switch (tone) {
      CatchBannerTone.primary => tokens.primary,
      CatchBannerTone.success => tokens.success,
      CatchBannerTone.warning => tokens.warning,
      CatchBannerTone.danger => tokens.danger,
      CatchBannerTone.neutral => tokens.ink2,
    };
    final hasTitle = title != null && title!.trim().isNotEmpty;
    final glyph =
        icon ??
        switch (tone) {
          CatchBannerTone.danger => CatchIcons.error,
          CatchBannerTone.warning => CatchIcons.warning,
          CatchBannerTone.success => CatchIcons.success,
          _ => CatchIcons.info,
        };
    final feedbackActions = <Widget>[
      ...actions,
      if (onRetry != null)
        CatchButton.text(label: retryLabel!, onPressed: onRetry),
    ];
    final bodyStyle = CatchTextStyles.supporting(context, color: tokens.ink2);
    return Semantics(
      container: true,
      liveRegion: variant == CatchBannerVariant.error,
      child: CatchSurface(
        radius: CatchRadius.md,
        padding: const EdgeInsets.all(CatchSpacing.s4),
        duration: duration,
        backgroundColor: tone == CatchBannerTone.neutral
            ? tokens.primarySoft
            : Color.alphaBlend(
                accent.withValues(alpha: CatchOpacity.calloutFill),
                tokens.surface,
              ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (hasTitle) ...[
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(glyph, color: accent, size: CatchIconSize.md),
                  const SizedBox(width: CatchSpacing.s2),
                  Expanded(
                    child: Text(
                      title!,
                      style: CatchTextStyles.sectionTitle(context),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: CatchSpacing.s2),
              Text(message, style: bodyStyle),
            ] else
              Text(message, style: bodyStyle),
            if (feedbackActions.isNotEmpty) ...[
              const SizedBox(height: CatchSpacing.s4),
              Wrap(
                spacing: CatchSpacing.s2,
                runSpacing: CatchSpacing.s2,
                children: feedbackActions,
              ),
            ],
          ],
        ),
      ),
    );
  }

  static Color _background(Color background, Color accent) => Color.alphaBlend(
    accent.withValues(alpha: CatchOpacity.tabBarPillFill),
    background,
  );

  // Header copy/actions retain 4.5:1 contrast against their actual tint.
  static Color _readableAccent(CatchTokens tokens, Color accent) {
    final background = _background(tokens.bg, accent);
    final backgroundLuminance = background.computeLuminance() + 0.05;
    for (var step = 0; step <= 10; step++) {
      final candidate = Color.alphaBlend(
        Color.lerp(accent, tokens.ink, step / 10)!,
        background,
      );
      final luminance = candidate.computeLuminance() + 0.05;
      final contrast = luminance > backgroundLuminance
          ? luminance / backgroundLuminance
          : backgroundLuminance / luminance;
      if (contrast >= 4.5) return candidate;
    }
    return tokens.ink;
  }
}
