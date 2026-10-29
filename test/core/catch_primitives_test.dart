import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/core/city_catalog.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_scaffold.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_sliver_error_state.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_overlay.dart';
import 'package:catch_dating_app/core/theme/activity_palette.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/core/widgets/activity_map_pin.dart';
import 'package:catch_dating_app/core/widgets/event_thumbnail.dart';
import 'package:catch_dating_app/core/widgets/splash_screen.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';

part 'catch_primitives_async_feedback_tests.dart';
part 'catch_primitives_button_tests.dart';
part 'catch_primitives_composition_tests.dart';
part 'catch_primitives_controls_tests.dart';
part 'catch_primitives_error_async_tests.dart';
part 'catch_primitives_search_menu_tests.dart';

void main() {
  _registerCatchPrimitivesControlsTests();
  _registerCatchPrimitivesCompositionTests();
  _registerCatchPrimitivesAsyncFeedbackTests();
  _registerCatchPrimitivesErrorAsyncTests();
  _registerCatchPrimitivesSearchMenuTests();
}

Finder get _startupLogoFinder {
  return find.byWidgetPredicate(
    (widget) => widget is Image && widget.semanticLabel == 'Catch',
  );
}

Widget _wrap(Widget child, {ThemeData? theme, double textScale = 1}) {
  return MaterialApp(
    theme: theme ?? AppTheme.light,
    home: MediaQuery(
      data: MediaQueryData.fromView(
        WidgetsBinding.instance.platformDispatcher.views.single,
      ).copyWith(textScaler: TextScaler.linear(textScale)),
      child: Scaffold(body: Center(child: child)),
    ),
  );
}

Widget _feedbackWrap(Widget child, {ThemeData? theme}) => ProviderScope(
  child: MaterialApp(
    theme: theme ?? AppTheme.light,
    home: CatchNoticeOverlay(child: Scaffold(body: child)),
  ),
);

bool _chipSelected(WidgetTester tester, Finder chip) {
  final semantics = tester.widget<Semantics>(
    find
        .descendant(
          of: chip,
          matching: find.byWidgetPredicate(
            (widget) =>
                widget is Semantics &&
                (widget.properties.selected != null ||
                    widget.properties.checked != null),
          ),
        )
        .first,
  );
  return semantics.properties.checked ?? semantics.properties.selected!;
}
