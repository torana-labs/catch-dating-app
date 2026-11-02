import 'package:analysis_server_plugin/plugin.dart';
import 'package:analysis_server_plugin/registry.dart';

import 'src/catch_architecture_rules.dart';
import 'src/catch_row_ownership_rules.dart';
import 'src/catch_ui_rules.dart';

final plugin = _CatchUiLintsPlugin();

class _CatchUiLintsPlugin extends Plugin {
  @override
  String get name => 'catch_ui_lints';

  @override
  void register(PluginRegistry registry) {
    registry.registerWarningRule(CatchUiLayoutRules());
    registry.registerWarningRule(CatchFeedbackRules());
    registry.registerWarningRule(CatchRowOwnershipRules());
    registry.registerWarningRule(CatchArchitectureRules());
  }
}
