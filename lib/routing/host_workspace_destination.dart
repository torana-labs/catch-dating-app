part of 'go_router.dart';

enum HostWorkspaceRoot {
  today(Routes.hostTodayScreen),
  events(Routes.hostEventsScreen),
  audience(Routes.hostAudienceScreen),
  inbox(Routes.hostInboxScreen),
  organizer(Routes.hostOrganizerScreen);

  const HostWorkspaceRoot(this.route);
  final Routes route;
}

/// Navigation metadata lives beside the actual destination builder.
/// Adding a route requires an explicit root; parent paths are recursively derived.
class HostWorkspaceDestination extends GoRoute {
  HostWorkspaceDestination({
    required this.root,
    required super.path,
    super.name,
    GoRouterWidgetBuilder? builder,
    super.redirect,
    this.parent,
    this.contextualParent,
    this.audienceView,
  }) : super(
         builder: builder == null
             ? null
             : (context, state) => HostWorkspaceRouteContent(
                 id: hostWorkspaceContentId(name!, path, state.pathParameters),
                 builder: (context) => builder(context, state),
               ),
       );
  final HostWorkspaceRoot root;
  final Routes? parent;
  final Routes? Function(GoRouterState)? contextualParent;
  final HostAudienceView? audienceView;
  Routes? parentFor(GoRouterState state) =>
      contextualParent?.call(state) ?? parent;
}

@visibleForTesting
List<HostWorkspaceDestination> hostWorkspaceAncestors(
  List<HostWorkspaceDestination> routes,
  HostWorkspaceDestination? selected,
  GoRouterState state,
) {
  final result = <HostWorkspaceDestination>[];
  final visited = <String>{?selected?.name};
  var current = selected;
  while (current != null) {
    final parentId = current.parentFor(state);
    if (parentId == null) break;
    final ancestor = routes
        .where((route) => route.name == parentId.name)
        .single;
    if (!visited.add(ancestor.name!)) {
      throw StateError('Cyclic Host navigation ancestry');
    }
    if (ancestor.root != selected!.root || ancestor.builder == null) {
      throw StateError(
        'Host ancestry must have a builder in its owning workspace',
      );
    }
    result.insert(0, ancestor);
    current = ancestor;
  }
  return result;
}

GoRouterState hostWorkspaceAncestorState(
  BuildContext context,
  HostWorkspaceDestination route,
  GoRouterState state,
) {
  final parameters = {
    ...state.pathParameters,
    'organizerId': ?state.uri.queryParameters['organizerId'],
    'audienceId': ?state.uri.queryParameters['_parentAudienceId'],
    'contactId':
        ?(state.uri.queryParameters['_parentContactId'] ??
        state.uri.queryParameters['contactId']),
    'formId': ?state.uri.queryParameters['_parentQueryFormId'],
  };
  return GoRouterState(
    GoRouter.of(context).configuration,
    uri: route.name == Routes.hostAppEventManageScreen.name
        ? state.uri.replace(
            queryParameters: {...state.uri.queryParameters}..remove('section'),
          )
        : state.uri,
    matchedLocation: state.matchedLocation,
    name: route.name,
    path: route.path,
    fullPath: route.path,
    pathParameters: parameters,
    extra: state.extra is HostResponseQueryController ? state.extra : null,
    pageKey: ValueKey(route.name!),
  );
}

String hostWorkspaceParentLocation(
  List<HostWorkspaceDestination> routes,
  HostWorkspaceDestination route,
  GoRouterState state,
  Uri indexUri,
) {
  final parentId = route.parentFor(state);
  if (parentId == null) return hostWorkspaceIndexUri(indexUri).toString();
  final parent = routes.where((route) => route.name == parentId.name).single;
  final parameters = {
    ...state.pathParameters,
    'organizerId': ?state.uri.queryParameters['organizerId'],
    'audienceId': ?state.uri.queryParameters['_parentAudienceId'],
    'contactId':
        ?(state.uri.queryParameters['_parentContactId'] ??
        state.uri.queryParameters['contactId']),
    'formId': ?state.uri.queryParameters['_parentQueryFormId'],
  };
  return state.uri
      .replace(
        path: parent.path.replaceAllMapped(
          RegExp(r':([A-Za-z][A-Za-z0-9]*)'),
          (match) => Uri.encodeComponent(parameters[match[1]]!),
        ),
      )
      .toString();
}

String hostWorkspaceContentId(
  String name,
  String path,
  Map<String, String> parameters,
) =>
    '$name:${path.replaceAllMapped(RegExp(r':([A-Za-z][A-Za-z0-9]*)'), (match) => parameters[match[1]] ?? match[0]!)}';
