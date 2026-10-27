import 'package:catch_dating_app/events/presentation/event_detail_display_state.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_detail_body.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_detail_surface_style.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/contract_preview.dart';
import '../../support/page_preview.dart';
import 'fixtures.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Companion entry states',
  type: EventCompanionCard,
  path: '[Event Detail]/Sections',
)
Widget eventDetailCompanionEntryStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'EventCompanionCard',
    catalogId: 'section.event.companion_entry',
    children: [
      WidgetbookPageStateCard(
        label: 'hidden',
        child: WidgetbookEventDeviceFrame(
          child: EventCompanionCard(
            state: const EventDetailCompanionState.hidden(),
            surfaceStyle: EventDetailSurfaceStyle.light(
              CatchTokens.of(context),
            ),
            onOpen: widgetbookNoop,
            onRetry: widgetbookNoop,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'loading',
        child: WidgetbookEventDeviceFrame(
          child: EventCompanionCard(
            state: const EventDetailCompanionState.loading(),
            surfaceStyle: EventDetailSurfaceStyle.light(
              CatchTokens.of(context),
            ),
            onOpen: widgetbookNoop,
            onRetry: widgetbookNoop,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'available',
        child: WidgetbookEventDeviceFrame(
          child: EventCompanionCard(
            state: const EventDetailCompanionState.available(),
            surfaceStyle: EventDetailSurfaceStyle.light(
              CatchTokens.of(context),
            ),
            onOpen: widgetbookNoop,
            onRetry: widgetbookNoop,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'error',
        child: WidgetbookEventDeviceFrame(
          child: EventCompanionCard(
            state: EventDetailCompanionState.error(
              StateError('Could not load event companion.'),
            ),
            surfaceStyle: EventDetailSurfaceStyle.light(
              CatchTokens.of(context),
            ),
            onOpen: widgetbookNoop,
            onRetry: widgetbookNoop,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Callout card states',
  type: EventDetailCalloutCard,
  path: '[Event Detail]/Sections',
)
Widget eventDetailCalloutCardStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'EventDetailCalloutCard',
    catalogId: 'section.event.callout_card',
    children: [
      WidgetbookPageStateCard(
        label: 'invite loop / light surface',
        child: WidgetbookEventDeviceFrame(
          child: Padding(
            padding: CatchInsets.content,
            child: EventDetailCalloutCard(
              leadingIcon: CatchIcons.platformShare(
                platform: Theme.of(context).platform,
              ),
              title: 'Bring someone into the room',
              body:
                  'Your spot is booked. Invite a friend who would make this event better.',
              actionLabel: 'Invite a friend',
              actionIcon: CatchIcons.send,
              onAction: widgetbookEventsNoopContext,
              surfaceStyle: EventDetailSurfaceStyle.light(
                CatchTokens.of(context),
              ),
              borderColor: CatchTokens.of(
                context,
              ).primary.withValues(alpha: CatchOpacity.eventDetailLightBorder),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'invite loop / ticket surface',
        child: WidgetbookEventDeviceFrame(
          child: Padding(
            padding: CatchInsets.content,
            child: EventDetailCalloutCard(
              leadingIcon: CatchIcons.platformShare(
                platform: Theme.of(context).platform,
              ),
              title: 'Bring someone into the room',
              body:
                  'Your spot is booked. Invite a friend who would make this event better.',
              actionLabel: 'Invite a friend',
              actionIcon: CatchIcons.send,
              onAction: widgetbookEventsNoopContext,
              surfaceStyle: EventDetailSurfaceStyle.dark(
                CatchTokens.of(context),
              ),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'companion / light surface',
        child: WidgetbookEventDeviceFrame(
          child: Padding(
            padding: CatchInsets.content,
            child: EventDetailCalloutCard(
              leadingIcon: CatchIcons.magic,
              title: 'Event companion',
              body:
                  'Check in, see your social prompt, and handle private follow-up after the event.',
              actionLabel: 'Open companion',
              actionIcon: CatchIcons.mobile,
              onAction: widgetbookEventsNoopContext,
              surfaceStyle: EventDetailSurfaceStyle.light(
                CatchTokens.of(context),
              ),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'companion / ticket surface',
        child: WidgetbookEventDeviceFrame(
          child: Padding(
            padding: CatchInsets.content,
            child: EventDetailCalloutCard(
              leadingIcon: CatchIcons.magic,
              title: 'Event companion',
              body:
                  'Check in, see your social prompt, and handle private follow-up after the event.',
              actionLabel: 'Open companion',
              actionIcon: CatchIcons.mobile,
              onAction: widgetbookEventsNoopContext,
              surfaceStyle: EventDetailSurfaceStyle.dark(
                CatchTokens.of(context),
              ),
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Guest book CTA',
  type: GuestBookDock,
  path: '[Event Detail]/Sections',
)
Widget eventDetailGuestBookCtaStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'GuestBookDock',
    catalogId: 'section.event.guest_book_cta',
    children: [
      WidgetbookPageStateCard(
        label: 'light dock',
        child: const WidgetbookContentFrame(
          child: GuestBookDock(onPressed: widgetbookNoop),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'dark dock',
        child: const WidgetbookContentFrame(
          child: GuestBookDock(onPressed: widgetbookNoop, darkSurface: true),
        ),
      ),
    ],
  );
}
