import 'package:catch_dating_app/contexts/formats/domain/event_success_feature_state.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_structure.dart';
import 'package:catch_kernel/activity_taxonomy.dart';
import 'package:flutter_test/flutter_test.dart';

const _skill = EventSuccessActivityAssignmentAttribute.skillBand;
const _gender = EventSuccessActivityAssignmentAttribute.gender;

void main() {
  group('objective per attribute', () {
    test('an attribute is saved in exactly one list', () {
      const base = EventSuccessStructureConfig(
        unitKind: EventSuccessUnitKind.teams,
        unitSize: 5,
        balanceActivityAttributes: [_skill],
      );

      final covered = base.withObjective(
        _skill,
        EventSuccessAttributeObjective.cover,
      );
      expect(covered.coverActivityAttributes, [_skill]);
      expect(covered.balanceActivityAttributes, isEmpty);
      expect(covered.clusterActivityAttributes, isEmpty);
      expect(
        covered.objectiveFor(_skill),
        EventSuccessAttributeObjective.cover,
      );

      final cleared = covered.withObjective(
        _skill,
        EventSuccessAttributeObjective.none,
      );
      expect(cleared.objectiveFor(_skill), EventSuccessAttributeObjective.none);
      expect(cleared.coverActivityAttributes, isEmpty);
    });

    test('cover round-trips through the saved structure', () {
      final config = const EventSuccessStructureConfig(
        unitKind: EventSuccessUnitKind.teams,
        unitSize: 8,
      ).withObjective(_skill, EventSuccessAttributeObjective.cover);

      final restored = EventSuccessStructureConfig.fromJson(
        Map<String, dynamic>.from(config.toJson()),
      );
      expect(restored.coverActivityAttributes, [_skill]);
    });
  });

  group('arrival groups', () {
    test('teams and tables keep people who booked together by default', () {
      for (final kind in [
        EventSuccessUnitKind.teams,
        EventSuccessUnitKind.tables,
      ]) {
        expect(
          kind.defaultArrivalGroupPolicy,
          EventSuccessArrivalGroupPolicy.keepTogether,
        );
      }
      for (final kind in [
        EventSuccessUnitKind.pairs,
        EventSuccessUnitKind.pods,
        EventSuccessUnitKind.wholeGroup,
      ]) {
        expect(
          kind.defaultArrivalGroupPolicy,
          EventSuccessArrivalGroupPolicy.ignore,
        );
      }
    });

    test('a saved policy wins over the default', () {
      const config = EventSuccessStructureConfig(
        unitKind: EventSuccessUnitKind.teams,
        unitSize: 5,
        arrivalGroupPolicy: EventSuccessArrivalGroupPolicy.spread,
      );
      expect(
        config.effectiveArrivalGroupPolicy,
        EventSuccessArrivalGroupPolicy.spread,
      );
    });
  });

  group('sensitive attributes', () {
    test(
      'pairs, teams and tables may offer them; pods and whole group not',
      () {
        expect(EventSuccessUnitKind.pairs.offersSensitiveAttributes, isTrue);
        expect(EventSuccessUnitKind.teams.offersSensitiveAttributes, isTrue);
        expect(EventSuccessUnitKind.tables.offersSensitiveAttributes, isTrue);
        expect(EventSuccessUnitKind.pods.offersSensitiveAttributes, isFalse);
        expect(
          EventSuccessUnitKind.wholeGroup.offersSensitiveAttributes,
          isFalse,
        );
      },
    );

    test('no format default selects gender or age band', () {
      for (final model in EventInteractionModel.values) {
        final config = EventSuccessStructureConfig.defaultForInteractionModel(
          model,
        );
        expect(
          config.objectiveFor(_gender),
          EventSuccessAttributeObjective.none,
        );
        expect(
          config.objectiveFor(EventSuccessActivityAssignmentAttribute.ageBand),
          EventSuccessAttributeObjective.none,
        );
      }
    });

    test('readiness flags a sensitive attribute on pods', () {
      final draft = EventSuccessHostDraft.fromActivity(ActivityKind.socialRun)
          .copyWith(
            structureConfig: const EventSuccessStructureConfig(
              unitKind: EventSuccessUnitKind.pods,
              unitSize: 4,
              balanceActivityAttributes: [_gender],
            ),
          );

      expect(
        draft.readinessIssues,
        contains(
          'Gender and age band can only shape pairs, teams or tables. '
          'Remove them or change how people are grouped.',
        ),
      );
    });

    test('readiness accepts a sensitive attribute on tables', () {
      final draft = EventSuccessHostDraft.fromActivity(ActivityKind.dinner)
          .copyWith(
            structureConfig: const EventSuccessStructureConfig(
              unitKind: EventSuccessUnitKind.tables,
              unitSize: 6,
              balanceActivityAttributes: [_gender],
            ),
          );

      expect(
        draft.readinessIssues.where((issue) => issue.startsWith('Gender')),
        isEmpty,
      );
    });
  });
}
