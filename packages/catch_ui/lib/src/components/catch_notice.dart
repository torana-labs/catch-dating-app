import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_avatar.dart';
import 'package:catch_ui/src/components/catch_button.dart';
import 'package:catch_ui/src/components/catch_icon_action.dart';
import 'package:catch_ui/src/components/catch_notice_data.dart';
import 'package:catch_ui/src/components/catch_notice_tone.dart';
import 'package:catch_ui/src/foundations/catch_icons.dart';
import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:catch_ui/src/primitives/catch_legacy_surface.dart';
import 'package:catch_ui/src/primitives/catch_text.dart';
import 'package:catch_ui/src/primitives/catch_text_variant.dart';
import 'package:flutter/material.dart';

class CatchNotice extends StatelessWidget {
  const CatchNotice({
    super.key,
    required this.notice,
    required this.dismissLabel,
    this.onDismiss,
  }) : _inline = false;

  /// The system Notice: a tinted block in the flow (help, a warning, a
  /// result) with its icon, an optional [title] and the [body] copy.
  /// [CatchNoticeTone.status] is the system's info tone, in indigo.
  CatchNotice.inline({
    super.key,
    required String body,
    String? title,
    CatchNoticeTone tone = CatchNoticeTone.status,
    IconData? icon,
  }) : notice = title == null
           ? CatchNoticeData(id: body, title: body, tone: tone, icon: icon)
           : CatchNoticeData(
               id: title,
               title: title,
               message: body,
               tone: tone,
               icon: icon,
             ),
       dismissLabel = '',
       onDismiss = null,
       _inline = true;

  final CatchNoticeData notice;
  final bool _inline;

  /// Caller-resolved accessibility copy for the optional dismiss control.
  final String dismissLabel;
  final VoidCallback? onDismiss;

  @override
  Widget build(BuildContext context) {
    if (_inline) return _inlineNotice(context);
    final palette = _NoticePalette.from(
      CatchTokens.of(context),
      notice.tone,
      accentColor: notice.accentColor,
    );
    final person = notice.person;
    final actionLabel = notice.actionLabel;
    final onAction = notice.onAction;
    final titleStyle = CatchTextStyles.titleS(
      context,
      color: palette.foreground,
    );
    final action = actionLabel == null || onAction == null
        ? null
        : CatchButton(
            label: actionLabel,
            onPressed: onAction,
            size: CatchButtonSize.md,
            variant: CatchButtonVariant.secondary,
          );
    final dismiss = onDismiss == null || notice.onOpen != null
        ? null
        : CatchIconAction(
            variant: CatchIconActionVariant.plain,
            size: CatchSpacing.s12,
            tooltip: dismissLabel,
            onPressed: onDismiss,
            child: Icon(
              CatchIcons.close,
              color: palette.secondary,
              size: CatchIconSize.md,
            ),
          );

    return Semantics(
      container: true,
      liveRegion: true,
      onDismiss: notice.onOpen != null ? onDismiss : null,
      label: [
        notice.title,
        if (notice.message != null) notice.message!,
      ].join('. '),
      child: CatchLegacySurface(
        onTap: notice.onOpen == null
            ? null
            : () {
                onDismiss?.call();
                notice.onOpen!();
              },
        emphasis: CatchSurfaceEmphasis.floating,
        borderSpec: CatchBorder.resolve(
          CatchTokens.of(context),
          CatchBorderRole.boundary,
          color: palette.border,
        ),
        backgroundColor: palette.background,
        padding: const EdgeInsets.symmetric(
          horizontal: CatchSpacing.s3,
          vertical: CatchSpacing.s3,
        ),
        child: LayoutBuilder(
          builder: (context, constraints) {
            var actionBelow = false;
            if (action != null) {
              final titlePainter = TextPainter(
                text: TextSpan(text: notice.title, style: titleStyle),
                textDirection: Directionality.of(context),
                textScaler: MediaQuery.textScalerOf(context),
                locale: Localizations.maybeLocaleOf(context),
              )..layout();
              final inlineWidth =
                  CatchLayout.noticeIconExtent +
                  CatchSpacing.s3 +
                  titlePainter.width.ceilToDouble() +
                  CatchSpacing.s2 +
                  CatchButton.minimumLabelWidth(
                    context,
                    actionLabel!,
                    size: CatchButtonSize.md,
                  ) +
                  (dismiss == null
                      ? 0
                      : CatchSpacing.s1 +
                            CatchIconAction.targetExtentFor(CatchSpacing.s12));
              titlePainter.dispose();
              actionBelow = inlineWidth > constraints.maxWidth;
            }
            return Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    if (person != null)
                      CatchAvatar(
                        size: CatchLayout.noticeIconExtent,
                        name: person.name,
                        imageUrl: person.imageUrl,
                        initials: person.initials,
                      )
                    else
                      DecoratedBox(
                        decoration: BoxDecoration(
                          color: palette.iconBackground,
                          borderRadius: BorderRadius.circular(CatchRadius.pill),
                        ),
                        child: SizedBox.square(
                          dimension: CatchLayout.noticeIconExtent,
                          child: Icon(
                            notice.icon,
                            color: palette.icon,
                            size: CatchIconSize.control,
                          ),
                        ),
                      ),
                    const SizedBox(width: CatchSpacing.s3),
                    Expanded(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(notice.title, style: titleStyle),
                          if (notice.message != null) ...[
                            const SizedBox(
                              height: CatchLayout.noticeTitleMessageGap,
                            ),
                            Text(
                              notice.message!,
                              style: CatchTextStyles.supporting(
                                context,
                                color: palette.secondary,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                    if (action != null && !actionBelow) ...[
                      const SizedBox(width: CatchSpacing.s2),
                      action,
                    ],
                    if (dismiss != null) ...[
                      const SizedBox(width: CatchSpacing.s1),
                      dismiss,
                    ],
                  ],
                ),
                if (action != null && actionBelow)
                  Padding(
                    padding: const EdgeInsetsDirectional.only(
                      start: CatchLayout.noticeIconExtent + CatchSpacing.s3,
                      top: CatchSpacing.s2,
                    ),
                    child: action,
                  ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _inlineNotice(BuildContext context) {
    final t = CatchTokens.of(context);
    final (fill, iconColor) = switch (notice.tone) {
      CatchNoticeTone.success => (t.tintMint, t.deepMint),
      CatchNoticeTone.warning => (t.tintYellow, t.deepYellow),
      CatchNoticeTone.danger => (t.tintCoral, t.deepCoral),
      CatchNoticeTone.status ||
      CatchNoticeTone.event => (t.tintIndigo, t.deepIndigo),
    };
    final icon = notice.hasIcon
        ? notice.icon
        : switch (notice.tone) {
            CatchNoticeTone.success => CatchIcons.success,
            CatchNoticeTone.warning => CatchIcons.warning,
            CatchNoticeTone.danger => CatchIcons.error,
            CatchNoticeTone.status || CatchNoticeTone.event => CatchIcons.info,
          };
    final message = notice.message;
    final title = message == null ? null : notice.title;
    final body = message ?? notice.title;
    return Semantics(
      container: true,
      liveRegion: notice.tone == CatchNoticeTone.danger,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: fill,
          borderRadius: BorderRadius.circular(CatchRadius.md),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: CatchSpacing.micro14,
            vertical: CatchSpacing.s3,
          ),
          child: DefaultTextStyle.merge(
            style: TextStyle(color: t.ink),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              spacing: CatchSpacing.s3,
              children: [
                Padding(
                  padding: const EdgeInsets.only(top: CatchStroke.hairline),
                  child: Icon(
                    icon,
                    size: CatchIconSize.control,
                    color: iconColor,
                  ),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    spacing: CatchSpacing.micro2,
                    children: [
                      if (title != null)
                        CatchText(title, variant: CatchTextVariant.titleRow),
                      CatchText(body, variant: CatchTextVariant.bodySmall),
                    ],
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

class _NoticePalette {
  const _NoticePalette({
    required this.background,
    required this.foreground,
    required this.secondary,
    required this.icon,
    required this.iconBackground,
    required this.border,
  });

  final Color background;
  final Color foreground;
  final Color secondary;
  final Color icon;
  final Color iconBackground;
  final Color border;

  factory _NoticePalette.from(
    CatchTokens t,
    CatchNoticeTone tone, {
    Color? accentColor,
  }) {
    final toneColor =
        accentColor ??
        switch (tone) {
          CatchNoticeTone.status => t.accent,
          CatchNoticeTone.success => t.success,
          CatchNoticeTone.warning => t.warning,
          CatchNoticeTone.danger => t.danger,
          CatchNoticeTone.event => t.primary,
        };

    return _NoticePalette(
      background: Color.lerp(t.surface, toneColor, CatchOpacity.noticeFill)!,
      foreground: t.ink,
      secondary: t.ink2,
      icon: toneColor,
      iconBackground: Color.lerp(
        t.surface,
        toneColor,
        CatchOpacity.noticeIconFill,
      )!,
      border: Color.lerp(t.line, toneColor, CatchOpacity.noticeBorder)!,
    );
  }
}
