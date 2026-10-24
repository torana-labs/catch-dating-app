part of '../event_success_companion_screen.dart';

const Duration eventSuccessCeremonyTickInterval =
    CatchMotion.eventSuccessCeremonyTick;

/// Server-clocked reveal cinematic composed from the same portable assets and
/// deterministic geometry used by the guest-web runtime.
class RevealCinematicOverlay extends StatefulWidget {
  const RevealCinematicOverlay._({
    required this.eventId,
    required this.plan,
    required this.presentation,
    required this.referenceNow,
    required this.momentKind,
    required this._stageTheme,
    required this.checkedInCount,
    required this.tickInterval,
  });

  final String eventId;
  final EventSuccessPlan plan;
  final EventSuccessMomentPresentationContract presentation;
  final DateTime referenceNow;
  final EventSuccessAttendeeMomentKind momentKind;
  final _CompanionStageTheme _stageTheme;
  final int checkedInCount;

  /// Injectable for deterministic runtime and widget tests. Production uses
  /// 100ms, keeping phase entry and exit inside the 250ms parity gate.
  final Duration tickInterval;

  @override
  State<RevealCinematicOverlay> createState() => _RevealCinematicOverlayState();
}

class _RevealCinematicOverlayState extends State<RevealCinematicOverlay>
    with SingleTickerProviderStateMixin {
  AnimationController? _clock;

  @override
  void initState() {
    super.initState();
    _clock = AnimationController(duration: widget.tickInterval, vsync: this);
    _syncClock();
  }

  @override
  void didUpdateWidget(covariant RevealCinematicOverlay oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.tickInterval != widget.tickInterval) {
      _clock?.duration = widget.tickInterval;
    }
    if (oldWidget.momentKind != widget.momentKind) {
      _syncClock();
    }
  }

  void _syncClock() {
    if (!_kStageAnimationsEnabled) return;
    if (widget.momentKind == EventSuccessAttendeeMomentKind.liveReveal) {
      if (!(_clock?.isAnimating ?? false)) _clock?.repeat();
    } else {
      _clock?.stop();
    }
  }

  @override
  void dispose() {
    _clock?.dispose();
    super.dispose();
  }

  EventSuccessCeremonyTimeline? get _timeline {
    final startedAt = widget.plan.revealStartedAt;
    if (startedAt == null) return null;
    return resolveEventSuccessCeremonyTimeline(
      presentation: widget.presentation,
      serverAnchorMillis: startedAt.millisecondsSinceEpoch,
      revealCountdownMs: CatchMotion.eventSuccessCountdown(
        widget.plan.structureConfig.revealCountdownSeconds,
      ).inMilliseconds,
    );
  }

  int get _seed => deriveEventSuccessMomentSeed(
    presentation: widget.presentation,
    eventId: widget.eventId,
    activeRevealRoundIndex: widget.plan.activeRevealRoundIndex,
    serverAnchorMillis:
        widget.plan.revealStartedAt?.millisecondsSinceEpoch ?? 0,
  );

  int get _nowMillis => _kStageAnimationsEnabled
      ? DateTime.now().millisecondsSinceEpoch
      : widget.referenceNow.millisecondsSinceEpoch;

  @override
  Widget build(BuildContext context) {
    if (widget.momentKind != EventSuccessAttendeeMomentKind.liveReveal) {
      return const SizedBox.shrink();
    }
    return IgnorePointer(
      child: RepaintBoundary(
        child: AnimatedBuilder(
          animation: _clock!,
          builder: (context, _) {
            final frame = resolveEventSuccessMarqueeFrame(
              timeline: _timeline,
              presentation: widget.presentation,
              revealStatus: widget.plan.revealStatus,
              seed: _seed,
              atMillis: _nowMillis,
            );
            if (frame.phase == EventSuccessMarqueePhase.idle) {
              return const SizedBox.shrink();
            }
            return EventSuccessMarqueeImage(
              key: ValueKey<String>('eventSuccessMarquee.${frame.phase.name}'),
              frame: frame,
              accent: widget._stageTheme.accent,
              foreground: widget._stageTheme.foreground,
              checkedInCount: widget.checkedInCount,
            );
          },
        ),
      ),
    );
  }
}

/// The reveal's animated marquee: the Lottie scene, check-in dots and a
/// phase-driven vignette for one [EventSuccessMarqueeFrame].
class EventSuccessMarqueeImage extends StatelessWidget {
  const EventSuccessMarqueeImage({
    super.key,
    required this.frame,
    required this.accent,
    required this.foreground,
    required this.checkedInCount,
  });

  final EventSuccessMarqueeFrame frame;
  final Color accent;
  final Color foreground;
  final int checkedInCount;

  @override
  Widget build(BuildContext context) {
    final climax = frame.phase == EventSuccessMarqueePhase.climax;
    final settle = frame.phase == EventSuccessMarqueePhase.settle;
    final asset = climax || settle
        ? EventSuccessMotionAsset.sunrise
        : EventSuccessMotionAsset.pulse;
    final lottieProgress = switch (frame.phase) {
      EventSuccessMarqueePhase.anticipation => frame.phaseProgress,
      EventSuccessMarqueePhase.climax => frame.phaseProgress * 0.55,
      EventSuccessMarqueePhase.settle => 0.55 + frame.phaseProgress * 0.45,
      EventSuccessMarqueePhase.idle => 0.0,
    };
    final dotCount = math.min(checkedInCount, 28);
    final double vignetteStrength = switch (frame.phase) {
      EventSuccessMarqueePhase.anticipation =>
        0.18 + frame.phaseProgress * 0.42,
      EventSuccessMarqueePhase.climax => 0.55 * (1 - frame.phaseProgress * 0.6),
      EventSuccessMarqueePhase.settle => 0.22 * (1 - frame.phaseProgress),
      EventSuccessMarqueePhase.idle => 0,
    };
    final anticipation = frame.phase == EventSuccessMarqueePhase.anticipation
        ? frame.phaseProgress
        : 1.0;
    final crowdScale = (checkedInCount / 28).clamp(0.6, 1.4);
    final spokeFade = climax ? 1 - frame.phaseProgress : 1.0;
    final rotationTurns =
        frame.seedAngleTurns +
        frame.tickProgress * 0.35 +
        math.pow(anticipation, 1.4) * 1.8;
    return Semantics(
      label:
          '${context.l10n.eventSuccessEventSuccessCompanionScreenStateVisiblecopySharedReveal} '
          '${frame.phase.name}',
      child: Stack(
        fit: StackFit.expand,
        children: [
          ColorFiltered(
            colorFilter: ColorFilter.mode(
              accent.withValues(alpha: CatchOpacity.revealCinematicAssetTint),
              BlendMode.srcIn,
            ),
            child: Lottie.asset(
              asset.path,
              controller: AlwaysStoppedAnimation<double>(lottieProgress),
              fit: BoxFit.cover,
              repeat: false,
            ),
          ),
          if (vignetteStrength > 0)
            ShaderMask(
              blendMode: BlendMode.srcIn,
              shaderCallback: (bounds) {
                return RadialGradient(
                  center: const Alignment(0, -0.16),
                  radius: 0.92,
                  colors: [
                    CatchTokens.editorialBlack.withValues(
                      alpha: CatchOpacity.none,
                    ),
                    CatchTokens.editorialBlack.withValues(
                      alpha: vignetteStrength.clamp(0.0, 1.0),
                    ),
                  ],
                  stops: const [0.34, 1.0],
                ).createShader(bounds);
              },
              child: const ColoredBox(color: CatchTokens.editorialBlack),
            ),
          CustomMultiChildLayout(
            delegate: _EventSuccessMarqueeLayoutDelegate(
              checkedInCount: checkedInCount,
              frame: frame,
            ),
            children: [
              ...List<Widget>.generate(dotCount, (index) {
                final beat = math.sin(
                  (frame.tickProgress + index / dotCount * 0.5) * math.pi * 2,
                );
                final alpha =
                    ((0.18 + 0.16 * anticipation + 0.08 * beat) * crowdScale)
                        .clamp(0.0, 1.0);
                return LayoutId(
                  id: ('presence', index),
                  child: ClipOval(
                    child: ColoredBox(
                      color: (index % 5 == 0 ? accent : foreground).withValues(
                        alpha: alpha,
                      ),
                    ),
                  ),
                );
              }, growable: false),
              if (!settle)
                ...List<Widget>.generate(14, (index) {
                  final angle = math.pi * 2 * (rotationTurns + index / 14);
                  return LayoutId(
                    id: ('spoke', index),
                    child: Transform.rotate(
                      alignment: Alignment.bottomCenter,
                      angle: angle,
                      child: CatchSurface(
                        duration: Duration.zero,
                        tone: CatchSurfaceTone.transparent,
                        radius: CatchRadius.pill,
                        clipBehavior: Clip.antiAlias,
                        child: ColoredBox(
                          color: accent.withValues(
                            alpha: (0.32 + anticipation * 0.48) * spokeFade,
                          ),
                        ),
                      ),
                    ),
                  );
                }, growable: false),
              ...List<Widget>.generate(frame.particles.length, (index) {
                final particle = frame.particles[index];
                final alphaScale = switch (frame.phase) {
                  EventSuccessMarqueePhase.anticipation =>
                    0.55 + frame.phaseProgress * 0.4,
                  EventSuccessMarqueePhase.climax =>
                    (1 - frame.phaseProgress).clamp(0.0, 1.0) * 0.95 + 0.18,
                  EventSuccessMarqueePhase.settle =>
                    (1 - frame.phaseProgress) * 0.4,
                  EventSuccessMarqueePhase.idle => 0.0,
                };
                return LayoutId(
                  id: ('particle', index),
                  child: ClipOval(
                    child: ColoredBox(
                      color:
                          Color.lerp(
                            foreground,
                            accent,
                            particle.driftTurns,
                          )!.withValues(
                            alpha:
                                CatchOpacity.revealCinematicParticle *
                                alphaScale.clamp(0.0, 1.0),
                          ),
                    ),
                  ),
                );
              }, growable: false),
            ],
          ),
          if (climax)
            ColoredBox(
              color: CatchTokens.editorialWhite.withValues(
                alpha:
                    math.max(0.0, 1 - frame.phaseProgress * 5) *
                    CatchOpacity.revealCinematicFlash,
              ),
            ),
        ],
      ),
    );
  }
}

class _EventSuccessMarqueeLayoutDelegate extends MultiChildLayoutDelegate {
  _EventSuccessMarqueeLayoutDelegate({
    required this.checkedInCount,
    required this.frame,
  });

  final int checkedInCount;
  final EventSuccessMarqueeFrame frame;

  @override
  void performLayout(Size size) {
    final center = Offset(size.width / 2, size.height * 0.42);
    final radius = math.min(size.width, size.height) * 0.62;
    final dotCount = math.min(checkedInCount, 28);
    for (var index = 0; index < dotCount; index += 1) {
      final beat = math.sin(
        (frame.tickProgress + index / dotCount * 0.5) * math.pi * 2,
      );
      final extent = CatchSpacing.micro6 + beat;
      final ringRadius = radius * 0.66;
      final angle = math.pi * 2 / dotCount * index - math.pi / 2;
      final childSize = layoutChild(
        ('presence', index),
        BoxConstraints(
          minWidth: extent,
          maxWidth: extent,
          minHeight: extent,
          maxHeight: extent,
        ),
      );
      positionChild(
        ('presence', index),
        Offset(
          center.dx + math.cos(angle) * ringRadius - childSize.width * 0.5,
          center.dy + math.sin(angle) * ringRadius - childSize.height * 0.5,
        ),
      );
    }

    if (frame.phase != EventSuccessMarqueePhase.settle) {
      for (var index = 0; index < 14; index += 1) {
        final length =
            radius *
            (0.74 - 0.05 * math.sin(index * 2 + frame.tickProgress * 6));
        final width = CatchStroke.focusRing;
        layoutChild(
          ('spoke', index),
          BoxConstraints(
            minWidth: width,
            maxWidth: width,
            minHeight: length,
            maxHeight: length,
          ),
        );
        positionChild((
          'spoke',
          index,
        ), Offset(center.dx - width * 0.5, center.dy - length));
      }
    }

    for (var index = 0; index < frame.particles.length; index += 1) {
      final particle = frame.particles[index];
      final tickShift = math.sin(
        (frame.tickProgress + particle.driftTurns) * math.pi * 2,
      );
      final (progressToCenter, burstOffset) = switch (frame.phase) {
        EventSuccessMarqueePhase.anticipation => (frame.phaseProgress, 0.0),
        EventSuccessMarqueePhase.climax => (
          1 - frame.phaseProgress,
          frame.phaseProgress * radius * 1.6,
        ),
        EventSuccessMarqueePhase.settle => (0.0, radius * 1.6),
        EventSuccessMarqueePhase.idle => (0.0, 0.0),
      };
      final liveDistance =
          radius * particle.distance * (1 - progressToCenter * 0.78);
      final angle = particle.angleTurns * math.pi * 2;
      final burstAngle = particle.burstTurns * math.pi * 2;
      final dx =
          math.cos(angle) * liveDistance + math.cos(burstAngle) * burstOffset;
      final dy =
          math.sin(angle) * liveDistance +
          math.sin(burstAngle) * burstOffset +
          tickShift * CatchSpacing.micro3;
      final extent =
          CatchSpacing.micro3 * particle.sizeScale * (1 + 0.18 * tickShift);
      final childSize = layoutChild(
        ('particle', index),
        BoxConstraints(
          minWidth: extent,
          maxWidth: extent,
          minHeight: extent,
          maxHeight: extent,
        ),
      );
      positionChild(
        ('particle', index),
        Offset(
          center.dx + dx - childSize.width * 0.5,
          center.dy + dy - childSize.height * 0.5,
        ),
      );
    }
  }

  @override
  bool shouldRelayout(
    covariant _EventSuccessMarqueeLayoutDelegate oldDelegate,
  ) {
    return oldDelegate.checkedInCount != checkedInCount ||
        oldDelegate.frame != frame;
  }
}
