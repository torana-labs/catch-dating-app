part of 'catch_primitives_test.dart';

void _registerCatchPrimitivesSearchMenuTests() {
  testWidgets('CatchSearchField renders pill search and clear behavior', (
    tester,
  ) async {
    var query = 'tempo';
    var submitted = '';
    var focused = false;

    await tester.pumpWidget(
      _wrap(
        StatefulBuilder(
          builder: (context, setState) => CatchSearchField(
            copy: catchSearchFieldCopy(AppLocalizationsEn()),
            value: query,
            placeholder: 'Search clubs',
            semanticLabel: 'Search clubs',
            onChanged: (value) => setState(() => query = value),
            onSubmitted: (value) => submitted = value,
            onFocusChanged: (value) => focused = value,
          ),
        ),
      ),
    );

    expect(find.byIcon(CatchIcons.search), findsOneWidget);
    expect(find.byIcon(CatchIcons.clear), findsOneWidget);
    expect(
      tester.widget<TextField>(find.byType(TextField)).controller!.text,
      'tempo',
    );
    final textField = tester.widget<TextField>(find.byType(TextField));
    expect(textField.decoration?.filled, isFalse);
    expect(textField.decoration?.fillColor, Colors.transparent);

    await tester.tap(find.byType(TextField));
    await tester.pump();
    expect(focused, isTrue);

    await tester.enterText(find.byType(TextField), 'asha');
    await tester.pump();
    expect(query, 'asha');

    await tester.testTextInput.receiveAction(TextInputAction.done);
    await tester.pump();
    expect(submitted, 'asha');

    await tester.tap(find.byIcon(CatchIcons.clear));
    await tester.pump();
    expect(query, isEmpty);
    expect(
      tester.widget<TextField>(find.byType(TextField)).controller!.text,
      isEmpty,
    );
  });

  testWidgets('CatchSearchField expanded mode has no empty trailing control', (
    tester,
  ) async {
    var query = '';
    await tester.pumpWidget(
      _wrap(
        StatefulBuilder(
          builder: (context, setState) => CatchSearchField.expanded(
            copy: catchSearchFieldCopy(AppLocalizationsEn()),
            value: query,
            placeholder: 'Search forms',
            onChanged: (value) => setState(() => query = value),
          ),
        ),
      ),
    );

    expect(find.byIcon(CatchIcons.close), findsNothing);
    expect(find.byIcon(CatchIcons.clear), findsNothing);

    await tester.enterText(find.byType(TextField), 'waiver');
    await tester.pump();
    expect(find.byIcon(CatchIcons.clear), findsOneWidget);

    await tester.tap(find.byIcon(CatchIcons.clear));
    await tester.pump();
    expect(query, isEmpty);
    expect(find.byIcon(CatchIcons.close), findsNothing);
    expect(find.byIcon(CatchIcons.clear), findsNothing);
  });

  testWidgets(
    'CatchSearchField expanding mode opens, clears, and closes from the app bar slot',
    (tester) async {
      const searchFieldKey = ValueKey('expanding-search-field');
      var query = 'tempo';
      var opened = false;
      var closed = false;

      await tester.pumpWidget(
        _wrap(
          StatefulBuilder(
            builder: (context, setState) => SizedBox(
              width: 280,
              child: CatchSearchField.expanding(
                copy: catchSearchFieldCopy(AppLocalizationsEn()),
                key: searchFieldKey,
                progress: 0,
                maxWidth: 280,
                value: query,
                placeholder: 'Search clubs',
                onChanged: (value) => setState(() => query = value),
                onOpenSearch: () => opened = true,
                onCloseSearch: () => closed = true,
              ),
            ),
          ),
        ),
      );

      expect(find.byType(TextField), findsNothing);
      expect(tester.getSize(find.byKey(searchFieldKey)).width, 280);
      expect(find.byIcon(CatchIcons.search), findsOneWidget);

      await tester.tap(find.byIcon(CatchIcons.search));
      await tester.pump();
      expect(opened, isTrue);

      await tester.pumpWidget(
        _wrap(
          StatefulBuilder(
            builder: (context, setState) => SizedBox(
              width: 280,
              child: CatchSearchField.expanding(
                copy: catchSearchFieldCopy(AppLocalizationsEn()),
                key: searchFieldKey,
                progress: 0.5,
                maxWidth: 280,
                value: query,
                placeholder: 'Search clubs',
                onChanged: (value) => setState(() => query = value),
                onOpenSearch: () => opened = true,
                onCloseSearch: () => closed = true,
              ),
            ),
          ),
        ),
      );

      await tester.pump(CatchMotion.base);

      expect(find.byType(TextField), findsOneWidget);

      await tester.pumpWidget(
        _wrap(
          StatefulBuilder(
            builder: (context, setState) => SizedBox(
              width: 280,
              child: CatchSearchField.expanding(
                copy: catchSearchFieldCopy(AppLocalizationsEn()),
                key: searchFieldKey,
                progress: 1,
                status: CatchSearchFieldStatus.collapsed,
                maxWidth: 280,
                value: query,
                placeholder: 'Search clubs',
                onChanged: (value) => setState(() => query = value),
                onOpenSearch: () => opened = true,
                onCloseSearch: () => closed = true,
              ),
            ),
          ),
        ),
      );

      await tester.pump(CatchMotion.base);
      expect(find.byType(TextField), findsOneWidget);
      expect(find.byIcon(CatchIcons.clear), findsOneWidget);

      await tester.tap(find.byIcon(CatchIcons.clear));
      await tester.pump();
      expect(query, isEmpty);
      expect(closed, isFalse);
      expect(find.byIcon(CatchIcons.close), findsOneWidget);

      await tester.tap(find.byIcon(CatchIcons.close));
      await tester.pump();
      expect(closed, isTrue);
    },
  );

  testWidgets('CatchMenu renders handoff rows and selection state', (
    tester,
  ) async {
    String? selected;

    await tester.pumpWidget(
      _wrap(
        CatchMenu<String>(
          width: 220,
          items: [
            CatchMenuItem(
              value: 'owner',
              label: 'Owner club',
              sublabel: 'OWNER',
              icon: CatchIcons.host,
              selected: true,
              variant: CatchMenuItemVariant.choice,
            ),
            CatchMenuItem(
              value: 'delete',
              label: 'Delete club',
              icon: CatchIcons.delete,
              danger: true,
            ),
          ],
          onSelected: (value, _) => selected = value,
        ),
      ),
    );

    final surface = tester.widget<CatchSurface>(find.byType(CatchSurface));
    expect(surface.width, 220);
    expect(surface.radius, CatchRadius.md);
    expect(surface.emphasis, CatchSurfaceEmphasis.floating);
    expect(find.text('Owner club'), findsOneWidget);
    expect(find.text('OWNER'), findsOneWidget);
    expect(find.byIcon(CatchIcons.check), findsOneWidget);
    expect(find.byType(CatchDivider), findsNothing);
    expect(find.byType(CatchMenuRow<String>), findsNWidgets(2));

    await tester.tap(find.text('Delete club'));
    await tester.pump();

    expect(selected, 'delete');
  });

  testWidgets('CatchMenu keeps long menus above floating shell navigation', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(400, 800);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: CatchTabViewportScope(
          index: 0,
          bottomBarPlacement: CatchTabViewportScopePlacement.floating,
          bottomOverlayInset: 100,
          child: Scaffold(
            body: Align(
              alignment: Alignment.topCenter,
              child: Padding(
                padding: const EdgeInsets.only(top: 40),
                child: SizedBox(
                  width: 320,
                  child: CatchMenu<int>.anchored(
                    items: [
                      for (var index = 0; index < 20; index++)
                        CatchMenuItem(value: index, label: 'Option $index'),
                    ],
                    builder: (context, controller, child) => ElevatedButton(
                      onPressed: controller.open,
                      child: const Text('Open menu'),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Open menu'));
    await pumpFeatureUi(tester);

    final menu = find.byWidgetPredicate(
      (widget) => widget is CatchMenu<int> && widget.builder == null,
    );
    expect(menu, findsOneWidget);
    expect(tester.getRect(menu).bottom, lessThanOrEqualTo(700));
    final scrollable = find.descendant(
      of: menu,
      matching: find.byType(Scrollable),
    );
    expect(scrollable, findsOneWidget);
    expect(
      tester.state<ScrollableState>(scrollable).position.maxScrollExtent,
      greaterThan(0),
    );
  });

  testWidgets(
    'CatchMenu constrains a long lower menu to anchor-relative space',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(400, 800);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: CatchTabViewportScope(
            index: 0,
            bottomBarPlacement: CatchTabViewportScopePlacement.floating,
            bottomOverlayInset: 100,
            child: Scaffold(
              body: Align(
                alignment: Alignment.bottomCenter,
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 120),
                  child: SizedBox(
                    width: 320,
                    child: CatchMenu<int>.anchored(
                      items: [
                        for (var index = 0; index < 20; index++)
                          CatchMenuItem(value: index, label: 'Option $index'),
                      ],
                      builder: (context, controller, child) => ElevatedButton(
                        onPressed: controller.open,
                        child: const Text('Open lower long menu'),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Open lower long menu'));
      await pumpFeatureUi(tester);

      final menu = find.byWidgetPredicate(
        (widget) => widget is CatchMenu<int> && widget.builder == null,
      );
      expect(menu, findsOneWidget);
      final menuRect = tester.getRect(menu);
      expect(menuRect.top, greaterThanOrEqualTo(CatchLayout.menuViewportInset));
      expect(menuRect.bottom, lessThanOrEqualTo(700));
      final scrollable = find.descendant(
        of: menu,
        matching: find.byType(Scrollable),
      );
      expect(
        tester.state<ScrollableState>(scrollable).position.maxScrollExtent,
        greaterThan(0),
      );
    },
  );

  testWidgets('CatchMenu flips short menus flush above their trigger', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(400, 800);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: CatchTabViewportScope(
          index: 0,
          bottomBarPlacement: CatchTabViewportScopePlacement.floating,
          bottomOverlayInset: 100,
          child: Scaffold(
            body: Align(
              alignment: Alignment.bottomCenter,
              child: Padding(
                padding: const EdgeInsets.only(bottom: 120),
                child: SizedBox(
                  width: 240,
                  child: CatchMenu<int>.anchored(
                    items: const [
                      CatchMenuItem(value: 1, label: 'First option'),
                      CatchMenuItem(value: 2, label: 'Second option'),
                    ],
                    builder: (context, controller, child) => ElevatedButton(
                      onPressed: controller.open,
                      child: const Text('Open short menu'),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );

    final trigger = find.text('Open short menu');
    final triggerTop = tester
        .getRect(
          find.ancestor(of: trigger, matching: find.byType(ElevatedButton)),
        )
        .top;
    await tester.tap(trigger);
    await pumpFeatureUi(tester);

    final menuRect = tester.getRect(
      find.byWidgetPredicate(
        (widget) => widget is CatchMenu<int> && widget.builder == null,
      ),
    );
    expect(menuRect.bottom, closeTo(triggerTop, 1));
    expect(menuRect.bottom, lessThanOrEqualTo(700));
  });

  testWidgets('CatchMenuRow disables selection when item is disabled', (
    tester,
  ) async {
    var selected = false;

    await tester.pumpWidget(
      _wrap(
        CatchMenuRow<String>(
          item: const CatchMenuItem(
            value: 'locked',
            label: 'Locked',
            enabled: false,
          ),
          onSelected: (_, _) => selected = true,
        ),
      ),
    );

    await tester.tap(find.text('Locked'));
    expect(selected, isFalse);
  });

  testWidgets('CatchActionMenu opens the shared handoff menu panel', (
    tester,
  ) async {
    String? selected;

    await tester.pumpWidget(
      _wrap(
        CatchActionMenu<String>(
          tooltip: 'More actions',
          variant: CatchIconActionVariant.plain,
          items: [
            CatchActionMenuItem(
              value: 'active',
              label: 'Open active club',
              icon: CatchIcons.host,
            ),
            CatchActionMenuItem(
              value: 'remove',
              label: 'Remove host',
              icon: CatchIcons.delete,
              isDestructive: true,
            ),
          ],
          onSelected: (value) => selected = value,
        ),
      ),
    );

    expect(
      tester.widget<CatchIconAction>(find.byType(CatchIconAction)).variant,
      CatchIconActionVariant.plain,
    );

    await tester.tap(find.byTooltip('More actions'));
    await pumpFeatureUi(tester);

    expect(
      find.byWidgetPredicate(
        (widget) => widget is CatchMenu<String> && widget.builder == null,
      ),
      findsOneWidget,
    );
    expect(find.text('Open active club'), findsOneWidget);
    expect(find.byIcon(CatchIcons.check), findsNothing);

    await tester.tap(find.text('Remove host'));
    await pumpFeatureUi(tester);

    expect(selected, 'remove');
    expect(
      find.byWidgetPredicate(
        (widget) => widget is CatchMenu<String> && widget.builder == null,
      ),
      findsNothing,
    );
  });

  testWidgets(
    'CatchActionMenu rejects compound menus with more than five commands',
    (tester) async {
      await tester.pumpWidget(
        _wrap(
          CatchActionMenu<int>(
            tooltip: 'Too many actions',
            items: [
              for (var index = 0; index < 6; index++)
                CatchActionMenuItem(value: index, label: 'Action $index'),
            ],
          ),
        ),
      );

      expect(
        tester.takeException(),
        isA<AssertionError>().having(
          (error) => error.message,
          'message',
          contains('at most five commands'),
        ),
      );
    },
  );

  testWidgets('disabled action rows require an actionable explanation', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        const CatchActionMenu<String>(
          tooltip: 'More actions',
          items: [
            CatchActionMenuItem(
              value: 'status',
              label: 'WhatsApp ready',
              enabled: false,
            ),
          ],
        ),
      ),
    );

    expect(
      tester.takeException(),
      isA<AssertionError>().having(
        (error) => error.message,
        'message',
        contains('Informational status does not belong in an action menu'),
      ),
    );
  });

  testWidgets('CatchMenu reflows long labels at supported text scale', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 700);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      _wrap(
        const CatchMenu<String>(
          width: 280,
          items: [
            CatchMenuItem(
              value: 'review',
              label: 'Review possible duplicate customer records',
              sublabel: 'Compare identity evidence before merging anything.',
            ),
          ],
        ),
        textScale: 2,
      ),
    );

    expect(tester.takeException(), isNull);
    expect(find.text('Review possible duplicate customer records'), findsOne);
    expect(
      tester
          .widget<Text>(find.text('Review possible duplicate customer records'))
          .maxLines,
      2,
    );
  });

  testWidgets('adaptive selection uses a sheet on compact layouts', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    var selected = 'last-seen';

    await tester.pumpWidget(
      _wrap(
        StatefulBuilder(
          builder: (context, setState) => CatchSelectionMenu<String>.control(
            title: 'Sort customers',
            subtitle: 'Choose how customers are ordered.',
            tooltip: 'Sort customers',
            value: selected,
            items: const [
              CatchSelectionMenuItem(value: 'last-seen', label: 'Last seen'),
              CatchSelectionMenuItem(value: 'name', label: 'Name'),
            ],
            labelBuilder: (item) => 'Sort: ${item.label}',
            onSelected: (value) => setState(() => selected = value),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Sort: Last seen'));
    await pumpFeatureUi(tester);
    expect(find.byType(CatchSelectionSheet<String>), findsOneWidget);

    final nameSemantics = tester.widget<Semantics>(
      find.byWidgetPredicate(
        (widget) =>
            widget is Semantics &&
            widget.properties.inMutuallyExclusiveGroup == true &&
            widget.properties.selected == false,
      ),
    );
    expect(nameSemantics.properties.inMutuallyExclusiveGroup, isTrue);

    await tester.tap(find.text('Name'));
    await pumpFeatureUi(tester);
    expect(find.text('Sort: Name'), findsOneWidget);
  });

  testWidgets('adaptive selection uses an anchored picker on wider layouts', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(800, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      _wrap(
        CatchSelectionMenu<String>.control(
          title: 'Sort customers',
          tooltip: 'Sort customers',
          value: 'last-seen',
          items: const [
            CatchSelectionMenuItem(value: 'last-seen', label: 'Last seen'),
            CatchSelectionMenuItem(value: 'name', label: 'Name'),
          ],
          labelBuilder: (item) => 'Sort: ${item.label}',
          onSelected: (_) {},
        ),
      ),
    );

    await tester.tap(find.text('Sort: Last seen'));
    await pumpFeatureUi(tester);
    expect(find.byType(CatchSelectionMenu<String>), findsOneWidget);
    expect(find.byType(CatchSelectionSheet<String>), findsNothing);
    expect(
      find.byWidgetPredicate(
        (widget) => widget is CatchMenu<String> && widget.builder == null,
      ),
      findsOneWidget,
    );
  });
}
