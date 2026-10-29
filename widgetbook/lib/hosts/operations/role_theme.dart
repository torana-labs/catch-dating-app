import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:flutter/material.dart';

class WidgetbookThemedHostPreview extends StatelessWidget {
  const WidgetbookThemedHostPreview({
    super.key,
    required this.child,
    required this.themeMode,
  });

  final Widget child;
  final ThemeMode themeMode;

  @override
  Widget build(BuildContext context) {
    return Theme(
      data: themeMode == ThemeMode.dark ? AppTheme.dark : AppTheme.light,
      child: child,
    );
  }
}

class WidgetbookAppRoleBoundary extends StatefulWidget {
  const WidgetbookAppRoleBoundary({
    super.key,
    required this.role,
    required this.child,
  });

  final AppRole role;
  final Widget child;

  @override
  State<WidgetbookAppRoleBoundary> createState() => _AppRoleBoundaryState();
}

class _AppRoleBoundaryState extends State<WidgetbookAppRoleBoundary> {
  @override
  void initState() {
    super.initState();
    AppConfig.configureEntrypointRole(widget.role);
  }

  @override
  void didUpdateWidget(covariant WidgetbookAppRoleBoundary oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.role != widget.role) {
      AppConfig.configureEntrypointRole(widget.role);
    }
  }

  @override
  Widget build(BuildContext context) {
    AppConfig.configureEntrypointRole(widget.role);
    return widget.child;
  }
}
