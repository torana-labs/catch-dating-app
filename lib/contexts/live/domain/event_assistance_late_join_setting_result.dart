import 'dart:convert';

import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_setting.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';

enum AssistanceSettingOutcome { read, applied, replayed }

final class LateJoinSettingResult {
  const LateJoinSettingResult._(
    this.outcome,
    this.operationRevision,
    this.view,
  );
  final AssistanceSettingOutcome outcome;
  final int? operationRevision;
  final LateJoinSettingView view;

  factory LateJoinSettingResult.fromCallableData(
    Object? value, {
    required EventAssistanceGroupScope expectedScope,
    LateJoinSettingChange? expectedChange,
  }) {
    final map = assistanceObject(value, {
      'outcome',
      'operationRevision',
      'view',
    });
    final outcome = assistanceEnum(
      AssistanceSettingOutcome.values,
      map['outcome'],
    );
    final revision = assistanceNullableInteger(map['operationRevision']);
    final view = LateJoinSettingView.fromJson(
      map['view'],
      expectedScope: expectedScope,
    );
    if (expectedChange == null) {
      if (outcome != AssistanceSettingOutcome.read || revision != null) {
        _invalid();
      }
    } else {
      final result = LateJoinSettingResult._(outcome, revision, view);
      if (expectedChange.snapshot.scope != expectedScope) _invalid();
      result.requireChange(expectedChange);
    }
    return LateJoinSettingResult._(outcome, revision, view);
  }

  /// Validate the receipt at every ownership boundary, including substituted repositories.
  void requireChange(LateJoinSettingChange change, {String? actorUid}) {
    if (view.scope != change.snapshot.scope ||
        outcome == AssistanceSettingOutcome.read ||
        operationRevision != change.snapshot.ownRevision + 1 ||
        operationRevision! > view.ownRevision ||
        view.serverTime < change.snapshot.serverTime) {
      _invalid();
    }
    // A replay carries the original receipt and the latest effective state.
    if (outcome == AssistanceSettingOutcome.applied &&
        (operationRevision != view.ownRevision ||
            view.sourceHash != change.snapshot.sourceHash ||
            view.own?.sourceHash != view.sourceHash ||
            view.own?.updatedAt != view.serverTime ||
            (change.snapshot.own != null &&
                view.own?.createdAt != change.snapshot.own!.createdAt) ||
            (actorUid != null && view.own?.updatedBy != actorUid) ||
            jsonEncode(view.own?.preference.toJson()) !=
                jsonEncode(change.preference.toJson()))) {
      _invalid();
    }
  }
}

Never _invalid() =>
    throw const FormatException('Invalid assistance setting result.');
