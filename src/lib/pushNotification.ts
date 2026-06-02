// ============================================================
// OdontoSync — Push Notification Utility (Expo Push API)
// Responsabilidade Única: enviar notificações via API pública do Expo.
// Docs: https://docs.expo.dev/push-notifications/sending-notifications/
// ============================================================

interface PushPayload {
  to: string;
  title: string;
  body: string;
  sound?: string;
  data?: Record<string, any>;
}

/**
 * Envia uma push notification real para o dispositivo do usuário
 * via API pública do Expo. Não requer SDK, Firebase ou dependências extras.
 */
export async function sendPushNotification(
  pushToken: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> {
  // Validação básica: tokens Expo começam com "ExponentPushToken[" ou "ExpoPushToken["
  if (!pushToken || (!pushToken.startsWith('ExponentPushToken[') && !pushToken.startsWith('ExpoPushToken['))) {
    return;
  }

  const payload: PushPayload = {
    to: pushToken,
    title,
    body,
    sound: 'default',
    data,
  };

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}
