part of 'catch_primitives_test.dart';

void _registerCatchPrimitivesErrorAsyncTests() {
  testWidgets('CatchErrorState renders retry UI without debug details', (
    tester,
  ) async {
    var retryCount = 0;

    await tester.pumpWidget(
      _wrap(
        CatchLocalizedErrorState(
          StateError('Could not load profile'),
          onRetry: () => retryCount++,
        ),
      ),
    );

    expect(find.text('Something went wrong'), findsOneWidget);
    expect(
      find.text('Something went wrong. Please try again.'),
      findsOneWidget,
    );
    expect(find.byType(CatchErrorState), findsOneWidget);
    expect(find.text('Try again'), findsOneWidget);
    expect(find.textContaining('StackTrace'), findsNothing);

    await tester.tap(find.text('Try again'));
    await tester.pump();

    expect(retryCount, 1);
  });

  testWidgets('inline and compact error states never add a nested surface', (
    tester,
  ) async {
    Future<void> pumpMode(CatchErrorStateMode mode) => tester.pumpWidget(
      _wrap(
        CatchErrorState(
          retryLabel: 'Try again',
          title: 'Customers unavailable',
          message: 'Please try again.',
          mode: mode,
          onRetry: () {},
        ),
      ),
    );

    await pumpMode(CatchErrorStateMode.inline);
    expect(find.byType(CatchSurface), findsNothing);
    expect(find.byType(CatchErrorState), findsOneWidget);

    await pumpMode(CatchErrorStateMode.compact);
    expect(find.byType(CatchSurface), findsNothing);
    expect(find.byType(CatchErrorState), findsOneWidget);
  });

  testWidgets('CatchErrorState honors an explicit recovery callback', (
    tester,
  ) async {
    var retryCount = 0;
    await tester.pumpWidget(
      _wrap(
        CatchLocalizedErrorState(
          const ValidationException('Please enter a valid phone number.'),
          onRetry: () => retryCount += 1,
        ),
      ),
    );

    expect(find.text('Check your details'), findsOneWidget);
    expect(
      find.text('Check the highlighted details and try again.'),
      findsOneWidget,
    );
    expect(find.text('Try again'), findsOneWidget);
    await tester.tap(find.text('Try again'));
    await tester.pump();
    expect(retryCount, 1);
  });

  testWidgets('Catch error variants keep a caller-provided alternate action', (
    tester,
  ) async {
    var alternateCount = 0;
    Widget alternateAction() => CatchErrorBackButton(
      label: 'Go back',
      onPressed: () => alternateCount += 1,
    );

    await tester.pumpWidget(
      _wrap(
        CatchLocalizedErrorState(
          const PermissionException('Unavailable.'),
          actions: [alternateAction()],
          mode: CatchErrorStateMode.inline,
        ),
      ),
    );
    await tester.tap(find.text('Go back'));
    expect(alternateCount, 1);

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: CatchLocalizedErrorScaffold(
          const PermissionException('Unavailable.'),
          actions: [alternateAction()],
        ),
      ),
    );
    await tester.tap(find.text('Go back'));
    expect(alternateCount, 2);

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: CustomScrollView(
            slivers: [
              CatchLocalizedSliverErrorState(
                const PermissionException('Unavailable.'),
                actions: [alternateAction()],
              ),
            ],
          ),
        ),
      ),
    );
    await tester.tap(find.text('Go back'));
    expect(alternateCount, 3);
  });

  testWidgets('CatchSliverErrorState fills a sliver viewport', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: const Scaffold(
          body: CustomScrollView(
            slivers: [
              CatchSliverErrorState(
                title: 'Messages unavailable',
                message: 'Unable to load messages.',
              ),
            ],
          ),
        ),
      ),
    );

    expect(find.text('Messages unavailable'), findsOneWidget);
    expect(find.text('Unable to load messages.'), findsOneWidget);
    expect(find.byType(CatchErrorState), findsOneWidget);
  });

  testWidgets(
    'box state viewport centers in the visible floating-shell region',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(400, 800);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: const CatchTabViewportScope(
            index: 1,
            bottomBarPlacement: CatchTabViewportScopePlacement.floating,
            bottomOverlayInset: 100,
            child: Scaffold(
              key: ValueKey('box-state-scaffold'),
              body: CatchStateViewport(
                child: CatchEmptyState(title: 'Nothing here'),
              ),
            ),
          ),
        ),
      );

      final scaffold = find.byKey(const ValueKey('box-state-scaffold'));
      final offset =
          tester.getCenter(find.byType(CatchEmptyState)).dy -
          tester.getCenter(scaffold).dy;
      expect(offset, closeTo(-50, 1));
    },
  );

  testWidgets(
    'sliver empty and error states center in the visible floating-shell region',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(400, 800);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);

      Future<double> pumpState(Widget sliver, Finder content) async {
        await tester.pumpWidget(
          MaterialApp(
            theme: AppTheme.light,
            home: CatchTabViewportScope(
              index: 1,
              bottomBarPlacement: CatchTabViewportScopePlacement.floating,
              bottomOverlayInset: 100,
              child: Scaffold(
                key: const ValueKey('state-scaffold'),
                body: CustomScrollView(slivers: [sliver]),
              ),
            ),
          ),
        );
        final viewport = find.descendant(
          of: find.byKey(const ValueKey('state-scaffold')),
          matching: find.byType(CustomScrollView),
        );
        return tester.getCenter(content).dy - tester.getCenter(viewport).dy;
      }

      final emptyOffset = await pumpState(
        const CatchSliverEmptyState(title: 'Nothing here'),
        find.byType(CatchEmptyState),
      );
      expect(emptyOffset, closeTo(-50, 1));

      final errorOffset = await pumpState(
        const CatchSliverErrorState(
          title: 'Unavailable',
          message: 'Try again later.',
        ),
        find.byType(CatchErrorState),
      );
      expect(errorOffset, closeTo(-50, 1));
    },
  );

  testWidgets('CatchAsyncBoundary uses branded default error state', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        CatchAsyncBoundary<int>(
          value: AsyncError<int>(StateError('load failed'), StackTrace.empty),
          builder: (context, value) => Text('$value'),
        ),
      ),
    );

    expect(find.bySubtype<CatchErrorState>(), findsOneWidget);
    expect(
      find.text('Something went wrong. Please try again.'),
      findsOneWidget,
    );
  });

  testWidgets('CatchAsyncBoundary supports context-aware state builders', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        CatchAsyncBoundary<int>(
          value: AsyncError<int>(StateError('load failed'), StackTrace.empty),
          builder: (context, value) => Text('$value'),
          loadingBuilder: (context) => const Text('Loading custom state'),
          errorBuilder: (context, error, stackTrace, onBoundaryRetry) =>
              Text('Custom error: $error'),
        ),
      ),
    );

    expect(find.textContaining('Custom error:'), findsOneWidget);
    expect(find.byType(CatchErrorState), findsNothing);

    await tester.pumpWidget(
      _wrap(
        CatchAsyncBoundary<int>(
          value: const AsyncLoading<int>(),
          builder: (context, value) => Text('$value'),
          loadingBuilder: (context) => const Text('Loading custom state'),
        ),
      ),
    );

    expect(find.text('Loading custom state'), findsOneWidget);
  });

  testWidgets(
    'CatchAsyncBoundary never replays a previous error while retrying',
    (tester) async {
      final failure = StateError('previous failure');
      // Riverpod exposes combined retry states to consumers but keeps this
      // constructor helper package-internal.
      // ignore: invalid_use_of_internal_member
      final retrying = const AsyncLoading<int>().copyWithPrevious(
        AsyncError<int>(failure, StackTrace.empty),
      );

      await tester.pumpWidget(
        _wrap(
          CatchAsyncBoundary<int>(
            value: retrying,
            initialLoadTimeout: null,
            builder: (context, value) => Text('Customer count: $value'),
            loadingBuilder: (context) => const Text('Loading customers'),
            errorBuilder: (context, error, stackTrace, onBoundaryRetry) =>
                Text('Customers unavailable: $error'),
          ),
        ),
      );

      expect(find.text('Loading customers'), findsOneWidget);
      expect(find.textContaining('Customers unavailable'), findsNothing);

      await tester.pumpWidget(
        _wrap(
          CatchAsyncBoundary<int>(
            value: const AsyncData<int>(2),
            initialLoadTimeout: null,
            builder: (context, value) => Text('Customer count: $value'),
            loadingBuilder: (context) => const Text('Loading customers'),
            errorBuilder: (context, error, stackTrace, onBoundaryRetry) =>
                Text('Customers unavailable: $error'),
          ),
        ),
      );
      await tester.pump();

      expect(find.text('Customer count: 2'), findsOneWidget);
      expect(find.textContaining('Customers unavailable'), findsNothing);
    },
  );

  testWidgets('CatchAsyncBoundary replaces an expired skeleton with retry', (
    tester,
  ) async {
    const initialLoadTimeout = Duration(milliseconds: 10);
    var retryCount = 0;
    await tester.pumpWidget(
      _wrap(
        CatchAsyncBoundary<int>(
          value: const AsyncLoading<int>(),
          initialLoadTimeout: initialLoadTimeout,
          onRetry: () => retryCount += 1,
          builder: (context, value) => Text('$value'),
          loadingBuilder: (_) => const Text('Loading custom state'),
        ),
      ),
    );

    expect(find.text('Loading custom state'), findsOneWidget);
    await pumpFeatureUiFor(
      tester,
      initialLoadTimeout + const Duration(milliseconds: 1),
    );
    expect(
      find.text('The request timed out. Please try again.'),
      findsOneWidget,
    );
    expect(find.text('Try again'), findsOneWidget);

    await tester.tap(find.text('Try again'));
    await tester.pump();
    expect(retryCount, 1);
    expect(find.text('Loading custom state'), findsOneWidget);
  });

  testWidgets('CatchAsyncBoundary keeps custom error ownership on timeout', (
    tester,
  ) async {
    const initialLoadTimeout = Duration(milliseconds: 10);
    var retryCount = 0;
    await tester.pumpWidget(
      _wrap(
        CatchAsyncBoundary<int>(
          value: const AsyncLoading<int>(),
          initialLoadTimeout: initialLoadTimeout,
          onRetry: () => retryCount += 1,
          builder: (context, value) => Text('$value'),
          loadingBuilder: (_) => const Text('Loading route state'),
          errorBuilder: (context, error, stackTrace, onRetry) => TextButton(
            onPressed: onRetry,
            child: const Text('Retry route-owned timeout'),
          ),
        ),
      ),
    );

    expect(find.text('Loading route state'), findsOneWidget);
    await pumpFeatureUiFor(
      tester,
      initialLoadTimeout + const Duration(milliseconds: 1),
    );

    expect(find.text('Retry route-owned timeout'), findsOneWidget);
    expect(find.byType(CatchErrorState), findsNothing);

    await tester.tap(find.text('Retry route-owned timeout'));
    await tester.pump();

    expect(retryCount, 1);
    expect(find.text('Loading route state'), findsOneWidget);
  });

  testWidgets(
    'CatchAsyncBoundary keeps custom error ownership on timeout retry',
    (tester) async {
      const initialLoadTimeout = Duration(milliseconds: 10);
      var retryCount = 0;
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: CustomScrollView(
              slivers: [
                CatchAsyncBoundary<int>.sliver(
                  value: const AsyncLoading<int>(),
                  initialLoadTimeout: initialLoadTimeout,
                  onRetry: () => retryCount += 1,
                  builder: (context, value) =>
                      SliverToBoxAdapter(child: Text('$value')),
                  loadingBuilder: (_) => const SliverToBoxAdapter(
                    child: Text('Loading sliver state'),
                  ),
                  errorBuilder: (context, error, stackTrace, onRetry) =>
                      SliverToBoxAdapter(
                        child: TextButton(
                          onPressed: onRetry,
                          child: const Text('Retry sliver timeout'),
                        ),
                      ),
                ),
              ],
            ),
          ),
        ),
      );

      expect(find.text('Loading sliver state'), findsOneWidget);
      await pumpFeatureUiFor(
        tester,
        initialLoadTimeout + const Duration(milliseconds: 1),
      );

      expect(find.text('Retry sliver timeout'), findsOneWidget);
      expect(find.byType(CatchSliverErrorState), findsNothing);

      await tester.tap(find.text('Retry sliver timeout'));
      await tester.pump();

      expect(retryCount, 1);
      expect(find.text('Loading sliver state'), findsOneWidget);
    },
  );

  testWidgets('CatchSkeleton.box renders a fixed-size skeleton piece', (
    tester,
  ) async {
    await tester.pumpWidget(_wrap(CatchSkeleton.box(width: 42, height: 24)));

    expect(find.byType(CatchSkeleton), findsOneWidget);
    expect(tester.getSize(find.byType(CatchSkeleton)), const Size(42, 24));
  });

  testWidgets('CatchSkeleton uses the theme raised fill in dark mode', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(CatchSkeleton.box(width: 42, height: 24), theme: AppTheme.dark),
    );

    final themedShape = tester
        .widgetList<Container>(
          find.descendant(
            of: find.byType(CatchSkeleton),
            matching: find.byType(Container),
          ),
        )
        .firstWhere((container) => container.decoration is BoxDecoration);
    final decoration = themedShape.decoration! as BoxDecoration;
    expect(decoration.color, CatchTokens.dark.raised);
    expect(decoration.color, isNot(CatchTokens.editorialWhite));
  });

  testWidgets('showCatchNoticeError maps errors to user copy', (tester) async {
    await tester.pumpWidget(
      _feedbackWrap(
        Builder(
          builder: (context) => TextButton(
            onPressed: () =>
                showCatchNoticeError(context, StateError('notice failed')),
            child: const Text('Show error'),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Show error'));
    await pumpFeatureUi(tester);

    expect(
      find.text('Something went wrong. Please try again.'),
      findsOneWidget,
    );
  });

  testWidgets('showCatchNotice publishes a notice in dark mode', (
    tester,
  ) async {
    await tester.pumpWidget(
      _feedbackWrap(
        Builder(
          builder: (context) => TextButton(
            onPressed: () => showCatchNotice(
              context,
              'Saved.',
              tone: CatchNoticeTone.success,
            ),
            child: const Text('Show notice'),
          ),
        ),
        theme: AppTheme.dark,
      ),
    );

    await tester.tap(find.text('Show notice'));
    await tester.pump();

    final notice = tester.widget<CatchNotice>(find.byType(CatchNotice));
    expect(notice.notice.tone, CatchNoticeTone.success);
    expect(find.text('Saved.'), findsOneWidget);
  });

  testWidgets(
    'showCatchNoticeError exposes retry action for retryable errors',
    (tester) async {
      var retryCount = 0;
      await tester.pumpWidget(
        _feedbackWrap(
          Builder(
            builder: (context) => TextButton(
              onPressed: () => showCatchNoticeError(
                context,
                const NetworkException(
                  'timeout',
                  'The request timed out. Please try again.',
                ),
                onRetry: () => retryCount++,
              ),
              child: const Text('Show error'),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Show error'));
      await pumpFeatureUi(tester);

      await tester.tap(find.text('Try again'));
      await pumpFeatureUi(tester);

      expect(retryCount, 1);
    },
  );

  testWidgets('localized banner mutation recipe renders errors inline', (
    tester,
  ) async {
    final mutation = Mutation<void>();
    var retryCount = 0;

    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: AppTheme.light,
          home: CatchNoticeOverlay(
            child: Scaffold(
              body: Consumer(
                builder: (context, ref, _) {
                  final state = ref.watch(mutation);
                  return Column(
                    children: [
                      TextButton(
                        onPressed: () async {
                          try {
                            await mutation.run(ref, (_) async {
                              throw const NetworkException(
                                'timeout',
                                'The request timed out. Please try again.',
                              );
                            });
                          } catch (_) {}
                        },
                        child: const Text('Save'),
                      ),
                      CatchLocalizedErrorBanner.mutation(
                        mutation: state,
                        onRetry: () => retryCount++,
                      ),
                    ],
                  );
                },
              ),
            ),
          ),
        ),
      ),
    );

    expect(find.byType(CatchBanner), findsNothing);

    await tester.tap(find.text('Save'));
    await pumpFeatureUi(tester);

    expect(find.byType(CatchBanner), findsOneWidget);
    expect(
      find.text('The request timed out. Please try again.'),
      findsOneWidget,
    );

    await tester.tap(find.text('Try again'));
    await pumpFeatureUi(tester);

    expect(retryCount, 1);
  });

  testWidgets('shared subscription handles multiple mutation failures', (
    tester,
  ) async {
    final saveMutation = Mutation<void>();
    final deleteMutation = Mutation<void>();

    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: AppTheme.light,
          home: CatchNoticeOverlay(
            child: Scaffold(
              body: Consumer(
                builder: (context, ref, _) {
                  listenToCatchMutationErrors(
                    context,
                    ref,
                    mutations: [saveMutation, deleteMutation],
                  );
                  return Column(
                    children: [
                      TextButton(
                        onPressed: () async {
                          try {
                            await saveMutation.run(ref, (_) async {
                              throw StateError('save failed');
                            });
                          } catch (_) {}
                        },
                        child: const Text('Save'),
                      ),
                      TextButton(
                        onPressed: () async {
                          try {
                            await deleteMutation.run(ref, (_) async {
                              throw StateError('delete failed');
                            });
                          } catch (_) {}
                        },
                        child: const Text('Delete'),
                      ),
                    ],
                  );
                },
              ),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Delete'));
    await pumpFeatureUi(tester);

    expect(find.text('Something went wrong'), findsOneWidget);
    expect(
      find.text('Something went wrong. Please try again.'),
      findsOneWidget,
    );
    expect(find.byType(CatchNotice), findsOneWidget);
  });
}
