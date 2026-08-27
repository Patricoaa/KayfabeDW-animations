import {LoginForm} from '@/components/login-form';

export const metadata = {
  title: 'Acceso — KayfabeDW Animations',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{next?: string}>;
}) {
  const {next} = await searchParams;

  return <LoginForm next={next} />;
}