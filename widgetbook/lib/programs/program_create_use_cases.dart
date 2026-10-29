import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/programs/presentation/program_create_controller.dart';
import 'package:catch_dating_app/programs/presentation/program_create_screen.dart';
import 'package:catch_dating_app/programs/presentation/program_create_state.dart';
import 'package:catch_dating_app/programs/presentation/program_events_row.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../support/page_preview.dart';
import '../utility/preview.dart';

@widgetbook.UseCase(
  name: 'Route loading',
  type: ProgramCreateScreen,
  path: '[P1 product surfaces]/Program workspace',
)
Widget programCreateScreenStates(BuildContext context) =>
    WidgetbookPageCatalogFrame(
      title: 'ProgramCreateScreen',
      contractId: 'screen.programs.create',
      children: [
        WidgetbookPageStateCard(
          label: 'account loading',
          child: WidgetbookUtilityDeviceFrame(
            child: ProviderScope(
              overrides: [
                uidProvider.overrideWithValue(const AsyncLoading<String?>()),
              ],
              child: const ProgramCreateScreen(organizerId: 'org'),
            ),
          ),
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'Form states',
  type: ProgramCreatePageBody,
  path: '[P1 product surfaces]/Program workspace',
)
Widget programCreateFormStates(BuildContext context) =>
    WidgetbookPageCatalogFrame(
      title: 'ProgramCreatePageBody',
      contractId: 'screen.programs.create',
      children: [
        for (final state in ['draft', 'validation', 'pending', 'failure'])
          WidgetbookPageStateCard(
            label: state,
            child: WidgetbookUtilityDeviceFrame(
              child: _ProgramFormFixture(state: state),
            ),
          ),
      ],
    );

@widgetbook.UseCase(
  name: 'Inventory row',
  type: ProgramEventsRow,
  path: '[P1 product surfaces]/Program workspace',
)
Widget programEventsRowStates(BuildContext context) =>
    WidgetbookPageCatalogFrame(
      title: 'ProgramEventsRow',
      contractId: 'screen.host.events',
      children: [
        for (final state in [
          (
            label: 'creator draft',
            creator: true,
            status: 'draft',
            pending: false,
            deadline: null,
            anonymizedAt: null,
          ),
          (
            label: 'organizer manager setup',
            creator: false,
            status: 'draft',
            pending: false,
            deadline: null,
            anonymizedAt: null,
          ),
          (
            label: 'program admin setup',
            creator: false,
            status: 'draft',
            pending: false,
            deadline: null,
            anonymizedAt: null,
          ),
          (
            label: 'creator pending',
            creator: true,
            status: 'draft',
            pending: true,
            deadline: null,
            anonymizedAt: null,
          ),
          (
            label: 'creator restore',
            creator: true,
            status: 'archived',
            pending: false,
            deadline: DateTime(2026, 10, 19),
            anonymizedAt: null,
          ),
          (
            label: 'restore window expired',
            creator: true,
            status: 'archived',
            pending: false,
            deadline: DateTime(2026, 10, 4),
            anonymizedAt: null,
          ),
          (
            label: 'anonymized archive',
            creator: true,
            status: 'archived',
            pending: false,
            deadline: DateTime(2026, 10, 4),
            anonymizedAt: DateTime(2026, 10, 4),
          ),
        ])
          WidgetbookPageStateCard(
            label: state.label,
            child: ProgramEventsRow(
              program: OrganizerProgramListRow(
                programId: 'program',
                title: 'Kapoor–Shah Wedding',
                kind: 'wedding',
                status: state.status,
                timezone: 'Asia/Kolkata',
                revision: 1,
                startsAt: DateTime(2026, 10, 5),
                endsAt: DateTime(2026, 10, 8),
                functionCount: 3,
                canArchive: state.creator && state.status != 'archived',
                canUnarchive: state.creator && state.status == 'archived',
                anonymizeAt: state.deadline,
                anonymizedAt: state.anonymizedAt,
              ),
              now: DateTime(2026, 10, 5),
              pending: state.pending,
              onOpen: () {},
              onLifecycle: (_) {},
            ),
          ),
      ],
    );

class _ProgramFormFixture extends StatefulWidget {
  const _ProgramFormFixture({required this.state});
  final String state;
  @override
  State<_ProgramFormFixture> createState() => _ProgramFormFixtureState();
}

class _ProgramFormFixtureState extends State<_ProgramFormFixture> {
  late final ProgramCreateController controller;
  @override
  void initState() {
    super.initState();
    final valid = widget.state == 'pending' || widget.state == 'failure';
    controller = ProgramCreateController(
      organizerId: 'org',
      requestId: 'preview-only-request',
      isActorCurrent: () => true,
      initialValues: valid
          ? ProgramCreateValues(
              title: 'Kapoor–Shah Wedding',
              kind: ProgramKind.wedding,
              timezone: 'Asia/Kolkata',
              startsAt: DateTime(2026, 10, 5),
              endsAt: DateTime(2026, 10, 8),
            )
          : const ProgramCreateValues(),
      create: (_, _) => widget.state == 'pending'
          ? Completer<ProgramMutationResult>().future
          : Future.error(StateError('Connection interrupted. Please retry.')),
      readSaved: (_) => Future.error(StateError('No persistence in a preview')),
      refreshPrograms: (_) async => [],
    );
    if (widget.state != 'draft') unawaited(controller.submit());
  }

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => CatchScaffold.stepFlow(
    body: ProgramCreatePageBody(
      organizerName: 'Kapoor Family',
      controller: controller,
      onSaved: (_) {},
    ),
  );
}
