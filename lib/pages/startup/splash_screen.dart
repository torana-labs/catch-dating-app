import 'dart:async';

import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  static const lightIconAsset = 'assets/branding/catch_splash_mark_light.png';
  static const darkIconAsset = 'assets/branding/catch_splash_mark_dark.png';
  static const hostLightIconAsset =
      'assets/branding/catch_host_splash_mark_light.png';
  static const hostDarkIconAsset =
      'assets/branding/catch_host_splash_mark_dark.png';

  static String iconAssetForBrightness(
    Brightness brightness, {
    AppRole? appRole,
  }) {
    final resolvedRole = appRole ?? AppConfig.appRole;
    if (resolvedRole == AppRole.host) {
      return brightness == Brightness.dark
          ? hostDarkIconAsset
          : hostLightIconAsset;
    }
    return brightness == Brightness.dark ? darkIconAsset : lightIconAsset;
  }

  @override
  State<SplashScreen> createState() => _CatchStartupLoadingScreenState();
}

/// The shared role-specific brand anchor used by Host startup and auth.
///
/// Keeping this stage identical across both surfaces lets navigation replace
/// only the lower content while the visible Host mark remains pixel-stable.
class StartupBrandHeader extends StatelessWidget {
  const StartupBrandHeader({super.key, this.appRole});

  static const markKey = ValueKey<String>('catch-startup-brand-mark');

  final AppRole? appRole;

  @override
  Widget build(BuildContext context) {
    final resolvedRole = appRole ?? AppConfig.appRole;
    final iconAsset = SplashScreen.iconAssetForBrightness(
      Theme.of(context).brightness,
      appRole: resolvedRole,
    );

    if (resolvedRole == AppRole.host) {
      return SizedBox(
        width: double.infinity,
        height: CatchStartupTokens.hostStartupBrandStageExtent,
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(
              maxWidth: CatchLayout.maxContentWidth,
            ),
            child: SizedBox(
              width: double.infinity,
              child: Padding(
                padding: const EdgeInsets.only(
                  top: CatchStartupTokens.hostStartupLogoTopInset,
                  left: CatchStartupTokens.hostStartupLogoLeadingInset,
                ),
                child: Align(
                  alignment: Alignment.topLeft,
                  child: Image.asset(
                    iconAsset,
                    key: markKey,
                    width: CatchStartupTokens.hostStartupLogoExtent,
                    height: CatchStartupTokens.hostStartupLogoExtent,
                    semanticLabel: context.l10n.appTitleHost,
                  ),
                ),
              ),
            ),
          ),
        ),
      );
    }

    return SizedBox(
      width: double.infinity,
      height: CatchStartupTokens.startupBrandStageExtent,
      child: Padding(
        padding: const EdgeInsets.only(
          top: CatchStartupTokens.startupLogoTopInset,
        ),
        child: Align(
          alignment: Alignment.topCenter,
          child: Image.asset(
            iconAsset,
            key: markKey,
            width: CatchStartupTokens.startupLogoExtent,
            height: CatchStartupTokens.startupLogoExtent,
            semanticLabel: resolvedRole == AppRole.host
                ? context.l10n.appTitleHost
                : context.l10n.coreCatchStartupLoadingScreenSemanticlabelCatch,
          ),
        ),
      ),
    );
  }
}

class _CatchStartupLoadingScreenState extends State<SplashScreen> {
  Timer? _indicatorDelay;
  bool _showIndicator = false;

  @override
  void initState() {
    super.initState();
    _indicatorDelay = Timer(CatchMotion.startupIndicatorDelay, () {
      if (!mounted) return;
      setState(() {
        _showIndicator = true;
      });
    });
  }

  @override
  void dispose() {
    _indicatorDelay?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final isHost = AppConfig.appRole == AppRole.host;

    return CatchScaffold.standalone(
      backgroundColor: t.bg,
      body: Stack(
        alignment: Alignment.center,
        children: [
          if (isHost)
            const Align(
              alignment: Alignment.topCenter,
              child: StartupBrandHeader(appRole: AppRole.host),
            )
          else
            Center(
              child: Image.asset(
                SplashScreen.iconAssetForBrightness(
                  Theme.of(context).brightness,
                ),
                key: StartupBrandHeader.markKey,
                width: CatchStartupTokens.startupLogoExtent,
                height: CatchStartupTokens.startupLogoExtent,
                semanticLabel: context
                    .l10n
                    .coreCatchStartupLoadingScreenSemanticlabelCatch,
              ),
            ),
          Center(
            child: Transform.translate(
              offset: const Offset(
                0,
                CatchStartupTokens.startupIndicatorOffsetY,
              ),
              child: AnimatedSwitcher(
                duration: CatchMotion.fast,
                switchInCurve: CatchMotion.standardCurve,
                child: _showIndicator
                    ? SizedBox.square(
                        key: ValueKey<String>(
                          context
                              .l10n
                              .coreCatchStartupLoadingScreenBodyStartupLoadingIndicator,
                        ),
                        dimension: CatchStartupTokens.startupIndicatorExtent,
                        child: CatchLoadingIndicator(color: t.ink),
                      )
                    : SizedBox.shrink(
                        key: ValueKey<String>(
                          context
                              .l10n
                              .coreCatchStartupLoadingScreenBodyStartupLoadingDelay,
                        ),
                      ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
