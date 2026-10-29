import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_dating_app/routing/go_router.dart';

const _deepLinkHost = 'catchdates.com';

class AppDeepLinks {
  const AppDeepLinks._();

  static Uri club(String clubId) => _httpsRoute(
    Routes.clubDetailScreen.path,
    pathParameters: {'clubId': clubId},
  );

  static Uri eventInvite(String inviteToken) => Uri(
    scheme: 'https',
    host: _deepLinkHost,
    pathSegments: ['invite', inviteToken],
  );

  static Uri event({
    required String clubId,
    required String eventId,
    String? inviteCode,
    String? inviteLinkId,
  }) => _httpsRoute(
    Routes.eventDetailScreen.path,
    pathParameters: {'clubId': clubId, 'eventId': eventId},
    queryParameters: _eventQuery(
      inviteCode: inviteCode,
      inviteLinkId: inviteLinkId,
    ),
  );

  static Uri hostOperatorEvent(String eventId) => _httpsRoute(
    Routes.hostOperatorEventScreen.path,
    pathParameters: {'eventId': eventId},
  );

  /// The scoped workspace a program staff member lands on from a grant
  /// notification or coordinator share link. An inviteId turns the link into
  /// a single-use claim bound to the recipient's verified phone.
  static Uri hostWorkProgram(String programId, {String? inviteId}) =>
      _httpsRoute(
        Routes.hostWorkProgramScreen.path,
        pathParameters: {'programId': programId},
        queryParameters: inviteId == null
            ? null
            : <String, String>{'invite': inviteId},
      );

  static String inAppEventPath({
    required String clubId,
    required String eventId,
    String? inviteCode,
    String? inviteLinkId,
    AppRole? appRole,
  }) {
    final role = appRole ?? AppConfig.appRole;
    return _inAppRoute(
      role.isHost
          ? Routes.hostAppEventDetailScreen.path
          : Routes.eventDetailScreen.path,
      pathParameters: {'clubId': clubId, 'eventId': eventId},
      queryParameters: _eventQuery(
        inviteCode: inviteCode,
        inviteLinkId: inviteLinkId,
      ),
    ).toString();
  }
}

Uri _httpsRoute(
  String routePath, {
  required Map<String, String> pathParameters,
  Map<String, String>? queryParameters,
}) {
  final pathSegments = _pathSegments(routePath, pathParameters);
  return Uri(
    scheme: 'https',
    host: _deepLinkHost,
    pathSegments: pathSegments,
    queryParameters: queryParameters,
  );
}

Uri _inAppRoute(
  String routePath, {
  required Map<String, String> pathParameters,
  Map<String, String>? queryParameters,
}) {
  final route = Uri(
    pathSegments: _pathSegments(routePath, pathParameters),
    queryParameters: queryParameters,
  );
  return Uri.parse('/$route');
}

List<String> _pathSegments(
  String routePath,
  Map<String, String> pathParameters,
) {
  final pathSegments = routePath
      .split('/')
      .where((segment) => segment.isNotEmpty)
      .map((segment) {
        if (!segment.startsWith(':')) return segment;

        final key = segment.substring(1);
        final value = pathParameters[key];
        if (value == null || value.isEmpty) {
          throw ArgumentError.value(value, key, 'Missing route path parameter');
        }
        return value;
      })
      .toList(growable: false);

  return pathSegments;
}

Map<String, String>? _eventQuery({String? inviteCode, String? inviteLinkId}) {
  final normalizedInviteCode = inviteCode?.trim();
  final normalizedInviteLinkId = inviteLinkId?.trim();
  final query = <String, String>{
    if (normalizedInviteCode != null && normalizedInviteCode.isNotEmpty)
      'invite': normalizedInviteCode,
    if (normalizedInviteLinkId != null && normalizedInviteLinkId.isNotEmpty)
      'il': normalizedInviteLinkId,
  };
  return query.isEmpty ? null : query;
}
