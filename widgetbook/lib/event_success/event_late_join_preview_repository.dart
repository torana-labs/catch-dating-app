import 'dart:convert';

import 'package:catch_dating_app/contexts/live/data/event_assistance_late_join_setting_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_setting.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_setting_result.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:flutter/services.dart';

Future<Map<String, Object?>>? _fixture;
Future<Map<String, Object?>> loadLateJoinPreviewFixture() =>
    _fixture ??= rootBundle
        .loadString('../test/event_success/fixtures/late_join_settings.json')
        .then((raw) => (jsonDecode(raw) as Map).cast<String, Object?>());

class LateJoinPreviewRepository
    implements EventAssistanceLateJoinSettingRepository {
  LateJoinPreviewRepository(this.fixtures);
  final Map<String, Object?> fixtures;
  EventAssistanceGroupScope get scope {
    final view = (fixtures['custom']! as Map)['view']! as Map;
    final context = view['context']! as Map;
    return EventAssistanceGroupScope(
      organizerId: context['organizerId'] as String,
      eventId: context['eventId'] as String,
      groupId: 'event:whole',
    );
  }

  LateJoinSettingView get view => LateJoinSettingView.fromJson(
    (fixtures['custom']! as Map)['view'],
    expectedScope: scope,
  );
  @override
  Future<LateJoinSettingView> fetch(EventAssistanceGroupScope scope) async =>
      view;
  @override
  Future<LateJoinSettingResult> apply(LateJoinSettingChange change) async =>
      throw const NetworkException(
        'unavailable',
        'Preview save needs confirmation.',
      );
}
