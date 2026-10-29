import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/form_profile.dart';
import 'package:catch_dating_app/contexts/profiles/domain/form_profile_photo_preview.dart';
import 'package:catch_dating_app/user_profile/presentation/form_profile_photo_field.dart';
import 'package:catch_dating_app/user_profile/presentation/form_profile_review_screen.dart';
import 'package:catch_dating_app/user_profile/presentation/form_profiles_controller.dart';
import 'package:catch_dating_app/user_profile/presentation/widgets/form_profile_value_field.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import '../support/widgetbook_harness.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Review before claiming a form profile',
  type: FormProfileReviewScreen,
  path: '[P3 utility surfaces]/Form profiles',
)
Widget formProfileReviewScreenPreview(BuildContext context) =>
    WidgetbookUtilityDeviceFrame(
      child: WidgetbookFixtureScope(
        overrides: [
          uidProvider.overrideWith((_) => Stream.value('preview-person')),
          formProfileReviewProvider(
            'response',
          ).overrideWith((_) async => _review()),
          formProfilePhotoPreviewProvider(
            'response',
            'photo',
            'asset',
          ).overrideWith((_) => _photo()),
        ],
        child: const FormProfileReviewScreen(responseId: 'response'),
      ),
    );

@widgetbook.UseCase(
  name: 'Separate core fields and organizer answers',
  type: FormProfileReviewPageBody,
  path: '[P3 utility surfaces]/Form profiles',
)
Widget formProfileReviewBodyPreview(BuildContext context) =>
    WidgetbookUtilityDeviceFrame(
      child: CatchRouteScaffold(
        topBarBuilder: (_, _) =>
            const CatchTopBar.route(title: 'Review profile'),
        body: CatchRouteBody.standardConstrained(
          child: FormProfileReviewPageBody(
            review: _review(photo: false),
            onSave: (_) {},
            onReload: () {},
          ),
        ),
      ),
    );

@widgetbook.UseCase(
  name: 'Typed basic fields within a claim review',
  type: FormProfileValueField,
  path: '[P3 utility surfaces]/Form profiles',
)
Widget formProfileValueFieldPreview(BuildContext context) =>
    formProfileReviewBodyPreview(context);

@widgetbook.UseCase(
  name: 'Owned photo preview before selection',
  type: FormProfilePhotoField,
  path: '[P3 utility surfaces]/Form profiles',
)
Widget formProfilePhotoFieldPreview(BuildContext context) =>
    WidgetbookUtilityDeviceFrame(
      child: WidgetbookFixtureScope(
        overrides: [
          formProfilePhotoPreviewProvider(
            'response',
            'photo',
            'asset',
          ).overrideWith((_) => _photo()),
        ],
        child: CatchRouteScaffold(
          topBarBuilder: (_, _) =>
              const CatchTopBar.route(title: 'Review photo'),
          body: CatchRouteBody.standardConstrained(
            child: FormProfilePhotoField(
              responseId: 'response',
              field: _photoField(),
              selected: false,
              busy: false,
              onChanged: (_) {},
            ),
          ),
        ),
      ),
    );

@widgetbook.UseCase(
  name: 'Photo selection waits for decoding',
  type: FormProfilePhotoSelectionField,
  path: '[P3 utility surfaces]/Form profiles',
)
Widget formProfilePhotoSelectionPreview(BuildContext context) =>
    formProfilePhotoFieldPreview(context);

Future<FormProfilePhotoPreview> _photo() async {
  final bytes = await rootBundle.load('assets/fixtures/club_hero_portrait.jpg');
  return FormProfilePhotoPreview(
    bytes: bytes.buffer.asUint8List(bytes.offsetInBytes, bytes.lengthInBytes),
    width: 160,
    height: 200,
  );
}

FormProfileField _photoField() => FormProfileField(
  questionId: 'photo',
  destination: FormProfileDestination.catchProfile,
  canonicalFieldId: 'profilePhoto',
  label: 'Your photo',
  kind: 'file',
  value: const ['asset'],
);
FormProfileReview _review({bool photo = true}) => FormProfileReview(
  responseId: 'response',
  organizerId: 'rsvp',
  formTitle: 'Your introduction',
  organizerName: 'RSVP Demo',
  profileRevision: 0,
  intakeRevision: 1,
  termsVersion: 'profile-claim-v1',
  fields: [
    FormProfileField(
      questionId: 'occupation',
      destination: FormProfileDestination.catchProfile,
      canonicalFieldId: 'occupation',
      label: 'What do you do?',
      kind: 'shortText',
      value: 'Founder',
    ),
    if (photo) _photoField(),
    FormProfileField(
      questionId: 'drink',
      destination: FormProfileDestination.organizerCard,
      canonicalFieldId: null,
      label: 'Favourite drink',
      kind: 'shortText',
      value: 'Tequila cocktails',
    ),
  ],
  selectedCardQuestionIds: const [],
  currentProfile: const {
    'displayName': 'Sara Demo',
    'dateOfBirth': '1994-06-15',
    'gender': 'woman',
  },
  currentLinkedinUrl: null,
  cardRevision: 0,
  claimedAt: null,
);
