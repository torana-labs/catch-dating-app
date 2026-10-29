import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_destination.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_rules.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';

export 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_rules.dart';

enum AssistanceTemplateAuthority { observe, prepare, executeWithinPolicy }

enum AssistanceTemplateDisabledReason { hostChoice, organizerDefault }

sealed class AssistanceTemplateSetting {
  const AssistanceTemplateSetting();
  Map<String, Object?> toJson();
  factory AssistanceTemplateSetting.fromJson(Object? value) {
    final map = assistanceObject(value);
    if (map['kind'] == 'enabled') {
      assistanceObject(map, {'kind', 'authority'});
      return AssistanceTemplateEnabled(
        assistanceEnum(AssistanceTemplateAuthority.values, map['authority']),
      );
    }
    if (map['kind'] == 'disabled') {
      assistanceObject(map, {'kind', 'reason'});
      return AssistanceTemplateDisabled(
        assistanceEnum(AssistanceTemplateDisabledReason.values, map['reason']),
      );
    }
    throw const FormatException('Unknown assistance authority.');
  }
}

final class AssistanceTemplateEnabled extends AssistanceTemplateSetting {
  const AssistanceTemplateEnabled(this.authority);
  final AssistanceTemplateAuthority authority;
  @override
  Map<String, Object?> toJson() => {
    'kind': 'enabled',
    'authority': authority.name,
  };
}

final class AssistanceTemplateDisabled extends AssistanceTemplateSetting {
  const AssistanceTemplateDisabled(this.reason);
  final AssistanceTemplateDisabledReason reason;
  @override
  Map<String, Object?> toJson() => {'kind': 'disabled', 'reason': reason.name};
}

/// Reusable configuration, without a runtime subject or provider authority.
final class AssistanceLateJoinTemplate {
  AssistanceLateJoinTemplate({
    required AssistanceTemplateSetting setting,
    required LateJoinDestination destination,
    required LateJoinCutoff cutoff,
    required int maxMessagesPerEpisode,
    required int minimumMinutesBetweenMessages,
    required LateJoinUnansweredRule unanswered,
  }) : this.withRules(
         setting: setting,
         rules: AssistanceLateJoinRules(
           destination: destination,
           cutoff: cutoff,
           maxMessagesPerEpisode: maxMessagesPerEpisode,
           minimumMinutesBetweenMessages: minimumMinutesBetweenMessages,
           unanswered: unanswered,
         ),
       );
  const AssistanceLateJoinTemplate.withRules({
    required this.setting,
    required this.rules,
  });
  final AssistanceTemplateSetting setting;
  final AssistanceLateJoinRules rules;
  LateJoinDestination get destination => rules.destination;
  LateJoinCutoff get cutoff => rules.cutoff;
  int get maxMessagesPerEpisode => rules.maxMessagesPerEpisode;
  int get minimumMinutesBetweenMessages => rules.minimumMinutesBetweenMessages;
  LateJoinUnansweredRule get unanswered => rules.unanswered;

  factory AssistanceLateJoinTemplate.fromJson(Object? value) {
    final map = assistanceObject(value, {
      'kind',
      'version',
      'setting',
      'config',
    });
    if (map['kind'] != 'lateJoin' || map['version'] != 1) {
      throw const FormatException('Unsupported late joining template.');
    }
    return AssistanceLateJoinTemplate.withRules(
      setting: AssistanceTemplateSetting.fromJson(map['setting']),
      rules: AssistanceLateJoinRules.fromJson(map['config']),
    );
  }
  Map<String, Object?> toJson() => {
    'kind': 'lateJoin',
    'version': 1,
    'setting': setting.toJson(),
    'config': rules.toJson(),
  };
}
