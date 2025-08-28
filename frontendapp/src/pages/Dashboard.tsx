import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Activity,
  Users,
  Server,
  GitBranch,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { config } from '../config'

interface Metrics {
  totalBuilds: number
  successfulBuilds: number
  failedBuilds: number
  activeDeployments: number
  totalRequests: number
  activeUsers: number
}

interface RecentBuild {
  buildId: string
  projectName: string
  branch: string
  status: 'completed' | 'failed' | 'in_progress'
  timestamp: string
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [recentBuilds, setRecentBuilds] = useState<RecentBuild[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [metricsRes, buildsRes] = await Promise.all([
        axios.get(`${config.apiUrl}/api/monitoring/metrics`),
        axios.get(`${config.apiUrl}/api/build?limit=5`)
      ])
      
      setMetrics(metricsRes.data)
      setRecentBuilds(buildsRes.data.builds || [])
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'in_progress':
        return <AlertCircle className="h-4 w-4 text-yellow-500 animate-pulse" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      completed: 'default',
      failed: 'destructive',
      in_progress: 'secondary'
    }
    return (
      <Badge variant={variants[status] || 'outline'}>
        {status.replace('_', ' ')}
      </Badge>
    )
  }

  const statsCards = [
    {
      title: 'Total Builds',
      value: metrics?.totalBuilds || 0,
      icon: GitBranch,
      description: 'All time builds',
      color: 'text-blue-500'
    },
    {
      title: 'Success Rate',
      value: metrics ? `${Math.round((metrics.successfulBuilds / metrics.totalBuilds) * 100)}%` : '0%',
      icon: TrendingUp,
      description: 'Build success rate',
      color: 'text-green-500'
    },
    {
      title: 'Active Deployments',
      value: metrics?.activeDeployments || 0,
      icon: Server,
      description: 'Currently running',
      color: 'text-purple-500'
    },
    {
      title: 'Active Users',
      value: metrics?.activeUsers || 0,
      icon: Users,
      description: 'Platform users',
      color: 'text-orange-500'
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Welcome back! Here's an overview of your deployment platform.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Builds</CardTitle>
            <CardDescription>
              Your latest build activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : recentBuilds.length > 0 ? (
              <div className="space-y-3">
                {recentBuilds.map((build) => (
                  <div
                    key={build.buildId}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(build.status)}
                      <div>
                        <p className="font-medium">{build.projectName || 'Project'}</p>
                        <p className="text-sm text-muted-foreground">
                          {build.branch} • {new Date(build.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(build.status)}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No recent builds
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks and shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full justify-start" variant="outline">
              <GitBranch className="mr-2 h-4 w-4" />
              Connect New Repository
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Server className="mr-2 h-4 w-4" />
              Create New Deployment
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Activity className="mr-2 h-4 w-4" />
              View System Health
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Clock className="mr-2 h-4 w-4" />
              View Build History
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}