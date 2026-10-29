import 'dart:convert';

import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_setup.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_template.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';

sealed class LateJoinPreference {
  const LateJoinPreference();
  Map<String, Object?> toJson();
  factory LateJoinPreference.fromJson(Object? value) {
    final map = assistanceObject(value);
    switch (map['kind']) {
      case 'inherit':
        assistanceObject(map, {'kind'});
        return const LateJoinInherit();
      case 'disabled':
        assistanceObject(map, {'kind'});
        return const LateJoinDisabled();
      case 'configured':
        assistanceObject(map, {'kind', 'template'});
        return LateJoinConfigured(
          AssistanceLateJoinTemplate.fromJson(map['template']),
        );
      default:
        throw const FormatException('Unknown late joining preference.');
    }
  }
}

final class LateJoinInherit extends LateJoinPreference {
  const LateJoinInherit();
  @override
  Map<String, Object?> toJson() => {'kind': 'inherit'};
}

final class LateJoinDisabled extends LateJoinPreference {
  const LateJoinDisabled();
  @override
  Map<String, Object?> toJson() => {'kind': 'disabled'};
}

final class LateJoinConfigured extends LateJoinPreference {
  const LateJoinConfigured(this.template);
  final AssistanceLateJoinTemplate template;
  @override
  Map<String, Object?> toJson() => {
    'kind': 'configured',
    'template': template.toJson(),
  };
}

enum AssistanceSettingStatus {
  unconfigured,
  disabled,
  sourceChanged,
  configured,
}

enum AssistanceSettingOrigin { none, event, group }

/// The locally saved preference may differ from the effective inherited value.
final class LateJoinSettingRecord {
  const LateJoinSettingRecord._(
    this.revision,
    this.preference,
    this.sourceHash,
    this.updatedBy,
    this.createdAt,
    this.updatedAt,
  );
  final int revision;
  final LateJoinPreference preference;
  final String sourceHash;
  final String updatedBy;
  final int createdAt;
  final int updatedAt;

  factory LateJoinSettingRecord.fromJson(
    Object? value,
    EventAssistanceGroupScope scope,
    int serverTime,
  ) {
    final map = assistanceObject(value, {
      'schemaVersion',
      'settingId',
      'context',
      'groupId',
      'workflowKind',
      'revision',
      'preference',
      'sourceHash',
      'updatedBy',
      'createdAt',
      'updatedAt',
    });
    scope.requireMatch(map['context'], map['groupId']);
    final revision = assistanceInteger(map['revision']);
    final created = assistanceInteger(map['createdAt']);
    final updated = assistanceInteger(map['updatedAt']);
    if (map['schemaVersion'] != 1 ||
        map['workflowKind'] != 'lateJoin' ||
        map['settingId'] is! String ||
        !RegExp(
          r'^setting:[a-f0-9]{64}$',
        ).hasMatch(map['settingId']! as String) ||
        revision == 0 ||
        created > updated ||
        updated > serverTime) {
      throw const FormatException('Invalid saved assistance setting.');
    }
    return LateJoinSettingRecord._(
      revision,
      LateJoinPreference.fromJson(map['preference']),
      assistanceHash(map['sourceHash']),
      assistanceText(map['updatedBy']),
      created,
      updated,
    );
  }
}

/// Server-owned inheritance and source freshness; no delivery claim is derived.
final class LateJoinSettingView {
  const LateJoinSettingView._({
    required this.scope,
    required this.serverTime,
    required this.sourceHash,
    required this.ownRevision,
    required this.own,
    required this.status,
    required this.origin,
    required this.effective,
    required this.suggested,
    required this.setup,
  });
  final EventAssistanceGroupScope scope;
  final int serverTime;
  final String sourceHash;
  final int ownRevision;
  final LateJoinSettingRecord? own;
  final AssistanceSettingStatus status;
  final AssistanceSettingOrigin origin;
  final AssistanceLateJoinTemplate? effective;
  final AssistanceLateJoinTemplate? suggested;
  final LateJoinSettingSetup? setup;

  factory LateJoinSettingView.fromJson(
    Object? value, {
    required EventAssistanceGroupScope expectedScope,
  }) {
    final map = assistanceObject(value);
    assistanceObject(map, {
      'context',
      'groupId',
      'workflowKind',
      'serverTime',
      'sourceHash',
      'ownRevision',
      'own',
      'status',
      'origin',
      'effective',
      'suggested',
      if (map.containsKey('setup')) 'setup',
    });
    expectedScope.requireMatch(map['context'], map['groupId']);
    if (map['workflowKind'] != 'lateJoin') {
      throw const FormatException('Wrong assistance workflow.');
    }
    final now = assistanceInteger(map['serverTime']);
    final own = map['own'] == null
        ? null
        : LateJoinSettingRecord.fromJson(map['own'], expectedScope, now);
    final view = LateJoinSettingView._(
      scope: expectedScope,
      serverTime: now,
      setup: map.containsKey('setup')
          ? LateJoinSettingSetup.fromJson(
              map['setup'],
              groupId: expectedScope.groupId,
            )
          : null,
      sourceHash: assistanceHash(map['sourceHash']),
      ownRevision: assistanceInteger(map['ownRevision']),
      own: own,
      status: assistanceEnum(AssistanceSettingStatus.values, map['status']),
      origin: assistanceEnum(AssistanceSettingOrigin.values, map['origin']),
      effective: map['effective'] == null
          ? null
          : AssistanceLateJoinTemplate.fromJson(map['effective']),
      suggested: map['suggested'] == null
          ? null
          : AssistanceLateJoinTemplate.fromJson(map['suggested']),
    );
    view._validate();
    return view;
  }

  LateJoinSettingChange prepareChange({
    required String requestId,
    required LateJoinPreference preference,
  }) {
    assistanceId(requestId);
    if (ownRevision == 9007199254740991) {
      throw StateError('Assistance revision exhausted.');
    }
    return LateJoinSettingChange._(this, requestId, preference);
  }

  void _validate() {
    if (ownRevision != (own?.revision ?? 0)) _invalid();
    final validState = switch (status) {
      AssistanceSettingStatus.unconfigured =>
        origin == AssistanceSettingOrigin.none && effective == null,
      AssistanceSettingStatus.sourceChanged =>
        origin != AssistanceSettingOrigin.none && effective == null,
      AssistanceSettingStatus.configured =>
        origin != AssistanceSettingOrigin.none &&
            effective?.setting is AssistanceTemplateEnabled,
      AssistanceSettingStatus.disabled =>
        origin != AssistanceSettingOrigin.none &&
            (effective == null ||
                effective!.setting is AssistanceTemplateDisabled),
    };
    if (!validState) _invalid();
    final direct = own != null && own!.preference is! LateJoinInherit;
    final whole = scope.groupId == 'event:whole';
    if (!direct) {
      if (origin == AssistanceSettingOrigin.group ||
          whole && status != AssistanceSettingStatus.unconfigured) {
        _invalid();
      }
      return;
    }
    if (origin !=
        (whole
            ? AssistanceSettingOrigin.event
            : AssistanceSettingOrigin.group)) {
      _invalid();
    }
    final preference = own!.preference;
    final template = preference is LateJoinConfigured
        ? preference.template
        : null;
    final disabled =
        preference is LateJoinDisabled ||
        template?.setting is AssistanceTemplateDisabled;
    final expected = disabled
        ? AssistanceSettingStatus.disabled
        : own!.sourceHash != sourceHash
        ? AssistanceSettingStatus.sourceChanged
        : AssistanceSettingStatus.configured;
    if (status != expected ||
        jsonEncode(effective?.toJson()) !=
            jsonEncode(
              expected == AssistanceSettingStatus.sourceChanged
                  ? null
                  : template?.toJson(),
            )) {
      _invalid();
    }
  }
}

/// All retry inputs are frozen by value. A changed source requires new review.
final class LateJoinSettingChange {
  const LateJoinSettingChange._(this.snapshot, this.requestId, this.preference);
  final LateJoinSettingView snapshot;
  final String requestId;
  final LateJoinPreference preference;
  Map<String, Object?> toJson() => {
    'context': snapshot.scope.context,
    'groupId': snapshot.scope.groupId,
    'workflowKind': 'lateJoin',
    'requestId': requestId,
    'expectedRevision': snapshot.ownRevision,
    'expectedSourceHash': snapshot.sourceHash,
    'preference': preference.toJson(),
  };
}

Never _invalid() =>
    throw const FormatException('Inconsistent assistance setting.');
