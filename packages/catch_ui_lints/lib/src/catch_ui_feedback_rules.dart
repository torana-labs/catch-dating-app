part of 'catch_ui_rules.dart';

/// Feedback publication needs resolved symbols, unlike the syntax-only layout
/// rules below: prefixes, typedefs and tear-offs must not bypass the boundary.
class CatchFeedbackRules extends MultiAnalysisRule {
  CatchFeedbackRules()
    : super(
        name: 'catch_feedback_rules',
        description: 'Routes framework feedback through its canonical owner.',
      );

  static const useCanonicalFeedback = LintCode(
    'catch_use_canonical_feedback',
    'Publish transient feedback through CatchNoticeController using showCatchNotice/showCatchNoticeError; keep field errors contextual and persistent statuses in CatchBanner.',
    severity: DiagnosticSeverity.WARNING,
  );
  static const statusStripIsLayoutOwned = LintCode(
    'catch_status_strip_is_layout_owned',
    'Supply CatchBannerStatus through the screen status slot or CatchBannerStatusScope; only canonical screen layouts may place the persistent strip.',
    severity: DiagnosticSeverity.WARNING,
  );
  static const noticeHostIsAppOwned = LintCode(
    'catch_notice_host_is_app_owned',
    'CatchNoticeOverlay belongs once above the router in app.dart; features publish CatchNoticeData rather than creating a route-local overlay.',
    severity: DiagnosticSeverity.WARNING,
  );
  static const notificationDeliveryIsServiceOwned = LintCode(
    'catch_notification_delivery_is_service_owned',
    'FCM foreground delivery belongs to FcmService; features must use the validated session-scoped arrival adapter.',
    severity: DiagnosticSeverity.WARNING,
  );

  @override
  bool get canUseParsedResult => false;

  @override
  List<DiagnosticCode> get diagnosticCodes => const [
    useCanonicalFeedback,
    statusStripIsLayoutOwned,
    noticeHostIsAppOwned,
    notificationDeliveryIsServiceOwned,
  ];

  @override
  void registerNodeProcessors(
    RuleVisitorRegistry registry,
    RuleContext context,
  ) {
    final path = context.definingUnit.file.path.replaceAll(r'\', '/');
    if (!path.contains('/lib/') ||
        path.contains('/test/') ||
        path.contains('/integration_test/') ||
        path.endsWith('.g.dart') ||
        path.endsWith('.freezed.dart')) {
      return;
    }
    final visitor = _CatchFeedbackVisitor(this, path);
    registry.addInstanceCreationExpression(this, visitor);
    registry.addConstructorReference(this, visitor);
    registry.addMethodInvocation(this, visitor);
    registry.addPrefixedIdentifier(this, visitor);
    registry.addPropertyAccess(this, visitor);
    registry.addNamedType(this, visitor);
    registry.addNamedExpression(this, visitor);
  }
}

class _CatchFeedbackVisitor extends SimpleAstVisitor<void> {
  _CatchFeedbackVisitor(this.rule, this.path);

  final CatchFeedbackRules rule;
  final String path;

  void _check(AstNode node, Element? element) {
    final uri = element?.library?.uri.toString();
    if (element is ConstructorElement &&
        element.enclosingElement.name == 'CatchNoticeOverlay' &&
        uri ==
            'package:catch_dating_app/platform/riverpod_ui/catch_notice_overlay.dart' &&
        !const {
          '/lib/app.dart',
          '/widgetbook/lib/primitives/catalog/feedback.dart',
        }.any(path.endsWith)) {
      rule.reportAtNode(
        node,
        diagnosticCode: CatchFeedbackRules.noticeHostIsAppOwned,
      );
    }
    if (element?.name == 'onMessage' &&
        element?.enclosingElement?.name == 'FirebaseMessaging' &&
        uri == 'package:firebase_messaging/firebase_messaging.dart' &&
        !path.endsWith('/lib/platform/push/fcm_service.dart')) {
      rule.reportAtNode(
        node,
        diagnosticCode: CatchFeedbackRules.notificationDeliveryIsServiceOwned,
      );
    }
    if (element is ConstructorElement &&
        element.enclosingElement.name == 'CatchBanner' &&
        element.name == 'statuses' &&
        uri == 'package:catch_ui/src/components/catch_banner.dart' &&
        !const {
          '/packages/catch_ui/lib/src/patterns/catch_scaffold.dart',
          '/packages/catch_ui/lib/src/patterns/catch_root_screen_scroll_view.dart',
          '/packages/catch_ui/lib/src/patterns/catch_route_scaffold.dart',
          '/widgetbook/lib/primitives/contracts/feedback.dart',
        }.any(path.endsWith)) {
      rule.reportAtNode(
        node,
        diagnosticCode: CatchFeedbackRules.statusStripIsLayoutOwned,
      );
    }
    final constructor =
        element is ConstructorElement &&
            uri == 'package:flutter/src/material/snack_bar.dart' &&
            const {
              'SnackBar',
              'SnackBarAction',
            }.contains(element.enclosingElement.name) ||
        element is ConstructorElement &&
            uri == 'package:flutter/src/material/snack_bar_theme.dart' &&
            const {
              'SnackBarThemeData',
              'SnackBarTheme',
            }.contains(element.enclosingElement.name) ||
        element is ConstructorElement &&
            uri == 'package:flutter/src/material/banner.dart' &&
            element.enclosingElement.name == 'MaterialBanner' ||
        element is ConstructorElement &&
            uri == 'package:flutter/src/material/scaffold.dart' &&
            element.enclosingElement.name == 'ScaffoldMessenger';
    final messengerLookup =
        element is MethodElement &&
        element.enclosingElement?.name == 'ScaffoldMessenger' &&
        uri == 'package:flutter/src/material/scaffold.dart' &&
        const {'of', 'maybeOf'}.contains(element.name);
    final publisher =
        element is MethodElement &&
        element.enclosingElement?.name == 'ScaffoldMessengerState' &&
        uri == 'package:flutter/src/material/scaffold.dart' &&
        const {
          'showSnackBar',
          'showMaterialBanner',
          'clearSnackBars',
          'hideCurrentSnackBar',
          'removeCurrentSnackBar',
          'clearMaterialBanners',
          'hideCurrentMaterialBanner',
          'removeCurrentMaterialBanner',
        }.contains(element.name);
    final messengerType =
        element is InterfaceElement &&
        const {
          'ScaffoldMessenger',
          'ScaffoldMessengerState',
        }.contains(element.name) &&
        uri == 'package:flutter/src/material/scaffold.dart';
    final snackbarThemeType =
        element is InterfaceElement &&
        const {'SnackBarThemeData', 'SnackBarTheme'}.contains(element.name) &&
        uri == 'package:flutter/src/material/snack_bar_theme.dart';
    final materialAppMessengerKey =
        element is FormalParameterElement &&
        element.name == 'scaffoldMessengerKey' &&
        element.enclosingElement?.name == 'MaterialApp' &&
        uri == 'package:flutter/src/material/app.dart';
    if (constructor ||
        messengerLookup ||
        publisher ||
        messengerType ||
        snackbarThemeType ||
        materialAppMessengerKey) {
      rule.reportAtNode(
        node,
        diagnosticCode: CatchFeedbackRules.useCanonicalFeedback,
      );
    }
  }

  @override
  void visitInstanceCreationExpression(InstanceCreationExpression node) =>
      _check(node, node.constructorName.element);

  @override
  void visitConstructorReference(ConstructorReference node) =>
      _check(node, node.constructorName.element);

  @override
  void visitMethodInvocation(MethodInvocation node) =>
      _check(node.methodName, node.methodName.element);

  @override
  void visitPrefixedIdentifier(PrefixedIdentifier node) =>
      _check(node, node.element);

  @override
  void visitPropertyAccess(PropertyAccess node) =>
      _check(node, node.propertyName.element);

  @override
  void visitNamedType(NamedType node) => _check(node, node.element);

  @override
  void visitNamedExpression(NamedExpression node) => _check(node, node.element);
}
