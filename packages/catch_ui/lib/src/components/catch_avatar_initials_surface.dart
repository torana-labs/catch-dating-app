import 'dart:math' as math;

import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_avatar.dart';
import 'package:catch_ui/src/components/catch_avatar_colors.dart';
import 'package:catch_ui/src/components/catch_avatar_initials.dart';
import 'package:catch_ui/src/components/catch_avatar_viewport.dart';
import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:flutter/material.dart';

enum CatchAvatarInitialsSurfaceVariant { person, activity }

/// The initials layer of an avatar; its parent owns clipping, photos and status.
/// People use quiet paper/ink. The activity recipe uses caller-resolved pigment.
class CatchAvatarInitialsSurface extends StatelessWidget {
  const CatchAvatarInitialsSurface({
    super.key,
    required this.name,
    required this.size,
    this.initials,
  }) : variant = CatchAvatarInitialsSurfaceVariant.person,
       colors = null,
       dim = false;

  const CatchAvatarInitialsSurface.activity({
    super.key,
    required CatchAvatarColors this.colors,
    required String this.initials,
    required this.size,
    this.dim = false,
  }) : variant = CatchAvatarInitialsSurfaceVariant.activity,
       name = '';

  final String name;
  final double size;
  final String? initials;
  final CatchAvatarInitialsSurfaceVariant variant;
  final CatchAvatarColors? colors;
  final bool dim;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final activity = variant == CatchAvatarInitialsSurfaceVariant.activity;
    final label = initials ?? catchAvatarInitialsOf(name);
    // A person's initials sit on their palette colour, the same for them
    // everywhere, as the system Avatar draws them; no initials keep a quiet
    // tile.
    final (personFill, personInk) = label.isEmpty
        ? (t.tile, t.ink2)
        : CatchAvatarColor.of(name).resolve(t);

    return Stack(
      fit: StackFit.expand,
      children: [
        if (activity)
          DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                transform: const GradientRotation(
                  CatchLayout.activityAvatarGradientRotationDegrees *
                      math.pi /
                      180,
                ),
                colors: [colors!.accent, colors!.deep],
              ),
              border: Border.all(
                color: CatchTokens.editorialWhite.withValues(
                  alpha: CatchOpacity.activityAvatarInnerRule,
                ),
              ),
            ),
          )
        else
          ColoredBox(color: personFill),
        if (activity) CustomPaint(painter: _ActivityAvatarTexturePainter()),
        if (label.isNotEmpty)
          CatchAvatarViewport.label(
            size: size,
            child: Text(
              label,
              style: CatchTextStyles.avatarInitials(
                context,
                size:
                    size *
                    (activity
                        ? CatchLayout.activityAvatarInitialsScale
                        : CatchLayout.personAvatarInitialsScale),
                color: activity ? CatchTokens.editorialWhite : personInk,
              ),
            ),
          ),
        if (dim)
          ColoredBox(
            color: CatchTokens.editorialBlack.withValues(
              alpha: CatchOpacity.activityAvatarDim,
            ),
          ),
      ],
    );
  }
}

class _ActivityAvatarTexturePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = CatchTokens.editorialWhite.withValues(
        alpha: CatchOpacity.activityAvatarPrint,
      )
      ..strokeWidth = CatchLayout.activityAvatarTextureStrokeWidth;
    final stride = CatchLayout.activityAvatarTextureStride;
    for (
      double offset = -size.height;
      offset < size.width + size.height;
      offset += stride
    ) {
      canvas.drawLine(
        Offset(offset, size.height),
        Offset(offset + size.height, 0),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _ActivityAvatarTexturePainter oldDelegate) =>
      false;
}
