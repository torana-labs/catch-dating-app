import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:catch_dating_app/contexts/live/data/event_assistance_late_join_setting_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_setting.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_setting_result.dart';
import 'package:flutter_test/flutter_test.dart';

Map<String, Object?> lateJoinUiFixture(String name) =>
    (jsonDecode(
              File(
                'test/event_success/fixtures/late_join_settings.json',
              ).readAsStringSync(),
            )
            as Map<String, dynamic>)[name]
        as Map<String, Object?>;
EventAssistanceGroupScope lateJoinUiScope() {
  final view = lateJoinUiFixture('initial')['view']! as Map<String, Object?>;
  final context = view['context']! as Map<String, Object?>;
  return EventAssistanceGroupScope(
    organizerId: context['organizerId']! as String,
    eventId: context['eventId']! as String,
    groupId: 'event:whole',
  );
}

LateJoinSettingView lateJoinUiView(String stage) =>
    LateJoinSettingView.fromJson(
      lateJoinUiFixture(stage)['view'],
      expectedScope: lateJoinUiScope(),
    );

/// Read projections and successful receipt come from the actual backend fixture.
/// Transport interruption is scripted here without running a provider or sender.
class LateJoinUiRepository extends Fake
    implements EventAssistanceLateJoinSettingRepository {
  LateJoinUiRepository({this.stage = 'custom'});
  String stage;
  final writes =
      <
        ({
          LateJoinSettingChange change,
          Completer<LateJoinSettingResult> result,
        })
      >[];
  @override
  Future<LateJoinSettingView> fetch(EventAssistanceGroupScope scope) async {
    expect(scope, lateJoinUiScope());
    return lateJoinUiView(stage);
  }

  @override
  Future<LateJoinSettingResult> apply(LateJoinSettingChange change) {
    final result = Completer<LateJoinSettingResult>();
    writes.add((change: change, result: result));
    return result.future;
  }

  void confirmDisabled() {
    stage = 'disabled';
    final pending = writes.last;
    pending.result.complete(
      LateJoinSettingResult.fromCallableData(
        lateJoinUiFixture(stage),
        expectedScope: pending.change.snapshot.scope,
        expectedChange: pending.change,
      ),
    );
  }
}
