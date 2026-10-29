import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:catch_dating_app/contexts/live/data/event_assistance_runtime_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_result.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_scope.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_setting.dart';
import 'package:flutter_test/flutter_test.dart';

Map<String, Object?> runtimeUiFixture(String name) =>
    (jsonDecode(
              File(
                'test/event_success/fixtures/runtime_senders.json',
              ).readAsStringSync(),
            )
            as Map<String, dynamic>)[name]
        as Map<String, Object?>;
EventAssistanceRuntimeScope runtimeUiScope() {
  final context =
      ((runtimeUiFixture('initial')['view']! as Map)['context']! as Map);
  return EventAssistanceRuntimeScope(
    organizerId: context['organizerId'] as String,
    eventId: context['eventId'] as String,
  );
}

AssistanceRuntimeView runtimeUiView(String name, {bool noSenders = false}) {
  final view = (runtimeUiFixture(name)['view']! as Map).cast<String, Object?>();
  if (noSenders) view['senderSetup'] = {'choices': [], 'nextCursors': {}};
  return AssistanceRuntimeView.fromJson(view, expectedScope: runtimeUiScope());
}

/// Actual backend read fixtures; writes script lost replies and matching receipts.
class RuntimeUiRepository extends Fake
    implements EventAssistanceRuntimeRepository {
  RuntimeUiRepository({String stage = 'initial', bool noSenders = false})
    : view = runtimeUiView(stage, noSenders: noSenders);
  AssistanceRuntimeView view;
  final writes =
      <
        ({
          AssistanceRuntimeChange change,
          Completer<AssistanceRuntimeResult> result,
        })
      >[];
  @override
  Future<AssistanceRuntimeView> fetch(
    EventAssistanceRuntimeScope scope,
  ) async => view;
  @override
  Future<AssistanceRuntimeResult> apply(AssistanceRuntimeChange change) {
    final result = Completer<AssistanceRuntimeResult>();
    writes.add((change: change, result: result));
    return result.future;
  }

  void confirm() {
    final pending = writes.last;
    final change = pending.change;
    final paused = change.command is AssistanceRuntimePause;
    final raw = (runtimeUiFixture('configured')['view']! as Map)
        .cast<String, Object?>();
    final record = (raw['runtime']! as Map).cast<String, Object?>();
    final revision = change.snapshot.revision + 1;
    record.addAll({
      'revision': revision,
      'status': paused ? 'paused' : 'enabled',
      'configuration': paused
          ? change.snapshot.runtime?.configuration?.toJson()
          : (change.command as AssistanceRuntimeConfigure).configuration
                .toJson(),
    });
    raw.addAll({
      'revision': revision,
      'runtime': record,
      'status': paused ? 'paused' : 'configured',
    });
    final result = AssistanceRuntimeResult.fromCallableData(
      {'outcome': 'applied', 'operationRevision': revision, 'view': raw},
      expectedScope: view.scope,
      expectedChange: change,
    );
    view = result.view;
    pending.result.complete(result);
  }
}
