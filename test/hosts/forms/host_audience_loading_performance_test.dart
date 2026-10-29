// The fixture's ProviderScope deliberately supplies scoped auth/organizer doubles.
// ignore_for_file: riverpod_lint/scoped_providers_should_specify_dependencies

import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_saved_audience_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_query.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_crm_summary.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience.dart';
import 'package:catch_dating_app/contexts/forms/data/host_forms_repository.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_summary.dart';
import 'package:catch_dating_app/contexts/organizers/data/clubs_repository.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_screen.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_screen.dart';
import 'package:catch_dating_app/hosts/presentation/host_audience_view.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../clubs/clubs_test_helpers.dart';
import '../../test_pump_helpers.dart';

void main() {
  setUp(() => AppConfig.configureEntrypointRole(AppRole.host));
  tearDown(AppConfig.resetEntrypointRoleOverrideForTesting);

  for (final formsFail in [false, true]) {
    testWidgets(
      'Responses renders independently when Forms ${formsFail ? 'fails' : 'is pending'}',
      (tester) async {
        final repository = _Forms();
        await tester.pumpWidget(_app(repository));
        await tester.pump();
        await tester.pump();
        // The responses read must begin without resolving the unrelated forms
        // read. Both still use their canonical manager-authorized repositories.
        expect(repository.responseRequests, greaterThan(0));
        if (formsFail) {
          repository.forms.completeError(StateError('Forms unavailable'));
        }
        await tester.pump();
        await pumpFeatureUiFor(tester, const Duration(milliseconds: 400));
        expect(find.text('No responses yet'), findsWidgets);
        expect(tester.takeException(), isNull);
        if (!formsFail) {
          repository.forms.complete(
            const HostFormPage(
              organizerId: 'forms-club',
              items: [],
              nextCursor: null,
            ),
          );
        }
        await tester.pump();
      },
    );
  }

  testWidgets('Forms error retry repeats the account-authorized read', (
    tester,
  ) async {
    final repository = _Forms();
    await tester.pumpWidget(_app(repository, initialResponses: false));
    await tester.pump();
    await tester.pump();
    repository.forms.completeError(StateError('Forms unavailable'));
    await tester.pump();
    await pumpFeatureUiFor(tester, const Duration(milliseconds: 400));
    await tester.pump();
    expect(find.text('Reload forms'), findsWidgets);
    final beforeRetry = repository.formRequests;
    repository.forms = Completer<HostFormPage>();
    await tester.tap(find.text('Reload forms'));
    await tester.pump();
    expect(repository.formRequests, greaterThan(beforeRetry));
    repository.forms.complete(
      const HostFormPage(
        organizerId: 'forms-club',
        items: [],
        nextCursor: null,
      ),
    );
    await tester.pump();
    await pumpFeatureUiFor(tester, const Duration(milliseconds: 400));
    expect(find.text('Reload forms'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Groups does not start hidden People directory or count reads', (
    tester,
  ) async {
    final contacts = _Contacts();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          firebaseAuthProvider.overrideWithValue(_Auth()),
          uidProvider.overrideWithValue(const AsyncData<String?>('host-1')),
          hostOperableClubsProvider('host-1').overrideWithValue(
            AsyncData([buildClub(id: 'forms-club', ownerUserId: 'host-1')]),
          ),
          hostContactsRepositoryProvider.overrideWithValue(contacts),
          hostAllSavedAudiencesProvider('forms-club').overrideWithValue(
            const AsyncData(
              HostSavedAudiencePage(audiences: [], nextCursor: null),
            ),
          ),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: const HostCustomersScreen(
            initialView: HostAudienceView.audiences,
          ),
        ),
      ),
    );
    await tester.pump();
    await pumpFeatureUiFor(tester, const Duration(milliseconds: 400));
    expect(find.text('Groups'), findsWidgets);
    expect(contacts.requests, 0);
    expect(tester.takeException(), isNull);
  });
}

class _Auth extends Fake implements FirebaseAuth {
  @override
  User get currentUser => _User();
}

class _User extends Fake implements User {
  @override
  String get uid => 'host-1';
}

class _Functions extends Fake implements FirebaseFunctions {}

class _Forms extends HostFormsRepository {
  _Forms() : super(_Functions());
  var forms = Completer<HostFormPage>();
  int formRequests = 0;
  int responseRequests = 0;
  @override
  Future<HostFormPage> listForms(HostFormListRequest request) {
    formRequests++;
    return forms.future;
  }

  @override
  Future<HostFormResponsePage> listResponses(
    HostFormResponseListRequest request,
  ) async {
    responseRequests++;
    return const HostFormResponsePage(
      organizerId: 'forms-club',
      items: [],
      nextCursor: null,
    );
  }
}

Widget _app(_Forms repository, {bool initialResponses = true}) => ProviderScope(
  overrides: [
    firebaseAuthProvider.overrideWithValue(_Auth()),
    uidProvider.overrideWithValue(const AsyncData<String?>('host-1')),
    hostOperableClubsProvider('host-1').overrideWithValue(
      AsyncData([buildClub(id: 'forms-club', ownerUserId: 'host-1')]),
    ),
    hostFormsRepositoryProvider.overrideWithValue(repository),
  ],
  child: MaterialApp(
    theme: AppTheme.light,
    home: HostFormsScreen(initialResponses: initialResponses),
  ),
);

class _Contacts extends Fake implements HostContactsRepository {
  int requests = 0;
  @override
  Future<HostAudiencePage> listContacts(
    String organizerId, {
    HostAudienceQuery query = const HostAudienceQuery(),
    int limit = 30,
  }) async {
    requests++;
    throw StateError('Unexpected hidden People read');
  }

  @override
  Future<HostCrmSummary> getSummary(String organizerId) async {
    requests++;
    throw StateError('Unexpected hidden People summary');
  }
}
