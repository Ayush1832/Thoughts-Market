import UserDetailPage from './UserDetailPage'

export default function AdminUserDetailPage({ params }: PageProps<'/[locale]/admin/users/[userId]'>) {
  return <UserDetailPage userId={params.userId} locale={params.locale} />
}
