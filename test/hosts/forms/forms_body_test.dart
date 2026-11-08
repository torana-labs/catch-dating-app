import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_configuration.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_editor.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_summary.dart';
import 'package:catch_dating_app/hosts/forms/form_new_body.dart';
import 'package:catch_dating_app/hosts/forms/form_new_state.dart';
import 'package:catch_dating_app/hosts/forms/form_share_body.dart';
import 'package:catch_dating_app/hosts/forms/forms_body.dart';
import 'package:catch_dating_app/hosts/forms/forms_state.dart';
import 'package:catch_kernel/brand.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import 'forms_fixtures.dart';

HostFormTemplateSummary _template(
  String id,
  String title,
  HostFormPurpose purpose,
) => HostFormTemplateSummary(
  templateId: id,
  version: 1,
  title: title,
  description: '$title description',
  purpose: purpose,
  identityPolicy: HostFormIdentityPolicy.phoneVerified,
  sectionCount: 1,
  questionCount: 3,
);

void main() {
  group('Forms', () {
    testWidgets('lists each form with its kind, count, placement and status', (
      tester,
    ) async {
      final opened = <HostFormSummary>[];
      final views = <HostPeopleView>[];
      await pumpFormsBody(
        tester,
        HostFormsBody(
          state: HostFormsState(
            status: HostFormsStatus.content,
            forms: formsList,
          ),
          onView: views.add,
          onOpenForm: opened.add,
          onCreate: () {},
          onLoadMore: () {},
        ),
      );

      expect(find.text('Your forms'), findsOneWidget);
      expect(find.text('Join the Sunday run'), findsOneWidget);
      expect(find.text('61 responses · on your page'), findsOneWidget);
      expect(find.text('Application'), findsNWidgets(2));
      expect(find.text('Enquiry'), findsOneWidget);
      expect(find.text('Interest list'), findsOneWidget);
      expect(find.text('Taking answers'), findsNWidgets(3));
      expect(find.text('Closed'), findsOneWidget);
      expect(find.text('Load more forms'), findsNothing);

      await tester.tap(find.text('Private quiz enquiries'));
      expect(opened.single.formId, 'quiz-enquiries');

      await tester.tap(find.text('People'));
      await tester.pump();
      expect(views, [HostPeopleView.people]);
    });

    testWidgets('an empty list offers a new form', (tester) async {
      var created = 0;
      await pumpFormsBody(
        tester,
        HostFormsBody(
          state: const HostFormsState(status: HostFormsStatus.content),
          onView: (_) {},
          onOpenForm: (_) {},
          onCreate: () => created++,
          onLoadMore: () {},
        ),
      );

      expect(find.text('No forms yet'), findsOneWidget);
      await tester.tap(find.text('New form'));
      expect(created, 1);
    });

    testWidgets('another page shows Load more, and a failed page Try again', (
      tester,
    ) async {
      var more = 0;
      await pumpFormsBody(
        tester,
        HostFormsBody(
          state: HostFormsState(
            status: HostFormsStatus.content,
            forms: formsList,
            canLoadMore: true,
            loadMoreError: StateError('offline'),
          ),
          onView: (_) {},
          onOpenForm: (_) {},
          onCreate: () {},
          onLoadMore: () => more++,
        ),
      );

      await tester.ensureVisible(find.text('Load more forms'));
      await tester.tap(find.text('Load more forms'));
      expect(more, 1);
      expect(find.text('More could not be loaded.'), findsOneWidget);
    });

    testWidgets('loading draws the rows as a skeleton', (tester) async {
      await pumpFormsBody(
        tester,
        HostFormsBody(
          state: const HostFormsState.loading(),
          onView: (_) {},
          onOpenForm: (_) {},
          onCreate: () {},
          onLoadMore: () {},
        ),
      );

      expect(find.byType(CatchSkeleton), findsOneWidget);
    });
  });

  group('New form', () {
    final templates = [
      _template('blank_form', 'Blank form', HostFormPurpose.intake),
      _template(
        'run_application',
        'Run application',
        HostFormPurpose.application,
      ),
      _template('dinner_intake', 'Dinner enquiry', HostFormPurpose.intake),
      _template('feedback', 'After the night', HostFormPurpose.feedback),
    ];

    test('one kind per purpose, from its first template, the blank last', () {
      final kinds = HostFormNewState.kinds(templates);
      expect(
        [for (final kind in kinds) kind.templateId],
        ['dinner_intake', 'run_application', 'feedback'],
      );
    });

    testWidgets('the kinds say what happens after someone answers', (
      tester,
    ) async {
      final picked = <String>[];
      await pumpFormsBody(
        tester,
        HostFormNewBody(
          state: HostFormNewState(
            status: HostFormNewStatus.content,
            choices: HostFormNewState.kinds(templates),
            selectedTemplateId: 'run_application',
          ),
          onSelect: picked.add,
        ),
      );

      expect(find.text('What happens after someone answers?'), findsOneWidget);
      expect(find.text('Application'), findsOneWidget);
      expect(
        find.text(
          'You decide who gets in before they can book. Then: you offer a '
          'place to the people you pick',
        ),
        findsOneWidget,
      );
      await tester.tap(find.text('Feedback'));
      expect(picked, ['feedback']);
    });

    testWidgets('the template list names each template', (tester) async {
      await pumpFormsBody(
        tester,
        HostFormNewBody(
          state: HostFormNewState(
            status: HostFormNewStatus.content,
            choices: HostFormNewState.templateChoices(templates),
            templates: true,
          ),
          onSelect: (_) {},
        ),
      );

      expect(find.text('Start from a template'), findsOneWidget);
      expect(find.text('Dinner enquiry'), findsOneWidget);
      expect(find.text('Blank form'), findsOneWidget);
    });
  });

  group('Share', () {
    testWidgets('shows the link with Copy and the three ways to share', (
      tester,
    ) async {
      var copied = 0;
      final shared = <HostFormShareTarget>[];
      await pumpFormsBody(
        tester,
        HostFormShareBody(
          url: '${Brand.webOrigin}/lanternlane/join-the-run/',
          onCopy: () => copied++,
          onShare: shared.add,
        ),
      );

      expect(
        find.text('${Brand.webDomain}/lanternlane/join-the-run'),
        findsOneWidget,
      );
      await tester.tap(find.text('Copy'));
      await tester.tap(find.text('WhatsApp'));
      await tester.tap(find.text('Embed'));
      expect(copied, 1);
      expect(shared, [HostFormShareTarget.whatsapp, HostFormShareTarget.embed]);
    });

    testWidgets('while the link loads nothing can be shared', (tester) async {
      var copied = 0;
      await pumpFormsBody(
        tester,
        HostFormShareBody(url: null, onCopy: () => copied++, onShare: (_) {}),
      );

      expect(
        tester
            .widget<CatchButton>(
              find.byKey(const ValueKey('host-form-share-story')),
            )
            .onPressed,
        isNull,
      );
      expect(copied, 0);
      expect(find.byType(CatchSkeleton), findsOneWidget);
    });
  });

  testWidgets('a form row binds its status tone and opens', (tester) async {
    var taps = 0;
    await pumpFormsBody(
      tester,
      HostFormsBody(
        state: HostFormsState(
          status: HostFormsStatus.content,
          forms: [formSummary(status: HostFormLifecycleStatus.draft)],
        ),
        onView: (_) {},
        onOpenForm: (_) => taps++,
        onCreate: () {},
        onLoadMore: () {},
      ),
    );

    expect(find.text('Draft'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('host-forms-row-join-the-run')));
    expect(taps, 1);
  });
}
