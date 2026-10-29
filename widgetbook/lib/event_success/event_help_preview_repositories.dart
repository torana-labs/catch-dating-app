import 'dart:convert';

import 'package:catch_dating_app/contexts/live/data/event_assistance_cases_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_scope.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_cases_page.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_command.dart';
import 'package:flutter/services.dart';

import 'event_assistance_preview_repositories.dart' show previewUnconfirmed;

Future<List<Map<String, Object?>>>? _cache;
Future<List<Map<String, Object?>>> loadHelpPreviewFixtures() =>
    _cache ??= Future.wait([
      for (final feature in ['event_success', 'event_rehearsal'])
        rootBundle
            .loadString('../test/$feature/fixtures/help_queue.json')
            .then((raw) => (jsonDecode(raw) as Map).cast<String, Object?>()),
    ]);

class HelpPreviewLiveRepository implements EventAssistanceCasesRepository {
  HelpPreviewLiveRepository(this.fixtures);
  final Map<String, Object?> fixtures;
  @override
  Future<EventAssistanceCasesPage> fetch(
    EventAssistanceCaseQuery query,
  ) async => EventAssistanceCasesPage.fromCallableData(
    fixtures[query.status == AssistanceCaseStatus.open ? 'initial' : 'handled'],
    expectedQuery: query,
  );
  @override
  Future<EventAssistanceCaseResult> apply(
    EventAssistanceCaseChange change,
  ) async => throw previewUnconfirmed;
}

class HelpPreviewPracticeRepository implements EventRehearsalRepository {
  HelpPreviewPracticeRepository(Map<String, Object?> fixtures)
    : snapshot = EventRehearsalBootstrap.fromCallableData(fixtures['initial']);
  final EventRehearsalBootstrap snapshot;
  @override
  Future<EventRehearsalBootstrap> fetch(String sessionId) async => snapshot;
  @override
  Future<EventRehearsalBootstrap> applyAssistance(
    RehearsalAssistanceChange change,
  ) async => throw previewUnconfirmed;
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}
