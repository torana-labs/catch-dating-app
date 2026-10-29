import 'dart:convert';

import 'package:catch_dating_app/contexts/live/data/event_assistance_deliveries_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_deliveries_page.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery_scope.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_command.dart';
import 'package:flutter/services.dart';

import 'event_assistance_preview_repositories.dart' show previewUnconfirmed;

Future<List<Map<String, Object?>>>? _cache;
Future<List<Map<String, Object?>>> loadDeliveryPreviewFixtures() =>
    _cache ??= Future.wait([
      for (final feature in ['event_success', 'event_rehearsal'])
        rootBundle
            .loadString('../test/$feature/fixtures/delivery_queue.json')
            .then((raw) => (jsonDecode(raw) as Map).cast<String, Object?>()),
    ]);

class DeliveryPreviewLiveRepository
    implements EventAssistanceDeliveriesRepository {
  DeliveryPreviewLiveRepository(this.fixtures);
  final Map<String, Object?> fixtures;
  @override
  Future<EventAssistanceDeliveriesPage> fetch(
    EventAssistanceDeliveryQuery query,
  ) async => EventAssistanceDeliveriesPage.fromCallableData(
    fixtures['uncertain'],
    expectedQuery: query,
  );
  @override
  Future<EventAssistanceDeliveryResult> apply(
    EventAssistanceDeliveryChange change,
  ) async => throw previewUnconfirmed;
}

class DeliveryPreviewPracticeRepository implements EventRehearsalRepository {
  DeliveryPreviewPracticeRepository(Map<String, Object?> fixtures)
    : snapshot = EventRehearsalBootstrap.fromCallableData(
        fixtures['uncertain'],
      );
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
