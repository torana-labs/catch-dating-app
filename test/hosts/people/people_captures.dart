import 'dart:async';

import 'package:catch_dating_app/contexts/events/data/event_callable_responses.dart';
import 'package:catch_dating_app/hosts/people/automations_controller.dart';
import 'package:catch_dating_app/hosts/people/automations_screen.dart';
import 'package:catch_dating_app/hosts/people/compose_controller.dart';
import 'package:catch_dating_app/hosts/people/compose_screen.dart';
import 'package:catch_dating_app/hosts/people/conversation/conversation_people.dart';
import 'package:catch_dating_app/hosts/people/messages_controller.dart';
import 'package:catch_dating_app/hosts/people/messages_screen.dart';
import 'package:catch_dating_app/hosts/people/messages_state.dart';
import 'package:catch_dating_app/hosts/people/people_controller.dart';
import 'package:catch_dating_app/hosts/people/people_screen.dart';
import 'package:catch_dating_app/hosts/people/people_state.dart';
import 'package:catch_dating_app/hosts/people/person_controller.dart';
import 'package:catch_dating_app/hosts/people/person_screen.dart';
import 'package:catch_dating_app/hosts/people/saved_group_controller.dart';
import 'package:catch_dating_app/hosts/people/saved_group_screen.dart';
import 'package:catch_dating_app/hosts/people/sends/sends_controller.dart';
import 'package:catch_dating_app/hosts/people/sends/sends_screen.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod/misc.dart' show Override;

import 'people_fixtures.dart';

/// The People tab's capture fixtures: the boards' organizer on Tuesday 27
/// October, its directory, Rhea Kapoor, tonight's messages, a message to
/// Tuesday Trivia Night, the automatic messages, Trivia regulars and Sends.

/// The window the desktop list and detail board is drawn for.
const hostPeopleDesktopSize = Size(1440, 900);

/// Every People controller answered with the fixture data. Messages shows
/// [messages] (tonight's messages by default) for a list opened on
/// [messagesScope] and [messagesSegment], and [organizer] replaces the
/// signed-in organizer, for the loading and error captures.
List<Override> hostPeopleCaptureOverrides({
  HostMessagesState? messages,
  HostInboxScope? messagesScope,
  HostInboxAudienceSegment messagesSegment = HostInboxAudienceSegment.booked,
  HostPeopleOrganizer? organizer,
}) {
  final organizerId = peopleOrganizer.id;
  return [
    hostPeopleOrganizerProvider(
      null,
    ).overrideWithValue(organizer ?? peopleOrganizerScope),
    hostPeopleOrganizerProvider(
      organizerId,
    ).overrideWithValue(organizer ?? peopleOrganizerScope),
    hostPeopleControllerProvider(
      HostPeopleRequest(organizerId: organizerId),
    ).overrideWithValue(peopleState()),
    hostPersonControllerProvider(
      organizerId,
      'rk',
    ).overrideWithValue(personState()),
    hostMessagesControllerProvider(
      HostMessagesRequest(
        organizerId: organizerId,
        day: DateTime(peopleNow.year, peopleNow.month, peopleNow.day),
        scope: messagesScope,
        segment: messagesSegment,
      ),
    ).overrideWithValue(messages ?? messagesState()),
    hostSendsControllerProvider(
      HostSendsRequest(organizerId: organizerId, now: peopleNow),
    ).overrideWithValue(sendsState),
    hostComposeControllerProvider(
      HostComposeRequest(organizerId: organizerId, now: peopleNow),
    ).overrideWithValue(composeState),
    hostAutomationsControllerProvider(
      organizerId,
      DateTime(peopleNow.year, peopleNow.month),
    ).overrideWithValue(automationsState),
    hostSavedGroupControllerProvider(
      organizerId,
      'trivia',
    ).overrideWithValue(savedGroupState),
  ];
}

Widget hostPeopleCapture() => const HostPeopleScreen();

Widget hostPeopleDesktopCapture() =>
    const HostPeopleScreen(initialContactId: 'rk');

Widget hostPersonCapture() =>
    HostPersonScreen(organizerId: peopleOrganizer.id, contactId: 'rk');

/// Messages, opened on [scope] and [segment] when given.
Widget hostMessagesCapture({
  HostInboxScope? scope,
  HostInboxAudienceSegment segment = HostInboxAudienceSegment.booked,
}) => HostMessagesScreen(
  now: peopleNow,
  initialScope: scope,
  initialSegment: segment,
);

/// Sends: the history and the handoffs still to send by hand.
Widget hostSendsCapture() => HostSendsScreen(now: peopleNow);

Widget hostComposeCapture() =>
    HostComposeScreen(organizerId: peopleOrganizer.id, now: peopleNow);

/// Where a compose capture's send stands.
enum HostComposeCaptureSend { pending, failed }

/// The compose screen with its send [send]: still in flight, or failed.
Widget hostComposeSendCapture(HostComposeCaptureSend send) =>
    _ComposeSendCapture(send: send);

class _ComposeSendCapture extends ConsumerStatefulWidget {
  const _ComposeSendCapture({required this.send});

  final HostComposeCaptureSend send;

  @override
  ConsumerState<_ComposeSendCapture> createState() =>
      _ComposeSendCaptureState();
}

class _ComposeSendCaptureState extends ConsumerState<_ComposeSendCapture> {
  final _pending = Completer<SendEventBroadcastCallableResponse>();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final send = HostComposeCommands.sendMutation.run(
        ref,
        (_) => switch (widget.send) {
          HostComposeCaptureSend.pending => _pending.future,
          HostComposeCaptureSend.failed => Future.error(
            StateError('Capture announcement failed'),
          ),
        },
      );
      unawaited(send.then<void>((_) {}, onError: (Object _, StackTrace _) {}));
    });
  }

  @override
  Widget build(BuildContext context) => hostComposeCapture();
}

Widget hostAutomationsCapture() =>
    HostAutomationsScreen(organizerId: peopleOrganizer.id, now: peopleNow);

Widget hostSavedGroupCapture() =>
    HostSavedGroupScreen(organizerId: peopleOrganizer.id, audienceId: 'trivia');
