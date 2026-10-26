part of 'input_test.dart';

void _registerInputSelectionTests() {
  testWidgets('CatchField.select validates and reports selection changes', (
    tester,
  ) async {
    final formKey = GlobalKey<FormState>();
    CityOption? selected;

    await tester.pumpWidget(
      _wrap(
        Form(
          key: formKey,
          child: CatchField<CityOption>.select(
            copy: catchFieldCopy(AppLocalizationsEn()),
            title: 'City',
            contractExemption: 'Fixture selection is not persisted.',
            values: defaultCityOptions,
            itemLabelBuilder: (city) => city.label,
            value: selected,
            leading: Icon(CatchIcons.location),
            onValidate: (value) =>
                value == null ? 'Please select a city' : null,
            onChanged: (value) => selected = value,
          ),
        ),
      ),
    );

    final iconRect = tester.getRect(find.byIcon(CatchIcons.location));
    final titleRect = tester.getRect(find.text('City'));
    final valueRect = tester.getRect(find.text('Select city'));
    final chevronRect = tester.getRect(find.byIcon(CatchIcons.expand));

    expect(iconRect.right, lessThan(titleRect.left));
    expect((titleRect.left - valueRect.left).abs(), lessThanOrEqualTo(1));
    expect(chevronRect.center.dy, closeTo(valueRect.center.dy, 0.1));

    expect(formKey.currentState!.validate(), isFalse);
    await tester.pump();
    expect(find.text('Please select a city'), findsOneWidget);

    final label = tester.widget<Text>(find.text('City'));
    final value = tester.widget<Text>(find.text('Select city'));
    final chevron = tester.widget<Icon>(find.byIcon(CatchIcons.expand));
    final iconTheme = IconTheme.of(
      tester.element(find.byIcon(CatchIcons.location)),
    );

    expect(label.style?.color, CatchTokens.editorialLight.danger);
    expect(value.style?.color, CatchTokens.editorialLight.ink3);
    expect(chevron.color, CatchTokens.editorialLight.ink3);
    expect(chevron.size, CatchFieldTokens.disclosureGlyphExtent);
    final rotation = tester.widget<AnimatedRotation>(
      find.ancestor(
        of: find.byIcon(CatchIcons.expand),
        matching: find.byType(AnimatedRotation),
      ),
    );
    expect(rotation.duration, CatchMotion.base);
    expect(iconTheme.color, CatchTokens.editorialLight.ink2);

    await tester.tap(find.byIcon(CatchIcons.expand));
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Mumbai').hitTestable());
    await pumpFeatureUi(tester);

    expect(selected, cityOptionByName('mumbai')!);
    expect(formKey.currentState!.validate(), isTrue);
  });

  testWidgets(
    'CatchField.select exposes button semantics with label and value',
    (tester) async {
      final selected = cityOptionByName('mumbai')!;

      await tester.pumpWidget(
        _wrap(
          SizedBox(
            width: 320,
            child: CatchField<CityOption>.select(
              copy: catchFieldCopy(AppLocalizationsEn()),
              title: 'City',
              values: defaultCityOptions,
              itemLabelBuilder: (city) => city.label,
              value: selected,
              onChanged: (_) {},
            ),
          ),
        ),
      );

      final semantics = tester.widget<Semantics>(
        find.byWidgetPredicate(
          (widget) =>
              widget is Semantics &&
              widget.properties.label == 'City' &&
              widget.properties.value == 'Mumbai',
        ),
      );

      expect(semantics.properties.button, isTrue);
      expect(semantics.properties.enabled, isTrue);
    },
  );

  testWidgets('CatchField.select disabled state does not open menu', (
    tester,
  ) async {
    final selected = cityOptionByName('mumbai')!;

    await tester.pumpWidget(
      _wrap(
        SizedBox(
          width: 320,
          child: CatchField<CityOption>.select(
            copy: catchFieldCopy(AppLocalizationsEn()),
            title: 'City',
            values: defaultCityOptions,
            itemLabelBuilder: (city) => city.label,
            value: selected,
            states: const <WidgetState>{WidgetState.disabled},
            onChanged: (_) {},
          ),
        ),
      ),
    );

    final semantics = tester.widget<Semantics>(
      find.byWidgetPredicate(
        (widget) =>
            widget is Semantics &&
            widget.properties.label == 'City' &&
            widget.properties.value == 'Mumbai',
      ),
    );

    expect(semantics.properties.button, isTrue);
    expect(semantics.properties.enabled, isFalse);
    expect(semantics.properties.onTap, isNull);

    expect(find.text('Delhi'), findsNothing);
  });

  testWidgets('CatchField.select clears form state when options remove value', (
    tester,
  ) async {
    final formKey = GlobalKey<FormState>();
    final mumbai = cityOptionByName('mumbai')!;
    var selected = mumbai;
    var values = [mumbai, cityOptionByName('delhi')!];
    late StateSetter updateState;

    await tester.pumpWidget(
      _wrap(
        Form(
          key: formKey,
          child: StatefulBuilder(
            builder: (context, setState) {
              updateState = setState;
              return SizedBox(
                width: 320,
                child: CatchField<CityOption>.select(
                  copy: catchFieldCopy(AppLocalizationsEn()),
                  title: 'City',
                  values: values,
                  itemLabelBuilder: (city) => city.label,
                  value: selected,
                  onValidate: (value) =>
                      value == null ? 'Please select a city' : null,
                  onChanged: (value) {
                    if (value != null) selected = value;
                  },
                ),
              );
            },
          ),
        ),
      ),
    );

    expect(find.text('Mumbai'), findsOneWidget);
    expect(formKey.currentState!.validate(), isTrue);

    updateState(() {
      values = [cityOptionByName('delhi')!];
    });
    await tester.pump();
    await tester.pump();

    expect(find.text('Select city'), findsOneWidget);
    expect(formKey.currentState!.validate(), isFalse);
    await tester.pump();

    expect(find.text('Please select a city'), findsOneWidget);
  });

  for (final removesPrevious in [false, true]) {
    testWidgets('CatchField.select keeps replacement value when old choice is '
        '${removesPrevious ? 'removed' : 'retained'}', (tester) async {
      final formKey = GlobalKey<FormState>();
      var selected = 'First';
      var values = ['First', 'Second'];
      var changes = 0;
      Object? validated;
      late StateSetter update;

      await tester.pumpWidget(
        _wrap(
          Form(
            key: formKey,
            child: StatefulBuilder(
              builder: (context, setState) {
                update = setState;
                return CatchField<String>.select(
                  copy: catchFieldCopy(AppLocalizationsEn()),
                  title: 'Selection',
                  values: values,
                  itemLabelBuilder: (value) => value,
                  value: selected,
                  onChanged: (_) => changes++,
                  onValidate: (value) {
                    validated = value;
                    return value == null ? 'Choose a value' : null;
                  },
                );
              },
            ),
          ),
        ),
      );

      final fieldState = tester.state(find.byType(CatchField));
      expect(find.text('First'), findsOneWidget);
      update(() {
        selected = 'Second';
        if (removesPrevious) values = ['Second'];
      });
      await pumpFeatureUi(tester);

      expect(tester.state(find.byType(CatchField)), same(fieldState));
      expect(find.text('Second'), findsOneWidget);
      expect(find.text('First'), findsNothing);
      expect(formKey.currentState!.validate(), isTrue);
      expect(validated, 'Second');
      expect(changes, 0);
    });
  }

  test('CatchField guards ambiguous form configuration', () {
    final controller = TextEditingController();
    addTearDown(controller.dispose);

    expect(
      () => CatchField.input(
        copy: catchFieldCopy(AppLocalizationsEn()),
        title: 'Name',
        controller: controller,
        initialValue: 'Aanya',
      ),
      throwsAssertionError,
    );

    expect(
      () => CatchField<String>.select(
        copy: catchFieldCopy(AppLocalizationsEn()),
        title: 'Activity',
        values: const ['Run', 'Run'],
        itemLabelBuilder: (value) => value,
      ),
      throwsAssertionError,
    );
  });

  testWidgets('CatchField.select opens the shared CatchMenu panel', (
    tester,
  ) async {
    CityOption? selected = cityOptionByName('ahmedabad');

    await tester.pumpWidget(
      _wrap(
        SizedBox(
          width: 240,
          child: CatchField<CityOption>.select(
            copy: catchFieldCopy(AppLocalizationsEn()),
            title: 'City',
            values: defaultCityOptions,
            value: selected,
            itemLabelBuilder: (city) => city.label,
            leading: Icon(CatchIcons.location),
            showLabel: false,
            onChanged: (value) => selected = value,
          ),
        ),
      ),
    );

    await tester.tap(find.byIcon(CatchIcons.expand));
    await pumpFeatureUi(tester);

    // Select renders through the shared CatchMenu panel, not raw Material
    // menu items; the selected option carries the shared check affordance.
    expect(
      find.byWidgetPredicate(
        (widget) => widget is CatchMenu<Object?> && widget.builder == null,
      ),
      findsOneWidget,
    );
    expect(find.byType(MenuItemButton), findsNothing);
    expect(find.byIcon(CatchIcons.check), findsOneWidget);

    final other = defaultCityOptions.firstWhere(
      (city) => city != cityOptionByName('ahmedabad'),
    );
    await tester.tap(find.text(other.label));
    await pumpFeatureUi(tester);

    expect(selected, other);
    expect(
      find.byWidgetPredicate(
        (widget) => widget is CatchMenu<Object?> && widget.builder == null,
      ),
      findsNothing,
    );
  });
}
