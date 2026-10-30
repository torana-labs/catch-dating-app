import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/event_success_moment_presentations.g.dart';

/// Portable visual assets shared by the Flutter and guest-web runtimes.
enum EventSuccessMotionAsset {
  theatrical('assets/motion/event_success/theatrical.json'),
  pulse('assets/motion/event_success/pulse.json'),
  sunrise('assets/motion/event_success/sunrise.json');

  const EventSuccessMotionAsset(this.path);

  final String path;
}

EventSuccessMotionAsset eventSuccessMotionAssetForMotif(String motifId) =>
    switch (motifId) {
      'path' ||
      'gate' ||
      'spark' ||
      'signal' => EventSuccessMotionAsset.theatrical,
      'rhythm' || 'orbit' || 'reveal' => EventSuccessMotionAsset.pulse,
      'afterglow' => EventSuccessMotionAsset.sunrise,
      _ => throw StateError('Unsupported Event Success motif: $motifId'),
    };

enum EventSuccessMarqueePhase { idle, anticipation, climax, settle }

class EventSuccessMarqueeParticle {
  const EventSuccessMarqueeParticle({
    required this.angleTurns,
    required this.burstTurns,
    required this.distance,
    required this.driftTurns,
    required this.sizeScale,
  });

  final double angleTurns;
  final double burstTurns;
  final double distance;
  final double driftTurns;
  final double sizeScale;
}

class EventSuccessMarqueeFrame {
  const EventSuccessMarqueeFrame({
    required this.phase,
    required this.phaseProgress,
    required this.seedAngleTurns,
    required this.tickProgress,
    required this.particles,
  });

  const EventSuccessMarqueeFrame.idle()
    : phase = EventSuccessMarqueePhase.idle,
      phaseProgress = 0,
      seedAngleTurns = 0,
      tickProgress = 0,
      particles = const <EventSuccessMarqueeParticle>[];

  final EventSuccessMarqueePhase phase;
  final double phaseProgress;
  final double seedAngleTurns;
  final double tickProgress;
  final List<EventSuccessMarqueeParticle> particles;
}

/// Resolves phase and procedural geometry solely from the generated ceremony
/// contract, server anchor, event seed, and the supplied clock instant.
EventSuccessMarqueeFrame resolveEventSuccessMarqueeFrame({
  required EventSuccessCeremonyTimeline? timeline,
  required EventSuccessMomentPresentationContract presentation,
  required EventSuccessRevealStatus revealStatus,
  required int seed,
  required int atMillis,
}) {
  if (timeline == null || revealStatus == EventSuccessRevealStatus.idle) {
    return const EventSuccessMarqueeFrame.idle();
  }

  var phase = EventSuccessMarqueePhase.idle;
  var phaseProgress = 0.0;
  if (atMillis >= timeline.anticipationStartsAtMillis &&
      atMillis < timeline.climaxStartsAtMillis) {
    phase = EventSuccessMarqueePhase.anticipation;
    phaseProgress = _progressBetween(
      atMillis,
      timeline.anticipationStartsAtMillis,
      timeline.climaxStartsAtMillis,
    );
  } else if (atMillis >= timeline.climaxStartsAtMillis &&
      atMillis < timeline.settleStartsAtMillis) {
    phase = EventSuccessMarqueePhase.climax;
    phaseProgress = _progressBetween(
      atMillis,
      timeline.climaxStartsAtMillis,
      timeline.settleStartsAtMillis,
    );
  } else if (atMillis >= timeline.settleStartsAtMillis &&
      atMillis < timeline.completesAtMillis) {
    phase = EventSuccessMarqueePhase.settle;
    phaseProgress = _progressBetween(
      atMillis,
      timeline.settleStartsAtMillis,
      timeline.completesAtMillis,
    );
  }

  final tempoMs = (60000 / presentation.tempoBpm).round();
  final elapsed = (atMillis - timeline.anticipationStartsAtMillis).clamp(
    0,
    0x7fffffff,
  );
  return EventSuccessMarqueeFrame(
    phase: phase,
    phaseProgress: phaseProgress,
    seedAngleTurns: seed / 0x100000000,
    tickProgress: tempoMs <= 0 ? 0 : (elapsed % tempoMs) / tempoMs,
    particles: deriveEventSuccessMarqueeParticles(
      seed: seed,
      count: presentation.particleDensity,
    ),
  );
}

List<EventSuccessMarqueeParticle> deriveEventSuccessMarqueeParticles({
  required int seed,
  required int count,
}) => List<EventSuccessMarqueeParticle>.generate(
  count,
  (index) => EventSuccessMarqueeParticle(
    angleTurns: _seededUnit(seed, index, 0),
    burstTurns: _seededUnit(seed, index, 4),
    distance: 0.28 + _seededUnit(seed, index, 1) * 0.68,
    driftTurns: _seededUnit(seed, index, 3),
    sizeScale: 0.6 + _seededUnit(seed, index, 2) * 0.9,
  ),
  growable: false,
);

double _progressBetween(int value, int start, int end) {
  if (end <= start) return 1;
  return ((value - start) / (end - start)).clamp(0.0, 1.0);
}

double _seededUnit(int seed, int index, int salt) {
  var value = _uint32(
    seed ^ _imul(index + 1, 0x9e3779b1) ^ _imul(salt + 1, 0x85ebca6b),
  );
  value = _imul(value ^ (value >> 16), 0x7feb352d);
  value = _imul(value ^ (value >> 15), 0x846ca68b);
  value = _uint32(value ^ (value >> 16));
  return value / 0xffffffff;
}

int _imul(int left, int right) => _uint32(left * right);

int _uint32(int value) => value & 0xffffffff;
