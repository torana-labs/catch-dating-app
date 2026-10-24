import 'package:catch_dating_app/image_uploads/shared/photo_grid_keys.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/user_profile/domain/profile_prompts.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class PhotoSlotTile extends StatelessWidget {
  const PhotoSlotTile({
    super.key,
    required this.index,
    required this.url,
    required this.isLoading,
    required this.isActive,
    required this.onTap,
    this.prompt,
    this.badgeLabel,
    this.onDelete,
    this.isReorderTarget = false,
  });

  final int index;
  final String? url;
  final bool isLoading;
  final bool isActive;
  final VoidCallback onTap;
  final PhotoPromptAnswer? prompt;
  final String? badgeLabel;
  final VoidCallback? onDelete;
  final bool isReorderTarget;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final borderRadius = BorderRadius.circular(CatchRadius.lg);

    final hasPhoto = url != null;
    final isPendingPhoto = isLoading && !hasPhoto;
    final promptLabel = prompt?.displayPrompt.trim();
    final mainBadgeLabel = badgeLabel?.trim();
    final label = switch ((hasPhoto, isLoading, isActive)) {
      (true, true, _) =>
        context.l10n.imageUploadsPhotoSlotLabelPhotoValue1Uploading(
          value1: index + 1,
        ),
      (true, false, _) =>
        context.l10n.imageUploadsPhotoSlotLabelEditPhotoValue1(
          value1: index + 1,
        ),
      (false, true, _) =>
        context.l10n.imageUploadsPhotoSlotLabelPhotoValue1Uploading(
          value1: index + 1,
        ),
      (false, false, true) =>
        context.l10n.imageUploadsPhotoSlotLabelAddPhotoValue1(
          value1: index + 1,
        ),
      _ => context.l10n.imageUploadsPhotoSlotLabelPhotoSlotValue1Unavailable(
        value1: index + 1,
      ),
    };

    final Widget content;
    if (url != null) {
      content = CatchGradedImage(
        child: CatchNetworkImage(
          url!,
          width: double.infinity,
          height: double.infinity,
          errorBuilder: (context, error, stackTrace) => ColoredBox(
            color: t.raised,
            child: Center(
              child: Icon(
                CatchIcons.brokenImageOutlined,
                size: CatchIcon.tile,
                color: t.ink2,
              ),
            ),
          ),
        ),
      );
    } else if (isPendingPhoto) {
      content = PhotoPlaceholderImage(index: index);
    } else if (isActive) {
      content = Center(
        child: Icon(CatchIcons.addRounded, size: CatchIcon.hero, color: t.ink3),
      );
    } else {
      content = Center(
        child: Icon(
          CatchIcons.addRounded,
          size: CatchIcon.hero,
          color: t.ink3.withValues(alpha: CatchOpacity.disabledControl),
        ),
      );
    }

    final showMainBadge =
        hasPhoto &&
        !isLoading &&
        mainBadgeLabel != null &&
        mainBadgeLabel.isNotEmpty;

    return Semantics(
      container: true,
      label: label,
      button: isActive && !isLoading,
      enabled: isActive && !isLoading,
      image: hasPhoto,
      child: Tooltip(
        message: label,
        excludeFromSemantics: true,
        child: CatchSurface(
          borderRadius: borderRadius,
          tone: CatchSurfaceTone.raised,
          clipBehavior: Clip.antiAlias,
          child: Stack(
            fit: StackFit.expand,
            children: [
              content,
              if (isLoading)
                ColoredBox(
                  color: CatchTokens.editorialBlack.withValues(
                    alpha: CatchOpacity.photoUploadLoadingScrim,
                  ),
                  child: const Center(
                    child: CatchLoadingIndicator(
                      color: CatchTokens.editorialWhite,
                    ),
                  ),
                ),
              if (showMainBadge)
                Positioned(
                  top: CatchSpacing.s2,
                  left: CatchSpacing.s2,
                  child: ExcludeSemantics(
                    child: CatchBadge.functional(
                      label: mainBadgeLabel,
                      backgroundColor: t.ink,
                      foregroundColor: t.bg,
                      borderColor: Colors.transparent,
                    ),
                  ),
                ),
              if (!isLoading && url != null)
                Positioned(
                  bottom: CatchSpacing.micro6,
                  right: CatchSpacing.micro6,
                  child: CatchIconTile(
                    icon: CatchIcons.editOutlined,
                    iconColor: t.ink,
                    backgroundColor: t.surface.withValues(
                      alpha: CatchOpacity.photoSlotEditChrome,
                    ),
                    borderColor: t.surface.withValues(
                      alpha: CatchOpacity.photoSlotEditChrome,
                    ),
                    size: CatchIcon.row,
                    iconSize: CatchIcon.sm,
                    radius: CatchRadius.pill,
                  ),
                ),
              if (!isLoading &&
                  hasPhoto &&
                  promptLabel != null &&
                  promptLabel.isNotEmpty)
                Positioned(
                  left: CatchSpacing.micro6,
                  right: CatchLayout.photoSlotDeleteControlInset,
                  bottom: CatchSpacing.micro6,
                  child: CatchSurface(
                    radius: CatchRadius.sm,
                    backgroundColor: CatchTokens.editorialBlack.withValues(
                      alpha: CatchOpacity.photoPromptScrim,
                    ),
                    padding: CatchInsets.infoTileContent,
                    child: CatchText(
                      prompt!.displayPrompt,
                      variant: CatchTextVariant.statusLabel,
                      color: CatchTokens.editorialWhite,
                      maxLines: 1,
                    ),
                  ),
                ),
              Material(
                type: MaterialType.transparency,
                borderRadius: borderRadius,
                clipBehavior: Clip.antiAlias,
                child: InkWell(
                  onTap: isActive && !isLoading ? onTap : null,
                  borderRadius: borderRadius,
                ),
              ),
              if (!isLoading && onDelete != null)
                Positioned(
                  top: CatchSpacing.s1,
                  right: CatchSpacing.s1,
                  child: Tooltip(
                    message: context.l10n
                        .imageUploadsPhotoSlotMessageDeletePhotoValue1(
                          value1: index + 1,
                        ),
                    child: Material(
                      color: t.surface.withValues(
                        alpha: CatchOpacity.photoSlotDeleteChrome,
                      ),
                      shape: const CircleBorder(),
                      clipBehavior: Clip.antiAlias,
                      child: InkWell(
                        key: PhotoGridKeys.delete(index),
                        customBorder: const CircleBorder(),
                        onTap: onDelete,
                        child: SizedBox.square(
                          dimension: CatchLayout.photoSlotDeleteExtent,
                          child: Icon(
                            CatchIcons.closeRounded,
                            size: CatchIcon.sm,
                            color: t.ink,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              IgnorePointer(
                child: CustomPaint(
                  painter: _PhotoSlotBorderPainter(
                    borderRadius: borderRadius,
                    color: isReorderTarget ? t.primary : t.line2,
                    width: isReorderTarget
                        ? CatchStroke.selection - 1
                        : hasPhoto || isPendingPhoto
                        ? CatchStroke.hairline
                        : CatchStroke.underline,
                    dashed: !hasPhoto && !isPendingPhoto,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class PhotoPlaceholderImage extends StatelessWidget {
  const PhotoPlaceholderImage({super.key, required this.index});

  final int index;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return CustomPaint(
      painter: _PhotoSlotStripePainter(
        background: t.raised,
        stripe: t.ink.withValues(alpha: 0.05),
      ),
      child: Center(
        child: ExcludeSemantics(
          child: Text(
            context.l10n.imageUploadsPhotoSlotTextPhotoPadleft(
              padLeft: (index + 1).toString().padLeft(2, '0'),
            ),
            style: CatchTextStyles.monoLabelS(context, color: t.ink3),
            textAlign: TextAlign.center,
          ),
        ),
      ),
    );
  }
}

class _PhotoSlotStripePainter extends CustomPainter {
  const _PhotoSlotStripePainter({
    required this.background,
    required this.stripe,
  });

  final Color background;
  final Color stripe;

  @override
  void paint(Canvas canvas, Size size) {
    final backgroundPaint = Paint()..color = background;
    canvas.drawRect(Offset.zero & size, backgroundPaint);

    final stripePaint = Paint()
      ..color = stripe
      ..strokeWidth = CatchSpacing.s2;
    const gap = CatchSpacing.micro18;
    for (double start = -size.height; start < size.width; start += gap) {
      canvas.drawLine(
        Offset(start, size.height),
        Offset(start + size.height, 0),
        stripePaint,
      );
    }
  }

  @override
  bool shouldRepaint(_PhotoSlotStripePainter oldDelegate) =>
      oldDelegate.background != background || oldDelegate.stripe != stripe;
}

class _PhotoSlotBorderPainter extends CustomPainter {
  const _PhotoSlotBorderPainter({
    required this.borderRadius,
    required this.color,
    required this.width,
    required this.dashed,
  });

  final BorderRadius borderRadius;
  final Color color;
  final double width;
  final bool dashed;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final rrect = borderRadius.toRRect(rect).deflate(width / 2);
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = width;
    if (!dashed) {
      canvas.drawRRect(rrect, paint);
      return;
    }

    final path = Path()..addRRect(rrect);
    for (final metric in path.computeMetrics()) {
      double distance = 0;
      const dash = CatchSpacing.s2;
      const gap = CatchSpacing.s1;
      while (distance < metric.length) {
        final next = (distance + dash).clamp(0, metric.length).toDouble();
        canvas.drawPath(metric.extractPath(distance, next), paint);
        distance += dash + gap;
      }
    }
  }

  @override
  bool shouldRepaint(_PhotoSlotBorderPainter oldDelegate) =>
      oldDelegate.borderRadius != borderRadius ||
      oldDelegate.color != color ||
      oldDelegate.width != width ||
      oldDelegate.dashed != dashed;
}
