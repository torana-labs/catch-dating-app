part of 'catch_primitives_test.dart';

void _registerCatchPrimitivesAsyncFeedbackTests() {
  for (final variant in CatchEmptyStateVariant.values) {
    testWidgets(
      'empty state action list reflows and activates both commands: $variant',
      (tester) async {
        final pressed = <String>[];
        await tester.pumpWidget(
          _wrap(
            SizedBox(
              width: 300,
              child: CatchEmptyState(
                variant: variant,
                title: 'No results',
                actions: [
                  CatchButton(
                    label: 'Explore',
                    onPressed: () => pressed.add('explore'),
                  ),
                  CatchButton(
                    label: 'Change filters',
                    onPressed: () => pressed.add('filters'),
                  ),
                ],
              ),
            ),
            textScale: 2,
          ),
        );
        await tester.tap(find.text('Explore'));
        await tester.tap(find.text('Change filters'));
        expect(pressed, ['explore', 'filters']);
        expect(tester.takeException(), isNull);
      },
    );
  }

  testWidgets('error state keeps retry and every additional recovery command', (
    tester,
  ) async {
    final pressed = <String>[];
    await tester.pumpWidget(
      _wrap(
        SizedBox(
          width: 320,
          child: CatchErrorState(
            title: 'Could not load',
            message: 'Try again.',
            mode: CatchErrorStateMode.compact,
            retryLabel: 'Retry',
            onRetry: () => pressed.add('retry'),
            actions: [
              CatchButton(
                label: 'Go back',
                onPressed: () => pressed.add('back'),
              ),
              CatchButton(label: 'Help', onPressed: () => pressed.add('help')),
            ],
          ),
        ),
        textScale: 2,
      ),
    );
    for (final label in ['Retry', 'Go back', 'Help']) {
      await tester.tap(find.text(label));
    }
    expect(pressed, ['retry', 'back', 'help']);
    expect(tester.takeException(), isNull);
  });
  testWidgets('CatchHeroImage composes fallback and scrim renderers', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(const SizedBox(width: 220, height: 140, child: CatchHeroImage())),
    );

    expect(find.byType(CatchImageFallbackSurface), findsOneWidget);
    expect(find.byType(CatchMediaOverlay), findsOneWidget);

    await tester.pumpWidget(
      _wrap(
        const SizedBox(
          width: 220,
          height: 140,
          child: CatchHeroImage(showScrim: false),
        ),
      ),
    );

    expect(find.byType(CatchImageFallbackSurface), findsOneWidget);
    expect(find.byType(CatchMediaOverlay), findsNothing);
  });

  testWidgets('EventThumbnail composes fallback and scrim renderers', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        const SizedBox(
          width: 220,
          height: 140,
          child: EventThumbnail(
            photoUrl: null,
            pace: PaceLevel.easy,
            activityKind: ActivityKind.socialRun,
          ),
        ),
      ),
    );

    expect(find.byType(EventFallbackThumbnail), findsOneWidget);
    expect(find.byType(CatchMediaOverlay), findsOneWidget);

    await tester.pumpWidget(
      _wrap(
        const SizedBox(
          width: 220,
          height: 140,
          child: EventThumbnail(
            photoUrl: null,
            pace: PaceLevel.easy,
            activityKind: ActivityKind.dinner,
            scrim: CatchMediaOverlayVariant.none,
          ),
        ),
      ),
    );

    expect(find.byType(EventFallbackThumbnail), findsOneWidget);
    expect(find.byType(CatchMediaOverlay), findsNothing);
  });

  testWidgets('CatchMetricSection renders compact labeled data pairs', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        const SizedBox(
          width: 320,
          child: CatchMetricSection(
            items: [
              CatchMetricValue(value: '124', label: 'members'),
              CatchMetricValue(value: '3', label: 'upcoming'),
              CatchMetricValue(value: '4.7', label: 'rating'),
            ],
          ),
        ),
      ),
    );

    expect(find.text('124'), findsOneWidget);
    expect(find.text('members'), findsOneWidget);
    expect(find.text('upcoming'), findsOneWidget);
    expect(find.text('rating'), findsOneWidget);
    expect(
      find.byWidgetPredicate(
        (widget) => widget is CatchMetricTile && widget.item != null,
      ),
      findsNWidgets(3),
    );
    expect(
      find.byWidgetPredicate(
        (widget) => widget is CatchDivider && widget.axis == Axis.vertical,
      ),
      findsNWidgets(2),
    );
  });

  testWidgets('CatchMetricSection stacks data pairs at large text', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        const SizedBox(
          width: 320,
          child: CatchMetricSection(
            items: [
              CatchMetricValue(value: '12', label: 'responses'),
              CatchMetricValue(value: '6', label: 'questions'),
              CatchMetricValue(value: '1', label: 'published version'),
            ],
          ),
        ),
        textScale: 2,
      ),
    );

    expect(
      find.byKey(const ValueKey('catch_metric_strip.reflow')),
      findsOneWidget,
    );
    expect(
      tester.getCenter(find.text('12')).dy,
      lessThan(tester.getCenter(find.text('6')).dy),
    );
    expect(
      tester.getCenter(find.text('6')).dy,
      lessThan(tester.getCenter(find.text('1')).dy),
    );
    expect(
      find.byWidgetPredicate(
        (widget) => widget is CatchDivider && widget.axis == Axis.vertical,
      ),
      findsNothing,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('CatchDaySectionHeader composes count renderer', (tester) async {
    await tester.pumpWidget(
      _wrap(const CatchDaySectionHeader(label: 'Today', count: 3)),
    );

    expect(find.text('TODAY'), findsOneWidget);
    expect(find.byType(CatchCountText), findsOneWidget);
    expect(find.text('3'), findsOneWidget);

    await tester.pumpWidget(
      _wrap(const CatchDaySectionHeader(label: 'Tomorrow')),
    );

    expect(find.byType(CatchCountText), findsNothing);
  });

  testWidgets('CatchStepList numbers instructional rows', (tester) async {
    await tester.pumpWidget(
      _wrap(
        const CatchStepList(
          steps: [
            CatchStepRowData(title: 'Arrive', body: 'Check in with the host.'),
            CatchStepRowData(title: 'Meet', body: 'Start the first round.'),
          ],
        ),
      ),
    );

    expect(find.text('01'), findsOneWidget);
    expect(find.text('02'), findsOneWidget);
    expect(find.text('Arrive'), findsOneWidget);
    expect(find.text('Meet'), findsOneWidget);
  });

  testWidgets('CatchTabBar reveals only the selected label and badges icons', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        CatchTabBar<String>(
          active: 'chats',
          items: const [
            CatchTabBarItem(
              id: 'home',
              icon: Icons.home_outlined,
              label: 'Home',
            ),
            CatchTabBarItem(
              id: 'chats',
              icon: Icons.chat_bubble_outline,
              activeIcon: Icons.chat_bubble,
              label: 'Chats',
              badgeCount: 104,
            ),
          ],
          onChanged: (_) {},
        ),
      ),
    );

    expect(find.byType(CatchNavigationButton<String>), findsNWidgets(2));
    expect(find.byIcon(Icons.home_outlined), findsOneWidget);
    expect(find.byIcon(Icons.chat_bubble), findsOneWidget);
    expect(find.text('Home'), findsNothing);
    expect(find.text('Chats'), findsOneWidget);
    expect(find.text('99+'), findsOneWidget);
  });

  testWidgets('CatchTabBar keeps four animated destinations within 390px', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(390, 844);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);

    var active = 'home';
    await tester.pumpWidget(
      _wrap(
        StatefulBuilder(
          builder: (context, setState) => CatchTabBar<String>(
            active: active,
            items: const [
              CatchTabBarItem(id: 'home', icon: Icons.home, label: 'Home'),
              CatchTabBarItem(
                id: 'explore',
                icon: Icons.explore,
                label: 'Explore',
              ),
              CatchTabBarItem(id: 'chats', icon: Icons.chat, label: 'Chats'),
              CatchTabBarItem(id: 'profile', icon: Icons.person, label: 'You'),
            ],
            onChanged: (next) => setState(() => active = next),
          ),
        ),
      ),
    );

    final originalElements = <String, Element>{
      for (final id in const ['home', 'explore', 'chats', 'profile'])
        id: tester.element(
          find.byKey(ValueKey<Object>('catch_tab_bar.slot.$id')),
        ),
    };
    await tester.tap(find.bySemanticsLabel('Explore'));
    await pumpFeatureUi(tester);
    expect(tester.takeException(), isNull);
    expect(find.text('Explore'), findsOneWidget);
    for (final entry in originalElements.entries) {
      expect(
        identical(
          entry.value,
          tester.element(
            find.byKey(ValueKey<Object>('catch_tab_bar.slot.${entry.key}')),
          ),
        ),
        isTrue,
        reason: '${entry.key} should keep its element while selection moves',
      );
    }

    final iconRect = tester.getRect(
      find.descendant(
        of: find.byKey(const ValueKey<Object>('catch_tab_bar.pill.explore')),
        matching: find.byIcon(Icons.explore),
      ),
    );
    final labelRect = tester.getRect(find.text('Explore'));
    expect(iconRect.center.dy, closeTo(labelRect.center.dy, 0.5));

    await tester.tap(find.bySemanticsLabel('You'));
    await pumpFeatureUi(tester);
    final compactWidths = const ['home', 'explore', 'chats']
        .map(
          (id) => tester
              .getRect(find.byKey(ValueKey<Object>('catch_tab_bar.slot.$id')))
              .width,
        )
        .toList();
    expect(compactWidths[0], closeTo(compactWidths[1], 0.5));
    expect(compactWidths[1], closeTo(compactWidths[2], 0.5));
  });

  testWidgets('CatchSection.horizontal is embedded and chromeless by default', (
    tester,
  ) async {
    const railKey = ValueKey('embedded-rail');

    await tester.pumpWidget(
      _wrap(
        SizedBox(
          key: railKey,
          width: 360,
          child: CatchSection.horizontal(
            title: 'Recommended',
            itemCount: 1,
            itemBuilder: (context, index) =>
                const SizedBox(width: 48, height: 48, child: Text('Item 1')),
          ),
        ),
      ),
    );

    final railLeft = tester.getTopLeft(find.byKey(railKey)).dx;

    expect(tester.getTopLeft(find.text('Recommended')).dx, railLeft);
    expect(tester.getTopLeft(find.text('Item 1')).dx, railLeft);
    expect(find.byType(CatchDivider), findsNothing);
  });

  testWidgets(
    'CatchSection.horizontal fullBleed owns rail gutters and divider',
    (tester) async {
      const railKey = ValueKey('full-bleed-rail');

      await tester.pumpWidget(
        _wrap(
          SizedBox(
            key: railKey,
            width: 360,
            child: CatchSection.horizontal(
              title: 'Recommended',
              itemCount: 1,
              fullBleed: true,
              itemBuilder: (context, index) =>
                  const SizedBox(width: 48, height: 48, child: Text('Item 1')),
            ),
          ),
        ),
      );

      final railLeft = tester.getTopLeft(find.byKey(railKey)).dx;

      expect(
        tester.getTopLeft(find.text('Recommended')).dx - railLeft,
        CatchSpacing.screenPx,
      );
      expect(
        tester.getTopLeft(find.text('Item 1')).dx - railLeft,
        CatchSpacing.screenPx,
      );
      expect(find.byType(CatchDivider), findsOneWidget);
    },
  );

  testWidgets('CatchPageBody owns the scrolling page gutter', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: const Scaffold(
          body: SizedBox(
            width: 320,
            height: 480,
            child: CatchPageBody.screen(
              pt: CatchSpacing.s2,
              pb: CatchSpacing.s8,
              child: SizedBox(height: 900, child: Text('Body')),
            ),
          ),
        ),
      ),
    );

    final bodyFinder = find.byType(CatchPageBody);
    final padding = tester.widget<Padding>(
      find.descendant(
        of: bodyFinder,
        matching: find.byWidgetPredicate(
          (widget) =>
              widget is Padding &&
              widget.child is CatchFieldInteractionPlaneScope,
        ),
      ),
    );
    final minHeight = tester.widget<ConstrainedBox>(
      find
          .descendant(of: bodyFinder, matching: find.byType(ConstrainedBox))
          .first,
    );

    expect(find.byType(SingleChildScrollView), findsOneWidget);
    expect(
      padding.padding,
      const EdgeInsets.fromLTRB(
        CatchSpacing.screenPx,
        CatchSpacing.s2,
        CatchSpacing.screenPx,
        CatchSpacing.s8,
      ),
    );
    expect(minHeight.constraints.minHeight, 480);
  });

  testWidgets('CatchPageBody can drop the gutter without owning scroll', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        const CatchPageBody.screen(
          gutter: false,
          variant: CatchPageBodyVariant.fixed,
          child: Text('Full bleed body'),
        ),
      ),
    );

    final padding = tester.widget<Padding>(
      find
          .descendant(
            of: find.byType(CatchPageBody),
            matching: find.byType(Padding),
          )
          .first,
    );

    expect(find.byType(SingleChildScrollView), findsNothing);
    expect(
      padding.padding,
      const EdgeInsets.fromLTRB(
        CatchSpacing.s0,
        CatchSpacing.screenPt,
        CatchSpacing.s0,
        CatchSpacing.screenPb,
      ),
    );
  });

  testWidgets('compact core atoms render with shared primitives', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        SizedBox(
          width: 320,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CatchMetaRow.group(
                entries: [
                  CatchMetaEntry(label: 'Tonight', icon: CatchIcons.date),
                  const CatchMetaEntry(label: 'Bandra'),
                ],
                trailing: const CatchMetaEntry(label: '2.3 km'),
              ),
              gapH12,
              CatchField.read(
                copy: catchFieldCopy(AppLocalizationsEn()),
                title: 'Payment ID',
                body: 'pay_123',
              ),
              gapH12,
              const CatchMetricTile(
                value: '24',
                label: 'members',
                center: true,
              ),
              gapH12,
              const CatchGradedImage(
                enabled: false,
                child: SizedBox.square(
                  dimension: 12,
                  child: ColoredBox(color: Colors.red),
                ),
              ),
            ],
          ),
        ),
      ),
    );

    expect(find.text('Tonight'), findsOneWidget);
    expect(find.text('Bandra'), findsOneWidget);
    expect(find.text('2.3 km'), findsOneWidget);
    expect(
      find.byWidgetPredicate(
        (widget) =>
            widget is CatchMetaRow &&
            widget.variant == CatchMetaRowVariant.flow,
      ),
      findsOneWidget,
    );
    expect(
      find.byWidgetPredicate(
        (widget) =>
            widget is CatchMetaRow &&
            widget.variant == CatchMetaRowVariant.entry,
      ),
      findsNWidgets(3),
    );
    expect(find.text('Payment ID'), findsOneWidget);
    expect(find.text('pay_123'), findsOneWidget);
    expect(find.text('24'), findsOneWidget);
    expect(find.text('members'), findsOneWidget);
    expect(find.byType(ListTile), findsNothing);
  });

  testWidgets('SplashScreen delays slow-boot spinner', (tester) async {
    await tester.pumpWidget(
      MaterialApp(theme: AppTheme.light, home: const SplashScreen()),
    );

    expect(find.bySemanticsLabel('Catch'), findsOneWidget);
    final logo = tester.widget<Image>(_startupLogoFinder);
    expect((logo.image as AssetImage).assetName, SplashScreen.lightIconAsset);
    expect(find.byType(CatchLoadingIndicator), findsNothing);

    await tester.pump(CatchMotion.startupIndicatorDelay);
    await tester.pump(CatchMotion.fast);

    expect(find.byType(CatchLoadingIndicator), findsOneWidget);
  });

  testWidgets('SplashScreen uses dark splash mark in dark mode', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(theme: AppTheme.dark, home: const SplashScreen()),
    );

    final logo = tester.widget<Image>(_startupLogoFinder);
    expect((logo.image as AssetImage).assetName, SplashScreen.darkIconAsset);
  });

  testWidgets('CatchSurface supports padding, fixed size, and tap handling', (
    tester,
  ) async {
    var tapped = false;

    await tester.pumpWidget(
      _wrap(
        CatchSurface(
          width: 180,
          padding: const EdgeInsets.all(16),
          tone: CatchSurfaceTone.raised,
          borderRole: CatchBorderRole.boundary,
          onTap: () => tapped = true,
          child: const Text('Surface content'),
        ),
      ),
    );

    expect(find.text('Surface content'), findsOneWidget);
    expect(tester.getSize(find.byType(CatchSurface)).width, 180);

    await tester.tap(find.text('Surface content'));
    await tester.pump();
    expect(tapped, isTrue);
  });

  testWidgets('CatchSurface.card renders the handoff card surface', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(const CatchSurface.card(width: 240, child: Text('Panel content'))),
    );

    final panelSurface = tester.widget<CatchSurface>(find.byType(CatchSurface));
    expect(find.text('Panel content'), findsOneWidget);
    expect(panelSurface.width, 240);
    expect(panelSurface.padding, CatchInsets.contentRelaxed);
    expect(panelSurface.radius, CatchRadius.md);
    expect(panelSurface.emphasis, CatchSurfaceEmphasis.subtle);
  });

  testWidgets('CatchBanner renders inline title and tone content', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        const CatchBanner(
          title: 'Host tip',
          message: 'Keep the first message short and specific.',
          tone: CatchBannerTone.warning,
        ),
      ),
    );

    final messageSurfaceFinder = find.byType(CatchBanner);
    final renderedSurfaceFinder = find.descendant(
      of: messageSurfaceFinder,
      matching: find.byType(CatchSurface),
    );
    final messageSurface = tester.widget<CatchBanner>(messageSurfaceFinder);
    final renderedSurface = tester.widget<CatchSurface>(renderedSurfaceFinder);
    expect(find.text('Host tip'), findsOneWidget);
    expect(
      find.text('Keep the first message short and specific.'),
      findsOneWidget,
    );
    expect(messageSurfaceFinder, findsOneWidget);
    expect(renderedSurfaceFinder, findsOneWidget);
    expect(messageSurface.variant, CatchBannerVariant.message);
    expect(renderedSurface.radius, CatchRadius.md);
  });

  testWidgets('CatchEmptyState defaults to the handoff quiet placeholder', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        CatchEmptyState(
          icon: CatchIcons.search,
          title: 'Nothing here yet',
          message: 'Try another filter or check back soon.',
          actions: [CatchButton(label: 'Browse events', onPressed: () {})],
        ),
      ),
    );

    expect(find.byType(CatchSurface), findsNothing);
    expect(find.byType(CatchEmptyState), findsOneWidget);
    expect(find.byType(CatchIconTile), findsOneWidget);

    final icon = tester.widget<Icon>(find.byIcon(CatchIcons.search));
    final title = tester.widget<Text>(find.text('Nothing here yet'));
    final message = tester.widget<Text>(
      find.text('Try another filter or check back soon.'),
    );
    final titleContext = tester.element(find.text('Nothing here yet'));
    final messageContext = tester.element(
      find.text('Try another filter or check back soon.'),
    );

    expect(icon.size, 34);
    expect(icon.color, CatchTokens.editorialLight.ink3);
    expect(
      title.style?.fontSize,
      CatchTextStyles.sectionTitle(titleContext).fontSize,
    );
    expect(
      message.style?.fontSize,
      CatchTextStyles.bodyS(messageContext).fontSize,
    );
    expect(message.style?.color, CatchTokens.editorialLight.ink2);
    expect(find.text('Browse events'), findsOneWidget);
  });

  testWidgets('CatchSheet renders the handoff plain sheet', (tester) async {
    await tester.pumpWidget(
      _wrap(
        CatchSheet(
          title: 'Filters',
          subtitle: 'Tune what shows up first.',
          badge: '2',
          badgeTone: CatchBadgeTone.gold,
          footer: CatchButton(label: 'Apply', onPressed: () {}),
          child: const Text('Sheet body'),
        ),
      ),
    );

    expect(find.byType(CatchSheetDragIndicator), findsOneWidget);
    expect(
      find.byWidgetPredicate(
        (widget) =>
            widget is CatchSheetHeader &&
            widget.variant == CatchSheetHeaderVariant.plain,
      ),
      findsOneWidget,
    );
    expect(
      find.byWidgetPredicate(
        (widget) =>
            widget is CatchSheetHeader &&
            widget.variant == CatchSheetHeaderVariant.branded,
      ),
      findsNothing,
    );
    expect(find.text('Filters'), findsOneWidget);
    expect(find.text('Tune what shows up first.'), findsOneWidget);
    expect(find.widgetWithText(CatchBadge, '2'), findsOneWidget);
    expect(find.text('Sheet body'), findsOneWidget);
    expect(find.text('Apply'), findsOneWidget);
  });

  testWidgets('CatchSheet renders the branded sheet header', (tester) async {
    await tester.pumpWidget(
      _wrap(
        CatchSheet(
          title: 'Set up payouts',
          subtitle: 'Powered by Stripe',
          glyph: CatchIcons.host,
          trailing: const Text('Soon'),
          grabber: false,
          child: const Text('Stripe body'),
        ),
      ),
    );

    expect(find.byType(CatchSheetDragIndicator), findsNothing);
    expect(
      find.byWidgetPredicate(
        (widget) =>
            widget is CatchSheetHeader &&
            widget.variant == CatchSheetHeaderVariant.plain,
      ),
      findsNothing,
    );
    expect(
      find.byWidgetPredicate(
        (widget) =>
            widget is CatchSheetHeader &&
            widget.variant == CatchSheetHeaderVariant.branded,
      ),
      findsOneWidget,
    );
    final glyph = tester.widget<Icon>(find.byIcon(CatchIcons.host));
    expect(glyph.size, CatchLayout.sheetGlyphIconSize);
    expect(glyph.color, CatchTokens.editorialLight.primaryInk);
    expect(find.text('Set up payouts'), findsOneWidget);
    expect(find.text('Powered by Stripe'), findsOneWidget);
    expect(find.text('Soon'), findsOneWidget);
    expect(find.text('Stripe body'), findsOneWidget);
  });

  testWidgets('CatchSheet reserves device inset plus terminal gap', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        const MediaQuery(
          data: MediaQueryData(viewPadding: EdgeInsets.only(bottom: 34)),
          child: CatchSheet(grabber: false, child: Text('Sheet body')),
        ),
      ),
    );

    expect(
      _bottomSheetContentPadding(tester),
      const EdgeInsets.fromLTRB(
        CatchLayout.sheetHorizontalPadding,
        CatchLayout.sheetTopPadding,
        CatchLayout.sheetHorizontalPadding,
        34 + CatchLayout.sheetBottomSafeAreaGap,
      ),
    );
  });

  testWidgets('CatchSheet keeps the visual minimum without an inset', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        const MediaQuery(
          data: MediaQueryData(),
          child: CatchSheet(grabber: false, child: Text('Sheet body')),
        ),
      ),
    );

    expect(
      _bottomSheetContentPadding(tester).bottom,
      CatchLayout.sheetBottomPadding,
    );
  });

  testWidgets('CatchSheet uses keyboard obstruction when requested', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        const MediaQuery(
          data: MediaQueryData(
            viewPadding: EdgeInsets.only(bottom: 34),
            viewInsets: EdgeInsets.only(bottom: 300),
          ),
          child: CatchSheet(
            grabber: false,
            keyboardSafe: true,
            child: Text('Sheet body'),
          ),
        ),
      ),
    );

    expect(
      _bottomSheetContentPadding(tester).bottom,
      300 + CatchLayout.sheetBottomSafeAreaGap,
    );
  });

  testWidgets('CatchSheet enforces terminal space with custom padding', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        const MediaQuery(
          data: MediaQueryData(viewPadding: EdgeInsets.only(bottom: 34)),
          child: CatchSheet(
            grabber: false,
            padding: EdgeInsetsDirectional.fromSTEB(12, 8, 20, 0),
            child: Text('Sheet body'),
          ),
        ),
      ),
    );

    expect(
      _bottomSheetContentPadding(tester),
      const EdgeInsets.fromLTRB(
        12,
        8,
        20,
        34 + CatchLayout.sheetBottomSafeAreaGap,
      ),
    );
  });

  testWidgets(
    'CatchSurface disables chrome animation when reduced motion is on',
    (tester) async {
      await tester.pumpWidget(
        _wrap(
          const MediaQuery(
            data: MediaQueryData(disableAnimations: true),
            child: CatchSurface.card(child: Text('Panel')),
          ),
        ),
      );

      final surface = tester.widget<AnimatedContainer>(
        find.descendant(
          of: find.byType(CatchSurface),
          matching: find.byType(AnimatedContainer),
        ),
      );

      expect(surface.duration, Duration.zero);
    },
  );

  testWidgets('CatchFrameworkErrorState renders branded recovery UI', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        CatchFrameworkErrorState(
          copy: catchFrameworkErrorCopy(AppLocalizationsEn()),
          details: FlutterErrorDetails(exception: StateError('boom')),
          showDebugDetails: false,
        ),
      ),
    );

    expect(find.text('Something went wrong'), findsOneWidget);
    expect(
      find.textContaining('This screen hit a temporary app error'),
      findsOneWidget,
    );
    expect(find.text('Developer details'), findsNothing);
    expect(find.textContaining('boom'), findsNothing);
  });

  testWidgets('CatchIconTile.error renders the shared branded medallion', (
    tester,
  ) async {
    await tester.pumpWidget(_wrap(const CatchIconTile.error()));

    expect(find.byType(CatchIconTile), findsOneWidget);
    expect(find.byIcon(CatchIcons.error), findsOneWidget);
  });

  testWidgets(
    'CatchMetadataText renders compact metadata with overflow guard',
    (tester) async {
      await tester.pumpWidget(
        _wrap(const CatchMetadataText('TODAY AT 7 PM', color: Colors.black)),
      );

      final text = tester.widget<Text>(find.text('TODAY AT 7 PM'));
      expect(text.maxLines, 1);
      expect(text.overflow, TextOverflow.ellipsis);
    },
  );

  testWidgets('CatchFrameworkErrorState can expose debug details', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        CatchFrameworkErrorState(
          copy: catchFrameworkErrorCopy(AppLocalizationsEn()),
          details: FlutterErrorDetails(exception: StateError('boom')),
        ),
      ),
    );

    expect(find.text('Developer details'), findsOneWidget);
    expect(find.byType(CatchErrorDetailsAccordion), findsOneWidget);
    expect(find.byType(ExpansionTile), findsNothing);
    await tester.tap(find.text('Developer details'));
    await pumpFeatureUi(tester);
    expect(find.textContaining('Bad state: boom'), findsOneWidget);
  });

  testWidgets('CatchErrorDetailsAccordion renders expanded details', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        CatchErrorDetailsAccordion(
          label: AppLocalizationsEn()
              .coreCatchFrameworkErrorViewTextDeveloperDetails,
          details: 'debug exception details',
          initiallyExpanded: true,
        ),
      ),
    );

    expect(find.text('Developer details'), findsOneWidget);
    expect(find.text('debug exception details'), findsOneWidget);
  });

  testWidgets('debug disclosure honors reduced motion', (tester) async {
    await tester.pumpWidget(
      _wrap(
        const MediaQuery(
          data: MediaQueryData(disableAnimations: true),
          child: CatchErrorDetailsAccordion(
            label: 'Developer details',
            details: 'debug exception details',
          ),
        ),
      ),
    );

    final disclosure = find.byType(CatchErrorDetailsAccordion);
    await tester.tap(find.text('Developer details'));
    await tester.pump();
    expect(find.text('debug exception details').hitTestable(), findsOneWidget);
    final initialBounds = tester.getRect(find.text('debug exception details'));
    await tester.pump(CatchMotion.fast);
    expect(tester.getRect(find.text('debug exception details')), initialBounds);
    expect(
      tester
          .widget<AnimatedRotation>(
            find.descendant(
              of: disclosure,
              matching: find.byType(AnimatedRotation),
            ),
          )
          .duration,
      Duration.zero,
    );
    await tester.tap(find.text('Developer details'));
    await tester.pump();
    expect(find.text('debug exception details'), findsNothing);
    expect(tester.takeException(), isNull);
  });
}

EdgeInsets _bottomSheetContentPadding(WidgetTester tester) {
  return tester
          .widget<Padding>(
            find.byKey(
              const ValueKey<String>('catch-bottom-sheet-content-padding'),
            ),
          )
          .padding
      as EdgeInsets;
}
