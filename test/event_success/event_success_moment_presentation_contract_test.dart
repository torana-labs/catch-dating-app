import 'dart:convert';
import 'dart:io';

import 'package:catch_dating_app/contexts/live/domain/event_success_runtime.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/event_success_moment_presentations.g.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final sourceCatalog =
      jsonDecode(
            File(
              'contracts/catalogs/event_success_moment_presentations.json',
            ).readAsStringSync(),
          )
          as Map<String, dynamic>;

  test('generated Dart presentation catalog round-trips the source', () {
    expect(eventSuccessMomentPresentationCatalogJson, sourceCatalog);
    expect(
      eventSuccessMomentPresentations.map((value) => value.momentKind),
      EventSuccessAttendeeMomentKind.values.map((value) => value.name),
    );
  });

  test('every moment owns the complete choreography contract', () {
    for (final presentation in eventSuccessMomentPresentations) {
      expect(presentation.paletteTokenId, isNotEmpty);
      expect(presentation.motifId, isNotEmpty);
      expect(
        presentation.phaseDurationsMs.anticipation,
        greaterThanOrEqualTo(0),
      );
      expect(presentation.phaseDurationsMs.climax, greaterThanOrEqualTo(0));
      expect(presentation.phaseDurationsMs.settle, greaterThanOrEqualTo(0));
      expect(presentation.tempoBpm, greaterThan(0));
      expect(presentation.idlePulsePeriodMs, greaterThan(0));
      expect(presentation.particleDensity, greaterThanOrEqualTo(0));
      expect(presentation.seedDerivationRuleId, 'fnv1a32-utf8-fields-v1');
      expect(presentation.ambientBedId, isNotEmpty);
    }
    final reveal = eventSuccessMomentPresentationFor('liveReveal');
    expect(
      reveal.clockReferenceId,
      'revealStartedAtPlusStructureRevealCountdown',
    );
    expect(reveal.particleDensity, greaterThan(0));
    expect(
      eventSuccessMomentPresentations
          .where((value) => value.momentKind != 'liveReveal')
          .every(
            (value) =>
                value.clockReferenceId == 'none' && value.particleDensity == 0,
          ),
      isTrue,
    );
  });

  test('Dart derives the shared phase boundaries and seed fixture', () {
    final fixture = Map<String, dynamic>.from(
      sourceCatalog['parityFixture'] as Map,
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

    expect({...timeline.toJson(), 'seed': seed}, expected);
  });

  test('saved reveal countdown overrides the catalog fallback', () {
    final presentation = eventSuccessMomentPresentationFor('liveReveal');
    final configured = resolveEventSuccessCeremonyTimeline(
      presentation: presentation,
      serverAnchorMillis: 1000,
      revealCountdownMs: 18000,
    );
    final fallback = resolveEventSuccessCeremonyTimeline(
      presentation: presentation,
      serverAnchorMillis: 1000,
    );

    expect(configured.climaxStartsAtMillis, 19000);
    expect(
      fallback.climaxStartsAtMillis,
      1000 + presentation.phaseDurationsMs.anticipation,
    );
  });
}
