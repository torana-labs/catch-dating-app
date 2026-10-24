import 'dart:async';

import 'package:catch_dating_app/core/app_config.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_controller.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_overlay.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/notifications/presentation/foreground_notification_controller.dart';
import 'package:catch_dating_app/notifications/presentation/foreground_notification_listener.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/catalog_preview.dart';
import 'package:widgetbook_workspace/support/contract_preview.dart';

import '../../preview_layout_contracts.dart';
import '../../support/widgetbook_harness.dart';

@widgetbook.UseCase(
  name: 'Error recipes',
  type: CatchBanner,
  path: '[Core catalog]/Feedback',
)
Widget catchBannerErrorRecipes(BuildContext context) {
  final saveMutation = Mutation<void>();
  final deleteMutation = Mutation<void>();

  return WidgetbookCatalogFrame(
    title: 'Error feedback',
    catalogId: 'catch.banner',
    children: [
      WidgetbookCatalogStateCard(
        label: 'persistent inline error',
        child: Column(
          children: [
            const CatchBanner.error(
              message: 'Card details could not be saved.',
            ),
            CatchLocalizedErrorBanner(
              Exception('Booking failed. Try once more.'),
              onRetry: widgetbookNoop,
            ),
          ],
        ),
      ),
      WidgetbookCatalogStateCard(
        label: 'transient action failure',
        child: Builder(
          builder: (context) => CatchButton(
            label: 'Show action error',
            leading: Icon(CatchIcons.errorOutlineRounded),
            onPressed: () => showCatchNoticeError(
              context,
              Exception('Share sheet is unavailable right now.'),
              onRetry: widgetbookNoop,
            ),
          ),
        ),
      ),
      WidgetbookCatalogStateCard(
        label: 'mutation subscriptions',
        child: Consumer(
          builder: (context, ref, _) {
            listenToCatchMutationErrors(
              context,
              ref,
              mutations: [saveMutation, deleteMutation],
            );
            return WidgetbookContractWrap(
              children: [
                CatchButton(
                  label: 'Fail save',
                  onPressed: () => unawaited(
                    saveMutation
                        .run(ref, (_) async => throw StateError('Save failed'))
                        .catchError((_) {}),
                  ),
                ),
                CatchButton(
                  label: 'Fail delete',
                  variant: CatchButtonVariant.danger,
                  onPressed: () => unawaited(
                    deleteMutation
                        .run(
                          ref,
                          (_) async => throw StateError('Delete failed'),
                        )
                        .catchError((_) {}),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: CatchLocalizedErrorBanner,
  path: '[Core catalog]/Feedback',
)
Widget catchLocalizedErrorBannerMutationStates(BuildContext context) {
  final mutation = Mutation<void>();
  return WidgetbookCatalogFrame(
    title: 'Mutation error banner',
    catalogId: 'catch.banner.localized',
    children: [
      WidgetbookCatalogStateCard(
        label: 'mutation state',
        child: Consumer(
          builder: (context, ref, _) {
            final state = ref.watch(mutation);
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                CatchButton(
                  label: 'Simulate failed save',
                  leading: Icon(CatchIcons.errorOutlineRounded),
                  onPressed: () => unawaited(
                    mutation
                        .run(ref, (_) async => throw StateError('Save failed'))
                        .catchError((_) {}),
                  ),
                ),
                gapH12,
                CatchLocalizedErrorBanner.mutation(
                  mutation: state,
                  onRetry: widgetbookNoop,
                ),
              ],
            );
          },
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: CatchBanner,
  path: '[Core catalog]/Feedback',
)
Widget catchBannerCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'CatchBanner',
    catalogId: 'core.widgets.catch_banner',
    children: [
      WidgetbookCatalogStateCard(
        label: 'message / title / action',
        child: Column(
          children: [
            CatchBanner(
              title: 'Booking pending',
              message: 'We will confirm your spot after payment settles.',
              icon: CatchIcons.infoOutlineRounded,
              actions: [
                CatchButton.text(label: 'View', onPressed: widgetbookNoop),
              ],
            ),
            gapH12,
            CatchBanner(
              message: 'Host approval is required for this event.',
              icon: CatchIcons.lockOutlineRounded,
              tone: CatchBannerTone.neutral,
            ),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: CatchFrameworkErrorState,
  path: '[Core catalog]/Feedback',
)
Widget catchFrameworkErrorStateCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'Framework error',
    catalogId: 'catch.error_state.framework_error_view',
    children: [
      WidgetbookCatalogStateCard(
        label: 'user-safe / debug details',
        child: SizedBox(
          height: WidgetbookPreviewLayout.startupViewportHeight,
          child: CatchFrameworkErrorState(
            copy: catchFrameworkErrorCopy(context.l10n),
            details: FlutterErrorDetails(
              exception: StateError('Widgetbook sample framework failure'),
            ),
            showDebugDetails: true,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: CatchErrorDetailsAccordion,
  path: '[Core catalog]/Feedback',
)
Widget catchErrorDetailsAccordionCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'Error details',
    catalogId: 'catch.error_state.framework_error_debug_details',
    children: [
      WidgetbookCatalogStateCard(
        label: 'collapsed',
        child: CatchErrorDetailsAccordion(
          label: context.l10n.coreCatchFrameworkErrorViewTextDeveloperDetails,
          details: 'StateError: Widgetbook sample framework failure',
        ),
      ),
      WidgetbookCatalogStateCard(
        label: 'expanded',
        child: CatchErrorDetailsAccordion(
          label: context.l10n.coreCatchFrameworkErrorViewTextDeveloperDetails,
          details: 'StateError: Widgetbook sample framework failure',
          initiallyExpanded: true,
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: CatchNoticeOverlay,
  path: '[Core catalog]/Feedback',
)
Widget catchNoticeOverlayCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'Notice overlay',
    catalogId: 'catch.notice',
    children: [
      WidgetbookCatalogStateCard(
        label: 'app-level overlay',
        child: SizedBox(
          height: WidgetbookPreviewLayout.stateViewportHeight,
          child: CatchNoticeOverlay(
            child: CatchSurface.card(
              height: WidgetbookPreviewLayout.mediaPanelHeight,
              child: Center(
                child: Text(
                  'App content under ambient notices',
                  style: CatchTextStyles.bodyM(context),
                ),
              ),
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Queued arrival',
  type: CatchNoticeController,
  path: '[Core catalog]/Feedback',
)
Widget catchNoticeQueueCatalogState(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'Queued notice',
      catalogId: 'catch.notice',
      children: [
        ProviderScope(
          overrides: [
            catchNoticeControllerProvider.overrideWith(
              _NoticeQueuePreviewController.new,
            ),
          ],
          child: const SizedBox(
            height: WidgetbookPreviewLayout.stateViewportHeight,
            child: CatchNoticeOverlay(child: SizedBox.expand()),
          ),
        ),
      ],
    );

class _NoticeQueuePreviewController extends CatchNoticeController {
  @override
  CatchNoticeQueue build() => const CatchNoticeQueue([
    CatchNoticeData(
      id: 'queued',
      title: 'Preferences saved',
      message: 'Your changes are ready.',
      tone: CatchNoticeTone.success,
      person: CatchPersonAvatarItem(name: 'Ananya Rao', initials: 'AR'),
      duration: null,
    ),
  ]);
}

@widgetbook.UseCase(
  name: 'Validated arrival interaction',
  type: ForegroundNotificationListener,
  path: '[Core catalog]/Feedback',
)
Widget foregroundNotificationListenerPreview(BuildContext context) =>
    const _ArrivalPreview();

class _ArrivalPreview extends ConsumerStatefulWidget {
  const _ArrivalPreview();
  @override
  ConsumerState<_ArrivalPreview> createState() => _ArrivalPreviewState();
}

class _ArrivalPreviewState extends ConsumerState<_ArrivalPreview> {
  late final GoRouter _router = GoRouter(
    routes: [
      GoRoute(
        path: '/',
        builder: (context, state) => Scaffold(
          body: SafeArea(
            child: Column(
              children: [
                for (final type in ['match', 'message'])
                  CatchButton(
                    label: 'Receive $type',
                    onPressed: () {
                      final arrivals = ref.read(
                        foregroundNotificationControllerProvider.notifier,
                      );
                      arrivals.startSession('preview');
                      arrivals.receive(
                        'preview',
                        RemoteMessage(
                          messageId: 'preview-${_sequence++}',
                          data: {
                            'type': type,
                            'matchId': 'preview',
                            'recipientUid': 'preview',
                            'appRole': AppConfig.appRoleName,
                            'actorName': 'Ananya',
                          },
                          notification: RemoteNotification(
                            title: type == 'match'
                                ? 'Congratulations'
                                : 'Ananya',
                            body: type == 'match'
                                ? 'You have a new catch.'
                                : 'See you there!',
                          ),
                        ),
                      );
                    },
                  ),
                const Text(
                  'Tap the arrival to open; swipe up/sideways to dismiss.',
                ),
              ],
            ),
          ),
        ),
      ),
      GoRoute(
        path: AppConfig.appRole.isHost ? '/host/inbox/:id' : '/chats/:id',
        builder: (context, state) => Scaffold(
          body: SafeArea(
            child: CatchButton(
              label: 'Conversation opened — back',
              onPressed: () => _router.go('/'),
            ),
          ),
        ),
      ),
    ],
  );
  int _sequence = 0;

  @override
  void dispose() {
    _router.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => MaterialApp.router(
    theme: Theme.of(context),
    localizationsDelegates: AppLocalizations.localizationsDelegates,
    supportedLocales: AppLocalizations.supportedLocales,
    routerConfig: _router,
    builder: (context, child) => CatchNoticeOverlay(
      child: ForegroundNotificationListener(router: _router, child: child!),
    ),
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: CatchBannerStatusScope,
  path: '[Core catalog]/Feedback',
)
Widget catchStatusStripScopeCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'CatchBannerStatusScope',
    catalogId: 'core.widgets.catch_status_strip_scope',
    children: [
      SizedBox(
        height: WidgetbookPreviewLayout.stateViewportHeight,
        child: CatchBannerStatusScope(
          statuses: [
            CatchBannerStatus(
              id: 'offline',
              label: context.l10n.sharedOfflineTitle,
              message: context.l10n.sharedOfflineBody,
              icon: CatchIcons.cloudOffRounded,
              color: CatchTokens.of(context).warning,
            ),
          ],
          child: CatchRootScreenScaffold.standard(
            title: const CatchTopBar.primaryRail(title: 'Today'),
            children: const [
              SliverToBoxAdapter(child: Text('Content below status')),
            ],
          ),
        ),
      ),
    ],
  );
}
