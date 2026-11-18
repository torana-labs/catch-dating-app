import 'package:catch_dating_app/contexts/events/domain/event_runtime_claim_request.dart';
import 'package:catch_dating_app/hosts/door/door_body.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_operational_roster_section.dart'
    show HostRuntimeClaimList;
import 'package:catch_l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'door_fixtures.dart';

void main() {
  testWidgets('a web guest asking to be matched shows above the guests', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 1600);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    final now = DateTime(2026, 11, 20, 19);
    await tester.pumpWidget(
      MaterialApp(
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: CatchRoot(
          theme: CatchThemeMode.night,
          child: CatchScreen(
            bodyScrolls: false,
            body: DoorBody(
              state: doorBoardState(),
              onFilter: (_) {},
              onSearch: (_) {},
              onGuestAction: (_) {},
              onScan: () {},
              onRetrySync: () {},
              onDiscardRefused: () {},
              claims: HostRuntimeClaimList(
                claims: [
                  EventRuntimeClaimRequest(
                    id: 'claim-1',
                    eventId: 'event-1',
                    organizerId: 'club-1',
                    uid: 'web-guest-1',
                    displayName: 'Rhea K',
                    phoneLastFour: '4321',
                    status: EventRuntimeClaimStatus.pending,
                    createdAt: now,
                    updatedAt: now,
                  ),
                ],
                attendees: const [],
                pendingUid: null,
                onApprove: (_, _) {},
                onReject: (_) {},
              ),
            ),
          ),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('Rhea K'), findsOneWidget);
    // Under the search, above the guests still to come.
    final claim = tester.getTopLeft(find.text('Rhea K')).dy;
    expect(
      claim,
      greaterThan(
        tester.getTopLeft(find.byKey(const ValueKey('door-search'))).dy,
      ),
    );
    expect(claim, lessThan(tester.getTopLeft(find.text('Dev Patel')).dy));
  });
}
