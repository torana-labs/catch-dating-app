import 'dart:io';
import 'dart:ui' as ui;

import 'package:catch_dating_app/contexts/profiles/domain/form_profile.dart';
import 'package:catch_dating_app/contexts/profiles/domain/photo_upload_state.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_dating_app/user_profile/presentation/form_profiles_controller.dart';
import 'package:catch_dating_app/user_profile/presentation/profile_screen.dart';
import 'package:catch_dating_app/user_profile/presentation/self_profile_screen_state.dart';
import 'package:catch_dating_app/user_profile/presentation/self_profile_screen_state_provider.dart';
import 'package:catch_dating_app/user_profile/presentation/widgets/profile_sliver_header.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/catch_test_fonts.dart';
import '../test_pump_helpers.dart';

class _Forms extends FormProfilesController {
  @override
  Future<FormProfilesState> build() async => FormProfilesState(
    page: FormProfilePage(
      items: [
        FormProfileSummary(
          organizerId: 'org',
          responseId: 'rsvp',
          formTitle: 'Meet the community',
          organizerName: 'RSVP Demo',
          submittedAt: DateTime(2026, 9, 23, 10),
          claimedAt: null,
          cardFieldCount: 2,
        ),
        FormProfileSummary(
          organizerId: 'coffee-org',
          responseId: 'coffee',
          formTitle: 'Coffee & conversation',
          organizerName: 'Coffee Club Demo',
          submittedAt: DateTime(2026, 9, 22, 10),
          claimedAt: DateTime(2026, 9, 22, 11),
          cardFieldCount: 1,
        ),
      ],
      nextCursor: null,
    ),
  );
}

void main() {
  setUpAll(loadCatchTestFonts);
  for (final dark in [false, true]) {
    for (final scale in [1.0, 2.0]) {
      testWidgets(
        'form directory is readable without dating setup $dark $scale',
        (tester) async {
          tester.view.devicePixelRatio = 1;
          tester.view.physicalSize = const Size(390, 844);
          addTearDown(tester.view.resetDevicePixelRatio);
          addTearDown(tester.view.resetPhysicalSize);
          const captureKey = ValueKey('account-forms-capture');
          await tester.pumpWidget(
            ProviderScope(
              overrides: [
                selfProfileScreenStateProvider.overrideWithValue(
                  const SelfProfileScreenState(
                    status: SelfProfileRouteStatus.unavailable,
                    uploadState: PhotoUploadState(),
                    mutationMode: SelfProfileMutationMode.idle,
                  ),
                ),
                formProfilesControllerProvider.overrideWith(_Forms.new),
              ],
              child: RepaintBoundary(
                key: captureKey,
                child: MaterialApp(
                  debugShowCheckedModeBanner: false,
                  theme: dark ? AppTheme.dark : AppTheme.light,
                  localizationsDelegates:
                      AppLocalizations.localizationsDelegates,
                  supportedLocales: AppLocalizations.supportedLocales,
                  builder: (context, child) => MediaQuery(
                    data: MediaQuery.of(
                      context,
                    ).copyWith(textScaler: TextScaler.linear(scale)),
                    child: child!,
                  ),
                  home: const ProfileScreen(initialTab: SelfProfileTab.forms),
                ),
              ),
            ),
          );
          await pumpFeatureUi(tester);
          expect(find.text('RSVP Demo'), findsOneWidget);
          expect(find.text('Coffee Club Demo'), findsOneWidget);
          expect(find.byType(CatchErrorState), findsNothing);
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
          final directory =
              Platform.environment['CATCH_FORM_PROFILE_CAPTURE_DIR'];
          if (directory != null) {
            await tester.runAsync(() async {
              final image = await tester
                  .renderObject<RenderRepaintBoundary>(find.byKey(captureKey))
                  .toImage();
              try {
                final bytes = await image.toByteData(
                  format: ui.ImageByteFormat.png,
                );
                await Directory(directory).create(recursive: true);
                await File(
                  '$directory/account-forms-${dark ? 'dark' : 'light'}-$scale.png',
                ).writeAsBytes(bytes!.buffer.asUint8List());
              } finally {
                image.dispose();
              }
            });
          }
        },
      );
    }
  }
}
