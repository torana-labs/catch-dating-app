import 'package:catch_dating_app/hosts/presentation/forms/host_response_offer_preferences_route_screen.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_manage_screen.dart';
import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import '../hosts/operations/manage_fixture.dart';
import 'package:catch_dating_app/core/presentation/app_shell.dart';
import 'package:catch_dating_app/routing/host_navigation_workspace.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import '../hosts/operations/shell_fixture.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/widgetbook_harness.dart';

@widgetbook.UseCase(
  name: 'Parent selection and preview',
  type: HostNavigationWorkspace,
  path: '[Host]/Layout',
)
Widget hostNavigationWorkspace(BuildContext context) =>
    WidgetbookViewportFrame.device(
      size: const Size(1280, 800),
      child: HostNavigationWorkspace(
        spec: HostEditorWorkspace(
          editor: const CatchWorkspacePaneScaffold(
            title: CatchTopBar.primaryRail(title: 'Organizer'),
            body: CatchEmptyState(title: 'Organizer editor'),
          ),
          preview: const CatchWorkspacePaneScaffold(
            title: CatchTopBar.primaryRail(title: 'Preview'),
            body: CatchEmptyState(title: 'Public organizer preview'),
          ),
        ),
      ),
    );

@widgetbook.UseCase(
  name: 'Aligned pane chrome',
  type: CatchWorkspacePaneScaffold,
  path: '[Core patterns]/Viewport',
)
Widget workspacePaneScaffold(BuildContext context) =>
    WidgetbookViewportFrame.device(
      size: const Size(1400, 800),
      child: CatchWorkspaceHeaderLayout(
        child: Row(
          children: [
            AppShellSideNavigation(
              active: 0,
              expanded: true,
              title: 'Catch Host',
              items: const [],
              onChanged: (_) {},
            ),
            Expanded(
              child: CatchNavigationViewport(
                onBack: () {},
                panes: [
                  CatchWorkspacePane(
                    id: 'events',
                    child: CatchWorkspacePaneScaffold(
                      title: CatchTopBar.primaryRail(
                        title: 'Events',
                        actions: [
                          CatchTopBarPrimaryButton(
                            label: 'Create event',
                            icon: CatchIcons.add,
                            onPressed: () {},
                          ),
                        ],
                      ),
                      body: const CatchEmptyState(title: 'Events directory'),
                    ),
                  ),
                  const CatchWorkspacePane(
                    id: 'program',
                    child: CatchWorkspacePaneScaffold(
                      title: CatchTopBar.route(
                        title: 'Program',
                        navigation: CatchTopBarNavigation(
                          mode: CatchTopBarNavigationMode.back,
                        ),
                      ),
                      body: CatchEmptyState(title: 'Program detail'),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );

@widgetbook.UseCase(
  name: 'Content-driven header alignment',
  type: CatchWorkspaceHeaderLayout,
  path: '[Core patterns]/Viewport',
)
Widget workspaceHeaderGroup(BuildContext context) =>
    workspacePaneScaffold(context);

@widgetbook.UseCase(
  name: 'Local pane presentation',
  type: CatchWorkspacePaneScope,
  path: '[Core patterns]/Viewport',
)
Widget workspacePaneScope(BuildContext context) =>
    WidgetbookViewportFrame.device(
      size: const Size(390, 700),
      child: CatchWorkspacePaneScope(
        isSinglePane: true,
        child: Builder(
          builder: (context) => CatchEmptyState(
            title: CatchWorkspacePaneScope.isSinglePaneOf(context) == true
                ? 'Single pane'
                : 'Concurrent panes',
          ),
        ),
      ),
    );

@widgetbook.UseCase(
  name: 'Route-owned parent back',
  type: CatchWorkspaceBackScope,
  path: '[Core patterns]/Viewport',
)
Widget workspaceBackScope(BuildContext context) =>
    WidgetbookViewportFrame.device(
      size: const Size(390, 700),
      child: CatchWorkspaceBackScope(
        onBack: () {},
        child: const CatchWorkspacePaneScaffold(
          title: CatchTopBar.route(title: 'Nested detail'),
          body: CatchEmptyState(title: 'Back returns to the parent selection'),
        ),
      ),
    );

@widgetbook.UseCase(
  name: 'Router path attachment',
  type: HostWorkspaceRouteScope,
  path: '[Host]/Layout',
)
Widget hostWorkspaceRouteScope(BuildContext context) =>
    WidgetbookViewportFrame.device(
      size: const Size(1100, 800),
      child: HostWorkspaceRouteScope(
        onBack: () {},
        panes: const [
          CatchWorkspacePane(
            id: 'selected',
            child: CatchWorkspacePaneScaffold(
              title: CatchTopBar.route(title: 'Selected program'),
              body: CatchEmptyState(title: 'Program content'),
            ),
          ),
        ],
        child: const HostNavigationWorkspace(
          spec: HostTaskWorkspace(
            content: CatchWorkspacePaneScaffold(
              title: CatchTopBar.primaryRail(title: 'Events'),
              body: CatchEmptyState(title: 'Existing index'),
            ),
          ),
        ),
      ),
    );

@widgetbook.UseCase(
  name: 'Natural pane header',
  type: CatchWorkspaceHeader,
  path: '[Core patterns]/Viewport',
)
Widget workspaceHeader(BuildContext context) => workspacePaneScaffold(context);

@widgetbook.UseCase(
  name: 'Shared Today route index',
  type: HostWorkspaceIndexScreen,
  path: '[Host]/Layout',
)
Widget hostWorkspaceIndexScreen(BuildContext context) =>
    WidgetbookViewportFrame.device(
      size: const Size(1200, 800),
      child: WidgetbookHostShellScope(
        child: HostWorkspaceIndexScreen(
          root: Routes.hostTodayScreen,
          uri: Uri(path: Routes.hostTodayScreen.path),
        ),
      ),
    );

@widgetbook.UseCase(
  name: 'Retained record and lifted preview',
  type: HostWorkspaceRouteFrame,
  path: '[Host]/Layout',
)
Widget hostWorkspaceRouteFrame(BuildContext context) =>
    WidgetbookViewportFrame.device(
      size: const Size(1400, 800),
      child: HostWorkspaceRouteFrame(
        index: const HostNavigationWorkspace(
          spec: HostTaskWorkspace(
            content: CatchWorkspacePaneScaffold(
              title: CatchTopBar.primaryRail(title: 'Events'),
              body: CatchEmptyState(title: 'Events directory'),
            ),
          ),
        ),
        navigator: HostWorkspaceRouteContent(
          id: 'editor',
          builder: (context) => const HostNavigationWorkspace(
            spec: HostEditorWorkspace(
              editor: CatchWorkspacePaneScaffold(
                title: CatchTopBar.route(title: 'Event editor'),
                body: CatchEmptyState(title: 'Draft event'),
              ),
              preview: CatchWorkspacePaneScaffold(
                title: CatchTopBar.route(title: 'Preview'),
                body: CatchEmptyState(title: 'Public event preview'),
              ),
            ),
          ),
        ),
        ancestors: const [],
        selectedRoute: 'editor',
        onBack: () {},
      ),
    );

@widgetbook.UseCase(
  name: 'Selected record content',
  type: HostWorkspaceRouteContent,
  path: '[Host]/Layout',
)
Widget hostWorkspaceRouteContent(BuildContext context) =>
    hostWorkspaceRouteFrame(context);

@widgetbook.UseCase(
  name: 'Record keys and preview attachments',
  type: HostWorkspaceContentScope,
  path: '[Host]/Layout',
)
Widget hostWorkspaceContentScope(BuildContext context) =>
    hostWorkspaceRouteFrame(context);

@widgetbook.UseCase(
  name: 'Routed record identity',
  type: HostWorkspaceRecordScope,
  path: '[Host]/Layout',
)
Widget hostWorkspaceRecordScope(BuildContext context) =>
    hostWorkspaceRouteFrame(context);

@widgetbook.UseCase(
  name: 'Editor contributes outer preview',
  type: HostWorkspaceEditorPane,
  path: '[Host]/Layout',
)
Widget hostWorkspaceEditorPane(BuildContext context) =>
    hostWorkspaceRouteFrame(context);

@widgetbook.UseCase(
  name: 'Signed-out preferences boundary',
  type: HostResponseOfferPreferencesRouteScreen,
  path: '[Host]/Layout',
)
Widget hostOfferPreferencesRoute(BuildContext context) =>
    WidgetbookHostShellScope(
      uid: null,
      child: HostResponseOfferPreferencesRouteScreen(
        organizerId: 'organizer',
        eventId: 'event',
        onBack: () {},
      ),
    );

@widgetbook.UseCase(
  name: 'Signed-out publication boundary',
  type: HostEventPublicationRouteScreen,
  path: '[Host]/Layout',
)
Widget hostPublicationRoute(BuildContext context) =>
    WidgetbookHostManageRouteScope(
      uid: null,
      child: HostEventPublicationRouteScreen(
        clubId: HostOperationsFixtures.primaryClub.id,
        eventId: HostOperationsFixtures.privateEvent.id,
      ),
    );

@widgetbook.UseCase(
  name: 'Publication loading chrome',
  type: HostEventPublicationStateScaffold,
  path: '[Host]/Layout',
)
Widget hostPublicationState(BuildContext context) =>
    const HostEventPublicationStateScaffold(
      child: CatchStateViewport.loading(accountForBottomOverlay: false),
    );
