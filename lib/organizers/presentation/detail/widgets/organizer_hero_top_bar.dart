import 'dart:async';
import 'dart:math' as math;

import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/kernel/city_catalog.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/organizers/presentation/detail/widgets/organizer_share_card.dart';
import 'package:catch_dating_app/organizers/shared/organizer_cover.dart';
import 'package:catch_dating_app/organizers/shared/organizer_transition_tags.dart';
import 'package:catch_dating_app/platform/device/external_share.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

typedef OrganizerShareHandler =
    Future<void> Function(BuildContext context, Organizer organizer);

enum OrganizerHeroVariant { poster, masthead, full }

enum OrganizerHeroPresentationMode { route, embeddedReadOnlyPreview }

@visibleForTesting
OrganizerHeroVariant organizerHeroVariantFor(Organizer organizer) {
  if (organizer.primaryOrganizerPhotoUrl != null) {
    return OrganizerHeroVariant.poster;
  }
  if (_organizerHeroLogoUrl(organizer) != null) {
    return OrganizerHeroVariant.masthead;
  }
  // The DS ClubHero also defines a full variant, but there is no product or
  // domain trigger for it yet; production selection keeps it unreachable.
  return OrganizerHeroVariant.poster;
}

final EdgeInsets _organizerHeroLeadingPadding = CatchInsets.pageHorizontal.copyWith(
  top: CatchSpacing.micro10,
  bottom: CatchSpacing.micro6,
  right: 0,
);
final EdgeInsets _organizerHeroActionPadding = CatchInsets.pageHorizontal.copyWith(
  top: CatchSpacing.micro10,
  bottom: CatchSpacing.micro6,
  left: 0,
);

class OrganizerHeroTopBar extends StatelessWidget {
  const OrganizerHeroTopBar({
    super.key,
    required this.organizer,
    required this.isHost,
    this.locationLabel,
    this.onShareOrganizer,
    this.presentationMode = OrganizerHeroPresentationMode.route,
  });

  final Organizer organizer;
  final bool isHost;
  final String? locationLabel;
  final OrganizerShareHandler? onShareOrganizer;
  final OrganizerHeroPresentationMode presentationMode;

  @override
  Widget build(BuildContext context) {
    return CatchViewport.sliver(
      sliverBuilder: (context, viewport) {
        final t = CatchTokens.of(context);
        final width = viewport.width;
        final topInset = MediaQuery.paddingOf(context).top;
        final variant = organizerHeroVariantFor(organizer);
        final hasCover = organizer.primaryOrganizerPhotoUrl != null;
        final mediaHeight = _heroMediaHeightFor(width, hasCover: hasCover);
        final resolvedLocationLabel = locationLabel ?? _organizerLocationLabel(organizer);
        final kickerLabel = _organizerHeroKicker(organizer);
        final captionExtent = _heroCaptionExtentFor(
          context,
          width,
          kickerLabel: kickerLabel,
          title: organizer.name,
          locationLabel: resolvedLocationLabel,
        );
        final moduleHeight =
            mediaHeight + (organizerInteractionMediaInset * 2) + captionExtent;
        final heroModule = Material(
          color: Colors.transparent,
          child: OrganizerHeroHeader(
            organizer: organizer,
            variant: variant,
            mediaHeight: mediaHeight,
            captionExtent: captionExtent,
            kickerLabel: kickerLabel,
            locationLabel: resolvedLocationLabel,
          ),
        );

        if (presentationMode ==
            OrganizerHeroPresentationMode.embeddedReadOnlyPreview) {
          return SliverToBoxAdapter(
            child: SizedBox(height: moduleHeight, child: heroModule),
          );
        }

        final expandedHeight = (moduleHeight - topInset)
            .clamp(kToolbarHeight, moduleHeight)
            .toDouble();

        return SliverAppBar(
          expandedHeight: expandedHeight,
          pinned: true,
          backgroundColor: t.surface,
          elevation: 0,
          centerTitle: false,
          titleSpacing: 0,
          leadingWidth: CatchSpacing.s16,
          title: CatchCollapsedHeaderTitle(
            title: organizer.name,
            textKey: ValueKey(
              context.l10n.organizersOrganizerHeroAppBarTitleOrganizerDetailCollapsedTitle,
            ),
            style: CatchTextStyles.displayXs(context, color: t.ink),
          ),
          leading: Padding(
            padding: _organizerHeroLeadingPadding,
            child: CatchIconAction(
              tooltip: context.l10n.organizersOrganizerHeroAppBarTooltipBack,
              variant: CatchIconActionVariant.float,
              onPressed: () => Navigator.of(context).pop(),
              child: Icon(CatchIcons.back, size: CatchIconSize.md),
            ),
          ),
          actions: [
            Padding(
              padding: _organizerHeroActionPadding,
              child: Builder(
                builder: (buttonContext) => CatchIconAction(
                  tooltip: context.l10n.organizersOrganizerHeroAppBarTooltipShareOrganizer,
                  variant: CatchIconActionVariant.float,
                  onPressed: () => unawaited(
                    onShareOrganizer != null
                        ? onShareOrganizer!(buttonContext, organizer)
                        : shareOrganizer(
                            buttonContext,
                            organizer,
                            ProviderScope.containerOf(
                              buttonContext,
                              listen: false,
                            ).read(externalShareControllerProvider),
                          ),
                  ),
                  child: Icon(
                    CatchIcons.platformShare(
                      platform: Theme.of(context).platform,
                    ),
                    size: CatchIconSize.md,
                  ),
                ),
              ),
            ),
          ],
          flexibleSpace: FlexibleSpaceBar(
            collapseMode: CollapseMode.pin,
            background: ClipRect(
              child: OverflowBox(
                alignment: Alignment.topCenter,
                minHeight: moduleHeight,
                maxHeight: moduleHeight,
                child: SizedBox(
                  height: moduleHeight,
                  child: Hero(
                    tag: organizerInteractionHeroTag(organizer.id),
                    transitionOnUserGestures: true,
                    child: heroModule,
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

double _heroMediaHeightFor(double width, {required bool hasCover}) {
  final mediaWidth = width - (organizerInteractionMediaInset * 2);
  final aspectHeight = mediaWidth * CatchLayout.organizerDetailHeroCoverHeightRatio;
  if (!hasCover) {
    return width > CatchLayout.maxContentWidth
        ? CatchLayout.organizerDetailHeroNoCoverWideHeight
        : CatchLayout.organizerDetailHeroNoCoverPhoneHeight;
  }
  return width > CatchLayout.maxContentWidth
      ? aspectHeight.clamp(
          CatchLayout.organizerDetailHeroCoverWideMinHeight,
          CatchLayout.organizerDetailHeroCoverWideMaxHeight,
        )
      : aspectHeight;
}

double _heroCaptionExtentFor(
  BuildContext context,
  double width, {
  required String kickerLabel,
  required String title,
  required String locationLabel,
}) {
  final t = CatchTokens.of(context);
  final textDirection = Directionality.of(context);
  final textScaler = MediaQuery.textScalerOf(context);
  final captionWidth = CatchLayout.detailScreenContentWidthFor(width);
  final locationTextWidth = CatchLayout.organizerDetailHeroLocationTextWidthFor(
    captionWidth,
  );

  final kickerPainter = TextPainter(
    text: TextSpan(
      text: kickerLabel,
      style: CatchTextStyles.monoLabelS(context, color: t.ink),
    ),
    maxLines: 1,
    ellipsis: '...',
    textDirection: textDirection,
    textScaler: textScaler,
  )..layout(maxWidth: captionWidth);
  final titlePainter = TextPainter(
    text: TextSpan(
      text: title,
      style: CatchTextStyles.displayS(context, color: t.ink),
    ),
    maxLines: 2,
    ellipsis: '...',
    textDirection: textDirection,
    textScaler: textScaler,
  )..layout(maxWidth: captionWidth);
  final locationPainter = TextPainter(
    text: TextSpan(
      text: locationLabel,
      style: CatchTextStyles.bodyLead(context, color: t.ink2),
    ),
    maxLines: 1,
    ellipsis: '...',
    textDirection: textDirection,
    textScaler: textScaler,
  )..layout(maxWidth: locationTextWidth);
  final locationRowHeight = locationPainter.height > CatchIconSize.md
      ? locationPainter.height
      : CatchIconSize.md;

  return CatchLayout.organizerDetailHeroTitleTopPadding +
      kickerPainter.height +
      CatchSpacing.s2 +
      titlePainter.height +
      CatchLayout.organizerDetailHeroTitleLocationGap +
      locationRowHeight +
      CatchLayout.organizerDetailHeroTitleBottomPadding +
      CatchLayout.organizerDetailHeroCaptionSlack;
}

class OrganizerHeroHeader extends StatelessWidget {
  const OrganizerHeroHeader({
    super.key,
    required this.organizer,
    required this.variant,
    required this.mediaHeight,
    required this.captionExtent,
    required this.kickerLabel,
    required this.locationLabel,
  });

  final Organizer organizer;
  final OrganizerHeroVariant variant;
  final double mediaHeight;
  final double captionExtent;
  final String kickerLabel;
  final String locationLabel;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final module = switch (variant) {
      OrganizerHeroVariant.poster => _buildPoster(context),
      OrganizerHeroVariant.masthead => _buildMasthead(context),
      OrganizerHeroVariant.full => _buildFull(context),
    };

    return CatchSurface(
      key: const ValueKey('club-detail-hero-module'),
      duration: Duration.zero,
      radius: CatchRadius.none,
      backgroundColor: t.surface,
      child: module,
    );
  }

  Padding _buildPoster(BuildContext context) {
    return Padding(
      key: const ValueKey('club-detail-hero-poster-padding'),
      padding: organizerInteractionMediaPadding,
      child: SizedBox(
        key: const ValueKey('club-detail-hero-poster-frame'),
        height: mediaHeight + captionExtent,
        child: CatchPoster(
          media: OrganizerCover(
            organizer: organizer,
            semanticLabel: context.l10n
                .organizersOrganizerHeroAppBarSemanticlabelNameCoverPhoto(
                  name: organizer.name,
                ),
          ),
          kicker: kickerLabel,
          title: organizer.name,
          meta: locationLabel,
          titleMaxLines: 2,
          showArrow: false,
        ),
      ),
    );
  }

  Padding _buildMasthead(BuildContext context) {
    final t = CatchTokens.of(context);
    final logoUrl = _organizerHeroLogoUrl(organizer);

    return Padding(
      key: const ValueKey('club-detail-hero-masthead-padding'),
      padding: organizerInteractionMediaPadding,
      child: CatchSurface(
        key: const ValueKey('club-detail-hero-masthead'),
        height: mediaHeight + captionExtent,
        borderRole: CatchBorderRole.separator,
        radius: CatchLayout.posterRadius,
        backgroundColor: t.surface,
        padding: CatchInsets.tileContent,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(child: CatchMetadataText(kickerLabel, color: t.ink)),
                gapW12,
                CatchAvatar(
                  key: const ValueKey('club-detail-hero-logo-seal'),
                  size: CatchSpacing.s16,
                  name: organizer.name,
                  imageUrl: logoUrl,
                  borderWidth: CatchStroke.hairline,
                  borderColor: t.line,
                ),
              ],
            ),
            const Spacer(),
            CatchText(
              organizer.name,
              key: ValueKey(
                context.l10n.organizersOrganizerHeroAppBarTextOrganizerDetailExpandedTitle,
              ),
              variant: CatchTextVariant.displayS,
              color: t.ink,
              maxLines: 2,
            ),
            const SizedBox(height: CatchLayout.organizerDetailHeroTitleLocationGap),
            Row(
              children: [
                Icon(
                  CatchIcons.location,
                  size: CatchIconSize.md,
                  color: t.ink2,
                ),
                gapW6,
                Expanded(
                  child: CatchText(
                    locationLabel,
                    maxLines: 1,

                    variant: CatchTextVariant.bodyLead,
                    color: t.ink2,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Column _buildFull(BuildContext context) {
    final t = CatchTokens.of(context);
    final resolvedMediaPadding = organizerInteractionMediaPadding.resolve(
      Directionality.of(context),
    );
    final viewportTopRadius = _organizerHeroViewportTopCornerRadius(
      MediaQuery.of(context),
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ClipRSuperellipse(
          key: const ValueKey('club-detail-viewport-curve-frame'),
          clipBehavior: Clip.antiAliasWithSaveLayer,
          clipper: _OrganizerHeroViewportCurveClipper(
            padding: resolvedMediaPadding,
            viewportTopRadius: viewportTopRadius,
            cornerRadius: CatchRadius.lg,
          ),
          child: CatchSurface(
            duration: Duration.zero,
            radius: CatchRadius.none,
            backgroundColor: t.surface,
            child: Padding(
              key: const ValueKey('club-detail-hero-padding'),
              padding: organizerInteractionMediaPadding,
              child: CatchSurface(
                key: const ValueKey('club-detail-hero-frame'),
                backgroundColor: t.surface,
                borderSpec: CatchBorder.resolve(
                  t,
                  CatchBorderRole.boundary,
                  color: t.surface,
                ),
                clipBehavior: Clip.hardEdge,
                child: SizedBox(
                  height: mediaHeight,
                  child: CatchHeroImage(
                    imageUrl: organizer.primaryOrganizerPhotoUrl,
                    semanticLabel: context.l10n
                        .organizersOrganizerHeroAppBarSemanticlabelNameCoverPhoto(
                          name: organizer.name,
                        ),
                    showScrim: false,
                  ),
                ),
              ),
            ),
          ),
        ),
        Padding(
          key: const ValueKey('club-detail-hero-caption'),
          padding: const EdgeInsets.fromLTRB(
            CatchLayout.detailScreenHorizontalPadding,
            CatchLayout.organizerDetailHeroTitleTopPadding,
            CatchLayout.detailScreenHorizontalPadding,
            CatchLayout.organizerDetailHeroTitleBottomPadding,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              CatchMetadataText(kickerLabel, color: t.ink),
              gapH8,
              CatchText(
                organizer.name,
                key: ValueKey(
                  context.l10n.organizersOrganizerHeroAppBarTextOrganizerDetailExpandedTitle,
                ),
                variant: CatchTextVariant.displayS,
                color: t.ink,
                maxLines: 2,
              ),
              const SizedBox(
                height: CatchLayout.organizerDetailHeroTitleLocationGap,
              ),
              Row(
                children: [
                  Icon(
                    CatchIcons.location,
                    size: CatchIconSize.md,
                    color: t.ink2,
                  ),
                  gapW6,
                  Expanded(
                    child: CatchText(
                      locationLabel,
                      maxLines: 1,

                      variant: CatchTextVariant.bodyLead,
                      color: t.ink2,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}

String? _organizerHeroLogoUrl(Organizer organizer) => _trimmedOrNull(organizer.logoPhotoUrl);

String? _trimmedOrNull(String? value) {
  final trimmed = value?.trim();
  return trimmed == null || trimmed.isEmpty ? null : trimmed;
}

String _organizerHeroKicker(Organizer organizer) {
  final parts = [
    organizer.area.trim(),
    cityLabel(organizer.location).trim(),
  ].where((part) => part.isNotEmpty).toList(growable: false);
  if (parts.isEmpty) return 'CLUB';
  return parts.join(' · ').toUpperCase();
}

String _organizerLocationLabel(Organizer organizer) =>
    '${organizer.area}, ${cityLabel(organizer.location)}';

double _organizerHeroViewportTopCornerRadius(MediaQueryData mediaQuery) {
  const fallbackRadius = CatchRadius.lg;
  final shortestSide = mediaQuery.size.shortestSide;
  final topInset = mediaQuery.padding.top;
  if (shortestSide <= 0 || topInset <= 0) return fallbackRadius;

  final maxRadius = math.max(fallbackRadius, shortestSide * 0.18);
  final derivedRadius = topInset * 1.08;
  return derivedRadius.clamp(fallbackRadius, maxRadius).toDouble();
}

class _OrganizerHeroViewportCurveClipper extends CustomClipper<RSuperellipse> {
  const _OrganizerHeroViewportCurveClipper({
    required this.padding,
    required this.viewportTopRadius,
    required this.cornerRadius,
  });

  final EdgeInsets padding;
  final double viewportTopRadius;
  final double cornerRadius;

  @override
  RSuperellipse getClip(Size size) {
    final left = padding.left.clamp(0.0, size.width / 2).toDouble();
    final top = padding.top.clamp(0.0, size.height / 2).toDouble();
    final right = math.max(left, size.width - padding.right);
    final bottom = math.max(top, size.height - padding.bottom);
    final rect = Rect.fromLTRB(left, top, right, bottom);
    if (rect.isEmpty) {
      return RSuperellipse.fromRectAndCorners(Offset.zero & size);
    }

    final topDeflate = math.min(left, top);
    final topRadius = math.max(cornerRadius, viewportTopRadius - topDeflate);
    final maxCorner = rect.shortestSide / 2;

    return RSuperellipse.fromRectAndCorners(
      rect,
      topLeft: Radius.circular(math.min(topRadius, maxCorner)),
      topRight: Radius.circular(math.min(topRadius, maxCorner)),
      bottomLeft: Radius.circular(math.min(cornerRadius, maxCorner)),
      bottomRight: Radius.circular(math.min(cornerRadius, maxCorner)),
    );
  }

  @override
  bool shouldReclip(_OrganizerHeroViewportCurveClipper oldClipper) {
    return padding != oldClipper.padding ||
        viewportTopRadius != oldClipper.viewportTopRadius ||
        cornerRadius != oldClipper.cornerRadius;
  }
}

Future<void> shareOrganizer(
  BuildContext context,
  Organizer organizer,
  ExternalShareController share,
) async {
  await showOrganizerShareCardSheet(context, organizer: organizer, share: share);
}
