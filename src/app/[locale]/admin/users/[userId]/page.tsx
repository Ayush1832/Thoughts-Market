import UserDetailPage from './UserDetailPage'

export default async function AdminUserDetailPage({ params }: PageProps<'/[locale]/admin/users/[userId]'>) {
  const { locale, userId } = await params
  return <UserDetailPage userId={userId} locale={locale} />
}
