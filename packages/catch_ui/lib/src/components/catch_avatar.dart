// ignore_for_file: prefer_initializing_formals

import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_avatar_colors.dart';
import 'package:catch_ui/src/components/catch_avatar_initials.dart';
import 'package:catch_ui/src/components/catch_avatar_initials_surface.dart';
import 'package:catch_ui/src/components/catch_avatar_variant.dart';
import 'package:catch_ui/src/components/catch_avatar_viewport.dart';
import 'package:catch_ui/src/foundations/catch_icons.dart';
import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:catch_ui/src/primitives/catch_network_image.dart';
import 'package:flutter/material.dart';

/// The dot at an avatar's corner: [online] and [checkedIn] (at the door)
/// in green, [away] in yellow.
enum CatchAvatarStatus { none, online, checkedIn, away }

/// The system avatar sizes: xs 24, sm 28, md 40, lg 48, xl 64, xxl 104.
/// From xl up the initials take the display voice.
enum CatchAvatarSize {
  xs(GeneratedCatchSizeTokens.avatarXs, CatchSpacing.s3),
  sm(GeneratedCatchSizeTokens.avatarSm, CatchSpacing.s3),
  md(GeneratedCatchSizeTokens.avatarMd, CatchSpacing.micro14),
  lg(GeneratedCatchSizeTokens.avatarLg, CatchSpacing.s4),
  xl(GeneratedCatchSizeTokens.avatarXl, CatchSpacing.s6),
  xxl(GeneratedCatchSizeTokens.avatarXxl, CatchSpacing.s10);

  const CatchAvatarSize(this.extent, this.initialsSize);

  /// The diameter in logical pixels.
  final double extent;

  /// The type size of the initials.
  final double initialsSize;
}

/// The fill behind system initials: ink, indigo or an event format. Null
/// picks one from the name, so a person keeps the same colour everywhere.
enum CatchAvatarColor {
  ink,
  indigo,
  run,
  dinner,
  games,
  courts,
  nightsOut;

  static CatchAvatarColor of(String name) {
    const palette = [run, dinner, games, courts, nightsOut, indigo];
    final hash = name.runes.fold<int>(7, (h, c) => (h * 31 + c) & 0x7fffffff);
    return palette[hash % palette.length];
  }

  /// The fill and the ink of the initials on it.
  (Color, Color) resolve(CatchTokens t) => switch (this) {
    CatchAvatarColor.ink => (t.ink, t.surface),
    CatchAvatarColor.indigo => (t.indigo, CatchTokens.editorialBlack),
    CatchAvatarColor.run => (CatchFormat.run.accent, CatchFormat.run.ink),
    CatchAvatarColor.dinner => (
      CatchFormat.dinner.accent,
      CatchFormat.dinner.ink,
    ),
    CatchAvatarColor.games => (CatchFormat.games.accent, CatchFormat.games.ink),
    CatchAvatarColor.courts => (
      CatchFormat.courts.accent,
      CatchFormat.courts.ink,
    ),
    CatchAvatarColor.nightsOut => (
      CatchFormat.nightsOut.accent,
      CatchFormat.nightsOut.ink,
    ),
  };
}

/// Canonical avatar for photos, initials, activity identity, counts and veils.
/// Callers own names, image URLs, count copy and activity colors. This component
/// owns fallback selection, the clipping frame, ring and optional online dot.
class CatchAvatar extends StatelessWidget {
  const CatchAvatar({
    super.key,
    required this.size,
    this.name = '',
    this.imageUrl,
    this.initials,
    this.borderWidth = 0,
    this.borderColor,
    this.status = CatchAvatarStatus.none,
    this.obscured = false,
    this.variant = CatchAvatarVariant.circle,
    this.colors,
    this.dim = false,
  }) : _count = null,
       countLabelBuilder = null,
       _veiled = false,
       ground = null,
       _system = null;

  /// The system Avatar: a photo, or initials on a [color] from the palette
  /// (picked from the name when null) at one of the system sizes. A square
  /// [variant] is an organiser logo.
  CatchAvatar.system({
    super.key,
    required CatchAvatarSize size,
    this.name = '',
    this.imageUrl,
    this.initials,
    CatchAvatarColor? color,
    this.status = CatchAvatarStatus.none,
    this.variant = CatchAvatarVariant.circle,
  }) : size = size.extent,
       _system = (size: size, color: color ?? CatchAvatarColor.of(name)),
       borderWidth = 0,
       borderColor = null,
       obscured = false,
       colors = null,
       dim = false,
       _count = null,
       countLabelBuilder = null,
       _veiled = false,
       ground = null;

  /// Initials on a palette ground (Website v2): the ground's fill and ink. At
  /// sizes where the initials reach 24px they take the display voice.
  const CatchAvatar.monogram({
    super.key,
    required this.size,
    required CatchBandGround this.ground,
    this.name = '',
    this.initials,
    this.borderWidth = 0,
    this.borderColor,
    this.variant = CatchAvatarVariant.circle,
  }) : _count = null,
       countLabelBuilder = null,
       _veiled = false,
       imageUrl = null,
       status = CatchAvatarStatus.none,
       obscured = false,
       colors = null,
       dim = false,
       _system = null;

  /// A count bubble with caller-owned formatting, including localization.
  const CatchAvatar.count({
    super.key,
    required this.size,
    required int count,
    required String Function(int) this.countLabelBuilder,
    this.borderWidth = 0,
    this.borderColor,
  }) : _count = count,
       _veiled = false,
       name = '',
       imageUrl = null,
       initials = null,
       status = CatchAvatarStatus.none,
       obscured = false,
       variant = CatchAvatarVariant.circle,
       colors = null,
       dim = false,
       ground = null,
       _system = null;

  /// A caller-colored anonymous slot in a hidden roster.
  const CatchAvatar.veiled({
    super.key,
    required this.size,
    required CatchAvatarColors this.colors,
    required this.borderWidth,
    required Color this.borderColor,
  }) : _veiled = true,
       _count = null,
       countLabelBuilder = null,
       name = '',
       imageUrl = null,
       initials = null,
       status = CatchAvatarStatus.none,
       obscured = false,
       variant = CatchAvatarVariant.circle,
       dim = false,
       ground = null,
       _system = null;

  final double size;
  final String name;
  final String? imageUrl;
  final String? initials;
  final double borderWidth;
  final Color? borderColor;
  final CatchAvatarStatus status;
  final bool obscured;
  final CatchAvatarVariant variant;
  final CatchAvatarColors? colors;
  final bool dim;
  final String Function(int)? countLabelBuilder;

  /// The palette ground of a [CatchAvatar.monogram].
  final CatchBandGround? ground;
  final int? _count;
  final bool _veiled;
  final ({CatchAvatarSize size, CatchAvatarColor color})? _system;

  static String initialsOf(String value) => catchAvatarInitialsOf(value);

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final innerSize = size - borderWidth * 2;
    final Widget content;
    var obscuresContent = false;
    final system = _system;
    if (system != null) {
      final (fill, ink) = system.color.resolve(t);
      final label = initials ?? catchAvatarInitialsOf(name);
      final initialsLayer = ColoredBox(
        color: fill,
        child: label.isEmpty
            ? null
            : CatchAvatarViewport.label(
                size: innerSize,
                child: Text(
                  label,
                  style: CatchTextStyles.avatarMonogram(
                    context,
                    size: system.size.initialsSize,
                    color: ink,
                  ),
                ),
              ),
      );
      final url = imageUrl;
      content = url == null || url.isEmpty
          ? initialsLayer
          : CatchNetworkImage(
              url,
              errorBuilder: (context, _, _) => initialsLayer,
            );
    } else if (ground case final ground?) {
      final label = initials ?? catchAvatarInitialsOf(name);
      content = ColoredBox(
        color: ground.fillColor,
        child: label.isEmpty
            ? null
            : CatchAvatarViewport.label(
                size: innerSize,
                child: Text(
                  label,
                  style: CatchTextStyles.avatarMonogram(
                    context,
                    size: innerSize * CatchLayout.personAvatarInitialsScale,
                    color: ground.inkColor,
                  ),
                ),
              ),
      );
    } else if (_veiled) {
      content = ColoredBox(
        color: colors!.soft,
        child: Center(
          child: Icon(
            CatchIcons.person,
            size: innerSize * CatchLayout.avatarVeilGlyphScale,
            color: colors!.deep.withValues(
              alpha: CatchOpacity.avatarFallbackGlyph,
            ),
          ),
        ),
      );
    } else if (_count != null) {
      content = ColoredBox(
        color: t.raised,
        child: CatchAvatarViewport.label(
          size: innerSize,
          child: Text(
            countLabelBuilder!(_count),
            style: CatchTextStyles.avatarCount(
              context,
              size: innerSize * CatchLayout.avatarCountFontScale,
              color: t.ink2,
            ),
          ),
        ),
      );
    } else if (imageUrl != null && imageUrl!.isNotEmpty) {
      content = CatchNetworkImage(
        imageUrl!,
        errorBuilder: (context, _, _) => colors == null
            ? CatchAvatarInitialsSurface(
                name: name,
                initials: initials,
                size: innerSize,
              )
            : CatchAvatarInitialsSurface.activity(
                colors: colors!,
                initials: initials ?? catchAvatarInitialsOf(name),
                size: innerSize,
                dim: dim,
              ),
      );
      obscuresContent = obscured;
    } else if (colors != null) {
      content = CatchAvatarInitialsSurface.activity(
        colors: colors!,
        initials: initials ?? catchAvatarInitialsOf(name),
        size: innerSize,
        dim: dim,
      );
    } else {
      content = CatchAvatarInitialsSurface(
        name: name,
        initials: initials,
        size: innerSize,
      );
      obscuresContent = obscured;
    }

    Widget avatar = obscuresContent
        ? CatchAvatarViewport.obscured(
            size: innerSize,
            variant: variant,
            child: content,
          )
        : CatchAvatarViewport(
            size: innerSize,
            variant: variant,
            child: content,
          );
    if (borderWidth > 0) {
      avatar = Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: variant == CatchAvatarVariant.circle
              ? BoxShape.circle
              : BoxShape.rectangle,
          borderRadius: variant == CatchAvatarVariant.square
              ? BorderRadius.circular(CatchRadius.md)
              : null,
          color: borderColor ?? Colors.transparent,
        ),
        padding: EdgeInsets.all(borderWidth),
        child: avatar,
      );
    }
    if (status == CatchAvatarStatus.none) return avatar;
    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        children: [
          avatar,
          Positioned(
            right: 0,
            bottom: 0,
            child: Container(
              width: CatchLayout.avatarStatusDotExtent,
              height: CatchLayout.avatarStatusDotExtent,
              decoration: BoxDecoration(
                color: status == CatchAvatarStatus.away
                    ? t.formatGames
                    : t.success,
                shape: BoxShape.circle,
                border: Border.all(
                  color: t.surface,
                  width: CatchStroke.underline,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
