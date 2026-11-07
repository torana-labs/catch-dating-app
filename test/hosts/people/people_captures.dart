import 'package:catch_dating_app/hosts/people/automations_controller.dart';
import 'package:catch_dating_app/hosts/people/automations_screen.dart';
import 'package:catch_dating_app/hosts/people/compose_controller.dart';
import 'package:catch_dating_app/hosts/people/compose_screen.dart';
import 'package:catch_dating_app/hosts/people/messages_controller.dart';
import 'package:catch_dating_app/hosts/people/messages_screen.dart';
import 'package:catch_dating_app/hosts/people/people_controller.dart';
import 'package:catch_dating_app/hosts/people/people_screen.dart';
import 'package:catch_dating_app/hosts/people/person_controller.dart';
import 'package:catch_dating_app/hosts/people/person_screen.dart';
import 'package:catch_dating_app/hosts/people/saved_group_controller.dart';
import 'package:catch_dating_app/hosts/people/saved_group_screen.dart';
import 'package:flutter/widgets.dart';
import 'package:riverpod/misc.dart' show Override;

import 'people_fixtures.dart';

/// The People tab's capture fixtures: the boards' organizer on Tuesday 27
/// October, its directory, Rhea Kapoor, tonight's messages, a message to
/// Tuesday Trivia Night, the automatic messages and Trivia regulars.

/// The window the desktop list and detail board is drawn for.
const hostPeopleDesktopSize = Size(1440, 900);

/// Every People controller answered with the fixture data.
List<Override> hostPeopleCaptureOverrides() {
  final organizerId = peopleOrganizer.id;
  return [
    hostPeopleOrganizerProvider(null).overrideWithValue(peopleOrganizerScope),
    hostPeopleOrganizerProvider(
      organizerId,
    ).overrideWithValue(peopleOrganizerScope),
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
      ),
    ).overrideWithValue(messagesState()),
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

Widget hostMessagesCapture() => HostMessagesScreen(now: peopleNow);

Widget hostComposeCapture() =>
    HostComposeScreen(organizerId: peopleOrganizer.id, now: peopleNow);

Widget hostAutomationsCapture() =>
    HostAutomationsScreen(organizerId: peopleOrganizer.id, now: peopleNow);

Widget hostSavedGroupCapture() =>
    HostSavedGroupScreen(organizerId: peopleOrganizer.id, audienceId: 'trivia');
