import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/app_version_config_provider.dart';
import 'package:catch_dating_app/contexts/account/data/force_update_provider.dart';
import 'package:catch_dating_app/contexts/profiles/data/profile_location_initializer.dart';
import 'package:catch_dating_app/core/app_config.dart';
import 'package:catch_dating_app/core/app_error_context.dart';
import 'package:catch_dating_app/core/connectivity_service.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_overlay.dart';
import 'package:catch_dating_app/core/startup/native_splash.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/core/widgets/splash_screen.dart';
import 'package:catch_dating_app/exceptions/error_logger.dart';
import 'package:catch_dating_app/force_update/presentation/force_update_diagnostics.dart';
import 'package:catch_dating_app/force_update/presentation/update_required_screen.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/notifications/presentation/foreground_notification_listener.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'app.g.dart';

typedef ForceUpdateRefresh =
    Future<void> Function(
      WidgetRef ref, {
      required bool invalidatePackageInfo,
      bool Function()? shouldInvalidate,
    });

// keepalive: force-update refresh is the app-wide gate hook used by the app
// shell and test harness across startup route rebuilds.
@visibleForTesting
@Riverpod(keepAlive: true)
ForceUpdateRefresh forceUpdateRefresh(Ref ref) => _refreshForceUpdateGate;

class MyApp extends ConsumerWidget {
  const MyApp({super.key, required this.routerProvider});

  final ProviderListenable<GoRouter> routerProvider;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final goRouter = ref.watch(routerProvider);
    final forceUpdate = ref.watch(forceUpdateRequiredProvider);
    final isOffline = ref.watch(isObviouslyOfflineProvider);
    ref.watch(profileLocationInitializerProvider);

    return MaterialApp.router(
      onGenerateTitle: (context) {
        final l10n = context.l10n;
        return AppConfig.appTitleFor(
          consumerTitle: l10n.appTitleConsumer,
          hostTitle: l10n.appTitleHost,
        );
      },
      debugShowCheckedModeBanner: false,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      routerConfig: goRouter,
      builder: (context, child) {
        final content = ForceUpdateGate(
          forceUpdate: forceUpdate,
          onRetry: () {
            unawaited(
              ref.read(forceUpdateRefreshProvider)(
                ref,
                invalidatePackageInfo: true,
              ),
            );
          },
          child: CatchNoticeOverlay(
            child: ForegroundNotificationListener(
              router: goRouter,
              child: CatchBannerStatusScope(
                statuses: [
                  if (isOffline)
                    CatchBannerStatus(
                      id: 'connectivity.offline',
                      label: context.l10n.sharedOfflineTitle,
                      message: context.l10n.sharedOfflineBody,
                      icon: CatchIcons.offline,
                      color: CatchTokens.of(context).warning,
                    ),
                ],
                child: child ?? const SizedBox.shrink(),
              ),
            ),
          ),
        );

        if (!AppConfig.shouldShowEnvironmentBanner) {
          return content;
        }

        return Banner(
          location: BannerLocation.topStart,
          message: AppConfig.environmentBannerLabel,
          child: content,
        );
      },
    );
  }
}

class ForceUpdateGate extends ConsumerStatefulWidget {
  const ForceUpdateGate({
    super.key,
    required this.forceUpdate,
    required this.onRetry,
    required this.child,
    this.refreshOnResume = true,
  });

  final AsyncValue<bool> forceUpdate;
  final VoidCallback onRetry;
  final Widget child;
  final bool refreshOnResume;

  @override
  ConsumerState<ForceUpdateGate> createState() => _ForceUpdateGateState();
}

class _ForceUpdateGateState extends ConsumerState<ForceUpdateGate>
    with WidgetsBindingObserver {
  bool _nativeSplashRemovalScheduled = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (!widget.refreshOnResume || state != AppLifecycleState.resumed) {
      return;
    }

    unawaited(
      ref.read(forceUpdateRefreshProvider)(
        ref,
        invalidatePackageInfo: false,
        shouldInvalidate: () => mounted,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final forceUpdate = widget.forceUpdate;
    if (forceUpdate.hasValue) {
      _scheduleNativeSplashRemoval();
      return forceUpdate.requireValue
          ? const UpdateRequiredScreen()
          : widget.child;
    }

    if (forceUpdate.hasError) {
      _scheduleNativeSplashRemoval();
      return ForceUpdateCheckErrorScreen(
        error: forceUpdate.error,
        onRetry: widget.onRetry,
      );
    }

    return const SplashScreen();
  }

  void _scheduleNativeSplashRemoval() {
    if (_nativeSplashRemovalScheduled || kIsWeb) return;
    _nativeSplashRemovalScheduled = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      NativeSplash.remove();
    });
  }
}

Future<void> _refreshForceUpdateGate(
  WidgetRef ref, {
  required bool invalidatePackageInfo,
  bool Function()? shouldInvalidate,
}) async {
  try {
    await ref.read(firebaseRemoteConfigProvider).fetchAndActivate();
  } catch (error, stackTrace) {
    // Best-effort refresh: the force-update gate keeps serving the last
    // activated values, but the failure is normalized and logged (not silently
    // swallowed) so a real Remote Config misconfig stays observable.
    logAppError(
      error,
      stackTrace: stackTrace,
      context: const AppErrorContext(
        operation: AppOperation.runtime,
        action: 'refresh the force-update gate',
        resource: 'remote_config',
      ),
      logError: ref.read(errorLoggerProvider),
    );
  }

  if (shouldInvalidate?.call() == false) return;

  ref.invalidate(appVersionConfigProvider);
  if (invalidatePackageInfo) {
    ref.invalidate(appPackageInfoProvider);
  }
  ref.invalidate(forceUpdateRequiredProvider);
}

class ForceUpdateCheckErrorScreen extends StatelessWidget {
  const ForceUpdateCheckErrorScreen({
    super.key,
    required this.error,
    required this.onRetry,
  });

  final Object? error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final diagnostic = forceUpdateDevelopmentDiagnostic(error);
    final l10n = context.l10n;

    return CatchScaffold.standalone(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(CatchSpacing.s6),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Icon(CatchIcons.offline, size: 48),
                gapH24,
                CatchText(
                  l10n.sharedForceUpdateCheckErrorTitle,
                  variant: CatchTextVariant.titleL,
                  textAlign: TextAlign.center,
                ),
                gapH12,
                CatchText(
                  l10n.sharedForceUpdateCheckErrorBody,
                  variant: CatchTextVariant.bodyM,
                  textAlign: TextAlign.center,
                ),
                if (diagnostic != null) ...[
                  gapH12,
                  CatchText(
                    diagnostic,
                    variant: CatchTextVariant.bodyS,
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                    textAlign: TextAlign.center,
                  ),
                ],
                gapH24,
                CatchButton(
                  label: l10n.sharedActionTryAgain,
                  onPressed: onRetry,
                  leading: Icon(CatchIcons.refresh),
                  fullWidth: true,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
