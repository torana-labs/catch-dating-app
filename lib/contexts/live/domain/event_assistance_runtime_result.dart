import 'dart:convert';

import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_scope.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_setting.dart';

enum AssistanceRuntimeOutcome { read, applied, replayed }

final class AssistanceRuntimeResult {
  const AssistanceRuntimeResult._(
    this.outcome,
    this.operationRevision,
    this.view,
  );
  final AssistanceRuntimeOutcome outcome;
  final int? operationRevision;
  final AssistanceRuntimeView view;
  factory AssistanceRuntimeResult.fromCallableData(
    Object? value, {
    required EventAssistanceRuntimeScope expectedScope,
    AssistanceRuntimeChange? expectedChange,
  }) {
    final map = assistanceObject(value, {
      'outcome',
      'operationRevision',
      'view',
    });
    final outcome = assistanceEnum(
      AssistanceRuntimeOutcome.values,
      map['outcome'],
    );
    final revision = assistanceNullableInteger(map['operationRevision']);
    final view = AssistanceRuntimeView.fromJson(
      map['view'],
      expectedScope: expectedScope,
    );
    final result = AssistanceRuntimeResult._(outcome, revision, view);
    if (expectedChange == null) {
      if (outcome != AssistanceRuntimeOutcome.read || revision != null) {
        _invalid();
      }
    } else {
      result.requireChange(expectedChange);
    }
    return result;
  }

  /// The state owner repeats validation before accepting injected repository results.
  void requireChange(AssistanceRuntimeChange change, {String? actorUid}) {
    final before = change.snapshot;
    if (view.scope != before.scope ||
        outcome == AssistanceRuntimeOutcome.read ||
        operationRevision != before.revision + 1 ||
        operationRevision == null ||
        operationRevision! > view.revision ||
        view.serverTime < before.serverTime) {
      _invalid();
    }
    if (outcome != AssistanceRuntimeOutcome.applied) return;
    final runtime = view.runtime;
    if (view.revision != operationRevision ||
        view.sourceHash != before.sourceHash ||
        runtime == null ||
        runtime.sourceHash != view.sourceHash ||
        runtime.updatedAt != view.serverTime ||
        before.runtime != null &&
            runtime.createdAt != before.runtime!.createdAt ||
        actorUid != null && runtime.updatedBy != actorUid) {
      _invalid();
    }
    final command = change.command;
    final expectedStatus = command is AssistanceRuntimeConfigure
        ? AssistanceRuntimeRecordStatus.enabled
        : AssistanceRuntimeRecordStatus.paused;
    final configuration = command is AssistanceRuntimeConfigure
        ? command.configuration
        : before.runtime?.configuration;
    if (runtime.status != expectedStatus ||
        jsonEncode(runtime.configuration?.toJson()) !=
            jsonEncode(configuration?.toJson())) {
      _invalid();
    }
  }
}

Never _invalid() =>
    throw const FormatException('Invalid event automation confirmation.');
