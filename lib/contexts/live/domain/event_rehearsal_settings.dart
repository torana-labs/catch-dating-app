import 'dart:convert';

import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_draft.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_setting.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_setup.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_template.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_observation.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_runtime_configuration.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_staff.dart';
import 'package:catch_dating_app/core/cryptography/sha256_digest.dart';

final class RehearsalSettingsGroup {
  const RehearsalSettingsGroup._({
    required this.id,
    required this.label,
    required this.preference,
    required this.effective,
    required this.status,
    required this.origin,
    required this.setup,
  });
  final String id, label;
  final LateJoinPreference preference;
  final AssistanceLateJoinTemplate? effective;
  final AssistanceSettingStatus status;
  final AssistanceSettingOrigin origin;
  final LateJoinSettingSetup setup;

  factory RehearsalSettingsGroup.fromJson(Object? value) {
    final map = assistanceObject(value, {
      'groupId',
      'label',
      'preference',
      'effective',
      'status',
      'origin',
      'setup',
    });
    final id = assistanceText(map['groupId'], 180);
    final setup = assistanceObject(map['setup'], {'eventEnd', 'destinations'});
    final destinations = setup['destinations'];
    if (destinations is! List || destinations.length > 41) {
      throw const FormatException('Invalid practice joining choices.');
    }
    final effective = map['effective'] == null
        ? null
        : AssistanceLateJoinTemplate.fromJson(map['effective']);
    final status = assistanceEnum(
      AssistanceSettingStatus.values,
      map['status'],
    );
    final origin = assistanceEnum(
      AssistanceSettingOrigin.values,
      map['origin'],
    );
    if (status == AssistanceSettingStatus.configured &&
            (effective?.setting is! AssistanceTemplateEnabled ||
                origin == AssistanceSettingOrigin.none) ||
        status == AssistanceSettingStatus.unconfigured &&
            (effective != null || origin != AssistanceSettingOrigin.none) ||
        status == AssistanceSettingStatus.sourceChanged && effective != null ||
        status == AssistanceSettingStatus.disabled &&
            (origin == AssistanceSettingOrigin.none ||
                effective?.setting is AssistanceTemplateEnabled)) {
      throw const FormatException('Inconsistent practice rule state.');
    }
    return RehearsalSettingsGroup._(
      id: id,
      label: assistanceText(map['label'], 180),
      preference: LateJoinPreference.fromJson(map['preference']),
      effective: effective,
      status: status,
      origin: origin,
      setup: LateJoinSettingSetup.fromOptions(
        eventEnd: assistanceInteger(setup['eventEnd']),
        groupId: id,
        destinations: destinations.map((v) {
          final d = assistanceObject(v, {
            'alternativeId',
            'target',
            'label',
            'text',
          });
          final alternativeId = assistanceAlternativeId(d['alternativeId']);
          assistanceText(d['text']);
          return (
            alternativeId: alternativeId,
            target: AssistanceJoiningTarget.fromJson(d['target']),
            label: assistanceText(d['label'], 240),
          );
        }).toList(),
      ),
    );
  }
}

/// A bounded Host review of this isolated run. It cannot be a live settings scope.
final class RehearsalSettingsReview {
  const RehearsalSettingsReview._({
    required this.session,
    required this.staff,
    required this.clockId,
    required this.sourceHash,
    required this.canConfigure,
    required this.runtime,
    required this.suggested,
    required this.groups,
  });
  final EventRehearsalSession session;
  final RehearsalStaffReview staff;
  final String clockId, sourceHash;
  final bool canConfigure;
  final RehearsalRuntimeSetting? runtime;
  final AssistanceLateJoinTemplate suggested;
  final Map<String, RehearsalSettingsGroup> groups;
  int get serverTime => session.virtualNow.millisecondsSinceEpoch;
  int get eventEnd => groups['event:whole']!.setup.eventEnd;
  LateJoinRuntimeTiming get runtimeTiming => runtime == null
      ? LateJoinRuntimeTiming.notConfigured
      : runtime!.configuration.responseDeadline == null
      ? LateJoinRuntimeTiming.noResponseDeadline
      : LateJoinRuntimeTiming.responseDeadline;

  factory RehearsalSettingsReview.fromJson(
    Object? value, {
    required EventRehearsalSession session,
    required RehearsalStaffReview? staff,
  }) {
    final map = assistanceObject(value, {
      'context',
      'setupRevision',
      'runtimeRevision',
      'sourceHash',
      'serverTime',
      'canConfigure',
      'runtime',
      'suggested',
      'groups',
    });
    final context = assistanceObject(map['context'], {
      'mode',
      'rehearsalId',
      'virtualEventId',
      'clockId',
    });
    final start = session.virtualStartedAt?.millisecondsSinceEpoch;
    final now = assistanceInteger(map['serverTime']);
    final clock =
        'clock:${sha256Digest(jsonEncode([session.id, start, session.setupRevision]))}';
    final canConfigure = assistanceBoolean(map['canConfigure']);
    final rawGroups = map['groups'];
    if (start == null ||
        start > now ||
        staff == null ||
        context['mode'] != 'rehearsal' ||
        context['rehearsalId'] != session.id ||
        context['virtualEventId'] !=
            'practice:${sha256Digest(jsonEncode(session.id))}' ||
        context['clockId'] != clock ||
        staff.clockId != clock ||
        assistanceInteger(map['setupRevision']) != session.setupRevision ||
        assistanceInteger(map['runtimeRevision']) != session.runtimeRevision ||
        now != session.virtualNow.millisecondsSinceEpoch ||
        rawGroups is! List ||
        rawGroups.isEmpty ||
        rawGroups.length > 41 ||
        canConfigure !=
            (staff.isManager &&
                [
                  EventRehearsalStatus.draft,
                  EventRehearsalStatus.ready,
                  EventRehearsalStatus.running,
                  EventRehearsalStatus.paused,
                ].contains(session.status) &&
                now < start + session.setup.durationMinutes * 60000)) {
      throw const FormatException(
        'Practice settings belong to another run or role.',
      );
    }
    final groups = <String, RehearsalSettingsGroup>{};
    for (final value in rawGroups) {
      final group = RehearsalSettingsGroup.fromJson(value);
      if (groups.containsKey(group.id) ||
          !staff.groups.containsKey(group.id) ||
          group.setup.eventEnd !=
              start + session.setup.durationMinutes * 60000) {
        throw const FormatException(
          'Practice settings changed group coverage.',
        );
      }
      groups[group.id] = group;
    }
    if (groups.length != staff.groups.length ||
        !groups.containsKey('event:whole')) {
      throw const FormatException('Practice settings omit a group.');
    }
    final runtime = map['runtime'] == null
        ? null
        : RehearsalRuntimeSetting.fromJson(map['runtime']);
    if (runtime?.configuration.responseDeadline case final deadline?
        when deadline > groups['event:whole']!.setup.eventEnd) {
      throw const FormatException('Practice deadline exceeds this run.');
    }
    return RehearsalSettingsReview._(
      session: session,
      staff: staff,
      clockId: clock,
      sourceHash: assistanceHash(map['sourceHash']),
      canConfigure: canConfigure,
      runtime: runtime,
      suggested: AssistanceLateJoinTemplate.fromJson(map['suggested']),
      groups: Map.unmodifiable(groups),
    );
  }
}
