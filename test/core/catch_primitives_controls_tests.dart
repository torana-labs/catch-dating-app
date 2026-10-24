part of 'catch_primitives_test.dart';

void _registerCatchPrimitivesControlsTests() {
  final stepLabel = catchStepHeaderLabelBuilder(AppLocalizationsEn());
  final compactStepLabel = catchStepHeaderCompactLabelBuilder(
    AppLocalizationsEn(),
  );

  testWidgets('CatchField sortable owns inline hierarchy and handle lane', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        SizedBox(
          width: 360,
          child: CatchFieldLanes.single(
            child: CatchField.sortable(
              copy: catchFieldCopy(AppLocalizationsEn()),
              title: 'Full name',
              metadata: 'Short text · Required',
              leading: const SizedBox(
                key: ValueKey('sortable-handle'),
                child: Icon(Icons.drag_indicator_rounded),
              ),
              onTap: () {},
            ),
          ),
        ),
      ),
    );

    final field = find.byType(CatchField);
    final title = find.text('Full name');
    final metadata = find.text('Short text · Required');
    expect(field, findsOneWidget);
    expect(title, findsOneWidget);
    expect(metadata, findsOneWidget);
    expect(
      tester.getCenter(find.byKey(const ValueKey('sortable-handle'))).dx,
      lessThan(tester.getTopLeft(title).dx),
    );
    expect(
      tester.getTopLeft(metadata).dx,
      closeTo(tester.getTopLeft(title).dx, 0.5),
    );
    expect(
      tester.getTopLeft(metadata).dy,
      greaterThan(tester.getBottomLeft(title).dy),
    );
    final chevron = find.byIcon(CatchIcons.chevronRightRounded);
    expect(chevron, findsOneWidget);
    expect(
      tester.getCenter(find.byKey(const ValueKey('sortable-handle'))).dy,
      closeTo(tester.getCenter(field).dy, 0.5),
    );
    expect(
      tester.getCenter(chevron).dy,
      closeTo(tester.getCenter(field).dy, 0.5),
    );
  });

  testWidgets('Catch map reveal opens a veil and respects reduced motion', (
    tester,
  ) async {
    final animation = AnimationController(
      vsync: tester,
      duration: CatchMotion.slow,
      value: 0.5,
    );
    addTearDown(animation.dispose);

    Widget transition({required bool reduceMotion}) {
      return _wrap(
        MediaQuery(
          data: MediaQueryData(disableAnimations: reduceMotion),
          child: Builder(
            builder: (context) => CatchRevealViewport.stationary(
              animation: animation,
              child: const Text('Map surface'),
            ),
          ),
        ),
      );
    }

    await tester.pumpWidget(transition(reduceMotion: false));
    expect(find.byKey(const ValueKey('catch_map_reveal.veil')), findsOneWidget);
    final mapRect = tester.getRect(find.text('Map surface'));
    animation.value = 0.8;
    await tester.pump();
    expect(tester.getRect(find.text('Map surface')), mapRect);

    await tester.pumpWidget(transition(reduceMotion: true));
    expect(
      find.byKey(const ValueKey('catch_map_reveal.reduced')),
      findsOneWidget,
    );
    expect(find.byKey(const ValueKey('catch_map_reveal.veil')), findsNothing);
  });

  testWidgets('Catch typography does not inherit underline decoration', (
    tester,
  ) async {
    late final List<TextStyle> styles;
    late final TextStyle kicker;
    late final TextStyle kickerLarge;
    late final TextStyle monoCapsLabel;
    late final TextStyle badgeCaps;

    await tester.pumpWidget(
      _wrap(
        DefaultTextStyle.merge(
          style: const TextStyle(decoration: TextDecoration.underline),
          child: Builder(
            builder: (context) {
              styles = [
                CatchTextStyles.display(context),
                CatchTextStyles.headline(context),
                CatchTextStyles.headlineS(context),
                CatchTextStyles.titleL(context),
                CatchTextStyles.eventTitle(context),
                CatchTextStyles.consoleTitle(context),
                CatchTextStyles.hint(context),
                CatchTextStyles.titleL(context),
                CatchTextStyles.sectionTitle(context),
                CatchTextStyles.bodyL(context),
                CatchTextStyles.bodyS(context),
                CatchTextStyles.labelL(context),
                CatchTextStyles.monoLabel(context),
                CatchTextStyles.monoLabelS(context),
                CatchTextStyles.mono(context),
                CatchTextStyles.badge(context),
              ];
              kicker = CatchTextStyles.kicker(context);
              kickerLarge = CatchTextStyles.kickerLg(context);
              monoCapsLabel = CatchTextStyles.monoCapsLabel(context);
              badgeCaps = CatchTextStyles.badgeCaps(context);
              return const Text('Typography sample');
            },
          ),
        ),
      ),
    );

    expect(styles.map((style) => style.decoration).toSet(), {
      TextDecoration.none,
    });
    expect(styles.map((style) => style.letterSpacing).toSet(), {0});
    expect(kicker.letterSpacing, 1.76);
    expect(kickerLarge.letterSpacing, 2.16);
    expect(monoCapsLabel.letterSpacing, 1.43);
    expect(badgeCaps.letterSpacing, 0.72);
  });

  testWidgets('CatchKickerText renders uppercase mono eyebrow sizes', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        const CatchKickerText(
          label: 'Was at · Sundowner 5K',
          color: Colors.red,
          variant: CatchKickerTextVariant.lg,
        ),
      ),
    );

    final text = tester.widget<Text>(find.text('WAS AT · SUNDOWNER 5K'));
    final context = tester.element(find.text('WAS AT · SUNDOWNER 5K'));
    expect(text.style?.color, Colors.red);
    expect(
      text.style?.fontSize,
      CatchTextStyles.kickerLg(context, color: Colors.red).fontSize,
    );
  });

  testWidgets(
    'CatchButton supports size, full width, tap, and loading states',
    (tester) async {
      var taps = 0;

      await tester.pumpWidget(
        _wrap(
          SizedBox(
            width: 240,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                CatchButton(
                  label: 'Join event',
                  onPressed: () => taps++,
                  size: CatchButtonSize.lg,
                  fullWidth: true,
                ),
                const SizedBox(height: 12),
                CatchButton(
                  label: 'Loading',
                  onPressed: () => taps++,
                  status: CatchButtonStatus.loading,
                ),
              ],
            ),
          ),
        ),
      );

      expect(
        tester.getSize(find.widgetWithText(CatchButton, 'Join event')).height,
        56,
      );
      expect(
        tester.getSize(find.widgetWithText(CatchButton, 'Join event')).width,
        240,
      );
      expect(find.byType(CatchButtonContentRow), findsOneWidget);
      expect(
        find.byWidgetPredicate(
          (widget) =>
              widget is CatchLoadingIndicator &&
              widget.variant == CatchLoadingIndicatorVariant.dots,
        ),
        findsOneWidget,
      );

      await tester.tap(find.text('Join event'));
      await tester.pump();
      expect(taps, 1);

      await tester.tap(
        find.byWidgetPredicate(
          (widget) => widget is CatchButton && widget.label == 'Loading',
        ),
      );
      await tester.pump();
      expect(taps, 1);
      expect(find.text('Loading'), findsNothing);
    },
  );

  _registerCatchPrimitivesButtonTests();

  testWidgets('CatchDock renders catch line and footnote', (tester) async {
    await tester.pumpWidget(
      _wrap(
        CatchDock.primary(
          label: 'Confirm',
          onPressed: () {},
          catchLine: 'free to join',
          footnote: 'No charge until approval.',
        ),
      ),
    );

    expect(find.text('Confirm'), findsOneWidget);
    expect(find.text('FREE TO JOIN'), findsOneWidget);
    expect(find.text('No charge until approval.'), findsOneWidget);
  });

  testWidgets(
    'CatchBottomActionOverlay pins controls over a soft scroll fade',
    (tester) async {
      tester.view.physicalSize = const Size(320, 640);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        _wrap(
          SizedBox.expand(
            child: CatchBottomActionOverlay(
              body: ListView(
                padding: CatchInsets.formStepBodyWithBottomActions,
                children: const [
                  SizedBox(height: 560),
                  Text('Last form field'),
                ],
              ),
              actions: CatchButton(label: 'Next', onPressed: () {}),
            ),
          ),
        ),
      );

      expect(find.byType(BackdropFilter), findsOneWidget);
      final scrim = tester.widget<DecoratedBox>(
        find.byKey(const ValueKey('catch_bottom_action_overlay.scrim')),
      );
      final gradient = (scrim.decoration as BoxDecoration).gradient;
      expect(gradient, isA<LinearGradient>());
      final colors = (gradient! as LinearGradient).colors;
      expect(colors.first.a, CatchOpacity.none);
      expect(colors.last.a, CatchOpacity.visible);

      final bodyRect = tester.getRect(
        find.byKey(const ValueKey('catch_bottom_action_overlay.body')),
      );
      final scrimRect = tester.getRect(
        find.byKey(const ValueKey('catch_bottom_action_overlay.scrim')),
      );
      final actionsRect = tester.getRect(
        find.byKey(const ValueKey('catch_bottom_action_overlay.actions')),
      );
      final overlayRect = tester.getRect(find.byType(CatchBottomActionOverlay));
      expect(scrimRect.top, lessThan(bodyRect.bottom));
      expect(actionsRect.top, greaterThan(scrimRect.top));
      expect(actionsRect.top, bodyRect.bottom);
      expect(actionsRect.bottom, lessThanOrEqualTo(overlayRect.bottom));
      expect(actionsRect.left, greaterThanOrEqualTo(CatchSpacing.screenPx));
      expect(actionsRect.right, lessThanOrEqualTo(320 - CatchSpacing.screenPx));

      await tester.drag(find.byType(ListView), const Offset(0, -160));
      await tester.pump();
      expect(find.text('Last form field').hitTestable(), findsOneWidget);
    },
  );

  testWidgets('CatchIconAction renders handoff icon button variants', (
    tester,
  ) async {
    var taps = 0;

    await tester.pumpWidget(
      _wrap(
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            CatchIconAction.icon(
              key: const ValueKey('bordered-icon-button'),
              icon: CatchIcons.search,
              tooltip: 'Search events',
              onPressed: () => taps++,
            ),
            CatchIconAction.icon(
              key: const ValueKey('active-icon-button'),
              icon: CatchIcons.favoriteRounded,
              active: true,
              accent: CatchTokens.editorialLight.danger,
              onPressed: () {},
            ),
            CatchIconAction.icon(
              key: const ValueKey('float-icon-button'),
              icon: CatchIcons.close,
              variant: CatchIconActionVariant.float,
              onPressed: () {},
            ),
            CatchIconAction.icon(
              key: const ValueKey('plain-icon-button'),
              icon: CatchIcons.more,
              variant: CatchIconActionVariant.plain,
              borderColor: CatchTokens.editorialLight.line2,
              status: CatchIconActionStatus.disabled,
              onPressed: () => taps++,
            ),
          ],
        ),
      ),
    );

    final borderedFinder = find.byKey(const ValueKey('bordered-icon-button'));
    final floatFinder = find.byKey(const ValueKey('float-icon-button'));
    final plainFinder = find.byKey(const ValueKey('plain-icon-button'));
    final tokens = CatchTokens.of(tester.element(borderedFinder));
    final borderedSurface = tester.widget<CatchSurface>(
      find.descendant(of: borderedFinder, matching: find.byType(CatchSurface)),
    );
    final activeIconTheme = tester.widget<IconTheme>(
      find
          .ancestor(
            of: find.byIcon(CatchIcons.favoriteRounded),
            matching: find.byType(IconTheme),
          )
          .first,
    );
    final floatSurface = tester.widget<CatchSurface>(
      find.descendant(of: floatFinder, matching: find.byType(CatchSurface)),
    );
    final plainSurface = tester.widget<CatchSurface>(
      find.descendant(of: plainFinder, matching: find.byType(CatchSurface)),
    );

    expect(
      tester.getSize(borderedFinder),
      Size.square(CatchIconAction.targetExtentFor(CatchLayout.iconButtonSize)),
    );
    expect(
      tester.getSize(
        find.descendant(
          of: borderedFinder,
          matching: find.byType(CatchSurface),
        ),
      ),
      const Size.square(CatchLayout.iconButtonSize),
    );
    expect(borderedSurface.backgroundColor, tokens.surface);
    final restingBorder = CatchBorder.interactive(
      tokens,
      CatchInteractiveBorderState.resting,
    );
    expect(borderedSurface.borderSpec?.color, restingBorder.color);
    expect(borderedSurface.borderSpec?.width, restingBorder.width);
    expect(activeIconTheme.data.color, CatchTokens.editorialLight.danger);
    expect(floatSurface.backgroundColor, isNot(tokens.surface));
    expect(floatSurface.boxShadow, CatchElevation.iconButtonFloat);
    expect(plainSurface.backgroundColor, Colors.transparent);
    expect(plainSurface.borderSpec?.color, tokens.line2);
    expect(
      plainSurface.borderSpec?.width,
      CatchBorder.resolve(tokens, CatchBorderRole.boundary).width,
    );
    expect(find.byTooltip('Search events'), findsOneWidget);

    await tester.tap(find.byIcon(CatchIcons.search));
    await tester.pump();
    await tester.tap(find.byIcon(CatchIcons.more));
    await tester.pump();

    expect(taps, 1);
  });

  test(
    'compact-control constructors reject invalid count and label states',
    () {
      expect(
        () => CatchIconAction.counted(
          icon: CatchIcons.notificationsRounded,
          count: -1,
        ),
        throwsAssertionError,
      );
      expect(
        () => CatchButton.floating(label: '   ', onPressed: () {}),
        throwsAssertionError,
      );
      expect(
        () =>
            CatchButton.floating(label: 'Filters', count: -1, onPressed: () {}),
        throwsAssertionError,
      );
    },
  );

  testWidgets(
    'CatchIconAction.counted owns typed counts, target size, and semantics',
    (tester) async {
      var taps = 0;

      await tester.pumpWidget(
        _wrap(
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              CatchIconAction.counted(
                key: const ValueKey('zero-count-icon-button'),
                icon: CatchIcons.notificationsNoneRounded,
                count: 0,
                tooltip: 'Notifications',
                onPressed: () => taps++,
              ),
              CatchIconAction.counted(
                key: const ValueKey('counted-icon-button'),
                icon: CatchIcons.tuneRounded,
                count: 3,
                tooltip: 'Filters, 3 active',
                onPressed: () => taps++,
              ),
              CatchIconAction.counted(
                icon: CatchIcons.notificationsRounded,
                count: 124,
                tooltip: 'Notifications, 124 unread',
                onPressed: () {},
              ),
            ],
          ),
        ),
      );

      final counted = find.byKey(const ValueKey('counted-icon-button'));
      final semantics = tester.widget<Semantics>(
        find.byWidgetPredicate(
          (widget) =>
              widget is Semantics &&
              widget.properties.label == 'Filters, 3 active',
        ),
      );

      expect(find.text('0'), findsNothing);
      expect(find.text('3'), findsOneWidget);
      expect(find.text('99+'), findsOneWidget);
      expect(
        tester.getSize(counted),
        Size.square(
          CatchIconAction.targetExtentFor(CatchIconAction.defaultSize),
        ),
      );
      expect(semantics.properties.button, isTrue);
      expect(semantics.properties.enabled, isTrue);

      await tester.tap(counted);
      await tester.pump();
      expect(taps, 1);
    },
  );

  testWidgets('CatchButton.floating stays interactive and at least 44px', (
    tester,
  ) async {
    var taps = 0;

    await tester.pumpWidget(
      _wrap(
        CatchButton.floating(
          key: const ValueKey('labelled-count-pill'),
          icon: CatchIcons.tuneRounded,
          label: 'Filters',
          count: 3,
          semanticsLabel: 'Filters, 3 active',
          onPressed: () => taps++,
        ),
        textScale: 2,
      ),
    );

    final pill = find.byKey(const ValueKey('labelled-count-pill'));
    final semantics = tester.widget<Semantics>(
      find.byWidgetPredicate(
        (widget) =>
            widget is Semantics &&
            widget.properties.label == 'Filters, 3 active',
      ),
    );

    expect(find.text('Filters'), findsOneWidget);
    expect(find.text('3'), findsOneWidget);
    expect(tester.getSize(pill).height, greaterThanOrEqualTo(44));
    expect(
      tester
          .getRect(find.text('Filters'))
          .overlaps(tester.getRect(find.text('3'))),
      isFalse,
    );
    expect(semantics.properties.button, isTrue);
    expect(semantics.properties.enabled, isTrue);

    await tester.tap(pill);
    await tester.pump();
    expect(taps, 1);
  });

  testWidgets('CatchButton renders all catalog variants', (tester) async {
    await tester.pumpWidget(
      _wrap(
        const Wrap(
          children: [
            CatchButton(label: 'Primary', onPressed: null),
            CatchButton(
              label: 'Secondary',
              onPressed: null,
              variant: CatchButtonVariant.secondary,
            ),
            CatchButton(
              label: 'Ghost',
              onPressed: null,
              variant: CatchButtonVariant.ghost,
            ),
            CatchButton(
              label: 'Danger',
              onPressed: null,
              variant: CatchButtonVariant.danger,
            ),
            CatchButton(
              label: 'Light',
              onPressed: null,
              variant: CatchButtonVariant.light,
              isInteractive: false,
            ),
          ],
        ),
      ),
    );

    expect(find.text('Primary'), findsOneWidget);
    expect(find.text('Secondary'), findsOneWidget);
    expect(find.text('Ghost'), findsOneWidget);
    expect(find.text('Danger'), findsOneWidget);
    expect(find.text('Light'), findsOneWidget);
  });

  testWidgets('resting outlined controls share one semantic border', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            CatchButton(
              key: const ValueKey('outlined-text-control'),
              label: 'Filters',
              variant: CatchButtonVariant.secondary,
              onPressed: () {},
            ),
            CatchIconAction.icon(
              key: const ValueKey('outlined-icon-control'),
              icon: CatchIcons.search,
              onPressed: () {},
            ),
          ],
        ),
      ),
    );

    final buttonDecoration = tester
        .widgetList<DecoratedBox>(
          find.descendant(
            of: find.byKey(const ValueKey('outlined-text-control')),
            matching: find.byType(DecoratedBox),
          ),
        )
        .map((box) => box.decoration)
        .whereType<BoxDecoration>()
        .singleWhere((decoration) => decoration.border != null);
    final iconSurface = tester.widget<CatchSurface>(
      find.descendant(
        of: find.byKey(const ValueKey('outlined-icon-control')),
        matching: find.byType(CatchSurface),
      ),
    );
    final buttonBorder = (buttonDecoration.border! as Border).top;

    expect(buttonBorder.color, iconSurface.borderSpec?.color);
    expect(buttonBorder.width, iconSurface.borderSpec?.width);
    expect(iconSurface.borderSpec?.role, CatchBorderRole.control);
  });

  testWidgets('CatchStepHeader renders canonical title/context and progress', (
    tester,
  ) async {
    var backTaps = 0;

    await tester.pumpWidget(
      _wrap(
        CatchStepHeader(
          stepLabelBuilder: stepLabel,
          compactStepLabelBuilder: compactStepLabel,
          title: 'Basics',
          subtitle: 'South Bombay Runners',
          kicker: 'Create event',
          step: 2,
          total: 5,
          onBack: () => backTaps++,
        ),
      ),
    );

    final progress = tester.widget<FractionallySizedBox>(
      find.descendant(
        of: find.byType(CatchStepHeader),
        matching: find.byType(FractionallySizedBox),
      ),
    );

    const contextLabel = 'Create event · South Bombay Runners';
    expect(find.text('CREATE EVENT'), findsNothing);
    expect(find.text('Basics'), findsOneWidget);
    expect(find.text(contextLabel), findsOneWidget);
    expect(find.text('STEP 2 OF 5'), findsOneWidget);
    expect(find.byIcon(CatchIcons.arrowBackIosNewRounded), findsOneWidget);
    expect(
      tester
          .getSize(
            find.descendant(
              of: find.byType(CatchStepHeader),
              matching: find.byWidgetPredicate(
                (widget) =>
                    widget is SizedBox &&
                    widget.height == CatchLayout.stepHeaderProgressHeight,
              ),
            ),
          )
          .height,
      CatchLayout.stepHeaderProgressHeight,
    );
    expect(progress.widthFactor, 0.4);

    final topBarSize = tester.getSize(
      find.descendant(
        of: find.byType(CatchStepHeader),
        matching: find.byType(CatchTopBar),
      ),
    );
    expect(topBarSize.height, greaterThanOrEqualTo(CatchLayout.topBarHeight));

    final titleRect = tester.getRect(find.text('Basics'));
    final subtitleRect = tester.getRect(find.text(contextLabel));
    expect(subtitleRect.top, greaterThanOrEqualTo(titleRect.bottom));
    final titleStyle = tester.widget<Text>(find.text('Basics')).style!;
    final subtitleStyle = tester.widget<Text>(find.text(contextLabel)).style!;
    expect(subtitleStyle.fontFamily, titleStyle.fontFamily);
    expect(titleStyle.fontSize, greaterThan(subtitleStyle.fontSize!));
    final progressRect = tester.getRect(
      find.descendant(
        of: find.byType(CatchStepHeader),
        matching: find.byWidgetPredicate(
          (widget) =>
              widget is SizedBox &&
              widget.height == CatchLayout.stepHeaderProgressHeight,
        ),
      ),
    );
    expect(
      progressRect.top - subtitleRect.bottom,
      lessThanOrEqualTo(CatchSpacing.s4),
    );

    final barRect = tester.getRect(find.byType(CatchTopBar));
    final counterRect = tester.getRect(find.text('STEP 2 OF 5'));
    expect(counterRect.center.dy, closeTo(barRect.center.dy, 0.001));
    expect(progressRect.top, closeTo(barRect.bottom, 0.001));
    expect(tester.takeException(), isNull);

    await tester.tap(find.byIcon(CatchIcons.arrowBackIosNewRounded));
    await tester.pump();

    expect(backTaps, 1);
  });

  testWidgets('CatchStepHeader displays one-based progress copy', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        CatchStepHeader(
          stepLabelBuilder: stepLabel,
          compactStepLabelBuilder: compactStepLabel,
          title: 'Schedule',
          step: 1,
          total: 3,
        ),
      ),
    );

    expect(find.text('Schedule'), findsOneWidget);
    expect(find.text('STEP 1 OF 3'), findsOneWidget);
    final titleRect = tester.getRect(find.text('Schedule'));
    final counterRect = tester.getRect(find.text('STEP 1 OF 3'));
    final topBarSize = tester.getSize(
      find.descendant(
        of: find.byType(CatchStepHeader),
        matching: find.byType(CatchTopBar),
      ),
    );
    expect(topBarSize.height, CatchLayout.topBarHeight);
    expect(counterRect.center.dy, closeTo(titleRect.center.dy, 0.001));
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'CatchStepHeader grows its context lane at accessible text scale',
    (tester) async {
      const subtitle = "We'll send you a one-time code to verify.";
      final heights = <double>[];
      for (final scale in [1.0, 2.0]) {
        await tester.pumpWidget(
          _wrap(
            SizedBox(
              width: 350,
              child: CatchStepHeader(
                stepLabelBuilder: stepLabel,
                compactStepLabelBuilder: compactStepLabel,
                title: "What's your number?",
                subtitle: subtitle,
                showBack: false,
                gutter: false,
              ),
            ),
            textScale: scale,
          ),
        );

        final barRect = tester.getRect(find.byType(CatchTopBar));
        final titleRect = tester.getRect(find.text("What's your number?"));
        final subtitleRect = tester.getRect(find.text(subtitle));
        heights.add(barRect.height);
        expect(titleRect.top, greaterThanOrEqualTo(barRect.top));
        expect(subtitleRect.top, greaterThanOrEqualTo(titleRect.bottom));
        expect(subtitleRect.bottom, lessThanOrEqualTo(barRect.bottom));
        expect(
          tester.widget<Text>(find.text(subtitle)).maxLines,
          scale == 1 ? 1 : 2,
        );
        expect(tester.takeException(), isNull);
      }
      expect(heights.last, greaterThan(heights.first));
    },
  );

  testWidgets('CatchStepHeader exposes its step overview as a 44px action', (
    tester,
  ) async {
    var overviewTaps = 0;
    await tester.pumpWidget(
      _wrap(
        CatchStepHeader(
          stepLabelBuilder: stepLabel,
          compactStepLabelBuilder: compactStepLabel,
          title: 'Schedule',
          step: 1,
          total: 3,
          onStepOverview: () => overviewTaps += 1,
          stepOverviewSemanticsLabel: 'Open event section overview',
        ),
      ),
    );

    final action = find.bySemanticsLabel('Open event section overview');
    expect(action, findsOneWidget);
    expect(tester.getSize(action).height, greaterThanOrEqualTo(44));
    await tester.tap(action);
    expect(overviewTaps, 1);
  });

  testWidgets(
    'CatchStepHeader compacts only the visual counter at large text',
    (tester) async {
      await tester.pumpWidget(
        _wrap(
          CatchStepHeader(
            stepLabelBuilder: stepLabel,
            compactStepLabelBuilder: compactStepLabel,
            title: 'Meeting location',
            step: 2,
            total: 5,
            onStepOverview: () {},
            stepOverviewSemanticsLabel: 'Step 2 of 5. Open section overview.',
          ),
          textScale: 2,
        ),
      );

      expect(find.text('2/5'), findsOneWidget);
      expect(find.text('STEP 2 OF 5'), findsNothing);
      expect(
        find.bySemanticsLabel('Step 2 of 5. Open section overview.'),
        findsOneWidget,
      );
    },
  );

  testWidgets('CatchFormStepList renders status and opens a section', (
    tester,
  ) async {
    int? selectedStep;
    await tester.pumpWidget(
      _wrap(
        CatchFormStepList(
          fieldCopy: catchFieldCopy(AppLocalizationsEn()),
          statusLabelBuilder: catchFormStepStatusLabelBuilder(
            AppLocalizationsEn(),
          ),
          items: const [
            CatchFormStepReviewItem(
              index: 0,
              title: 'Event basics',
              status: CatchFormStepListStatus.complete,
            ),
            CatchFormStepReviewItem(
              index: 1,
              title: 'Meeting location',
              status: CatchFormStepListStatus.needsInformation,
            ),
            CatchFormStepReviewItem(
              index: 2,
              title: 'Live event guide',
              status: CatchFormStepListStatus.optional,
            ),
          ],
          onStepSelected: (index) => selectedStep = index,
        ),
      ),
    );

    expect(find.text('COMPLETE'), findsOneWidget);
    expect(find.text('NEEDS INFORMATION'), findsOneWidget);
    expect(find.text('OPTIONAL'), findsOneWidget);
    await tester.tap(find.text('Meeting location'));
    expect(selectedStep, 1);
  });

  testWidgets('CatchButton light variant stays legible in dark mode', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        const CatchButton(
          label: 'Light action',
          onPressed: null,
          variant: CatchButtonVariant.light,
          isInteractive: false,
        ),
        theme: AppTheme.dark,
      ),
    );

    final label = tester.widget<Text>(find.text('Light action'));

    expect(label.style?.color, CatchTokens.editorialLight.ink);
  });

  testWidgets('CatchButton primary variant uses white text in dark mode', (
    tester,
  ) async {
    var taps = 0;

    await tester.pumpWidget(
      _wrap(
        CatchButton(label: 'Primary action', onPressed: () => taps++),
        theme: AppTheme.dark,
      ),
    );

    await tester.tap(find.text('Primary action'));
    await tester.pump();

    final label = tester.widget<Text>(find.text('Primary action'));

    expect(taps, 1);
    expect(label.style?.color, CatchTokens.editorialDark.primaryInk);
  });

  testWidgets('CatchButton applies token color and tap semantics', (
    tester,
  ) async {
    var taps = 0;

    await tester.pumpWidget(
      _wrap(CatchButton.text(label: 'Retry', onPressed: () => taps++)),
    );

    await tester.tap(find.text('Retry'));
    await tester.pump();

    final label = tester.widget<Text>(find.text('Retry'));
    expect(taps, 1);
    expect(label.style?.color, CatchTokens.editorialLight.primary);
  });

  testWidgets('CatchButton keeps long localized labels constrained', (
    tester,
  ) async {
    const plainLabel = 'Cancel this unexpectedly long localized action';
    const leadingLabel = 'Saving this unexpectedly long localized action';

    await tester.pumpWidget(
      _wrap(
        const Column(
          children: [
            SizedBox(
              width: 132,
              child: CatchButton.text(label: plainLabel, onPressed: null),
            ),
            SizedBox(
              width: 132,
              child: CatchButton.text(
                label: leadingLabel,
                onPressed: null,
                leading: SizedBox.square(dimension: 12),
              ),
            ),
          ],
        ),
      ),
    );

    expect(tester.takeException(), isNull);
    expect(tester.getSize(find.text(plainLabel)).width, lessThanOrEqualTo(116));
    expect(
      tester.getSize(find.text(leadingLabel)).width,
      lessThanOrEqualTo(98),
    );
    expect(
      tester.widget<Text>(find.text(plainLabel)).overflow,
      isNot(TextOverflow.ellipsis),
    );
    expect(
      tester.widget<Text>(find.text(leadingLabel)).overflow,
      isNot(TextOverflow.ellipsis),
    );
    for (final label in [plainLabel, leadingLabel]) {
      final text = tester.widget<Text>(find.text(label));
      expect(text.maxLines, isNull);
      expect(
        tester.getSize(find.text(label)).height,
        greaterThan(text.style!.fontSize! * (text.style!.height ?? 1)),
      );
    }
  });

  testWidgets('CatchToggleInput emits the next value on tap', (tester) async {
    bool? nextValue;

    await tester.pumpWidget(
      _wrap(
        CatchToggleInput(
          value: false,
          semanticLabel: 'Push notifications',
          onChanged: (value) => nextValue = value,
        ),
      ),
    );

    await tester.tap(find.byType(CatchToggleInput));
    await tester.pump();

    expect(nextValue, isTrue);
  });

  testWidgets('CatchCodeInput renders visible digits over one hidden input', (
    tester,
  ) async {
    final controller = TextEditingController();
    addTearDown(controller.dispose);

    await tester.pumpWidget(
      _wrap(
        StatefulBuilder(
          builder: (context, setState) => CatchCodeInput(
            semanticsLabel:
                AppLocalizationsEn().coreCatchOtpCodeFieldSemanticLabel,
            inputKey: const ValueKey('otp-input'),
            controller: controller,
            autofocus: true,
            onChanged: (_) => setState(() {}),
            onSubmitted: (_) {},
          ),
        ),
      ),
    );

    await tester.enterText(find.byKey(const ValueKey('otp-input')), '1234567');
    await tester.pump();

    expect(controller.text, '123456');
    expect(find.byType(CatchCodeInputRow), findsOneWidget);
    expect(find.byType(CatchCodeDigitSurface), findsNWidgets(6));
    expect(find.text('1'), findsOneWidget);
    expect(find.text('6'), findsOneWidget);
    expect(find.text('7'), findsNothing);
  });
}
