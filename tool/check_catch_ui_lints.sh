#!/usr/bin/env bash
set -euo pipefail

# NOTE: this script verifies that the Catch UI *lint rules fire* — it seeds
# deliberately-violating fixtures below and asserts they are reported. It does
# NOT analyse lib/. To check whether your own code is clean, run the gate CI
# uses: `node tool/ci/check_flutter_workspace_analysis.mjs`.

probe_parent="tool/catch_ui_lints_probe"
mkdir -p "$probe_parent"
# Sweep residue from runs that died before their EXIT trap could fire (SIGKILL,
# a crashed shell, an interrupted agent). Left in place these are violating
# Dart files inside the tree, so the next `dart analyze` reports this script's
# own fixtures as findings in your code.
rm -rf "${probe_parent:?}"/run.*
probe_root="$(mktemp -d "$probe_parent/run.XXXXXX")"
probe_path="$probe_root/lib/events/presentation/widgets/event_detail_lint_probe.dart"
probe_number=0
probe_manifest="$probe_root/expectations.tsv"
dart_bin="${DART_BIN:-dart}"
generated_probe_path="packages/catch_ui_lints/probes/catch_ui_lint_probes.dart"

node tool/design/build_lint_enforcement_tables.mjs --check

sizing_rule_source="packages/catch_ui_lints/lib/src/catch_ui_rules.dart"
if ! grep -Fq "'/lib/design_fixtures/'" "$sizing_rule_source"; then
  echo "Catch UI sizing enforcement must exclude the canonical design fixture catalog." >&2
  exit 1
fi
if grep -Fq "'/lib/labs/'" "$sizing_rule_source"; then
  echo "Catch UI sizing enforcement still references the retired product labs path." >&2
  exit 1
fi
if grep -Fq "explore_concept" "$sizing_rule_source"; then
  echo "Catch UI sizing enforcement still references the retired Explore concept path." >&2
  exit 1
fi
if grep -Fq "'/generated/'" "$sizing_rule_source"; then
  echo "Catch UI enforcement must not exempt every source directory named generated." >&2
  exit 1
fi

# Rules scope owners and exemptions to exact files by path suffix. A renamed or
# deleted file leaves a dead entry behind, which silently stops enforcing (or
# exempting) anything, so every exact file a rule names must still exist.
rule_file_suffixes="$(grep -ohE "'/(lib|packages|apps|widgetbook|test)/[A-Za-z0-9_/.]+[.]dart'" \
  packages/catch_ui_lints/lib/src/*.dart | tr -d "'" | sort -u)"
if [[ -z "$rule_file_suffixes" ]]; then
  echo "Catch UI enforcement names no exact files; the path pattern in this check is stale." >&2
  exit 1
fi
tracked_dart_files="$(git ls-files '*.dart' | sed 's#^#/#')"
dead_rule_files=""
while IFS= read -r suffix; do
  grep -Fq -- "$suffix" <<< "$tracked_dart_files" ||
    dead_rule_files+="  $suffix"$'\n'
done <<< "$rule_file_suffixes"
if [[ -n "$dead_rule_files" ]]; then
  printf 'Catch UI enforcement names files that no longer exist:\n%s' "$dead_rule_files" >&2
  exit 1
fi

cleanup() {
  rm -rf "$probe_root"
}
trap cleanup EXIT
trap 'cleanup; exit 130' HUP INT TERM

# Keep each fixture in its own library while preserving path-based ownership.
# Assertions below are recorded per file, then checked after one analyzer run.
stage_probe() {
  local name="$1"
  probe_number=$((probe_number + 1))
  current_probe_file="$probe_root/$probe_number/${probe_path#"$probe_root"/}"
  mkdir -p "$(dirname "$current_probe_file")"
  cat >"$current_probe_file"
  printf '%s\tcase\t%s\t0\n' "$current_probe_file" "$name" >> "$probe_manifest"
}

expect_code_count() {
  local name="$1" code="$2" minimum="$3"
  printf '%s\tmin\t%s\t%s\n' "$current_probe_file" "$code" "$minimum" >> "$probe_manifest"
}

expect_probe() {
  printf '%s\t%s\t%s\t%s\n' "$current_probe_file" "$1" "${2:--}" "${3:-0}" >> "$probe_manifest"
}

stage_probe "seeded violation corpus" <<'DART'
import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:catch_ui/catch_ui.dart' as spacing;
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_scaffold.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_sliver_error_state.dart';
import 'package:catch_dating_app/core/widgets/event_activity_visuals.dart';
import 'package:catch_dating_app/core/widgets/event_backdrop_image.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';

// sizing:allow: seeded allow debt

const double _probeCardHeight = 120;
const _probeScreenPadding = EdgeInsets.fromLTRB(
  CatchSpacing.screenPx,
  CatchSpacing.s4,
  CatchSpacing.screenPx,
  CatchSpacing.s6,
);

abstract final class Sizes {
  static const double p12 = 12;
}

final eventRepositoryProvider = Provider<int>((ref) => 1);
final eventAsyncProvider = FutureProvider<int>((ref) async => 1);

class CatchUiLintProbe extends StatelessWidget {
  const CatchUiLintProbe({super.key});

  @override
  Widget build(BuildContext context) {
    final style = GoogleFonts.getFont('Roboto');
    final rawVoice = CatchFonts.voice(fontSize: 16, height: 1.2);
    return Column(
      children: [
        const _ProbeSection(),
        const SizedBox(height: 12),
        const _ProbeSection(),
        const SizedBox(height: _probeCardHeight),
        const Icon(Icons.add, size: 24),
        const SizedBox(height: CatchSpacing.s3 + 2),
        const SizedBox(height: spacing.CatchSpacing.s3 + 2),
        const SizedBox(height: Sizes.p12),
        const Padding(
          padding: EdgeInsets.fromLTRB(
            CatchSpacing.s5,
            CatchSpacing.s4,
            CatchSpacing.s5,
            CatchSpacing.s6,
          ),
          child: SizedBox.shrink(),
        ),
        const Chip(label: Text('raw')),
        TextButton(onPressed: null, child: const Text('raw')),
        const IconButton(onPressed: null, icon: Icon(Icons.close)),
        EventBackdropImage(
          visual: eventActivityVisual(ActivityKind.running),
        ),
        Image.asset('assets/branding/catch_icon.png'),
        const CircularProgressIndicator(strokeWidth: 1),
        const CatchLoadingIndicator(strokeWidth: 1),
        const Divider(thickness: 1),
        const ColoredBox(color: Color(0xFFFF0000), child: SizedBox.shrink()),
        const ColoredBox(
          color: Color.fromARGB(255, 255, 0, 0),
          child: SizedBox.shrink(),
        ),
        const ColoredBox(
          color: Color.fromRGBO(255, 0, 0, 1),
          child: SizedBox.shrink(),
        ),
        const ColoredBox(color: Colors.red, child: SizedBox.shrink()),
        const ColoredBox(
          color: CupertinoColors.systemBlue,
          child: SizedBox.shrink(),
        ),
        const Text(
          'raw',
          style: TextStyle(
            fontFamily: 'Archivo',
            fontSize: 18,
            letterSpacing: 1,
          ),
        ),
        Text('raw', style: GoogleFonts.roboto(fontSize: 18)),
        Text('raw', style: style),
        Text('raw', style: rawVoice),
        Text('raw', style: CatchTextStyles.bodyM(context)),
        Image.network('https://example.com/probe.png'),
        const Padding(
          padding: _probeScreenPadding,
          child: SizedBox.shrink(),
        ),
        CatchTopBar(
          title: 'Probe',
          actions: const [Row(children: [SizedBox.shrink()])],
        ),
        const CatchSectionList(children: [SizedBox.shrink()]),
        const CatchField.read(title: 'Outside section'),
        // A type name is not a composition boundary.
        const _ProbeFormSchemaWrapper(
          child: CatchField.read(title: 'Name-only boundary'),
        ),
        const CatchFieldGeometryScope(
          gutterOwnership: CatchFieldGeometryScopeMode.container,
          child: SizedBox.shrink(),
        ),
        CatchFieldInteractionPlaneScope.fromPadding(
          context: context,
          padding: EdgeInsets.all(16),
          child: SizedBox.shrink(),
        ),
        const CatchSectionSurface(
          padding: EdgeInsets.zero,
          child: SizedBox.shrink(),
        ),
        const CatchFieldLanes.single(
          gutterOwnership: CatchFieldGeometryScopeMode.container,
          child: CatchField.read(title: 'Feature-owned gutter'),
        ),
        const CatchSection.fieldRows(
          children: [CatchField.read(title: 'Field divider', divider: true)],
        ),
        const Center(child: Text('Failed to load')),
        Scaffold(
          bottomNavigationBar: const NavigationBar(destinations: []),
          body: const SizedBox.shrink(),
        ),
        Opacity(opacity: 0.5, child: const SizedBox.shrink()),
        AnimatedOpacity(
          opacity: 0.5,
          duration: const Duration(milliseconds: 120),
          curve: Curves.easeIn,
          child: const SizedBox.shrink(),
        ),
        LayoutBuilder(
          builder: (context, constraints) {
            return constraints.maxWidth > 640
                ? const SizedBox.shrink()
                : const SizedBox.shrink();
          },
        ),
        Container(
          decoration: BoxDecoration(
            border: Border.all(width: 1),
            borderRadius: BorderRadius.circular(12),
            boxShadow: const [
              BoxShadow(color: Colors.black, blurRadius: 12),
            ],
          ),
          child: const SizedBox.shrink(),
        ),
        const CatchSurface(
          child: CatchSurface(
            child: SizedBox.shrink(),
          ),
        ),
        const CatchSurface(
          borderWidth: 1,
          child: SizedBox.shrink(),
        ),
        const CatchSurface(
          borderSpec: CatchBorderSpec(
            role: CatchBorderRole.boundary,
            color: Colors.transparent,
            width: 1,
          ),
          child: SizedBox.shrink(),
        ),
        const CatchSection(
          child: CatchField.read(title: 'Name'),
        ),
        const CatchSection.contained(
          child: CatchField.read(title: 'Flat field inside one section'),
        ),
        const CatchField(title: 'Legacy field'),
        _buildHeader(),
        const _ProviderProbe(),
      ],
    );
  }

  Widget _buildHeader() => const SizedBox.shrink();
}

class _ProviderProbe extends ConsumerWidget {
  const _ProviderProbe();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final CatchTokens tokens = CatchTokens.of(context);
    final repositoryValue = ref.watch(eventRepositoryProvider);
    final asyncValue = ref.watch(eventAsyncProvider);
    return Column(
      children: [
        Text(
          '${asyncValue.when(data: (value) => value, loading: () => 0)}'
          '$repositoryValue',
          style: CatchTextStyles.supporting(context, color: tokens.ink),
        ),
        CatchAsyncBoundary<int>(
          value: asyncValue,
          builder: (_, value) => Text('$value'),
        ),
        const CatchErrorState(title: 'Unavailable', message: 'Try elsewhere.'),
        CatchLocalizedErrorState(StateError('Unavailable')),
        CatchLocalizedErrorScaffold(StateError('Unavailable')),
        CatchLocalizedSliverErrorState(StateError('Unavailable')),
      ],
    );
  }
}

class _ProbeFormSchemaWrapper extends StatelessWidget {
  const _ProbeFormSchemaWrapper({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) => child;
}

class _ProbeSection extends StatelessWidget {
  const _ProbeSection();

  @override
  Widget build(BuildContext context) => const SizedBox.shrink();
}
DART

expect_probe nonzero

expect_code_count "seeded violation corpus" "catch_no_raw_ui_spacing" 1
expect_code_count "seeded violation corpus" "catch_use_section_list" 1
expect_code_count "seeded violation corpus" "catch_no_token_arithmetic" 1
expect_code_count "seeded violation corpus" "catch_prefer_semantic_insets" 1
expect_code_count \
  "seeded violation corpus" \
  "catch_event_detail_prefers_photo_thumbnail" \
  1
expect_code_count "seeded violation corpus" "catch_no_raw_material_control" 1
expect_code_count "seeded violation corpus" "catch_no_raw_button_control" 1
expect_code_count "seeded violation corpus" "catch_no_widget_returning_method" 1
expect_code_count "seeded violation corpus" "catch_no_raw_color" 5
expect_code_count "seeded violation corpus" "catch_no_raw_text_style" 1
expect_code_count "seeded violation corpus" "catch_no_raw_font_drift" 3
expect_code_count "seeded violation corpus" "catch_no_direct_font_builder" 1
expect_code_count "seeded violation corpus" "catch_no_raw_letter_spacing" 1
expect_code_count "seeded violation corpus" "catch_no_raw_radius" 1
expect_code_count "seeded violation corpus" "catch_no_raw_content_dimension" 1
expect_code_count "seeded violation corpus" "catch_no_local_design_constant" 1
expect_code_count "seeded violation corpus" "catch_no_raw_icon_source" 1
expect_code_count "seeded violation corpus" "catch_no_raw_icon_size" 1
expect_code_count "seeded violation corpus" "catch_no_raw_alpha" 1
expect_code_count "seeded violation corpus" "catch_no_raw_shadow" 1
expect_code_count "seeded violation corpus" "catch_no_raw_motion" 1
expect_code_count "seeded violation corpus" "catch_no_raw_breakpoint" 1
expect_code_count "seeded violation corpus" "catch_no_raw_surface_shell" 1
expect_code_count "seeded violation corpus" "catch_no_raw_stroke_width" 6
expect_code_count "seeded violation corpus" "catch_no_raw_asset_path" 1
expect_code_count \
  "seeded violation corpus" \
  "catch_no_nested_rounded_rectangles" \
  1
expect_code_count \
  "seeded violation corpus" \
  "catch_icon_button_requires_tooltip" \
  1
expect_code_count "seeded violation corpus" "catch_no_allow_debt" 1
expect_code_count \
  "seeded violation corpus" \
  "catch_use_named_catch_field_constructor" \
  1
expect_code_count \
  "seeded violation corpus" \
  "catch_use_named_catch_section_constructor" \
  1
expect_code_count "seeded violation corpus" "catch_no_raw_network_image" 1
expect_code_count \
  "seeded violation corpus" \
  "catch_no_presentation_platform_import" \
  1
expect_code_count "seeded violation corpus" "catch_no_tokens_prop_drilling" 1
expect_code_count \
  "seeded violation corpus" \
  "catch_no_presentation_repository_reach" \
  1
expect_code_count "seeded violation corpus" "catch_no_legacy_spacing_token" 1
expect_code_count \
  "seeded violation corpus" \
  "catch_no_low_level_typography_role" \
  1
expect_code_count \
  "seeded violation corpus" \
  "catch_screen_gutter_uses_semantic_insets" \
  1
expect_code_count "seeded violation corpus" "catch_text_requires_style" 1
expect_code_count \
  "seeded violation corpus" \
  "catch_top_bar_requires_action_group" \
  1
expect_code_count "seeded violation corpus" "catch_shell_owns_tab_scaffold" 1
expect_code_count \
  "seeded violation corpus" \
  "catch_field_requires_section_context" \
  2
expect_code_count \
  "seeded violation corpus" \
  "catch_field_geometry_is_section_owned" \
  3
expect_code_count \
  "seeded violation corpus" \
  "catch_field_divider_is_section_owned" \
  2
expect_code_count \
  "seeded violation corpus" \
  "catch_section_list_requires_empty_policy" \
  1
expect_code_count \
  "seeded violation corpus" \
  "catch_async_requires_state_surface" \
  1
expect_code_count \
  "seeded violation corpus" \
  "catch_async_requires_retry" \
  1
expect_code_count \
  "seeded violation corpus" \
  "catch_error_state_requires_action" \
  4
expect_code_count "seeded violation corpus" "catch_no_raw_error_surface" 1
expect_code_count \
  "seeded violation corpus" \
  "catch_no_shell_local_measurement" \
  1

probe_path="$probe_root/lib/core/widgets/text_migration_lint_probe.dart"
stage_probe "CatchText steer rejects covered direct roles" <<'DART'
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/material.dart' as fw;

Widget textMigrationProbe(BuildContext context) => Column(children: [
  Text('Covered role', style: CatchTextStyles.supporting(context)),
  fw.Text('Clamped role', maxLines: 1, overflow: TextOverflow.ellipsis,
    style: CatchTextStyles.sectionTitle(context)),
]);
DART
expect_probe exact catch_text_requires_style 2

stage_probe "CatchText steer leaves unsupported APIs and library text legal" <<'DART'
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

Widget textMigrationCleanProbe(BuildContext context) => Column(children: [
  const CatchText('Library text', variant: CatchTextVariant.supporting),
  Text('Uncovered role', style: CatchTextStyles.mono(context)),
  Text('Extra API', semanticsLabel: 'Details', style: CatchTextStyles.supporting(context)),
  Text('Clipped text', maxLines: 1, style: CatchTextStyles.supporting(context)),
  Text('Modified role', style: CatchTextStyles.supporting(context).copyWith(color: null)),
]);
DART
expect_probe exact catch_text_requires_style 0

probe_path="$probe_root/lib/core/widgets/drawing_migration_lint_probe.dart"
stage_probe "drawing steer rejects SDK constructors and inherited drawing" <<'DART'
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart' as fw;
typedef SurfaceAlias = fw.ColoredBox;
class FeatureShell extends fw.ColoredBox {
  const FeatureShell():super(color: fw.Colors.transparent);
}
fw.Widget drawingProbe() => SurfaceAlias(
  color: fw.Colors.transparent, child: const fw.Opacity(opacity: 1),
);
DART
expect_probe exact catch_no_raw_surface_shell 3

stage_probe "drawing strategy bases belong in the library" <<'DART'
import 'package:flutter/material.dart' as fw;
abstract class FeaturePainter extends fw.CustomPainter {}
abstract class FeatureClipper extends fw.CustomClipper<fw.Path> {}
abstract class FeatureDecoration extends fw.Decoration {}
DART
expect_probe exact catch_no_raw_surface_shell 3

stage_probe "drawing steer permits arrangement, library primitives and unavailable families" <<'DART'
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
Widget arrangementProbe(BuildContext context) => Column(children: [
  const CatchText('Library', variant: CatchTextVariant.supporting),
  const Row(), const Stack(), const SizedBox.shrink(),
  const Padding(padding: CatchInsets.pageBody),
  const Icon(Icons.close),
  const Tooltip(message: 'Help', child: SizedBox.shrink()),
]);
DART
expect_probe exact catch_no_raw_surface_shell 0

for drawing_scope in \
  "lib/core/widgets/drawing_boundary_probe.dart" \
  "lib/events/presentation/drawing_boundary_probe.dart"; do
  probe_path="$probe_root/$drawing_scope"
  stage_probe "drawing boundary delegates existing diagnostics $drawing_scope" <<'DART'
import 'package:flutter/material.dart';
typedef CardAlias = Card;
typedef ImageAlias = Image;
List<Widget> drawingBoundaryProbe(String url) => [
  const Card(child: SizedBox.shrink()),
  const CardAlias(child: SizedBox.shrink()),
  Image.network(url), ImageAlias.network(url),
];
DART
  if [[ "$drawing_scope" == lib/core/widgets/* ]]; then
    expect_probe exact catch_no_raw_surface_shell 4
    expect_probe exact catch_no_raw_material_control 0
    expect_probe exact catch_no_raw_network_image 0
  else
    expect_probe exact catch_no_raw_surface_shell 0
    expect_probe exact catch_no_raw_material_control 2
    expect_probe exact catch_no_raw_network_image 2
  fi
done

probe_path="$probe_root/lib/hosts/presentation/error_recovery_lint_probe.dart"
stage_probe "canonical error recovery rejects empty actions" <<'DART'
import 'package:catch_ui/catch_ui.dart';
import 'package:catch_ui/catch_ui.dart' as ui;
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:flutter/material.dart';

final missingRecovery = CatchErrorState(title: 'Error', message: 'Try again');
final emptyRecovery = CatchErrorState(title: 'Error', message: 'Try again', actions: const []);
final nullRecovery = CatchErrorState(title: 'Error', message: 'Try again', onRetry: null);
final emptySliverRecovery = CatchSliverErrorState(title: 'Error', message: 'Try again', actions: const []);
final explicitFullScreen = CatchErrorState(title: 'Error', message: 'Try again', mode: CatchErrorStateMode.fullScreen);
final inline = CatchErrorState(title: 'Error', message: 'Try again', mode: CatchErrorStateMode.inline);
final compact = CatchErrorState(title: 'Error', message: 'Try again', mode: ui.CatchErrorStateMode.compact);
final localizedInline = CatchLocalizedErrorState(Exception('Error'), mode: CatchErrorStateMode.inline);
final localizedCompact = CatchLocalizedErrorState(Exception('Error'), mode: ui.CatchErrorStateMode.compact);
void recover() {}
final retry = CatchErrorState(title: 'Error', message: 'Try again', onRetry: recover, retryLabel: 'Retry');
final exit = CatchErrorState(title: 'Error', message: 'Try again', actions: [CatchButton.text(label: 'Back', onPressed: recover)]);
final sliverExit = CatchSliverErrorState(title: 'Error', message: 'Try again', actions: [CatchButton.text(label: 'Back', onPressed: recover)]);
DART
expect_probe exact catch_error_state_requires_action 5

probe_path="$probe_root/lib/hosts/presentation/host_async_state_lint_probe.dart"
stage_probe "Host route-edge async-state violation" <<'DART'
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final hostAsyncProvider = FutureProvider<int>((ref) async => 1);

class HostAsyncStateLintProbe extends ConsumerWidget {
  const HostAsyncStateLintProbe({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final hostAsync = ref.watch(hostAsyncProvider);
    return Text(
      hostAsync.isLoading ? 'Loading' : 'Ready',
      style: CatchTextStyles.bodyM(context),
    );
  }
}
DART

expect_code_count \
  "Host route-edge async-state violation" \
  "catch_async_requires_state_surface" \
  1

probe_path="$probe_root/lib/events/presentation/consumer_async_state_lint_probe.dart"
stage_probe "Consumer route-edge async-state violation" <<'DART'
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final eventAsyncProvider = FutureProvider<int>((ref) async => 1);

class ConsumerAsyncStateLintProbe extends ConsumerWidget {
  const ConsumerAsyncStateLintProbe({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final eventAsync = ref.watch(eventAsyncProvider);
    return Text(
      eventAsync.hasError ? 'Unavailable' : 'Ready',
      style: CatchTextStyles.bodyM(context),
    );
  }
}
DART

expect_code_count \
  "Consumer route-edge async-state violation" \
  "catch_async_requires_state_surface" \
  1

probe_path="$probe_root/lib/events/presentation/generated/prefixed_constructor_probe.dart"
stage_probe "prefixed constructor in authored generated-named directory" <<'DART'
import 'package:flutter/material.dart' as material;

class PrefixedConstructorProbe extends material.StatelessWidget {
  const PrefixedConstructorProbe({super.key});

  @override
  material.Widget build(material.BuildContext context) {
    return const material.Chip(
      label: material.Text('Raw prefixed control'),
    );
  }
}
DART

expect_code_count \
  "prefixed constructor in authored generated-named directory" \
  "catch_no_raw_material_control" \
  1

probe_path="$probe_root/lib/events/presentation/widgets/raw_menu_anchor_probe.dart"
stage_probe "raw menu anchor bypass" <<'DART'
import 'package:flutter/material.dart';

class RawMenuAnchorProbe extends StatelessWidget {
  const RawMenuAnchorProbe({super.key});

  @override
  Widget build(BuildContext context) {
    return MenuAnchor(
      menuChildren: const [MenuItemButton(child: Text('Raw'))],
      builder: (_, controller, child) => TextButton(
        onPressed: controller.open,
        child: const Text('Open'),
      ),
    );
  }
}
DART

expect_code_count \
  "raw menu anchor bypass" \
  "catch_no_raw_button_control" \
  1

probe_path="$probe_root/lib/events/presentation/widgets/event_detail_lint_probe.dart"

stage_probe "generated steering corpus" <"$generated_probe_path"
while IFS=$'\t' read -r code minimum; do
  expect_code_count "generated steering corpus" "$code" "$minimum"
done < <(
  node -e '
    const expectations = require(`./tool/design/generated/enforcement_expectations.json`);
    for (const [code, minimum] of Object.entries(expectations.generatedProbeMinimums)) {
      process.stdout.write(`${code}\t${minimum}\n`);
    }
  '
)

stage_probe "transparent drawing still belongs to the library" <<'DART'
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class CatchUiLintProbe extends StatelessWidget {
  const CatchUiLintProbe({super.key});

  @override
  Widget build(BuildContext context) {
    return const Column(
      children: [
        ColoredBox(color: Colors.transparent, child: SizedBox.shrink()),
        ColoredBox(color: Color(0x00000000), child: SizedBox.shrink()),
        Padding(
          padding: CatchInsets.pageBody,
          child: SizedBox.shrink(),
        ),
        CatchSurface.tinted(child: SizedBox.shrink()),
      ],
    );
  }
}
DART

expect_probe exact catch_no_raw_surface_shell 2
expect_probe exact catch_no_raw_color 0

stage_probe "mutation pending per-mutation violation" <<'DART'
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class EventDetailMutationProbeController {
  static final saveMutation = Mutation<void>();
  static final deleteMutation = Mutation<void>();
}

class CatchUiMutationProbe extends ConsumerWidget {
  const CatchUiMutationProbe({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final saveMutation = ref.watch(
      EventDetailMutationProbeController.saveMutation,
    );
    final deleteMutationHandle =
        EventDetailMutationProbeController.deleteMutation;
    final deleteMutation = ref.watch(deleteMutationHandle);
    final saveFailed = saveMutation.hasError;
    return Text(deleteMutation.isPending || saveFailed ? 'Busy' : 'Ready');
  }
}
DART

expect_code_count \
  "mutation pending per-mutation violation" \
  "catch_mutation_pending_requires_error" \
  1

stage_probe "mutation pending per-mutation clean case" <<'DART'
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

void listenToCatchMutationErrors(
  BuildContext context,
  WidgetRef ref, {
  required List<Mutation<dynamic>> mutations,
}) {}

class EventDetailMutationProbeController {
  static final saveMutation = Mutation<void>();
  static final deleteMutation = Mutation<void>();
}

class CatchUiMutationProbe extends ConsumerWidget {
  const CatchUiMutationProbe({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final saveMutation = ref.watch(
      EventDetailMutationProbeController.saveMutation,
    );
    final deleteMutationHandle =
        EventDetailMutationProbeController.deleteMutation;
    final deleteMutation = ref.watch(deleteMutationHandle);
    if (saveMutation.hasError) {
      return const CatchText('Failed', variant: CatchTextVariant.supporting);
    }
    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [deleteMutationHandle],
    );
    return CatchText(
      deleteMutation.isPending ? 'Deleting' : 'Ready',
      variant: CatchTextVariant.supporting,
    );
  }
}
DART

expect_probe clean

probe_path="$probe_root/test/catch_ui_test_lint_probe_test.dart"
stage_probe "test reliability seeded violations" <<'DART'
import 'package:flutter_test/flutter_test.dart';

Future<void> main() async {
  testWidgets('seed test reliability diagnostics', (tester) async {
    await tester.pumpAndSettle();
    await tester.pump(const Duration(milliseconds: 200));
    await tester.tap(find.text('Save'), warnIfMissed: false);
    find.text('Save').first;
    await Future<void>.delayed(Duration.zero);
  });
}
DART

expect_code_count \
  "test reliability seeded violations" \
  "catch_no_brittle_pump_timing" \
  3
expect_code_count \
  "test reliability seeded violations" \
  "catch_no_positional_widget_finder" \
  1
expect_code_count \
  "test reliability seeded violations" \
  "catch_no_async_flush_hack" \
  1

# The feedback rule blocks generic Flutter messenger access across app and
# package roots, including aliases, tear-offs, actions, and clearing APIs.
for feedback_scope in \
  "lib/hosts/presentation/feedback_probe.dart" \
  "apps/consumer/lib/feedback_probe.dart" \
  "apps/host/lib/feedback_probe.dart" \
  "lib/core/widgets/feedback_probe.dart" \
  "packages/catch_ui/lib/src/components/feedback_probe.dart"; do
  probe_path="$probe_root/$feedback_scope"
  stage_probe "resolved feedback $feedback_scope" <<'DART'
import 'package:flutter/material.dart' as material;

typedef SnackAlias = material.SnackBar;

  List<Object?> rawFeedback(material.BuildContext context) {
  final snack = material.SnackBar(content: const material.SizedBox.shrink());
  final alias = SnackAlias(content: const material.SizedBox.shrink());
  final banner = material.MaterialBanner(
    content: const material.SizedBox.shrink(),
    actions: const [material.SizedBox.shrink()],
  );
  final makeSnack = material.SnackBar.new;
  final makeBanner = material.MaterialBanner.new;
  final action = material.SnackBarAction(label: 'Open', onPressed: () {});
  final makeAction = material.SnackBarAction.new;
  final themeData = material.SnackBarThemeData();
  final theme = material.SnackBarTheme(data: themeData, child: const material.SizedBox());
  final makeTheme = material.SnackBarTheme.new;
  final messenger = material.ScaffoldMessenger.of(context);
  final maybeMessenger = material.ScaffoldMessenger.maybeOf(context);
  final messengerWidget = material.ScaffoldMessenger(
    child: const material.SizedBox.shrink(),
  );
  messenger.showSnackBar(snack);
  messenger.showMaterialBanner(banner);
  messenger.clearSnackBars();
  messenger.hideCurrentSnackBar();
  messenger.removeCurrentSnackBar();
  messenger.clearMaterialBanners();
  messenger.hideCurrentMaterialBanner();
  messenger.removeCurrentMaterialBanner();
  final publishSnack = messenger.showSnackBar;
  final publishBanner = material.ScaffoldMessenger.of(context).showMaterialBanner;
  final material.ScaffoldMessengerState? typedMessenger = maybeMessenger;
  final app = material.MaterialApp(
    scaffoldMessengerKey: material.GlobalKey<material.ScaffoldMessengerState>(),
    home: const material.SizedBox(),
  );
  return [alias, makeSnack, makeBanner, action, makeAction, themeData, theme, makeTheme, publishSnack,
    publishBanner, typedMessenger, messengerWidget, app];
}
DART
  expect_code_count "resolved feedback $feedback_scope" "catch_use_canonical_feedback" 33
  expect_probe exact catch_use_canonical_feedback 33
  stage_probe "status placement $feedback_scope" <<'DART'
import 'package:catch_ui/catch_ui.dart' as ui;
typedef StripAlias = ui.CatchBanner;
List<Object> forbiddenPlacement() => [
  const ui.CatchBanner.statuses(statuses: []),
  const StripAlias.statuses(statuses: []),
  ui.CatchBanner.statuses,
];
DART
  expect_code_count "status placement $feedback_scope" "catch_status_strip_is_layout_owned" 3
  expect_probe exact catch_status_strip_is_layout_owned 3
  stage_probe "arrival placement $feedback_scope" <<'DART'
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_overlay.dart' as ui;
import 'package:firebase_messaging/firebase_messaging.dart' as fcm;
import 'package:flutter/widgets.dart';
typedef NoticeOverlayAlias = ui.CatchNoticeOverlay;
List<Object> forbiddenArrivals() => [
  const ui.CatchNoticeOverlay(child: SizedBox()),
  const NoticeOverlayAlias(child: SizedBox()),
  ui.CatchNoticeOverlay.new,
  fcm.FirebaseMessaging.onMessage,
];
DART
  expect_code_count "arrival placement $feedback_scope" "catch_notice_host_is_app_owned" 3
  expect_code_count "arrival delivery $feedback_scope" "catch_notification_delivery_is_service_owned" 1
done

probe_path="$probe_root/lib/app.dart"
stage_probe "global arrival host owner" <<'DART'
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_overlay.dart';
import 'package:flutter/widgets.dart';
final host = CatchNoticeOverlay(child: const SizedBox());
DART
expect_probe exact catch_notice_host_is_app_owned 0

probe_path="$probe_root/lib/core/fcm_service.dart"
stage_probe "foreground transport owner" <<'DART'
import 'package:firebase_messaging/firebase_messaging.dart';
final foreground = FirebaseMessaging.onMessage;
DART
expect_probe exact catch_notification_delivery_is_service_owned 0

for status_owner in \
  "packages/catch_ui/lib/src/patterns/catch_root_screen_scroll_view.dart" \
  "packages/catch_ui/lib/src/patterns/catch_route_scaffold.dart" \
  "packages/catch_ui/lib/src/patterns/catch_scaffold.dart"; do
  probe_path="$probe_root/$status_owner"
  stage_probe "status owner $status_owner" <<'DART'
import 'package:catch_ui/catch_ui.dart';
final status = CatchBanner.statuses(statuses: const []);
DART
  expect_probe exact catch_status_strip_is_layout_owned 0
done

for non_status_owner in \
  "lib/core/widgets/catch_route_scaffold.dart" \
  "lib/core/widgets/catch_scaffold.dart" \
  "packages/catch_ui/lib/src/patterns/catch_root_screen_scaffold.dart"; do
  probe_path="$probe_root/$non_status_owner"
  stage_probe "retired or delegating status non-owner $non_status_owner" <<'DART'
import 'package:catch_ui/catch_ui.dart';
final status = CatchBanner.statuses(statuses: const []);
DART
  expect_probe exact catch_status_strip_is_layout_owned 1
done

probe_path="$probe_root/lib/consumer/presentation/feedback_api_probe.dart"
stage_probe "canonical feedback API" <<'DART'
import 'package:flutter/widgets.dart';
void showCatchNotice(BuildContext context, String message) {}
void owner(BuildContext context) => showCatchNotice(context, 'Saved');
DART
expect_probe exact catch_use_canonical_feedback 0

# No source path grants an exemption for raw framework feedback.
for feedback_scope in \
  "packages/catch_ui/lib/src/components/snack_bar_consumer.dart" \
  "lib/core/widgets/catch_error_notice_consumer.dart"; do
  probe_path="$probe_root/$feedback_scope"
  stage_probe "feedback non-owner $feedback_scope" <<'DART'
import 'package:flutter/material.dart';

void feedbackConsumer(BuildContext context) {
  ScaffoldMessenger.of(context).showSnackBar(
    const SnackBar(content: SizedBox.shrink()),
  );
}
DART
  expect_probe exact catch_use_canonical_feedback 3
done

probe_path="$probe_root/lib/consumer/presentation/feedback_probe.dart"
stage_probe "canonical API and same-name non-framework symbols" <<'DART'
import 'package:flutter/material.dart' as material;
import 'package:catch_ui/catch_ui.dart' as ui;
void showCatchNotice(material.BuildContext context, String message) {}
void showCatchNoticeError(material.BuildContext context, Object error) {}

class SnackBar {}
class MaterialBanner {}
class CatchBanner { CatchBanner.statuses(); }
class ScaffoldMessengerState {
  void showSnackBar(Object notice) {}
  void showMaterialBanner(Object notice) {}
}

List<Object> allowedFeedback(material.BuildContext context) {
  showCatchNotice(context, 'Saved');
  showCatchNoticeError(context, StateError('example'));
  final messenger = ScaffoldMessengerState();
  messenger.showSnackBar(SnackBar());
  messenger.showMaterialBanner(MaterialBanner());
  return [
    SnackBar.new, MaterialBanner.new, messenger.showSnackBar,
    CatchBanner.statuses(), CatchBanner.statuses,
    const ui.CatchBanner(message: 'Inline'), ui.CatchBanner.new,
    ui.CatchBanner.error, ui.CatchBanner.errorWithRetry,
    const ui.CatchBannerStatusScope(statuses: [], child: material.SizedBox()),
  ];
}
DART
expect_probe exact catch_use_canonical_feedback 0
expect_probe exact catch_status_strip_is_layout_owned 0

# Only the exact shared text-entry primitive owns the raw TextField. Its
# package neighbor and retired app path remain ordinary consumers.
for input_scope in \
  "packages/catch_ui/lib/src/primitives/catch_text_input.dart" \
  "packages/catch_ui/lib/src/primitives/text_input_consumer.dart" \
  "lib/core/widgets/catch_text_input.dart"; do
  probe_path="$probe_root/$input_scope"
  stage_probe "text input ownership $input_scope" <<'DART'
import 'package:flutter/material.dart';

Widget inputProbe() => const TextField();
DART
  if [[ "$input_scope" == "packages/catch_ui/lib/src/primitives/catch_text_input.dart" ]]; then
    expect_probe exact catch_no_raw_button_control 0
    expect_probe clean
  else
    expect_probe exact catch_no_raw_button_control 1
  fi
done

# Menu overlays are owned by the exact package anchor, not neighboring files.
for menu_scope in \
  "packages/catch_ui/lib/src/components/catch_menu.dart" \
  "packages/catch_ui/lib/src/components/menu_anchor_consumer.dart" \
  "lib/core/widgets/catch_menu.dart"; do
  probe_path="$probe_root/$menu_scope"
  stage_probe "menu anchor ownership $menu_scope" <<'DART'
import 'package:flutter/material.dart';

Widget menuProbe() => MenuAnchor(menuChildren: const []);
DART
  if [[ "$menu_scope" == "packages/catch_ui/lib/src/components/catch_menu.dart" ]]; then
    expect_probe exact catch_no_raw_button_control 0
    expect_probe clean
  else
    expect_probe exact catch_no_raw_button_control 1
  fi
done

# Extracted L1 definitions retain their exact ownership; a new neighbor does not.
for foundation_scope in \
  "packages/catch_ui/lib/src/foundations/catch_text_styles.dart" \
  "packages/catch_ui/lib/src/foundations/typography_consumer.dart"; do
  probe_path="$probe_root/$foundation_scope"
  stage_probe "foundation definition ownership $foundation_scope" <<'DART'
import 'package:flutter/material.dart';

const probeStyle = TextStyle();
DART
  if [[ "$foundation_scope" == "packages/catch_ui/lib/src/foundations/catch_text_styles.dart" ]]; then
    expect_probe clean
  else
    expect_probe exact catch_no_raw_text_style 1
  fi
done

for image_scope in \
  "packages/catch_ui/lib/src/primitives/catch_network_image.dart" \
  "packages/catch_ui/lib/src/primitives/network_image_consumer.dart"; do
  probe_path="$probe_root/$image_scope"
  stage_probe "network image ownership $image_scope" <<'DART'
import 'package:flutter/material.dart';

Widget imageProbe(String url) => Image.network(url);
DART
  if [[ "$image_scope" == "packages/catch_ui/lib/src/primitives/catch_network_image.dart" ]]; then
    expect_probe clean
  else
    expect_probe exact catch_no_raw_network_image 1
  fi
done

# L0 definitions own literal values; only the token package receives this
# exemption. The identical app-local definition must still be diagnosed.
for token_scope in \
  "packages/catch_tokens/lib/src/primitives/token_probe.dart" \
  "lib/events/presentation/widgets/token_probe.dart"; do
  probe_path="$probe_root/$token_scope"
  stage_probe "token definition ownership $token_scope" <<'DART'
import 'package:flutter/material.dart';

const Color tokenProbeColor = Color(0xFF123456);
DART
  if [[ "$token_scope" == packages/catch_tokens/* ]]; then
    expect_probe clean
  else
    expect_code_count "app-local token definition" "catch_no_raw_color" 1
  fi
done

probe_path="$probe_root/lib/events/presentation/widgets/token_consumer_probe.dart"
stage_probe "extracted component geometry token consumers" <<'DART'
import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/material.dart';

class TokenConsumerProbe extends StatelessWidget {
  const TokenConsumerProbe({super.key});

  @override
  Widget build(BuildContext context) => const SizedBox(
    width: CatchFormWorkspaceTokens.formBuilderOutlineWidth,
    height: CatchWelcomeTokens.welcomeReelRowHeight,
  );
}
DART
expect_probe clean


probe_path="$probe_root/lib/events/presentation/widgets/row_boundary_probe.dart"
stage_probe "resolved row geometry boundaries" <<'DART'
import 'package:catch_ui/catch_ui.dart' as ui;
import 'package:catch_ui/src/components/catch_row_section.dart' as internal;
import 'package:catch_ui/src/components/catch_dependent_row_section.dart' as dependent;
import 'package:catch_ui/src/patterns/catch_row_viewport.dart' as viewport;
import 'package:flutter/widgets.dart';

typedef SectionAlias = ui.CatchSection;
final forbiddenFactory = SectionAlias.formRows;
final forbiddenDependentFactory = dependent.CatchDependentRowSection.new;
Widget bypass() => internal.CatchRowSection(children: const []);
Widget fabricatedWidth() => viewport.CatchRowViewportScope(width: 20, child: const SizedBox());
Widget unscopedFactory() => ui.CatchField.navigate(
  content: const ui.CatchPersonLayout(name: 'Someone'), onActivate: () {});
Widget inset() => Padding(padding: const EdgeInsets.symmetric(horizontal: 20),
  child: ui.CatchSection.rows(children: const []));
Widget content() => ui.CatchSection.content(child: const ui.CatchField.read(
  content: ui.CatchPersonLayout(name:'Someone')));
Widget legacy() => ui.CatchSection.divided(children: const [ui.CatchField.read(
 content: ui.CatchPersonLayout(name:'Someone'))]);
Widget recognizer() => GestureDetector(onTap: () {}, child: const ui.CatchField.read(
  content: ui.CatchPersonLayout(name:'Someone')));
Widget paint() => ColoredBox(color: const Color(0xff222222), child: const ui.CatchField.read(
  content: ui.CatchPersonLayout(name:'Someone')));
DART
expect_code_count "resolved row geometry boundaries" "catch_row_geometry_is_internal" 4
expect_code_count "resolved row geometry boundaries" "catch_row_section_fills_viewport" 1
expect_code_count "resolved row geometry boundaries" "catch_section_content_is_passive" 5
expect_code_count "resolved row geometry boundaries" "catch_field_owns_row_interaction" 2

probe_path="$probe_root/lib/events/presentation/widgets/row_valid_probe.dart"
stage_probe "valid typed row recipes" <<'DART'
import 'package:catch_ui/catch_ui.dart' as ui;
import 'package:flutter/widgets.dart';
Widget rows() => ui.CatchSection.rows(children: const [ui.CatchField.read(
  content: ui.CatchPersonLayout(name:'Someone'))]);
Widget dependent() => ui.CatchSection.dependentFieldRows(
  leading: const ui.CatchField.read(content: ui.CatchPersonLayout(name:'Owner')),
  children: const [ui.CatchField.read(content: ui.CatchPersonLayout(name:'Child'))]);
Widget contained() => Padding(padding: const EdgeInsets.symmetric(horizontal:20),
  child:ui.CatchSection.containedRows(children:const []));
Widget vertical() => Padding(padding: const EdgeInsets.only(top:20),
  child:ui.CatchSection.rows(children:const []));
typedef FieldAlias = ui.CatchField;
FieldAlias fieldFactory() => const ui.CatchField.read(
  content: ui.CatchPersonLayout(name:'Someone'));
DART
expect_probe exact catch_row_geometry_is_internal 0
expect_probe exact catch_row_section_fills_viewport 0
expect_probe exact catch_section_content_is_passive 0
expect_probe exact catch_field_owns_row_interaction 0

node tool/lib/lint_probe_batch.mjs "$probe_root" "$probe_manifest" "$dart_bin"
