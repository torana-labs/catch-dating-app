import 'dart:io';
import 'dart:ui' as ui;

import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_question.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_section.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_question_section.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/catch_test_fonts.dart';
import '../../test_pump_helpers.dart';

class _Controller extends Fake implements HostFormEditorController {}

const _captureKey = ValueKey('profile-field-capture');

void main() {
  setUpAll(loadCatchTestFonts);
  for (final destination in HostFormAnswerDestination.values) {
    for (final dark in [false, true]) {
      testWidgets('profile use $destination wraps at large text, dark=$dark', (
        tester,
      ) async {
        tester.view.devicePixelRatio = 1;
        tester.view.physicalSize = const Size(390, 844);
        addTearDown(tester.view.resetDevicePixelRatio);
        addTearDown(tester.view.resetPhysicalSize);
        final question =
            HostFormQuestion.create(
              questionId: 'name',
              kind: HostFormQuestionKind.shortText,
            ).copyWith(
              label: 'First name',
              canonicalFieldId: 'givenName',
              answerDestination: destination,
            );
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
                ).copyWith(textScaler: const TextScaler.linear(1.5)),
                child: child!,
              ),
              home: CatchRouteScaffold(
                topBarBuilder: (_, _) =>
                    const CatchTopBar.route(title: 'Form question'),
                body: CatchRouteBody.standardConstrainedSlivers(
                  slivers: [
                    SliverToBoxAdapter(
                      child: HostFormQuestionSection(
                        sectionIndex: 0,
                        questionIndex: 0,
                        question: question,
                        questionCount: 1,
                        compact: true,
                        sections: [
                          HostFormSection.create(
                            sectionId: 'details',
                          ).addQuestion(question),
                        ],
                        notifier: _Controller(),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
        await pumpFeatureUi(tester);
        await ensureCentered(tester, find.text('Profile use'));
        await pumpFeatureUi(tester);
        expect(tester.takeException(), isNull);
        final field = find.byWidgetPredicate(
          (widget) => widget is CatchField<HostFormAnswerDestination>,
        );
        expect(field, findsOneWidget);
        for (final rich
            in find
                .descendant(of: field, matching: find.byType(RichText))
                .evaluate()) {
          final paragraph = rich.renderObject as RenderParagraph;
          expect(
            paragraph.didExceedMaxLines,
            isFalse,
            reason: paragraph.text.toPlainText(),
          );
        }
        final directory =
            Platform.environment['CATCH_FORM_PROFILE_CAPTURE_DIR'];
        if (directory != null) {
          await tester.runAsync(() async {
            final image = await tester
                .renderObject<RenderRepaintBoundary>(find.byKey(_captureKey))
                .toImage();
            try {
              final bytes = await image.toByteData(
                format: ui.ImageByteFormat.png,
              );
              await Directory(directory).create(recursive: true);
              await File(
                '$directory/${destination.name}-${dark ? 'dark' : 'light'}.png',
              ).writeAsBytes(bytes!.buffer.asUint8List());
            } finally {
              image.dispose();
            }
          });
        }
      });
    }
  }
}
