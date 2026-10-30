import 'dart:io';
import 'dart:ui' as ui;

import 'package:catch_dating_app/contexts/profiles/domain/form_profile.dart';
import 'package:catch_dating_app/contexts/profiles/domain/form_profile_photo_preview.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/callable_request_dtos.g.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_dating_app/user_profile/presentation/form_profile_photo_field.dart';
import 'package:catch_dating_app/user_profile/presentation/form_profile_review_screen.dart';
import 'package:catch_dating_app/user_profile/presentation/form_profiles_controller.dart';
import 'package:catch_dating_app/user_profile/presentation/form_profiles_screen.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/catch_test_fonts.dart';
import '../test_pump_helpers.dart';
import 'form_profile_draft_test.dart' show reviewFixture;

const _captureKey = ValueKey('form-profile-capture');
FormProfileReview _review() => reviewFixture(
  current: {
    'displayName': 'Sara Demo',
    'dateOfBirth': '1994-06-15',
    'gender': 'woman',
  },
  fields: [
    FormProfileField(
      questionId: 'occupation',
      destination: FormProfileDestination.catchProfile,
      canonicalFieldId: 'occupation',
      label: 'What do you do?',
      kind: 'shortText',
      value: 'Founder',
    ),
    FormProfileField(
      questionId: 'cocktail',
      destination: FormProfileDestination.organizerCard,
      canonicalFieldId: null,
      label: 'Your favorite cocktail',
      kind: 'shortText',
      value: 'Margarita',
    ),
  ],
);

void main() {
  setUpAll(loadCatchTestFonts);
  for (final dark in [false, true]) {
    for (final scale in [1.0, 2.0]) {
      testWidgets('owned photo can be reviewed before selection $dark $scale', (
        tester,
      ) async {
        final photo = FormProfilePhotoPreview(
          bytes: File('test/goldens/fixtures/portrait.jpg').readAsBytesSync(),
          width: 160,
          height: 200,
        );
        final review = reviewFixture(
          current: _review().currentProfile,
          fields: [
            FormProfileField(
              questionId: 'photo',
              destination: FormProfileDestination.catchProfile,
              canonicalFieldId: 'profilePhoto',
              label: 'Your photo',
              kind: 'file',
              value: const ['asset'],
            ),
          ],
        );
        final container = ProviderContainer(
          overrides: [
            formProfilePhotoPreviewProvider(
              'response',
              'photo',
              'asset',
            ).overrideWith((ref) async => photo),
          ],
        );
        addTearDown(container.dispose);
        await _pump(
          tester,
          UncontrolledProviderScope(
            container: container,
            child: FormProfileReviewPageBody(
              review: review,
              onSave: (_) {},
              onReload: () {},
            ),
          ),
          dark: dark,
          scale: scale,
        );
        await tester.runAsync(() async {
          await precacheImage(
            MemoryImage(photo.bytes),
            tester.element(find.byType(FormProfilePhotoSelectionField)),
          );
        });
        await pumpFeatureUi(tester);
        await tester.ensureVisible(find.byType(FormProfilePhotoSelectionField));
        await pumpFeatureUi(tester);
        _readable(tester);
        await _capture(tester, 'photo-${dark ? 'dark' : 'light'}-$scale');
      });
      testWidgets('review and private card have no clipped copy $dark $scale', (
        tester,
      ) async {
        await _pump(
          tester,
          FormProfileReviewPageBody(
            review: _review(),
            onSave: (_) {},
            onReload: () {},
          ),
          dark: dark,
          scale: scale,
        );
        _readable(tester);
        await _capture(tester, 'review-${dark ? 'dark' : 'light'}-$scale');
        await tester.ensureVisible(find.byKey(const ValueKey('keep-cocktail')));
        await pumpFeatureUi(tester);
        _readable(tester);
        await _capture(tester, 'card-${dark ? 'dark' : 'light'}-$scale');
      });
    }
  }
  testWidgets(
    'save requires acknowledgement; selection and edits reset it; retry keeps request ID',
    (tester) async {
      final saved = <ClaimParticipantFormProfileCallableRequest>[];
      await _pump(
        tester,
        FormProfileReviewPageBody(
          review: _review(),
          onSave: saved.add,
          onReload: () {},
        ),
      );
      CatchButton saveButton() => tester.widget<CatchButton>(
        find.widgetWithText(CatchButton, 'Save reviewed details'),
      );
      expect(saveButton().onPressed, isNull);
      await _toggle(tester, 'use-occupation');
      await _toggle(tester, 'keep-cocktail');
      await _toggle(tester, 'confirm-form-profile');
      await tester.ensureVisible(find.text('Save reviewed details'));
      await pumpFeatureUi(tester);
      await tester.tap(find.text('Save reviewed details'));
      await pumpFeatureUi(tester);
      expect(saved, hasLength(1));
      expect(saved.single.profile['occupation'], 'Founder');
      expect(saved.single.selectedQuestionIds, ['cocktail', 'occupation']);
      expect(saved.single.profile.containsKey('cocktail'), false);
      await tester.tap(find.text('Save reviewed details'));
      await pumpFeatureUi(tester);
      expect(saved.last.requestId, saved.first.requestId);
      await _toggle(tester, 'keep-cocktail');
      expect(saveButton().onPressed, isNull);
      await _toggle(tester, 'confirm-form-profile');
      await tester.ensureVisible(find.text('Save reviewed details'));
      await pumpFeatureUi(tester);
      await tester.tap(find.text('Save reviewed details'));
      expect(saved.last.requestId, isNot(saved.first.requestId));
      expect(saved.last.selectedQuestionIds, ['occupation']);
    },
  );
  testWidgets('organizer groups keep status and response actions distinct', (
    tester,
  ) async {
    final opened = <String>[];
    await _pump(
      tester,
      FormProfilesSectionList(
        state: FormProfilesState(
          page: FormProfilePage(
            items: [
              FormProfileSummary(
                responseId: 'pending',
                organizerId: 'rsvp',
                formTitle: 'Weekend application',
                organizerName: 'RSVP Demo',
                submittedAt: DateTime(2026, 9, 23),
                claimedAt: null,
                cardFieldCount: 0,
              ),
              FormProfileSummary(
                responseId: 'saved',
                organizerId: 'rsvp',
                formTitle: 'Community introduction',
                organizerName: 'RSVP Demo',
                submittedAt: DateTime(2026, 9, 22),
                claimedAt: DateTime(2026, 9, 22),
                cardFieldCount: 2,
              ),
            ],
            nextCursor: null,
          ),
        ),
        onOpen: opened.add,
        onLoadMore: () {},
      ),
    );
    expect(find.text('RSVP Demo'), findsOneWidget);
    expect(find.textContaining('Not claimed'), findsOneWidget);
    expect(
      find.textContaining('2 answers saved to your private card'),
      findsOneWidget,
    );
    for (final id in ['pending', 'saved']) {
      final field = find.byKey(ValueKey('form-profile-$id'));
      await tester.ensureVisible(field);
      await pumpFeatureUi(tester);
      await tester.tap(field);
    }
    expect(opened, ['pending', 'saved']);
  });
  testWidgets(
    'empty scanned page can load more without claiming no profiles exist',
    (tester) async {
      var loaded = false;
      await _pump(
        tester,
        FormProfilesSectionList(
          state: FormProfilesState(
            page: FormProfilePage(items: const [], nextCursor: 'withdrawn'),
          ),
          onOpen: (_) {},
          onLoadMore: () => loaded = true,
        ),
      );
      expect(find.text('No form profiles yet'), findsNothing);
      await tester.tap(find.text('Load more'));
      expect(loaded, true);
    },
  );
}

Future<void> _toggle(WidgetTester tester, String key) async {
  final field = find.byKey(ValueKey(key));
  await tester.ensureVisible(field);
  await pumpFeatureUi(tester);
  final toggle = find.descendant(
    of: field,
    matching: find.byType(CatchToggleInput),
  );
  expect(toggle, findsOneWidget);
  await tester.tap(toggle);
  await pumpFeatureUi(tester);
}

Future<void> _pump(
  WidgetTester tester,
  Widget body, {
  bool dark = false,
  double scale = 1,
}) async {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(390, 844);
  addTearDown(tester.view.resetDevicePixelRatio);
  addTearDown(tester.view.resetPhysicalSize);
  await tester.pumpWidget(
    RepaintBoundary(
      key: _captureKey,
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: dark ? AppTheme.dark : AppTheme.light,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: TextScaler.linear(scale)),
          child: child!,
        ),
        home: CatchRouteScaffold(
          topBarBuilder: (_, _) =>
              const CatchTopBar.route(title: 'Review your profile'),
          body: CatchRouteBody.standardConstrained(child: body),
        ),
      ),
    ),
  );
  await pumpFeatureUi(tester);
}

void _readable(WidgetTester tester) {
  expect(tester.takeException(), isNull);
  for (final paragraph in tester.renderObjectList<RenderParagraph>(
    find.byType(RichText),
  )) {
    expect(
      paragraph.didExceedMaxLines,
      false,
      reason: paragraph.text.toPlainText(),
    );
  }
}

Future<void> _capture(WidgetTester tester, String name) async {
  final directory = Platform.environment['CATCH_FORM_PROFILE_CAPTURE_DIR'];
  if (directory == null) return;
  await tester.runAsync(() async {
    final image = await tester
        .renderObject<RenderRepaintBoundary>(find.byKey(_captureKey))
        .toImage();
    try {
      final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
      await Directory(directory).create(recursive: true);
      await File(
        '$directory/$name.png',
      ).writeAsBytes(bytes!.buffer.asUint8List());
    } finally {
      image.dispose();
    }
  });
}
