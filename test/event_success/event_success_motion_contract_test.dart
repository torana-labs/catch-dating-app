import 'dart:convert';
import 'dart:io';

import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/event_success_moment_presentations.g.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_motion_contract.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final manifest =
      jsonDecode(
            File(
              'assets/motion/event_success/manifest.json',
            ).readAsStringSync(),
          )
          as Map<String, dynamic>;
  final assets = Map<String, dynamic>.from(manifest['assets'] as Map);
  final motifBindings = Map<String, dynamic>.from(
    manifest['motifBindings'] as Map,
  );

  test('three portable assets cover every generated stage motif', () {
    expect(assets.keys, <String>['theatrical', 'pulse', 'sunrise']);
    expect(
      assets.values.map((value) => (value as Map)['path']),
      everyElement(startsWith('assets/motion/event_success/')),
    );
    for (final presentation in eventSuccessMomentPresentations) {
      final expected = motifBindings[presentation.motifId] as String?;
      expect(expected, isNotNull, reason: presentation.motifId);
      expect(
        eventSuccessMotionAssetForMotif(presentation.motifId).name,
        expected,
      );
    }
    expect(() => eventSuccessMotionAssetForMotif('unknown'), throwsStateError);
  });

  test('portable asset documents are valid Lottie vector animations', () {
    for (final entry in assets.entries) {
      final definition = Map<String, dynamic>.from(entry.value as Map);
      final animation =
          jsonDecode(File(definition['path'] as String).readAsStringSync())
              as Map<String, dynamic>;
      expect(animation['v'], isA<String>(), reason: entry.key);
      expect(animation['fr'], greaterThan(0), reason: entry.key);
      expect(animation['op'], greaterThan(animation['ip']), reason: entry.key);
      expect(animation['layers'], isNotEmpty, reason: entry.key);
    }
  });

  test(
    'Dart resolves the shared parity fixture and deterministic geometry',
    () {
      final fixture = Map<String, dynamic>.from(
        manifest['parityFixture'] as Map,
      );
      final expected = Map<String, dynamic>.from(fixture['expected'] as Map);
      final presentation = eventSuccessMomentPresentationFor(
        fixture['momentKind'] as String,
      );
      final timeline = resolveEventSuccessCeremonyTimeline(
        presentation: presentation,
        serverAnchorMillis: fixture['serverAnchorMillis'] as int,
        revealCountdownMs: fixture['revealCountdownMs'] as int,
      );
      final seed = deriveEventSuccessMomentSeed(
        presentation: presentation,
        eventId: fixture['eventId'] as String,
        activeRevealRoundIndex: fixture['activeRevealRoundIndex'] as int,
        serverAnchorMillis: fixture['serverAnchorMillis'] as int,
      );
      final frame = resolveEventSuccessMarqueeFrame(
        timeline: timeline,
        presentation: presentation,
        revealStatus: EventSuccessRevealStatus.countingDown,
        seed: seed,
        atMillis: fixture['atMillis'] as int,
      );

      expect(seed, expected['seed']);
      expect(frame.phase.name, expected['phase']);
      expect(frame.phaseProgress, expected['progress']);
      expect(
        eventSuccessMotionAssetForMotif(presentation.motifId).name,
        expected['visualAssetId'],
      );
      expect(frame.particles, hasLength(presentation.particleDensity));

      final particle = frame.particles.first;
      expect(particle.angleTurns, closeTo(0.8375414530368386, 1e-12));
      expect(particle.burstTurns, closeTo(0.548213584010539, 1e-12));
      expect(particle.distance, closeTo(0.8809090331385167, 1e-12));
      expect(particle.driftTurns, closeTo(0.5332150621184183, 1e-12));
      expect(particle.sizeScale, closeTo(1.074243195535206, 1e-12));
    },
  );

  test('server clock owns every ceremony phase boundary', () {
    final presentation = eventSuccessMomentPresentationFor('liveReveal');
    final timeline = resolveEventSuccessCeremonyTimeline(
      presentation: presentation,
      serverAnchorMillis: 1000,
      revealCountdownMs: 10000,
    );
    EventSuccessMarqueePhase phaseAt(int atMillis) =>
        resolveEventSuccessMarqueeFrame(
          timeline: timeline,
          presentation: presentation,
          revealStatus: EventSuccessRevealStatus.countingDown,
          seed: 7,
          atMillis: atMillis,
        ).phase;

    expect(
      phaseAt(timeline.anticipationStartsAtMillis),
      EventSuccessMarqueePhase.anticipation,
    );
    expect(
      phaseAt(timeline.climaxStartsAtMillis),
      EventSuccessMarqueePhase.climax,
    );
    expect(
      phaseAt(timeline.settleStartsAtMillis),
      EventSuccessMarqueePhase.settle,
    );
    expect(phaseAt(timeline.completesAtMillis), EventSuccessMarqueePhase.idle);
  });

  test('superseded Event Success painters stay deleted', () {
    final shared = File(
      'lib/event_success/presentation/companion_parts/event_success_companion_shared.dart',
    ).readAsStringSync();
    final reveal = File(
      'lib/event_success/presentation/companion_parts/event_success_companion_reveal_overlay.dart',
    ).readAsStringSync();
    final sources = '$shared\n$reveal';

    expect(sources, isNot(contains('_StageMotifPainter')));
    expect(sources, isNot(contains('_ArrivalRingPainter')));
    expect(sources, isNot(contains('_RevealCinematicPainter')));
  });
}
