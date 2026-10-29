import 'package:catch_dating_app/contexts/programmes/data/program_lodging_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_lodging_board.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_lodging_review.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_lodging_setup.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/programs/presentation/program_lodging_controller.dart';
import 'package:catch_dating_app/programs/presentation/program_lodging_layout.dart';
import 'package:catch_dating_app/programs/presentation/program_lodging_screen.dart';
import 'package:catch_dating_app/programs/presentation/program_lodging_setup_page_body.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import 'program_lodging_fixtures.dart';

const _path = '[P1 product surfaces]/Programs/Hotel lodging';

ProgramLodgingSetup _setup() => ProgramLodgingSetup(
  accessExpiresAt: DateTime.utc(2100),
  catalog: ProgramLodgingCatalog.fromMap(
    lodgingSetupCatalogJson(),
    programId: 'program',
  ),
  configuration: lodgingSetupConfigurationJson(),
);

ProgramLodgingReview _review() =>
    ProgramLodgingReview.fromCallableData(lodgingReviewJson());

@widgetbook.UseCase(
  name: 'Read-only populated private route',
  type: ProgramLodgingScreen,
  path: _path,
)
Widget lodgingScreen(BuildContext context) => ProviderScope(
  overrides: [
    programLodgingControllerProvider(
      'program',
    ).overrideWith(_CatalogController.new),
  ],
  child: const ProgramLodgingScreen(programId: 'program'),
);

class _CatalogController extends ProgramLodgingController {
  @override
  Future<ProgramLodgingView> build(String programId) async =>
      ProgramLodgingView(setup: _setup(), review: _review(), busy: true);
}

@widgetbook.UseCase(
  name: 'Party and dated room list',
  type: ProgramLodgingLayout,
  path: _path,
)
Widget lodgingLayout(BuildContext context) {
  final review = _review();
  final l10n = context.l10n;
  return SingleChildScrollView(
    child: ProgramLodgingLayout(
      proposalId: review.proposal.id,
      units: review.units,
      parties: review.parties,
      copy: ProgramLodgingBoardCopy(
        parties: l10n.programsLodgingParties,
        rooms: l10n.programsRoomsTitle,
        list: l10n.programsLodgingList,
        map: l10n.programsLodgingMap,
        move: l10n.programsLodgingMove,
        locked: l10n.programsLodgingLocked,
        provisional: l10n.programsLodgingProvisional,
        empty: l10n.programsLodgingEmpty,
      ),
    ),
  );
}

@widgetbook.UseCase(
  name: 'Layered 2D floor',
  type: ProgramLodgingFloorLayout,
  path: _path,
)
Widget lodgingFloorLayout(BuildContext context) {
  final units = _review().units;
  return ProgramLodgingFloorLayout(
    units: units,
    tiles: {
      for (final unit in units)
        unit.inventoryId: CatchButton(
          label: unit.layoutUnit.label,
          onPressed: null,
        ),
    },
  );
}

@widgetbook.UseCase(
  name: 'Verified setup editing',
  type: ProgramLodgingSetupPageBody,
  path: _path,
)
Widget lodgingSetup(BuildContext context) {
  final setup = _setup();
  return SingleChildScrollView(
    child: ProgramLodgingSetupPageBody(
      initial: ProgramLodgingDraft(
        catalog: setup.catalog!,
        configuration: setup.configuration,
      ),
      resolveDates: (_, _) async => (
        startsAtMillis: DateTime.utc(2026, 10, 1, 12).millisecondsSinceEpoch,
        endsAtMillis: DateTime.utc(2026, 10, 3, 12).millisecondsSinceEpoch,
      ),
      onSave: (_, _) async {},
      onCancel: () {},
    ),
  );
}

@widgetbook.UseCase(
  name: 'Private route chrome',
  type: ProgramLodgingScaffold,
  path: _path,
)
Widget lodgingScaffold(BuildContext context) => ProgramLodgingScaffold(
  body: CatchEmptyState(
    icon: CatchIcons.hotel,
    message: 'Synthetic lodging preview',
    variant: CatchEmptyStateVariant.inline,
  ),
);

@widgetbook.UseCase(
  name: 'Expired authority',
  type: ProgramLodgingExpiredPageBody,
  path: _path,
)
Widget lodgingExpired(BuildContext context) =>
    ProgramLodgingExpiredPageBody(busy: false, onRefresh: () {});

@widgetbook.UseCase(
  name: 'Social membership review before configuration',
  type: ProgramLodgingMembershipPageBody,
  path: _path,
)
Widget lodgingMembership(BuildContext context) {
  final setup = _setup();
  return ProviderScope(
    child: ProgramLodgingMembershipPageBody(
      setup: setup,
      view: ProgramLodgingView(setup: setup),
      membership: null,
      selectedGroups: const {},
      onChooseGuest: (_) {},
      onGroupsChanged: (_) {},
      onSave: () {},
      onCancel: () {},
      onRefresh: () {},
    ),
  );
}
