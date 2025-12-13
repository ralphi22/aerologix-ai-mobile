import { Redirect } from 'expo-router';

export default function Index() {
  // Par défaut, rediriger vers login
  // L'authentification sera gérée par le layout
  return <Redirect href="/login" />;
}
