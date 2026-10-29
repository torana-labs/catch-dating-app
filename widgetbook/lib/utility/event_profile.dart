import 'package:catch_dating_app/chats/presentation/event_profile_controller.dart';
import 'package:catch_dating_app/chats/presentation/event_profile_screen.dart';
import 'package:catch_dating_app/chats/presentation/widgets/event_profile_answer_field.dart';
import 'package:catch_dating_app/chats/presentation/widgets/event_profile_editor_section.dart';
import 'package:catch_dating_app/chats/presentation/widgets/event_profile_identity_section.dart';
import 'package:catch_dating_app/chats/presentation/widgets/event_profile_photo_field.dart';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/event_chat_profile.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/form_profile.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../support/widgetbook_harness.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Choose details for one event',
  type: EventProfileScreen,
  path: '[P3 utility surfaces]/Event profile',
)
Widget eventProfileScreenPreview(BuildContext context) =>
    WidgetbookUtilityDeviceFrame(
      child: WidgetbookFixtureScope(
        overrides: [
          uidProvider.overrideWith((_) => Stream.value('preview-person')),
          watchUserProfileProvider.overrideWith((_) => Stream.value(null)),
          eventProfileEditorControllerProvider(
            'preview-event',
          ).overrideWith(_Editor.new),
        ],
        child: const EventProfileScreen(eventId: 'preview-event'),
      ),
    );

@widgetbook.UseCase(
  name: 'Only explicitly shared details',
  type: EventProfileScreen,
  path: '[P3 utility surfaces]/Event profile',
)
Widget eventParticipantScreenPreview(BuildContext context) =>
    WidgetbookUtilityDeviceFrame(
      child: WidgetbookFixtureScope(
        overrides: [
          uidProvider.overrideWith((_) => Stream.value('preview-person')),
          eventParticipantProfileControllerProvider(
            'preview-event',
            'sara',
          ).overrideWith(_Viewer.new),
        ],
        child: const EventProfileScreen(
          eventId: 'preview-event',
          participantUid: 'sara',
        ),
      ),
    );

@widgetbook.UseCase(
  name: 'Revoke after admission ends',
  type: EventProfileEditorSection,
  path: '[P3 utility surfaces]/Event profile',
)
Widget eventProfileRevokePreview(BuildContext context) =>
    WidgetbookUtilityDeviceFrame(
      child: CatchRouteScaffold(
        topBarBuilder: (_, _) =>
            const CatchTopBar.route(title: 'My event profile'),
        body: CatchRouteBody.standardConstrained(
          child: EventProfileEditorSection(
            state: _state(canShare: false),
            onSave: (_) {},
            onChooseCard: (_) {},
            onLoadMore: () {},
            onReload: () {},
          ),
        ),
      ),
    );

@widgetbook.UseCase(
  name: 'Participant mini-profile',
  type: EventProfileIdentitySection,
  path: '[P3 utility surfaces]/Event profile',
)
Widget eventProfileIdentityPreview(BuildContext context) =>
    WidgetbookUtilityDeviceFrame(
      child: CatchRouteScaffold(
        topBarBuilder: (_, _) =>
            const CatchTopBar.route(title: 'Event profile'),
        body: CatchRouteBody.standardConstrained(
          child: EventProfileIdentitySection(profile: _participant()),
        ),
      ),
    );

@widgetbook.UseCase(
  name: 'Review owned photo before sharing',
  type: EventProfilePhotoField,
  path: '[P3 utility surfaces]/Event profile',
)
Widget eventProfilePhotoPreview(BuildContext context) => EventProfilePhotoField(
  image: const AssetImage('assets/fixtures/club_hero_portrait.jpg'),
  label: 'Photo 1',
  selected: false,
  onChanged: (_) {},
);

EventParticipantProfile _participant() => EventParticipantProfile(
  eventId: 'preview-event',
  participantUid: 'sara',
  displayName: 'Sara',
  coreFields: [
    EventProfileField(id: 'age', value: 32),
    EventProfileField(id: 'occupation', value: 'Founder'),
  ],
  cardFields: [
    EventProfileField(id: 'Favourite drink', value: 'Tequila cocktails'),
  ],
  photo: null,
);
EventProfileEditorState _state({bool canShare = true}) =>
    EventProfileEditorState(
      uid: 'preview-person',
      settings: EventProfileSettings(
        eventId: 'preview-event',
        organizerId: 'rsvp',
        revision: 1,
        selection: EventProfileSelection(
          profileRevision: 2,
          membershipRevision: 1,
          coreFieldIds: ['age'],
          photoId: null,
          card: null,
        ),
        canShare: canShare,
        profileRevision: 2,
        membershipRevision: 1,
        coreFields: _participant().coreFields,
        photoIds: [],
      ),
      cards: [],
      nextCursor: null,
      card: FormProfileReview(
        responseId: 'response',
        organizerId: 'rsvp',
        formTitle: 'RSVP coffee afternoon',
        organizerName: 'RSVP',
        profileRevision: 2,
        intakeRevision: 1,
        cardRevision: 1,
        claimedAt: DateTime.utc(2026, 9, 23),
        termsVersion: 'form-profile-claim-v1',
        fields: [
          FormProfileField(
            questionId: 'drink',
            destination: FormProfileDestination.organizerCard,
            canonicalFieldId: null,
            label: 'Favourite drink',
            kind: 'shortText',
            value: 'Tequila cocktails',
          ),
        ],
        selectedCardQuestionIds: ['drink'],
        currentProfile: null,
        currentLinkedinUrl: null,
      ),
    );

class _Editor extends EventProfileEditorController {
  @override
  Future<EventProfileEditorState> build(String eventId) async => _state();
  @override
  void setForeground(bool value) {}
  @override
  Future<void> refresh({bool preserveDraft = false}) async {}
  @override
  Future<void> loadMore() async {}
  @override
  Future<void> chooseCard(
    String? responseId, {
    required String reviewedUid,
  }) async {}
  @override
  Future<bool> save(
    EventProfileSelection? selection, {
    required String reviewedUid,
    required int reviewedRevision,
  }) async => false;
}

class _Viewer extends EventParticipantProfileController {
  @override
  Future<EventParticipantProfile> build(
    String eventId,
    String participantUid,
  ) async => _participant();
  @override
  void setForeground(bool value) {}
  @override
  Future<void> refresh() async {}
}

@widgetbook.UseCase(
  name: 'Full answer review',
  type: EventProfileAnswerField,
  path: '[P3 utility surfaces]/Event profile',
)
Widget eventProfileAnswerPreview(
  BuildContext context,
) => EventProfileAnswerField.share(
  label: 'What do you enjoy?',
  answer:
      'I enjoy meeting new people over coffee, trying unfamiliar food and taking long walks with friends.',
  selected: false,
  onChanged: (_) {},
);
