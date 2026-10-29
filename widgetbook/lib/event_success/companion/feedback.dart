import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/design_fixtures/event_success_companion_fixtures.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_companion_screen.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import '../../support/widgetbook_harness.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Feedback form',
  type: EventSuccessFeedbackForm,
  path: '[P1 product surfaces]/Event Success companion',
)
Widget eventSuccessFeedbackFormStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'EventSuccessFeedbackForm',
    contractId: 'component.event_success.companion.feedback_form',
    children: [
      WidgetbookPageStateCard(
        label: 'new private feedback',
        child: WidgetbookCompanionDeviceFrame(child: _feedbackFormPreview()),
      ),
      WidgetbookPageStateCard(
        label: 'saved private feedback',
        child: WidgetbookCompanionDeviceFrame(
          child: _feedbackFormPreview(
            existingFeedback: EventSuccessCompanionFixtures.feedback,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Feedback rating row',
  type: RatingRow,
  path: '[P1 product surfaces]/Event Success companion',
)
Widget eventSuccessFeedbackRatingRowStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'RatingRow',
    contractId: 'component.event_success.companion.feedback.rating_row',
    children: [
      WidgetbookPageStateCard(
        label: 'partial rating',
        child: WidgetbookCompanionDeviceFrame(
          child: _feedbackPartPreview(
            RatingRow(label: 'Welcome', value: 3, onChanged: (_) {}),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'max rating',
        child: WidgetbookCompanionDeviceFrame(
          child: _feedbackPartPreview(
            RatingRow(label: 'Structure', value: 5, onChanged: (_) {}),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Feedback counter row',
  type: CounterRow,
  path: '[P1 product surfaces]/Event Success companion',
)
Widget eventSuccessFeedbackCounterRowStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'CounterRow',
    contractId: 'component.event_success.companion.feedback.counter_row',
    children: [
      WidgetbookPageStateCard(
        label: 'zero count',
        child: WidgetbookCompanionDeviceFrame(
          child: _feedbackPartPreview(CounterRow(value: 0, onChanged: (_) {})),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'active count',
        child: WidgetbookCompanionDeviceFrame(
          child: _feedbackPartPreview(CounterRow(value: 4, onChanged: (_) {})),
        ),
      ),
    ],
  );
}

Widget _feedbackFormPreview({EventSuccessFeedback? existingFeedback}) {
  return Builder(
    builder: (context) {
      final t = CatchTokens.of(context);
      return WidgetbookFixtureScope(
        overrides: [
          uidProvider.overrideWithValue(
            const AsyncData<String?>(EventSuccessCompanionFixtures.viewerUid),
          ),
        ],
        child: Scaffold(
          backgroundColor: t.bg,
          body: SafeArea(
            child: SingleChildScrollView(
              padding: CatchInsets.content,
              child: IgnorePointer(
                child: EventSuccessFeedbackForm(
                  event: EventSuccessCompanionFixtures.socialEvent,
                  userProfile: EventSuccessCompanionFixtures.viewer,
                  actionState: const EventSuccessFeedbackActionState(),
                  onSubmitFeedback: (_) async {},
                  existingFeedback: existingFeedback,
                ),
              ),
            ),
          ),
        ),
      );
    },
  );
}

Widget _feedbackPartPreview(Widget child) {
  return Builder(
    builder: (context) {
      final t = CatchTokens.of(context);
      return Scaffold(
        backgroundColor: t.bg,
        body: SafeArea(
          child: Padding(
            padding: CatchInsets.content,
            child: IgnorePointer(child: CompanionStageSurface(child: child)),
          ),
        ),
      );
    },
  );
}
