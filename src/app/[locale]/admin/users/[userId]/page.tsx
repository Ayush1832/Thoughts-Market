import UserDetailPage from './UserDetailPage'

export default async function AdminUserDetailPage(props: {
  params: Promise<{ locale: string; userId: string }>
}) {
  const { locale, userId } = await props.params
  return <UserDetailPage userId={userId} locale={locale} />
}
