import 'package:catch_dating_app/chats/presentation/widgets/chat_event_context_header.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import '../../support/page_preview.dart';
import 'fixtures.dart';
import 'preview.dart';
import 'scope.dart';

@widgetbook.UseCase(
  name: 'Primitive states',
  type: ChatEventContextHeader,
  path: '[P1 product surfaces]/Matches and chat/Primitives',
)
Widget chatEventContextHeaderPrimitiveStates(BuildContext context) {
  return WidgetbookMatchesAppRoleBoundary(
    role: AppRole.consumer,
    child: WidgetbookPageCatalogFrame(
      title: 'ChatEventContextHeader',
      contractId: 'primitive.messaging.chat_event_context_header',
      children: [
        WidgetbookPageStateCard(
          label: 'social run context',
          child: WidgetbookMatchesPrimitiveReviewFrame(
            height: WidgetbookPreviewLayout.photoLikePanelHeight,
            child: ChatEventContextHeader(event: widgetbookMatchesEvent),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'fallback without event',
          child: const WidgetbookMatchesPrimitiveReviewFrame(
            height: WidgetbookPreviewLayout.photoLikePanelHeight,
            child: ChatEventContextHeader(event: null),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'dinner context',
          child: WidgetbookMatchesPrimitiveReviewFrame(
            height: WidgetbookPreviewLayout.photoLikePanelHeight,
            child: ChatEventContextHeader(
              event: widgetbookMatchesEvent.copyWith(
                eventFormat: EventFormatSnapshot.fromActivityKind(
                  ActivityKind.dinner,
                ),
                startTime: DateTime(2026, 6, 25, 20),
                endTime: DateTime(2026, 6, 25, 22),
                meetingPoint: 'Long Table, Colaba',
                meetingLocation: const EventMeetingLocation(
                  name: 'Long Table, Colaba',
                  address: 'Colaba, Mumbai',
                  latitude: 18.9220,
                  longitude: 72.8347,
                ),
                startingPointLat: 18.9220,
                startingPointLng: 72.8347,
                distanceKm: 0,
                pace: PaceLevel.easy,
              ),
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'long custom event title',
          child: WidgetbookMatchesPrimitiveReviewFrame(
            height: WidgetbookPreviewLayout.photoLikePanelHeight,
            child: ChatEventContextHeader(
              event: widgetbookMatchesEvent.copyWith(
                eventFormat: EventFormatSnapshot.custom(
                  label: 'Community art walk and tasting',
                  interactionModel: EventInteractionModel.freeFormMixer,
                ),
                startTime: DateTime(2026, 6, 27, 18),
                endTime: DateTime(2026, 6, 27, 20),
              ),
            ),
          ),
        ),
      ],
    ),
  );
}
