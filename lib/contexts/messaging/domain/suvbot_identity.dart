const suvbotUid = 'suvbot';

bool isSuvbotConversation({required String matchId, String? otherUid}) {
  return otherUid == suvbotUid || matchId.startsWith('${suvbotUid}_');
}
