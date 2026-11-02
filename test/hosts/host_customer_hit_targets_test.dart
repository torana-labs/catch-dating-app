import 'dart:async';

import 'package:catch_dating_app/app.dart';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/account/data/force_update_provider.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_communication_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_whatsapp_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact_detail.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_query.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_crm_summary.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_customer_memory.dart';
import 'package:catch_dating_app/contexts/connections/data/match_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/profile_location_initializer.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customer_detail_screen.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customer_detail_tab_bar.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customer_loading_state.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customer_outreach_sheet.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_screen.dart';
import 'package:catch_dating_app/hosts/presentation/host_audience_view.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_dating_app/platform/analytics/app_analytics.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_dating_app/platform/device/connectivity_service.dart';
import 'package:catch_dating_app/platform/errors/error_logger.dart';
import 'package:catch_dating_app/platform/firebase/read_limit_policy.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_dating_app/routing/shell/app_shell.dart';
import 'package:catch_dating_app/routing/shell/host_app_shell.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/date_symbol_data_local.dart';

import '../organizers/organizers_test_helpers.dart';
import '../support/catch_test_fonts.dart';
import '../test_pump_helpers.dart';

part 'host_customer_hit_targets_test_support.dart';

void main() {
  setUpAll(() async {
    await loadCatchTestFonts();
    await initializeDateFormatting('en');
  });
  setUp(() => AppConfig.configureEntrypointRole(AppRole.host));
  tearDown(AppConfig.resetEntrypointRoleOverrideForTesting);

  for (final width in [390.0, 800.0, 1600.0]) {
    for (final scale in [1.0, 2.0]) {
      testWidgets('full Host CRM pointer targets at ${width}x1000 / ${scale}x', (
        tester,
      ) async {
        final harness = await _pumpCrm(tester, width: width, scale: scale);
        expect(find.byType(HostAppShell), findsOneWidget);
        expect(find.byType(HostCustomersScreen), findsOneWidget);
        await _openDetailMenu(tester);
        // Select a real, non-destructive command; do not substitute its callback.
        await tester.tap(find.text(_copy.hostCustomersLogOutreach));
        await pumpFeatureUi(tester);
        expect(find.byType(HostCustomerOutreachSheet), findsOneWidget);
        await tester.sendKeyEvent(LogicalKeyboardKey.escape);
        await pumpFeatureUi(tester);
        expect(find.byType(HostCustomerOutreachSheet), findsNothing);
        expect(
          harness.router.state.uri.queryParameters['contactId'],
          'person-0',
        );

        if (width < 1600) {
          // Compact and medium workspaces intentionally show only the selected
          // pane. Reenter the actual index route to exercise its own header.
          harness.router.go(_peopleLocation(selected: false));
          await pumpFeatureUi(tester);
        }
        await _openIndexMenu(tester);
        await _dismissPointerMenu(tester, _copy.hostCustomersReviewDuplicates);
        expect(tester.takeException(), isNull);
      });
    }
  }

  for (final scale in [1.0, 2.0]) {
    testWidgets(
      'real panes scroll independently through status changes at ${scale}x',
      (tester) async {
        final harness = await _pumpCrm(tester, scale: scale);
        await _showNotes(tester);
        final indexScroll = verticalScroll(
          const PageStorageKey<String>('host-customers-people'),
        );
        final detailScroll = findVerticalScrollable(within: _detail);
        final index = tester.state<ScrollableState>(indexScroll).position;
        final detail = tester.state<ScrollableState>(detailScroll).position;
        expect(index.maxScrollExtent, greaterThan(300));
        expect(detail.maxScrollExtent, greaterThan(300));
        final detailStart = detail.pixels;
        await tester.drag(indexScroll, const Offset(0, -300));
        await pumpFeatureUi(tester);
        expect(index.pixels, greaterThan(0));
        expect(detail.pixels, detailStart);
        final indexAfterDrag = index.pixels;
        await tester.drag(detailScroll, const Offset(0, -300));
        await pumpFeatureUi(tester);
        expect(detail.pixels, greaterThan(detailStart));
        expect(index.pixels, indexAfterDrag);
        final detailAfterDrag = detail.pixels;
        final onlineBodyTop = tester.getTopLeft(detailScroll).dy;
        final selectedState = tester.state(_detail);

        harness.connectivity.add([ConnectivityResult.none]);
        await pumpFeatureUi(tester);
        expect(_offline, findsWidgets);
        expect(tester.getTopLeft(detailScroll).dy, greaterThan(onlineBodyTop));
        expect(tester.state(_detail), same(selectedState));
        expect(index.pixels, indexAfterDrag);
        expect(detail.pixels, detailAfterDrag);
        _expectHeaderBounds(tester);
        await _openDetailMenu(tester);
        await _dismissPointerMenu(tester, _copy.hostCustomersLogOutreach);
        await _openIndexMenu(tester);
        await _dismissPointerMenu(tester, _copy.hostCustomersReviewDuplicates);

        harness.connectivity.add([ConnectivityResult.wifi]);
        await pumpFeatureUi(tester);
        expect(_offline, findsNothing);
        expect(
          tester.getTopLeft(detailScroll).dy,
          closeTo(onlineBodyTop, 0.01),
        );
        expect(index.pixels, indexAfterDrag);
        expect(detail.pixels, detailAfterDrag);
        await _openDetailMenu(tester);
        await _dismissPointerMenu(tester, _copy.hostCustomersLogOutreach);
        expect(tester.takeException(), isNull);
      },
    );

    for (final key in [LogicalKeyboardKey.enter, LogicalKeyboardKey.space]) {
      testWidgets('Tab and ${key.keyLabel} operate CRM menu at ${scale}x', (
        tester,
      ) async {
        await _pumpCrm(tester, scale: scale);
        await _tabTo(tester, _detailMenu);
        final triggerFocus = FocusManager.instance.primaryFocus;
        await tester.sendKeyEvent(key);
        await pumpFeatureUi(tester);
        expect(find.text(_copy.hostCustomersLogOutreach), findsOneWidget);
        await _dismissMenu(tester, _copy.hostCustomersLogOutreach);
        expect(FocusManager.instance.primaryFocus, same(triggerFocus));
        // A second activation proves the restored focus is still actionable.
        await tester.sendKeyEvent(key);
        await pumpFeatureUi(tester);
        expect(find.text(_copy.hostCustomersLogOutreach), findsOneWidget);
        await _dismissMenu(tester, _copy.hostCustomersLogOutreach);
        expect(tester.takeException(), isNull);
      });
    }
  }

  testWidgets('selected CRM record and pane scroll survive wide compact wide', (
    tester,
  ) async {
    final harness = await _pumpCrm(tester);
    await _showNotes(tester);
    final selectedState = tester.state(_detail);
    final indexScroll = verticalScroll(
      const PageStorageKey<String>('host-customers-people'),
    );
    final detailScroll = findVerticalScrollable(within: _detail);
    final indexPosition = tester.state<ScrollableState>(indexScroll).position;
    final detailPosition = tester.state<ScrollableState>(detailScroll).position;
    await tester.drag(indexScroll, const Offset(0, -200));
    await pumpFeatureUi(tester);
    await tester.drag(detailScroll, const Offset(0, -200));
    await pumpFeatureUi(tester);
    final indexOffset = indexPosition.pixels;
    final detailOffset = detailPosition.pixels;
    expect(indexOffset, greaterThan(0));
    expect(detailOffset, greaterThan(0));
    for (final width in [800.0, 390.0, 1600.0]) {
      tester.view.physicalSize = Size(width, 1000);
      await pumpFeatureUi(tester);
      expect(tester.state(_detail), same(selectedState));
      expect(harness.router.state.uri.queryParameters['contactId'], 'person-0');
      expect(detailPosition.pixels, detailOffset);
      expect(indexPosition.pixels, indexOffset);
      await _openDetailMenu(tester);
      await _dismissPointerMenu(tester, _copy.hostCustomersLogOutreach);
    }
    await _openIndexMenu(tester);
    await _dismissPointerMenu(tester, _copy.hostCustomersReviewDuplicates);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'focused real index search survives status, resize and text reflow',
    (tester) async {
      final harness = await _pumpCrm(tester);
      await _showNotes(tester);
      final detailState = tester.state(_detail);
      final detailScroll = findVerticalScrollable(within: _detail);
      final detailPosition = tester
          .state<ScrollableState>(detailScroll)
          .position;
      await tester.drag(detailScroll, const Offset(0, -240));
      await pumpFeatureUi(tester);
      final detailOffset = detailPosition.pixels;
      expect(detailOffset, greaterThan(0));
      final horizontal = _workspaceHorizontalPosition(tester);
      final horizontalOffset = horizontal.pixels;
      final searchTrigger = find.descendant(
        of: find.byType(HostAudienceHeader),
        matching: find.byTooltip(_copy.hostsHostAudienceSearch),
      );
      await _tapCenter(tester, searchTrigger);
      await pumpFeatureUi(tester);
      final search = find.descendant(
        of: find.byKey(const ValueKey('host-customers-search')),
        matching: find.byType(EditableText),
      );
      expect(search, findsOneWidget);
      await tester.tap(search);
      await pumpFeatureUi(tester);
      await tester.enterText(search, 'Person');
      await pumpFeatureUiFor(tester, CatchMotion.searchDebounce);
      await pumpFeatureUi(tester);
      const editingValue = TextEditingValue(
        text: 'Person',
        selection: TextSelection(baseOffset: 1, extentOffset: 4),
      );
      // Use the platform text-input path to select part of the entered query.
      tester.testTextInput.updateEditingValue(editingValue);
      await pumpFeatureUi(tester);
      final editorElement = tester.element(search);
      _expectSearchContinuity(tester, search, editingValue, editorElement);
      expect(horizontal.pixels, horizontalOffset);
      expect(detailPosition.pixels, detailOffset);

      harness.connectivity.add([ConnectivityResult.none]);
      await pumpFeatureUi(tester);
      expect(_offline, findsWidgets);
      _expectSearchContinuity(tester, search, editingValue, editorElement);
      for (final configuration in [
        (width: 1400.0, scale: 2.0),
        (width: 1600.0, scale: 1.0),
      ]) {
        tester.view.physicalSize = Size(configuration.width, 1000);
        tester.platformDispatcher.textScaleFactorTestValue =
            configuration.scale;
        await pumpFeatureUi(tester);
        _expectSearchContinuity(tester, search, editingValue, editorElement);
        expect(tester.state(_detail), same(detailState));
        expect(
          harness.router.state.uri.queryParameters['contactId'],
          'person-0',
        );
        expect(detailPosition.pixels, detailOffset);
        expect(horizontal.pixels, horizontalOffset);
        expect(
          tester.getRect(search).overlaps(tester.getRect(_detail)),
          isFalse,
        );
      }
      harness.connectivity.add([ConnectivityResult.wifi]);
      await pumpFeatureUi(tester);
      expect(_offline, findsNothing);
      _expectSearchContinuity(tester, search, editingValue, editorElement);
      await _openDetailMenu(tester);
      await _dismissPointerMenu(tester, _copy.hostCustomersLogOutreach);
      expect(tester.takeException(), isNull);
    },
  );
}
