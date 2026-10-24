import 'dart:math' as math;

import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/core/analytics/app_analytics.dart';
import 'package:catch_dating_app/core/startup/startup_animation_scope.dart';
import 'package:catch_dating_app/core/theme/activity_palette.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/routing/go_router.dart' as app_router;
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

part 'welcome_motion.dart';

class OnboardingWelcomeBody extends ConsumerStatefulWidget {
  const OnboardingWelcomeBody({super.key, this.playIntro = true});

  static const splashTapTargetKey = ValueKey<String>(
    'welcome-splash-tap-target',
  );

  /// Allows tests and deterministic capture tools to render the landed state.
  final bool playIntro;

  @override
  ConsumerState<OnboardingWelcomeBody> createState() =>
      _OnboardingWelcomeBodyState();
}

class _OnboardingWelcomeBodyState extends ConsumerState<OnboardingWelcomeBody>
    with TickerProviderStateMixin {
  late final AnimationController _spinController;
  late final AnimationController _landingController;
  late final Listenable _sceneListenable;

  bool _started = false;
  bool _landed = false;
  bool _shownLogged = false;

  @override
  void initState() {
    super.initState();
    _spinController = AnimationController(
      vsync: this,
      duration: CatchMotion.welcomeReel,
    )..addStatusListener(_handleSpinStatus);
    _landingController = AnimationController(
      vsync: this,
      duration: CatchMotion.welcomeLandingReveal,
    );
    _sceneListenable = Listenable.merge([_spinController, _landingController]);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final renderLandedImmediately = _shouldRenderLandedImmediately(context);
    _logShown(
      renderLandedImmediately
          ? MediaQuery.of(context).disableAnimations
                ? context.l10n.onboardingWelcomePageVisiblecopyReducedMotion
                : context.l10n.onboardingWelcomePageVisiblecopyDirect
          : context.l10n.onboardingWelcomePageVisiblecopyAnimated,
    );
    if (renderLandedImmediately) {
      _land(immediate: true, notify: _started);
      return;
    }
    if (!_started && !_landed) {
      _started = true;
      _spinController.forward();
    }
  }

  @override
  void didUpdateWidget(covariant OnboardingWelcomeBody oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.playIntro && !widget.playIntro) {
      _land(immediate: true);
    }
  }

  @override
  void dispose() {
    _spinController
      ..removeStatusListener(_handleSpinStatus)
      ..dispose();
    _landingController.dispose();
    super.dispose();
  }

  void _handleSpinStatus(AnimationStatus status) {
    if (status == AnimationStatus.completed && !_landed) {
      _land(immediate: false);
    }
  }

  bool _shouldRenderLandedImmediately(BuildContext context) {
    return !widget.playIntro ||
        MediaQuery.of(context).disableAnimations ||
        (StartupAnimationScope.maybeOf(context) ?? false);
  }

  void _skip() {
    if (!_landed) {
      _logSkipped();
      _land(immediate: false);
    }
  }

  void _land({required bool immediate, bool notify = true}) {
    final wasLanded = _landed;
    _started = true;
    _landed = true;
    _spinController.stop();
    _spinController.value = 1;
    if (immediate) {
      _landingController.value = 1;
    } else if (_landingController.value == 0) {
      HapticFeedback.selectionClick();
      _landingController.forward();
    }
    if (notify && mounted && !wasLanded) {
      setState(() {});
    }
  }

  void _logShown(String motion) {
    if (_shownLogged) return;
    _shownLogged = true;
    ref
        .read(appAnalyticsProvider)
        .logEvent(
          AnalyticsEvents.welcomeSplashShown,
          parameters: {AnalyticsParameters.splashMotion: motion},
        );
  }

  void _logSkipped() {
    ref
        .read(appAnalyticsProvider)
        .logEvent(
          AnalyticsEvents.welcomeSplashSkipped,
          parameters: {
            AnalyticsParameters.splashMotion:
                context.l10n.onboardingWelcomePageVisiblecopyAnimated,
          },
        );
  }

  void _logCta(String cta) {
    ref
        .read(appAnalyticsProvider)
        .logEvent(
          AnalyticsEvents.welcomeCtaTapped,
          parameters: {AnalyticsParameters.cta: cta},
        );
  }

  @override
  Widget build(BuildContext context) {
    const d = CatchTokens.editorialDark;

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light.copyWith(
        statusBarColor: Colors.transparent,
        systemNavigationBarColor: d.bg,
        systemNavigationBarIconBrightness: Brightness.light,
      ),
      child: ColoredBox(
        color: d.bg,
        child: Semantics(
          button: !_landed,
          label: _landed
              ? null
              : context.l10n.onboardingWelcomePageLabelSkipWelcomeAnimation,
          onTap: _landed ? null : _skip,
          child: GestureDetector(
            key: OnboardingWelcomeBody.splashTapTargetKey,
            behavior: HitTestBehavior.opaque,
            onTap: _landed ? null : _skip,
            child: CatchViewport.scene(
              maxWidth: CatchWelcomeTokens.welcomeMaxWidth,
              builder: (context, viewport) => AnimatedBuilder(
                animation: _sceneListenable,
                builder: (context, _) {
                  return WelcomeSceneLayout(
                    viewportWidth: viewport.width,
                    viewportHeight: viewport.height,
                    mediaPadding: viewport.mediaPadding,
                    spinValue: _spinController.value,
                    landingValue: _landingController.value,
                    landed: _landed,
                    onContinue: () {
                      _logCta(
                        context
                            .l10n
                            .onboardingWelcomePageVisiblecopyContinuePhone,
                      );
                      context.go(_authLocation(context));
                    },
                    onExplore: () {
                      _logCta(
                        context.l10n.onboardingWelcomePageVisiblecopySeeWhatsOn,
                      );
                      context.goNamed(app_router.Routes.exploreScreen.name);
                    },
                  );
                },
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class WelcomeSceneLayout extends StatelessWidget {
  const WelcomeSceneLayout({
    super.key,
    required this.viewportWidth,
    required this.viewportHeight,
    required this.mediaPadding,
    required this.spinValue,
    required this.landingValue,
    required this.landed,
    required this.onContinue,
    required this.onExplore,
    this.showLandingContent = true,
  });

  static const catchWordKey = ValueKey<String>('welcome-reel-catch-word');

  final double viewportWidth;
  final double viewportHeight;
  final EdgeInsets mediaPadding;
  final double spinValue;
  final double landingValue;
  final bool landed;
  final VoidCallback onContinue;
  final VoidCallback onExplore;
  final bool showLandingContent;

  @override
  Widget build(BuildContext context) {
    const tokens = CatchTokens.editorialDark;
    final sceneWidth = viewportWidth;
    final wheelTop = CatchWelcomeTokens.welcomeReelTopFor(mediaPadding);
    final reelHeight = math.min(
      CatchWelcomeTokens.welcomeReelHeight,
      math.max(0.0, viewportHeight - wheelTop),
    );
    final catchTop = CatchWelcomeTokens.welcomeReelCatchTopFor(mediaPadding);
    final catchLeft = CatchWelcomeTokens.welcomeReelCatchLeftForWidth(
      sceneWidth,
    );
    final rightInset = CatchWelcomeTokens.welcomeReelRightForWidth(sceneWidth);
    final focusedPhraseIndex = welcomeFocusedPhraseIndex(
      spinValue: spinValue,
      landed: landed,
    );
    final focusedPhrase = welcomePhraseBank[focusedPhraseIndex];
    final pigment =
        ActivityPalette.pigments[focusedPhrase.activityKind] ??
        ActivityPalette.pigments[ActivityKind.openActivity]!;
    final colorCool = _durationProgress(
      landingValue,
      CatchMotion.welcomeTextCool,
    );
    final phraseColor = landed && focusedPhraseIndex == welcomeLandingIndex
        ? Color.lerp(pigment, tokens.ink, colorCool)!
        : pigment;
    final buttonsBottom = math.max(
      CatchWelcomeTokens.welcomeButtonsBottom,
      mediaPadding.bottom + CatchSpacing.s4,
    );
    final ctaTop =
        viewportHeight -
        buttonsBottom -
        CatchWelcomeTokens.welcomeCtaApproxHeight;
    final minBodyTop = catchTop + CatchWelcomeTokens.welcomeHeadlineToBodyGap;
    final maxBodyTop = math.max(
      minBodyTop,
      ctaTop -
          CatchWelcomeTokens.welcomeMinBodyToCtaGap -
          CatchWelcomeTokens.welcomeCtaApproxHeight,
    );
    final bodyTop = math
        .min(CatchWelcomeTokens.welcomeBodyTop, maxBodyTop)
        .clamp(minBodyTop, CatchWelcomeTokens.welcomeBodyTop)
        .toDouble();

    return Stack(
      clipBehavior: Clip.none,
      children: [
        Positioned(
          left: 0,
          right: 0,
          top: wheelTop,
          height: reelHeight,
          child: WelcomeReelList(
            viewportWidth: sceneWidth,
            spinValue: spinValue,
            landingValue: landingValue,
            landed: landed,
            hideFocusedPhrase: true,
          ),
        ),
        Positioned(
          key: WelcomeSceneLayout.catchWordKey,
          left: catchLeft,
          right: rightInset,
          top: catchTop,
          child: AnimatedSwitcher(
            duration: CatchMotion.fast,
            switchInCurve: CatchMotion.easeOutCurve,
            switchOutCurve: CatchMotion.easeInCubicCurve,
            layoutBuilder: (currentChild, previousChildren) => Stack(
              alignment: Alignment.topLeft,
              clipBehavior: Clip.none,
              children: [...previousChildren, ?currentChild],
            ),
            transitionBuilder: (child, animation) =>
                FadeTransition(opacity: animation, child: child),
            child: WelcomeFocusText(
              key: ValueKey<int>(focusedPhraseIndex),
              phrase: focusedPhrase.object,
              catchColor: tokens.ink,
              maxWidth: sceneWidth - catchLeft - rightInset,
              phraseColor: phraseColor,
              underlineColor: pigment,
            ),
          ),
        ),
        if (landed && showLandingContent) ...[
          Positioned(
            left: CatchWelcomeTokens.welcomeBodyHorizontalPadding,
            right: CatchWelcomeTokens.welcomeBodyHorizontalPadding,
            top: bodyTop,
            child: WelcomeRevealTransition(
              landingValue: landingValue,
              order: 0,
              child: Text(
                context.l10n.onboardingWelcomePageTextShowUpToSomething,
                style: CatchTextStyles.welcomeIntroBody(
                  context,
                  color: tokens.ink.withValues(
                    alpha: CatchOpacity.welcomeIntroBody,
                  ),
                ),
              ),
            ),
          ),
          Positioned(
            left: CatchWelcomeTokens.welcomeBodyHorizontalPadding,
            right: CatchWelcomeTokens.welcomeBodyHorizontalPadding,
            bottom: buttonsBottom,
            child: IgnorePointer(
              ignoring: landingValue < 0.4,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  WelcomeRevealTransition(
                    landingValue: landingValue,
                    order: 1,
                    child: CatchButton(
                      label: context
                          .l10n
                          .onboardingWelcomePageLabelContinueWithPhone,
                      onPressed: onContinue,
                      size: CatchButtonSize.lg,
                      fullWidth: true,
                      backgroundColor: tokens.primary,
                      foregroundColor: tokens.primaryInk,
                    ),
                  ),
                  const SizedBox(height: CatchWelcomeTokens.welcomeButtonGap),
                  WelcomeRevealTransition(
                    landingValue: landingValue,
                    order: 2,
                    child: CatchButton(
                      label: context.l10n.onboardingWelcomePageLabelSeeWhatSOn,
                      onPressed: onExplore,
                      variant: CatchButtonVariant.secondary,
                      size: CatchButtonSize.lg,
                      fullWidth: true,
                      backgroundColor: Colors.transparent,
                      foregroundColor: tokens.ink,
                      borderColor: tokens.line2,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ],
    );
  }
}

/// Localized binding for the library-owned welcome focus lockup.
class WelcomeFocusText extends StatelessWidget {
  const WelcomeFocusText({
    super.key,
    required this.catchColor,
    required this.maxWidth,
    this.phrase,
    this.phraseColor,
    this.underlineColor,
    this.showBrandUnderscore = false,
  }) : assert(
         phrase == null || (phraseColor != null && underlineColor != null),
       );

  static const textKey = CatchWelcomeText.textKey;
  static const underlineKey = CatchWelcomeText.underlineKey;

  final String? phrase;
  final Color catchColor;
  final double maxWidth;
  final Color? phraseColor;
  final Color? underlineColor;
  final bool showBrandUnderscore;

  @override
  Widget build(BuildContext context) => CatchWelcomeText.focus(
    brandLabel: context.l10n.onboardingWelcomePageTextCatch,
    catchColor: catchColor,
    maxWidth: maxWidth,
    phrase: phrase,
    phraseColor: phraseColor,
    underlineColor: underlineColor,
    showBrandUnderscore: showBrandUnderscore,
  );
}

class WelcomeReelList extends StatelessWidget {
  const WelcomeReelList({
    super.key,
    this.viewportWidth = CatchWelcomeTokens.welcomeReferenceWidth,
    required this.spinValue,
    required this.landingValue,
    required this.landed,
    this.hideFocusedPhrase = false,
  });

  final double viewportWidth;
  final double spinValue;
  final double landingValue;
  final bool landed;
  final bool hideFocusedPhrase;

  @override
  Widget build(BuildContext context) {
    final offset = _welcomeTrackOffset(spinValue: spinValue, landed: landed);
    final trackHeight =
        welcomePhraseBank.length * CatchWelcomeTokens.welcomeReelRowHeight;

    return ShaderMask(
      blendMode: BlendMode.dstIn,
      shaderCallback: (bounds) {
        return const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            CatchWelcomeColors.reelMaskClear,
            CatchWelcomeColors.reelMaskOpaque,
            CatchWelcomeColors.reelMaskOpaque,
            CatchWelcomeColors.reelMaskClear,
          ],
          stops: [
            0,
            CatchOpacity.welcomeReelMaskLead,
            CatchOpacity.welcomeReelMaskTail,
            1,
          ],
        ).createShader(bounds);
      },
      child: ClipRect(
        child: OverflowBox(
          alignment: Alignment.topCenter,
          minHeight: trackHeight * 2,
          maxHeight: trackHeight * 2,
          child: Transform.translate(
            offset: Offset(0, -offset),
            child: SizedBox(
              height: trackHeight * 2,
              child: Column(
                children: [
                  for (var copy = 0; copy < 2; copy += 1)
                    for (
                      var index = 0;
                      index < welcomePhraseBank.length;
                      index += 1
                    )
                      WelcomeReelRow(
                        viewportWidth: viewportWidth,
                        phrase: welcomePhraseBank[index],
                        phraseIndex: index,
                        rowIndex: copy * welcomePhraseBank.length + index,
                        trackOffset: offset,
                        landingValue: landingValue,
                        landed: landed,
                        hideWhenFocused: hideFocusedPhrase,
                      ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class WelcomeReelRow extends StatelessWidget {
  const WelcomeReelRow({
    super.key,
    required this.viewportWidth,
    required this.phrase,
    required this.phraseIndex,
    required this.rowIndex,
    required this.trackOffset,
    required this.landingValue,
    required this.landed,
    this.hideWhenFocused = false,
  });

  static const focusedPhraseKey = ValueKey<String>(
    'welcome-reel-focused-phrase',
  );
  static const focusedUnderlineKey = CatchWelcomeText.reelUnderlineKey;

  final double viewportWidth;
  final WelcomePhrase phrase;
  final int phraseIndex;
  final int rowIndex;
  final double trackOffset;
  final double landingValue;
  final bool landed;
  final bool hideWhenFocused;

  @override
  Widget build(BuildContext context) {
    const tokens = CatchTokens.editorialDark;
    final center = CatchWelcomeTokens.welcomeReelRowCenter(
      rowIndex: rowIndex,
      trackOffset: trackOffset,
    );
    final distance = center - CatchWelcomeTokens.welcomeReelFocus;
    final absDistance = distance.abs();
    final inFocus = CatchWelcomeTokens.welcomeReelRowIsFocused(distance);
    final isLandingFocus =
        landed && phraseIndex == welcomeLandingIndex && inFocus;
    final pigment =
        ActivityPalette.pigments[phrase.activityKind] ??
        ActivityPalette.pigments[ActivityKind.openActivity]!;
    final mutedPigment = Color.lerp(
      tokens.ink3,
      pigment,
      CatchOpacity.welcomeReelDecolorPigment,
    )!;
    final dimOpacity = math.max(
      CatchOpacity.welcomeReelDimMin,
      1 - (absDistance / CatchWelcomeTokens.welcomeReelDimRange),
    );
    final nonFocusFade = _durationProgress(
      landingValue,
      CatchMotion.welcomeNonFocusFade,
    );
    final colorCool = _durationProgress(
      landingValue,
      CatchMotion.welcomeTextCool,
    );
    final textColor = isLandingFocus
        ? Color.lerp(pigment, tokens.ink, colorCool)!
        : inFocus
        ? pigment
        : mutedPigment;
    final rowOpacity = landed && !isLandingFocus
        ? dimOpacity * (1 - nonFocusFade)
        : dimOpacity;
    final periodOpacity = inFocus && !hideWhenFocused ? 1.0 : 0.0;

    final effectiveOpacity = hideWhenFocused && inFocus ? 0.0 : rowOpacity;

    return SizedBox(
      height: CatchWelcomeTokens.welcomeReelRowHeight,
      child: Opacity(
        opacity: effectiveOpacity.clamp(0, 1).toDouble(),
        child: Padding(
          padding: EdgeInsets.only(
            left: CatchWelcomeTokens.welcomeReelObjectLeftForWidth(
              viewportWidth,
            ),
            right: CatchWelcomeTokens.welcomeReelRightForWidth(viewportWidth),
          ),
          child: Align(
            alignment: Alignment.topLeft,
            child: CatchWelcomeText.reel(
              key: inFocus ? focusedPhraseKey : null,
              phrase: phrase.object,
              phraseColor: textColor,
              periodColor: textColor.withValues(alpha: periodOpacity),
              underlineColor: inFocus && !hideWhenFocused ? pigment : null,
            ),
          ),
        ),
      ),
    );
  }
}

class WelcomeRevealTransition extends StatelessWidget {
  const WelcomeRevealTransition({
    super.key,
    required this.landingValue,
    required this.order,
    required this.child,
  });

  final double landingValue;
  final int order;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final progress = _revealProgress(landingValue, order);

    return Opacity(
      opacity: progress,
      child: Transform.translate(
        offset: Offset(
          0,
          (1 - progress) * CatchWelcomeTokens.welcomeRevealOffsetY,
        ),
        child: child,
      ),
    );
  }
}
