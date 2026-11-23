import 'dart:convert';
import 'dart:typed_data';

import 'package:catch_dating_app/contexts/audience/data/host_roster_file_service.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_access_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_access_view.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_controller.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_import_detach_controller.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_import_screen.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_controller.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

const _programId = 'program-1';
const _blocked = 'Remove this journey from its old party before moving it.';

void main() {
  group('who may detach', () {
    final now = DateTime(2030, 1, 10, 9);

    ProgramAccessView view({
      ProgramActorRole role = ProgramActorRole.staff,
      Map<String, DateTime> duties = const {},
    }) => ProgramAccessView(
      programId: _programId,
      uid: 'planner-1',
      role: role,
      isActive: true,
      activeFrom: DateTime(2030),
      expiresAt: null,
      revision: 1,
      duties: duties,
    );

    Future<bool> canDetach(ProgramAccessView? access) async {
      final container = ProviderContainer(
        overrides: [
          programAccessStateProvider(_programId).overrideWith(
            (ref) => Stream.value(
              ProgramAccessState(
                programId: _programId,
                view: access,
                epoch: 1,
                evaluatedAt: now,
                liveKeys: const {},
                denial: null,
              ),
            ),
          ),
        ],
      );
      addTearDown(container.dispose);
      final subscription = container.listen(
        hostProgrammeImportCanDetachProvider(_programId),
        (_, _) {},
      );
      addTearDown(subscription.close);
      await container.read(programAccessStateProvider(_programId).future);
      return container.read(hostProgrammeImportCanDetachProvider(_programId));
    }

    test(
      'the coordinator and the owner may; guest relations may not',
      () async {
        final later = DateTime(2030, 2);
        expect(
          await canDetach(view(duties: {'programCoordinator': later})),
          isTrue,
        );
        expect(await canDetach(view(role: ProgramActorRole.manager)), isTrue);
        expect(
          await canDetach(view(duties: {'guestRelations': later})),
          isFalse,
        );
        expect(await canDetach(null), isFalse);
      },
    );
  });

  group('guest list check', () {
    testWidgets('a party-blocked row detaches after confirming, then the '
        'list is checked again', (tester) async {
      final functions = _Functions();
      await _pumpScreen(tester, functions, canDetach: true);
      await _check(tester);

      expect(find.text(_blocked), findsOneWidget);
      expect(find.text('Guest name is required.'), findsOneWidget);
      // Only the party-blocked row offers the action.
      expect(find.text('Detach from party'), findsOneWidget);

      await tester.tap(find.text('Detach from party'));
      await pumpFeatureUi(tester);
      expect(find.text('Detach from their party?'), findsOneWidget);
      expect(find.text('Detach from party'), findsNothing);

      await tester.tap(find.text('Keep in party'));
      await pumpFeatureUi(tester);
      expect(find.text('Detach from their party?'), findsNothing);
      expect(functions.detachPayloads, isEmpty);

      await tester.tap(find.text('Detach from party'));
      await pumpFeatureUi(tester);
      await tester.tap(find.text('Detach'));
      await pumpFeatureUi(tester);

      expect(functions.detachPayloads, [
        {'programId': _programId, 'legId': 'leg-1', 'expectedRevision': 4},
      ]);
      expect(functions.previews, 2);
      expect(find.text(_blocked), findsNothing);
      expect(find.text('Detach from their party?'), findsNothing);
    });

    testWidgets('a failed detach shows the error and keeps the question', (
      tester,
    ) async {
      final functions = _Functions()..detachFails = true;
      final container = await _pumpScreen(tester, functions, canDetach: true);
      await _check(tester);
      await tester.tap(find.text('Detach from party'));
      await pumpFeatureUi(tester);
      await tester.tap(find.text('Detach'));
      await pumpFeatureUi(tester);

      expect(functions.detachPayloads, hasLength(1));
      expect(functions.previews, 1);
      expect(find.text('Detach from their party?'), findsOneWidget);
      expect(container.read(catchNoticeControllerProvider).notices, isNotEmpty);
    });

    testWidgets('without the coordinator duty the row only explains', (
      tester,
    ) async {
      final functions = _Functions();
      await _pumpScreen(tester, functions, canDetach: false);
      await _check(tester);
      expect(find.text(_blocked), findsOneWidget);
      expect(find.text('Detach from party'), findsNothing);
    });
  });
}

Future<ProviderContainer> _pumpScreen(
  WidgetTester tester,
  _Functions functions, {
  required bool canDetach,
}) async {
  tester.view.physicalSize = const Size(390, 2400);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  final container = ProviderContainer(
    overrides: [
      firebaseFunctionsProvider.overrideWithValue(functions),
      hostRosterFileServiceProvider.overrideWithValue(_RosterFile()),
      hostProgrammeControllerProvider(
        _programId,
      ).overrideWithValue(const HostProgrammeState.loading()),
      hostProgrammeImportCanDetachProvider(
        _programId,
      ).overrideWithValue(canDetach),
    ],
  );
  addTearDown(container.dispose);
  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: const MaterialApp(
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: HostProgrammeImportScreen(programId: _programId),
      ),
    ),
  );
  await pumpFeatureUi(tester);
  return container;
}

/// Picks the file and runs the check.
Future<void> _check(WidgetTester tester) async {
  await tester.tap(find.text('Pick a file'));
  await pumpFeatureUi(tester);
  await tester.tap(find.text('Check the list'));
  await pumpFeatureUi(tester);
}

class _RosterFile implements HostRosterFileService {
  @override
  Future<PickedHostRosterFile?> pickRosterFile() async => PickedHostRosterFile(
    name: 'guests.csv',
    bytes: Uint8List.fromList(
      utf8.encode('Name,Phone\nRohan Mehta,+919900001111\n,+919900002222\n'),
    ),
  );
}

/// The two callables the screen runs: the guest list check, blocked by a
/// party until the journey is detached, and the detach itself.
class _Functions extends Fake implements FirebaseFunctions {
  bool detachFails = false;
  bool detached = false;
  int previews = 0;
  final detachPayloads = <Object?>[];

  @override
  HttpsCallable httpsCallable(String name, {HttpsCallableOptions? options}) =>
      _Callable((payload) {
        if (name == 'detachProgramTravelLeg') {
          detachPayloads.add(payload);
          if (detachFails) {
            throw FirebaseFunctionsException(
              code: 'aborted',
              message: 'Record changed since you loaded it.',
            );
          }
          detached = true;
          return {'entityId': 'leg-1', 'revision': 5, 'alreadyApplied': false};
        }
        expect(name, 'importProgramManifest');
        previews += 1;
        return {
          'mode': 'preview',
          'totalRows': 2,
          'guestsCreated': 0,
          'guestsUpdated': 1,
          'legsCreated': 0,
          'legsUpdated': 0,
          'householdsCreated': 0,
          'partiesCreated': 0,
          'groupsCreated': 0,
          'rowErrors': [
            if (!detached)
              {
                'index': 0,
                'message': _blocked,
                'partyJourney': {'legId': 'leg-1', 'revision': 4},
              },
            {'index': 1, 'message': 'Guest name is required.'},
          ],
          'alreadyApplied': false,
        };
      });
}

class _Callable extends Fake implements HttpsCallable {
  _Callable(this.respond);

  final Object? Function(Object?) respond;

  @override
  Future<HttpsCallableResult<T>> call<T>([dynamic parameters]) async =>
      _Result(respond(parameters) as T);
}

class _Result<T> extends Fake implements HttpsCallableResult<T> {
  _Result(this.data);

  @override
  final T data;
}
