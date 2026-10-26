part of 'catch_primitives_test.dart';

void _registerCatchPrimitivesCompositionTests() {
  testWidgets('CatchCodeInputRow renders handoff cells and active caret', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        const CatchCodeInputRow(length: 4, value: '12', active: 3, height: 72),
      ),
    );

    final tokens = CatchTokens.of(
      tester.element(find.byType(CatchCodeInputRow)),
    );
    final activeCellFinder = find.byKey(const ValueKey('code_digit_3'));
    final activeContainerFinder = find.descendant(
      of: activeCellFinder,
      matching: find.byType(AnimatedContainer),
    );
    final activeCell = tester.widget<AnimatedContainer>(activeContainerFinder);
    final decoration = activeCell.decoration! as BoxDecoration;
    final border = decoration.border! as Border;

    expect(find.byType(CatchCodeInputRow), findsOneWidget);
    expect(find.byType(CatchCodeDigitSurface), findsNWidgets(4));
    expect(find.byType(CatchCodeCaretIndicator), findsOneWidget);
    expect(find.text('1'), findsOneWidget);
    expect(find.text('2'), findsOneWidget);
    expect(
      tester.getSize(find.byKey(const ValueKey('code_digit_3'))).height,
      72,
    );
    expect(decoration.color, tokens.surface);
    expect(
      decoration.borderRadius,
      BorderRadius.circular(CatchRadius.interactiveTile),
    );
    expect(border.top.color, tokens.ink);
    expect(border.top.width, 1.5);
    expect(
      find.descendant(
        of: find.byType(CatchCodeInputRow),
        matching: find.byWidgetPredicate(
          (widget) =>
              widget is SizedBox && widget.width == CatchLayout.otpDigitGap,
        ),
      ),
      findsNWidgets(3),
    );
    expect(
      find.descendant(
        of: find.byKey(const ValueKey('code_digit_3')),
        matching: find.byWidgetPredicate(
          (widget) =>
              widget is SizedBox &&
              widget.width == CatchLayout.otpCaretWidth &&
              widget.height == CatchLayout.otpCaretHeight,
        ),
      ),
      findsOneWidget,
    );
  });

  testWidgets('CatchRangeInput hides tick marks while preserving divisions', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        CatchRangeInput(
          values: const RangeValues(18, 60),
          min: 18,
          max: 60,
          divisions: 42,
          minLabel: '18',
          maxLabel: '60+',
          onChanged: (_) {},
        ),
      ),
    );

    final theme = tester.widget<SliderTheme>(
      find.ancestor(
        of: find.byType(RangeSlider),
        matching: find.byType(SliderTheme),
      ),
    );
    final slider = tester.widget<RangeSlider>(find.byType(RangeSlider));

    expect(theme.data.inactiveTickMarkColor, Colors.transparent);
    expect(slider.divisions, 42);
    expect(find.text('18'), findsOneWidget);
    expect(find.text('60+'), findsOneWidget);
  });

  testWidgets('CatchStepper formats and clamps numeric changes', (
    tester,
  ) async {
    num value = 170;

    await tester.pumpWidget(
      _wrap(
        StatefulBuilder(
          builder: (context, setState) => CatchStepper(
            value: value,
            min: 169,
            max: 171,
            decreaseSemanticLabel: 'Decrease height',
            increaseSemanticLabel: 'Increase height',
            valueLabelBuilder: (next) => '${next.round()} cm',
            onChanged: (next) => setState(() => value = next),
          ),
        ),
      ),
    );

    expect(find.text('170 cm'), findsOneWidget);

    await tester.tap(find.byTooltip('Increase height'));
    await tester.pump();
    expect(find.text('171 cm'), findsOneWidget);

    final disabledIncrease = tester.widget<CatchStepperRepeatButton>(
      find.widgetWithIcon(CatchStepperRepeatButton, CatchIcons.add),
    );
    expect(disabledIncrease.enabled, isFalse);

    await tester.tap(find.byTooltip('Decrease height'));
    await tester.pump();
    expect(find.text('170 cm'), findsOneWidget);
  });

  testWidgets('standalone controls preserve their canonical target heights', (
    tester,
  ) async {
    CityOption? selected;

    await tester.pumpWidget(
      _wrap(
        SizedBox(
          width: 320,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CatchField<CityOption>.select(
                copy: catchFieldCopy(AppLocalizationsEn()),
                key: const Key('control-select-menu'),
                title: 'City',
                values: defaultCityOptions,
                value: selected,
                itemLabelBuilder: (city) => city.label,
                hintText: 'Select city',
                showLabel: false,
                onChanged: (value) => selected = value,
              ),
              const SizedBox(height: 12),
              CatchStepper(
                decreaseSemanticLabel: 'Decrease',
                increaseSemanticLabel: 'Increase',
                key: const Key('control-number-stepper'),
                value: 60,
                min: 30,
                max: 120,
                valueLabelBuilder: (value) => '${value.round()} min',
                onChanged: (_) {},
              ),
            ],
          ),
        ),
      ),
    );

    const expectedHeight = CatchControlMetrics.mdMinHeight;
    expect(
      tester.getSize(find.byKey(const Key('control-select-menu'))).height,
      expectedHeight,
    );
    expect(
      tester.getSize(find.byKey(const Key('control-number-stepper'))).height,
      CatchStepperRepeatButton.hitExtent,
    );
  });

  testWidgets('CatchChip.removable uses one whole-chip removal action', (
    tester,
  ) async {
    var removals = 0;

    await tester.pumpWidget(
      _wrap(CatchChip.removable(label: 'Easy', onRemove: () => removals += 1)),
    );

    final chipFinder = find.byType(CatchChip);
    final tokens = CatchTokens.of(tester.element(chipFinder));
    final container = tester.widget<AnimatedContainer>(
      find.descendant(of: chipFinder, matching: find.byType(AnimatedContainer)),
    );
    final decoration = container.decoration as BoxDecoration;
    final foregroundDecoration =
        container.foregroundDecoration as BoxDecoration;

    expect(decoration.color, tokens.surface);
    final restingBorder = CatchBorder.interactive(
      tokens,
      CatchInteractiveBorderState.resting,
    );
    expect(foregroundDecoration.border?.top.color, restingBorder.color);
    expect(foregroundDecoration.border?.top.width, restingBorder.width);
    expect(find.byIcon(CatchIcons.close), findsOneWidget);

    await tester.tap(find.text('Easy'));
    await tester.pump();
    expect(removals, 1);

    await tester.tap(find.byIcon(CatchIcons.close));
    await tester.pump();
    expect(removals, 2);
  });

  testWidgets('CatchFieldLabelText renders optional badge leaf', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        CatchFieldLabelText(
          copy: catchFieldLabelTextCopy(AppLocalizationsEn()),
          label: 'Instagram',
          mode: CatchFieldLabelTextMode.optional,
        ),
      ),
    );

    expect(find.text('Instagram'), findsOneWidget);
    expect(find.byType(CatchBadge), findsOneWidget);
    expect(find.text('Optional'), findsOneWidget);
  });

  testWidgets('CatchChoiceInput composes public option items', (tester) async {
    var selected = 'all';

    await tester.pumpWidget(
      _wrap(
        StatefulBuilder(
          builder: (context, setState) => CatchChoiceInput<String>.segmented(
            selected: selected,
            onChanged: (value) => setState(() => selected = value),
            options: const [
              CatchOption(value: 'all', label: 'All'),
              CatchOption(value: 'saved', label: 'Saved'),
              CatchOption(value: 'nearby', label: 'Nearby'),
            ],
          ),
        ),
      ),
    );

    expect(find.byType(CatchChoiceButton<String>), findsNWidgets(3));
    await tester.tap(find.text('Saved'));
    await tester.pump();
    expect(selected, 'saved');
  });

  testWidgets('CatchChoiceInput keeps option labels on a stable axis', (
    tester,
  ) async {
    var selected = 'first';

    await tester.pumpWidget(
      _wrap(
        StatefulBuilder(
          builder: (context, setState) => CatchChoiceInput<String>.segmented(
            selected: selected,
            onChanged: (value) => setState(() => selected = value),
            options: const [
              CatchOption(value: 'first', label: 'First'),
              CatchOption(value: 'second', label: 'Second'),
            ],
          ),
        ),
      ),
    );
    await tester.pump();

    expect(
      tester.getTopLeft(find.text('First')).dy,
      closeTo(tester.getTopLeft(find.text('Second')).dy, 0.1),
    );

    await tester.tap(find.text('Second'));
    await tester.pump(CatchMotion.fast);

    expect(
      tester.getTopLeft(find.text('First')).dy,
      closeTo(tester.getTopLeft(find.text('Second')).dy, 0.1),
    );
  });

  testWidgets('CatchPageTabBar aligns trailing actions with option labels', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        CatchPageTabBar<String>(
          selected: 'all',
          options: const [
            CatchOption(value: 'all', label: 'All'),
            CatchOption(value: 'saved', label: 'Saved'),
          ],
          trailing: SizedBox.square(
            dimension: CatchLayout.iconButtonNavSize,
            child: Icon(CatchIcons.filters),
          ),
        ),
      ),
    );
    await tester.pump();

    final labelCenter = tester.getCenter(find.text('All'));
    final iconCenter = tester.getCenter(find.byIcon(CatchIcons.filters));

    expect((labelCenter.dy - iconCenter.dy).abs(), lessThan(8));
  });

  testWidgets(
    'operational CatchPageTabBar keeps labels and actions at 2x text',
    (tester) async {
      var selected = 'now';
      final options = [
        CatchOption(value: 'now', label: 'Now', icon: CatchIcons.time),
        CatchOption(value: 'guests', label: 'Guests', icon: CatchIcons.people),
        CatchOption(value: 'room', label: 'Room', icon: CatchIcons.grid),
      ];

      await tester.pumpWidget(
        _wrap(
          CatchPageTabBar<String>(
            selected: selected,
            options: options,
            variant: CatchChoiceInputVariant.operational,
            onChanged: (value) => selected = value,
          ),
        ),
      );
      expect(find.byIcon(CatchIcons.grid), findsOneWidget);
      await tester.tap(find.text('Room'));
      expect(selected, 'room');

      await tester.pumpWidget(
        _wrap(
          CatchPageTabBar<String>(
            selected: selected,
            options: options,
            variant: CatchChoiceInputVariant.operational,
            onChanged: (value) => selected = value,
          ),
          textScale: 2,
        ),
      );
      await tester.pump();
      expect(find.text('Now'), findsOneWidget);
      expect(find.text('Guests'), findsOneWidget);
      expect(find.text('Room'), findsOneWidget);
      expect(find.byIcon(CatchIcons.grid), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('CatchChoiceButton renders mono uppercase label and tap', (
    tester,
  ) async {
    var tapped = false;

    await tester.pumpWidget(
      _wrap(
        CatchChoiceButton<String>(
          option: const CatchOption(value: 'mine', label: 'Mine'),
          selected: true,
          selectedRule: Colors.black,
          variant: CatchChoiceInputVariant.mono,
          onTap: () => tapped = true,
        ),
      ),
    );

    expect(find.text('MINE'), findsOneWidget);
    await tester.tap(find.text('MINE'));
    expect(tapped, isTrue);
  });

  testWidgets('CatchChoiceInput single select keeps a selected chip selected', (
    tester,
  ) async {
    Set<CityOption> selected = {cityOptionByName('indore')!};

    await tester.pumpWidget(
      _wrap(
        StatefulBuilder(
          builder: (context, setState) => CatchChoiceInput<CityOption>.form(
            copy: catchFieldLabelTextCopy(AppLocalizationsEn()),
            label: 'City',
            values: defaultCityOptions,
            selected: selected,
            onChanged: (next) => setState(() => selected = next),
            mode: CatchChipMode.single,
            itemLabelBuilder: (value) => value.label,
          ),
        ),
      ),
    );

    await tester.tap(find.text(cityLabel('indore')));
    await tester.pump();

    expect(selected, {cityOptionByName('indore')!});
  });

  testWidgets(
    'CatchChoiceInput optional single select clears a selected chip when enabled',
    (tester) async {
      Set<CityOption> selected = {cityOptionByName('indore')!};

      await tester.pumpWidget(
        _wrap(
          StatefulBuilder(
            builder: (context, setState) => CatchChoiceInput<CityOption>.form(
              copy: catchFieldLabelTextCopy(AppLocalizationsEn()),
              label: 'City',
              values: defaultCityOptions,
              selected: selected,
              isOptional: true,
              onChanged: (next) => setState(() => selected = next),
              mode: CatchChipMode.single,
              itemLabelBuilder: (value) => value.label,
              allowEmptySelection: true,
            ),
          ),
        ),
      );

      await tester.tap(find.text(cityLabel('indore')));
      await tester.pump();

      expect(selected, isEmpty);
    },
  );

  testWidgets(
    'CatchChoiceInput single select keeps chips inactive when selected is empty',
    (tester) async {
      await tester.pumpWidget(
        _wrap(
          CatchChoiceInput<CityOption>.form(
            copy: catchFieldLabelTextCopy(AppLocalizationsEn()),
            label: 'City',
            values: defaultCityOptions,
            selected: const {},
            onChanged: (_) {},
            mode: CatchChipMode.single,
            itemLabelBuilder: (value) => value.label,
          ),
        ),
      );

      final firstChip = find.widgetWithText(
        CatchChip,
        defaultCityOptions.first.label,
      );
      expect(_chipSelected(tester, firstChip), isFalse);
    },
  );

  testWidgets(
    'CatchChoiceInput multi select marks selected chips with a check',
    (tester) async {
      await tester.pumpWidget(
        _wrap(
          CatchChoiceInput<CityOption>.form(
            copy: catchFieldLabelTextCopy(AppLocalizationsEn()),
            label: 'Cities',
            values: defaultCityOptions.take(2).toList(),
            selected: {cityOptionByName('mumbai')!},
            onChanged: (_) {},
            mode: CatchChipMode.multiple,
            itemLabelBuilder: (value) => value.label,
          ),
        ),
      );

      final selectedChip = find.widgetWithText(CatchChip, cityLabel('mumbai'));
      final unselectedChip = find.widgetWithText(CatchChip, cityLabel('delhi'));

      expect(_chipSelected(tester, selectedChip), isTrue);
      expect(
        find.descendant(
          of: selectedChip,
          matching: find.byIcon(CatchIcons.check),
        ),
        findsOneWidget,
      );
      expect(_chipSelected(tester, unselectedChip), isFalse);
      expect(
        find.descendant(
          of: unselectedChip,
          matching: find.byIcon(CatchIcons.check),
        ),
        findsNothing,
      );
      expect(find.byIcon(CatchIcons.check), findsOneWidget);
    },
  );

  testWidgets(
    'CatchChoiceInput required multi select keeps the last chip selected',
    (tester) async {
      Set<CityOption> selected = {cityOptionByName('mumbai')!};

      await tester.pumpWidget(
        _wrap(
          StatefulBuilder(
            builder: (context, setState) => CatchChoiceInput<CityOption>.form(
              copy: catchFieldLabelTextCopy(AppLocalizationsEn()),
              label: 'Cities',
              values: defaultCityOptions.take(2).toList(),
              selected: selected,
              onChanged: (next) => setState(() => selected = next),
              mode: CatchChipMode.multiple,
              itemLabelBuilder: (value) => value.label,
            ),
          ),
        ),
      );

      await tester.tap(find.text(cityLabel('mumbai')));
      await tester.pump();

      expect(selected, {cityOptionByName('mumbai')!});
    },
  );

  testWidgets('CatchBadge renders status tones and typed typography', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        Wrap(
          children: [
            const CatchBadge(label: 'pending'),
            const CatchBadge(label: 'paid', tone: CatchBadgeTone.success),
            const CatchBadge.live(label: 'live - 6h left'),
            CatchBadge(
              label: 'reward',
              tone: CatchBadgeTone.gold,
              icon: CatchIcons.rating,
            ),
            CatchBadge(
              label: 'checked in',
              size: CatchBadgeSize.action,
              accentColor: Colors.deepPurple,
              icon: CatchIcons.check,
            ),
          ],
        ),
      ),
    );

    expect(find.text('pending'), findsOneWidget);
    expect(find.text('paid'), findsOneWidget);
    expect(find.text('LIVE - 6H LEFT'), findsOneWidget);
    expect(find.text('reward'), findsOneWidget);
    expect(find.text('checked in'), findsOneWidget);
    expect(
      tester.getSize(find.widgetWithText(CatchBadge, 'checked in')).height,
      33,
    );
    expect(find.byIcon(CatchIcons.check), findsOneWidget);
  });

  testWidgets('CatchChip.activity renders soft and solid activity registers', (
    tester,
  ) async {
    var taps = 0;

    await tester.pumpWidget(
      _wrap(
        Wrap(
          children: [
            CatchChip.activity(
              data: ActivityPalette.light
                  .getActivity(ActivityKind.socialRun)
                  .chipData,
            ),
            CatchChip.activity(
              data: ActivityPalette.light
                  .getActivity(ActivityKind.pickleball)
                  .chipData,
              emphasis: CatchChipEmphasis.solid,
              label: 'Primary court',
              onTap: () => taps++,
            ),
          ],
        ),
      ),
    );

    expect(find.text('Social run'), findsOneWidget);
    expect(find.text('Primary court'), findsOneWidget);

    await tester.tap(find.text('Primary court'));
    await tester.pump();

    expect(taps, 1);
  });

  testWidgets('CatchAvatar renders activity-context initials and dim states', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        Wrap(
          children: [
            CatchAvatar(
              size: 48,
              name: 'Social run',
              colors: ActivityPalette.light
                  .getActivity(ActivityKind.socialRun)
                  .avatarColors,
              initials: 'SR',
              borderWidth: 2,
            ),
            CatchAvatar(
              size: 44,
              name: 'Pickleball',
              colors: ActivityPalette.light
                  .getActivity(ActivityKind.pickleball)
                  .avatarColors,
              initials: 'PB',
              dim: true,
            ),
          ],
        ),
      ),
    );

    expect(find.text('SR'), findsOneWidget);
    expect(find.text('PB'), findsOneWidget);
    expect(find.byType(CatchAvatarViewport), findsNWidgets(4));
    expect(find.byType(CatchAvatarInitialsSurface), findsNWidgets(2));
    expect(CatchAvatar.initialsOf('Social run'), 'SR');
  });

  testWidgets('CatchAvatar composes obscured initials fallback renderers', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(const CatchAvatar(size: 48, name: 'Private guest', obscured: true)),
    );

    expect(find.text('PG'), findsOneWidget);
    expect(find.byType(CatchAvatarViewport), findsNWidgets(2));
    expect(
      tester
          .widgetList<CatchAvatarViewport>(find.byType(CatchAvatarViewport))
          .where(
            (viewport) => viewport.mode == CatchAvatarViewportMode.obscured,
          ),
      hasLength(1),
    );
    expect(find.byType(ImageFiltered), findsOneWidget);
    expect(find.byType(CatchAvatarInitialsSurface), findsOneWidget);
  });

  testWidgets(
    'CatchAvatar keeps activity fallback when a supplied logo fails',
    (tester) async {
      await tester.pumpWidget(
        _wrap(
          CatchAvatar(
            size: 48,
            name: 'Sea Face Social',
            imageUrl: 'assets/fixtures/does-not-exist.png',
            colors: ActivityPalette.light
                .getActivity(ActivityKind.socialRun)
                .avatarColors,
            initials: 'SF',
          ),
        ),
      );
      await pumpFeatureUi(tester);

      expect(find.byType(CatchAvatarInitialsSurface), findsOneWidget);
      expect(
        tester
            .widget<CatchAvatarInitialsSurface>(
              find.byType(CatchAvatarInitialsSurface),
            )
            .variant,
        CatchAvatarInitialsSurfaceVariant.activity,
      );
      expect(find.text('SF'), findsOneWidget);
    },
  );

  testWidgets('CatchAvatarRow renders initials, veils, and overflow', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        CatchAvatarRow(
          countLabelBuilder: catchAvatarCountLabelBuilder(AppLocalizationsEn()),
          items: const [CatchPersonAvatarItem(name: 'Asha Shah')],
          totalCount: 4,
          size: 42,
          limit: 3,
          veiledCount: 2,
          veiledColors: ActivityPalette.light
              .getActivity(ActivityKind.yoga)
              .avatarColors,
        ),
      ),
    );

    expect(find.text('AS'), findsOneWidget);
    expect(find.byIcon(CatchIcons.person), findsNWidgets(2));
    expect(find.byType(CatchAvatar), findsNWidgets(4));
    expect(find.byType(CatchAvatarInitialsSurface), findsOneWidget);
    expect(find.text('+1'), findsOneWidget);
  });

  testWidgets('ActivityMapPin renders selected flag and activity pigment pin', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        const ActivityMapPin(
          activityKind: ActivityKind.socialRun,
          selected: true,
          label: 'SOCIAL RUN · 6:30 AM',
        ),
      ),
    );

    expect(find.text('SOCIAL RUN · 6:30 AM'), findsOneWidget);
    expect(find.byIcon(CatchIcons.location), findsOneWidget);
  });

  testWidgets('CatchDistanceOverlay renders tappable map radius label', (
    tester,
  ) async {
    var taps = 0;

    await tester.pumpWidget(
      _wrap(CatchDistanceOverlay(label: 'WITHIN 3 KM', onTap: () => taps++)),
    );

    expect(find.text('WITHIN 3 KM'), findsOneWidget);

    await tester.tap(find.text('WITHIN 3 KM'));
    await tester.pump();

    expect(taps, 1);
  });

  testWidgets('CatchDistanceOverlay is reusable over native maps', (
    tester,
  ) async {
    var taps = 0;
    await tester.pumpWidget(
      _wrap(
        CatchDistanceOverlay.label(
          label: 'Within 5 km · tap to change',
          onTap: () => taps += 1,
        ),
      ),
    );

    expect(find.text('Within 5 km · tap to change'), findsOneWidget);
    await tester.tap(find.text('Within 5 km · tap to change'));
    expect(taps, 1);
  });

  testWidgets('CatchNetworkImage composes branded fallback renderer', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        const SizedBox.square(
          dimension: 48,
          child: CatchNetworkImage('assets/branding/not-found.png'),
        ),
      ),
    );
    await tester.pump();

    expect(find.byType(CatchImageFallbackSurface), findsOneWidget);
    expect(find.byIcon(CatchIcons.photo), findsOneWidget);
  });
}
