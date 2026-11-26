import 'package:catch_dating_app/contexts/forms/domain/forms/host_event_offer.dart';
import 'package:catch_dating_app/hosts/forms/offer_body.dart';
import 'package:catch_dating_app/hosts/forms/offer_state.dart';
import 'package:catch_kernel/brand.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import 'forms_fixtures.dart';

final _events = [
  HostOfferEvent(
    id: 'n8',
    name: 'Salt Air Social Run',
    startsAt: DateTime(2026, 11, 15, 6, 30),
  ),
  HostOfferEvent(
    id: 'n22',
    name: 'Half-marathon training: 15K',
    startsAt: DateTime(2026, 11, 22, 6),
  ),
];

class _Calls {
  final chosen = <HostOfferEvent>[];
  final added = <String>[];
  final links = <(String, String)>[];
  int settings = 0;
  int prepare = 0;
  int whatsapp = 0;
  int copy = 0;
  int admit = 0;
  int retry = 0;
  int change = 0;
  int create = 0;
  int refresh = 0;
  int close = 0;
}

Future<_Calls> _pump(WidgetTester tester, HostOfferState state) async {
  final calls = _Calls();
  await pumpFormsBody(
    tester,
    HostOfferBody(
      state: state,
      bankChecked: false,
      onChoose: calls.chosen.add,
      onLoadMoreEvents: () {},
      onAddToPeople: calls.added.add,
      onOpenSettings: () => calls.settings++,
      onPersonalLink: (id, link) => calls.links.add((id, link)),
      onOpenExisting: (_) {},
      onPrepareMessage: () => calls.prepare++,
      onOpenWhatsapp: () => calls.whatsapp++,
      onCopyMessage: () => calls.copy++,
      onReference: (_) {},
      onManualNote: (_) {},
      onBankChecked: (_) {},
      onAdmit: () => calls.admit++,
      onRetry: () => calls.retry++,
      onChangeEvent: () => calls.change++,
      onCreateEvent: () => calls.create++,
      onRefreshOffers: () => calls.refresh++,
      onCloseExisting: () => calls.close++,
    ),
  );
  return calls;
}

void main() {
  testWidgets('lists the events to choose from', (tester) async {
    final calls = await _pump(
      tester,
      HostOfferState(stage: HostOfferStage.events, events: _events),
    );

    expect(find.text('Which event'), findsOneWidget);
    expect(find.text('Salt Air Social Run'), findsOneWidget);
    await tester.tap(find.text('Half-marathon training: 15K'));
    expect(calls.chosen.single.id, 'n22');
  });

  testWidgets('the ready offer names who gets it, the hold and the cost', (
    tester,
  ) async {
    await _pump(
      tester,
      HostOfferState(
        stage: HostOfferStage.review,
        events: _events,
        event: _events.first,
        recipients: const ['Tara Menon'],
        amount: '₹499',
        expiresAt: formsNow.add(const Duration(days: 2)),
      ),
    );

    expect(find.text('Who gets it'), findsOneWidget);
    expect(find.text('Tara Menon'), findsOneWidget);
    expect(find.textContaining('The place is held until'), findsOneWidget);
    expect(
      find.text('The place costs ₹499. Guests pay you directly.'),
      findsOneWidget,
    );
  });

  testWidgets('a person outside People is added first', (tester) async {
    final calls = await _pump(
      tester,
      HostOfferState(
        stage: HostOfferStage.needsContact,
        events: _events,
        event: _events.first,
        missing: const [HostOfferPerson(id: 'response-tara', name: 'Tara')],
      ),
    );

    expect(find.text('Add to People first'), findsOneWidget);
    await tester.tap(find.text('Add to People'));
    expect(calls.added, ['response-tara']);
  });

  testWidgets('an event without offer terms opens its settings', (
    tester,
  ) async {
    final calls = await _pump(
      tester,
      HostOfferState(
        stage: HostOfferStage.needsSettings,
        events: _events,
        event: _events.first,
      ),
    );

    await tester.tap(find.text('Open settings'));
    expect(calls.settings, 1);
  });

  testWidgets('a sent offer shows its WhatsApp message as a chat bubble', (
    tester,
  ) async {
    final calls = await _pump(
      tester,
      HostOfferState(
        stage: HostOfferStage.selected,
        events: _events,
        event: _events.first,
        selected: HostOfferSelected(
          name: 'Tara Menon',
          status: HostOfferStatus.offered,
          expiresAt: formsNow.add(const Duration(days: 2)),
          message:
              'Hi Tara! There is a place for you on the Sunday run. Book '
              'here: ${Brand.webDomain}/o/4fk2',
          canOpenWhatsapp: true,
          admission: const HostOfferAdmission(
            phase: HostOfferAdmissionPhase.check,
          ),
        ),
      ),
    );

    expect(find.text('Tara Menon gets this on WhatsApp'), findsOneWidget);
    expect(find.byType(CatchChatBubble), findsOneWidget);
    await tester.tap(find.text('Open WhatsApp'));
    await tester.tap(find.text('Copy'));
    await tester.ensureVisible(find.text('Check'));
    await tester.tap(find.text('Check'));
    expect([calls.whatsapp, calls.copy, calls.admit], [1, 1, 1]);
  });

  testWidgets('a manual payment asks for the reference', (tester) async {
    await _pump(
      tester,
      HostOfferState(
        stage: HostOfferStage.selected,
        events: _events,
        event: _events.first,
        selected: HostOfferSelected(
          name: 'Tara Menon',
          status: HostOfferStatus.offered,
          expiresAt: formsNow.add(const Duration(days: 2)),
          manual: const HostOfferManual(status: HostManualPaymentStatus.none),
        ),
      ),
    );

    expect(find.text('Payment'), findsOneWidget);
    expect(find.byKey(const ValueKey('host-offer-reference')), findsOneWidget);
    expect(find.text('Write the WhatsApp message'), findsOneWidget);
  });

  testWidgets('a failure offers Try again', (tester) async {
    final calls = await _pump(
      tester,
      HostOfferState(
        stage: HostOfferStage.events,
        events: _events,
        failed: true,
        canRetry: true,
      ),
    );

    await tester.tap(find.text('Try again'));
    expect(calls.retry, 1);
  });

  testWidgets('offers a new event while none is chosen, then Change event', (
    tester,
  ) async {
    final calls = await _pump(
      tester,
      HostOfferState(stage: HostOfferStage.events, events: _events),
    );
    await tester.tap(find.byKey(const ValueKey('host-offer-create-event')));
    expect(calls.create, 1);
    expect(find.byKey(const ValueKey('host-offer-change-event')), findsNothing);

    final chosen = await _pump(
      tester,
      HostOfferState(
        stage: HostOfferStage.existing,
        events: _events,
        event: _events.first,
        canChangeEvent: true,
        issued: true,
        progress: HostOfferProgress.existing,
        existing: const [
          HostOfferExisting(
            item: {'offerId': 'offer-1'},
            name: 'Tara Menon',
            status: HostOfferStatus.offered,
          ),
        ],
      ),
    );
    expect(find.byKey(const ValueKey('host-offer-create-event')), findsNothing);
    expect(find.text('Loading offer…'), findsOneWidget);
    expect(
      find.text('Offers recorded. Sending and admission are separate steps.'),
      findsOneWidget,
    );
    await tester.tap(find.byKey(const ValueKey('host-offer-change-event')));
    await tester.tap(find.text('Refresh offers'));
    expect([chosen.change, chosen.refresh], [1, 1]);
  });

  testWidgets('the ready offer says it holds no place', (tester) async {
    await _pump(
      tester,
      HostOfferState(
        stage: HostOfferStage.review,
        event: _events.first,
        recipients: const ['Tara Menon'],
        amount: 'Free',
      ),
    );
    expect(
      find.text('Creating an offer does not reserve a place.'),
      findsOneWidget,
    );
  });

  testWidgets('an open offer of a selection goes back to every offer, says '
      'what WhatsApp does and gives the admission error', (tester) async {
    final calls = await _pump(
      tester,
      HostOfferState(
        stage: HostOfferStage.selected,
        event: _events.first,
        canCloseExisting: true,
        selected: HostOfferSelected(
          name: 'Tara Menon',
          status: HostOfferStatus.offered,
          expiresAt: DateTime(2026, 11, 14, 20),
          manual: const HostOfferManual(status: HostManualPaymentStatus.none),
          admission: const HostOfferAdmission(
            phase: HostOfferAdmissionPhase.check,
            failed: true,
            error: 'This event is full.',
          ),
        ),
      ),
    );
    expect(
      find.text(
        'Opens WhatsApp with editable text. You review and press Send; '
        'Catch cannot track delivery or replies.',
      ),
      findsOneWidget,
    );
    expect(
      find.text('Creating an offer does not reserve a place.'),
      findsOneWidget,
    );
    expect(find.text('This event is full.'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('host-offer-close-existing')));
    expect(calls.close, 1);
  });
}
