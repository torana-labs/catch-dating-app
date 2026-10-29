import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_deliveries_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_deliveries_page.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery_scope.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_delivery_queue_sheet.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_delivery_section.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_delivery_sheet.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_delivery_decision_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_delivery_entry_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_delivery_queue_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_delivery_queue_sheet.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_delivery_sheet.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_live_delivery_section.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import 'event_delivery_preview_repositories.dart';

const _path = '[P1 product surfaces]/Event Success/Message delivery';
@widgetbook.UseCase(
  name: 'Shared delivery entry',
  type: EventAssistanceDeliveryEntrySection,
  path: _path,
)
Widget assistanceDeliveryEntry(BuildContext context) =>
    const _Preview(surface: _Surface.liveEntry);
@widgetbook.UseCase(
  name: 'Live runtime delivery entry',
  type: EventAssistanceLiveDeliverySection,
  path: _path,
)
Widget assistanceLiveDeliveryEntry(BuildContext context) =>
    const _Preview(surface: _Surface.liveEntry);
@widgetbook.UseCase(
  name: 'Practice runtime delivery entry',
  type: EventRehearsalDeliverySection,
  path: _path,
)
Widget assistancePracticeDeliveryEntry(BuildContext context) =>
    const _Preview(surface: _Surface.practiceEntry);
@widgetbook.UseCase(
  name: 'Shared message delivery records',
  type: EventAssistanceDeliveryQueueSection,
  path: _path,
)
Widget assistanceDeliveryRecords(BuildContext context) =>
    const _Preview(surface: _Surface.liveQueue);
@widgetbook.UseCase(
  name: 'Live message queue',
  type: EventAssistanceDeliveryQueueSheet,
  path: _path,
)
Widget assistanceLiveDeliveryQueue(BuildContext context) =>
    const _Preview(surface: _Surface.liveQueue);
@widgetbook.UseCase(
  name: 'Practice message queue',
  type: EventRehearsalDeliveryQueueSheet,
  path: _path,
)
Widget assistancePracticeDeliveryQueue(BuildContext context) =>
    const _Preview(surface: _Surface.practiceQueue);
@widgetbook.UseCase(
  name: 'Shared reviewed delivery handoff',
  type: EventAssistanceDeliveryDecisionSection,
  path: _path,
)
Widget assistanceDeliveryDecision(BuildContext context) =>
    const _Preview(surface: _Surface.liveRequest);
@widgetbook.UseCase(
  name: 'Live message and exact handoff',
  type: EventAssistanceDeliverySheet,
  path: _path,
)
Widget assistanceLiveDeliveryRequest(BuildContext context) =>
    const _Preview(surface: _Surface.liveRequest);
@widgetbook.UseCase(
  name: 'Practice message and exact handoff',
  type: EventRehearsalDeliverySheet,
  path: _path,
)
Widget assistancePracticeDeliveryRequest(BuildContext context) =>
    const _Preview(surface: _Surface.practiceRequest);

enum _Surface {
  liveEntry,
  practiceEntry,
  liveQueue,
  practiceQueue,
  liveRequest,
  practiceRequest,
}

class _Preview extends StatefulWidget {
  const _Preview({required this.surface});
  final _Surface surface;
  @override
  State<_Preview> createState() => _PreviewState();
}

class _PreviewState extends State<_Preview> {
  late final _fixtures = loadDeliveryPreviewFixtures();
  @override
  Widget build(BuildContext context) =>
      FutureBuilder<List<Map<String, Object?>>>(
        future: _fixtures,
        builder: (context, value) {
          if (value.hasError) {
            return Text('Preview unavailable: ${value.error}');
          }
          if (!value.hasData) return const CatchLoadingIndicator();
          final data = value.requireData;
          final live = DeliveryPreviewLiveRepository(data[0]);
          final practice = DeliveryPreviewPracticeRepository(data[1]);
          final raw = data[0]['uncertain'] as Map;
          final scope = raw['context'] as Map;
          final query = EventAssistanceDeliveryQuery(
            organizerId: scope['organizerId'] as String,
            eventId: scope['eventId'] as String,
          );
          final page = EventAssistanceDeliveriesPage.fromCallableData(
            raw,
            expectedQuery: query,
          );
          final rehearsal = practice.snapshot;
          return ProviderScope(
            overrides: [
              uidProvider.overrideWith((ref) => Stream.value('host-1')),
              eventAssistanceDeliveriesRepositoryProvider.overrideWith(
                (ref) => live,
              ),
              eventRehearsalRepositoryProvider.overrideWith((ref) => practice),
            ],
            child: Scaffold(
              body: Align(
                alignment: Alignment.bottomCenter,
                child: switch (widget.surface) {
                  _Surface.liveEntry => EventAssistanceLiveDeliverySection(
                    organizerId: query.organizerId,
                    eventId: query.eventId,
                  ),
                  _Surface.practiceEntry => EventRehearsalDeliverySection(
                    sessionId: rehearsal.session.id,
                  ),
                  _Surface.liveQueue => EventAssistanceDeliveryQueueSheet(
                    organizerId: query.organizerId,
                    eventId: query.eventId,
                  ),
                  _Surface.practiceQueue => EventRehearsalDeliveryQueueSheet(
                    sessionId: rehearsal.session.id,
                  ),
                  _Surface.liveRequest => EventAssistanceDeliverySheet(
                    scope: page.deliveries
                        .firstWhere((r) => r.status.name == 'unknown')
                        .scope,
                    query: query,
                  ),
                  _Surface.practiceRequest => EventRehearsalDeliverySheet(
                    scope: rehearsal.deliveryReviews!.deliveries.single.scope,
                  ),
                },
              ),
            ),
          );
        },
      );
}
