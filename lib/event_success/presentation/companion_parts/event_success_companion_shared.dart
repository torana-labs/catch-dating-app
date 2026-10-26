part of '../event_success_companion_screen.dart';

const EdgeInsets _companionMomentStagePadding = EdgeInsets.fromLTRB(
  CatchSpacing.s4,
  CatchSpacing.s3,
  CatchSpacing.s4,
  CatchSpacing.s5,
);
const EdgeInsets _companionStagePillPadding = EdgeInsets.symmetric(
  horizontal: CatchSpacing.micro14,
  vertical: CatchSpacing.s2,
);

/// Repeating Tickers schedule frames forever, which deadlocks Flutter's
/// `pumpAndSettle` in widget tests. We auto-disable continuous animations
/// when the `FLUTTER_TEST` env var is set (the test runner provides it).
/// Production runs untouched; tests that genuinely want kinetic behaviour
/// can use `pump(Duration(...))` with explicit time advancement.
final bool _kStageAnimationsEnabled = !Platform.environment.containsKey(
  'FLUTTER_TEST',
);

class _CompanionPaperTicketHeaderPainter extends CustomPainter {
  const _CompanionPaperTicketHeaderPainter({
    required this.lineColor,
    required this.markColor,
  });

  final Color lineColor;
  final Color markColor;

  @override
  void paint(Canvas canvas, Size size) {
    final linePaint = Paint()
      ..color = lineColor
      ..strokeWidth = 1.4
      ..style = PaintingStyle.stroke;
    for (var index = -2; index < 12; index++) {
      final start = Offset(size.width * -0.2 + index * 34, size.height);
      final end = Offset(start.dx + size.height, 0);
      canvas.drawLine(start, end, linePaint);
    }

    final markPaint = Paint()
      ..color = markColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = 6;
    final center = Offset(size.width * 0.82, size.height * 0.52);
    canvas.drawCircle(center, 30, markPaint);
    canvas.drawCircle(center.translate(22, -2), 30, markPaint);
  }

  @override
  bool shouldRepaint(
    covariant _CompanionPaperTicketHeaderPainter oldDelegate,
  ) => oldDelegate.lineColor != lineColor || oldDelegate.markColor != markColor;
}

class _CompanionPaperTicketDividerPainter extends CustomPainter {
  const _CompanionPaperTicketDividerPainter({required this.color});

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = CatchStroke.hairline
      ..style = PaintingStyle.stroke;
    const dashWidth = 6.0;
    const gapWidth = 4.0;
    var x = 0.0;
    final y = size.height / 2;
    while (x < size.width) {
      canvas.drawLine(Offset(x, y), Offset(x + dashWidth, y), paint);
      x += dashWidth + gapWidth;
    }
  }

  @override
  bool shouldRepaint(
    covariant _CompanionPaperTicketDividerPainter oldDelegate,
  ) => oldDelegate.color != color;
}

class _CompanionPaperTicketImagePainter extends CustomPainter {
  const _CompanionPaperTicketImagePainter({required this.color});

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = color;
    const widths = [2.0, 1.0, 4.0, 1.0, 2.0, 3.0, 1.0, 1.0, 4.0, 2.0];
    var x = 0.0;
    var index = 0;
    while (x < size.width) {
      final width = widths[index % widths.length];
      canvas.drawRect(Rect.fromLTWH(x, 0, width, size.height), paint);
      x += width + (index.isEven ? 3 : 2);
      index++;
    }
  }

  @override
  bool shouldRepaint(covariant _CompanionPaperTicketImagePainter oldDelegate) =>
      oldDelegate.color != color;
}

class _PaperExpectationItem {
  const _PaperExpectationItem({required this.icon, required this.label});

  final IconData icon;
  final String label;
}

List<_PaperExpectationItem> _paperExpectationItems({
  required AppLocalizations l10n,
  required Event event,
  required EventSuccessPlan plan,
  required bool showSelfCheckIn,
  required bool eventEnded,
}) {
  if (eventEnded) {
    return [
      _PaperExpectationItem(
        icon: CatchIcons.like,
        label:
            l10n.eventSuccessEventSuccessCompanionSharedLabelPostEventFollowUp,
      ),
      _PaperExpectationItem(
        icon: CatchIcons.chat,
        label: l10n
            .eventSuccessEventSuccessCompanionSharedLabelConversationStartersStayPrivate,
      ),
    ];
  }
  return [
    _PaperExpectationItem(
      icon: showSelfCheckIn ? CatchIcons.location : CatchIcons.people,
      label: showSelfCheckIn
          ? l10n.eventSuccessEventSuccessCompanionSharedLabelCheckInWhenYou(
              locationName: event.locationName,
            )
          : l10n.eventSuccessEventSuccessCompanionSharedLabelASmallStarterGroup,
    ),
    if (plan.hasModule(EventSuccessModuleCatalog.guidedRotations.id))
      _PaperExpectationItem(
        icon: CatchIcons.swap,
        label: l10n
            .eventSuccessEventSuccessCompanionSharedLabelTimedPartnerRotationsAs,
      )
    else
      _PaperExpectationItem(
        icon: CatchIcons.conversations,
        label: l10n
            .eventSuccessEventSuccessCompanionSharedLabelConversationCuesAppearWhen,
      ),
    if (plan.hasModule(EventSuccessModuleCatalog.liveReveal.id))
      _PaperExpectationItem(
        icon: CatchIcons.instant,
        label: l10n
            .eventSuccessEventSuccessCompanionSharedLabelOneSynchronizedRevealEvery,
      )
    else
      _PaperExpectationItem(
        icon: CatchIcons.locked,
        label: l10n
            .eventSuccessEventSuccessCompanionSharedLabelYourGuideStaysPrivate,
      ),
  ];
}

String _paperTicketTime(Event event) {
  final day = AppTimeFormatters.shortWeekday(event.startTime);
  final time = AppTimeFormatters.time(event.startTime);
  return '$day - $time';
}

String _paperTicketCode(Event event) {
  final compactId = event.id
      .replaceAll(RegExp('[^A-Za-z0-9]'), '')
      .toUpperCase()
      .padRight(7, 'X');
  return 'CTH-${compactId.substring(0, 4)}-${compactId.substring(4, 7)}';
}

class _CompanionStageImageState extends State<CompanionStageImage>
    with TickerProviderStateMixin {
  late final AnimationController _entryController = AnimationController(
    duration: CatchMotion.slow,
    vsync: this,
  );
  late final AnimationController _breathController = AnimationController(
    duration: CatchMotion.cinematicShort,
    vsync: this,
  );

  late final Animation<double> _entry = CurvedAnimation(
    parent: _entryController,
    curve: CatchMotion.springCurve,
  );

  @override
  void initState() {
    super.initState();
    // Entry is one-shot — safe to always run. Breath repeats and would
    // deadlock pumpAndSettle, so gate it on the test guard.
    _entryController.forward();
    if (_kStageAnimationsEnabled) {
      _breathController.repeat(reverse: true);
    }
  }

  @override
  void dispose() {
    _entryController.dispose();
    _breathController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: Listenable.merge([_entry, _breathController]),
      builder: (context, _) {
        final entryValue = _entry.value;
        // Smooth 0-1 sine-shaped breath so the glyph never reads as static.
        final breath = 0.5 - 0.5 * math.cos(_breathController.value * math.pi);
        final scale = (0.92 + entryValue * 0.08) + (breath * 0.02);
        final glow = 24 + (breath * 16);
        final glowAlpha = 0.20 + (breath * 0.12);
        return Transform.scale(
          scale: scale,
          child: CatchSurface(
            width: CatchLayout.eventSuccessStageGlyphExtent,
            height: CatchLayout.eventSuccessStageGlyphExtent,
            borderRadius: BorderRadius.circular(CatchRadius.pill),
            backgroundColor: widget._stageTheme.foreground.withValues(
              alpha: CatchOpacity.subtleFill,
            ),
            borderSpec: CatchBorder.resolve(
              CatchTokens.of(context),
              CatchBorderRole.boundary,
              color: widget._stageTheme.foreground.withValues(
                alpha: CatchOpacity.eventSuccessSubtleBorder,
              ),
            ),
            boxShadow: CatchElevation.glow(
              widget._stageTheme.accent.withValues(alpha: glowAlpha),
              blurRadius: glow,
            ),
            child: Icon(
              widget.icon,
              size: CatchLayout.eventSuccessStageGlyphIconSize,
              color: widget._stageTheme.foreground,
            ),
          ),
        );
      },
    );
  }
}

class _CompanionStageSurfaceState extends State<CompanionStageSurface>
    with SingleTickerProviderStateMixin {
  late final AnimationController _breath = AnimationController(
    duration: CatchMotion.cinematicMedium,
    vsync: this,
  );

  @override
  void initState() {
    super.initState();
    if (_kStageAnimationsEnabled) _breath.repeat(reverse: true);
  }

  @override
  void dispose() {
    _breath.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return AnimatedBuilder(
      animation: _breath,
      builder: (context, child) {
        final breath = 0.5 - 0.5 * math.cos(_breath.value * math.pi);
        return CatchSurface(
          radius: CatchRadius.sm,
          backgroundColor: t.surface.withValues(
            alpha: CatchOpacity.eventSuccessPanelFill,
          ),
          borderSpec: CatchBorder.resolve(
            t,
            CatchBorderRole.boundary,
            color: t.surface.withValues(
              alpha:
                  CatchOpacity.eventSuccessPanelBorderBase +
                  breath * CatchOpacity.eventSuccessPanelBorderBreath,
            ),
          ),
          child: child!,
        );
      },
      child: Padding(padding: CatchInsets.content, child: widget.child),
    );
  }
}

class _CompanionStageTheme {
  const _CompanionStageTheme({
    required this.background,
    required this.foreground,
    required this.accent,
    required this.gradient,
    required this.visualAsset,
  });

  final Color background;
  final Color foreground;
  final Color accent;
  final Gradient gradient;
  final EventSuccessMotionAsset visualAsset;

  static _CompanionStageTheme forMoment(
    BuildContext context, {
    required EventSuccessMomentPresentation presentation,
    required EventSuccessPlan plan,
  }) {
    const d = CatchTokens.editorialDark;
    final activityPalette = ActivityPalette.of(context);
    final choreography = presentation.choreography;

    Color backgroundFor(ActivitySwatch s) => Color.alphaBlend(
      s.deep.withValues(alpha: CatchOpacity.eventSuccessStageBgBlend),
      d.bg,
    );
    Color midFor(ActivitySwatch s) => Color.alphaBlend(
      s.accent.withValues(alpha: CatchOpacity.eventSuccessStageMidBlend),
      s.deep,
    );

    if (choreography.paletteTokenId == 'editorial.dark') {
      final mid = Color.lerp(d.ink, d.primary, 0.46)!;
      return _CompanionStageTheme(
        background: d.ink,
        foreground: d.ink,
        accent: d.gold,
        visualAsset: eventSuccessMotionAssetForMotif(choreography.motifId),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [d.ink, Color.lerp(d.ink, mid, 0.72)!, mid],
        ),
      );
    }

    final swatch = activityPalette.forKind(
      _activityKindForPaletteTokenId(choreography.paletteTokenId),
    );
    final secondaryTokenId = choreography.accentPaletteTokenId;
    final secondarySwatch = secondaryTokenId == null
        ? null
        : activityPalette.forKind(
            _activityKindForPaletteTokenId(secondaryTokenId),
          );
    final accent = switch (choreography.accentPalettePolicyId) {
      'primary' => swatch.accent,
      'secondary' => secondarySwatch!.accent,
      'secondaryUntilReveal' =>
        plan.revealStatus == EventSuccessRevealStatus.revealed
            ? swatch.accent
            : secondarySwatch!.accent,
      _ => throw StateError(
        'Unsupported Event Success accent palette policy: '
        '${choreography.accentPalettePolicyId}',
      ),
    };
    final background = backgroundFor(swatch);
    final mid = midFor(swatch);

    return _CompanionStageTheme(
      background: background,
      foreground: d.ink,
      accent: accent,
      visualAsset: eventSuccessMotionAssetForMotif(choreography.motifId),
      gradient: LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [background, Color.lerp(background, mid, 0.72)!, mid],
      ),
    );
  }
}

ActivityKind _activityKindForPaletteTokenId(String id) => switch (id) {
  'activity.running' => ActivityKind.running,
  'activity.walking' => ActivityKind.walking,
  'activity.pickleball' => ActivityKind.pickleball,
  'activity.padel' => ActivityKind.padel,
  'activity.tennis' => ActivityKind.tennis,
  'activity.badminton' => ActivityKind.badminton,
  'activity.cycling' => ActivityKind.cycling,
  'activity.spinClass' => ActivityKind.spinClass,
  'activity.yoga' => ActivityKind.yoga,
  'activity.strengthTraining' => ActivityKind.strengthTraining,
  'activity.pubQuiz' => ActivityKind.pubQuiz,
  'activity.dinner' => ActivityKind.dinner,
  'activity.singlesMixer' => ActivityKind.singlesMixer,
  _ => throw StateError('Unsupported Event Success palette token id: $id'),
};

/// Plays the portable stage asset on the idle-pulse period owned by the
/// generated moment contract.
class _CompanionStageMotifImageState extends State<CompanionStageMotifImage>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    duration: CatchMotion.eventSuccessPulsePeriod(widget.idlePulsePeriodMs),
    vsync: this,
  );

  @override
  void initState() {
    super.initState();
    if (!_kStageAnimationsEnabled) _controller.value = 0.5;
  }

  @override
  void didUpdateWidget(covariant CompanionStageMotifImage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.idlePulsePeriodMs != widget.idlePulsePeriodMs) {
      _controller.duration = CatchMotion.eventSuccessPulsePeriod(
        widget.idlePulsePeriodMs,
      );
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final color = Color.lerp(widget.foreground, widget.accent, 0.72)!;
    return RepaintBoundary(
      child: ColorFiltered(
        colorFilter: ColorFilter.mode(
          color.withValues(alpha: CatchOpacity.eventSuccessMotifAccent),
          BlendMode.srcIn,
        ),
        child: Lottie.asset(
          widget.visualAsset.path,
          controller: _controller,
          fit: BoxFit.cover,
          repeat: false,
          onLoaded: (_) {
            if (_kStageAnimationsEnabled && !_controller.isAnimating) {
              _controller.repeat();
            }
          },
        ),
      ),
    );
  }
}

String _heroBadgeLabel({
  required bool attended,
  required bool showSelfCheckIn,
  required bool eventEnded,
}) {
  if (attended && eventEnded) return 'Event done';
  if (attended) return 'Checked in';
  if (showSelfCheckIn) return 'Check in open';
  return 'Booked';
}

class _CompanionBouncySurfaceState extends State<CompanionBouncySurface>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    duration: CatchMotion.base,
    vsync: this,
  );

  late final Animation<double> _press = TweenSequence<double>([
    TweenSequenceItem(
      tween: Tween<double>(
        begin: 0,
        end: 1,
      ).chain(CurveTween(curve: CatchMotion.easeOutCurve)),
      weight: 35,
    ),
    TweenSequenceItem(
      tween: Tween<double>(
        begin: 1,
        end: 0,
      ).chain(CurveTween(curve: CatchMotion.elasticOutCurve)),
      weight: 65,
    ),
  ]).animate(_controller);

  bool _down = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _runPress() {
    _controller.forward(from: 0);
  }

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final glow = widget.glowColor ?? t.primary;
    final enabled = widget.onTap != null;
    return Semantics(
      button: enabled,
      enabled: enabled,
      label: widget.semanticLabel,
      selected: widget.selected,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTapDown: enabled ? (_) => setState(() => _down = true) : null,
        onTapCancel: enabled ? () => setState(() => _down = false) : null,
        onTap: enabled
            ? () {
                setState(() => _down = false);
                _runPress();
                widget.onTap?.call();
              }
            : null,
        child: AnimatedBuilder(
          animation: _press,
          builder: (context, child) {
            // 0 at rest, 1 at deepest press. Mix held-down state into the curve
            // so dragging a finger off-target still releases visually.
            final press = _down ? 1.0 : _press.value;
            final scale =
                1.0 -
                (1.0 - CompanionBouncySurface._minScale) *
                    press.clamp(0.0, 1.0);
            // Glow flare follows press up then decays through the elastic
            // release for a satisfying tail.
            final flare = _down ? 0.0 : (_press.value * (1 - _press.value) * 4);
            return Transform.scale(
              scale: scale,
              child: CatchSurface(
                tone: CatchSurfaceTone.transparent,
                borderRadius: widget.borderRadius,
                boxShadow: flare > CatchOpacity.controlOverlayHover
                    ? CatchElevation.glow(
                        glow.withValues(
                          alpha: CatchOpacity.eventSuccessBouncyGlow * flare,
                        ),
                        blurRadius:
                            CatchLayout.eventSuccessBouncyGlowBlur * flare,
                        spreadRadius: CatchStroke.underline * flare,
                      )
                    : CatchElevation.none,
                child: child!,
              ),
            );
          },
          child: widget.semanticLabel == null
              ? widget.child
              : ExcludeSemantics(child: widget.child),
        ),
      ),
    );
  }
}

/// Stage-native chip that mirrors `CatchChip.selectable`'s selected/unselected
/// styling while using [CompanionBouncySurface] instead of Material ink.
class _CompanionArrivalProgressIndicatorState
    extends State<CompanionArrivalProgressIndicator>
    with TickerProviderStateMixin {
  late final AnimationController _pulse = AnimationController(
    duration: CatchMotion.pulse,
    vsync: this,
  );
  late final AnimationController _motion = AnimationController(
    duration: CatchMotion.eventSuccessPulsePeriod(widget.idlePulsePeriodMs),
    vsync: this,
  );

  int _lastCount = 0;

  @override
  void initState() {
    super.initState();
    _lastCount = widget.checkedInCount;
    if (_kStageAnimationsEnabled) {
      _motion.repeat();
    } else {
      _motion.value = 0.5;
    }
  }

  @override
  void didUpdateWidget(covariant CompanionArrivalProgressIndicator oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.idlePulsePeriodMs != widget.idlePulsePeriodMs) {
      _motion.duration = CatchMotion.eventSuccessPulsePeriod(
        widget.idlePulsePeriodMs,
      );
    }
    if (widget.checkedInCount > _lastCount && _kStageAnimationsEnabled) {
      _pulse.forward(from: 0);
    }
    _lastCount = widget.checkedInCount;
  }

  @override
  void dispose() {
    _pulse.dispose();
    _motion.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = widget._stageTheme;
    return AnimatedBuilder(
      animation: _pulse,
      builder: (context, child) {
        // 0 at rest → 1 at peak. Sine-shaped curve gives a soft "heartbeat"
        // when a new check-in arrives.
        final pulse = math.sin(_pulse.value * math.pi);
        final scale = 1.0 + pulse * 0.08;
        return Transform.scale(scale: scale, child: child);
      },
      child: CompanionArrivalSection._(
        checkedInCount: widget.checkedInCount,
        stageTheme: theme,
        motion: _motion,
      ),
    );
  }
}

class _CompanionOthersInRoomTextState extends State<CompanionOthersInRoomText>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulse = AnimationController(
    duration: CatchMotion.pulse,
    vsync: this,
  );

  int _lastCount = 0;

  @override
  void initState() {
    super.initState();
    _lastCount = widget.checkedInCount;
  }

  @override
  void didUpdateWidget(covariant CompanionOthersInRoomText oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.checkedInCount > _lastCount && _kStageAnimationsEnabled) {
      _pulse.forward(from: 0);
    }
    _lastCount = widget.checkedInCount;
  }

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final count = widget.checkedInCount;
    // Anonymous-dot icon track: visualises co-presence without exposing
    // anyone's identity.
    return AnimatedBuilder(
      animation: _pulse,
      builder: (context, _) {
        final pulse = math.sin(_pulse.value * math.pi);
        final glowAlpha =
            CatchOpacity.eventSuccessRoomGlowBase +
            pulse * CatchOpacity.eventSuccessRoomGlowPulse;
        return CatchSurface(
          radius: CatchRadius.pill,
          backgroundColor: t.primarySoft,
          borderSpec: CatchBorder.resolve(
            t,
            CatchBorderRole.boundary,
            color: t.primary.withValues(alpha: glowAlpha),
          ),
          child: Padding(
            padding: CatchInsets.compactControlContent,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  CatchIcons.people,
                  size: CatchIconSize.xs,
                  color: t.primary,
                ),
                gapW6,
                Flexible(
                  child: CatchText(
                    count == 1
                        ? context
                              .l10n
                              .eventSuccessEventSuccessCompanionSharedText1PersonIsChecked
                        : context.l10n
                              .eventSuccessEventSuccessCompanionSharedTextCountPeopleInThe(
                                count: count,
                              ),
                    variant: CatchTextVariant.titleS,
                    color: t.ink,
                    maxLines: 2,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
