import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/live/data/event_assignment_feature_choice_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assignment_feature_choice.dart';
import 'package:catch_dating_app/event_success/presentation/event_assignment_feature_choices_page_body.dart';
import 'package:catch_dating_app/event_success/presentation/event_assignment_feature_sheet.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

const _path = '[P1 product surfaces]/Event Success/Answer matching consent';
const _eventId = 'event-1';

@widgetbook.UseCase(
  name: 'Participant answer permission sheet',
  type: EventAssignmentFeatureSheet,
  path: _path,
)
Widget eventAssignmentFeatureSheet(BuildContext context) =>
    const _Preview(bodyOnly: false);

@widgetbook.UseCase(
  name: 'Own answer and withdrawal controls',
  type: EventAssignmentFeatureChoicesPageBody,
  path: _path,
)
Widget eventAssignmentFeatureChoicesPageBody(BuildContext context) =>
    const _Preview(bodyOnly: true);

class _Preview extends StatefulWidget {
  const _Preview({required this.bodyOnly});
  final bool bodyOnly;
  @override
  State<_Preview> createState() => _PreviewState();
}

class _PreviewState extends State<_Preview> {
  final _store = _PreviewStore();

  @override
  Widget build(BuildContext context) => ProviderScope(
    overrides: [
      uidProvider.overrideWith((ref) => Stream.value('runner-1')),
      eventAssignmentFeatureChoiceStoreProvider.overrideWithValue(_store),
    ],
    child: Scaffold(
      body: widget.bodyOnly
          ? Consumer(builder: (context, ref, _) {
              final session = ref.watch(authenticatedSessionProvider)
                  .asData?.value;
              if (session == null) return const CatchLoadingIndicator();
              return SingleChildScrollView(
                child: CatchPageBody(
                  child: EventAssignmentFeatureChoicesPageBody(
                    key: ValueKey(session),
                    eventId: _eventId,
                    session: session,
                  ),
                ),
              );
            })
          : const Align(
              alignment: Alignment.bottomCenter,
              child: EventAssignmentFeatureSheet(eventId: _eventId),
            ),
    ),
  );
}

class _PreviewStore implements EventAssignmentFeatureChoiceStore {
  bool _granted = false;
  @override
  Future<EventAssignmentFeatureChoices> list(String eventId) async =>
      EventAssignmentFeatureChoices(eventId, [
        EventAssignmentFeatureChoice(
          featureId: 'pace',
          responseId: 'response-1',
          questionLabel: 'Which pace feels comfortable?',
          answerLabel: 'Easy conversational pace',
          status: _granted
              ? EventAssignmentFeatureChoiceStatus.granted
              : EventAssignmentFeatureChoiceStatus.notGranted,
          revision: _granted ? 1 : 0,
          canGrant: true,
        ),
      ]);

  @override
  Future<void> decide({
    required String eventId,
    required EventAssignmentFeatureChoice choice,
    required bool grant,
    required String requestId,
  }) async {
    _granted = grant;
  }
}
