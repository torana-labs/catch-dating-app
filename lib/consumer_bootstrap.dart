import 'dart:async';

import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/onboarding/presentation/pages/onboarding_welcome_body.dart';
import 'package:catch_dating_app/pages/startup/splash_screen.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_error_scaffold.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

typedef CatchBootstrapInitializer = Future<void> Function();
typedef CatchBootstrapErrorReporter =
    void Function(Object error, StackTrace stackTrace);
typedef CatchInitializedAppBuilder = Widget Function(BuildContext context);
typedef CatchBootFramePreparer =
    Future<void> Function(BuildContext context, String asset);

/// Consumer-only process bootstrap.
///
/// The boot reel and critical initialization start concurrently. The real app
/// mounts only after both complete, so router/auth changes cannot dispose the
/// startup animation midway through a cold launch.
class CatchConsumerBootstrap extends StatefulWidget {
  const CatchConsumerBootstrap({
    super.key,
    required this.initialize,
    required this.initializedAppBuilder,
    required this.onNativeSplashReady,
    this.onInitializationError,
    this.playIntro = true,
    this.prepareFirstFrame,
  });

  static const bootKey = ValueKey<String>('consumer-bootstrap-boot');
  static const failureKey = ValueKey<String>('consumer-bootstrap-failure');
  static const initializedKey = ValueKey<String>(
    'consumer-bootstrap-initialized',
  );

  final CatchBootstrapInitializer initialize;
  final CatchInitializedAppBuilder initializedAppBuilder;
  final VoidCallback onNativeSplashReady;
  final CatchBootstrapErrorReporter? onInitializationError;
  final bool playIntro;
  final CatchBootFramePreparer? prepareFirstFrame;

  @override
  State<CatchConsumerBootstrap> createState() => _CatchConsumerBootstrapState();
}

class _CatchConsumerBootstrapState extends State<CatchConsumerBootstrap> {
  var _attempt = 0;
  var _animationComplete = false;
  var _initializationComplete = false;
  var _nativeSplashRemoved = false;
  Object? _initializationError;

  @override
  void initState() {
    super.initState();
    unawaited(_initialize());
  }

  Future<void> _initialize() async {
    final isRetry = _attempt > 0;
    final attempt = ++_attempt;
    if (isRetry && mounted) {
      setState(() {
        _initializationComplete = false;
        _initializationError = null;
      });
    } else {
      _initializationComplete = false;
      _initializationError = null;
    }

    try {
      await widget.initialize();
      if (!mounted || attempt != _attempt) return;
      setState(() {
        _initializationComplete = true;
      });
    } catch (error, stackTrace) {
      if (!mounted || attempt != _attempt) return;
      widget.onInitializationError?.call(error, stackTrace);
      setState(() {
        _initializationError = error;
      });
    }
  }

  void _handleNativeSplashReady() {
    if (_nativeSplashRemoved) return;
    _nativeSplashRemoved = true;
    widget.onNativeSplashReady();
  }

  void _handleAnimationComplete() {
    if (_animationComplete || !mounted) return;
    setState(() {
      _animationComplete = true;
    });
  }

  void _retry() {
    unawaited(_initialize());
  }

  @override
  Widget build(BuildContext context) {
    final Widget child;
    if (_animationComplete && _initializationComplete) {
      child = KeyedSubtree(
        key: CatchConsumerBootstrap.initializedKey,
        child: widget.initializedAppBuilder(context),
      );
    } else {
      final Key subtreeKey;
      final Widget home;
      if (_animationComplete && _initializationError != null) {
        subtreeKey = CatchConsumerBootstrap.failureKey;
        home = Builder(
          builder: (context) => CatchLocalizedErrorScaffold(
            _initializationError!,
            onRetry: _retry,
          ),
        );
      } else {
        subtreeKey = CatchConsumerBootstrap.bootKey;
        home = CatchConsumerBootScreen(
          playIntro: widget.playIntro && !_animationComplete,
          onFirstFlutterFrameReady: _handleNativeSplashReady,
          onAnimationComplete: _handleAnimationComplete,
          prepareFirstFrame: widget.prepareFirstFrame,
        );
      }

      child = KeyedSubtree(
        key: subtreeKey,
        child: MaterialApp(
          onGenerateTitle: (context) => AppConfig.appTitleFor(
            consumerTitle: context.l10n.appTitleConsumer,
            hostTitle: context.l10n.appTitleHost,
          ),
          debugShowCheckedModeBanner: false,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          theme: AppTheme.light,
          darkTheme: AppTheme.dark,
          home: home,
        ),
      );
    }

    // Do not overlap the bootstrap MaterialApp with the initialized
    // MaterialApp.router. Keeping two independent app roots alive during an
    // AnimatedSwitcher transition can reactivate router GlobalKey elements
    // while their old tree is still deactivating. Replace the root atomically;
    // route-owned transitions begin only after the boot tree is gone.
    return child;
  }
}

/// The animated Consumer cold-start surface shown above auth and routing.
///
/// Its first Flutter frame places the static `Catch_` lockup at the exact
/// responsive anchor used by the Welcome reel. After that frame is confirmed
/// painted, it fades into the moving reel without shifting `Catch` and lands on
/// the same deterministic phrase without mounting Welcome actions.
class CatchConsumerBootScreen extends StatefulWidget {
  const CatchConsumerBootScreen({
    super.key,
    required this.onFirstFlutterFrameReady,
    required this.onAnimationComplete,
    this.playIntro = true,
    this.prepareFirstFrame,
  });

  static const markKey = ValueKey<String>('consumer-boot-native-mark');
  static const reelKey = ValueKey<String>('consumer-boot-reel');
  static const tapTargetKey = ValueKey<String>('consumer-boot-tap-target');

  final VoidCallback onFirstFlutterFrameReady;
  final VoidCallback onAnimationComplete;
  final bool playIntro;
  final CatchBootFramePreparer? prepareFirstFrame;

  @override
  State<CatchConsumerBootScreen> createState() =>
      _CatchConsumerBootScreenState();
}

class _CatchConsumerBootScreenState extends State<CatchConsumerBootScreen>
    with TickerProviderStateMixin {
  late final AnimationController _handoffController;
  late final AnimationController _spinController;
  late final AnimationController _landingController;
  late final Listenable _sceneListenable;

  Timer? _completionTimer;
  var _assetPreparationStarted = false;
  var _animationStarted = false;
  var _landed = false;
  var _completionSent = false;

  @override
  void initState() {
    super.initState();
    _handoffController = AnimationController(
      vsync: this,
      duration: CatchMotion.fast,
    );
    _spinController = AnimationController(
      vsync: this,
      duration: CatchMotion.welcomeReel,
    )..addStatusListener(_handleSpinStatus);
    _landingController = AnimationController(
      vsync: this,
      duration: CatchMotion.welcomeLandingReveal,
    );
    _sceneListenable = Listenable.merge([
      _handoffController,
      _spinController,
      _landingController,
    ]);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_assetPreparationStarted) return;
    _assetPreparationStarted = true;
    unawaited(_prepareMatchingFirstFrame());
  }

  @override
  void didUpdateWidget(covariant CatchConsumerBootScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.playIntro && !widget.playIntro) {
      _land(immediate: true);
    }
  }

  Future<void> _prepareMatchingFirstFrame() async {
    final iconAsset = SplashScreen.iconAssetForBrightness(
      Theme.of(context).brightness,
    );
    try {
      final prepareFirstFrame = widget.prepareFirstFrame;
      if (prepareFirstFrame == null) {
        await precacheImage(AssetImage(iconAsset), context);
      } else {
        await prepareFirstFrame(context, iconAsset);
      }
    } catch (error, stackTrace) {
      FlutterError.reportError(
        FlutterErrorDetails(
          exception: error,
          stack: stackTrace,
          library: 'Catch consumer bootstrap',
          context: ErrorDescription('while decoding the native splash mark'),
        ),
      );
    }
    if (!mounted) return;

    setState(() {});
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      widget.onFirstFlutterFrameReady();
      _startAnimation();
    });
  }

  void _startAnimation() {
    if (_animationStarted) return;
    _animationStarted = true;
    final skipMotion =
        !widget.playIntro || MediaQuery.of(context).disableAnimations;
    if (skipMotion) {
      _handoffController.value = 1;
      _land(immediate: true);
      return;
    }

    unawaited(
      _handoffController.forward().then((_) {
        if (mounted && !_landed) {
          _spinController.forward();
        }
      }),
    );
  }

  void _handleSpinStatus(AnimationStatus status) {
    if (status == AnimationStatus.completed && !_landed) {
      _land(immediate: false);
    }
  }

  void _skip() {
    if (!_landed) {
      _handoffController.value = 1;
      _land(immediate: false);
    }
  }

  void _land({required bool immediate}) {
    if (_completionSent) return;
    final wasLanded = _landed;
    _landed = true;
    _spinController
      ..stop()
      ..value = 1;

    if (immediate) {
      _landingController.value = 1;
      _sendCompletion();
    } else {
      _landingController.forward();
      _completionTimer ??= Timer(CatchMotion.welcomeTextCool, _sendCompletion);
    }

    if (!wasLanded && mounted) {
      setState(() {});
    }
  }

  void _sendCompletion() {
    if (_completionSent) return;
    _completionSent = true;
    widget.onAnimationComplete();
  }

  @override
  void dispose() {
    _completionTimer?.cancel();
    _spinController
      ..removeStatusListener(_handleSpinStatus)
      ..dispose();
    _handoffController.dispose();
    _landingController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final themeTokens = CatchTokens.of(context);
    const reelTokens = CatchTokens.editorialDark;

    return AnimatedBuilder(
      animation: _sceneListenable,
      builder: (context, _) {
        final handoff = _handoffController.value;
        final background =
            Color.lerp(themeTokens.bg, reelTokens.bg, handoff) ?? reelTokens.bg;
        final overlayStyle = handoff < 0.5
            ? Theme.of(context).brightness == Brightness.dark
                  ? SystemUiOverlayStyle.light
                  : SystemUiOverlayStyle.dark
            : SystemUiOverlayStyle.light;

        return AnnotatedRegion<SystemUiOverlayStyle>(
          value: overlayStyle.copyWith(
            statusBarColor: Colors.transparent,
            systemNavigationBarColor: background,
            systemNavigationBarIconBrightness: handoff < 0.5
                ? Theme.of(context).brightness == Brightness.dark
                      ? Brightness.light
                      : Brightness.dark
                : Brightness.light,
          ),
          child: ColoredBox(
            color: background,
            child: Semantics(
              button: !_landed,
              label: _landed
                  ? null
                  : context.l10n.onboardingWelcomePageLabelSkipWelcomeAnimation,
              onTap: _landed ? null : _skip,
              child: GestureDetector(
                key: CatchConsumerBootScreen.tapTargetKey,
                behavior: HitTestBehavior.opaque,
                onTap: _landed ? null : _skip,
                child: LayoutBuilder(
                  key: CatchConsumerBootScreen.reelKey,
                  builder: (context, constraints) {
                    final media = MediaQuery.of(context);
                    final size = Size(
                      constraints.maxWidth,
                      constraints.maxHeight,
                    );
                    final sceneWidth = size.width
                        .clamp(0, CatchWelcomeTokens.welcomeMaxWidth)
                        .toDouble();
                    final catchLeft =
                        CatchWelcomeTokens.welcomeReelCatchLeftForWidth(
                          sceneWidth,
                        );
                    final rightInset =
                        CatchWelcomeTokens.welcomeReelRightForWidth(sceneWidth);
                    final catchTop = CatchWelcomeTokens.welcomeReelCatchTopFor(
                      media.padding,
                    );

                    return Align(
                      alignment: Alignment.topCenter,
                      child: SizedBox(
                        width: sceneWidth,
                        height: size.height,
                        child: Stack(
                          fit: StackFit.expand,
                          children: [
                            IgnorePointer(
                              child: Opacity(
                                opacity: 1 - handoff,
                                child: Stack(
                                  children: [
                                    Positioned(
                                      key: CatchConsumerBootScreen.markKey,
                                      left: catchLeft,
                                      right: rightInset,
                                      top: catchTop,
                                      child: WelcomeFocusText(
                                        catchColor: themeTokens.ink,
                                        maxWidth:
                                            sceneWidth - catchLeft - rightInset,
                                        showBrandUnderscore: true,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            Opacity(
                              opacity: handoff,
                              child: WelcomeSceneLayout(
                                viewportWidth: sceneWidth,
                                viewportHeight: size.height,
                                mediaPadding: media.padding,
                                spinValue: _spinController.value,
                                landingValue: _landingController.value,
                                landed: _landed,
                                showLandingContent: false,
                                onContinue: _skip,
                                onExplore: _skip,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
