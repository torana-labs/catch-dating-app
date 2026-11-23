import 'package:catch_dating_app/event_success/presentation/assignments/event_success_group_override_draft.dart';
import 'package:catch_dating_app/event_success/presentation/assignments/event_success_group_override_round_section.dart';
import 'package:catch_dating_app/event_success/presentation/assignments/event_success_group_override_sheet.dart';
import 'package:catch_dating_app/event_success/presentation/assignments/event_success_rotation_override_draft.dart';
import 'package:catch_dating_app/event_success/presentation/assignments/event_success_rotation_override_round_section.dart';
import 'package:catch_dating_app/event_success/presentation/assignments/event_success_rotation_override_sheet.dart';
import 'package:catch_test_support/design_fixtures/event_success_companion_fixtures.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../support/widgetbook_harness.dart';

@widgetbook.UseCase(
  name: 'Ready',
  type: EventSuccessGroupOverrideSheet,
  path: '[P1 product surfaces]/Event Success/Assignment components',
)
Widget eventSuccessStrictGroupOverrideSheet(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessGroupOverrideSheet',
      catalogId: 'Event Success assignments',
      children: [
        EventSuccessGroupOverrideSheet(
          event: EventSuccessCompanionFixtures.socialEvent,
          assignments: [EventSuccessCompanionFixtures.microPodAssignment],
          participantProfiles: EventSuccessCompanionFixtures.peers,
          onOverride: (_) async {},
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'Ready',
  type: EventSuccessRotationOverrideSheet,
  path: '[P1 product surfaces]/Event Success/Assignment components',
)
Widget eventSuccessStrictRotationOverrideSheet(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessRotationOverrideSheet',
      catalogId: 'Event Success assignments',
      children: [
        EventSuccessRotationOverrideSheet(
          event: EventSuccessCompanionFixtures.racketEvent,
          assignments: [EventSuccessCompanionFixtures.rotationAssignment],
          participantProfiles: EventSuccessCompanionFixtures.peers,
          onOverride: (_) async {},
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'Ready',
  type: EventSuccessGroupOverrideRoundSection,
  path: '[P1 product surfaces]/Event Success/Assignment components',
)
Widget eventSuccessStrictGroupOverrideRoundEditor(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessGroupOverrideRoundSection',
      catalogId: 'Event Success assignments',
      children: [
        EventSuccessGroupOverrideRoundSection(
          round: GroupOverrideRoundDraft(
            roundIndex: 0,
            groups: [
              GroupOverrideUnitDraft(
                label: 'Pod A',
                memberUids: [
                  EventSuccessCompanionFixtures.viewerUid,
                  EventSuccessCompanionFixtures.peerUid,
                ],
              ),
            ],
          ),
          participantUids: [
            EventSuccessCompanionFixtures.viewerUid,
            ...EventSuccessCompanionFixtures.peers.map((p) => p.uid),
          ],
          participantLabel: (uid) =>
              uid == EventSuccessCompanionFixtures.viewerUid
              ? EventSuccessCompanionFixtures.viewer.name
              : EventSuccessCompanionFixtures.peers
                    .firstWhere((p) => p.uid == uid)
                    .name,
          onChanged: () {},
          onAddGroup: () {},
          onRemoveGroup: (_) {},
          onAddMember: (_) {},
          onRemoveMember: (_, _) {},
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'Ready',
  type: EventSuccessGroupOverrideFieldLanes,
  path: '[P1 product surfaces]/Event Success/Assignment components',
)
Widget eventSuccessStrictGroupOverrideUnitEditor(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessGroupOverrideFieldLanes',
      catalogId: 'Event Success assignments',
      children: [
        EventSuccessGroupOverrideFieldLanes(
          group: GroupOverrideUnitDraft(
            label: 'Pod A',
            memberUids: [
              EventSuccessCompanionFixtures.viewerUid,
              EventSuccessCompanionFixtures.peerUid,
            ],
          ),
          participantUids: [
            EventSuccessCompanionFixtures.viewerUid,
            ...EventSuccessCompanionFixtures.peers.map((p) => p.uid),
          ],
          participantLabel: (uid) =>
              uid == EventSuccessCompanionFixtures.viewerUid
              ? EventSuccessCompanionFixtures.viewer.name
              : EventSuccessCompanionFixtures.peers
                    .firstWhere((p) => p.uid == uid)
                    .name,
          onChanged: () {},
          onAddMember: () {},
          onRemoveGroup: () {},
          onRemoveMember: (_) {},
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'Ready',
  type: EventSuccessGroupMemberField,
  path: '[P1 product surfaces]/Event Success/Assignment components',
)
Widget eventSuccessStrictGroupOverrideMemberEditor(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessGroupMemberField',
      catalogId: 'Event Success assignments',
      children: [
        EventSuccessGroupMemberField(
          value: EventSuccessCompanionFixtures.peerUid,
          participantUids: [
            EventSuccessCompanionFixtures.viewerUid,
            ...EventSuccessCompanionFixtures.peers.map((p) => p.uid),
          ],
          participantLabel: (uid) =>
              uid == EventSuccessCompanionFixtures.viewerUid
              ? EventSuccessCompanionFixtures.viewer.name
              : EventSuccessCompanionFixtures.peers
                    .firstWhere((p) => p.uid == uid)
                    .name,
          onChanged: (_) {},
          onRemove: () {},
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'Ready',
  type: EventSuccessRotationOverrideRoundSection,
  path: '[P1 product surfaces]/Event Success/Assignment components',
)
Widget eventSuccessStrictRotationOverrideRoundEditor(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessRotationOverrideRoundSection',
      catalogId: 'Event Success assignments',
      children: [
        EventSuccessRotationOverrideRoundSection(
          round: RotationOverrideRoundDraft(
            roundIndex: 0,
            pairings: [
              RotationOverridePairDraft(
                uidA: EventSuccessCompanionFixtures.viewerUid,
                uidB: EventSuccessCompanionFixtures.peerUid,
              ),
            ],
          ),
          participantUids: [
            EventSuccessCompanionFixtures.viewerUid,
            ...EventSuccessCompanionFixtures.peers.map((p) => p.uid),
          ],
          participantLabel: (uid) =>
              uid == EventSuccessCompanionFixtures.viewerUid
              ? EventSuccessCompanionFixtures.viewer.name
              : EventSuccessCompanionFixtures.peers
                    .firstWhere((p) => p.uid == uid)
                    .name,
          onChanged: () {},
          onAddPair: () {},
          onRemovePair: (_) {},
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'Ready',
  type: EventSuccessRotationPairFieldLanes,
  path: '[P1 product surfaces]/Event Success/Assignment components',
)
Widget eventSuccessStrictRotationOverridePairEditor(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessRotationPairFieldLanes',
      catalogId: 'Event Success assignments',
      children: [
        EventSuccessRotationPairFieldLanes(
          pair: RotationOverridePairDraft(
            uidA: EventSuccessCompanionFixtures.viewerUid,
            uidB: EventSuccessCompanionFixtures.peerUid,
          ),
          participantUids: [
            EventSuccessCompanionFixtures.viewerUid,
            ...EventSuccessCompanionFixtures.peers.map((p) => p.uid),
          ],
          participantLabel: (uid) =>
              uid == EventSuccessCompanionFixtures.viewerUid
              ? EventSuccessCompanionFixtures.viewer.name
              : EventSuccessCompanionFixtures.peers
                    .firstWhere((p) => p.uid == uid)
                    .name,
          onChanged: () {},
          onRemove: () {},
        ),
      ],
    );
