import 'package:catch_dating_app/hosts/presentation/host_audience_view.dart'
    show HostAudienceView;
import 'package:catch_dating_app/routing/route_contract.dart';

String? hostOrganizerAudienceRedirect(Uri uri) {
  if (uri.queryParameters['tab'] != 'audience') return null;
  final organizerId = uri.queryParameters['organizerId']?.trim();
  return Uri(
    path: Routes.hostAudienceScreen.path,
    queryParameters: {
      if (organizerId != null && organizerId.isNotEmpty)
        'organizerId': organizerId,
    },
  ).toString();
}

String hostApplicationsLegacyRedirect(Uri uri, {String? applicationId}) {
  if (applicationId != null) {
    return uri
        .replace(
          path: Routes.hostApplicationDetailScreen.path.replaceFirst(
            ':applicationId',
            applicationId,
          ),
        )
        .toString();
  }
  return uri
      .replace(
        path: Routes.hostAudienceScreen.path,
        queryParameters: {
          ...uri.queryParameters,
          'view': HostAudienceView.responses.name,
        },
      )
      .toString();
}

String hostCustomersLegacyRedirect(Uri uri) {
  final suffix = uri.path.substring(
    Routes.hostCustomersLegacyScreen.path.length,
  );
  if (suffix == '/applications') return hostApplicationsLegacyRedirect(uri);
  final path = switch (suffix) {
    '' => Routes.hostAudienceScreen.path,
    '/new' => Routes.hostAddCustomerScreen.path,
    '/audiences/new' => Routes.hostCreateSavedAudienceScreen.path,
    final value when value.startsWith('/audiences/') =>
      '${Routes.hostAudienceScreen.path}$value',
    final value when value.startsWith('/applications') =>
      '${Routes.hostAudienceScreen.path}$value',
    final value => '${Routes.hostAudienceScreen.path}/people$value',
  };
  return uri.replace(path: path).toString();
}

String hostFormsLegacyRedirect(Uri uri) {
  final suffix = uri.path.substring(Routes.hostFormsLegacyScreen.path.length);
  if (suffix.isEmpty) {
    final requestedView = uri.queryParameters['view'] == 'responses'
        ? HostAudienceView.responses
        : HostAudienceView.forms;
    return uri
        .replace(
          path: Routes.hostAudienceScreen.path,
          queryParameters: {...uri.queryParameters, 'view': requestedView.name},
        )
        .toString();
  }
  if (suffix == '/applications') return hostApplicationsLegacyRedirect(uri);
  final path = switch (suffix) {
    '/new' => Routes.hostFormTemplatesScreen.path,
    final value when value.startsWith('/responses/') =>
      '${Routes.hostAudienceScreen.path}$value',
    final value when value.startsWith('/applications') =>
      '${Routes.hostAudienceScreen.path}$value',
    final value => '${Routes.hostAudienceScreen.path}/forms$value',
  };
  return uri.replace(path: path).toString();
}

String hostHomeLegacyRedirect() => Routes.hostTodayScreen.path;

String? hostOrganizerIndexRedirect(Uri uri) {
  if (uri.path != Routes.hostOrganizersScreen.path) return null;
  return Uri(
    path: Routes.hostOrganizerScreen.path,
    queryParameters: uri.queryParameters.isEmpty ? null : uri.queryParameters,
  ).toString();
}

/// The event-scope workspace moved under the unified work shell; the legacy
/// operator URL keeps resolving as a redirect so shared links and old builds
/// still land on the event.
String hostOperatorEventLegacyRedirect(Uri uri, {required String eventId}) {
  return uri
      .replace(
        path: Routes.hostWorkEventScreen.path.replaceFirst(':eventId', eventId),
      )
      .toString();
}
