import 'dart:convert';
import 'dart:io';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_create_journal.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_inventory_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_setup_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/presentation/host_organizer_selection_controller.dart';
import 'package:catch_dating_app/programs/presentation/program_create_controller.dart';
import 'package:catch_dating_app/programs/presentation/program_create_screen.dart';
import 'package:catch_dating_app/programs/presentation/program_create_state.dart';
import 'package:catch_dating_app/programs/presentation/program_events_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../organizers/organizers_test_helpers.dart' show buildOrganizer;
import '../support/catch_test_fonts.dart';
import '../ui_captures/support/capture_device.dart';
import '../ui_captures/support/capture_pump.dart';

const _scope = (accountId: 'account', organizerId: 'organizer');
const _empty = ProgramCreateJournalValues(
  title: '',
  kind: null,
  timezone: '',
  startsAtMillis: null,
  endsAtMillis: null,
);
const _complete = ProgramCreateJournalValues(
  title: 'Wedding weekend',
  kind: 'wedding',
  timezone: 'Asia/Kolkata',
  startsAtMillis: 1791158400000,
  endsAtMillis: 1791417600000,
);

class _Inventory extends Fake implements ProgramInventoryRepository {
  final commands = <(ProgramCreateValues, String)>[];

  @override
  Future<ProgramMutationResult> create({
    required String organizerId,
    required String requestId,
    required String kind,
    required String title,
    required String timezone,
    required DateTime startsAt,
    required DateTime endsAt,
  }) async {
    commands.add((
      ProgramCreateValues(
        title: title,
        kind: ProgramKind.values.byName(kind),
        timezone: timezone,
        startsAt: startsAt,
        endsAt: endsAt,
      ),
      requestId,
    ));
    throw StateError('Synthetic response lost after dispatch');
  }
}

class _Setup extends Fake implements ProgramSetupRepository {}

class _RejectedPreferences extends Fake implements SharedPreferences {
  @override
  String? getString(String key) => null;

  @override
  Future<bool> setString(String key, String value) async => false;
}

Future<(ProviderContainer, ProgramCreateController, _Inventory)> _load({
  ProgramCreateJournalValues? values,
  ProgramCreateJournalValues? submitted,
  String? programId,
  SharedPreferences? preferences,
}) async {
  SharedPreferences.setMockInitialValues({
    if (values != null)
      'program_create_account_organizer': jsonEncode(
        ProgramCreateJournalEntry(
          accountId: _scope.accountId,
          organizerId: _scope.organizerId,
          requestId: 'preserved-request-0001',
          values: values,
          submittedValues: submitted,
          programId: programId,
        ).toJson(),
      ),
  });
  final inventory = _Inventory();
  final container = ProviderContainer(
    retry: (_, _) => null,
    overrides: [
      uidProvider.overrideWithValue(const AsyncData('account')),
      programInventoryRepositoryProvider.overrideWithValue(inventory),
      programSetupRepositoryProvider.overrideWithValue(_Setup()),
      programCreateJournalProvider.overrideWithValue(
        ProgramCreateJournal(preferences: preferences),
      ),
      hostOperableOrganizersProvider('account').overrideWithValue(
        AsyncData<List<Organizer>>([
          buildOrganizer(
            id: 'organizer',
            name: 'Saket Run Club',
            ownerUserId: 'account',
          ),
        ]),
      ),
    ],
  );
  addTearDown(container.dispose);
  final provider = programCreateControllerProvider(_scope);
  container.listen(provider, (_, _) {});
  final controller = await container.read(provider.future);
  return (container, controller, inventory);
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUpAll(loadCatchTestFonts);

  test(
    'a receipt without a submitted body remains locked and confirmation-only',
    () async {
      final (_, controller, inventory) = await _load(
        values: _complete,
        programId: 'saved-id',
      );
      expect(controller.commandPending, isTrue);
      expect(controller.fieldsLocked, isTrue);
      await controller.submit();
      expect(inventory.commands, isEmpty);
      expect(controller.programId, 'saved-id');
    },
  );

  test(
    'a false preference write prevents dispatch and keeps the fresh draft editable',
    () async {
      final (_, controller, inventory) = await _load(
        preferences: _RejectedPreferences(),
      );
      controller.edit(
        ProgramCreateValues(
          title: _complete.title,
          kind: ProgramKind.wedding,
          timezone: _complete.timezone,
          startsAt: DateTime(2026, 10, 5),
          endsAt: DateTime(2026, 10, 8),
        ),
      );
      expect(await controller.submit(), isNull);
      expect(controller.error, isNotNull);
      expect(inventory.commands, isEmpty);
      expect(controller.commandPending, isFalse);
      expect(controller.fieldsLocked, isFalse);
      expect(controller.values.title, _complete.title);
    },
  );

  test(
    'account and organizer provider fences prevent stale-scope dispatch',
    () async {
      final (container, controller, inventory) = await _load();
      await expectLater(
        container.read(
          programCreateControllerProvider((
            accountId: 'other-account',
            organizerId: 'organizer',
          )).future,
        ),
        throwsA(isA<ProgramActorChangedException>()),
      );
      container
          .read(hostOrganizerSelectionProvider('account').notifier)
          .select('other-organizer');
      expect(await controller.submit(), isNull);
      expect(controller.actorChanged, isTrue);
      expect(inventory.commands, isEmpty);
    },
  );

  test(
    'legacy empty command recovery preserves a populated editable draft',
    () async {
      final (_, controller, inventory) = await _load(
        values: _complete,
        submitted: _empty,
      );
      expect(controller.values.title, _complete.title);
      expect(controller.values.kind, ProgramKind.wedding);
      expect(controller.values.timezone, _complete.timezone);
      expect(controller.values.startsAt, DateTime(2026, 10, 5));
      expect(controller.fieldsLocked, isFalse);
      expect(controller.requestId, 'preserved-request-0001');
      expect(inventory.commands, isEmpty);
    },
  );

  for (final recoveredEmpty in [false, true]) {
    testWidgets(
      'production provider form accepts title recoveredEmpty=$recoveredEmpty',
      (tester) async {
        final (container, controller, inventory) = await _load(
          values: recoveredEmpty ? _empty : null,
          submitted: recoveredEmpty ? _empty : null,
        );
        await captureCatchWidget(
          tester,
          id: recoveredEmpty
              ? 'program-create-recovered-empty'
              : 'program-create-fresh',
          outputDirectory: Directory('build/reports/program-create-regression'),
          device: CaptureDevice.iphone17Pro,
          builder: (_) => UncontrolledProviderScope(
            container: container,
            child: const ProgramCreateScreen(organizerId: 'organizer'),
          ),
          drive: (tester) async {
            expect(controller.fieldsLocked, isFalse);
            expect(find.text('Retry and confirm program'), findsNothing);
            expect(
              find.text('Something went wrong. Please try again.'),
              findsNothing,
            );
            final title = find.descendant(
              of: find.byKey(const ValueKey('program-create-title')),
              matching: find.byType(TextField),
            );
            await tester.enterText(title, 'Saket weekend');
            await tester.pump();
            expect(controller.values.title, 'Saket weekend');
            expect(inventory.commands, isEmpty);
            expect(tester.takeException(), isNull);
          },
        );
      },
    );
  }

  test(
    'partially empty submitted command is retained conservatively',
    () async {
      final (_, controller, inventory) = await _load(
        values: _complete,
        submitted: const ProgramCreateJournalValues(
          title: ' ',
          kind: null,
          timezone: '',
          startsAtMillis: null,
          endsAtMillis: null,
        ),
      );
      expect(controller.commandPending, isTrue);
      expect(controller.fieldsLocked, isTrue);
      expect(controller.requestId, 'preserved-request-0001');
      expect(inventory.commands, isEmpty);
    },
  );

  test(
    'fresh provider keeps absence of submitted command and title editable',
    () async {
      final (_, controller, inventory) = await _load();
      expect(controller.commandPending, isFalse);
      expect(controller.fieldsLocked, isFalse);
      controller.edit(controller.values.copyWith(title: 'Saket weekend'));
      expect(controller.values.title, 'Saket weekend');
      expect(await controller.submit(), isNull);
      expect(controller.showErrors, isTrue);
      expect(controller.commandPending, isFalse);
      expect(inventory.commands, isEmpty);
    },
  );

  test(
    'partial persisted draft reopens with blank timezone and same key',
    () async {
      final (_, controller, _) = await _load(
        values: const ProgramCreateJournalValues(
          title: 'Saket weekend',
          kind: null,
          timezone: '',
          startsAtMillis: null,
          endsAtMillis: null,
        ),
      );
      expect(controller.requestId, 'preserved-request-0001');
      expect(controller.values.title, 'Saket weekend');
      expect(controller.commandPending, isFalse);
      expect(controller.fieldsLocked, isFalse);
    },
  );

  test(
    'exact legacy empty command is editable without dispatch or journal deletion',
    () async {
      final (_, controller, inventory) = await _load(
        values: _empty,
        submitted: _empty,
      );
      expect(controller.requestId, 'preserved-request-0001');
      expect(controller.commandPending, isFalse);
      expect(controller.fieldsLocked, isFalse);
      expect(await controller.submit(), isNull);
      expect(inventory.commands, isEmpty);
      final preserved = await const ProgramCreateJournal().load(
        accountId: _scope.accountId,
        organizerId: _scope.organizerId,
      );
      expect(preserved!.requestId, controller.requestId);
      expect(preserved.submittedValues, isNotNull);
    },
  );

  test(
    'real recovered command stays locked and retries exact submitted body and key',
    () async {
      final (_, controller, inventory) = await _load(
        values: _complete,
        submitted: _complete,
      );
      expect(controller.commandPending, isTrue);
      expect(controller.fieldsLocked, isTrue);
      controller.edit(controller.values.copyWith(title: 'Replacement'));
      await controller.submit();
      await controller.submit();
      expect(inventory.commands, hasLength(2));
      expect(
        inventory.commands.map((command) => command.$1.title),
        everyElement(_complete.title),
      );
      expect(
        inventory.commands.map((command) => command.$2),
        everyElement('preserved-request-0001'),
      );
      expect(controller.fieldsLocked, isTrue);
    },
  );

  test(
    'receipt prevents empty-command recovery from unlocking a known saved ID',
    () async {
      final (_, controller, inventory) = await _load(
        values: _empty,
        submitted: _empty,
        programId: 'saved-id',
      );
      expect(controller.programId, 'saved-id');
      expect(controller.fieldsLocked, isTrue);
      await controller.submit();
      expect(inventory.commands, isEmpty);
      expect(controller.programId, 'saved-id');
    },
  );
}
