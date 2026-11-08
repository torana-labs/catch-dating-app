import 'package:catch_dating_app/contexts/forms/domain/forms/host_event_offer.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_configuration.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_editor.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_question.dart';
import 'package:catch_dating_app/contexts/forms/domain/host_application_summary.dart';
import 'package:catch_dating_app/hosts/forms/form_detail_body.dart';
import 'package:catch_dating_app/hosts/forms/form_new_body.dart';
import 'package:catch_dating_app/hosts/forms/form_new_state.dart';
import 'package:catch_dating_app/hosts/forms/form_questions_body.dart';
import 'package:catch_dating_app/hosts/forms/form_questions_state.dart';
import 'package:catch_dating_app/hosts/forms/form_share_body.dart';
import 'package:catch_dating_app/hosts/forms/form_state.dart';
import 'package:catch_dating_app/hosts/forms/forms_body.dart';
import 'package:catch_dating_app/hosts/forms/forms_state.dart';
import 'package:catch_dating_app/hosts/forms/offer_body.dart';
import 'package:catch_dating_app/hosts/forms/offer_screen.dart';
import 'package:catch_dating_app/hosts/forms/offer_state.dart';
import 'package:catch_dating_app/hosts/forms/response_body.dart';
import 'package:catch_dating_app/hosts/forms/response_state.dart';
import 'package:catch_dating_app/hosts/forms/responses_body.dart';
import 'package:catch_dating_app/hosts/forms/responses_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

import 'forms_fixtures.dart';

/// The forms capture fixtures: each screen body in its screen chrome with
/// the board copy as fixture state (Lantern Lane, the Sunday run).

Widget _frame({
  required CatchTopBar Function(AppLocalizations l10n) topBar,
  required Widget body,
  CatchDock Function(AppLocalizations l10n)? dock,
}) => CatchRoot(
  child: Builder(
    builder: (context) => CatchScreen(
      topBar: topBar(context.l10n),
      body: body,
      dock: dock?.call(context.l10n),
    ),
  ),
);

Widget hostFormsCapture() => _frame(
  topBar: (l10n) => CatchTopBar(
    variant: CatchTopBarVariant.tabHome,
    kicker: 'Lantern Lane Social',
    title: l10n.hostFormsPeopleTitle,
    actions: [
      CatchButton(
        label: l10n.hostFormsNewFormShort,
        leading: CatchIcon(CatchIcons.add),
        size: CatchButtonSize.md,
        onPressed: () {},
      ),
    ],
  ),
  body: HostFormsBody(
    state: HostFormsState(status: HostFormsStatus.content, forms: formsList),
    onView: (_) {},
    onOpenForm: (_) {},
    onCreate: () {},
    onLoadMore: () {},
  ),
);

Widget hostFormCapture() => _frame(
  topBar: (l10n) => CatchTopBar(
    variant: CatchTopBarVariant.tool,
    title: 'Join the Sunday run',
    kicker: l10n.hostFormsFormTitle,
    back: CatchTopBarBack(label: l10n.hostFormsBack, onPressed: () {}),
    action: CatchTopBarAction(label: l10n.hostFormsSettings, onPressed: () {}),
  ),
  body: HostFormDetailBody(
    state: HostFormState(
      status: HostFormStatus.content,
      form: formSummary(),
      questionLabels: const [
        'Your easy pace',
        'How far do you usually go?',
        'How did you hear about us?',
        'Phone',
      ],
      analytics: formAnalytics,
      waiting: formEntries,
    ),
    now: formsNow,
    onOpenResponse: (_) {},
    onLetIn: (_) {},
    onSeeAll: () {},
    onChangeConsequences: () {},
    onShare: () {},
    onEditQuestions: () {},
    onPublish: () {},
  ),
);

Widget hostFormBuilderCapture() => _frame(
  topBar: (l10n) => CatchTopBar(
    variant: CatchTopBarVariant.tool,
    title: l10n.hostFormsQuestionsTitle,
    kicker: 'Join the Sunday run',
    back: CatchTopBarBack(label: l10n.hostFormsBack, onPressed: () {}),
    action: CatchTopBarAction(label: l10n.hostFormsPreview, onPressed: () {}),
  ),
  body: HostFormQuestionsBody(
    state: HostFormQuestionsState(
      status: HostFormQuestionsStatus.content,
      questions: [
        for (final (index, question) in [
          formQuestion(
            'name',
            'What should we call you on the night?',
            required: true,
          ),
          formQuestion(
            'food',
            'Any food we should know about?',
            kind: HostFormQuestionKind.multiChoice,
            required: true,
            choices: const [
              'None',
              'Vegetarian',
              'Jain',
              'Vegan',
              'An allergy (tell us)',
            ],
          ),
          formQuestion(
            'before',
            'Been to a quiz night before?',
            kind: HostFormQuestionKind.boolean,
          ),
          formQuestion(
            'heard',
            'How did you hear about us?',
            kind: HostFormQuestionKind.singleChoice,
            choices: const ['Instagram', 'A friend', 'Catch', 'Walked past'],
          ),
        ].indexed)
          HostFormQuestionSlot(
            sectionIndex: 0,
            questionIndex: index,
            question: question,
          ),
      ],
    ),
    onOpen: (_) {},
    onRequiredChanged: (_, _) {},
    onLabelChanged: (_, _) {},
    onOptionChanged: (_, _, _) {},
    onAddOption: (_) {},
    onRemove: (_) {},
    onAdd: (_) {},
    onRetrySave: () {},
  ),
  dock: (l10n) => CatchDock(
    primary: CatchDockAction(
      label: l10n.hostFormsQuestionsSave,
      onPressed: () {},
    ),
    secondary: CatchDockAction(
      label: l10n.hostFormsQuestionsDiscard,
      onPressed: () {},
    ),
  ),
);

Widget hostResponsesCapture() => _frame(
  topBar: (l10n) => CatchTopBar(
    variant: CatchTopBarVariant.tool,
    title: 'Join the Sunday run',
    kicker: l10n.hostFormsResponsesKicker(
      kind: l10n.hostFormsKindApplication,
      count: 61,
    ),
    back: CatchTopBarBack(label: l10n.hostFormsBack, onPressed: () {}),
    action: CatchTopBarAction(
      label: l10n.hostFormsShareTitle,
      onPressed: () {},
    ),
  ),
  body: HostResponsesBody(
    state: HostResponsesState(
      status: HostResponsesStatus.content,
      filter: HostApplicationReviewStatus.submitted,
      entries: formEntries,
    ),
    now: formsNow,
    onView: (_) {},
    onFilter: (_) {},
    onOpen: (_) {},
    onLoadMore: () {},
  ),
);

Widget hostResponseCapture() => _frame(
  topBar: (l10n) => CatchTopBar(
    variant: CatchTopBarVariant.tool,
    title: 'Tara Menon',
    kicker: l10n.hostFormsResponseKicker(
      form: 'Join the Sunday run',
      ago: '2d',
    ),
    back: CatchTopBarBack(label: l10n.hostFormsBack, onPressed: () {}),
    action: CatchTopBarAction(
      label: l10n.hostFormsResponseMessage,
      onPressed: () {},
    ),
  ),
  body: HostResponseBody(
    state: const HostResponseState(
      status: HostResponseStatus.content,
      name: 'Tara Menon',
      review: HostApplicationReviewStatus.submitted,
      facts: ['Instagram bio', '+91 98201 44718'],
      answers: [
        HostResponseAnswer(
          question: 'Your easy pace',
          answer: 'Steady, 6:00 to 7:00 a km',
        ),
        HostResponseAnswer(
          question: 'How far do you usually go?',
          answer: '5 km',
        ),
        HostResponseAnswer(
          question: 'Anything we should know?',
          answer:
              'Coming back from a knee injury, so I would like the 5 km loop '
              'for now.',
        ),
        HostResponseAnswer(
          question: 'How did you hear about us?',
          answer: 'Instagram',
        ),
      ],
      showNote: true,
      primary: HostResponsePrimary.offer,
      canDecline: true,
      canMessage: true,
    ),
    note: TextEditingController(),
    onOpenFile: (_) {},
  ),
  dock: (l10n) => CatchDock(
    primary: CatchDockAction(
      label: l10n.hostFormsResponseOffer,
      onPressed: () {},
    ),
    secondary: CatchDockAction(
      label: l10n.hostFormsReviewNotNow,
      onPressed: () {},
    ),
  ),
);

Widget hostOfferCapture() {
  final events = [
    HostOfferEvent(
      id: 'n8',
      name: 'Carter Road Social Run',
      startsAt: DateTime(2026, 11, 15, 6, 30),
    ),
    HostOfferEvent(
      id: 'n15',
      name: 'Carter Road Social Run',
      startsAt: DateTime(2026, 11, 22, 6, 30),
    ),
    HostOfferEvent(
      id: 'n22',
      name: 'Half-marathon training: 15K',
      startsAt: DateTime(2026, 11, 29, 6),
    ),
  ];
  return _frame(
    topBar: (l10n) => hostOfferTopBar(l10n, 'Tara Menon'),
    body: HostOfferBody(
      state: HostOfferState(
        stage: HostOfferStage.selected,
        events: events,
        event: events.first,
        selected: HostOfferSelected(
          name: 'Tara',
          status: HostOfferStatus.offered,
          expiresAt: DateTime(2026, 11, 13, 21),
          message:
              'Hi Tara! There’s a place for you on the Sunday 15 Nov run. '
              'It’s held until Friday at 9 PM. Book here: catchdates.com/o/4fk2',
          canOpenWhatsapp: true,
        ),
      ),
      bankChecked: false,
      onChoose: (_) {},
      onLoadMoreEvents: () {},
      onAddToPeople: (_) {},
      onOpenSettings: () {},
      onPersonalLink: (_, _) {},
      onOpenExisting: (_) {},
      onPrepareMessage: () {},
      onOpenWhatsapp: () {},
      onCopyMessage: () {},
      onReference: (_) {},
      onManualNote: (_) {},
      onBankChecked: (_) {},
      onAdmit: () {},
      onRetry: () {},
    ),
    dock: (l10n) => CatchDock(
      primary: CatchDockAction(
        label: l10n.hostFormsOfferDone,
        onPressed: () {},
      ),
    ),
  );
}

Widget hostFormNewCapture() {
  HostFormTemplateSummary template(String id, HostFormPurpose purpose) =>
      HostFormTemplateSummary(
        templateId: id,
        version: 1,
        title: id,
        description: null,
        purpose: purpose,
        identityPolicy: HostFormIdentityPolicy.phoneVerified,
        sectionCount: 1,
        questionCount: 3,
      );
  final choices = HostFormNewState.kinds([
    template('application', HostFormPurpose.application),
    template('interest', HostFormPurpose.registration),
    template('enquiry', HostFormPurpose.intake),
    template('feedback', HostFormPurpose.feedback),
  ]);
  return _frame(
    topBar: (l10n) => CatchTopBar(
      variant: CatchTopBarVariant.tool,
      title: l10n.hostFormsNewTitle,
      kicker: l10n.hostFormsNewKicker,
      back: CatchTopBarBack(
        label: l10n.hostFormsClose,
        close: true,
        onPressed: () {},
      ),
    ),
    body: HostFormNewBody(
      state: HostFormNewState(
        status: HostFormNewStatus.content,
        choices: choices,
        selectedTemplateId: 'application',
      ),
      onSelect: (_) {},
    ),
    dock: (l10n) => CatchDock(
      primary: CatchDockAction(label: l10n.hostFormsNewNext, onPressed: () {}),
      secondary: CatchDockAction(
        label: l10n.hostFormsNewTemplates,
        onPressed: () {},
      ),
    ),
  );
}

Widget hostFormShareCapture() => _frame(
  topBar: (l10n) => CatchTopBar(
    variant: CatchTopBarVariant.tool,
    title: l10n.hostFormsShareTitle,
    kicker: 'Join the Sunday run',
    back: CatchTopBarBack(label: l10n.hostFormsBack, onPressed: () {}),
  ),
  body: HostFormShareBody(
    url: 'https://catchdates.com/lanternlane/join-the-run/',
    onCopy: () {},
    onShare: (_) {},
  ),
);

/// The captures by id, as the catalog and the capture test name them.
final hostFormsCaptures = <String, Widget Function()>{
  'host_forms_phone': hostFormsCapture,
  'host_form_phone': hostFormCapture,
  'host_form_new_phone': hostFormNewCapture,
  'host_form_share_phone': hostFormShareCapture,
  'host_form_builder_phone': hostFormBuilderCapture,
  'host_responses_phone': hostResponsesCapture,
  'host_response_phone': hostResponseCapture,
  'host_offer_phone': hostOfferCapture,
};
