part of 'host_operations_screen_test.dart';

void _registerHostOperationsCustomerSummaryFiltersTests() {
  testWidgets('incomplete CRM totals render as lower bounds', (tester) async {
    HostCustomerFilter? selectedFilter;
    await _pumpHostScreen(
      tester,
      Scaffold(
        body: HostCustomersSummarySection(
          summary: const AsyncData(
            HostCrmSummary(
              organizerId: 'organizer-1',
              contactCount: 4,
              pastAttendeeCount: 3,
              repeatAttendeeCount: 2,
              linkedAccountCount: 1,
              importedContactCount: 0,
              whatsappOptInCount: 0,
              smsOptInCount: 0,
              truncated: true,
              inAppReadiness: HostCrmChannelReadiness.currentEventOnly,
              whatsappReadiness: HostCrmChannelReadiness.providerSetupRequired,
              smsReadiness: HostCrmChannelReadiness.providerAndDltSetupRequired,
            ),
          ),
          onRetry: () {},
          selectedFilter: HostCustomerFilter.all,
          onFilterSelected: (filter) => selectedFilter = filter,
        ),
      ),
    );

    expect(find.text('All  4+'), findsOneWidget);
    expect(find.text('Returning  2+'), findsOneWidget);
    // An unavailable new-customer count must not become a fabricated zero.
    expect(find.text('New'), findsOneWidget);
    final summary = find.byType(HostCustomersSummarySection);
    final choices = find.descendant(
      of: summary,
      matching: find.byType(CatchChoiceButton<HostCustomerFilter>),
    );
    expect(choices, findsNWidgets(3));
    final contactsTile = _customerSummaryChoice(HostCustomerFilter.all);
    final semantics = tester.getSemantics(contactsTile);
    expect(semantics.label, 'All  4+');
    expect(semantics.flagsCollection.isButton, isTrue);
    expect(semantics.flagsCollection.isSelected, ui.Tristate.isTrue);
    expect(
      semantics.getSemanticsData().hasAction(ui.SemanticsAction.tap),
      isTrue,
    );
    await tester.tap(_customerSummaryChoice(HostCustomerFilter.repeat));
    expect(selectedFilter, HostCustomerFilter.repeat);
    final surfaces = tester.widgetList<CatchLegacySurface>(
      find.descendant(of: summary, matching: find.byType(CatchLegacySurface)),
    );
    expect(
      surfaces.every((surface) => surface.radius == CatchRadius.sm),
      isTrue,
    );
  });
}

Finder _customerSummaryChoice(HostCustomerFilter filter) =>
    find.byWidgetPredicate(
      (widget) =>
          widget is CatchChoiceButton<HostCustomerFilter> &&
          widget.option.value == filter,
    );
