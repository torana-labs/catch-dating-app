import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Closed presentation contracts. Feature content cannot choose column counts.
sealed class HostWorkspaceSpec {
  const HostWorkspaceSpec();
  List<CatchWorkspacePane> _panes();
  String get _compactPaneId;
  VoidCallback? get _onBack;
}

final class HostDirectoryWorkspace<T extends Object> extends HostWorkspaceSpec {
  const HostDirectoryWorkspace({
    required this.index,
    required this.selection,
    required this.detailBuilder,
    required this.unselected,
    this.onBack,
    this.descendants = const [],
    this.recordId,
  });
  final Widget index;
  final T? selection;
  final Widget Function(T) detailBuilder;
  final Widget unselected;
  final VoidCallback? onBack;
  final List<HostWorkspaceRecord> descendants;
  final String Function(T)? recordId;

  @override
  List<CatchWorkspacePane> _panes() => [
    CatchWorkspacePane(id: 'index', child: index),
    CatchWorkspacePane(
      id: selection == null
          ? 'placeholder'
          : (recordId?.call(selection!) ?? 'record'),
      child: selection == null ? unselected : detailBuilder(selection!),
    ),
    if (selection != null)
      for (final record in descendants)
        CatchWorkspacePane(id: record.id, child: record.content),
  ];
  @override
  String get _compactPaneId => selection == null
      ? 'index'
      : descendants.isEmpty
      ? (recordId?.call(selection!) ?? 'record')
      : descendants.last.id;
  @override
  VoidCallback? get _onBack => selection == null ? null : onBack;
}

final class HostEditorWorkspace extends HostWorkspaceSpec {
  const HostEditorWorkspace({
    required this.editor,
    required this.preview,
    this.showPreview = true,
  });
  final Widget editor;
  final Widget preview;
  final bool showPreview;
  @override
  List<CatchWorkspacePane> _panes() => [
    CatchWorkspacePane(
      id: 'index',
      mode: CatchWorkspacePaneMode.editor,
      child: editor,
    ),
    if (showPreview) CatchWorkspacePane(id: 'placeholder', child: preview),
  ];
  @override
  String get _compactPaneId => 'index';
  @override
  VoidCallback? get _onBack => null;
}

final class HostTaskWorkspace extends HostWorkspaceSpec {
  const HostTaskWorkspace({required this.content});
  final Widget content;
  @override
  List<CatchWorkspacePane> _panes() => [
    CatchWorkspacePane(id: 'index', child: content),
  ];
  @override
  String get _compactPaneId => 'index';
  @override
  VoidCallback? get _onBack => null;
}

/// A descendant record contains no geometry or device-specific presentation.
final class HostWorkspaceRecord {
  const HostWorkspaceRecord({required this.id, required this.content});
  final String id;
  final Widget content;
}

/// Sole adapter from semantic workspaces and router ancestry to physical panes.
class HostNavigationWorkspace extends StatelessWidget {
  const HostNavigationWorkspace({super.key, required this.spec});
  final HostWorkspaceSpec spec;

  @override
  Widget build(BuildContext context) {
    final route = context
        .dependOnInheritedWidgetOfExactType<HostWorkspaceRouteScope>();
    final record = context
        .dependOnInheritedWidgetOfExactType<HostWorkspaceRecordScope>();
    final content = context
        .dependOnInheritedWidgetOfExactType<HostWorkspaceContentScope>();
    if (spec case final HostEditorWorkspace editor
        when record != null && content != null) {
      return CatchNavigationViewport(
        contributionOnly: true,
        panes: [
          CatchWorkspacePane(
            id: record.id,
            child: HostWorkspaceEditorPane(
              id: record.id,
              spec: editor,
              attachments: content.attachments,
              onChanged: content.onAttachmentsChanged,
            ),
          ),
        ],
      );
    }
    final ownPanes = spec._panes();
    final routePanes = route?.panes ?? const <CatchWorkspacePane>[];
    final base = routePanes.isEmpty
        ? ownPanes
        : ownPanes
              .where(
                (pane) =>
                    pane.id != 'placeholder' &&
                    !routePanes.any((routePane) => routePane.id == pane.id),
              )
              .toList();
    return CatchNavigationViewport(
      resizeLabel: context.l10n.hostWorkspaceResizeColumn,
      onBack: routePanes.isEmpty ? spec._onBack : route!.onBack,
      compactPaneId: routePanes.isEmpty
          ? spec._compactPaneId
          : route!.compactPaneId ?? routePanes.last.id,
      panes: [...base, ...routePanes],
    );
  }
}

/// Router-owned attachment of selected content to the existing pane path.
class HostWorkspaceRouteScope extends InheritedWidget {
  const HostWorkspaceRouteScope({
    super.key,
    required this.panes,
    required this.onBack,
    required super.child,
    this.navigatorRoot = false,
    this.compactPaneId,
  });

  final String? compactPaneId;
  final bool navigatorRoot;
  static bool isNavigatorRoot(BuildContext context) =>
      context
          .dependOnInheritedWidgetOfExactType<HostWorkspaceRouteScope>()
          ?.navigatorRoot ??
      false;

  final List<CatchWorkspacePane> panes;
  final VoidCallback onBack;
  @override
  bool updateShouldNotify(HostWorkspaceRouteScope oldWidget) => true;
}

/// One key per route record, shared by its Navigator page and visible ancestor.
/// A pushed parent relinquishes its content; the ancestor pane adopts that same
/// element in the same frame. Back returns it to the original Navigator page.
class HostWorkspaceRouteContent extends StatelessWidget {
  const HostWorkspaceRouteContent({
    super.key,
    required this.id,
    required this.builder,
  });
  final String id;
  final WidgetBuilder builder;

  @override
  Widget build(BuildContext context) {
    final content = context
        .dependOnInheritedWidgetOfExactType<HostWorkspaceContentScope>();
    if (content == null) return builder(context);
    if (HostWorkspaceRouteScope.isNavigatorRoot(context) &&
        (content.activeId != id ||
            !(ModalRoute.isCurrentOf(context) ?? true))) {
      return const SizedBox.shrink();
    }
    return KeyedSubtree(
      key: content.keys.putIfAbsent(id, () => GlobalKey(debugLabel: id)),
      child: HostWorkspaceRecordScope(id: id, child: builder(context)),
    );
  }
}

/// Router frame retaining a single content element for each logical record.
class HostWorkspaceRouteFrame extends StatefulWidget {
  const HostWorkspaceRouteFrame({
    super.key,
    required this.index,
    required this.navigator,
    required this.ancestors,
    required this.selectedRoute,
    String? selectedContentId,
    required this.onBack,
  }) : selectedContentId = selectedContentId ?? selectedRoute;
  final Widget index;
  final Widget navigator;
  final List<CatchWorkspacePane> ancestors;
  final String? selectedRoute;
  final String? selectedContentId;
  final VoidCallback onBack;

  @override
  State<HostWorkspaceRouteFrame> createState() =>
      _HostWorkspaceRouteFrameState();
}

class _HostWorkspaceRouteFrameState extends State<HostWorkspaceRouteFrame> {
  final _keys = <String, GlobalKey>{};
  final _attachments = <String, ValueNotifier<Widget?>>{};

  void _attachmentsChanged() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    for (final preview in _attachments.values) {
      preview.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final anchor = HostWorkspaceRouteScope(
      panes: const [],
      onBack: widget.onBack,
      navigatorRoot: true,
      child: widget.navigator,
    );
    return HostWorkspaceContentScope(
      keys: _keys,
      activeId: widget.selectedContentId,
      attachments: _attachments,
      onAttachmentsChanged: _attachmentsChanged,
      child: HostWorkspaceRouteScope(
        panes: [
          ...widget.ancestors,
          if (widget.selectedRoute != null)
            CatchWorkspacePane(
              id: widget.selectedRoute!,
              mode: _attachments.containsKey(widget.selectedContentId)
                  ? CatchWorkspacePaneMode.editor
                  : CatchWorkspacePaneMode.directory,
              child: CatchWorkspaceBackScope(
                onBack: widget.onBack,
                child: anchor,
              ),
            ),
          if (_attachments[widget.selectedContentId] case final preview?)
            CatchWorkspacePane(
              id: '${widget.selectedRoute}.preview',
              child: ValueListenableBuilder<Widget?>(
                valueListenable: preview,
                builder: (context, child, _) =>
                    child ?? const SizedBox.shrink(),
              ),
            ),
        ],
        compactPaneId: widget.selectedRoute,
        onBack: widget.onBack,
        child: Stack(
          fit: StackFit.expand,
          children: [
            widget.index,
            if (widget.selectedRoute == null) Offstage(child: anchor),
          ],
        ),
      ),
    );
  }
}

/// Publishes route record keys and editor preview attachments.
class HostWorkspaceContentScope extends InheritedWidget {
  const HostWorkspaceContentScope({
    super.key,
    required this.keys,
    required this.activeId,
    required this.attachments,
    required this.onAttachmentsChanged,
    required super.child,
  });
  final Map<String, GlobalKey> keys;
  final String? activeId;
  final Map<String, ValueNotifier<Widget?>> attachments;
  final VoidCallback onAttachmentsChanged;

  @override
  bool updateShouldNotify(HostWorkspaceContentScope oldWidget) =>
      activeId != oldWidget.activeId;
}

/// Identifies the record contributing content to the router frame.
class HostWorkspaceRecordScope extends InheritedWidget {
  const HostWorkspaceRecordScope({
    super.key,
    required this.id,
    required super.child,
  });
  final String id;
  @override
  bool updateShouldNotify(HostWorkspaceRecordScope oldWidget) =>
      id != oldWidget.id;
}

/// A routed editor contributes its preview to the enclosing strip. It never
/// starts a second horizontal viewport inside an existing navigation pane.
class HostWorkspaceEditorPane extends StatefulWidget {
  const HostWorkspaceEditorPane({
    super.key,
    required this.id,
    required this.spec,
    required this.attachments,
    required this.onChanged,
  });
  final String id;
  final HostEditorWorkspace spec;
  final Map<String, ValueNotifier<Widget?>> attachments;
  final VoidCallback onChanged;
  @override
  State<HostWorkspaceEditorPane> createState() =>
      _HostWorkspaceEditorPaneState();
}

class _HostWorkspaceEditorPaneState extends State<HostWorkspaceEditorPane> {
  @override
  void initState() {
    super.initState();
    _publish();
  }

  @override
  void didUpdateWidget(HostWorkspaceEditorPane oldWidget) {
    super.didUpdateWidget(oldWidget);
    _publish();
  }

  void _publish() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final preview = widget.spec.showPreview ? widget.spec.preview : null;
      final existing = widget.attachments[widget.id];
      if (existing == null && preview != null) {
        widget.attachments[widget.id] = ValueNotifier(preview);
        widget.onChanged();
      } else if (existing != null) {
        existing.value = preview;
      }
    });
  }

  @override
  Widget build(BuildContext context) => widget.spec.editor;
}

Uri hostWorkspaceIndexUri(Uri uri) => uri.replace(
  queryParameters: {
    for (final entry in uri.queryParameters.entries)
      if (!const {'eventId', 'section', 'setting'}.contains(entry.key))
        entry.key: entry.value,
  },
);

void openHostOrganizerSetting(
  BuildContext context,
  Routes setting,
  String organizerId,
) => context.pushNamed(setting.name, queryParameters: {'organizerId': organizerId});

/// A route can be loaded directly, without a Navigator page for its parent.
/// Prefer the owning workspace's Back policy; otherwise preserve the URI context.
void hostWorkspaceBack(BuildContext context, {required String fallback}) {
  final back = CatchWorkspaceBackScope.maybeOf(context);
  if (back != null) {
    back();
  } else if (context.canPop()) {
    context.pop();
  } else {
    context.go(fallback);
  }
}
