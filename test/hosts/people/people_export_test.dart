import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_query.dart';
import 'package:catch_dating_app/hosts/people/people_screen.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/device/external_share.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_overlay.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:share_plus/share_plus.dart' show ShareParams;

import 'people_captures.dart';
import 'people_fixtures.dart';

/// Export on People: the old Customers screen's audience export, carried
/// onto the redesigned People tab.
void main() {
  Future<_Probe> pump(
    WidgetTester tester, {
    Object? failure,
    Size size = const Size(390, 1240),
  }) async {
    tester.view.physicalSize = size;
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    final probe = _Probe(failure: failure);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          ...hostPeopleCaptureOverrides(),
          hostCustomersControllerProvider.overrideWithValue(probe.customers),
          externalShareControllerProvider.overrideWithValue(
            ExternalShareController(probe.share),
          ),
        ],
        child: MaterialApp(
          theme: CatchTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          builder: (context, child) =>
              CatchNoticeOverlay(child: child ?? const SizedBox.shrink()),
          home: const HostPeopleScreen(),
        ),
      ),
    );
    await pumpFeatureUi(tester);
    return probe;
  }

  testWidgets('Export shares this list as a CSV with how many it holds', (
    tester,
  ) async {
    final probe = await pump(tester);
    await tester.tap(find.byKey(const ValueKey<String>('host-people-export')));
    await pumpFeatureUi(tester);

    expect(probe.customers.organizerIds, [peopleOrganizer.id]);
    expect(probe.customers.queries.single.search, isNull);
    final shared = probe.shared.single;
    expect(shared.subject, 'Catch audience export');
    expect(shared.text, '42 organizer contacts.');
    expect(shared.fileNameOverrides, ['audience.csv']);
  });

  testWidgets('a truncated export says it reached the limit', (tester) async {
    final probe = await pump(tester);
    probe.customers.truncated = true;
    await tester.tap(find.byKey(const ValueKey<String>('host-people-export')));
    await pumpFeatureUi(tester);
    expect(
      probe.shared.single.text,
      'This export reached the 2,500-contact safety limit.',
    );
  });

  testWidgets('a failed export says so and Export works again', (tester) async {
    final probe = await pump(tester, failure: StateError('export failed'));
    await tester.tap(find.byKey(const ValueKey<String>('host-people-export')));
    await pumpFeatureUi(tester);
    expect(probe.shared, isEmpty);
    expect(find.byType(CatchNotice), findsWidgets);
    final action = tester.widget<CatchIconAction>(
      find.byKey(const ValueKey<String>('host-people-export')),
    );
    expect(action.onPressed, isNotNull);
  });

  testWidgets('wide windows export from the list header', (tester) async {
    final probe = await pump(tester, size: hostPeopleDesktopSize);
    await tester.tap(find.byKey(const ValueKey<String>('host-people-export')));
    await pumpFeatureUi(tester);
    expect(probe.customers.organizerIds, [peopleOrganizer.id]);
    expect(probe.shared, hasLength(1));
  });
}

class _Probe {
  _Probe({Object? failure}) : customers = _Customers(failure: failure);

  final _Customers customers;
  final shared = <ShareParams>[];

  Future<void> share(ShareParams params) async => shared.add(params);
}

class _Customers extends Fake implements HostCustomersController {
  _Customers({this.failure});

  final Object? failure;
  bool truncated = false;
  final organizerIds = <String>[];
  final queries = <HostAudienceQuery>[];

  @override
  Future<HostAudienceExport> exportCustomers({
    required String organizerId,
    HostAudienceSegment? segment,
    HostAudienceQuery query = const HostAudienceQuery(),
  }) async {
    organizerIds.add(organizerId);
    queries.add(query);
    if (failure case final error?) throw error;
    return HostAudienceExport(
      fileName: 'audience.csv',
      csv: 'name\nRhea Kapoor\n',
      rowCount: 42,
      truncated: truncated,
    );
  }
}
