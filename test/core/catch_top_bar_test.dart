import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';

void main() {
  testWidgets('identity chrome reserves scaled name and control padding', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: const MediaQuery(
          data: MediaQueryData(
            size: Size(800, 600),
            textScaler: TextScaler.linear(2),
          ),
          child: Scaffold(
            body: Column(
              children: [
                CatchTopBar.identity(
                  identityName: 'Riya Mehta',
                  identitySemanticLabel: 'Riya Mehta',
                ),
              ],
            ),
          ),
        ),
      ),
    );
    final bar = tester.getRect(find.byType(CatchTopBar));
    final name = tester.getRect(find.text('Riya Mehta'));
    expect(bar.contains(name.topLeft), isTrue);
    expect(name.bottom, lessThanOrEqualTo(bar.bottom));
    expect(tester.takeException(), isNull);
    final context = tester.element(find.byType(CatchTopBar));
    expect(
      tester
          .widget<CatchTopBar>(find.byType(CatchTopBar))
          .preferredSizeFor(context)
          .height,
      bar.height,
    );
  });

  testWidgets('CatchTopBar renders the handoff-sized title row', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        const CatchTopBar.route(
          title: 'Settings',
          navigation: CatchTopBarNavigation(
            mode: CatchTopBarNavigationMode.none,
          ),
          emphasis: CatchTopBarEmphasis.divided,
        ),
      ),
    );

    expect(find.text('Settings'), findsOneWidget);
    expect(tester.getSize(find.byType(CatchTopBar)).height, 56);
    expect(
      tester.widget<Text>(find.text('Settings')).style,
      CatchTextStyles.titleL(
        tester.element(find.text('Settings')),
        color: CatchTokens.of(tester.element(find.text('Settings'))).ink,
      ),
    );
    final titleStyle = tester.widget<Text>(find.text('Settings')).style!;
    expect(
      titleStyle.fontFamily,
      CatchFonts.functionFamilyForPlatform(defaultTargetPlatform, fontSize: 20),
    );
    expect(titleStyle.fontSize, 20);
    expect(
      titleStyle.fontWeight,
      CatchPlatformTokens.typography.title.fontWeight,
    );
    expect(titleStyle.height, CatchPlatformTokens.typography.title.height);
    expect(find.byType(CatchIconAction), findsNothing);
    expect(
      _topBarMaterial(tester).color,
      AppTheme.light.scaffoldBackgroundColor,
    );
    expect(_topBarBorder(tester).bottom.style, BorderStyle.solid);
  });

  testWidgets('CatchTopBar surface selection does not imply a divider', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        const CatchTopBar.route(
          title: 'Settings',
          navigation: CatchTopBarNavigation(
            mode: CatchTopBarNavigationMode.none,
          ),
          tone: CatchTopBarTone.surface,
        ),
      ),
    );

    expect(_topBarMaterial(tester).color, CatchTokens.editorialLight.surface);
    expect(_topBarBorder(tester).bottom.style, BorderStyle.none);
  });

  testWidgets('CatchTopBar keeps identity-name titles in the function family', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        const CatchTopBar.route(
          title: 'Aarav Shah',
          navigation: CatchTopBarNavigation(
            mode: CatchTopBarNavigationMode.none,
          ),
        ),
      ),
    );

    final titleContext = tester.element(find.text('Aarav Shah'));
    expect(
      tester.widget<Text>(find.text('Aarav Shah')).style,
      CatchTextStyles.titleL(
        titleContext,
        color: CatchTokens.of(titleContext).ink,
      ),
    );
  });

  testWidgets(
    'CatchTopBar places context below the task title in the function family',
    (tester) async {
      await tester.pumpWidget(
        _wrap(
          const CatchTopBar.route(
            title: 'Event preparation',
            subtitle: 'Sunday Evening Run',
            navigation: CatchTopBarNavigation(
              mode: CatchTopBarNavigationMode.none,
            ),
          ),
        ),
      );

      expect(find.text('Event preparation'), findsOneWidget);
      expect(find.text('EVENT PREPARATION'), findsNothing);
      final eyebrowContext = tester.element(find.text('Event preparation'));
      expect(
        tester.widget<Text>(find.text('Event preparation')).style,
        CatchTextStyles.titleL(
          eyebrowContext,
          color: CatchTokens.of(eyebrowContext).ink,
        ),
      );
      final titleContext = tester.element(find.text('Sunday Evening Run'));
      expect(
        tester.widget<Text>(find.text('Sunday Evening Run')).style,
        CatchTextStyles.bodyS(
          titleContext,
          color: CatchTokens.of(titleContext).ink2,
        ),
      );
      expect(
        tester.getTopLeft(find.text('Event preparation')).dy,
        lessThan(tester.getTopLeft(find.text('Sunday Evening Run')).dy),
      );
    },
  );

  testWidgets('CatchTopBar root uses the platform headline scale', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrapScreenTopBar(title: 'Activity', subtitle: 'Notifications'),
    );

    final titleContext = tester.element(find.text('Activity'));
    expect(find.byType(CatchTopBar), findsOneWidget);
    expect(tester.getSize(find.byType(CatchTopBar)).height, 56);
    expect(
      tester.widget<Text>(find.text('Activity')).style,
      CatchTextStyles.headline(
        titleContext,
        color: CatchTokens.of(titleContext).ink,
      ),
    );
    expect(find.text('Notifications'), findsOneWidget);
  });

  testWidgets('CatchRouteScaffold reveals its divider only after scroll', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: CatchRouteScaffold(
          topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
            title: 'Payment history',
            navigation: const CatchTopBarNavigation(
              mode: CatchTopBarNavigationMode.back,
            ),
            emphasis: scrolledUnder
                ? CatchTopBarEmphasis.divided
                : CatchTopBarEmphasis.plain,
          ),
          body: CatchRouteBody.fullBleed(
            child: ListView.builder(
              itemCount: 40,
              itemBuilder: (_, index) =>
                  SizedBox(height: 48, child: Text('Payment $index')),
            ),
          ),
        ),
      ),
    );

    expect(_topBarBorder(tester).bottom.style, BorderStyle.none);
    await tester.drag(find.byType(ListView), const Offset(0, -180));
    await tester.pump();
    expect(_topBarBorder(tester).bottom.style, BorderStyle.solid);
  });

  testWidgets('CatchTopBar inherits the accessible text scale', (tester) async {
    await tester.pumpWidget(_wrapScreenTopBar(title: 'Chats', textScale: 2));

    final titleContext = tester.element(find.text('Chats'));
    expect(MediaQuery.textScalerOf(titleContext).scale(1), 2);
    expect(
      tester.getSize(find.byType(CatchTopBar)).height,
      greaterThan(CatchLayout.topBarHeight),
    );
  });

  testWidgets('CatchTopBar reflows actions below its large-text title', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrapScreenTopBar(
        title: 'Customers',
        textScale: 2,
        actions: [
          CatchTopBarPrimaryButton(
            key: const ValueKey('add-customer'),
            label: 'Add customer',
            icon: CatchIcons.personAddAlt1Rounded,
            onPressed: () {},
          ),
        ],
        search: CatchTopBarSearch(
          copy: catchSearchFieldCopy(AppLocalizationsEn()),
          placeholder: 'Search customers',
          tooltip: 'Search customers',
        ),
      ),
    );

    final title = tester.widget<Text>(find.text('Customers'));
    expect(title.overflow, TextOverflow.ellipsis);
    expect(
      tester.getTopLeft(find.text('Customers')).dy,
      lessThan(
        tester.getTopLeft(find.byKey(const ValueKey('add-customer'))).dy,
      ),
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'CatchTopBar reserves two subtitle lines at large text with search',
    (tester) async {
      await tester.pumpWidget(
        _wrapScreenTopBar(
          title: 'Messaging',
          subtitle:
              'Guest conversations, event announcements, and campaign work',
          textScale: 1.5,
          search: CatchTopBarSearch(
            copy: catchSearchFieldCopy(AppLocalizationsEn()),
            placeholder: 'Search conversations',
            tooltip: 'Search conversations',
          ),
        ),
      );

      expect(find.text('Messaging'), findsOneWidget);
      expect(
        find.text(
          'Guest conversations, event announcements, and campaign work',
        ),
        findsOneWidget,
      );
      expect(
        tester
            .widget<Text>(
              find.text(
                'Guest conversations, event announcements, and campaign work',
              ),
            )
            .maxLines,
        2,
      );
      expect(find.byIcon(CatchIcons.search), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('Root app bars wrap long titles at accessible text sizes', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrapScreenTopBar(title: 'Good evening, Mira', textScale: 2),
    );
    expect(tester.widget<Text>(find.text('Good evening, Mira')).maxLines, 2);
    expect(tester.takeException(), isNull);
  });

  testWidgets('CatchTopBar wires leading and action controls', (tester) async {
    var backTaps = 0;
    var actionTaps = 0;

    await tester.pumpWidget(
      _wrap(
        CatchTopBar.route(
          title: 'Profile',
          navigation: CatchTopBarNavigation(
            mode: CatchTopBarNavigationMode.back,
            onPressed: () => backTaps++,
          ),

          actions: [
            CatchIconAction.toolbar(
              icon: CatchIcons.settingsOutlined,
              tooltip: 'Settings',
              onPressed: () => actionTaps++,
            ),
          ],
        ),
      ),
    );

    expect(find.byType(CatchIconAction), findsNWidgets(2));

    await tester.tap(find.byIcon(CatchIcons.arrowBackIosNewRounded));
    await tester.pump();
    expect(backTaps, 1);

    await tester.tap(find.byIcon(CatchIcons.settingsOutlined));
    await tester.pump();
    expect(actionTaps, 1);
  });

  testWidgets('CatchTopBarActionRow owns peer gaps and trailing gutter', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(390, 800);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      _wrap(
        CatchTopBar.route(
          title: 'Home',
          navigation: const CatchTopBarNavigation(
            mode: CatchTopBarNavigationMode.none,
          ),
          actions: [
            CatchIconAction.toolbar(
              key: const ValueKey('top-action-share'),
              icon: CatchIcons.share,
              tooltip: 'Share',
              onPressed: () {},
            ),
            CatchIconAction.toolbar(
              key: const ValueKey('top-action-save'),
              icon: CatchIcons.savedOutlined,
              tooltip: 'Save',
              onPressed: () {},
            ),
          ],
        ),
      ),
    );

    final first = tester.getRect(
      find.byKey(const ValueKey('top-action-share')),
    );
    final second = tester.getRect(
      find.byKey(const ValueKey('top-action-save')),
    );
    expect(second.left - first.right, CatchSpacing.s2);
    expect(390 - second.right, CatchSpacing.screenPx);
    expect(find.byType(CatchTopBarActionRow), findsOneWidget);
  });

  testWidgets('Root app bars use the same action group', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: const Scaffold(
          body: SizedBox(
            width: 390,
            child: CatchTopBar.primaryRail(
              title: 'Your profile',
              actions: [
                SizedBox.square(
                  key: ValueKey('header-action-one'),
                  dimension: 40,
                ),
                SizedBox.square(
                  key: ValueKey('header-action-two'),
                  dimension: 40,
                ),
              ],
            ),
          ),
        ),
      ),
    );

    final first = tester.getRect(
      find.byKey(const ValueKey('header-action-one')),
    );
    final second = tester.getRect(
      find.byKey(const ValueKey('header-action-two')),
    );
    expect(second.left - first.right, CatchSpacing.s2);
  });

  testWidgets('CatchIconAction uses the shared app-bar nav extent by default', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: Center(
            child: CatchIconAction.toolbar(
              icon: CatchIcons.settingsOutlined,
              tooltip: 'Settings',
              onPressed: () {},
            ),
          ),
        ),
      ),
    );

    expect(
      tester.getSize(find.byType(CatchIconAction)),
      Size.square(CatchIconAction.targetExtentFor(CatchIconAction.navSize)),
    );
    expect(
      tester.widget<Icon>(find.byIcon(CatchIcons.settingsOutlined)).size,
      CatchIcon.md,
    );
    expect(find.bySemanticsLabel('Settings'), findsOneWidget);
  });

  testWidgets(
    'CatchTopBarPrimaryButton compacts to the icon action on phones',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(390, 800);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);
      var taps = 0;

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: Center(
              child: CatchTopBarPrimaryButton(
                label: 'Create event',
                icon: CatchIcons.addRounded,
                onPressed: () => taps += 1,
              ),
            ),
          ),
        ),
      );

      expect(find.byType(CatchIconAction), findsOneWidget);
      expect(find.byType(CatchButton), findsNothing);
      expect(
        tester.getSize(find.byType(CatchIconAction)),
        Size.square(CatchIconAction.targetExtentFor(CatchIconAction.navSize)),
      );
      expect(find.byTooltip('Create event'), findsOneWidget);
      await tester.tap(find.byType(CatchIconAction));
      await tester.pump();
      expect(taps, 1);
    },
  );

  testWidgets('CatchTopBarPrimaryButton keeps its label beyond phone width', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(800, 800);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: Center(
            child: CatchTopBarPrimaryButton(
              label: 'Create event',
              icon: CatchIcons.addRounded,
            ),
          ),
        ),
      ),
    );

    expect(
      find.widgetWithText(CatchToolbarButton, 'Create event'),
      findsOneWidget,
    );
    expect(find.byType(CatchIconAction), findsNothing);
  });

  testWidgets('CatchTopBarActionRow rejects a direct body-style pill', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: CatchTopBarActionRow(
            actions: [CatchButton(label: 'Invalid', onPressed: () {})],
          ),
        ),
      ),
    );

    final exception = tester.takeException();
    expect(exception, isA<FlutterError>());
    expect(exception.toString(), contains('direct top-bar action'));
  });

  testWidgets(
    'CatchTopBar identity supports profile navigation and text actions',
    (tester) async {
      var saved = false;

      await tester.pumpWidget(
        _wrap(
          CatchTopBar.identity(
            identityName: 'Aarav',
            identitySemanticLabel: 'View Aarav profile',
            navigation: const CatchTopBarNavigation(
              mode: CatchTopBarNavigationMode.none,
            ),
            actions: [
              CatchButton.text(label: 'Save', onPressed: () => saved = true),
            ],
          ),
        ),
      );

      expect(find.byType(CatchAvatar), findsOneWidget);
      expect(find.text('Aarav'), findsOneWidget);

      await tester.tap(find.text('Save'));
      await tester.pump();
      expect(saved, isTrue);
    },
  );

  testWidgets('CatchTopBar constrains text actions at large text scale', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrapWithTextScale(
        CatchTopBar.route(
          title: 'Activity',
          navigation: const CatchTopBarNavigation(
            mode: CatchTopBarNavigationMode.none,
          ),
          actions: [CatchButton.text(label: 'Mark all read', onPressed: () {})],
        ),
        textScale: 2,
      ),
    );

    expect(tester.takeException(), isNull);
    expect(find.text('Activity'), findsOneWidget);
    expect(find.text('Mark all read'), findsOneWidget);
  });

  testWidgets('CatchTopBar constrains compact subtitle at large text scale', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrapWithTextScale(
        const CatchTopBar.route(
          title: 'Professional profile',
          subtitle: 'Active professional profile',
          navigation: CatchTopBarNavigation(
            mode: CatchTopBarNavigationMode.none,
          ),
        ),
        textScale: 2,
      ),
    );

    expect(tester.takeException(), isNull);
    expect(find.text('Professional profile'), findsOneWidget);
    expect(find.text('Active professional profile'), findsOneWidget);
  });

  testWidgets('CatchTopBar constrains large subtitle at large text scale', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrapWithTextScale(
        const CatchTopBar.route(
          title: 'Create event',
          subtitle: 'Add the details guests need before they book',
          navigation: CatchTopBarNavigation(
            mode: CatchTopBarNavigationMode.none,
          ),
        ),
        textScale: 2,
      ),
    );

    expect(tester.takeException(), isNull);
    expect(find.text('HOST EVENT'), findsNothing);
    expect(find.text('Create event'), findsOneWidget);
    expect(
      find.text('Add the details guests need before they book'),
      findsOneWidget,
    );
  });

  testWidgets('CatchTopBar context uses the shared route geometry', (
    tester,
  ) async {
    var closed = false;
    var done = false;

    await tester.pumpWidget(
      _wrap(
        CatchTopBar.route(
          title: 'Discover',
          subtitle: 'Tonight near you',
          navigation: CatchTopBarNavigation(
            mode: CatchTopBarNavigationMode.close,
            onPressed: () => closed = true,
          ),

          actions: [
            CatchButton.text(label: 'Done', onPressed: () => done = true),
          ],
          tone: CatchTopBarTone.surface,
        ),
      ),
    );

    expect(
      tester.getSize(find.byType(CatchTopBar)).height,
      greaterThanOrEqualTo(56),
    );
    expect(find.text('EXPLORE'), findsNothing);
    expect(find.text('Discover'), findsOneWidget);
    expect(find.text('Tonight near you'), findsOneWidget);
    expect(_topBarMaterial(tester).color, CatchTokens.editorialLight.surface);
    expect(find.byIcon(CatchIcons.close), findsOneWidget);
    final titleContext = tester.element(find.text('Discover'));
    expect(
      tester.widget<Text>(find.text('Discover')).style,
      CatchTextStyles.titleL(
        titleContext,
        color: CatchTokens.of(titleContext).ink,
      ),
    );

    await tester.tap(find.byIcon(CatchIcons.close));
    await tester.pump();
    await tester.tap(find.text('Done'));
    await tester.pump();

    expect(closed, isTrue);
    expect(done, isTrue);
  });

  testWidgets('CatchTopBar composes expanding search from the AppBar API', (
    tester,
  ) async {
    var query = 'tempo';

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: StatefulBuilder(
          builder: (context, setState) => Scaffold(
            appBar: CatchTopBar.route(
              title: 'Clubs',
              search: CatchTopBarSearch(
                copy: catchSearchFieldCopy(AppLocalizationsEn()),
                value: query,
                onChanged: (value) => setState(() => query = value),
                placeholder: 'Search clubs',
                tooltip: 'Search clubs',
              ),
            ),
            body: const SizedBox.shrink(),
          ),
        ),
      ),
    );

    expect(find.text('Clubs'), findsOneWidget);
    expect(find.byIcon(CatchIcons.search), findsOneWidget);

    await tester.tap(find.byIcon(CatchIcons.search));
    await tester.pump();

    expect(find.text('Clubs'), findsOneWidget);
    expect(
      find.byWidgetPredicate(
        (widget) =>
            widget is CatchSearchField &&
            widget.mode == CatchSearchFieldMode.expanding,
      ),
      findsOneWidget,
    );
    await tester.pump(CatchMotion.base);
    expect(find.byIcon(CatchIcons.clearCircle), findsOneWidget);

    await tester.tap(find.byIcon(CatchIcons.clearCircle));
    await tester.pump();
    expect(query, isEmpty);
    expect(find.byIcon(CatchIcons.close), findsOneWidget);

    await tester.tap(find.byIcon(CatchIcons.close));
    await tester.pump();
    expect(find.text('Clubs'), findsOneWidget);
  });

  testWidgets('CatchTopBar route owns the outlined navigation treatment', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        const CatchTopBar.route(
          title: 'Welcome',
          navigation: CatchTopBarNavigation(
            mode: CatchTopBarNavigationMode.back,
          ),
        ),
      ),
    );

    expect(find.byIcon(CatchIcons.arrowBackIosNewRounded), findsOneWidget);
    expect(find.byType(CatchIconAction), findsOneWidget);
    expect(
      tester.widget<CatchIconAction>(find.byType(CatchIconAction)).variant,
      CatchIconActionVariant.bordered,
    );
  });

  testWidgets('CatchTopBar supports tab bottoms and overflow menus', (
    tester,
  ) async {
    String? selected;

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: DefaultTabController(
          length: 2,
          child: Scaffold(
            appBar: CatchTopBar.route(
              title: 'Profile',
              navigation: const CatchTopBarNavigation(
                mode: CatchTopBarNavigationMode.none,
              ),
              footer: const CatchPageTabBar<int>(
                selected: 0,
                options: [
                  CatchOption(value: 0, label: 'Profile'),
                  CatchOption(value: 1, label: 'Preview'),
                ],
              ),
              actions: [
                CatchActionMenu<String>(
                  tooltip: 'More profile actions',
                  onSelected: (value) => selected = value,
                  items: const [
                    CatchActionMenuItem(value: 'edit', label: 'Edit profile'),
                    CatchActionMenuItem(
                      value: 'signOut',
                      label: 'Sign out',
                      isDestructive: true,
                    ),
                  ],
                ),
              ],
            ),
            body: const SizedBox.shrink(),
          ),
        ),
      ),
    );

    expect(
      tester.getSize(find.byType(CatchTopBar)).height,
      greaterThanOrEqualTo(56),
    );
    expect(find.text('Profile'), findsNWidgets(2));
    expect(find.text('Preview'), findsOneWidget);

    await tester.tap(find.byIcon(CatchIcons.moreHorizRounded));
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Edit profile'));
    await pumpFeatureUi(tester);

    expect(selected, 'edit');
  });

  testWidgets('CatchSliverHeader naturally sizes title above pinned bottom', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: Builder(
            builder: (context) => CustomScrollView(
              slivers: [
                ...const CatchSliverHeader(
                  bottomHeight: 48,
                  title: Padding(
                    key: ValueKey('natural-sliver-title'),
                    padding: EdgeInsets.all(16),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Sticky title'),
                        SizedBox(height: 12),
                        Text('Subtitle'),
                      ],
                    ),
                  ),
                  bottom: ColoredBox(
                    key: ValueKey('pinned-sliver-bottom'),
                    color: Colors.white,
                    child: Center(child: Text('Pinned bottom')),
                  ),
                ).buildSlivers(context),
                const SliverToBoxAdapter(child: SizedBox(height: 400)),
              ],
            ),
          ),
        ),
      ),
    );
    await tester.pump();

    expect(tester.takeException(), isNull);
    final initialTitleTop = tester.getTopLeft(find.text('Sticky title')).dy;
    final initialBottomTop = tester
        .getTopLeft(find.byKey(const ValueKey('pinned-sliver-bottom')))
        .dy;
    final initialTitleBottom = tester
        .getBottomLeft(find.byKey(const ValueKey('natural-sliver-title')))
        .dy;

    expect(initialBottomTop, greaterThanOrEqualTo(initialTitleBottom));
    expect(initialBottomTop - initialTitleBottom, lessThanOrEqualTo(1));

    await tester.drag(find.byType(CustomScrollView), const Offset(0, -48));
    await tester.pump();

    expect(tester.takeException(), isNull);
    expect(
      tester.getTopLeft(find.text('Sticky title')).dy,
      lessThan(initialTitleTop),
    );
    expect(
      tester.getTopLeft(find.byKey(const ValueKey('pinned-sliver-bottom'))).dy,
      lessThan(initialBottomTop),
    );

    await tester.drag(find.byType(CustomScrollView), const Offset(0, -120));
    await tester.pump();

    expect(
      tester.getBottomLeft(find.text('Sticky title')).dy,
      lessThan(tester.getTopLeft(find.text('Pinned bottom')).dy),
    );
    expect(find.text('Pinned bottom').hitTestable(), findsOneWidget);
  });
}

Widget _wrap(PreferredSizeWidget appBar) {
  return MaterialApp(
    theme: AppTheme.light,
    home: CatchScaffold.workspace(title: appBar, body: const SizedBox.shrink()),
  );
}

Widget _wrapScreenTopBar({
  required String title,
  String? subtitle,
  double? textScale,
  List<Widget> actions = const <Widget>[],
  CatchTopBarSearch? search,
}) {
  Widget home = Builder(
    builder: (context) => CatchScaffold.workspace(
      title: CatchTopBar.screen(
        title: title,
        subtitle: subtitle,
        actions: actions,
        search: search,
      ),
      body: const SizedBox.shrink(),
    ),
  );
  if (textScale != null) {
    home = MediaQuery(
      data: MediaQueryData(textScaler: TextScaler.linear(textScale)),
      child: Center(child: SizedBox(width: 390, height: 812, child: home)),
    );
  }
  return MaterialApp(theme: AppTheme.light, home: home);
}

Widget _wrapWithTextScale(
  PreferredSizeWidget appBar, {
  required double textScale,
}) {
  return MaterialApp(
    theme: AppTheme.light,
    home: MediaQuery(
      data: MediaQueryData(textScaler: TextScaler.linear(textScale)),
      child: Center(
        child: SizedBox(
          width: 390,
          height: 812,
          child: CatchScaffold.workspace(
            title: appBar,
            body: const SizedBox.shrink(),
          ),
        ),
      ),
    ),
  );
}

Material _topBarMaterial(WidgetTester tester) {
  return tester.widget<Material>(
    find
        .descendant(
          of: find.byType(CatchTopBar),
          matching: find.byType(Material),
        )
        .first,
  );
}

Border _topBarBorder(WidgetTester tester) {
  final containers = tester.widgetList<Container>(
    find.descendant(
      of: find.byType(CatchTopBar),
      matching: find.byType(Container),
    ),
  );
  final frame = containers.firstWhere(
    (container) => container.constraints?.maxHeight == CatchLayout.topBarHeight,
  );
  return (frame.foregroundDecoration! as BoxDecoration).border! as Border;
}
