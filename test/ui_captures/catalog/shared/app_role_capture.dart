// Capture fixtures shared by more than one catalog entry. Only the entries
// that import this file depend on it.

import 'package:catch_platform/app_config.dart';
import 'package:flutter/material.dart';

class AppRoleCapture extends StatefulWidget {
  const AppRoleCapture({super.key, required this.role, required this.child});

  final AppRole role;
  final Widget child;

  @override
  State<AppRoleCapture> createState() => AppRoleCaptureState();
}

class AppRoleCaptureState extends State<AppRoleCapture> {
  @override
  void initState() {
    super.initState();
    AppConfig.configureEntrypointRole(widget.role);
  }

  @override
  void didUpdateWidget(AppRoleCapture oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.role != widget.role) {
      AppConfig.configureEntrypointRole(widget.role);
    }
  }

  @override
  void dispose() {
    AppConfig.resetEntrypointRoleOverrideForTesting();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    AppConfig.configureEntrypointRole(widget.role);
    return widget.child;
  }
}
