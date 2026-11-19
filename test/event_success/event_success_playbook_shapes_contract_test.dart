import 'dart:convert';
import 'dart:io';

import 'package:catch_dating_app/contexts/formats/domain/event_success_playbooks/library.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_structure.dart';
import 'package:catch_kernel/activity_taxonomy.dart';
import 'package:catch_platform/schema_contracts/generated/event_success_playbook_shapes.g.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final catalog =
      jsonDecode(
            File(
              'contracts/catalogs/event_success_playbook_shapes.json',
            ).readAsStringSync(),
          )
          as Map<String, dynamic>;
  final shapes = {
    for (final shape in catalog['playbooks'] as List<dynamic>)
      (shape as Map<String, dynamic>)['playbookId'] as String: shape,
  };

  test('the playbook library takes its numbers from the shared catalog', () {
    expect(
      EventSuccessPlaybookLibrary.all.map((playbook) => playbook.id).toSet(),
      shapes.keys.toSet(),
    );
    for (final playbook in EventSuccessPlaybookLibrary.all) {
      final shape = shapes[playbook.id]! as Map<String, dynamic>;
      final capacity = shape['capacity'] as Map<String, dynamic>;
      expect(playbook.capacity.min, capacity['min'], reason: playbook.id);
      expect(playbook.capacity.max, capacity['max'], reason: playbook.id);
      expect(playbook.activityType.name, shape['activityKind']);
      final steps = shape['runOfShow'] as List<dynamic>;
      expect(playbook.runOfShow.length, steps.length, reason: playbook.id);
      for (var index = 0; index < steps.length; index += 1) {
        final step = steps[index] as Map<String, dynamic>;
        expect(playbook.runOfShow[index].stage.name, step['stage']);
        expect(
          playbook.runOfShow[index].durationMinutes,
          step['durationMinutes'],
        );
        if (step['moduleIds'] != null) {
          expect(playbook.runOfShow[index].moduleIds, step['moduleIds']);
        }
      }
    }
  });

  test('every interaction model has a default structure and playbook', () {
    for (final model in EventInteractionModel.values) {
      final shape = eventSuccessStructureDefaultsByInteractionModel[model.name];
      expect(shape, isNotNull, reason: model.name);
      expect(shapes.containsKey(shape!.defaultPlaybookId), isTrue);
      final config = EventSuccessStructureConfig.defaultForInteractionModel(
        model,
        targetAttendeeCount: 18,
      );
      expect(config.unitKind.name, shape.unitKind);
      expect(config.unitSize, shape.unitSizeIsAttendees ? 18 : shape.unitSize);
    }
  });

  test('seated tables size their resource from the attendee count', () {
    final config = EventSuccessStructureConfig.defaultForInteractionModel(
      EventInteractionModel.seatedTable,
      targetAttendeeCount: 18,
    );
    expect(config.resourceCapacity?.concurrentUnits, 5);
    expect(config.resourceCapacity?.seatsPerUnit, 4);
    expect(config.topology, EventSuccessTopology.adjacency);
  });

  test("each activity's default playbook is in the catalog", () {
    for (final kind in ActivityKind.values) {
      final playbookId = kind.defaultPlaybookId;
      if (playbookId == null) continue;
      expect(shapes.containsKey(playbookId), isTrue, reason: kind.name);
    }
  });
}
