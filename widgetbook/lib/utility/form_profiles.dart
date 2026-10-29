import 'package:catch_dating_app/contexts/profiles/domain/form_profile.dart';
import 'package:catch_dating_app/user_profile/presentation/form_profiles_controller.dart';
import 'package:catch_dating_app/user_profile/presentation/form_profiles_screen.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import '../support/widgetbook_harness.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Organizer-scoped cards and unclaimed submissions',
  type: FormProfilesScreen,
  path: '[P3 utility surfaces]/Form profiles',
)
Widget formProfilesScreenPreview(BuildContext context) =>
    WidgetbookUtilityDeviceFrame(
      child: WidgetbookFixtureScope(
        overrides: [formProfilesControllerProvider.overrideWith(_Forms.new)],
        child: const FormProfilesScreen(),
      ),
    );

@widgetbook.UseCase(
  name: 'Account-owned form directory',
  type: FormProfilesAsyncBoundary,
  path: '[P3 utility surfaces]/Form profiles',
)
Widget formProfilesContentPreview(BuildContext context) =>
    WidgetbookUtilityDeviceFrame(
      child: WidgetbookFixtureScope(
        overrides: [formProfilesControllerProvider.overrideWith(_Forms.new)],
        child: CatchRouteScaffold(
          topBarBuilder: (_, _) =>
              const CatchTopBar.route(title: 'Forms & cards'),
          body: const CatchRouteBody.standardConstrained(
            child: FormProfilesAsyncBoundary(),
          ),
        ),
      ),
    );

@widgetbook.UseCase(
  name: 'Private cards grouped by organizer',
  type: FormProfilesSectionList,
  path: '[P3 utility surfaces]/Form profiles',
)
Widget formProfilesListPreview(BuildContext context) =>
    WidgetbookUtilityDeviceFrame(
      child: CatchRouteScaffold(
        topBarBuilder: (_, _) =>
            const CatchTopBar.route(title: 'Forms & cards'),
        body: CatchRouteBody.standardConstrained(
          child: FormProfilesSectionList(
            state: _state(),
            onOpen: (_) {},
            onLoadMore: () {},
          ),
        ),
      ),
    );

class _Forms extends FormProfilesController {
  @override
  Future<FormProfilesState> build() async => _state();
}

FormProfilesState _state() => FormProfilesState(
  page: FormProfilePage(
    items: [
      FormProfileSummary(
        responseId: 'rsvp-claimed',
        organizerId: 'rsvp',
        formTitle: 'Your community introduction',
        organizerName: 'RSVP Demo',
        submittedAt: DateTime(2026, 9, 20),
        claimedAt: DateTime(2026, 9, 21),
        cardFieldCount: 3,
      ),
      FormProfileSummary(
        responseId: 'rsvp-new',
        organizerId: 'rsvp',
        formTitle: 'Weekend escape',
        organizerName: 'RSVP Demo',
        submittedAt: DateTime(2026, 9, 23),
        claimedAt: null,
        cardFieldCount: 0,
      ),
      FormProfileSummary(
        responseId: 'coffee',
        organizerId: 'coffee',
        formTitle: 'Coffee & conversation',
        organizerName: 'Coffee Club Demo',
        submittedAt: DateTime(2026, 9, 22),
        claimedAt: DateTime(2026, 9, 22),
        cardFieldCount: 1,
      ),
    ],
    nextCursor: null,
  ),
);
