import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_participant_context_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_sender_preference_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_sms_preference_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_participant_context.dart';
import 'package:catch_dating_app/contexts/live/domain/event_sender_preference.dart';
import 'package:catch_dating_app/contexts/live/domain/event_sms_preference.dart';
import 'package:catch_dating_app/event_success/presentation/event_message_channel_accordion.dart';
import 'package:catch_dating_app/event_success/presentation/event_message_preference_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_message_preferences_navigation_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_message_preferences_sheet.dart';
import 'package:catch_dating_app/event_success/presentation/event_message_sender_section.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

const _path = '[P1 product surfaces]/Event Success/Guest message permissions';
const _eventId = 'event-1';
const _attendeeId = 'attendee-1';
const _senderId = 'sender-1';
const _hash =
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

@widgetbook.UseCase(
  name: 'Event detail entry',
  type: EventMessagePreferencesNavigationSection,
  path: _path,
)
Widget eventMessagePreferencesNavigation(BuildContext context) =>
    const _Preview(surface: _Surface.navigation);

@widgetbook.UseCase(
  name: 'Linked guest and independent channels',
  type: EventMessagePreferencesSheet,
  path: _path,
)
Widget eventMessagePreferencesSheet(BuildContext context) =>
    const _Preview(surface: _Surface.sheet);

@widgetbook.UseCase(
  name: 'Reviewed WhatsApp sender',
  type: EventMessageSenderSection,
  path: _path,
)
Widget eventMessageSenderSection(BuildContext context) =>
    const _Preview(surface: _Surface.sender);

@widgetbook.UseCase(
  name: 'Server-authored permission terms',
  type: EventMessagePreferenceSection,
  path: _path,
)
Widget eventMessagePreferenceSection(BuildContext context) =>
    const _Preview(surface: _Surface.preference);

@widgetbook.UseCase(
  name: 'Collapsed channel summary',
  type: EventMessageChannelAccordion,
  path: _path,
)
Widget eventMessageChannelAccordion(BuildContext context) =>
    const _Preview(surface: _Surface.accordion);

enum _Surface { navigation, sheet, sender, preference, accordion }

class _Preview extends StatelessWidget {
  const _Preview({required this.surface});

  final _Surface surface;

  @override
  Widget build(BuildContext context) => ProviderScope(
    overrides: [
      uidProvider.overrideWith((ref) => Stream.value('guest-1')),
      eventParticipantContextRepositoryProvider.overrideWith(
        (ref) => const _ParticipantRepository(),
      ),
      eventSenderPreferenceRepositoryProvider.overrideWith(
        (ref) => const _SenderRepository(),
      ),
      eventSmsPreferenceRepositoryProvider.overrideWith(
        (ref) => const _SmsRepository(),
      ),
    ],
    child: Scaffold(
      body: surface == _Surface.sheet
          ? const Align(
              alignment: Alignment.bottomCenter,
              child: EventMessagePreferencesSheet(eventId: _eventId),
            )
          : SingleChildScrollView(
              child: CatchPageBody(
                child: switch (surface) {
                  _Surface.navigation =>
                    const EventMessagePreferencesNavigationSection(
                      eventId: _eventId,
                    ),
                  _Surface.sender => CatchSection.fieldRows(
                    children: [
                      EventMessageSenderSection(
                        scope: EventSenderPreferenceScope(
                          channel: EventSenderChannel.whatsapp,
                          eventId: _eventId,
                          attendeeId: _attendeeId,
                        ),
                      ),
                    ],
                  ),
                  _Surface.preference => _permissionSection(),
                  _Surface.accordion => EventMessageChannelAccordion(
                    channel: EventMessageChannel.whatsapp,
                    summary: 'Not set',
                    child: _permissionSection(),
                  ),
                  _Surface.sheet => const SizedBox.shrink(),
                },
              ),
            ),
    ),
  );
}

Widget _permissionSection() => EventMessagePreferenceSection(
  channel: EventMessageChannel.whatsapp,
  permission: EventMessagePermission.notSet,
  availability: EventMessageAvailability.ready,
  phase: EventMessageSavePhase.ready,
  notice: EventMessageSaveNotice.none,
  consentText:
      'Allow this organizer to send service updates for this event. You can turn messages off at any time.',
  senderName: 'Catch Run Club',
  senderPhone: '+91 90000 00001',
  phoneLastFour: '9999',
  onEnable: () {},
);

class _ParticipantRepository implements EventParticipantContextRepository {
  const _ParticipantRepository();

  @override
  Future<EventParticipantContext> fetch({
    required String eventId,
    required String subjectUid,
  }) async => EventParticipantContext.fromCallableData(
    {
      'eventId': eventId,
      'subjectUid': subjectUid,
      'serverTime': 1000,
      'resolution': {
        'kind': 'linked',
        'organizerId': 'organizer-1',
        'attendeeId': _attendeeId,
        'sourceHash': _hash,
      },
    },
    eventId: eventId,
    subjectUid: subjectUid,
  );
}

class _SenderRepository implements EventSenderPreferenceRepository {
  const _SenderRepository();

  @override
  Future<EventSenderPreferencePage> list(
    EventSenderPreferenceScope scope, {
    String? cursor,
  }) async => EventSenderPreferencePage.fromCallableData(
    {
      'eventId': scope.eventId,
      'attendeeId': scope.attendeeId,
      'serverTime': 1000,
      'configuredSenderId': _senderId,
      'previousSenderIds': const <String>[],
      'nextCursor': null,
    },
    expectedScope: scope,
    after: cursor,
  );

  @override
  Future<EventSenderPreferenceView> fetch(
    EventSenderPreferenceScope scope,
    String senderId,
  ) async => EventSenderPreferenceResult.fromCallableData(
    {
      'outcome': 'read',
      'view': {
        'eventId': scope.eventId,
        'attendeeId': scope.attendeeId,
        'senderId': senderId,
        'serverTime': 1000,
        'revision': null,
        'reviewHash': _hash,
        'preference': 'notSet',
        'canEnable': true,
        'availability': 'ready',
        'phoneLastFour': '9999',
        'expiresAt': null,
        'consent': {
          'version': 'catch-event-service-${scope.channel.name}-v1',
          'text': 'Allow service updates for this event.',
        },
        if (scope.channel == EventSenderChannel.whatsapp) ...{
          'sender': {
            'displayName': 'Catch Run Club',
            'displayPhoneNumber': '+919000000001',
            'bindingHash': _hash,
          },
          'stopRecordHash': null,
        } else if (scope.channel == EventSenderChannel.rcs) ...{
          'eventTitle': 'Saturday social run',
          'sender': {'displayName': 'Catch Events'},
        },
      },
    },
    expectedScope: scope,
    expectedSenderId: senderId,
  ).view;

  @override
  Future<EventSenderPreferenceResult> apply(
    EventSenderPreferenceChange change,
  ) => Future.error(UnsupportedError('Preview does not save permissions.'));
}

class _SmsRepository implements EventSmsPreferenceRepository {
  const _SmsRepository();

  @override
  Future<EventSmsPreferenceView> fetch(EventSmsPreferenceScope scope) async =>
      EventSmsPreferenceResult.fromCallableData({
        'outcome': 'read',
        'view': {
          'eventId': scope.eventId,
          'attendeeId': scope.attendeeId,
          'senderId': scope.senderId,
          'serverTime': 1000,
          'revision': null,
          'reviewHash': _hash,
          'preference': 'notSet',
          'canEnable': true,
          'availability': 'ready',
          'phoneLastFour': '9999',
          'expiresAt': null,
          'consent': {
            'version': 'catch-event-service-sms-v1',
            'text': 'Allow Catch to send service updates for this event.',
          },
        },
      }, expectedScope: scope).view;

  @override
  Future<EventSmsPreferenceResult> apply(EventSmsPreferenceChange change) =>
      Future.error(UnsupportedError('Preview does not save permissions.'));
}
